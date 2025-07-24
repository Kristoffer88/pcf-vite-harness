/**
 * Dataset Type Definitions
 * Types for PCF dataset structures, records, and columns
 */

import type { EntityReference } from './dataverse'

/**
 * PCF Dataset Record Structure
 */
export interface DatasetRecord {
  /**
   * Internal record structure with fields
   */
  _record: {
    initialized: number
    identifier: {
      etn: string
      id: {
        guid: string
      }
    }
    fields: DatasetFieldCollection
  }
  
  /**
   * Column alias mapping
   */
  _columnAliasNameMap: Record<string, string>
  
  /**
   * Primary field name for this record
   */
  _primaryFieldName: string
  
  /**
   * Dirty flag indicating if record has unsaved changes
   */
  _isDirty: boolean
  
  /**
   * Entity reference information
   */
  _entityReference: {
    _etn: string
    _id: string
    _name: string
  }
  
  /**
   * Additional fields can be added directly to the record
   */
  [key: string]: any
}

/**
 * Collection of fields in a dataset record
 */
export interface DatasetFieldCollection {
  [fieldName: string]: DatasetFieldValue
}

/**
 * Base field value structure
 */
export interface BaseFieldValue {
  timestamp: string
  validationResult: ValidationResult
}

/**
 * String field value
 */
export interface StringFieldValue extends BaseFieldValue {
  value: string
  formatted?: string
}

/**
 * Number field value
 */
export interface NumberFieldValue extends BaseFieldValue {
  value: number
  formatted?: string
}

/**
 * Boolean field value
 */
export interface BooleanFieldValue extends BaseFieldValue {
  label: string
  valueString: string
}

/**
 * Date field value
 */
export interface DateFieldValue extends BaseFieldValue {
  value: string
  formatted?: string
}

/**
 * Lookup field value
 */
export interface LookupFieldValue extends BaseFieldValue {
  reference: {
    etn: string
    id: {
      guid: string
    }
    name: string
  }
}

/**
 * Option set field value
 */
export interface OptionSetFieldValue extends BaseFieldValue {
  label: string
  valueString: string
}

/**
 * Multi-select option set field value
 */
export interface MultiSelectOptionSetFieldValue extends BaseFieldValue {
  value: number[]
  formatted?: string
}

/**
 * Union type for all field values
 */
export type DatasetFieldValue = 
  | StringFieldValue 
  | NumberFieldValue 
  | BooleanFieldValue 
  | DateFieldValue 
  | LookupFieldValue 
  | OptionSetFieldValue
  | MultiSelectOptionSetFieldValue
  | BaseFieldValue

/**
 * Validation result for field values
 */
export interface ValidationResult {
  errorId: string | null
  errorMessage: string | null
  isValueValid: boolean
  userInput: string | null
  isOfflineSyncError: boolean
}

/**
 * PCF Dataset Column Definition
 */
export interface DatasetColumn {
  /**
   * Logical name of the column
   */
  name: string
  
  /**
   * Display name for the column
   */
  displayName: string
  
  /**
   * Data type of the column
   */
  dataType: DatasetColumnType
  
  /**
   * Alias for the column
   */
  alias: string
  
  /**
   * Display order of the column
   */
  order: number
  
  /**
   * Whether this is the primary field
   */
  isPrimary?: boolean
  
  /**
   * Visual size factor for column width
   */
  visualSizeFactor?: number
  
  /**
   * Whether the column is hidden
   */
  isHidden?: boolean
  
  /**
   * Whether the column is read-only
   */
  isReadOnly?: boolean
  
  /**
   * For lookup columns, the target entities
   */
  targets?: string[]
  
  /**
   * For option set columns, the available options
   */
  options?: OptionSetOption[]
}

/**
 * Dataset column data types
 */
export type DatasetColumnType = 
  | 'SingleLine.Text'
  | 'SingleLine.Email'
  | 'SingleLine.Phone'
  | 'SingleLine.URL'
  | 'SingleLine.Ticker'
  | 'Multiple'
  | 'TwoOptions'
  | 'OptionSet'
  | 'MultiSelectOptionSet'
  | 'Whole.None'
  | 'Currency'
  | 'FP'
  | 'Decimal'
  | 'DateAndTime.DateOnly'
  | 'DateAndTime.DateAndTime'
  | 'Lookup.Simple'
  | 'Lookup.Customer'
  | 'Lookup.Owner'
  | 'Lookup.PartyList'
  | 'Lookup.Regarding'

/**
 * Option for option set columns
 */
export interface OptionSetOption {
  value: number
  label: string
  color?: string
}

/**
 * Dataset paging information
 */
export interface DatasetPaging {
  pageNumber: number
  totalResultCount: number
  firstPageNumber: number
  lastPageNumber: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Dataset sorting information
 */
export interface DatasetSorting {
  name: string
  sortDirection: SortDirection
}

export type SortDirection = 0 | 1 // 0 = Ascending, 1 = Descending

/**
 * Dataset filtering information
 */
export interface DatasetFiltering {
  aliasMap: Record<string, string>
  filterExpression?: string
}

/**
 * Full PCF Dataset Structure
 */
export interface PCFDataset {
  loading: boolean
  columns: DatasetColumn[]
  error: boolean
  errorMessage: string | null
  innerError: any | null
  sortedRecordIds: string[]
  records: Record<string, DatasetRecord>
  sorting: DatasetSorting[]
  filtering: DatasetFiltering
  paging: DatasetPaging
  linking: any
  entityDisplayCollectionName: string
  _capabilities: {
    hasRecordNavigation: boolean
  }
  
  // Methods
  getTargetEntityType?(): string
  getViewId?(): string
  getTitle?(): string
  refresh?(): void
  openDatasetItem?(recordId: string): void
  clearSelectedRecordIds?(): void
  setSelectedRecordIds?(recordIds: string[]): void
  getSelectedRecordIds?(): string[]
  getFormattedValue?(recordId: string, columnName: string): string | null
}

/**
 * Type guard for dataset record
 */
export function isDatasetRecord(value: any): value is DatasetRecord {
  return (
    value &&
    typeof value === 'object' &&
    '_record' in value &&
    '_entityReference' in value &&
    '_primaryFieldName' in value
  )
}

/**
 * Type guard for lookup field value
 */
export function isLookupFieldValue(value: DatasetFieldValue): value is LookupFieldValue {
  return 'reference' in value && value.reference !== undefined
}

/**
 * Type guard for option set field value
 */
export function isOptionSetFieldValue(value: DatasetFieldValue): value is OptionSetFieldValue {
  return 'label' in value && 'valueString' in value
}

/**
 * Generic dataset with typed records
 */
export interface TypedDataset<T extends DatasetRecord = DatasetRecord> extends Omit<PCFDataset, 'records'> {
  records: Record<string, T>
}