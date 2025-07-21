/**
 * Dataset Query Builder - Functional utilities for building and executing dataset queries
 */

import type { DatasetInfo } from './datasetAnalyzer'
import type { PCFControlInfo } from './pcfDiscovery'

export interface DatasetQuery {
  entityLogicalName: string
  viewId?: string
  odataQuery: string
  relationshipName?: string
  isRelatedQuery: boolean
}

export interface QueryResult {
  entities: ComponentFramework.WebApi.Entity[]
  totalCount?: number
  nextLink?: string
  success: boolean
  error?: string
}

export interface EnhancedDatasetResult {
  originalDataset: ComponentFramework.PropertyTypes.DataSet
  queryResult: QueryResult
  mergedRecords: any[]
  newRecordCount: number
  columnsUpdated: boolean
}

/**
 * Build OData query from PCF control information
 */
export function buildDatasetQuery(
  controlInfo: PCFControlInfo,
  entityLogicalName?: string
): DatasetQuery {
  const { dataSet } = controlInfo

  if (!dataSet) {
    throw new Error('Control does not have dataset configuration')
  }

  const targetEntity = entityLogicalName || dataSet.targetEntityType
  if (!targetEntity) {
    throw new Error('Cannot determine target entity for dataset query')
  }

  // Build base OData query
  let odataQuery = ''
  const queryParams: string[] = []

  // Add view-based filtering if viewId is available
  if (dataSet.viewId) {
    // Note: In real implementation, you'd need to fetch the view definition
    // and convert it to OData filter. For now, we'll skip select (defaults to all).
  }

  // Add relationship-based filtering for related data
  if (dataSet.relationshipName && dataSet.relationshipName.trim()) {
    // This would need the parent record ID in a real scenario
    queryParams.push(`$filter=${dataSet.relationshipName} ne null`)
  }


  // Order by primary name attribute (best effort)
  queryParams.push('$orderby=createdon desc')

  odataQuery = queryParams.length > 0 ? `?${queryParams.join('&')}` : ''

  return {
    entityLogicalName: targetEntity,
    viewId: dataSet.viewId,
    odataQuery,
    relationshipName: dataSet.relationshipName,
    isRelatedQuery: Boolean(dataSet.relationshipName?.trim()),
  }
}

/**
 * Execute dataset query using WebAPI
 */
