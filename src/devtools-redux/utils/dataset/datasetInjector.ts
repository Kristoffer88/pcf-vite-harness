/**
 * Dataset Injector
 * Injects retrieved records into PCF dataset and triggers updateView
 */

import type { QueryResult } from './types'
import { convertEntitiesToDatasetRecords, createDatasetColumnsFromEntities } from './datasetEnhancer'
import { fetchEntityMetadata, getEntityPrimaryKey, type EntityMetadataInfo } from './entityMetadata'

export interface DatasetInjectionOptions {
  context: ComponentFramework.Context<any>
  datasetName: string
  queryResult: QueryResult
  onUpdateView?: () => Promise<void>
}

/**
 * Inject records into a dataset and trigger updateView
 */
export async function injectDatasetRecords(options: DatasetInjectionOptions): Promise<boolean> {
  const { context, datasetName, queryResult, onUpdateView } = options

  if (!queryResult.success || !queryResult.entities || queryResult.entities.length === 0) {
    console.warn(`⚠️ No records to inject for dataset: ${datasetName}`)
    return false
  }

  try {
    // Get the dataset from context
    const dataset = context.parameters?.[datasetName]
    
    if (!dataset) {
      console.error(`❌ Dataset "${datasetName}" not found in context`)
      return false
    }

    console.log(`💉 Injecting ${queryResult.entities.length} records into dataset: ${datasetName}`)
    console.log(`📊 Existing records before injection:`, Object.keys(dataset.records || {}).length)

    // Convert entities to dataset records format
    const newRecords = await convertEntitiesToDatasetRecords(queryResult.entities, context.webAPI)
    console.log(`🔄 Converted ${Object.keys(newRecords).length} entities to dataset records`)
    
    // Clear existing records and add new ones
    if (dataset.records) {
      // Clear existing records
      console.log(`🧹 Clearing ${Object.keys(dataset.records).length} existing records`)
      Object.keys(dataset.records).forEach(key => {
        delete dataset.records[key]
      })
      
      // Add new records
      Object.assign(dataset.records, newRecords)
      console.log(`✅ Added ${Object.keys(newRecords).length} new records`)
    } else {
      // Create records object if it doesn't exist
      (dataset as any).records = newRecords
      console.log(`✅ Created new records object with ${Object.keys(newRecords).length} records`)
    }

    // Update columns if needed
    if (queryResult.entities.length > 0) {
      const newColumns = await createDatasetColumnsFromEntities(queryResult.entities, context.webAPI)
      if (newColumns.length > 0 && dataset.columns) {
        // Update existing columns or add new ones
        dataset.columns.length = 0
        dataset.columns.push(...newColumns)
      }
    }

    // Update paging information
    if (dataset.paging) {
      dataset.paging.totalResultCount = queryResult.entities.length
      dataset.paging.hasNextPage = !!queryResult.nextLink
      dataset.paging.hasPreviousPage = false
    }

    // Update loading state
    if ('loading' in dataset) {
      (dataset as any).loading = false
    }

    // Add sortedRecordIds for compatibility with some PCF controls
    const recordIds = Object.keys(newRecords)
    if ('sortedRecordIds' in dataset) {
      (dataset as any).sortedRecordIds = recordIds
    }

    // Update dataset metadata
    updateDatasetMetadata(dataset, queryResult)

    console.log(`✅ Successfully injected ${recordIds.length} records into dataset`)
    
    // Trigger updateView if provided
    if (onUpdateView) {
      console.log(`🔄 Triggering updateView after dataset injection`)
      await onUpdateView()
    }

    return true
  } catch (error) {
    console.error(`❌ Failed to inject records into dataset:`, error)
    return false
  }
}

/**
 * Update dataset metadata based on query results
 */
