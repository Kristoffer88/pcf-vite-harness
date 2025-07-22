/**
 * Utility functions for PCF development
 */

// PCF Discovery
export type {
  PCFManifest,
  PCFControlInfo,
  FormPCFMatch,
  EntityTypeCode
} from './pcfDiscovery'

export {
  parsePCFManifest,
  parseFormXmlForPCF,
  findPCFOnForms,
  getPCFControlsOnForm,
  getPCFFormsForEntity,
  analyzePCFSubgridConfig,
  ENTITY_TYPE_CODES
} from './pcfDiscovery'

// View Discovery
export type {
  SavedQuery,
  UserQuery,
  ViewInfo
} from './viewDiscovery'

export {
  getSystemViewsForEntity,
  getUserViewsForEntity,
  getAllViewsForEntity,
  getSystemViewById,
  getUserViewById,
  getViewById,
  getDefaultViewForEntity,
  discoverEntitiesWithViews,
  searchViewsByName
} from './viewDiscovery'

// Record Retrieval
export type {
  RecordRetrievalOptions,
  RecordRetrievalResult,
  PaginatedRecordResult
} from './recordRetrieval'

export {
  getRecordsForSystemView,
  getRecordsForUserView,
  getRecordsForView,
  executeViewQuery,
  executeFetchXml,
  getPaginatedRecordsForView,
  getRecordCountForView,
  extractEntityNameFromFetchXml
} from './recordRetrieval'

// View Analysis
export type {
  FetchXmlAnalysis,
  FetchXmlFilter,
  FetchXmlJoin,
  FetchXmlOrderBy,
  FetchXmlAggregate,
  ViewMetadata,
  ViewColumn
} from './viewAnalyzer'

export {
  analyzeFetchXml,
  analyzeViewLayout,
  validateFetchXml,
  extractReferencedEntities
} from './viewAnalyzer'

// Convenience functions for common tasks
export * from './manifestExtractor'
export * from './manifestReader'