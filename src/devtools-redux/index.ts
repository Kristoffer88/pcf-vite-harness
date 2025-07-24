/**
 * PCF DevTools Redux Protocol Integration
 * Export all DevTools functionality with improved architecture
 */

// Main DevTools Components - Only keep what doesn't depend on UI

// Business Logic Services
export * from './services'


// Pure Utilities
export * from './lib'

// State Management
export * from './stores'

// Legacy Components (for compatibility)
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


