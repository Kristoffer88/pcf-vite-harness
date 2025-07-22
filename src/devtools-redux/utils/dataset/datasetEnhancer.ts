/**
 * Dataset Enhancer
 * Functions for converting WebAPI results to PCF dataset format
 */

import type { EnhancedDatasetResult, QueryResult } from './types'

/**
 * Convert WebAPI entities to dataset records format
 */
export function convertEntitiesToDatasetRecords(entities: ComponentFramework.WebApi.Entity[]): {
  [id: string]: any
} {
  const records: { [id: string]: any } = {}

  entities.forEach(entity => {
    const primaryKey = findPrimaryKey(entity)
    if (primaryKey) {
      const recordId = entity[primaryKey] as string
      records[recordId] = convertEntityToRecord(entity)
    }
  })

  return records
}

/**
 * Create dataset columns from entities
 */
export function createDatasetColumnsFromEntities(
  entities: ComponentFramework.WebApi.Entity[]
): ComponentFramework.PropertyHelper.DataSetApi.Column[] {
  if (entities.length === 0) {
    return []
  }

  const sampleEntity = entities[0]
  const columns: ComponentFramework.PropertyHelper.DataSetApi.Column[] = []

  Object.keys(sampleEntity || {}).forEach(attributeName => {
    // Skip system attributes that start with @
    if (attributeName.startsWith('@')) {
      return
    }

    const column: ComponentFramework.PropertyHelper.DataSetApi.Column = {
      name: attributeName,
      displayName: formatDisplayName(attributeName),
      dataType: inferDataType(sampleEntity?.[attributeName]),
      alias: attributeName,
      order: columns.length,
      isPrimary: isPrimaryKeyAttribute(attributeName),
      visualSizeFactor: 1,
    }

    columns.push(column)
  })

  return columns
}

/**
 * Merge query results with existing dataset
 */
export function mergeDatasetResults(
  originalDataset: ComponentFramework.PropertyTypes.DataSet,
  queryResult: QueryResult
): EnhancedDatasetResult {
  if (!queryResult.success) {
    return {
      originalDataset,
      queryResult,
      mergedRecords: [],
      newRecordCount: 0,
      columnsUpdated: false,
    }
  }

  // Convert entities to records
  const newRecords = convertEntitiesToDatasetRecords(queryResult.entities)

  // Get existing records
  const existingRecords = originalDataset.records || {}

  // Merge records (new records will override existing ones with same ID)
  const mergedRecords = { ...existingRecords, ...newRecords }

  // Update columns if needed
  const newColumns = createDatasetColumnsFromEntities(queryResult.entities)
  const columnsUpdated = newColumns.length > 0

  return {
    originalDataset,
    queryResult,
    mergedRecords: Object.values(mergedRecords),
    newRecordCount: Object.keys(newRecords).length,
    columnsUpdated,
  }
}

/**
 * Create enhanced context with new dataset data
 */
export function createEnhancedContext(
  originalContext: ComponentFramework.Context<any>,
  datasetKey: string,
  enhancedResult: EnhancedDatasetResult
): ComponentFramework.Context<any> {
  // This is a simplified version - in a real implementation,
  // you would need to properly clone and modify the context
  const enhancedContext = { ...originalContext }

  if (enhancedContext.parameters && enhancedContext.parameters[datasetKey]) {
    const dataset = enhancedContext.parameters[datasetKey] as any

    // Update the dataset with new records
    if (dataset.records) {
      Object.assign(
        dataset.records,
        convertEntitiesToDatasetRecords(enhancedResult.queryResult.entities)
      )
    }

    // Update columns if needed
    if (enhancedResult.columnsUpdated && dataset.columns) {
      const newColumns = createDatasetColumnsFromEntities(enhancedResult.queryResult.entities)
      dataset.columns.push(...newColumns)
    }
  }

  return enhancedContext
}

// Helper functions

function findPrimaryKey(entity: ComponentFramework.WebApi.Entity): string | null {
  // Look for common primary key patterns
  const keys = Object.keys(entity)

  // Find attribute ending with 'id' that contains a GUID
  for (const key of keys) {
    if (key.endsWith('id') && typeof entity[key] === 'string') {
      const value = entity[key] as string
      // Check if it looks like a GUID
      if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return key
      }
    }
  }

  return null
}

function convertEntityToRecord(entity: ComponentFramework.WebApi.Entity): any {
  const record: any = {}

  Object.entries(entity).forEach(([key, value]) => {
    // Skip system attributes
    if (key.startsWith('@')) {
      return
    }

    // Handle formatted values
    const formattedKey = `${key}@OData.Community.Display.V1.FormattedValue`
    if (entity[formattedKey]) {
      record[key] = {
        raw: value,
        formatted: entity[formattedKey],
      }
    } else {
      record[key] = value
    }
  })

  return record
}

function formatDisplayName(attributeName: string): string {
  // Convert camelCase/underscore to display name
  return attributeName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}

function inferDataType(value: any): string {
  if (value === null || value === undefined) {
    return 'SingleLine.Text'
  }

  if (typeof value === 'string') {
    // Check if it's a date
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return 'DateAndTime.DateAndTime'
    }
    // Check if it's a GUID
    if (value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return 'Lookup.Simple'
    }
    return 'SingleLine.Text'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Whole.None' : 'Decimal'
  }

  if (typeof value === 'boolean') {
    return 'TwoOptions'
  }

  return 'SingleLine.Text'
}

function isPrimaryKeyAttribute(attributeName: string): boolean {
  return attributeName.endsWith('id') && !attributeName.includes('_')
}
