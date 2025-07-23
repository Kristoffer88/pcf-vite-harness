/**
 * Dataset Utilities Index
 * Centralized exports for all dataset-related functionality
 */

// Dataset Enhancement (exports removed - unused)
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
// Relationship Mapping (only keep the used ones)
export {
  isKnownRelationship,
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

// Dataset Injection (functions unused - removed)

// Entity Metadata (functions unused - removed)

// Column Relationship Analysis (functions unused - removed)

// Batch Metadata Fetching (functions unused - removed)

// Rate Limiting (functions unused - removed)
