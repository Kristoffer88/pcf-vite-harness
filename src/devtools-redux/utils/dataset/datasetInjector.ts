/**
 * Dataset Injector
 * Injects retrieved records into PCF dataset and triggers updateView
 */

import type { QueryResult } from './types'
import type { PCFDataset } from '../../../types/dataset'
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
    const newRecords = await convertEntitiesToDatasetRecords(queryResult.entities, queryResult.entityLogicalName, context.webAPI)
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
      const newColumns = await createDatasetColumnsFromEntities(queryResult.entities, queryResult.entityLogicalName, context.webAPI)
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
function updateDatasetMetadata(dataset: Partial<PCFDataset>, queryResult: QueryResult): void {
  // Update entity type from query result
  if (queryResult.entityLogicalName && dataset.getTargetEntityType) {
    // Override the getTargetEntityType function
    Object.defineProperty(dataset, 'getTargetEntityType', {
      value: () => queryResult.entityLogicalName,
      writable: true,
      configurable: true
    })
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