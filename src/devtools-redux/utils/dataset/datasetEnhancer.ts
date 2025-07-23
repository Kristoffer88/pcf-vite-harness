/**
 * Dataset Enhancer
 * Functions for converting WebAPI results to PCF dataset format
 */

import type { EnhancedDatasetResult, QueryResult } from './types'
import { fetchEntityMetadata, getEntityPrimaryKey, getEntityPrimaryName, type EntityMetadataInfo } from './entityMetadata'

/**
 * Convert WebAPI entities to dataset records format
 */
export async function convertEntitiesToDatasetRecords(
  entities: ComponentFramework.WebApi.Entity[],
  webAPI?: ComponentFramework.WebApi
): Promise<{
  [id: string]: any
}> {
  const records: { [id: string]: any } = {}
  console.log(`🔄 Converting ${entities.length} entities to dataset records`)

  const recordIds = new Set<string>()
  let duplicateCount = 0

  // Get entity metadata for proper field mapping
  let entityMetadata: EntityMetadataInfo | null = null
  if (entities.length > 0 && entities[0]) {
    const entityType = detectEntityType(entities[0])
    if (entityType) {
      entityMetadata = await fetchEntityMetadata(entityType, webAPI)
    }
  }

  for (const [index, entity] of entities.entries()) {
    let recordId: string | null = null
    
    if (entityMetadata) {
      recordId = getEntityPrimaryKey(entity, entityMetadata)
    }
    
    // Fallback to old method if metadata approach fails
    if (!recordId) {
      const primaryKey = findPrimaryKey(entity)
      if (primaryKey) {
        recordId = entity[primaryKey] as string
      }
    }
    
    if (recordId) {
      // Check for duplicates
      if (recordIds.has(recordId)) {
        duplicateCount++
        console.warn(`⚠️ Duplicate record ID found: ${recordId} (entity ${index + 1})`)
      }
      recordIds.add(recordId)
      
      records[recordId] = await convertEntityToRecord(entity, entityMetadata, webAPI)
      if (index < 5) {
        console.log(`✅ Converted entity ${index + 1}: ${entityMetadata?.PrimaryIdAttribute || 'id'} = ${recordId}`)
      }
    } else {
      console.warn(`⚠️ Could not find primary key for entity ${index + 1}:`, Object.keys(entity).slice(0, 10))
    }
  }
  
  // Log available ID fields for debugging
  if (entities.length > 0) {
    const sampleEntity = entities[0]
    if (sampleEntity) {
      const idFields = Object.keys(sampleEntity).filter(k => k.endsWith('id') && !k.includes('@'))
      console.log(`🔑 Available ID fields in entities:`, idFields)
    }
  }
  
  if (duplicateCount > 0) {
    console.warn(`⚠️ Found ${duplicateCount} duplicate record IDs!`)
  }

  console.log(`✅ Converted ${Object.keys(records).length} records successfully`)
  return records
}

/**
 * Create dataset columns from entities
 */
export async function createDatasetColumnsFromEntities(
  entities: ComponentFramework.WebApi.Entity[],
  webAPI?: ComponentFramework.WebApi
): Promise<ComponentFramework.PropertyHelper.DataSetApi.Column[]> {
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
export async function mergeDatasetResults(
  originalDataset: ComponentFramework.PropertyTypes.DataSet,
  queryResult: QueryResult
): Promise<EnhancedDatasetResult> {
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
  const newRecords = await convertEntitiesToDatasetRecords(queryResult.entities)

  // Get existing records
  const existingRecords = originalDataset.records || {}

  // Merge records (new records will override existing ones with same ID)
  const mergedRecords = { ...existingRecords, ...newRecords }

  // Update columns if needed
  const newColumns = await createDatasetColumnsFromEntities(queryResult.entities)
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
export async function createEnhancedContext(
  originalContext: ComponentFramework.Context<any>,
  datasetKey: string,
  enhancedResult: EnhancedDatasetResult
): Promise<ComponentFramework.Context<any>> {
  // This is a simplified version - in a real implementation,
  // you would need to properly clone and modify the context
  const enhancedContext = { ...originalContext }

  if (enhancedContext.parameters && enhancedContext.parameters[datasetKey]) {
    const dataset = enhancedContext.parameters[datasetKey] as any

    // Update the dataset with new records
    if (dataset.records) {
      Object.assign(
        dataset.records,
        await convertEntitiesToDatasetRecords(enhancedResult.queryResult.entities)
      )
    }

    // Update columns if needed
    if (enhancedResult.columnsUpdated && dataset.columns) {
      const newColumns = await createDatasetColumnsFromEntities(enhancedResult.queryResult.entities)
      dataset.columns.push(...newColumns)
    }
  }

  return enhancedContext
}

// Helper functions

function detectEntityType(entity: ComponentFramework.WebApi.Entity): string | null {
  // Try to detect entity type from @odata.context
  const odataContext = entity['@odata.context'] as string | undefined
  if (odataContext) {
    const match = odataContext.match(/\/([a-z_]+)s?\(/i)
    if (match) {
      return match[1] || null
    }
  }
  
  // Fallback: Look for entity type indicators in the data
  const keys = Object.keys(entity)
  for (const key of keys) {
    if (key.endsWith('id') && !key.includes('@') && !key.includes('.')) {
      // Extract entity name from primary key pattern
      const entityName = key.substring(0, key.length - 2)
      if (entityName && !entityName.includes('_')) {
        return entityName
      }
    }
  }
  
  return null
}

function findPrimaryKey(entity: ComponentFramework.WebApi.Entity): string | null {
  // Try to detect entity type from @odata.context
  let entityType: string | null = null
  const odataContext = entity['@odata.context'] as string | undefined
  if (odataContext) {
    const match = odataContext.match(/\/([a-z_]+)s?\(/i)
    if (match) {
      entityType = match[1] || null
    }
  }
  
  if (entityType) {
    // For Dataverse entities, the primary key is always entityname + 'id'
    const expectedPrimaryKey = `${entityType}id`
    
    // Check if this field exists and has a GUID value
    if (entity[expectedPrimaryKey]) {
      const value = entity[expectedPrimaryKey]
      if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return expectedPrimaryKey
      }
    }
  }
  
  // Fallback: Look for any field ending with 'id' that contains a GUID and is not a relationship
  const keys = Object.keys(entity)
  for (const key of keys) {
    if (key.endsWith('id') && !key.includes('@') && !key.includes('.')) {
      const value = entity[key]
      if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Skip relationship fields
        if (!key.includes('parent') && !key.includes('related') && !key.includes('regarding') && !key.includes('owner')) {
          return key
        }
      }
    }
  }
  
  return null
}

async function convertEntityToRecord(
  entity: ComponentFramework.WebApi.Entity,
  metadata: EntityMetadataInfo | null,
  webAPI?: ComponentFramework.WebApi
): Promise<any> {
  const record: any = {}

  // If we have metadata, ensure we include the primary name field
  if (metadata) {
    const primaryName = getEntityPrimaryName(entity, metadata)
    record[metadata.PrimaryNameAttribute] = primaryName
    
    // Also set a standard 'name' field for compatibility
    record.name = primaryName
  }

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
