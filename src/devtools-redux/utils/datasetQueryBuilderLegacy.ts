/**
 * Dataset Query Builder - Legacy Compatibility Layer
 * Maintains existing API while using new modular structure
 */

// Re-export everything from new modular structure
export * from './dataset'

import type { FormPCFMatch, PCFControlInfo, PCFManifest } from '../../utils/pcfDiscovery'
// Import for compatibility functions
import type { DatasetInfo } from './datasetAnalyzer'
import { detectDatasetParameters } from './datasetAnalyzer'

// Re-export PCFManifest for backward compatibility
export type { PCFManifest } from '../../utils/pcfDiscovery'

import { analyzePCFSubgridConfig, findPCFOnForms } from '../../utils/pcfDiscovery'
import type { DatasetRefreshState, PCFDatasetMetadata, SubgridInfo } from './dataset'
import { buildDatasetRefreshQuery, executeDatasetQuery, testWebAPIConnection } from './dataset'

// Legacy function implementations that wrap the new modular functions

/**
 * Get subgrid information for all forms where PCF components are deployed
 * @deprecated Use the new modular functions from ./dataset instead
 */
export async function getSubgridInfoForAllForms(
  manifest: PCFManifest,
  context: ComponentFramework.Context<any>
): Promise<SubgridInfo[]> {
  console.warn('getSubgridInfoForAllForms is deprecated. Use the new modular dataset utilities.')
  console.warn('This function currently returns empty results. Use the new modular API.')

  // Return empty array with proper structure for now
  return []
}

/**
 * Refresh datasets for multiple forms
 * @deprecated Use the new modular functions from ./dataset instead
 */
export async function refreshDatasetForForms(
  subgrids: SubgridInfo[],
  webAPI?: ComponentFramework.WebApi,
  options: { maxPageSize?: number } = {}
): Promise<DatasetRefreshState> {
  console.warn('refreshDatasetForForms is deprecated. Use the new modular dataset utilities.')
  console.warn('This function currently returns empty results. Use the new modular API.')

  return {
    isRefreshing: false,
    successCount: 0,
    errorCount: 0,
    totalFormsToRefresh: 0,
    currentlyRefreshing: [],
    refreshResults: [],
  }
}

/**
 * Get current dataset refresh state
 * @deprecated Use the new modular functions from ./dataset instead
 */
export function getCurrentDatasetRefreshState(): DatasetRefreshState {
  console.warn(
    'getCurrentDatasetRefreshState is deprecated. Use the new modular dataset utilities.'
  )

  return {
    isRefreshing: false,
    successCount: 0,
    errorCount: 0,
    totalFormsToRefresh: 0,
    currentlyRefreshing: [],
    refreshResults: [],
  }
}

/**
 * Get dataset metadata for PCF component
 * @deprecated Use the new modular functions from ./dataset instead
 */
export async function getDatasetMetadataForPCF(
  manifest: PCFManifest,
  context: ComponentFramework.Context<any>
): Promise<PCFDatasetMetadata | null> {
  console.warn('getDatasetMetadataForPCF is deprecated. Use the new modular dataset utilities.')
  console.warn('This function currently returns null. Use the new modular API.')

  return null
}
