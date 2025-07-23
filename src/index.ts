/**
 * PCF Vite Harness - Modern development environment for PowerApps Component Framework
 *
 * This library provides a Vite-based development harness that replicates the PowerApps
 * environment for PCF components, enabling hot module replacement and modern tooling.
 */

export { createMockContext } from './createMockContext.js'
export { createPCFViteConfig } from './createViteConfig.js'
// Redux DevTools Integration
export {
  PCFDevToolsProvider,
  pcfDevTools,
  usePCFDatasets,
  usePCFDevTools,
  usePCFLifecycle,
  usePCFWebAPI,
} from './devtools-redux/index.js'
export { initializePCFHarness, initPCF } from './initializePCFHarness.js'
// Core components
export { PowerAppsContainer } from './PowerAppsContainer.js'
// View and record utilities
export * from './utils/index.js'

// Export Dataverse and Dataset types explicitly to avoid conflicts
export type {
  // Context types
  PCFInputs,
  PCFOutputs,
  PCFContext,
  PCFStandardControl,
  PCFReactControl,
  // Dataverse types
  EntityMetadata,
  AttributeMetadata,
  EntityReference,
  DataverseEntity,
  DataverseEntityCollection,
  EntityWithFormattedValues,
  ViewMetadata as DataverseViewMetadata,
  RelationshipMetadata,
  OptionMetadata,
  LocalizedLabel,
  AttributeTypeCode,
  AttributeTypeName,
  RequiredLevel,
  DateTimeBehavior,
  CascadeConfiguration,
  CascadeType,
  // Dataset types
  DatasetRecord,
  DatasetFieldCollection,
  DatasetFieldValue,
  DatasetColumn,
  DatasetColumnType,
  PCFDataset,
  TypedDataset,
  DatasetPaging,
  DatasetSorting,
  DatasetFiltering,
  ValidationResult,
  BaseFieldValue,
  StringFieldValue,
  NumberFieldValue,
  BooleanFieldValue,
  DateFieldValue,
  LookupFieldValue,
  OptionSetFieldValue,
  MultiSelectOptionSetFieldValue,
  OptionSetOption,
  SortDirection
} from './types'

// Export type guards
export {
  isDatasetRecord,
  isLookupFieldValue,
  isOptionSetFieldValue
} from './types'

// Export constants
export {
  FORMATTED_VALUE_SUFFIX,
  NAVIGATION_PROPERTY_SUFFIX,
  LOOKUP_LOGICALNAME_SUFFIX
} from './types'
// Utility functions
export {
  autoDetectManifest,
  createTestProjectManifest,
  extractManifestFromBuiltXml,
  extractManifestFromComponentClass,
  extractManifestFromXml,
} from './utils/manifestExtractor.js'
export {
  detectManifestInfo,
  readManifestFromFileSystem,
} from './utils/manifestReader.js'

// CSS import for convenience
export const PCF_STYLES = '../styles/powerapps.css'

/**
 * Version of the PCF Vite Harness
 */
export const VERSION = '1.1.0-beta.3'
