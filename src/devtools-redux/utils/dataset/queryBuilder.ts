/**
 * Dataset Query Builder
 * Functions for building OData queries for dataset operations
 * Enhanced with relationship mapping logic from integration tests
 */

import {
  buildRelationshipFilter,
  buildRelationshipFilterWithDiscovery,
  mapRelationshipToLookupColumn,
} from './relationshipMapper'
import type { DatasetQuery, SubgridInfo } from './types'

/**
 * Check if a view ID is a mock/development UUID that should be skipped
 */
function shouldSkipViewId(viewId: string | undefined): boolean {
  if (!viewId) return true
  
  // Skip all-zeros UUID (common in tests)
  if (viewId === '00000000-0000-0000-0000-000000000000') {
    return true
  }
  
  // Skip savedQuery in development environment to avoid 404 errors
  // In development, we're using mock datasets with random UUIDs that don't exist in Dataverse
  if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
    console.log(`🏗️ Skipping savedQuery in development: ${viewId}`)
    return true
  }
  
  // Check if this looks like a real view ID (standard UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(viewId)) {
    // This looks like a real view ID, don't skip it
    return false
  }
  
  return true
}

/**
 * Build a dataset refresh query for a specific form and control
 * Enhanced with relationship mapping logic discovered in integration tests
 */
export function buildDatasetRefreshQuery(
  subgrid: SubgridInfo,
  options: {
    maxPageSize?: number
    includeFormattedValues?: boolean
    additionalSelect?: string[]
    parentRecordId?: string
  } = {}
): DatasetQuery {
  const {
    maxPageSize,
    includeFormattedValues = true,
    additionalSelect = [],
    parentRecordId,
  } = options

  const selectFields = ['*', ...additionalSelect].join(',')

  // Use plural form for entity collection (discovered in tests)
  const entityCollection = subgrid.targetEntity.endsWith('s')
    ? subgrid.targetEntity
    : `${subgrid.targetEntity}s`
  let odataQuery = `${entityCollection}?$select=${selectFields}`
  
  // Only add $top if maxPageSize is explicitly provided
  if (maxPageSize !== undefined && maxPageSize > 0) {
    odataQuery += `&$top=${maxPageSize}`
  }

  // Note: We don't use $expand=*($levels=1) for datasets as it's unnecessary and impacts performance
  // Formatted values are included by default in dataset queries

  // Add view filter if available (skip in development to avoid 404s)
  if (subgrid.viewId && !subgrid.isCustomView && !shouldSkipViewId(subgrid.viewId)) {
    odataQuery += `&savedQuery=${subgrid.viewId}`
  }

  // Add relationship filter if this is a related entity subgrid
  // Uses the correct lookup column syntax discovered in tests
  if (subgrid.relationshipName && parentRecordId) {
    const relationshipFilter = buildRelationshipFilter(subgrid.relationshipName, parentRecordId)

    if (relationshipFilter) {
      odataQuery += `&$filter=${relationshipFilter}`
      console.log(`✅ Applied relationship filter: ${relationshipFilter}`)
    } else {
      console.warn(
        `⚠️ Unknown relationship: ${subgrid.relationshipName}. Consider adding to relationship mappings.`
      )
    }
  }

  return {
    entityLogicalName: subgrid.targetEntity,
    viewId: subgrid.viewId,
    odataQuery,
    relationshipName: subgrid.relationshipName,
    isRelatedQuery: !!subgrid.relationshipName,
    formId: subgrid.formId,
    controlId: subgrid.controlId,
    lookupColumn: subgrid.relationshipName
      ? mapRelationshipToLookupColumn(subgrid.relationshipName) || undefined
      : undefined,
  }
}

/**
 * Build a dataset refresh query with runtime relationship discovery
 * Enhanced version that can discover relationships dynamically
 */
