/**
 * Unified Query Builder
 * Consolidates query building logic from multiple query builders
 * Pure functions for building OData queries
 */

import type { DatasetQuery, SubgridInfo } from '../utils/dataset/types'

/**
 * Query building options
 */
export interface QueryOptions {
  maxPageSize?: number
  includeFormattedValues?: boolean
  additionalSelect?: string[]
  parentRecordId?: string
  parentEntity?: string
  skipViewId?: boolean
}

/**
 * Query validation result
 */
export interface QueryValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Check if a view ID should be skipped (mock/development UUID)
 */
export function shouldSkipViewId(viewId: string | undefined): boolean {
  if (!viewId) return true
  
  // Skip all-zeros UUID (common in tests)
  if (viewId === '00000000-0000-0000-0000-000000000000') {
    return true
  }
  
  // Skip savedQuery in development environment to avoid 404 errors
  if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
    console.log(`🏗️ Skipping savedQuery in development: ${viewId}`)
    return true
  }
  
  // Check if this looks like a real view ID (standard UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(viewId)) {
    return false
  }
  
  return true
}

/**
 * Build entity collection name from logical name
 */
export function buildEntityCollection(entityLogicalName: string): string {
  // Use plural form for entity collection
  return entityLogicalName.endsWith('s') 
    ? entityLogicalName 
    : `${entityLogicalName}s`
}

/**
 * Build select clause from field list
 */
export function buildSelectClause(fields: string[] = [], includeAll = true): string {
  const selectFields = includeAll ? ['*', ...fields] : fields
  return selectFields.join(',')
}

/**
 * Build filter clause for relationships
 */
export function buildRelationshipFilter(
  lookupColumn: string,
  parentRecordId: string
): string {
  return `${lookupColumn} eq ${parentRecordId}`
}

/**
 * Build common lookup column patterns
 */
export function buildLookupColumnPatterns(parentEntity: string): string[] {
  return [
    `_${parentEntity}_value`,
    `_${parentEntity}id_value`,
    `${parentEntity}id`,
    `parentcustomerid`, // Common for account-contact relationships
    `parentaccountid`,
  ]
}

/**
 * Build basic dataset query
 */
export function buildDatasetQuery(
  entityLogicalName: string,
  options: QueryOptions = {}
): DatasetQuery {
  const {
    maxPageSize,
    includeFormattedValues = true,
    additionalSelect = [],
  } = options

  const entityCollection = buildEntityCollection(entityLogicalName)
  const selectFields = buildSelectClause(additionalSelect, true)
  
  let odataQuery = `${entityCollection}?$select=${selectFields}`
  
  // Add pagination if specified
  if (maxPageSize !== undefined && maxPageSize > 0) {
    odataQuery += `&$top=${maxPageSize}`
  }

  return {
    entityLogicalName,
    odataQuery,
    isRelatedQuery: false,
  }
}

/**
 * Build dataset refresh query for subgrids
 */
export function buildSubgridQuery(
  subgrid: SubgridInfo,
  options: QueryOptions = {}
): DatasetQuery {
  const {
    maxPageSize,
    includeFormattedValues = true,
    additionalSelect = [],
    parentRecordId,
    skipViewId = false,
  } = options

  const entityCollection = buildEntityCollection(subgrid.targetEntity)
  const selectFields = buildSelectClause(additionalSelect, true)
  
  let odataQuery = `${entityCollection}?$select=${selectFields}`
  
  // Add pagination if specified
  if (maxPageSize !== undefined && maxPageSize > 0) {
    odataQuery += `&$top=${maxPageSize}`
  }

  // Add view filter if available and not skipped
  if (!skipViewId && subgrid.viewId && !subgrid.isCustomView && !shouldSkipViewId(subgrid.viewId)) {
    odataQuery += `&savedQuery=${subgrid.viewId}`
  }

  // Add relationship filter if this is a related entity subgrid
  if (subgrid.relationshipName && parentRecordId) {
    // This will need relationship mapping - placeholder for now
    console.warn(`⚠️ Relationship filter needed for: ${subgrid.relationshipName}`)
  }

  return {
    entityLogicalName: subgrid.targetEntity,
    viewId: subgrid.viewId,
    odataQuery,
    relationshipName: subgrid.relationshipName,
    isRelatedQuery: !!subgrid.relationshipName,
    formId: subgrid.formId,
    controlId: subgrid.controlId,
  }
}