function updateDatasetMetadata(dataset: any, queryResult: QueryResult): void {
  // Update entity type if detected
  if (queryResult.entities.length > 0) {
    const firstEntity = queryResult.entities[0]
    if (!firstEntity) return
    const entityType = detectEntityType(firstEntity)
    
    if (entityType && dataset.getTargetEntityType) {
      // Override the getTargetEntityType function
      Object.defineProperty(dataset, 'getTargetEntityType', {
        value: () => entityType,
        writable: true,
        configurable: true
      })
    }
  }

  // Add formatted values helper
  if (!dataset.getFormattedValue && queryResult.entities.length > 0) {
    Object.defineProperty(dataset, 'getFormattedValue', {
      value: (recordId: string, columnName: string) => {
        const record = dataset.records?.[recordId]
        if (!record) return null
        
        const formattedKey = `${columnName}@OData.Community.Display.V1.FormattedValue`
        // Note: We can't use async in find, so we'll use the record data directly
        const entity = queryResult.entities.find(e => {
          // Try to match by common ID fields
          const idFields = Object.keys(e).filter(k => k.endsWith('id') && !k.includes('@'))
          for (const idField of idFields) {
            if (e[idField] === recordId) {
              return true
            }
          }
          return false
        })
        
        return entity ? (entity[formattedKey] || record[columnName]) : record[columnName]
      },
      writable: true,
      configurable: true
    })
  }
}

/**
 * Detect entity type from entity data or metadata
 */
function detectEntityType(entity: ComponentFramework.WebApi.Entity): string | null {
  // Check @odata.context if available (most reliable)
  const context = entity['@odata.context'] as string | undefined
  if (context) {
    // Extract entity name from context like "#/accounts(" or "#/pum_gantttasks("
    const match = context.match(/\/([a-z_]+)s?\(/i)
    if (match) {
      return match[1] ?? null
    }
  }
  
  // Fallback: Look for common entity type patterns in keys
  const keys = Object.keys(entity)
  for (const key of keys) {
    if (key.endsWith('id') && !key.includes('_') && !key.includes('@')) {
      // Extract entity name from primary key
      return key.substring(0, key.length - 2)
    }
  }
  
  return null
}

/**
 * Find primary key attribute in entity
 */
async function findPrimaryKey(
  entity: ComponentFramework.WebApi.Entity,
  webAPI?: ComponentFramework.WebApi
): Promise<string | null> {
  // Detect entity type from the data
  const entityType = detectEntityType(entity)
  
  if (entityType && webAPI) {
    // Fetch metadata to get the actual primary key attribute
    const metadata = await fetchEntityMetadata(entityType, webAPI)
    if (metadata) {
      const primaryKeyValue = getEntityPrimaryKey(entity, metadata)
      if (primaryKeyValue) {
        console.log(`🔑 Found primary key using metadata: ${metadata.PrimaryIdAttribute} = ${primaryKeyValue}`)
        return metadata.PrimaryIdAttribute
      }
    }
  }
  
  // Fallback to pattern-based detection
  if (entityType) {
    // For standard and custom entities, the primary key is usually entityname + 'id'
    const expectedPrimaryKey = `${entityType}id`
    
    // Check if this field exists and has a GUID value
    if (entity[expectedPrimaryKey]) {
      const value = entity[expectedPrimaryKey]
      if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.log(`🔑 Found primary key (pattern): ${expectedPrimaryKey} = ${value}`)
        return expectedPrimaryKey
      }
    }
  }
  
  // Final fallback: Look for any field ending with 'id' that contains a GUID
  const keys = Object.keys(entity)
  const idFields = keys.filter(k => k.endsWith('id') && !k.includes('@'))
  
  for (const key of idFields) {
    const value = entity[key]
    if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log(`🔑 Found primary key (fallback): ${key} = ${value}`)
      return key
    }
  }
  
  console.warn(`⚠️ No primary key found for entity type: ${entityType}`)
  console.warn(`⚠️ Available ID fields:`, idFields)
  
  return null
}

/**
 * Batch inject multiple dataset results
 */
export async function batchInjectDatasets(
  context: ComponentFramework.Context<any>,
  results: Array<{ datasetName: string; queryResult: QueryResult }>,
  onUpdateView?: () => Promise<void>
): Promise<number> {
  let successCount = 0
  
  for (const { datasetName, queryResult } of results) {
    const success = await injectDatasetRecords({
      context,
      datasetName,
      queryResult,
      // Only trigger updateView after all datasets are injected
      onUpdateView: undefined
    })
    
    if (success) {
      successCount++
    }
  }
  
  // Trigger updateView once after all injections
  if (onUpdateView && successCount > 0) {
    console.log(`🔄 Triggering updateView after batch injection (${successCount} datasets updated)`)
    await onUpdateView()
  }
  
  return successCount
}