export async function buildDatasetRefreshQueryWithDiscovery(
  subgrid: SubgridInfo,
  options: {
    maxPageSize?: number
    includeFormattedValues?: boolean
    additionalSelect?: string[]
    parentRecordId?: string
    parentEntity?: string
    webAPI?: ComponentFramework.WebApi
  } = {}
): Promise<DatasetQuery> {
  const {
    maxPageSize,
    includeFormattedValues = true,
    additionalSelect = [],
    parentRecordId,
    parentEntity,
    webAPI,
  } = options

  const selectFields = ['*', ...additionalSelect].join(',')

  // Use plural form for entity collection (discovered in tests)
  const entityCollection = subgrid.targetEntity.endsWith('s')
    ? subgrid.targetEntity
    : `${subgrid.targetEntity}s`
  
  // Start with basic query including select fields
  let odataQuery = `${entityCollection}?$select=${selectFields}`
  
  console.log(`🔨 Building query - maxPageSize: ${maxPageSize}, selectFields: ${selectFields}`)
  
  // Only add $top if maxPageSize is explicitly provided
  if (maxPageSize !== undefined && maxPageSize > 0) {
    odataQuery += `&$top=${maxPageSize}`
    console.log(`📏 Added $top=${maxPageSize} to query`)
  }

  // Note: We don't use $expand=*($levels=1) for datasets as it's unnecessary and impacts performance
  // Formatted values are included by default in dataset queries

  // Add view filter if available (skip in development to avoid 404s)
  if (subgrid.viewId && !subgrid.isCustomView && !shouldSkipViewId(subgrid.viewId)) {
    odataQuery += `&savedQuery=${subgrid.viewId}`
  }

  let discoveredLookupColumn: string | undefined

  // Add relationship filter if this is a related entity subgrid
  if (subgrid.relationshipName && parentRecordId) {
    console.log(`🔍 Building relationship query for: ${subgrid.relationshipName}`)

    // Try runtime discovery with parent entity information
    const relationshipFilter = await buildRelationshipFilterWithDiscovery(
      subgrid.relationshipName,
      parentRecordId,
      parentEntity,
      subgrid.targetEntity,
      webAPI
    )

    if (relationshipFilter) {
      odataQuery += `&$filter=${relationshipFilter}`
      console.log(`✅ Applied discovered relationship filter: ${relationshipFilter}`)

      // Extract the lookup column name from the filter for return
      const filterMatch = relationshipFilter.match(/^([^=\s]+)\s+eq/)
      if (filterMatch) {
        discoveredLookupColumn = filterMatch[1]
      }
    } else {
      console.warn(`⚠️ Could not build relationship filter for: ${subgrid.relationshipName}`)
      console.log(
        `📋 Available info: parentEntity=${parentEntity}, childEntity=${subgrid.targetEntity}, parentRecordId=${parentRecordId}`
      )
    }
  }

  return {
    entityLogicalName: subgrid.targetEntity,
    viewId: subgrid.viewId,
    odataQuery,
    relationshipName: subgrid.relationshipName,
    isRelatedQuery: !!subgrid.relationshipName,
    formId: subgrid.formId,
    controlId: subgrid.controlId,
    lookupColumn: discoveredLookupColumn,
  }
}

/**
 * Build query for getting dataset metadata
 */
export function buildMetadataQuery(entityLogicalName: string): string {
  return `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,DisplayName,EntitySetName&$expand=Attributes($select=LogicalName,DisplayName,AttributeType)`
}

/**
 * Build query for getting view definition
 */
export function buildViewDefinitionQuery(viewId: string): string {
  return `savedqueries(${viewId})?$select=name,fetchxml,layoutxml,returnedtypecode`
}

/**
 * Validate query parameters
 */
export function validateQuery(query: DatasetQuery): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!query.entityLogicalName) {
    errors.push('Entity logical name is required')
  }

  if (!query.odataQuery) {
    errors.push('OData query is required')
  }

  // Validate OData query format
  if (query.odataQuery && !query.odataQuery.includes('?')) {
    errors.push('OData query must include query parameters')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
