/**
 * Context Enhancer - Orchestrates PCF discovery and dataset enhancement
 */

import type { DatasetAnalysisResult, DatasetInfo } from './datasetAnalyzer'
import { analyzeDatasetStructure, detectDatasetParameters } from './datasetAnalyzer'
import type { DatasetQuery, EnhancedDatasetResult, QueryResult } from './datasetQueryBuilder'
import {
  buildDatasetQuery,
  createEnhancedContext,
  executeDatasetQuery,
  mergeDatasetResults,
} from './datasetQueryBuilder'
import type { FormPCFMatch, PCFControlInfo, PCFManifest } from './pcfDiscovery'
import { analyzePCFSubgridConfig, findPCFOnForms } from './pcfDiscovery'

export interface DatasetEnhancementOptions {
  maxRecordsPerDataset?: number
  enableFormDiscovery?: boolean
  autoRefreshInterval?: number
}

export interface EnhancementResult {
  success: boolean
  enhancedContext?: ComponentFramework.Context<any>
  datasetsEnhanced: number
  errors: string[]
  discoveredForms?: FormPCFMatch[]
  controlsFound?: PCFControlInfo[]
}

export interface DatasetDiscoveryState {
  isDiscovering: boolean
  manifest?: PCFManifest
  discoveredForms: FormPCFMatch[]
  controlsFound: PCFControlInfo[]
  datasetAnalysis?: DatasetAnalysisResult
  lastDiscovery?: Date
}

/**
 * Main orchestration function for enhancing dataset context
 */
