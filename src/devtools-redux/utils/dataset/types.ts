/**
 * Dataset Query Builder Types
 * Centralized type definitions for dataset operations
 */

export interface DatasetQuery {
  entityLogicalName: string
  viewId?: string
  odataQuery: string
  relationshipName?: string
  isRelatedQuery: boolean
  formId?: string
  controlId?: string
  lookupColumn?: string
}

export interface QueryResult {
  entities: ComponentFramework.WebApi.Entity[]
  entityLogicalName: string
  totalCount?: number
  nextLink?: string
  success: boolean
  error?: string
}

export interface EnhancedDatasetResult {
  originalDataset: ComponentFramework.PropertyTypes.DataSet
  queryResult: QueryResult
  mergedRecords: any[]
  newRecordCount: number
  columnsUpdated: boolean
}

export interface SubgridInfo {
  formId: string
  formName: string
  entityTypeCode: number
  controlId: string
  targetEntity: string
  relationshipName?: string
  viewId?: string
  isCustomView: boolean
  allowViewSelection: boolean
  enableViewPicker: boolean
}

export interface PCFDatasetMetadata {
  componentId: string
  formId: string
  formName: string
  entityName: string
  datasetParameters: {
    [key: string]: {
      entityLogicalName: string
      viewId?: string
      relationshipName?: string
      currentRecordCount: number
    }
  }
  subgrids: SubgridInfo[]
}

export interface DatasetRefreshState {
  isRefreshing: boolean
  lastRefresh?: Date
  successCount: number
  errorCount: number
  totalFormsToRefresh: number
  currentlyRefreshing: string[]
  refreshResults: Array<{
    subgridInfo: SubgridInfo
    queryResult: QueryResult
    errorAnalysis?: DatasetErrorAnalysis
    query?: string
  }>
}

export interface DatasetErrorAnalysis {
  isRelationshipError: boolean
  isFieldError: boolean
  isEntityError: boolean
  isPermissionError: boolean
  suggestions: string[]
  errorCode?: string
  correlationId?: string
}
