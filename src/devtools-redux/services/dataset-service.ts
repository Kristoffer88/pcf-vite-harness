/**
 * Dataset Service
 * Centralized business logic for dataset operations
 * Extracted from components to improve maintainability and testability
 */

import type {
  DatasetErrorAnalysis,
  DatasetQuery,
  DatasetRefreshState,
  PCFDatasetMetadata,
  QueryResult,
  SubgridInfo,
} from '../utils/dataset/types'
import {
  buildDatasetRefreshQuery,
  buildDatasetRefreshQueryWithDiscovery,
  validateQuery,
} from '../utils/dataset/queryBuilder'
import {
  executeDatasetQuery,
  executeBatchQueries,
  testWebAPIConnection,
} from '../utils/dataset/queryExecutor'
import { injectDatasetRecords } from '../utils/dataset/datasetInjector'
import { generateDatasetFromView } from '../utils/dataset/datasetGenerator'
import { detectDatasetParameters } from '../utils/datasetAnalyzer'

export interface DatasetServiceOptions {
  webAPI?: ComponentFramework.WebApi
  context?: ComponentFramework.Context<any>
  maxConcurrency?: number
  defaultPageSize?: number
}

export class DatasetService {
  private webAPI?: ComponentFramework.WebApi
  private context?: ComponentFramework.Context<any>
  private options: Required<Omit<DatasetServiceOptions, 'webAPI' | 'context'>>

  constructor(options: DatasetServiceOptions = {}) {
    this.webAPI = options.webAPI
    this.context = options.context
    this.options = {
      maxConcurrency: options.maxConcurrency ?? 5,
      defaultPageSize: options.defaultPageSize ?? 25,
    }
  }

  /**
   * Update WebAPI and context references
   */
  updateContext(webAPI?: ComponentFramework.WebApi, context?: ComponentFramework.Context<any>) {
    this.webAPI = webAPI
    this.context = context
  }

  /**
   * Test connectivity to the WebAPI
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return testWebAPIConnection(this.webAPI)
  }

  /**
   * Execute a single dataset query
   */
  async executeQuery(query: DatasetQuery): Promise<QueryResult> {
    return executeDatasetQuery(query, this.webAPI)
  }

  /**
   * Execute multiple queries in parallel with rate limiting
   */
  async executeBatchQueries(queries: DatasetQuery[]): Promise<QueryResult[]> {
    return executeBatchQueries(queries, this.webAPI, {
      maxConcurrency: this.options.maxConcurrency,
    })
  }

  /**
   * Build and execute a dataset refresh query
   */
  async refreshDataset(
    subgrid: SubgridInfo,
    options: {
      maxPageSize?: number
      parentRecordId?: string
      includeFormattedValues?: boolean
      additionalSelect?: string[]
    } = {}
  ): Promise<QueryResult> {
    const query = buildDatasetRefreshQuery(subgrid, {
      maxPageSize: options.maxPageSize ?? this.options.defaultPageSize,
      parentRecordId: options.parentRecordId,
      includeFormattedValues: options.includeFormattedValues ?? true,
      additionalSelect: options.additionalSelect ?? [],
    })

    return this.executeQuery(query)
  }

  /**
   * Build and execute a dataset refresh query with discovery
   */
  async refreshDatasetWithDiscovery(
    subgrid: SubgridInfo,
    options: {
      maxPageSize?: number
      parentRecordId?: string
      parentEntity?: string
      includeFormattedValues?: boolean
      additionalSelect?: string[]
    } = {}
  ): Promise<QueryResult> {
    const query = await buildDatasetRefreshQueryWithDiscovery(subgrid, {
      maxPageSize: options.maxPageSize ?? this.options.defaultPageSize,
      parentRecordId: options.parentRecordId,
      parentEntity: options.parentEntity,
      includeFormattedValues: options.includeFormattedValues ?? true,
      additionalSelect: options.additionalSelect ?? [],
      webAPI: this.webAPI,
    })

    return this.executeQuery(query)
  }

