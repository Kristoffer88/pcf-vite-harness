/**
 * Super Simple Background Loader
 * Just loads dataset data and calls updateView - no complexity!
 */

import { detectDatasetParameters } from './datasetAnalyzer'
import { generateDatasetFromView } from './dataset/datasetGenerator'
import { injectDatasetRecords } from './dataset/datasetInjector'

let isLoading = false

export async function loadDatasetData(
  context: ComponentFramework.Context<any>,
  onComplete?: () => void
) {
  if (isLoading) {
    console.log('🔄 Already loading, skipping...')
    return
  }

  try {
    isLoading = true
    console.log('🚀 Starting simple data load...')

    // 1. Find datasets in the context
    const datasetInfo = detectDatasetParameters(context)
    if (datasetInfo.datasets.length === 0) {
      console.log('📭 No datasets found')
      return
    }

    console.log(`📊 Found ${datasetInfo.datasets.length} datasets to load`)

    // 2. Load each dataset
    for (const dataset of datasetInfo.datasets) {
      console.log(`🔄 Loading dataset: ${dataset.name}`)

      // Get the default view ID from environment or use a hardcoded one
      const defaultViewId =
        import.meta.env.VITE_PCF_DEFAULT_VIEW_ID || '996f8290-e1ab-4372-8f12-23e83765e129'

      try {
        // Generate data from the view
        const generatedData = await generateDatasetFromView(
          context,
          dataset.entityLogicalName,
          defaultViewId,
          {
            parentEntityType: import.meta.env.VITE_PCF_PAGE_TABLE || 'pum_initiative',
            parentEntityId: import.meta.env.VITE_PCF_PAGE_RECORD_ID || '',
            lookupFieldName: '_pum_initiative_value',
          }
        )

        if (generatedData.success && generatedData.entities.length > 0) {
          // Inject the data into the dataset
          const injected = injectDatasetRecords(
            context.parameters[dataset.name] as ComponentFramework.PropertyTypes.DataSet,
            generatedData.entities
          )

          console.log(`✅ Loaded ${generatedData.entities.length} records for ${dataset.name}`)
        } else {
          console.log(`📭 No data found for ${dataset.name}`)
        }
      } catch (error) {
        console.error(`❌ Failed to load ${dataset.name}:`, error)
      }
    }

    // 3. Call the completion callback
    console.log('🔄 Data loading complete, triggering callback...')
    if (onComplete) {
      onComplete()
    }
  } catch (error) {
    console.error('❌ Simple data load failed:', error)
  } finally {
    isLoading = false
  }
}

// Auto-start function that waits a bit then loads data
export function startAutoLoad(context: ComponentFramework.Context<any>, onComplete?: () => void) {
  // Check if auto-refresh is enabled
  const autoRefreshEnabled = import.meta.env.VITE_PCF_AUTO_REFRESH !== 'false'

  if (!autoRefreshEnabled) {
    console.log('🔕 Auto-refresh disabled')
    return
  }

  // console.log('⏱️ Starting auto-load in 1 second...')
  // setTimeout(() => {
  // }, 1000)
  loadDatasetData(context, onComplete)
}