export async function enhanceDatasetContext(
  context: ComponentFramework.Context<any>,
  manifest: PCFManifest,
  webAPI: ComponentFramework.WebApi,
  options: DatasetEnhancementOptions = {}
): Promise<EnhancementResult> {
  const { maxRecordsPerDataset = 50, enableFormDiscovery = true } = options

  console.log('🔍 Starting dataset context enhancement', { manifest, options })

  const errors: string[] = []
  let enhancedContext = context
  let datasetsEnhanced = 0
  let discoveredForms: FormPCFMatch[] = []
  let controlsFound: PCFControlInfo[] = []

  try {
    // Step 1: Analyze existing datasets in context
    const datasetAnalysis = detectDatasetParameters(context)

    if (!datasetAnalysis.hasDatasets) {
      console.log('📝 No datasets found in context')
      return {
        success: true,
        enhancedContext: context,
        datasetsEnhanced: 0,
        errors: ['No datasets found in PCF context'],
        discoveredForms,
        controlsFound,
      }
    }

    console.log(`📊 Found ${datasetAnalysis.datasets.length} dataset(s) in context`)

    // Step 2: Discover forms with this PCF control (if enabled)
    if (enableFormDiscovery) {
      try {
        discoveredForms = await findPCFOnForms(manifest)
        controlsFound = discoveredForms.flatMap(form => form.controls)

        console.log(`🔍 Discovered ${discoveredForms.length} forms with PCF controls`)
      } catch (error) {
        const errorMsg = `Form discovery failed: ${error instanceof Error ? error.message : error}`
        errors.push(errorMsg)
        console.warn(errorMsg)
      }
    }

    // Step 3: Enhance each dataset
    for (const datasetInfo of datasetAnalysis.datasets) {
      try {
        const enhancementResult = await enhanceDatasetWithQuery(
          enhancedContext,
          datasetInfo,
          controlsFound,
          webAPI,
          {}
        )

        if (enhancementResult.success && enhancementResult.enhancedContext) {
          enhancedContext = enhancementResult.enhancedContext
          datasetsEnhanced++
          console.log(`✅ Enhanced dataset: ${datasetInfo.parameterKey}`)
        } else {
          errors.push(...enhancementResult.errors)
        }
      } catch (error) {
        const errorMsg = `Failed to enhance dataset ${datasetInfo.parameterKey}: ${error instanceof Error ? error.message : error}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    console.log(
      `🎉 Dataset enhancement complete: ${datasetsEnhanced}/${datasetAnalysis.datasets.length} enhanced`
    )

    return {
      success: datasetsEnhanced > 0 || errors.length === 0,
      enhancedContext,
      datasetsEnhanced,
      errors,
      discoveredForms,
      controlsFound,
    }
  } catch (error) {
    const errorMsg = `Dataset enhancement failed: ${error instanceof Error ? error.message : error}`
    console.error(errorMsg)

    return {
      success: false,
      enhancedContext: context,
      datasetsEnhanced: 0,
      errors: [errorMsg],
      discoveredForms,
      controlsFound,
    }
  }
}

/**
 * Enhance a specific dataset with query results
 */
export async function enhanceDatasetWithQuery(
  context: ComponentFramework.Context<any>,
  datasetInfo: DatasetInfo,
  controlsFound: PCFControlInfo[],
  webAPI: ComponentFramework.WebApi,
  options: { maxRecords?: number } = {}
): Promise<{
  success: boolean
  enhancedContext?: ComponentFramework.Context<any>
  errors: string[]
  queryExecuted?: boolean
}> {
  const errors: string[] = []

  try {
    // Find matching control for this dataset
    const matchingControl = findMatchingControlForDataset(datasetInfo, controlsFound)

    if (!matchingControl) {
      // Skip enhancement if no matching control found
      console.log(`⏭️  No matching control found for dataset: ${datasetInfo.parameterKey}`)
      return {
        success: true,
        enhancedContext: context,
        errors: [],
        queryExecuted: false,
      }
    }

    console.log(`🔗 Found matching control for dataset: ${datasetInfo.parameterKey}`)

    // Build and execute query
    const query = buildDatasetQuery(matchingControl, datasetInfo.entityLogicalName)

    // No page size limit - retrieve all records

    const queryResult = await executeDatasetQuery(query, webAPI)

    if (!queryResult.success) {
      errors.push(`Query failed: ${queryResult.error}`)
      return { success: false, errors, queryExecuted: true }
    }

    // Merge results into context
    const enhancedResult = mergeDatasetResults(
      datasetInfo.dataset,
      queryResult,
      query.entityLogicalName
    )

    const enhancedContext = createEnhancedContext(context, datasetInfo.parameterKey, enhancedResult)

    return {
      success: true,
      enhancedContext,
      errors: [],
      queryExecuted: true,
    }
  } catch (error) {
    const errorMsg = `Failed to enhance dataset ${datasetInfo.parameterKey}: ${error instanceof Error ? error.message : error}`
    errors.push(errorMsg)
    return { success: false, errors, queryExecuted: false }
  }
}

/**
 * Find the best matching control for a dataset
 */
function findMatchingControlForDataset(
  datasetInfo: DatasetInfo,
  controlsFound: PCFControlInfo[]
): PCFControlInfo | undefined {
  // Filter controls that have dataset configuration
  const datasetControls = controlsFound.filter(control => control.dataSet)

  if (datasetControls.length === 0) {
    return undefined
  }

  // Priority 1: Match by dataset name
  let matchingControl = datasetControls.find(
    control => control.dataSet?.name === datasetInfo.parameterKey
  )

  if (matchingControl) {
    return matchingControl
  }

  // Priority 2: Match by entity logical name
  if (datasetInfo.entityLogicalName) {
    matchingControl = datasetControls.find(
      control => control.dataSet?.targetEntityType === datasetInfo.entityLogicalName
    )
  }

  if (matchingControl) {
    return matchingControl
  }

  // Priority 3: Return first dataset control as fallback
  return datasetControls[0]
}

/**
 * Trigger enhanced updateView with dataset-enriched context
 */
export function triggerEnhancedUpdateView(
  pcfComponent: ComponentFramework.StandardControl<any, any> | null,
  enhancedContext: ComponentFramework.Context<any>
): boolean {
  if (!pcfComponent) {
    console.warn('Cannot trigger updateView: PCF component not available')
    return false
  }

  try {
    pcfComponent.updateView(enhancedContext)
    console.log('✅ Enhanced updateView triggered successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to trigger enhanced updateView:', error)
    return false
  }
}

/**
 * Create a dataset enhancement state manager
 */
export function createDatasetDiscoveryState(): DatasetDiscoveryState {
  return {
    isDiscovering: false,
    discoveredForms: [],
    controlsFound: [],
    lastDiscovery: undefined,
  }
}

/**
 * Update dataset discovery state
 */
export function updateDatasetDiscoveryState(
  currentState: DatasetDiscoveryState,
  updates: Partial<DatasetDiscoveryState>
): DatasetDiscoveryState {
  return {
    ...currentState,
    ...updates,
    lastDiscovery:
      updates.discoveredForms || updates.controlsFound ? new Date() : currentState.lastDiscovery,
  }
}

/**
 * Get dataset enhancement summary for display
 */
export function getEnhancementSummary(result: EnhancementResult): {
  title: string
  status: 'success' | 'warning' | 'error'
  details: Array<{ label: string; value: string; status?: 'success' | 'warning' | 'error' }>
} {
  const { success, datasetsEnhanced, errors, discoveredForms, controlsFound } = result

  let status: 'success' | 'warning' | 'error' = 'success'
  if (!success) {
    status = 'error'
  } else if (errors.length > 0) {
    status = 'warning'
  }

  const title = success ? `Enhanced ${datasetsEnhanced} dataset(s)` : 'Enhancement failed'

  const details = [
    {
      label: 'Datasets Enhanced',
      value: datasetsEnhanced.toString(),
      status: (datasetsEnhanced > 0 ? 'success' : 'warning') as 'success' | 'warning',
    },
    {
      label: 'Forms Discovered',
      value: (discoveredForms?.length || 0).toString(),
    },
    {
      label: 'Controls Found',
      value: (controlsFound?.length || 0).toString(),
    },
    {
      label: 'Errors',
      value: errors.length.toString(),
      status: (errors.length > 0 ? 'error' : 'success') as 'error' | 'success',
    },
  ]

  return { title, status, details }
}
