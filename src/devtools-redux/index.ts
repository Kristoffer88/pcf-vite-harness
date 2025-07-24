/**
 * PCF DevTools Redux Protocol Integration
 * Export all DevTools functionality with improved architecture
 */

// Main DevTools Components
export { EmbeddedDevToolsUI } from './EmbeddedDevToolsUI'
export { PCFDevToolsConnector, pcfDevTools } from './PCFDevToolsConnector'
export {
  PCFDevToolsProvider,
  usePCFDatasets,
  usePCFDevTools,
  usePCFLifecycle as useDevToolsLifecycle,
  usePCFWebAPI,
} from './PCFDevToolsProvider'

// Business Logic Services
export * from './services'

// Custom Hooks
export * from './hooks'

// UI Components
export * from './components/ui'
export * from './components/dataset'

// Pure Utilities
export * from './lib'

// State Management
export * from './stores'

// Legacy Components (for compatibility)
export { LifecycleTriggers } from './components/LifecycleTriggers'
export { PCFLifecycleProvider, usePCFLifecycle } from './contexts/PCFLifecycleContext'

// Legacy Dataset Utilities (deprecated - use services instead)
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

export type {
  DatasetAnalysisResult,
  DatasetInfo,
} from './utils/datasetAnalyzer'

export { detectDatasetParameters } from './utils/datasetAnalyzer'


// WebAPI Monitoring
export type { WebAPICall } from './WebAPIMonitor'
export { webAPIMonitor } from './WebAPIMonitor'
