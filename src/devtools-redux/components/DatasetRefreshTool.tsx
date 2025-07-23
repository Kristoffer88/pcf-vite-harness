/**
 * Dataset Refresh Tool Component
 * Integrated PCF DevTools component for refreshing datasets across all forms
 */

import type React from 'react'
import { useEffect, useState } from 'react'
import type {
  DatasetErrorAnalysis,
  DatasetRefreshState,
  PCFDatasetMetadata,
  SubgridInfo,
} from '../utils/dataset'
import {
  analyzeDatasetRefreshError,
  analyzeDatasetRefreshErrorWithDiscovery,
  analyzeDataverseError,
  buildDatasetRefreshQuery,
  buildDatasetRefreshQueryWithDiscovery,
  clearDiscoveryCache,
  executeDatasetQuery,
  getDiscoveredRelationships,
  isKnownRelationship,
  suggestRelationshipMapping,
  testWebAPIConnection,
} from '../utils/dataset'
import { detectDatasetParameters } from '../utils/datasetAnalyzer'
import type { PCFManifest } from '../utils/datasetQueryBuilderLegacy'
import { DatasetErrorDisplay } from './DatasetErrorDisplay'
import { generateDatasetFromView } from '../utils/dataset/datasetGenerator'

export interface DatasetRefreshToolProps {
  manifest?: PCFManifest
  context?: ComponentFramework.Context<any>
  webAPI?: ComponentFramework.WebApi
  className?: string
  onRefreshComplete?: (result: DatasetRefreshState) => void
}

