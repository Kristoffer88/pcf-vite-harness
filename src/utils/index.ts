/**
 * Utility functions for PCF development
 */

// Convenience functions for common tasks
export * from './manifestExtractor'
export * from './manifestReader'
// PCF Discovery
export type {
  EntityTypeCode,
  FormPCFMatch,
  PCFControlInfo,
  PCFManifest,
} from './pcfDiscovery'
export {
  analyzePCFSubgridConfig,
  ENTITY_TYPE_CODES,
  findPCFOnForms,
  getPCFControlsOnForm,
  getPCFFormsForEntity,
  parseFormXmlForPCF,
  parsePCFManifest,
} from './pcfDiscovery'

// Record Retrieval
export type {
  PaginatedRecordResult,
  RecordRetrievalOptions,
  RecordRetrievalResult,
} from './recordRetrieval'

export {
  executeFetchXml,
  executeViewQuery,
  extractEntityNameFromFetchXml,
  getPaginatedRecordsForView,
  getRecordCountForView,
  getRecordsForSystemView,
  getRecordsForUserView,
  getRecordsForView,
} from './recordRetrieval'

// View Analysis
export type {
  FetchXmlAggregate,
  FetchXmlAnalysis,
  FetchXmlFilter,
  FetchXmlJoin,
  FetchXmlOrderBy,
  ViewColumn,
  ViewMetadata,
} from './viewAnalyzer'

export {
  analyzeFetchXml,
  analyzeViewLayout,
  extractReferencedEntities,
  validateFetchXml,
} from './viewAnalyzer'
// View Discovery
export type {
  SavedQuery,
  UserQuery,
  ViewInfo,
} from './viewDiscovery'
export {
  discoverEntitiesWithViews,
  getAllViewsForEntity,
  getDefaultViewForEntity,
  getSystemViewById,
  getSystemViewsForEntity,
  getUserViewById,
  getUserViewsForEntity,
  getViewById,
  searchViewsByName,
} from './viewDiscovery'