export async function executeDatasetQuery(
  query: DatasetQuery,
  webAPI: ComponentFramework.WebApi
): Promise<QueryResult> {
  try {
    console.log(`🔄 Executing dataset query for ${query.entityLogicalName}`, query)

    const result = await webAPI.retrieveMultipleRecords(
      query.entityLogicalName,
      query.odataQuery
    )

    console.log(`✅ Query executed successfully: ${result.entities?.length || 0} records`)

    return {
      entities: result.entities || [],
      totalCount: result.entities?.length || 0,
      nextLink: result.nextLink,
      success: true,
    }
  } catch (error) {
    console.error(`❌ Dataset query failed:`, error)

    return {
      entities: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Convert WebAPI entities to PCF dataset records
 */
export function convertEntitiesToDatasetRecords(
  entities: ComponentFramework.WebApi.Entity[],
  entityLogicalName: string
): any[] {
  return entities.map((entity, index) => {
    const recordId = extractPrimaryId(entity, entityLogicalName)

    return {
      getRecordId: () => recordId,
      getFormattedValue: (columnName: string) => {
        // Try formatted value first (OData annotation)
        const formattedKey = `${columnName}@OData.Community.Display.V1.FormattedValue`
        if (entity[formattedKey]) {
          return entity[formattedKey]
        }

        // Fallback to raw value
        return entity[columnName]?.toString() || ''
      },
      getValue: (columnName: string) => entity[columnName],
      getNamedReference: () => ({
        id: { guid: recordId },
        name: extractPrimaryName(entity, entityLogicalName),
        entityType: entityLogicalName,
      }),
    }
  })
}

/**
 * Extract primary ID from entity (best effort)
 */
function extractPrimaryId(
  entity: ComponentFramework.WebApi.Entity,
  entityLogicalName: string
): string {
  // Try standard patterns
  const primaryIdPatterns = [
    `${entityLogicalName}id`,
    `${entityLogicalName.toLowerCase()}id`,
    'id',
    Object.keys(entity).find(key => key.endsWith('id') && !key.includes('@')),
  ]

  for (const pattern of primaryIdPatterns) {
    if (pattern && entity[pattern]) {
      return entity[pattern].toString().replace(/[{}]/g, '') // Remove GUID brackets
    }
  }

  // Fallback to first property that looks like an ID
  const idKey = Object.keys(entity).find(
    key => key.toLowerCase().includes('id') && !key.includes('@') && typeof entity[key] === 'string'
  )

  return idKey ? entity[idKey].toString().replace(/[{}]/g, '') : `temp-${Math.random()}`
}

/**
 * Extract primary name from entity (best effort)
 */
function extractPrimaryName(
  entity: ComponentFramework.WebApi.Entity,
  entityLogicalName: string
): string {
  // Try common name patterns
  const namePatterns = [
    'name',
    `${entityLogicalName}_name`,
    'fullname',
    'title',
    'subject',
    'displayname',
  ]

  for (const pattern of namePatterns) {
    if (entity[pattern]) {
      return entity[pattern].toString()
    }
  }

  // Fallback to first string property
  const stringKey = Object.keys(entity).find(
    key =>
      !key.includes('@') && !key.toLowerCase().includes('id') && typeof entity[key] === 'string'
  )

  return stringKey ? entity[stringKey].toString() : 'Unknown'
}

/**
 * Create dataset columns from query results
 */
export function createDatasetColumnsFromEntities(
  entities: ComponentFramework.WebApi.Entity[],
  existingColumns?: ComponentFramework.PropertyHelper.DataSetApi.Column[]
): ComponentFramework.PropertyHelper.DataSetApi.Column[] {
  if (entities.length === 0) {
    return existingColumns || []
  }

  const firstEntity = entities[0]
  if (!firstEntity) {
    return existingColumns || []
  }

  const columnNames = Object.keys(firstEntity).filter(key => !key.includes('@'))

  return columnNames.map((columnName, index) => ({
    name: columnName,
    displayName: formatColumnDisplayName(columnName),
    dataType: inferDataType(firstEntity[columnName]),
    alias: columnName,
    order: index,
    isPrimary: columnName.toLowerCase().includes('id'),
    visualSizeFactor: 1,
  }))
}

/**
 * Format column name for display
 */
function formatColumnDisplayName(columnName: string): string {
  return columnName
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Infer data type from value
 */
function inferDataType(value: any): string {
  if (value === null || value === undefined) return 'SingleLine.Text'
  if (typeof value === 'boolean') return 'TwoOptions'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Whole.None' : 'Decimal'
  }
  if (typeof value === 'string') {
    if (value.match(/^\d{4}-\d{2}-\d{2}T/)) return 'DateTime'
    if (value.includes('@')) return 'SingleLine.Email'
    if (value.startsWith('http')) return 'SingleLine.URL'
    return 'SingleLine.Text'
  }
  return 'SingleLine.Text'
}

/**
 * Merge query results into existing dataset
 */
export function mergeDatasetResults(
  existingDataset: ComponentFramework.PropertyTypes.DataSet,
  queryResult: QueryResult,
  entityLogicalName: string
): EnhancedDatasetResult {
  if (!queryResult.success || !queryResult.entities) {
    return {
      originalDataset: existingDataset,
      queryResult,
      mergedRecords: [],
      newRecordCount: 0,
      columnsUpdated: false,
    }
  }

  // Convert entities to dataset records
  const newRecords = convertEntitiesToDatasetRecords(queryResult.entities, entityLogicalName)

  // Create or update columns
  const newColumns = createDatasetColumnsFromEntities(queryResult.entities, existingDataset.columns)
  const columnsUpdated = newColumns.length !== (existingDataset.columns || []).length

  return {
    originalDataset: existingDataset,
    queryResult,
    mergedRecords: newRecords,
    newRecordCount: newRecords.length,
    columnsUpdated,
  }
}

/**
 * Create enhanced context with merged dataset results
 */
export function createEnhancedContext<T>(
  originalContext: ComponentFramework.Context<T>,
  datasetKey: string,
  enhancedResult: EnhancedDatasetResult
): ComponentFramework.Context<T> {
  if (!enhancedResult.queryResult.success) {
    return originalContext
  }

  // Create records object from merged records
  const records: { [id: string]: any } = {}
  enhancedResult.mergedRecords.forEach(record => {
    const recordId = record.getRecordId()
    records[recordId] = record
  })

  // Create enhanced dataset
  const enhancedDataset: ComponentFramework.PropertyTypes.DataSet = {
    ...enhancedResult.originalDataset,
    records,
    columns: createDatasetColumnsFromEntities(enhancedResult.queryResult.entities),
    paging: {
      totalResultCount: enhancedResult.newRecordCount,
      hasNextPage: Boolean(enhancedResult.queryResult.nextLink),
      hasPreviousPage: false,
      pageSize: enhancedResult.newRecordCount,
      firstPageNumber: 1,
      lastPageNumber: 1,
      loadPreviousPage: () => {},
      loadNextPage: () => {},
      loadExactPage: () => {},
      reset: () => {},
      setPageSize: () => {},
    },
    loading: false,
  }

  // Create enhanced context
  const enhancedContext = {
    ...originalContext,
    parameters: {
      ...originalContext.parameters,
      [datasetKey]: enhancedDataset,
    },
  }

  console.log(
    `✅ Enhanced context created with ${enhancedResult.newRecordCount} records for ${datasetKey}`
  )

  return enhancedContext
}
