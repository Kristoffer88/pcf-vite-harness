/**
 * Dataset Utilities Index
 * Centralized exports for all dataset-related functionality
 */

// Dataset Enhancement
export {
  convertEntitiesToDatasetRecords,
  createDatasetColumnsFromEntities,
  createEnhancedContext,
  mergeDatasetResults,
} from './datasetEnhancer'
export type { DatasetErrorAnalysis } from './errorAnalyzer'
// Error Analysis
export {
  analyzeDatasetRefreshError,
  analyzeDatasetRefreshErrorWithDiscovery,
  analyzeDataverseError,
  createDataverseError,
} from './errorAnalyzer'
export type {
  DiscoveredRelationship,
  EntityMetadata,
  LookupAttribute,
} from './metadataDiscovery'
// Runtime Metadata Discovery
export {
  buildDynamicRelationshipFilter,
  clearDiscoveryCache,
  discoverEntityMetadata,
  discoverRelationshipLookupColumn,
  discoverRelationshipMultiStrategy,
  discoverRelationshipsFromRecords,
  exportDiscoveredMappings,
  getDiscoveredRelationships,
} from './metadataDiscovery'
// Query Building
export {
  buildDatasetRefreshQuery,
  buildDatasetRefreshQueryWithDiscovery,
  buildMetadataQuery,
  buildViewDefinitionQuery,
  validateQuery,
} from './queryBuilder'
// Query Execution
export {
  executeBatchQueries,
  executeDatasetQuery,
  testWebAPIConnection,
} from './queryExecutor'
export type { RelationshipMapping } from './relationshipMapper'
// Relationship Mapping
export {
  addRelationshipMapping,
  buildRelationshipFilter,
  buildRelationshipFilterWithDiscovery,
  getMappingsForChildEntity,
  getMappingsForParentEntity,
  isKnownRelationship,
  mapRelationshipToLookupColumn,
  mapRelationshipToLookupColumnWithDiscovery,
  suggestRelationshipMapping,
} from './relationshipMapper'
// Types
export type {
  DatasetQuery,
  DatasetRefreshState,
  EnhancedDatasetResult,
  PCFDatasetMetadata,
  QueryResult,
  SubgridInfo,
} from './types'

// Dataset Injection
export {
  injectDatasetRecords,
  batchInjectDatasets,
} from './datasetInjector'
export type { DatasetInjectionOptions } from './datasetInjector'

// Entity Metadata
export {
  fetchEntityMetadata,
  getEntityPrimaryKey,
  getEntityPrimaryName,
  clearEntityMetadataCache,
  getCachedEntityMetadata,
} from './entityMetadata'
export type { EntityMetadataInfo } from './entityMetadata'

// Column Relationship Analysis
export {
  analyzeColumnsForRelationships,
  isLookupColumn,
  extractFieldNameFromColumn,
} from './columnRelationshipAnalyzer'
export type { ColumnAnalysisResult } from './columnRelationshipAnalyzer'

// Batch Metadata Fetching
export {
  fetchEntityMetadataWithLookups,
  fetchMultipleEntityMetadata,
  clearBatchMetadataCache,
  getBatchCacheStats,
} from './batchMetadataFetcher'

// Rate Limiting
export { RateLimiter, metadataRateLimiter, dataRateLimiter } from './rateLimiter'
