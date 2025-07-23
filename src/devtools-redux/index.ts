/**
 * PCF DevTools Redux Protocol Integration
 * Export all DevTools functionality
 */

export { DatasetRefreshTool } from './components/DatasetRefreshTool'
export { LifecycleTriggers } from './components/LifecycleTriggers'
// Export PCF lifecycle context
export { PCFLifecycleProvider, usePCFLifecycle } from './contexts/PCFLifecycleContext'
export { EmbeddedDevToolsUI } from './EmbeddedDevToolsUI'
// Export enhanced lifecycle hooks
export {
  type CustomLifecycleEvent,
  type LifecycleEvent,
  type LifecycleHookCallback,
  type LifecycleStats,
  lifecycleHooks,
  useLifecycleHooks,
} from './hooks/LifecycleHooks'
export { PCFDevToolsConnector, pcfDevTools } from './PCFDevToolsConnector'
export {
  PCFDevToolsProvider,
  usePCFDatasets,
  usePCFDevTools,
  usePCFLifecycle as useDevToolsLifecycle,
  usePCFWebAPI,
} from './PCFDevToolsProvider'
// Export dataset functionality (now modular)
export type {
  DatasetErrorAnalysis,
  DatasetQuery,
  DatasetRefreshState,
  EnhancedDatasetResult,
  PCFDatasetMetadata,
  QueryResult,
  RelationshipMapping,
  SubgridInfo,
} from './utils/dataset'
export {
  addRelationshipMapping,
  analyzeDatasetRefreshError,
  analyzeDataverseError,
  buildDatasetRefreshQuery,
  buildRelationshipFilter,
  convertEntitiesToDatasetRecords,
  createDatasetColumnsFromEntities,
  createDataverseError,
  createEnhancedContext,
  executeDatasetQuery,
  getMappingsForChildEntity,
  getMappingsForParentEntity,
  isKnownRelationship,
  // New dataset refresh functionality
  mapRelationshipToLookupColumn,
  mergeDatasetResults,
  suggestRelationshipMapping,
} from './utils/dataset'

// Export dataset analysis functionality
export type {
  DatasetAnalysisResult,
  DatasetInfo,
} from './utils/datasetAnalyzer'

export { detectDatasetParameters } from './utils/datasetAnalyzer'
// Legacy compatibility exports
export {
  getCurrentDatasetRefreshState,
  getDatasetMetadataForPCF,
  getSubgridInfoForAllForms,
  refreshDatasetForForms,
} from './utils/datasetQueryBuilder'
export type { WebAPICall } from './WebAPIMonitor'
export { webAPIMonitor } from './WebAPIMonitor'
