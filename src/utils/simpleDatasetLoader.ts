/**
 * Simple Dataset Loader
 * Loads dataset data without any devtools dependencies
 */

interface DatasetInfo {
  name: string
  entityLogicalName: string
  recordCount: number
}

interface DatasetAnalysis {
  datasets: DatasetInfo[]
  totalRecords: number
}

// Simple dataset detection
function detectDatasets(context: ComponentFramework.Context<any>): DatasetAnalysis {
  const datasets: DatasetInfo[] = []
  
  if (!context?.parameters) {
    return { datasets, totalRecords: 0 }
  }

  Object.keys(context.parameters).forEach(key => {
    const param = context.parameters[key]
    if (param && typeof param === 'object' && 'records' in param && 'columns' in param) {
      // This looks like a dataset
      const entityType = import.meta.env.VITE_PCF_TARGET_TABLE || 'unknown'
      datasets.push({
        name: key,
        entityLogicalName: entityType,
        recordCount: param.sortedRecordIds?.length || 0
      })
    }
  })

  const totalRecords = datasets.reduce((sum, ds) => sum + ds.recordCount, 0)
  return { datasets, totalRecords }
}

// Simple data fetcher using WebAPI
async function fetchDataForEntity(
  context: ComponentFramework.Context<any>,
  entityLogicalName: string
): Promise<any[]> {
  try {
    const parentEntityId = import.meta.env.VITE_PCF_PAGE_RECORD_ID
    const parentEntityType = import.meta.env.VITE_PCF_PAGE_TABLE || 'pum_initiative'
    
    // Build a simple query (just the options part, not the entity name)
    // Include common fields that PCF components expect
    let options = `$select=*&$top=5000`
    
    // Add filter if we have parent info
    if (parentEntityId && parentEntityType) {
      const lookupField = `_${parentEntityType}_value`
      options += `&$filter=${lookupField} eq ${parentEntityId}`
    }

    console.log(`🔍 Fetching data for ${entityLogicalName} with options: ${options}`)
    
    const result = await context.webAPI.retrieveMultipleRecords(
      entityLogicalName,
      options
    )
    
    return result.entities || []
  } catch (error) {
    console.error(`❌ Failed to fetch ${entityLogicalName}:`, error)
    return []
  }
}

// Enhanced record injection using proper PCF structure
async function injectRecordsIntoDataset(
  dataset: ComponentFramework.PropertyTypes.DataSet,
  entities: any[],
  entityLogicalName: string,
  webAPI?: ComponentFramework.WebApi
): Promise<boolean> {
  try {
    // Import the dataset record converter
    const { convertEntitiesToDatasetRecords } = await import('./datasetRecordConverter')
    
    // Clear existing records
    const existingIds = dataset.sortedRecordIds || []
    existingIds.forEach(id => {
      if (dataset.records[id]) {
        delete dataset.records[id]
      }
    })

    // Convert entities to proper PCF dataset records
    const newRecords = await convertEntitiesToDatasetRecords(entities, entityLogicalName, webAPI)
    const newIds = Object.keys(newRecords)
    
    // Add new records
    Object.assign(dataset.records, newRecords)

    // Update sorted record IDs
    ;(dataset as any).sortedRecordIds = newIds
    
    console.log(`✅ Injected ${entities.length} records into dataset`)
    return true
  } catch (error) {
    console.error('❌ Failed to inject records:', error)
    return false
  }
}

// Main loader function
export async function loadDatasetData(
  context: ComponentFramework.Context<any>,
  onComplete?: () => void
): Promise<void> {
  try {
    console.log('🚀 Simple dataset loader starting...')
    
    // 1. Detect datasets
    const analysis = detectDatasets(context)
    if (analysis.datasets.length === 0) {
      console.log('📭 No datasets found')
      return
    }

    console.log(`📊 Found ${analysis.datasets.length} datasets`)

    // 2. Load data for each dataset
    for (const datasetInfo of analysis.datasets) {
      console.log(`🔄 Loading ${datasetInfo.name} (${datasetInfo.entityLogicalName})`)
      
      const entities = await fetchDataForEntity(context, datasetInfo.entityLogicalName)
      
      if (entities.length > 0) {
        const dataset = context.parameters[datasetInfo.name] as ComponentFramework.PropertyTypes.DataSet
        await injectRecordsIntoDataset(dataset, entities, datasetInfo.entityLogicalName, context.webAPI)
        console.log(`✅ Loaded ${entities.length} records for ${datasetInfo.name}`)
      } else {
        console.log(`📭 No records found for ${datasetInfo.name}`)
      }
    }

    // 3. Trigger callback
    console.log('🔄 Dataset loading complete, triggering callback...')
    if (onComplete) {
      onComplete()
    }

  } catch (error) {
    console.error('❌ Simple dataset loader failed:', error)
  }
}

// Auto-start with delay
export function startAutoLoad(
  context: ComponentFramework.Context<any>,
  onComplete?: () => void
): void {
  const autoRefreshEnabled = import.meta.env.VITE_PCF_AUTO_REFRESH !== 'false'
  
  if (!autoRefreshEnabled) {
    console.log('🔕 Auto-refresh disabled')
    return
  }

  console.log('🚀 Starting auto-load immediately...')
  loadDatasetData(context, onComplete)
}