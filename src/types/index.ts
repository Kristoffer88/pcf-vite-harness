/**
 * PCF Vite Harness Type Definitions
 * Central export for all type definitions
 */

// Export Harness types
export * from './harness'
export type {
  PCFViteOptions,
  PCFComponent,
  MockContextOptions,
  PCFHarnessOptions,
  HarnessEnvironment,
  PowerAppsContainerProps
} from './harness'

// Export Context types
export * from './context'
export type {
  PCFInputs,
  PCFOutputs,
  PCFContext,
  PCFStandardControl,
  PCFReactControl
} from './context'

// Export Dataverse types
export * from './dataverse'
export type {
  EntityMetadata,
  AttributeMetadata,
  EntityReference,
  DataverseEntity,
  DataverseEntityCollection,
  EntityWithFormattedValues,
  ViewMetadata,
  RelationshipMetadata,
  OptionMetadata,
  LocalizedLabel,
  AttributeTypeCode,
  AttributeTypeName,
  RequiredLevel,
  DateTimeBehavior,
  CascadeConfiguration,
  CascadeType
} from './dataverse'

// Export Dataset types
export * from './dataset'
export type {
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
} from './dataset'

// Export type guards
export {
  isDatasetRecord,
  isLookupFieldValue,
  isOptionSetFieldValue
} from './dataset'

// Export constants
export {
  FORMATTED_VALUE_SUFFIX,
  NAVIGATION_PROPERTY_SUFFIX,
  LOOKUP_LOGICALNAME_SUFFIX
} from './dataverse'