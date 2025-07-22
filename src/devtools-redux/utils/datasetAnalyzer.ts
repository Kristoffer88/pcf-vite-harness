/**
 * Dataset Analysis Utilities
 * Analyzes PCF dataset parameters and provides metadata
 */

export interface DatasetInfo {
  name: string
  records: Record<string, any>
  columns: Array<{
    name: string
    displayName: string
    dataType: string
    alias?: string
  }>
  recordCount: number
  columnCount: number
  hasData: boolean
  entityLogicalName?: string
  viewId?: string
  isUserView?: boolean
}

export interface DatasetAnalysisResult {
  datasets: DatasetInfo[]
  primaryDataset?: DatasetInfo
  totalRecords: number
  summary: string
}

/**
 * Detects and analyzes all dataset parameters in a PCF context
 */
export function detectDatasetParameters(context: ComponentFramework.Context<any>): DatasetAnalysisResult {
  console.log('🔍 Analyzing context parameters for datasets...')
  
  if (!context?.parameters) {
    console.log('⚠️ No parameters found in context')
    return {
      datasets: [],
      totalRecords: 0,
      summary: 'No parameters found'
    }
  }

  const datasets: DatasetInfo[] = []
  let totalRecords = 0

  for (const [paramName, parameter] of Object.entries(context.parameters)) {
    console.log(`🔍 Checking parameter: ${paramName}`, {
      type: typeof parameter,
      hasRecords: parameter && typeof parameter === 'object' && 'records' in parameter,
      hasColumns: parameter && typeof parameter === 'object' && 'columns' in parameter
    })

    // Check if this parameter is a dataset
    if (parameter && typeof parameter === 'object' && 
        'records' in parameter && 'columns' in parameter) {
      
      const dataset = parameter as any
      const records = dataset.records || {}
      const columns = dataset.columns || []
      const recordCount = Object.keys(records).length
      
      console.log(`✅ Found dataset: ${paramName} with ${recordCount} records and ${columns.length} columns`)
      
      const datasetInfo: DatasetInfo = {
        name: paramName,
        records,
        columns: columns.map((col: any) => ({
          name: col.name || '',
          displayName: col.displayName || col.name || '',
          dataType: col.dataType || 'unknown',
          alias: col.alias
        })),
        recordCount,
        columnCount: columns.length,
        hasData: recordCount > 0,
        entityLogicalName: dataset.getTargetEntityType?.(),
        viewId: dataset.getViewId?.(),
        isUserView: dataset.isUserView?.()
      }
      
      datasets.push(datasetInfo)
      totalRecords += recordCount
    }
  }

  const primaryDataset = findPrimaryDataset(datasets)
  const summary = generateDatasetSummary(datasets, totalRecords)
  
  console.log(`📊 Dataset analysis complete: ${datasets.length} datasets, ${totalRecords} total records`)
  
  return {
    datasets,
    primaryDataset,
    totalRecords,
    summary
  }
}

/**
 * Finds the primary dataset (usually the one with most records or named 'dataSet')
 */
function findPrimaryDataset(datasets: DatasetInfo[]): DatasetInfo | undefined {
  if (datasets.length === 0) return undefined
  if (datasets.length === 1) return datasets[0]
  
  // Look for common primary dataset names
  const primaryNames = ['dataSet', 'sampleDataSet', 'gridData', 'data']
  for (const name of primaryNames) {
    const found = datasets.find(ds => ds.name.toLowerCase() === name.toLowerCase())
    if (found) return found
  }
  
  // Otherwise, return the one with most records
  return datasets.reduce((prev, current) => 
    prev.recordCount > current.recordCount ? prev : current
  )
}

/**
 * Generates a human-readable summary of datasets
 */
function generateDatasetSummary(datasets: DatasetInfo[], totalRecords: number): string {
  if (datasets.length === 0) {
    return 'No datasets found in context parameters'
  }
  
  if (datasets.length === 1) {
    const ds = datasets[0]!
    return `1 dataset (${ds.name}) with ${ds.recordCount} records and ${ds.columnCount} columns`
  }
  
  return `${datasets.length} datasets with ${totalRecords} total records`
}

/**
 * Compares two dataset states to detect changes
 */
export function compareDatasetStates(
  previous: DatasetAnalysisResult, 
  current: DatasetAnalysisResult
): {
  hasChanges: boolean
  addedDatasets: string[]
  removedDatasets: string[]
  changedDatasets: string[]
  recordCountChanges: { [name: string]: { old: number, new: number } }
} {
  const prevNames = previous.datasets.map(ds => ds.name)
  const currentNames = current.datasets.map(ds => ds.name)
  
  const addedDatasets = currentNames.filter(name => !prevNames.includes(name))
  const removedDatasets = prevNames.filter(name => !currentNames.includes(name))
  const changedDatasets: string[] = []
  const recordCountChanges: { [name: string]: { old: number, new: number } } = {}
  
  // Check for record count changes
  for (const currentDs of current.datasets) {
    const prevDs = previous.datasets.find(ds => ds.name === currentDs.name)
    if (prevDs && prevDs.recordCount !== currentDs.recordCount) {
      changedDatasets.push(currentDs.name)
      recordCountChanges[currentDs.name] = {
        old: prevDs.recordCount,
        new: currentDs.recordCount
      }
    }
  }
  
  const hasChanges = addedDatasets.length > 0 || removedDatasets.length > 0 || changedDatasets.length > 0
  
  return {
    hasChanges,
    addedDatasets,
    removedDatasets,
    changedDatasets,
    recordCountChanges
  }
}