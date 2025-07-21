// PCF Devtools - Main exports
// Adapted from TanStack Query DevTools architecture

export { Explorer } from './components/Explorer'
export { PCFDevtools, PCFDevtoolsPanel_Embedded } from './components/PCFDevtools'
export { PCFDevtoolsPanel } from './components/PCFDevtoolsPanel'
export type { PCFDevtoolsTab, WebApiMethod } from './constants'
export { PCFDevtoolsProvider, usePCFDevtools, useSystemTheme } from './contexts/PCFDevtoolsContext'
export type { Theme } from './theme'
export { darkTheme, getThemeColors, lightTheme, tokens } from './theme'

export type { PCFContextUpdate, WebApiRequest } from './utils'
export {
  copyToClipboard,
  deleteNestedProperty,
  formatDuration,
  formatTimestamp,
  getDataType,
  getWebApiStatusColor,
  getWebApiStatusLabel,
  isExpandable,
  sortWebApiRequests,
  truncateUrl,
  updateNestedProperty,
} from './utils'
// Context Enhancer exports
export type {
  DatasetDiscoveryState,
  DatasetEnhancementOptions,
  EnhancementResult,
} from './utils/contextEnhancer'
export {
  createDatasetDiscoveryState,
  enhanceDatasetContext,
  enhanceDatasetWithQuery,
  getEnhancementSummary,
  triggerEnhancedUpdateView,
  updateDatasetDiscoveryState,
} from './utils/contextEnhancer'

// Dataset Analysis exports
export type {
  DatasetAnalysisResult,
  DatasetInfo,
} from './utils/datasetAnalyzer'
export {
  analyzeDatasetStructure,
  compareDatasetStates,
  detectDatasetParameters,
  extractDatasetMetadata,
  getDatasetSummary,
} from './utils/datasetAnalyzer'

// Dataset Query Builder exports
export type {
  DatasetQuery,
  EnhancedDatasetResult,
  QueryResult,
} from './utils/datasetQueryBuilder'
export {
  buildDatasetQuery,
  convertEntitiesToDatasetRecords,
  createEnhancedContext,
  executeDatasetQuery,
  mergeDatasetResults,
} from './utils/datasetQueryBuilder'
// PCF Discovery exports
export type {
  FormPCFMatch,
  PCFControlInfo,
  PCFManifest,
} from './utils/pcfDiscovery'
export {
  analyzePCFSubgridConfig,
  ENTITY_TYPE_CODES,
  findPCFOnForms,
  getPCFControlsOnForm,
  getPCFFormsForEntity,
  parseFormXmlForPCF,
  parsePCFManifest,
} from './utils/pcfDiscovery'
