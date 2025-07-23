/**
 * Dataset Enhancer
 * Functions for converting WebAPI results to PCF dataset format
 */

import type { EnhancedDatasetResult, QueryResult } from './types'
import type { DataverseEntity } from '../../../types/dataverse'
import type { DatasetRecord, DatasetColumn, DatasetFieldValue, BaseFieldValue, DatasetColumnType } from '../../../types/dataset'
import { fetchEntityMetadata, getEntityPrimaryKey, getEntityPrimaryName, type EntityMetadataInfo } from './entityMetadata'
import { FORMATTED_VALUE_SUFFIX } from '../../../types/dataverse'

/**
 * Convert WebAPI entities to dataset records format
 */
export async function convertEntitiesToDatasetRecords(
  entities: DataverseEntity[],
  entityLogicalName: string,
  webAPI?: ComponentFramework.WebApi
): Promise<Record<string, DatasetRecord>> {
  const records: Record<string, DatasetRecord> = {}
  console.log(`🔄 Converting ${entities.length} entities to dataset records`)

  const recordIds = new Set<string>()
  let duplicateCount = 0

  // Get entity metadata for proper field mapping
  const entityMetadata = await fetchEntityMetadata(entityLogicalName, webAPI)

  if (!entityMetadata) {
    throw new Error(`Failed to fetch metadata for entity: ${entityLogicalName}`)
  }

  for (const [index, entity] of entities.entries()) {
    const recordId = getEntityPrimaryKey(entity, entityMetadata)
    
    if (recordId) {
      // Check for duplicates
      if (recordIds.has(recordId)) {
        duplicateCount++
        console.warn(`⚠️ Duplicate record ID found: ${recordId} (entity ${index + 1})`)
      }
      recordIds.add(recordId)
      
      records[recordId] = await convertEntityToRecord(entity, entityMetadata, webAPI)
      if (index < 5) {
        console.log(`✅ Converted entity ${index + 1}: ${entityMetadata.PrimaryIdAttribute} = ${recordId}`)
      }
    } else {
      console.warn(`⚠️ Could not find primary key for entity ${index + 1}:`, Object.keys(entity).slice(0, 10))
    }
  }
  
  // Log primary ID field for debugging
  console.log(`🔑 Using primary ID field: ${entityMetadata.PrimaryIdAttribute} for entity ${entityLogicalName}`)
  
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
  entities: DataverseEntity[],
  entityLogicalName: string,
  webAPI?: ComponentFramework.WebApi
): Promise<DatasetColumn[]> {
  if (entities.length === 0) {
    return []
  }

  const sampleEntity = entities[0]
  const columns: DatasetColumn[] = []

  Object.keys(sampleEntity || {}).forEach(attributeName => {
    // Skip system attributes that start with @
    if (attributeName.startsWith('@')) {
      return
    }

    const column: DatasetColumn = {
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
  const newRecords = await convertEntitiesToDatasetRecords(queryResult.entities, queryResult.entityLogicalName)

  // Get existing records
  const existingRecords = originalDataset.records || {}

  // Merge records (new records will override existing ones with same ID)
  const mergedRecords = { ...existingRecords, ...newRecords }

  // Update columns if needed
  const newColumns = await createDatasetColumnsFromEntities(queryResult.entities, queryResult.entityLogicalName)
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
        await convertEntitiesToDatasetRecords(enhancedResult.queryResult.entities, enhancedResult.queryResult.entityLogicalName)
      )
    }

    // Update columns if needed
    if (enhancedResult.columnsUpdated && dataset.columns) {
      const newColumns = await createDatasetColumnsFromEntities(enhancedResult.queryResult.entities, enhancedResult.queryResult.entityLogicalName)
      dataset.columns.push(...newColumns)
    }
  }

  return enhancedContext
}

// Helper functions

async function convertEntityToRecord(
  entity: DataverseEntity,
  metadata: EntityMetadataInfo,
  webAPI?: ComponentFramework.WebApi
): Promise<DatasetRecord> {
  // Get primary key and name from metadata
  const recordId = getEntityPrimaryKey(entity, metadata)
  const primaryName = getEntityPrimaryName(entity, metadata)
  const entityType = metadata.LogicalName
  
  // Create PCF-compatible record structure
  const record: DatasetRecord = {
    _record: {
      initialized: 2,
      identifier: {
        etn: entityType,
        id: {
          guid: recordId || ''
        }
      },
      fields: {} as any
    },
    _columnAliasNameMap: {},
    _primaryFieldName: metadata.PrimaryNameAttribute,
    _isDirty: false,
    _entityReference: {
      _etn: entityType,
      _id: recordId || '',
      _name: primaryName
    }
  }

  // Process fields into the _record.fields structure
  Object.entries(entity).forEach(([key, value]) => {
    // Skip system attributes
    if (key.startsWith('@')) {
      return
    }

    // Create field object
    const field: DatasetFieldValue = {
      value: value,
      timestamp: new Date().toISOString(),
      validationResult: {
        errorId: null,
        errorMessage: null,
        isValueValid: true,
        userInput: null,
        isOfflineSyncError: false
      }
    } as DatasetFieldValue

    // Handle formatted values
    const formattedKey = `${key}${FORMATTED_VALUE_SUFFIX}`
    if (entity[formattedKey]) {
      (field as any).formatted = entity[formattedKey]
    }

    record._record.fields[key] = field
  })

  // Also set fields directly on record for backward compatibility
  record[metadata.PrimaryNameAttribute] = primaryName
  // Only set 'name' field if it's different from the primary name attribute
  if (metadata.PrimaryNameAttribute !== 'name') {
    record.name = primaryName
  }

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

function inferDataType(value: any): DatasetColumnType {
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