  /**
   * Refresh multiple datasets in parallel
   */
  async refreshMultipleDatasets(
    subgrids: SubgridInfo[],
    options: {
      maxPageSize?: number
      parentRecordId?: string
      parentEntity?: string
      includeFormattedValues?: boolean
      additionalSelect?: string[]
      useDiscovery?: boolean
    } = {}
  ): Promise<DatasetRefreshState> {
    const { useDiscovery = false, ...queryOptions } = options
    
    const refreshResults: Array<{
      subgridInfo: SubgridInfo
      queryResult: QueryResult
      errorAnalysis?: DatasetErrorAnalysis
      query?: string
    }> = []

    let successCount = 0

    try {
      for (const subgrid of subgrids) {
        let query: DatasetQuery
        
        if (useDiscovery) {
          query = await buildDatasetRefreshQueryWithDiscovery(subgrid, {
            ...queryOptions,
            webAPI: this.webAPI,
          })
        } else {
          query = buildDatasetRefreshQuery(subgrid, queryOptions)
        }

        const result = await this.executeQuery(query)
        
        refreshResults.push({
          subgridInfo: subgrid,
          queryResult: result,
          query: query.odataQuery,
        })

        if (result.success) {
          successCount++
        }
      }
    } catch (error) {
      console.error('Error during dataset refresh:', error)
    }

    return {
      isRefreshing: false,
      refreshResults,
      successCount,
      errorCount: subgrids.length - successCount,
      totalFormsToRefresh: subgrids.length,
      currentlyRefreshing: [],
    }
  }

  /**
   * Detect dataset parameters from context
   */
  detectDatasetParameters(): PCFDatasetMetadata[] {
    if (!this.context) {
      return []
    }
    const result = detectDatasetParameters(this.context)
    // detectDatasetParameters returns DatasetAnalysisResult with DatasetInfo[], 
    // but we need PCFDatasetMetadata[]. For now, return empty array.
    // TODO: Implement proper conversion or use a different method
    console.warn('detectDatasetParameters needs proper type conversion implementation')
    return []
  }

  /**
   * Inject records into a dataset
   */
  async injectRecordsIntoDataset(
    datasetName: string,
    records: ComponentFramework.WebApi.Entity[],
    options: {
      targetEntity?: string
      primaryIdAttribute?: string
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.context) {
      return { success: false, error: 'Context not available' }
    }

    try {
      await injectDatasetRecords({
        context: this.context,
        datasetName,
        queryResult: {
          entities: records,
          entityLogicalName: options.targetEntity || 'unknown',
          success: true,
        },
      })
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Generate dataset from view definition
   */
  async generateDatasetFromView(
    viewId: string,
    entityName: string,
    options: {
      recordCount?: number
      includeRelatedData?: boolean
    } = {}
  ): Promise<{ success: boolean; records?: ComponentFramework.WebApi.Entity[]; error?: string }> {
    if (!this.webAPI) {
      return { success: false, error: 'WebAPI not available' }
    }

    try {
      const dataset = await generateDatasetFromView({
        viewId,
        pageSize: options.recordCount ?? 10,
        includeRecords: true,
        recordLimit: options.recordCount ?? 10,
      })
      
      // Extract records from the generated dataset
      const records = Object.values(dataset.records) as ComponentFramework.WebApi.Entity[]
      return { success: true, records }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Validate a dataset query
   */
  validateQuery(query: DatasetQuery): { isValid: boolean; errors: string[] } {
    return validateQuery(query)
  }
}

// Singleton instance for global use
let datasetServiceInstance: DatasetService | null = null

/**
 * Get the global dataset service instance
 */
export function getDatasetService(): DatasetService {
  if (!datasetServiceInstance) {
    datasetServiceInstance = new DatasetService()
  }
  return datasetServiceInstance
}

/**
 * Initialize the global dataset service with context
 */
export function initializeDatasetService(options: DatasetServiceOptions): DatasetService {
  datasetServiceInstance = new DatasetService(options)
  return datasetServiceInstance
}