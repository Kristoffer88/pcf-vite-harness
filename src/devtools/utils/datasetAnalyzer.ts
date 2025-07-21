/**
 * Dataset Analyzer - Functional utilities for analyzing PCF dataset parameters
 */

import type { PCFControlInfo, PCFManifest } from './pcfDiscovery'

export interface DatasetInfo {
  parameterKey: string
  dataset: ComponentFramework.PropertyTypes.DataSet
  isDatasetType: boolean
  hasRecords: boolean
  recordCount: number
  viewId?: string
  columns: string[]
  entityLogicalName?: string
}

export interface DatasetAnalysisResult {
  hasDatasets: boolean
  datasets: DatasetInfo[]
  primaryDataset?: DatasetInfo
}

/**
 * Detect all dataset parameters in PCF context
 */
export function detectDatasetParameters(
  context: ComponentFramework.Context<any>
): DatasetAnalysisResult {
  const datasets: DatasetInfo[] = []
  
  if (!context.parameters) {
    return { hasDatasets: false, datasets: [] }
  }

  // Scan all parameters for dataset types
  Object.keys(context.parameters).forEach(key => {
    const param = context.parameters[key]
    
    // Check if parameter has dataset characteristics
    if (isDatasetParameter(param)) {
      const datasetInfo = extractDatasetMetadata(key, param)
      datasets.push(datasetInfo)
    }
  })

  // Identify primary dataset (usually the one with most records or named 'data')
  const primaryDataset = findPrimaryDataset(datasets)

  return {
    hasDatasets: datasets.length > 0,
    datasets,
    primaryDataset
  }
}

/**
 * Check if a parameter is a dataset type
 */
function isDatasetParameter(param: any): param is ComponentFramework.PropertyTypes.DataSet {
  return (
    param &&
    typeof param === 'object' &&
    typeof param.getViewId === 'function' &&
    param.records !== undefined &&
    param.columns !== undefined &&
    param.paging !== undefined
  )
}

/**
 * Extract metadata from a dataset parameter
 */
export function extractDatasetMetadata(
  parameterKey: string,
  dataset: ComponentFramework.PropertyTypes.DataSet
): DatasetInfo {
  const records = dataset.records || {}
  const recordCount = Object.keys(records).length
  const columns = dataset.columns || []
  
  return {
    parameterKey,
    dataset,
    isDatasetType: true,
    hasRecords: recordCount > 0,
    recordCount,
    viewId: dataset.getViewId?.(),
    columns: columns.map(col => col.name || col.displayName || ''),
    entityLogicalName: extractEntityLogicalName(dataset)
  }
}

/**
 * Extract entity logical name from dataset (best effort)
 */
function extractEntityLogicalName(dataset: ComponentFramework.PropertyTypes.DataSet): string | undefined {
  // Try to get from first record's entity reference
  const records = dataset.records || {}
  const firstRecordId = Object.keys(records)[0]
  
  if (firstRecordId) {
    const firstRecord = records[firstRecordId]
    if (firstRecord) {
      // Look for entity reference patterns in record data
      const entityRef = firstRecord.getNamedReference?.()
      if (entityRef && 'entityType' in entityRef) {
        return (entityRef as any).entityType
      }
    }
  }

  // Fallback: try to infer from column metadata
  const columns = dataset.columns || []
  for (const column of columns) {
    if (column.name?.includes('_') && column.name.split('_').length >= 2) {
      // Pattern like "account_name" suggests "account" entity
      return column.name.split('_')[0]
    }
  }

  return undefined
}

/**
 * Find the primary dataset from a list of datasets
 */
function findPrimaryDataset(datasets: DatasetInfo[]): DatasetInfo | undefined {
  if (datasets.length === 0) return undefined
  if (datasets.length === 1) return datasets[0]

  // Priority 1: Dataset named "data"
  const dataDataset = datasets.find(ds => ds.parameterKey === 'data')
  if (dataDataset) return dataDataset

  // Priority 2: Dataset with most records
  const datasetWithMostRecords = datasets.reduce((prev, current) => 
    current.recordCount > prev.recordCount ? current : prev
  )

  return datasetWithMostRecords
}

/**
 * Analyze dataset structure for PCF control mapping
 */
export function analyzeDatasetStructure(
  context: ComponentFramework.Context<any>,
  manifest: PCFManifest
): {
  datasetAnalysis: DatasetAnalysisResult
  compatibleControls: PCFControlInfo[]
  recommendedMappings: Array<{
    datasetKey: string
    controlInfo: PCFControlInfo
    confidence: number
  }>
} {
  const datasetAnalysis = detectDatasetParameters(context)
  
  // For now, return empty arrays for controls since we need form discovery
  // This will be populated when we integrate with form discovery
  return {
    datasetAnalysis,
    compatibleControls: [],
    recommendedMappings: []
  }
}

/**
 * Compare two dataset states to detect changes
 */
export function compareDatasetStates(
  oldDataset: ComponentFramework.PropertyTypes.DataSet,
  newDataset: ComponentFramework.PropertyTypes.DataSet
): {
  hasChanges: boolean
  recordCountChanged: boolean
  viewIdChanged: boolean
  columnsChanged: boolean
  pagingChanged: boolean
  changes: string[]
} {
  const changes: string[] = []
  
  // Check record count changes
  const oldRecordCount = Object.keys(oldDataset.records || {}).length
  const newRecordCount = Object.keys(newDataset.records || {}).length
  const recordCountChanged = oldRecordCount !== newRecordCount
  
  if (recordCountChanged) {
    changes.push(`Record count: ${oldRecordCount} → ${newRecordCount}`)
  }

  // Check view ID changes
  const oldViewId = oldDataset.getViewId?.()
  const newViewId = newDataset.getViewId?.()
  const viewIdChanged = oldViewId !== newViewId
  
  if (viewIdChanged) {
    changes.push(`View ID: ${oldViewId} → ${newViewId}`)
  }

  // Check column changes
  const oldColumns = (oldDataset.columns || []).map(c => c.name).join(',')
  const newColumns = (newDataset.columns || []).map(c => c.name).join(',')
  const columnsChanged = oldColumns !== newColumns
  
  if (columnsChanged) {
    changes.push(`Columns changed`)
  }

  // Check paging changes
  const oldPaging = oldDataset.paging
  const newPaging = newDataset.paging
  const pagingChanged = (
    oldPaging?.totalResultCount !== newPaging?.totalResultCount ||
    oldPaging?.hasNextPage !== newPaging?.hasNextPage ||
    oldPaging?.hasPreviousPage !== newPaging?.hasPreviousPage
  )
  
  if (pagingChanged) {
    changes.push(`Paging state changed`)
  }

  return {
    hasChanges: changes.length > 0,
    recordCountChanged,
    viewIdChanged,
    columnsChanged,
    pagingChanged,
    changes
  }
}

/**
 * Get dataset summary for display in devtools
 */
export function getDatasetSummary(datasetInfo: DatasetInfo): {
  title: string
  subtitle: string
  details: Array<{ label: string; value: string }>
} {
  const { parameterKey, recordCount, viewId, columns, entityLogicalName } = datasetInfo
  
  return {
    title: `Dataset: ${parameterKey}`,
    subtitle: `${recordCount} records • ${columns.length} columns`,
    details: [
      { label: 'Entity', value: entityLogicalName || 'Unknown' },
      { label: 'View ID', value: viewId || 'None' },
      { label: 'Record Count', value: recordCount.toString() },
      { label: 'Columns', value: columns.join(', ') || 'None' },
      { label: 'Has Data', value: recordCount > 0 ? 'Yes' : 'No' }
    ]
  }
}