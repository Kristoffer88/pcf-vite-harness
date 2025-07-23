/**
 * Dataset Tab Component
 * Handles dataset parameter inspection and record injection
 */

import type React from 'react'
import { memo, useCallback, useState } from 'react'
import type { PCFDevToolsConnector } from '../PCFDevToolsConnector'
import {
  borderRadius,
  colors,
  commonStyles,
  fontSize,
  fonts,
  fontWeight,
  spacing,
} from '../styles/theme'
import { detectDatasetParameters } from '../utils/datasetAnalyzer'
import { DatasetRefreshTool } from './DatasetRefreshTool'
import { LoadingSpinner } from './LoadingSpinner'

interface DatasetTabProps {
  connector: PCFDevToolsConnector
  currentState: any
}

/**
 * Detect entity name using multiple fallback strategies
 */
const detectEntityName = (
  context: ComponentFramework.Context<any>,
  datasetAnalysis: any
): string => {
  // Strategy 1: Try context.page.entityTypeName (standard approach)
  if (context.page?.entityTypeName && context.page.entityTypeName !== 'systemuser') {
    console.log(`✅ Entity detected from context.page: ${context.page.entityTypeName}`)
    return context.page.entityTypeName
  }

  // Strategy 2: Try to infer from dataset target entities
  const datasetEntities = datasetAnalysis.datasets
    .map((ds: any) => ds.entityLogicalName)
    .filter((entity: string) => entity && entity !== 'unknown' && entity !== 'systemuser')

  if (datasetEntities.length > 0) {
    // Find the most likely parent entity
    const primaryEntity =
      datasetEntities.find(
        (entity: string) =>
          // Look for entities that don't appear to be junction/association entities
          !entity.includes('_') || entity.length < 10
      ) || datasetEntities[0]

    console.log(`✅ Entity inferred from dataset parameters: ${primaryEntity}`)
    console.log(`📋 Available dataset entities:`, datasetEntities)
    return primaryEntity
  }

  // Strategy 3: Try to extract from URL
  try {
    const url = window.location.href
    const entityMatch =
      url.match(/\/main\.aspx.*[?&]etn=([^&]+)/) ||
      url.match(/\/([a-z]+)\/.*\/form/) ||
      url.match(/entity=([a-z_]+)/)

    if (entityMatch && entityMatch[1]) {
      console.log(`✅ Entity detected from URL: ${entityMatch[1]}`)
      return entityMatch[1]
    }
  } catch (error) {
    // Ignore URL parsing errors
  }

  // Strategy 4: Try context mode
  const contextInfo = (context as any)?.mode?.contextInfo
  if (contextInfo?.entityTypeName && contextInfo.entityTypeName !== 'systemuser') {
    console.log(`✅ Entity detected from context mode: ${contextInfo.entityTypeName}`)
    return contextInfo.entityTypeName
  }

  console.warn('⚠️ Could not detect entity name using any strategy, returning unknown')
  return 'unknown'
}