export const DatasetRefreshTool: React.FC<DatasetRefreshToolProps> = ({
  manifest,
  context,
  webAPI,
  className = '',
  onRefreshComplete,
}) => {
  const [refreshState, setRefreshState] = useState<DatasetRefreshState>({
    isRefreshing: false,
    refreshResults: [],
    successCount: 0,
    errorCount: 0,
    totalFormsToRefresh: 0,
    currentlyRefreshing: [],
  })

  const [subgridInfos, setSubgridInfos] = useState<SubgridInfo[]>([])
  const [datasetMetadata, setDatasetMetadata] = useState<PCFDatasetMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEntityType, setSelectedEntityType] = useState<number | undefined>()
  const [currentParentRecordId, setCurrentParentRecordId] = useState<string | null>(null)
  const [errorAnalysis, setErrorAnalysis] = useState<DatasetErrorAnalysis[]>([])
  const [discoveredRelationships, setDiscoveredRelationships] = useState<any[]>([])

  // Load dataset information when component mounts
  useEffect(() => {
    if (context) {
      loadDatasetInfo()
      extractParentRecordId()
    }
  }, [context])

  const extractParentRecordId = () => {
    if (!context) return

    try {
      // Try to get parent record ID from context
      // This would be the ID of the record the subgrid is on
      let recordId = (context as any)?.page?.entityId

      // Fallback: try to get from context mode
      if (!recordId && (context as any)?.mode?.contextInfo?.entityId) {
        recordId = (context as any).mode.contextInfo.entityId
      }

      // Fallback: try to get from URL or other context sources
      if (!recordId && (context as any)?.client?.getFormId) {
        try {
          const formId = (context as any).client.getFormId()
          if (formId) {
            recordId = formId
          }
        } catch (e) {
          // Ignore form ID extraction errors
        }
      }

      if (recordId) {
        setCurrentParentRecordId(recordId)
        console.log('📋 Parent Record ID:', recordId)
      } else {
        console.log('⚠️ No parent record ID found - this may be a new record or standalone context')
      }
    } catch (error) {
      console.warn('Could not extract parent record ID:', error)
    }
  }

  const loadDatasetInfo = async () => {
    if (!context) return

    setIsLoading(true)
    try {
      // Use the dataset analyzer to detect available datasets
      const datasetAnalysis = detectDatasetParameters(context)

      // Convert detected datasets to SubgridInfo format for compatibility
      const infos: SubgridInfo[] = datasetAnalysis.datasets.map(dataset => ({
        formId: 'current-form',
        formName: 'Current PCF Context',
        entityTypeCode: 0,
        controlId: dataset.name,
        targetEntity: dataset.entityLogicalName || 'unknown',
        viewId: dataset.viewId,
        relationshipName: dataset.relationshipName,
        isCustomView: false,
        allowViewSelection: false,
        enableViewPicker: false,
      }))

      setSubgridInfos(infos)

      // Detect entity name with multiple fallback strategies
      const entityName = detectEntityName(context, datasetAnalysis)

      // Create metadata from analysis
      const metadata: PCFDatasetMetadata = {
        componentId: 'current-component',
        formId: 'current-form',
        formName: 'Current PCF Context',
        entityName: entityName,
        datasetParameters: datasetAnalysis.datasets.reduce((acc, ds) => {
          acc[ds.name] = {
            entityLogicalName: ds.entityLogicalName || 'unknown',
            viewId: ds.viewId,
            relationshipName: ds.relationshipName,
            currentRecordCount: ds.totalRecordCount || 0,
          }
          return acc
        }, {} as any),
        subgrids: infos,
      }

      setDatasetMetadata(metadata)
    } catch (error) {
      console.error('Error loading dataset info:', error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Detect entity name using multiple fallback strategies
   */
  const detectEntityName = (
    context: ComponentFramework.Context<any>,
    datasetAnalysis: any
  ): string => {
    // Strategy 1: Try context.page.entityTypeName (standard approach)
    if (context.page?.entityTypeName) {
      console.log(`✅ Entity detected from context.page: ${context.page.entityTypeName}`)
      return context.page.entityTypeName
    }

    // Strategy 2: Try to infer from dataset target entities
    const datasetEntities = datasetAnalysis.datasets
      .map((ds: any) => ds.entityLogicalName)
      .filter((entity: string) => entity && entity !== 'unknown')

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

    // Strategy 3: Try to extract from context mode or client info
    const contextInfo = (context as any)?.mode?.contextInfo
    if (contextInfo?.entityTypeName) {
      console.log(`✅ Entity detected from context mode: ${contextInfo.entityTypeName}`)
      return contextInfo.entityTypeName
    }

    // Strategy 4: Try to extract from URL or form context (development scenarios)
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

    console.warn('⚠️ Could not detect entity name using any strategy')
    return 'unknown'
  }

  const handleRefreshDatasets = async () => {
    if (!context || !webAPI) return

    const newRefreshState: DatasetRefreshState = {
      isRefreshing: true,
      refreshResults: [],
      successCount: 0,
      errorCount: 0,
      totalFormsToRefresh: subgridInfos.length,
      currentlyRefreshing: subgridInfos.map(info => info.controlId),
      lastRefresh: new Date(),
    }

    setRefreshState(newRefreshState)

    try {
      // Test WebAPI connection first
      const connectionTest = await testWebAPIConnection(webAPI)
      if (!connectionTest.success) {
        throw new Error(`WebAPI connection failed: ${connectionTest.error}`)
      }

      const refreshResults = []
      let successCount = 0
      let errorCount = 0

      // Refresh each dataset individually
      for (const subgridInfo of subgridInfos) {
        try {
          // Find the dataset parameter for this subgrid
          const datasetAnalysis = detectDatasetParameters(context)
          const matchingDataset = datasetAnalysis.datasets.find(
            ds => ds.name === subgridInfo.controlId
          )

          if (!matchingDataset) {
            throw new Error(`Dataset ${subgridInfo.controlId} not found in context`)
          }

          // Use the new dataset generator if we have a viewId
          let queryResult
          
          if (matchingDataset.viewId) {
            try {
              console.log('📊 Using dataset generator for view:', matchingDataset.viewId)
              
              // Generate the complete dataset structure from the view
              const generatedDataset = await generateDatasetFromView({
                viewId: matchingDataset.viewId,
                pageSize: 5000,
                includeRecords: true,
                recordLimit: 5000,
              })
              
              // Convert generated dataset to query result format
              queryResult = {
                success: !generatedDataset.error,
                entities: Object.keys(generatedDataset.records).map(recordId => {
                  const record = generatedDataset.records[recordId]
                  // Extract raw entity data from record fields
                  const entity: any = { [matchingDataset.entityLogicalName + 'id']: recordId }
                  
                  if (record._record && record._record.fields) {
                    Object.entries(record._record.fields).forEach(([fieldName, fieldData]: [string, any]) => {
                      if (fieldData.value !== undefined) {
                        entity[fieldName] = fieldData.value
                      } else if (fieldData.reference) {
                        entity[fieldName] = fieldData.reference.id.guid
                        entity[`_${fieldName}_value`] = fieldData.reference.id.guid
                        entity[`_${fieldName}_value@OData.Community.Display.V1.FormattedValue`] = fieldData.reference.name
                      }
                    })
                  }
                  
                  return entity
                }),
                error: generatedDataset.errorMessage,
                metadata: {
                  columns: generatedDataset.columns,
                  totalCount: generatedDataset.paging.totalResultCount,
                },
              }
              
              console.log('✅ Generated dataset with', queryResult.entities.length, 'records')
            } catch (genError) {
              console.warn('⚠️ Dataset generator failed, falling back to legacy method:', genError)
              
              // Fallback to the original query builder
              const query = await buildDatasetRefreshQueryWithDiscovery(subgridInfo, {
                maxPageSize: 5000,
                includeFormattedValues: true,
                parentRecordId: currentParentRecordId || undefined,
                parentEntity: datasetMetadata?.entityName || undefined,
                webAPI: webAPI,
              })
              
              queryResult = await executeDatasetQuery(query, webAPI)
            }
          } else {
            // No viewId, use the original method
            const query = await buildDatasetRefreshQueryWithDiscovery(subgridInfo, {
              maxPageSize: 50,
              includeFormattedValues: true,
              parentRecordId: currentParentRecordId || undefined,
              parentEntity: datasetMetadata?.entityName || undefined,
              webAPI: webAPI,
            })
            
            queryResult = await executeDatasetQuery(query, webAPI)
          }

          refreshResults.push({
            subgridInfo,
            queryResult,
            query: query.odataQuery,
          })

          if (queryResult.success) {
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          console.error(`Error refreshing dataset ${subgridInfo.controlId}:`, error)

          let errorAnalysisResult: DatasetErrorAnalysis | null = null

          // Analyze error if it's from a Response
          if (error && typeof error === 'object' && 'status' in error) {
            try {
              // Use enhanced error analysis with discovery suggestions
              errorAnalysisResult = await analyzeDatasetRefreshErrorWithDiscovery(
                error as Response,
                queryString,
                datasetMetadata?.entityName,
                subgridInfo.targetEntity,
                webAPI
              )
              const detailedError = await analyzeDataverseError(
                error as Response,
                queryString
              )
              console.error('🔥 Detailed error analysis:', detailedError)
            } catch (analysisError) {
              console.warn('Could not analyze error:', analysisError)
              // Fallback to basic analysis
              try {
                errorAnalysisResult = await analyzeDatasetRefreshError(
                  error as Response,
                  queryString
                )
              } catch (fallbackError) {
                console.warn('Fallback error analysis also failed:', fallbackError)
              }
            }
          }

          refreshResults.push({
            subgridInfo,
            queryResult: {
              success: false,
              entities: [],
              error: String(error),
            },
            errorAnalysis: errorAnalysisResult,
            query: queryString,
          })
          errorCount++
        }
      }

      const finalState = {
        isRefreshing: false,
        refreshResults,
        successCount,
        errorCount,
        totalFormsToRefresh: subgridInfos.length,
        currentlyRefreshing: [],
        lastRefresh: new Date(),
      }

      // Update discovered relationships for debugging
      const currentlyDiscovered = getDiscoveredRelationships()
      setDiscoveredRelationships(currentlyDiscovered)

      setRefreshState(finalState)
      onRefreshComplete?.(finalState)
    } catch (error) {
      console.error('Error refreshing datasets:', error)
      const errorState = {
        ...newRefreshState,
        isRefreshing: false,
        errorCount: subgridInfos.length,
        currentlyRefreshing: [],
      }
      setRefreshState(errorState)
      onRefreshComplete?.(errorState)
    }
  }

  const getStatusColor = (success: boolean) => (success ? '#22c55e' : '#ef4444')
  const getStatusText = (success: boolean) => (success ? 'Success' : 'Failed')

  return (
    <div
      className={`dataset-refresh-tool ${className}`}
      style={{
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
        fontSize: '13px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #334155',
          backgroundColor: '#1e293b',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#f1f5f9' }}>
            📊 Dataset Refresh Tool
          </h3>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {refreshState.lastRefresh && (
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Last: {refreshState.lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefreshDatasets}
              disabled={
                refreshState.isRefreshing || !context || !webAPI || subgridInfos.length === 0
              }
              style={{
                padding: '6px 12px',
                backgroundColor: refreshState.isRefreshing ? '#475569' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor:
                  refreshState.isRefreshing || !context || !webAPI || subgridInfos.length === 0
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              {refreshState.isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh All'}
            </button>
          </div>
        </div>

        {/* Context Info */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            fontSize: '11px',
            marginBottom: '8px',
            padding: '8px',
            backgroundColor: '#334155',
            borderRadius: '4px',
          }}
        >
          <div>
            <span style={{ color: '#94a3b8' }}>Entity: </span>
            <span style={{ color: '#f1f5f9', fontWeight: '500' }}>
              {datasetMetadata?.entityName || 'Loading...'}
            </span>
          </div>
          {currentParentRecordId && (
            <div>
              <span style={{ color: '#94a3b8' }}>Parent ID: </span>
              <span style={{ color: '#f1f5f9', fontWeight: '500' }}>
                {currentParentRecordId.substring(0, 8)}...
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ color: '#94a3b8' }}>Datasets: </span>
            <span style={{ color: '#f1f5f9', fontWeight: '500' }}>
              {Object.keys(datasetMetadata?.datasetParameters || {}).length}
            </span>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Subgrids: </span>
            <span style={{ color: '#f1f5f9', fontWeight: '500' }}>{subgridInfos.length}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Success: </span>
            <span style={{ color: '#22c55e', fontWeight: '500' }}>{refreshState.successCount}</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8' }}>Errors: </span>
            <span style={{ color: '#ef4444', fontWeight: '500' }}>{refreshState.errorCount}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#94a3b8',
            }}
          >
            Loading subgrid information...
          </div>
        ) : subgridInfos.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>
              No subgrid configurations found
            </div>
            <div style={{ fontSize: '12px' }}>
              This PCF component doesn't appear to be configured with any datasets on forms
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px' }}>
            {/* Subgrid Information */}
            <div style={{ marginBottom: '24px' }}>
              <h4
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#f1f5f9',
                }}
              >
                🔗 Subgrid Configurations ({subgridInfos.length})
              </h4>

              <div
                style={{
                  maxHeight: '300px',
                  overflow: 'auto',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                }}
              >
                {subgridInfos.map((info, index) => (
                  <div
                    key={`${info.formId}-${info.controlId}`}
                    style={{
                      padding: '12px',
                      borderBottom: index < subgridInfos.length - 1 ? '1px solid #334155' : 'none',
                      backgroundColor: index % 2 === 0 ? '#1e293b' : '#0f172a',
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
                      <div>
                        <div
                          style={{
                            fontWeight: '500',
                            color: '#f1f5f9',
                            marginBottom: '4px',
                          }}
                        >
                          {info.formName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Control: {info.controlId}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor: '#8b5cf6',
                          color: '#ffffff',
                        }}
                      >
                        {info.targetEntity}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: '11px',
                        color: '#94a3b8',
                      }}
                    >
                      {info.viewId && (
                        <div>
                          <span style={{ color: '#f59e0b' }}>View:</span>{' '}
                          {info.viewId.substring(0, 8)}...
                        </div>
                      )}
                      {info.relationshipName && (
                        <div>
                          <span style={{ color: '#10b981' }}>Relationship:</span>{' '}
                          {info.relationshipName}
                          {!isKnownRelationship(info.relationshipName) && (
                            <span
                              style={{
                                marginLeft: '6px',
                                fontSize: '10px',
                                backgroundColor: '#fbbf24',
                                padding: '1px 4px',
                                borderRadius: '2px',
                                color: '#000',
                              }}
                            >
                              Unknown
                            </span>
                          )}
                        </div>
                      )}
                      {info.isCustomView && <div style={{ color: '#3b82f6' }}>Custom View</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discovered Relationships */}
            {discoveredRelationships.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🔍 Discovered Relationships ({discoveredRelationships.length})
                  <button
                    onClick={() => {
                      clearDiscoveryCache()
                      setDiscoveredRelationships([])
                      console.log('🧹 Discovery cache cleared')
                    }}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      border: 'none',
                      backgroundColor: '#6b7280',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                    title="Clear discovery cache"
                  >
                    Clear Cache
                  </button>
                </h4>

                <div
                  style={{
                    maxHeight: '200px',
                    overflow: 'auto',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                  }}
                >
                  {discoveredRelationships.map((relationship, index) => (
                    <div
                      key={`${relationship.parentEntity}-${relationship.childEntity}-${index}`}
                      style={{
                        padding: '10px',
                        borderBottom:
                          index < discoveredRelationships.length - 1 ? '1px solid #334155' : 'none',
                        backgroundColor: index % 2 === 0 ? '#1e293b' : '#0f172a',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: '500',
                            color: '#f1f5f9',
                            fontSize: '12px',
                          }}
                        >
                          {relationship.parentEntity} → {relationship.childEntity}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor:
                              relationship.confidence === 'high'
                                ? '#059669'
                                : relationship.confidence === 'medium'
                                  ? '#d97706'
                                  : '#dc2626',
                            color: '#ffffff',
                          }}
                        >
                          {relationship.confidence}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          marginBottom: '4px',
                        }}
                      >
                        <strong>Lookup Column:</strong> {relationship.lookupColumn}
                      </div>

                      <div
                        style={{
                          fontSize: '10px',
                          color: '#6b7280',
                          display: 'flex',
                          gap: '12px',
                        }}
                      >
                        <span>Source: {relationship.source}</span>
                        <span>
                          Discovered: {new Date(relationship.discoveredAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refresh Results */}
            {refreshState.refreshResults.length > 0 && (
              <div>
                <h4
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#f1f5f9',
                  }}
                >
                  📈 Refresh Results
                </h4>

                <div
                  style={{
                    maxHeight: '300px',
                    overflow: 'auto',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                  }}
                >
                  {refreshState.refreshResults.map((result, index) => (
                    <div
                      key={`${result.subgridInfo.formId}-${result.subgridInfo.controlId}-${index}`}
                      style={{
                        padding: '12px',
                        borderBottom:
                          index < refreshState.refreshResults.length - 1
                            ? '1px solid #334155'
                            : 'none',
                        backgroundColor: index % 2 === 0 ? '#1e293b' : '#0f172a',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '500', color: '#f1f5f9' }}>
                            {result.subgridInfo.formName}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>
                            {result.subgridInfo.controlId}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor: getStatusColor(result.queryResult.success),
                            color: '#ffffff',
                          }}
                        >
                          {getStatusText(result.queryResult.success)}
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {result.queryResult.success ? (
                          <span>
                            ✅ Retrieved {result.queryResult.entities.length} records
                            {result.queryResult.nextLink && ' (more available)'}
                          </span>
                        ) : (
                          <DatasetErrorDisplay
                            error={result.queryResult.error || 'Unknown error'}
                            analysis={result.errorAnalysis}
                            query={result.query}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