/**
 * Build metadata query for entity information
 */
export function buildMetadataQuery(entityLogicalName: string): string {
  return `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,DisplayName,EntitySetName&$expand=Attributes($select=LogicalName,DisplayName,AttributeType)`
}

/**
 * Build view definition query
 */
export function buildViewDefinitionQuery(viewId: string): string {
  return `savedqueries(${viewId})?$select=name,fetchxml,layoutxml,returnedtypecode`
}

/**
 * Build relationship discovery query
 */
export function buildRelationshipDiscoveryQuery(
  entityLogicalName: string,
  targetEntity?: string
): string {
  let query = `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes?$filter=AttributeType eq Microsoft.Dynamics.CRM.AttributeTypeCode'Lookup'&$select=LogicalName,DisplayName`
  
  if (targetEntity) {
    query += `&$expand=Targets($filter=LogicalName eq '${targetEntity}')`
  } else {
    query += `&$expand=Targets`
  }
  
  return query
}

/**
 * Validate a dataset query
 */
export function validateQuery(query: DatasetQuery): QueryValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!query.entityLogicalName) {
    errors.push('Entity logical name is required')
  }

  if (!query.odataQuery) {
    errors.push('OData query is required')
  }

  // Query format validation
  if (query.odataQuery && !query.odataQuery.includes('?') && !query.odataQuery.startsWith('$')) {
    errors.push('OData query must include query parameters or start with $ for parameter-only queries')
  }

  // Relationship query warnings
  if (query.isRelatedQuery && !query.relationshipName) {
    warnings.push('Related query without relationship name may not filter correctly')
  }

  if (query.relationshipName && !query.lookupColumn) {
    warnings.push('Relationship name provided but lookup column not specified')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Optimize query for performance
 */
export function optimizeQuery(query: DatasetQuery): DatasetQuery {
  const optimized = { ...query }

  // Remove unnecessary expansions
  if (optimized.odataQuery.includes('$expand=*($levels=1)')) {
    optimized.odataQuery = optimized.odataQuery.replace('&$expand=*($levels=1)', '')
    console.log('🚀 Removed unnecessary $expand for performance')
  }

  // Add count=false if not present to improve performance
  if (!optimized.odataQuery.includes('$count=')) {
    optimized.odataQuery += '&$count=false'
  }

  return optimized
}

/**
 * Build batch query for multiple entities
 */
export function buildBatchQuery(
  queries: Array<{ entityLogicalName: string; options?: QueryOptions }>
): DatasetQuery[] {
  return queries.map(({ entityLogicalName, options = {} }) => 
    buildDatasetQuery(entityLogicalName, options)
  )
}

/**
 * Parse OData query string into components
 */
export function parseODataQuery(odataQuery: string): {
  entityCollection?: string
  select?: string[]
  filter?: string
  orderBy?: string
  top?: number
  skip?: number
  expand?: string
  savedQuery?: string
} {
  const parts = odataQuery.split('?')
  const entityCollection = parts[0]
  
  if (parts.length < 2) {
    return { entityCollection }
  }

  const params = new URLSearchParams(parts[1])
  
  return {
    entityCollection,
    select: params.get('$select')?.split(','),
    filter: params.get('$filter') || undefined,
    orderBy: params.get('$orderby') || undefined,
    top: params.get('$top') ? parseInt(params.get('$top')!) : undefined,
    skip: params.get('$skip') ? parseInt(params.get('$skip')!) : undefined,
    expand: params.get('$expand') || undefined,
    savedQuery: params.get('savedQuery') || undefined,
  }
}