/**
 * Dataset Generator
 * Generates PCF dataset structure from Dataverse view and entity metadata
 */

import {
  fetchViewMetadata,
  fetchAttributeMetadata,
  buildDatasetColumns,
  type ViewMetadata,
  type AttributeMetadata,
} from './datasetMetadataFetcher'
import {
  fetchEntityMetadata,
  getEntityPrimaryName,
  type EntityMetadataInfo,
} from './entityMetadata'

export interface DatasetGenerationOptions {
  viewId: string
  pageSize?: number
  sortColumn?: string
  sortDirection?: number
  includeRecords?: boolean
  recordLimit?: number
  onProgress?: (step: string, details?: any) => void
  parentEntityFilter?: {
    parentEntityType: string
    parentEntityId: string
    lookupFieldName: string
  }
}

export interface GeneratedDataset {
  loading: boolean
  columns: any[]
  error: boolean
  errorMessage: string | null
  innerError: any | null
  sortedRecordIds: string[]
  records: Record<string, any>
  sorting: Array<{ name: string; sortDirection: number }>
  filtering: { aliasMap: Record<string, string> }
  paging: {
    pageNumber: number
    totalResultCount: number
    firstPageNumber: number
    lastPageNumber: number
    pageSize: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  linking: any
  entityDisplayCollectionName: string
  _capabilities: {
    hasRecordNavigation: boolean
  }
}

/**
 * Generate a complete dataset structure from a view
 */
export async function generateDatasetFromView(
  options: DatasetGenerationOptions
): Promise<GeneratedDataset> {
  try {
    // Notify progress
    options.onProgress?.('fetchingView', { viewId: options.viewId })
    
    // Fetch view metadata
    const viewMetadata = await fetchViewMetadata(options.viewId)
    console.log(`📋 Generating dataset from view: ${viewMetadata.viewName}`)
    options.onProgress?.('viewFetched', { viewName: viewMetadata.viewName, columnCount: viewMetadata.columns.length })

    // Get column names from view
    const columnNames = viewMetadata.columns.map(col => col.name)
    options.onProgress?.('fetchingMetadata', { entityName: viewMetadata.entityName, columnCount: columnNames.length })
    
    // Fetch attribute metadata for all columns
    const attributeMetadata = await fetchAttributeMetadata(viewMetadata.entityName, columnNames)
    options.onProgress?.('metadataFetched', { attributeCount: attributeMetadata.size })
    
    // Build dataset columns
    options.onProgress?.('buildingColumns')
    const columns = await buildDatasetColumns(viewMetadata, attributeMetadata)
    options.onProgress?.('columnsBuilt', { columnCount: columns.length })
    
    // Create alias map for filtering
    const aliasMap: Record<string, string> = {}
    columns.forEach(col => {
      aliasMap[col.alias] = col.name
    })

    // Initialize dataset structure
    const dataset: GeneratedDataset = {
      loading: false,
      columns,
      error: false,
      errorMessage: null,
      innerError: null,
      sortedRecordIds: [],
      records: {},
      sorting: [
        {
          name: options.sortColumn || findDefaultSortColumn(columns),
          sortDirection: options.sortDirection || 0,
        },
      ],
      filtering: { aliasMap },
      paging: {
        pageNumber: 1,
        totalResultCount: 0,
        firstPageNumber: 1,
        lastPageNumber: 1,
        pageSize: options.pageSize || 50,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      linking: {},
      entityDisplayCollectionName: getEntityDisplayName(viewMetadata.entityName),
      _capabilities: {
        hasRecordNavigation: true,
      },
    }

    // Fetch records if requested
    if (options.includeRecords) {
      options.onProgress?.('fetchingRecords', { limit: options.recordLimit })
      await populateDatasetRecords(dataset, viewMetadata, options.recordLimit, options.onProgress, options.parentEntityFilter)
      options.onProgress?.('recordsFetched', { recordCount: dataset.sortedRecordIds.length })
    }

    return dataset
  } catch (error) {
    console.error('Failed to generate dataset:', error)
    return createErrorDataset(error as Error)
  }
}

/**
 * Populate dataset with records from Dataverse
 */
async function populateDatasetRecords(
  dataset: GeneratedDataset,
  viewMetadata: ViewMetadata,
  recordLimit?: number,
  onProgress?: (step: string, details?: any) => void,
  parentEntityFilter?: {
    parentEntityType: string
    parentEntityId: string
    lookupFieldName: string
  }
): Promise<void> {
  try {
    // Fetch entity metadata first
    const entityMetadata = await fetchEntityMetadata(viewMetadata.entityName)
    if (!entityMetadata) {
      throw new Error(`Failed to fetch metadata for entity: ${viewMetadata.entityName}`)
    }
    
    // Build select clause from view columns
    const selectColumns = viewMetadata.columns.map(col => col.name).join(',')
    
    // Get entity set name (pluralize entity name)
    const entitySetName = getEntitySetName(viewMetadata.entityName)
    
    // Fetch records
    const limit = recordLimit || dataset.paging.pageSize
    let url = `/api/data/v9.1/${entitySetName}?$select=${selectColumns}&$top=${limit}`
    
    // Add parent entity filter if provided
    if (parentEntityFilter) {
      const filter = `${parentEntityFilter.lookupFieldName} eq ${parentEntityFilter.parentEntityId}`
      url += `&$filter=${filter}`
      console.log(`🔍 Adding parent entity filter: ${filter}`)
    }
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.value && Array.isArray(data.value)) {
      onProgress?.('processingRecords', { count: data.value.length })
      
      // Process each record
      data.value.forEach((entity: any, index: number) => {
        const recordId = entity[`${viewMetadata.entityName}id`]
        if (recordId) {
          const record = createDatasetRecord(entity, viewMetadata.entityName, dataset.columns, entityMetadata)
          dataset.records[recordId] = record
          dataset.sortedRecordIds.push(recordId)
          
          // Report progress every 10 records for large datasets
          if ((index + 1) % 10 === 0 || index === data.value.length - 1) {
            onProgress?.('recordsProcessed', { current: index + 1, total: data.value.length })
          }
        }
      })

      // Update paging info
      dataset.paging.totalResultCount = data['@odata.count'] || data.value.length
      dataset.paging.lastPageNumber = Math.ceil(dataset.paging.totalResultCount / dataset.paging.pageSize)
      dataset.paging.hasNextPage = !!data['@odata.nextLink']
    }
  } catch (error) {
    console.error('Failed to fetch records:', error)
    dataset.error = true
    dataset.errorMessage = 'Failed to fetch records'
    dataset.innerError = error
  }
}

/**
 * Create a dataset record from an entity
 */
function createDatasetRecord(
  entity: any,
  entityName: string,
  columns: any[],
  entityMetadata: EntityMetadataInfo
): any {
  const recordId = entity[`${entityName}id`]
  const primaryFieldName = entityMetadata.PrimaryNameAttribute || 'name'
  const primaryNameValue = getEntityPrimaryName(entity, entityMetadata)

  const record = {
    _record: {
      initialized: 2,
      identifier: {
        etn: entityName,
        id: {
          guid: recordId,
        },
      },
      fields: {} as any,
    },
    _columnAliasNameMap: {},
    _primaryFieldName: primaryFieldName,
    _isDirty: false,
    _entityReference: {
      _etn: entityName,
      _id: recordId,
      _name: primaryNameValue,
    },
  }

  // Process each column
  columns.forEach(column => {
    const fieldName = column.name
    const fieldValue = entity[fieldName]
    
    if (fieldValue !== undefined && fieldValue !== null) {
      const formattedValueKey = `${fieldName}@OData.Community.Display.V1.FormattedValue`
      const formattedValue = entity[formattedValueKey]

      // Create field object based on column type
      const field = createFieldObject(fieldValue, formattedValue, column)
      record._record.fields[fieldName] = field
    }
  })

  return record
}

/**
 * Create a field object for a record
 */
function createFieldObject(value: any, formattedValue: any, column: any): any {
  const timestamp = new Date().toISOString()
  const validationResult = {
    errorId: null,
    errorMessage: null,
    isValueValid: true,
    userInput: null,
    isOfflineSyncError: false,
  }

  // Handle different field types
  switch (column.type) {
    case 'lookup':
    case 'customer':
    case 'owner':
      // Lookup fields
      if (typeof value === 'string' && value.match(/^[0-9a-f-]{36}$/i)) {
        const lookupFormattedKey = `_${column.name}_value@OData.Community.Display.V1.FormattedValue`
        return {
          reference: {
            etn: column.targets?.[0] || column.name.replace(/_value$/, '').replace(/^_/, '') || 'unknown',
            id: {
              guid: value,
            },
            name: formattedValue || '',
          },
          timestamp,
          validationResult,
        }
      }
      break

    case 'picklist':
    case 'state':
    case 'boolean':
      // Option set and boolean fields
      return {
        label: formattedValue || value.toString(),
        valueString: value.toString(),
        timestamp,
        validationResult,
      }

    case 'integer':
    case 'decimal':
    case 'money':
      // Numeric fields
      return {
        value: Number(value),
        formatted: formattedValue || value.toString(),
        timestamp,
        validationResult,
      }

    case 'datetime':
      // Date time fields
      return {
        value: value,
        formatted: formattedValue || new Date(value).toLocaleString(),
        timestamp,
        validationResult,
      }

    default:
      // String and other fields
      return {
        value: value,
        timestamp,
        validationResult,
      }
  }
}

/**
 * Create an error dataset
 */
function createErrorDataset(error: Error): GeneratedDataset {
  return {
    loading: false,
    columns: [],
    error: true,
    errorMessage: error.message,
    innerError: error,
    sortedRecordIds: [],
    records: {},
    sorting: [],
    filtering: { aliasMap: {} },
    paging: {
      pageNumber: 1,
      totalResultCount: 0,
      firstPageNumber: 1,
      lastPageNumber: 1,
      pageSize: 5000,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    linking: {},
    entityDisplayCollectionName: 'Error',
    _capabilities: {
      hasRecordNavigation: false,
    },
  }
}

/**
 * Helper functions
 */
function findDefaultSortColumn(columns: any[]): string {
  // Look for common sort columns
  const commonSortColumns = ['createdon', 'modifiedon', 'name', 'title']
  
  for (const colName of commonSortColumns) {
    if (columns.find(col => col.name === colName)) {
      return colName
    }
  }

  // Default to first column
  return columns[0]?.name || ''
}

function findPrimaryFieldName(columns: any[]): string | null {
  const primaryColumn = columns.find(col => col.isPrimary)
  return primaryColumn?.name || null
}

function getEntitySetName(entityName: string): string {
  // Simple pluralization - in real implementation, this would use metadata
  if (entityName.endsWith('y')) {
    return entityName.slice(0, -1) + 'ies'
  } else if (entityName.endsWith('s')) {
    return entityName + 'es'
  } else {
    return entityName + 's'
  }
}

function getEntityDisplayName(entityName: string): string {
  // Simply capitalize and pluralize the entity name
  // Real display name should come from entity metadata
  const capitalized = entityName.charAt(0).toUpperCase() + entityName.slice(1)
  
  // Simple pluralization
  if (entityName.endsWith('y')) {
    return capitalized.slice(0, -1) + 'ies'
  } else if (entityName.endsWith('s')) {
    return capitalized + 'es'
  } else {
    return capitalized + 's'
  }
}