const DatasetTabComponent: React.FC<DatasetTabProps> = ({ connector, currentState }) => {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [injectionStatus, setInjectionStatus] = useState<{ [key: string]: any }>({})
  const [showRefreshTool, setShowRefreshTool] = useState<boolean>(false)
  const [loadingState, setLoadingState] = useState<{
    [key: string]: {
      isLoading: boolean
      message: string
      subMessage?: string
      steps?: string[]
      currentStep?: number
    }
  }>({})

  // Use the proper dataset analyzer to detect datasets
  const datasetAnalysis = currentState?.context
    ? detectDatasetParameters(currentState.context)
    : { datasets: [], totalRecords: 0, summary: 'No context available' }

  const datasets = datasetAnalysis.datasets.map(ds => ({
    key: ds.name,
    dataset: {
      ...ds,
      type: 'DataSet', // For backward compatibility with the UI
    },
  }))

  console.log(`🔍 DevTools: Dataset analysis result:`, {
    totalDatasets: datasets.length,
    totalRecords: datasetAnalysis.totalRecords,
    summary: datasetAnalysis.summary,
    primaryDataset: datasetAnalysis.primaryDataset?.name,
  })

  const handleInjectRecords = useCallback(
    async (datasetKey: string) => {
      // Set loading state with steps
      setLoadingState(prev => ({
        ...prev,
        [datasetKey]: {
          isLoading: true,
          message: 'Initializing dataset refresh...',
          steps: [
            'Testing WebAPI connection',
            'Fetching view metadata',
            'Retrieving column definitions',
            'Fetching entity metadata',
            'Generating dataset structure',
            'Loading records',
          ],
          currentStep: 0,
        },
      }))
      
      setInjectionStatus(prev => ({ ...prev, [datasetKey]: { loading: true } }))

      try {
        const webAPI = currentState?.webAPI
        const context = currentState?.context

        if (!webAPI || !context) {
          throw new Error('WebAPI or context not available')
        }

        // Use the new modular API to refresh this specific dataset
        const { buildDatasetRefreshQuery, executeDatasetQuery, testWebAPIConnection } =
          await import('../utils/dataset')
        const { detectDatasetParameters } = await import('../utils/datasetAnalyzer')
        const { generateDatasetFromView } = await import('../utils/dataset/datasetGenerator')

        // Test connection first
        setLoadingState(prev => ({
          ...prev,
          [datasetKey]: {
            ...prev[datasetKey],
            currentStep: 0,
            subMessage: 'Verifying WebAPI access...',
          },
        }))
        
        const connectionTest = await testWebAPIConnection(webAPI)
        if (!connectionTest.success) {
          throw new Error(`WebAPI connection failed: ${connectionTest.error}`)
        }

        // Find the dataset in context
        const datasetAnalysis = detectDatasetParameters(context)
        const dataset = datasetAnalysis.datasets.find(ds => ds.name === datasetKey)

        if (!dataset) {
          throw new Error(`Dataset ${datasetKey} not found in context`)
        }

        // If we have a viewId, use the new dataset generator
        if (dataset.viewId) {
          console.log('📊 Using dataset generator for view:', dataset.viewId)
          
          // Update loading steps for view-based generation
          setLoadingState(prev => ({
            ...prev,
            [datasetKey]: {
              ...prev[datasetKey],
              currentStep: 1,
              message: 'Fetching view definition...',
              subMessage: `View ID: ${dataset.viewId.substring(0, 8)}...`,
            },
          }))
          
          // Create a wrapper to track progress
          const generatedDataset = await generateDatasetFromViewWithProgress(
            {
              viewId: dataset.viewId,
              pageSize: 5000,
              includeRecords: true,
              recordLimit: 5000,
            },
            (step: number, message: string) => {
              setLoadingState(prev => ({
                ...prev,
                [datasetKey]: {
                  ...prev[datasetKey],
                  currentStep: step,
                  subMessage: message,
                },
              }))
            }
          )
          
          if (!generatedDataset.error) {
            // Clear loading state
            setLoadingState(prev => {
              const newState = { ...prev }
              delete newState[datasetKey]
              return newState
            })
            
            setInjectionStatus(prev => ({
              ...prev,
              [datasetKey]: {
                success: true,
                message: `Successfully generated dataset with ${generatedDataset.columns.length} columns and ${Object.keys(generatedDataset.records).length} records`,
                timestamp: new Date().toLocaleTimeString(),
                generatedDataset, // Store for display
                loading: false,
              },
            }))
          } else {
            throw new Error(generatedDataset.errorMessage || 'Failed to generate dataset')
          }
        } else {
          // Fallback to original method
          const detectedEntity = detectEntityName(context, datasetAnalysis) || dataset.entityLogicalName || 'unknown'
          
          const query = buildDatasetRefreshQuery(detectedEntity, {
            viewId: dataset.viewId,
            maxRecords: 50,
          })

          const queryResult = await executeDatasetQuery(webAPI, query)

          if (queryResult.success) {
            setInjectionStatus(prev => ({
              ...prev,
              [datasetKey]: {
                success: true,
                message: `Successfully refreshed ${queryResult.entities.length} records`,
                timestamp: new Date().toLocaleTimeString(),
              },
            }))
          } else {
            throw new Error(queryResult.error || 'Unknown error during refresh')
          }
        }
      } catch (error) {
        console.error('Error refreshing dataset:', error)
        
        // Clear loading state
        setLoadingState(prev => {
          const newState = { ...prev }
          delete newState[datasetKey]
          return newState
        })
        
        setInjectionStatus(prev => ({
          ...prev,
          [datasetKey]: {
            error: true,
            message: String(error),
            timestamp: new Date().toLocaleTimeString(),
            loading: false,
          },
        }))
      }
    },
    [currentState]
  )
  
  // Helper function to wrap generateDatasetFromView with progress tracking
  const generateDatasetFromViewWithProgress = async (
    options: any,
    onProgress: (step: number, message: string) => void
  ) => {
    const { generateDatasetFromView } = await import('../utils/dataset/datasetGenerator')
    
    // Map progress events to UI steps
    const progressMap: Record<string, { step: number; getMessage: (details: any) => string }> = {
      fetchingView: { step: 1, getMessage: () => 'Fetching view metadata...' },
      viewFetched: { step: 1, getMessage: (d) => `Found view: ${d.viewName}` },
      fetchingMetadata: { step: 2, getMessage: (d) => `Retrieving metadata for ${d.columnCount} columns...` },
      metadataFetched: { step: 3, getMessage: (d) => `Processing ${d.attributeCount} attributes...` },
      buildingColumns: { step: 3, getMessage: () => 'Building column definitions...' },
      columnsBuilt: { step: 4, getMessage: (d) => `Generated ${d.columnCount} column definitions` },
      fetchingRecords: { step: 5, getMessage: (d) => `Loading records (limit: ${d.limit})...` },
      processingRecords: { step: 5, getMessage: (d) => `Processing ${d.count} records...` },
      recordsProcessed: { step: 5, getMessage: (d) => `Processed ${d.current} of ${d.total} records` },
      recordsFetched: { step: 5, getMessage: (d) => `Loaded ${d.recordCount} records successfully` },
    }
    
    // Add progress callback to options
    const enhancedOptions = {
      ...options,
      onProgress: (step: string, details?: any) => {
        const mapping = progressMap[step]
        if (mapping) {
          onProgress(mapping.step, mapping.getMessage(details || {}))
        }
      },
    }
    
    return await generateDatasetFromView(enhancedOptions)
  }

  const handleSelectDataset = useCallback((key: string) => {
    setSelectedDataset(key)
  }, [])

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Dataset List */}
      <div
        style={{
          width: '350px',
          borderRight: `1px solid ${colors.border.primary}`,
          overflow: 'auto',
          backgroundColor: colors.background.primary,
        }}
      >
        <div
          style={{
            ...commonStyles.container.panel,
            ...commonStyles.text.label,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            Dataset Parameters ({datasets.length})
            {datasetAnalysis.primaryDataset && (
              <div
                style={{
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.normal,
                  color: colors.status.accent,
                  textTransform: 'none',
                  marginTop: spacing.xs,
                }}
              >
                Primary: {datasetAnalysis.primaryDataset.name}
              </div>
            )}
            <div
              style={{
                fontSize: '10px',
                color: colors.status.warning,
                textTransform: 'none',
                marginTop: spacing.xs,
                padding: '4px 6px',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderRadius: '3px',
              }}
            >
              💡 For form/subgrid selection, use UnifiedDatasetTab
            </div>
          </div>
          <button
            onClick={() => setShowRefreshTool(!showRefreshTool)}
            style={{
              padding: '4px 8px',
              backgroundColor: showRefreshTool ? '#1f6feb' : '#238636',
              color: '#ffffff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: '500',
              marginLeft: '8px',
            }}
          >
            {showRefreshTool ? '📊 Hide Refresh' : '🔄 Refresh Tool'}
          </button>
        </div>

        {datasets.length === 0 ? (
          <div
            style={{
              padding: '16px',
              color: '#7d8590',
              fontSize: '12px',
              fontStyle: 'italic',
            }}
          >
            {datasetAnalysis.summary}
          </div>
        ) : (
          <div>
            {datasets.map(({ key, dataset }: { key: string; dataset: any }) => {
              const isSelected = selectedDataset === key
              const status = injectionStatus[key]

              return (
                <div
                  key={key}
                  onClick={() => handleSelectDataset(key)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#1f6feb' : 'transparent',
                    borderLeft: isSelected ? '3px solid #58a6ff' : '3px solid transparent',
                    borderBottom: '1px solid #21262d',
                    fontSize: '12px',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: '500',
                        color: isSelected ? '#ffffff' : '#e6edf3',
                        fontSize: '13px',
                      }}
                    >
                      {key}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: dataset.hasData ? '#238636' : '#da3633',
                        color: '#ffffff',
                      }}
                    >
                      {dataset.recordCount || 0} records
                    </div>
                  </div>

                  <div
                    style={{
                      color: isSelected ? '#b1bac4' : '#7d8590',
                      fontSize: '11px',
                      marginBottom: '8px',
                    }}
                  >
                    <div>Columns: {dataset.columnCount || 0}</div>
                    {dataset.entityLogicalName && <div>Entity: {dataset.entityLogicalName}</div>}
                    {dataset.viewId && <div>View: {dataset.viewId.substring(0, 8)}...</div>}
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleInjectRecords(key)
                    }}
                    disabled={status?.loading || loadingState[key]?.isLoading}
                    style={{
                      fontSize: '10px',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      border: 'none',
                      backgroundColor: status?.loading || loadingState[key]?.isLoading ? '#7d8590' : '#3b82f6',
                      color: '#ffffff',
                      cursor: status?.loading || loadingState[key]?.isLoading ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    {status?.loading || loadingState[key]?.isLoading ? 'Refreshing...' : '🔄 Refresh'}
                  </button>

                  {status && !status.loading && (
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '10px',
                        color: status.error ? '#ff7b72' : status.success ? '#7ee787' : '#7d8590',
                      }}
                    >
                      {status.message} ({status.timestamp})
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dataset Details or Refresh Tool */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#0d1117',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {showRefreshTool ? (
          <DatasetRefreshTool
            manifest={currentState?.manifest}
            context={currentState?.context}
            webAPI={currentState?.webAPI}
            onRefreshComplete={result => {
              console.log('Dataset refresh completed:', result)
              // Optionally update injectionStatus or trigger a state refresh
              setInjectionStatus(prev => ({
                ...prev,
                refresh: {
                  success: result.successCount > 0,
                  message: `Refreshed ${result.successCount} datasets, ${result.errorCount} errors`,
                  timestamp: new Date().toLocaleTimeString(),
                },
              }))
            }}
          />
        ) : (
          <>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #21262d',
                backgroundColor: '#161b22',
                fontWeight: '600',
                fontSize: '12px',
                color: '#7d8590',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {selectedDataset ? `Dataset: ${selectedDataset}` : 'Dataset Analysis'}
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 'normal',
                  color: '#7d8590',
                  textTransform: 'none',
                  marginTop: '4px',
                }}
              >
                {datasetAnalysis.summary}
              </div>
            </div>

            <div style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
              {selectedDataset && loadingState[selectedDataset]?.isLoading ? (
                <LoadingSpinner
                  message={loadingState[selectedDataset].message}
                  subMessage={loadingState[selectedDataset].subMessage}
                  steps={loadingState[selectedDataset].steps}
                  currentStep={loadingState[selectedDataset].currentStep}
                />
              ) : selectedDataset ? (
                <div>
                  {/* Show generated dataset if available */}
                  {injectionStatus[selectedDataset]?.generatedDataset ? (
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#7ee787',
                          marginBottom: '12px',
                          padding: '8px',
                          backgroundColor: 'rgba(126, 231, 135, 0.1)',
                          borderRadius: '4px',
                          border: '1px solid rgba(126, 231, 135, 0.3)',
                        }}
                      >
                        ✅ Generated dataset from view with {injectionStatus[selectedDataset].generatedDataset.columns.length} columns
                      </div>
                      
                      {/* Column details */}
                      <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '12px', color: '#7d8590', marginBottom: '8px' }}>
                          COLUMNS ({injectionStatus[selectedDataset].generatedDataset.columns.length})
                        </h4>
                        <div
                          style={{
                            maxHeight: '200px',
                            overflow: 'auto',
                            border: '1px solid #21262d',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          {injectionStatus[selectedDataset].generatedDataset.columns.map((col: any, idx: number) => (
                            <div
                              key={col.name}
                              style={{
                                padding: '6px 10px',
                                borderBottom: '1px solid #21262d',
                                backgroundColor: idx % 2 === 0 ? '#0d1117' : '#161b22',
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span style={{ color: '#e6edf3' }}>
                                {col.name} ({col.displayName})
                              </span>
                              <span style={{ color: '#7d8590' }}>
                                {col.dataType} [{col.type}]
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Show full dataset structure */}
                      <details>
                        <summary style={{ cursor: 'pointer', marginBottom: '8px', color: '#58a6ff' }}>
                          View Full Dataset Structure
                        </summary>
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            fontSize: '11px',
                            lineHeight: '1.4',
                            fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
                            color: '#e6edf3',
                            backgroundColor: '#0d1117',
                            padding: '12px',
                            border: '1px solid #21262d',
                            borderRadius: '4px',
                          }}
                        >
                          {JSON.stringify(injectionStatus[selectedDataset].generatedDataset, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        fontSize: '12px',
                        lineHeight: '1.6',
                        fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
                        color: '#e6edf3',
                        backgroundColor: '#0d1117',
                      }}
                    >
                      {JSON.stringify(
                        datasets.find((d: { key: string; dataset: any }) => d.key === selectedDataset)
                          ?.dataset || {},
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      color: '#7d8590',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      marginBottom: '16px',
                    }}
                  >
                    Select a dataset parameter from the list to view its details and inject test
                    records.
                  </div>

                  {injectionStatus.refresh && (
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: injectionStatus.refresh.success ? '#1e3a1e' : '#3a1e1e',
                        border: `1px solid ${injectionStatus.refresh.success ? '#238636' : '#da3633'}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <div
                        style={{
                          color: injectionStatus.refresh.success ? '#7ee787' : '#ff7b72',
                          fontWeight: '500',
                          marginBottom: '4px',
                        }}
                      >
                        Last Refresh Result
                      </div>
                      <div style={{ color: '#e6edf3' }}>{injectionStatus.refresh.message}</div>
                      <div style={{ color: '#7d8590', fontSize: '11px', marginTop: '4px' }}>
                        {injectionStatus.refresh.timestamp}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Export memoized component for performance
export const DatasetTab = memo(DatasetTabComponent)
