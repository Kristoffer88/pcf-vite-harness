// PCF Devtools - Main exports
// Adapted from TanStack Query DevTools architecture

export { PCFDevtools, PCFDevtoolsPanel_Embedded } from './components/PCFDevtools'
export { PCFDevtoolsPanel } from './components/PCFDevtoolsPanel'
export { Explorer } from './components/Explorer'

export { PCFDevtoolsProvider, usePCFDevtools, useSystemTheme } from './contexts/PCFDevtoolsContext'

export { tokens, lightTheme, darkTheme, getThemeColors } from './theme'
export type { Theme } from './theme'

export {
  getWebApiStatusColor,
  getWebApiStatusLabel,
  formatDuration,
  formatTimestamp,
  truncateUrl,
  updateNestedProperty,
  deleteNestedProperty,
  getDataType,
  isExpandable,
  copyToClipboard,
  sortWebApiRequests,
} from './utils'

export type { WebApiRequest, PCFContextUpdate } from './utils'
export type { PCFDevtoolsTab, WebApiMethod } from './constants'

// PCF Discovery exports
export type { 
  PCFManifest, 
  PCFControlInfo, 
  FormPCFMatch 
} from './utils/pcfDiscovery'
export { 
  parsePCFManifest, 
  parseFormXmlForPCF, 
  findPCFOnForms, 
  getPCFControlsOnForm, 
  getPCFFormsForEntity, 
  analyzePCFSubgridConfig,
  ENTITY_TYPE_CODES 
} from './utils/pcfDiscovery'

// Dataset Analysis exports
export type { 
  DatasetInfo, 
  DatasetAnalysisResult 
} from './utils/datasetAnalyzer'
export { 
  detectDatasetParameters, 
  extractDatasetMetadata, 
  analyzeDatasetStructure, 
  compareDatasetStates, 
  getDatasetSummary 
} from './utils/datasetAnalyzer'

// Dataset Query Builder exports
export type { 
  DatasetQuery, 
  QueryResult, 
  EnhancedDatasetResult 
} from './utils/datasetQueryBuilder'
export { 
  buildDatasetQuery, 
  executeDatasetQuery, 
  convertEntitiesToDatasetRecords, 
  mergeDatasetResults, 
  createEnhancedContext 
} from './utils/datasetQueryBuilder'

// Context Enhancer exports
export type { 
  DatasetEnhancementOptions, 
  EnhancementResult, 
  DatasetDiscoveryState 
} from './utils/contextEnhancer'
export { 
  enhanceDatasetContext, 
  enhanceDatasetWithQuery, 
  triggerEnhancedUpdateView, 
  createDatasetDiscoveryState, 
  updateDatasetDiscoveryState, 
  getEnhancementSummary 
} from './utils/contextEnhancer'