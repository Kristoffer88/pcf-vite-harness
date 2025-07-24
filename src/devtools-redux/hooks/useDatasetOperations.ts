/**
 * useDatasetOperations Hook
 * Custom hook for dataset operations business logic
 * Encapsulates dataset service interactions and state management
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { DatasetService, getDatasetService } from '../services/dataset-service'
import { getErrorService } from '../services/error-service'
import type {
  DatasetRefreshState,
  PCFDatasetMetadata,
  SubgridInfo,
  QueryResult,
} from '../utils/dataset/types'

export interface UseDatasetOperationsOptions {
  webAPI?: ComponentFramework.WebApi
  context?: ComponentFramework.Context<any>
  maxPageSize?: number
  enableDiscovery?: boolean
}

export interface DatasetOperationsState {
  refreshState: DatasetRefreshState
  datasets: PCFDatasetMetadata[]
  subgrids: SubgridInfo[]
  isConnected: boolean
  connectionError?: string
  lastRefresh?: Date
}

export function useDatasetOperations(options: UseDatasetOperationsOptions = {}) {
  const {
    webAPI,
    context,
    maxPageSize = 25,
    enableDiscovery = true,
  } = options

  // Services
  const datasetService = useRef<DatasetService>(getDatasetService())
  const errorService = useRef(getErrorService())

  // State
  const [state, setState] = useState<DatasetOperationsState>({
    refreshState: {
      isRefreshing: false,
      refreshResults: [],
      successCount: 0,
      errorCount: 0,
      totalFormsToRefresh: 0,
      currentlyRefreshing: [],
    },
    datasets: [],
    subgrids: [],
    isConnected: false,
  })

  // Update services when context changes
  useEffect(() => {
    datasetService.current.updateContext(webAPI, context)
    errorService.current.updateWebAPI(webAPI)
  }, [webAPI, context])

  // Detect datasets when context changes
  useEffect(() => {
    if (context) {
      const datasets = datasetService.current.detectDatasetParameters()
      setState(prev => ({ ...prev, datasets }))
    }
  }, [context])

  // Test connection
  const testConnection = useCallback(async () => {
    try {
      const result = await datasetService.current.testConnection()
      setState(prev => ({
        ...prev,
        isConnected: result.success,
        connectionError: result.error,
      }))
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionError: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }, [])

  // Refresh single dataset
  const refreshDataset = useCallback(
    async (subgrid: SubgridInfo, parentRecordId?: string) => {
      try {
        const result = enableDiscovery
          ? await datasetService.current.refreshDatasetWithDiscovery(subgrid, {
              maxPageSize,
              parentRecordId,
            })
          : await datasetService.current.refreshDataset(subgrid, {
              maxPageSize,
              parentRecordId,
            })

        return result
      } catch (error) {
        console.error('Dataset refresh failed:', error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          entities: [],
          entityLogicalName: subgrid.targetEntity,
          success: false,
          error: errorMessage,
        } as QueryResult
      }
    },
    [maxPageSize, enableDiscovery]
  )

  // Refresh multiple datasets
  const refreshDatasets = useCallback(
    async (
      subgrids: SubgridInfo[],
      options: { parentRecordId?: string; parentEntity?: string } = {}
    ) => {
      if (subgrids.length === 0) {
        return undefined
      }

      setState(prev => ({
        ...prev,
        refreshState: {
          ...prev.refreshState,
          isRefreshing: true,
          totalFormsToRefresh: subgrids.length,
          currentlyRefreshing: subgrids.map(s => s.controlId),
          refreshResults: [],
          successCount: 0,
          errorCount: 0,
        },
      }))

      try {
        const refreshState = await datasetService.current.refreshMultipleDatasets(subgrids, {
          maxPageSize,
          useDiscovery: enableDiscovery,
          ...options,
        })

        setState(prev => ({
          ...prev,
          refreshState: {
            ...refreshState,
            isRefreshing: false,
            lastRefresh: new Date(),
          },
          lastRefresh: new Date(),
        }))

        return refreshState
      } catch (error) {
        console.error('Multi-dataset refresh failed:', error)
        const errorState = {
          isRefreshing: false,
          refreshResults: [],
          successCount: 0,
          errorCount: subgrids.length,
          totalFormsToRefresh: subgrids.length,
          currentlyRefreshing: [],
        }
        setState(prev => ({
          ...prev,
          refreshState: errorState,
        }))
        return errorState
      }
    },
    [maxPageSize, enableDiscovery]
  )

  // Inject records into dataset
  const injectRecords = useCallback(
    async (
      datasetName: string,
      records: ComponentFramework.WebApi.Entity[],
      options: { targetEntity?: string; primaryIdAttribute?: string } = {}
    ) => {
      return datasetService.current.injectRecordsIntoDataset(datasetName, records, options)
    },
    []
  )

  // Generate test data from view
  const generateTestData = useCallback(
    async (
      viewId: string,
      entityName: string,
      options: { recordCount?: number; includeRelatedData?: boolean } = {}
    ) => {
      return datasetService.current.generateDatasetFromView(viewId, entityName, options)
    },
    []
  )

  // Clear dataset and start fresh
  const clearAndRefresh = useCallback(
    async (subgrids: SubgridInfo[], options: { parentRecordId?: string } = {}) => {
      // First detect fresh datasets
      if (context) {
        const datasets = datasetService.current.detectDatasetParameters()
        setState(prev => ({ ...prev, datasets }))
      }

      // Then refresh
      return refreshDatasets(subgrids, options)
    },
    [context, refreshDatasets]
  )

  // Get dataset parameter info
  const getDatasetInfo = useCallback(() => {
    if (!context) return []
    return datasetService.current.detectDatasetParameters()
  }, [context])

  // Validate query
  const validateQuery = useCallback((query: any) => {
    return datasetService.current.validateQuery(query)
  }, [])

  return {
    // State
    ...state,

    // Actions
    testConnection,
    refreshDataset,
    refreshDatasets,
    injectRecords,
    generateTestData,
    clearAndRefresh,
    getDatasetInfo,
    validateQuery,

    // Computed
    hasDatasets: state.datasets.length > 0,
    hasSubgrids: state.subgrids.length > 0,
    isRefreshing: state.refreshState.isRefreshing,

    // Config
    maxPageSize,
    enableDiscovery,
  }
}