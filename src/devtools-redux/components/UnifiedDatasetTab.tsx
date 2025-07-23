/**
 * Unified Dataset Tab Component
 * Combines dataset parameter inspection with refresh functionality and relationship discovery
 * Replaces both DatasetTab and DatasetRefreshTool with a single, comprehensive interface
 */

import type React from 'react'
import { memo, useCallback, useEffect, useState, useMemo, useRef } from 'react'
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
import {
  analyzeDatasetRefreshErrorWithDiscovery,
  buildDatasetRefreshQueryWithDiscovery,
  clearDiscoveryCache,
  type DatasetErrorAnalysis,
  type DatasetRefreshState,
  type DiscoveredRelationship,
  executeDatasetQuery,
  getDiscoveredRelationships,
  testWebAPIConnection,
} from '../utils/dataset'
import { injectDatasetRecords } from '../utils/dataset/datasetInjector'
import { clearBatchMetadataCache } from '../utils/dataset/batchMetadataFetcher'
import { detectDatasetParameters } from '../utils/datasetAnalyzer'
import { 
  type FormPCFMatch
} from '../../utils/pcfDiscovery'
import { EntityDetectionPanel } from './EntityDetectionPanel'
interface UnifiedDatasetTabProps {
  connector: PCFDevToolsConnector
  currentState: any
  onUpdateView?: () => Promise<void>
  // Shared state from parent
  selectedParentEntity: ParentEntity | null
  onSelectParentEntity: (entity: ParentEntity | null) => void
  discoveredRelationships: DiscoveredRelationship[]
  onDiscoveredRelationshipsUpdate: (relationships: DiscoveredRelationship[]) => void
  detectedParentEntityType: string | null
  onDetectedParentEntityTypeUpdate: (type: string | null) => void
  currentEntity: string
  onCurrentEntityUpdate: (entity: string) => void
  targetEntity: string
  onTargetEntityUpdate: (entity: string) => void
}

export interface ParentEntity {
  id: string
  name: string
  entityType: string
}

// Component Props Interfaces
interface DatasetListItemProps {
  datasetKey: string
  dataset: any
  isSelected: boolean
  refreshResult?: any
  onClick: (key: string) => void
}

interface LeftPanelProps {
  datasets: Array<{ key: string; dataset: any }>
  selectedDataset: string | null
  refreshState: DatasetRefreshState
  datasetAnalysis: any
  currentEntity: string
  detectedParentEntityType: string | null
  parentEntitySearch: string
  selectedParentEntity: ParentEntity | null
  isLoadingParentEntities: boolean
  parentEntitySuggestions: ParentEntity[]
  availableViews: any[]
  selectedViewId: string | null
  currentState: any
  onSelectDataset: (key: string) => void
  onRefreshDatasets: () => void
  onSelectView: (viewId: string) => void
  onParentEntitySearch: (value: string) => void
  onSelectParentEntity: (entity: ParentEntity | null) => void
}

interface RightPanelProps {
  currentState: any
  selectedDataset: string | null
  datasets: Array<{ key: string; dataset: any }>
  currentEntity: string
  selectedForm: FormPCFMatch | null
  selectedParentEntity: ParentEntity | null
  discoveredRelationships: DiscoveredRelationship[]
  onEntityChange: (entity: string) => void
  onFormSelect: (form: FormPCFMatch | null) => void
}

// DatasetListItem Component
const DatasetListItem: React.FC<DatasetListItemProps> = ({ 
  datasetKey, 
  dataset, 
  isSelected, 
  refreshResult, 
  onClick 
}) => {
  return (
    <div
      onClick={() => onClick(datasetKey)}
      style={{
        padding: '12px',
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
            fontWeight: '600',
            color: isSelected ? '#ffffff' : '#e6edf3',
            fontSize: '13px',
          }}
        >
          {datasetKey}
        </div>
        <div
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '3px',
            backgroundColor: refreshResult
              ? refreshResult.queryResult.success
                ? '#22c55e'
                : '#ef4444'
              : dataset.hasData
                ? '#6b7280'
                : '#9ca3af',
            color: '#ffffff',
          }}
        >
          {refreshResult
            ? refreshResult.queryResult.success
              ? `${refreshResult.queryResult.entities.length} records`
              : 'Error'
            : `${dataset.recordCount || 0} records`}
        </div>
      </div>

      <div
        style={{
          color: isSelected ? '#b1bac4' : '#7d8590',
          fontSize: '11px',
          marginBottom: '4px',
        }}
      >
        <div>Entity: {dataset.entityLogicalName || 'unknown'}</div>
        {dataset.viewId && <div>View: {dataset.viewId.substring(0, 8)}...</div>}
        {dataset.relationshipName && (
          <div>Relationship: {dataset.relationshipName}</div>
        )}
      </div>

      {refreshResult?.errorAnalysis && (
        <div
          style={{
            fontSize: '10px',
            color: '#ff7b72',
            backgroundColor: '#3a1e1e',
            padding: '4px',
            borderRadius: '2px',
            marginTop: '4px',
          }}
        >
          Error: {refreshResult.queryResult.error}
        </div>
      )}
    </div>
  )
}

// LeftPanel Component
const LeftPanel: React.FC<LeftPanelProps> = ({
  datasets,
  selectedDataset,
  refreshState,
  datasetAnalysis,
  currentEntity,
  detectedParentEntityType,
  selectedParentEntity,
  availableViews,
  selectedViewId,
  currentState,
  onSelectDataset,
  onRefreshDatasets,
  onSelectView,
}) => {
  const getPageEntity = () => {
    const envValue = import.meta.env.VITE_PCF_PAGE_TABLE
    if (envValue) return envValue
    return currentEntity || 'unknown'
  }

  return (
    <div
      style={{
        width: '350px',
        borderRight: `1px solid ${colors.border.primary}`,
        overflow: 'auto',
        backgroundColor: colors.background.primary,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with Entity Info */}
      <div
        style={{
          ...commonStyles.container.panel,
          ...commonStyles.text.label,
          borderBottom: `1px solid ${colors.border.primary}`,
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          <strong>🔍 Data Search & Refresh</strong>
        </div>
        <div style={{ fontSize: fontSize.xs, color: colors.text.secondary, marginBottom: '4px' }}>
          Page/Form Entity:{' '}
          <span style={{ color: colors.status.success, fontWeight: 'bold' }}>
            {getPageEntity()}
          </span>
          {import.meta.env.VITE_PCF_PAGE_TABLE && (
            <span style={{ color: colors.text.secondary, fontSize: '10px', marginLeft: '4px' }}>
              (from env)
            </span>
          )}
        </div>
        <div style={{ fontSize: fontSize.xs, color: colors.text.secondary, marginBottom: '4px' }}>
          Target Entity:{' '}
          <span style={{ color: colors.status.info, fontWeight: 'bold' }}>
            {currentEntity}
          </span>
        </div>

        {/* Parent Entity Selection */}
        <div style={{ marginTop: '12px' }}>
          {selectedParentEntity ? (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#1a3d1a',
              border: '1px solid #2ea043',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#5ea85e', marginBottom: '2px' }}>
                    Parent Filter Active
                  </div>
                  <div style={{ color: '#7ee787', fontWeight: '500' }}>
                    {selectedParentEntity.name}
                  </div>
                  <div style={{ color: '#5ea85e', fontSize: '10px' }}>
                    {selectedParentEntity.entityType} • {selectedParentEntity.id}
                  </div>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    // Switch to parent search tab
                    const buttons = Array.from(document.querySelectorAll('button'))
                    const parentSearchButton = buttons.find(btn => btn.textContent?.includes('🔍 Parent Search'))
                    if (parentSearchButton) {
                      parentSearchButton.click()
                    }
                  }}
                  style={{
                    color: '#58a6ff',
                    fontSize: '11px',
                    textDecoration: 'none',
                  }}
                  title="Go to Parent Search tab to change selection"
                >
                  Change →
                </a>
              </div>
            </div>
          ) : !detectedParentEntityType ? (
            <div style={{ 
              padding: '8px', 
              backgroundColor: '#1a3d1a', 
              border: '1px solid #2ea043',
              borderRadius: '4px',
              fontSize: '11px',
              marginBottom: '8px'
            }}>
              <div style={{ color: '#7ee787', marginBottom: '4px' }}>
                💡 No parent entity detected. Click "Refresh All Datasets" to discover relationships from metadata.
              </div>
              <div style={{ fontSize: '10px', color: '#7ee787' }}>
                Or add VITE_PCF_PAGE_TABLE=your_parent_entity to .env file
              </div>
            </div>
          ) : detectedParentEntityType ? (
            <div style={{ 
              padding: '8px', 
              backgroundColor: '#161b22', 
              border: '1px solid #30363d',
              borderRadius: '4px',
              fontSize: '11px',
            }}>
              <div style={{ color: '#7d8590', marginBottom: '4px' }}>
                No parent filter active
              </div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  // Switch to parent search tab
                  const buttons = Array.from(document.querySelectorAll('button'))
                  const parentSearchButton = buttons.find(btn => btn.textContent?.includes('🔍 Parent Search'))
                  if (parentSearchButton) {
                    parentSearchButton.click()
                  }
                }}
                style={{
                  color: '#58a6ff',
                  fontSize: '11px',
                  textDecoration: 'none',
                }}
              >
                Select parent {detectedParentEntityType} →
              </a>
            </div>
          ) : (
            <div style={{ 
              padding: '8px', 
              backgroundColor: '#1a3d1a', 
              border: '1px solid #2ea043',
              borderRadius: '4px',
              fontSize: '11px',
              marginBottom: '8px'
            }}>
              <div style={{ color: '#7ee787', marginBottom: '4px' }}>
                💡 No parent entity detected. Click "Refresh All Datasets" to discover relationships.
              </div>
              <div style={{ fontSize: '10px', color: '#7ee787' }}>
                Or add VITE_PCF_PAGE_TABLE=your_parent_entity to .env file
              </div>
            </div>
          )}

        {/* View Selection */}
        {availableViews.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <label
              style={{
                fontSize: '11px',
                color: colors.text.secondary,
                marginBottom: '4px',
                display: 'block',
              }}
            >
              Select View:
            </label>
            <select
              value={selectedViewId || ''}
              onChange={e => onSelectView(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                fontSize: '11px',
                backgroundColor: '#21262d',
                border: '1px solid #30363d',
                borderRadius: '3px',
                color: '#e6edf3',
              }}
            >
              <option value="">Select a view...</option>
              {availableViews.map(view => (
                <option key={view.savedqueryid} value={view.savedqueryid}>
                  {view.name} {view.isdefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        </div>
      </div>

      {/* Refresh Controls */}
      <div
        style={{
          padding: '12px',
          borderBottom: `1px solid ${colors.border.primary}`,
          backgroundColor: '#1a1f2e',
        }}
      >
        <button
          onClick={onRefreshDatasets}
          disabled={refreshState.isRefreshing || datasets.length === 0}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: refreshState.isRefreshing ? '#475569' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: refreshState.isRefreshing ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '8px',
          }}
        >
          {refreshState.isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh All Datasets'}
        </button>

        {/* Status */}
        {refreshState.lastRefresh && (
          <div style={{ fontSize: '10px', color: colors.text.secondary }}>
            Last refresh: {refreshState.lastRefresh.toLocaleTimeString()} • ✅{' '}
            {refreshState.successCount} • ❌ {refreshState.errorCount}
          </div>
        )}
      </div>

      {/* Dataset List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {datasets.length === 0 ? (
          <div
            style={{
              padding: '16px',
              color: colors.text.secondary,
              fontSize: '12px',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            {datasetAnalysis.summary}
          </div>
        ) : (
          datasets.map(({ key, dataset }) => {
            const isSelected = selectedDataset === key
            const refreshResult = refreshState.refreshResults.find(
              r => r.subgridInfo.controlId === key
            )

            return (
              <DatasetListItem
                key={key}
                datasetKey={key}
                dataset={dataset}
                isSelected={isSelected}
                refreshResult={refreshResult}
                onClick={onSelectDataset}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// RightPanel Component
const RightPanel: React.FC<RightPanelProps> = ({
  currentState,
  selectedDataset,
  datasets,
  currentEntity,
  selectedForm,
  selectedParentEntity,
  discoveredRelationships,
  onEntityChange,
  onFormSelect,
}) => {
  const selectedDatasetObj = datasets.find(d => d.key === selectedDataset)
  const selectedDatasetDetails = selectedDatasetObj?.dataset

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #21262d',
          backgroundColor: '#161b22',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: '#e6edf3',
          }}
        >
          {selectedDataset ? `Dataset: ${selectedDataset}` : 'Dataset Discovery & Details'}
        </h3>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
        {!selectedDataset ? (
          <div
            style={{
              color: '#7d8590',
              fontSize: '12px',
              textAlign: 'center',
              marginTop: '24px',
            }}
          >
            {datasets.length === 0 ? (
              <>
                <div style={{ marginBottom: '16px', fontSize: '14px', color: '#e6edf3' }}>
                  📊 No datasets detected on this form
                </div>
                <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
                  <h4 style={{ color: '#e6edf3', marginBottom: '8px' }}>Getting Started:</h4>
                  <ol style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                    <li>Add dataset parameters to your PCF component</li>
                    <li>Configure them in the control manifest</li>
                    <li>Bind them to Dataverse entities in the app designer</li>
                    <li>Refresh this page to see the datasets</li>
                  </ol>
                </div>
              </>
            ) : (
              'Select a dataset from the list to view details'
            )}
          </div>
        ) : selectedDatasetDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Dataset Info */}
            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                padding: '12px',
              }}
            >
              <h4
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#e6edf3',
                }}
              >
                Dataset Information
              </h4>
              <div style={{ fontSize: '11px', color: '#7d8590' }}>
                <div>Entity: {selectedDatasetDetails.entityLogicalName || 'unknown'}</div>
                <div>Records: {selectedDatasetDetails.recordCount || 0}</div>
                {selectedDatasetDetails.viewId && (
                  <div>View ID: {selectedDatasetDetails.viewId}</div>
                )}
                {selectedDatasetDetails.relationshipName && (
                  <div>Relationship: {selectedDatasetDetails.relationshipName}</div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

const UnifiedDatasetTabComponent: React.FC<UnifiedDatasetTabProps> = ({
  connector,
  currentState,
  onUpdateView,
  selectedParentEntity,
  onSelectParentEntity,
  discoveredRelationships,
  onDiscoveredRelationshipsUpdate,
  detectedParentEntityType,
  onDetectedParentEntityTypeUpdate,
  currentEntity,
  onCurrentEntityUpdate,
  targetEntity,
  onTargetEntityUpdate,
}) => {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [availableViews, setAvailableViews] = useState<Array<{savedqueryid: string, name: string, isdefault: boolean}>>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [refreshState, setRefreshState] = useState<DatasetRefreshState>({
    isRefreshing: false,
    refreshResults: [],
    successCount: 0,
    errorCount: 0,
    totalFormsToRefresh: 0,
    currentlyRefreshing: [],
  })
  const [selectedForm, setSelectedForm] = useState<FormPCFMatch | null>(null)
  const [datasetAnalysisTrigger, setDatasetAnalysisTrigger] = useState(0)
  
  // Memoize dataset analysis to prevent repeated calls - must be early to avoid temporal dead zone
  const datasetAnalysis = useMemo(() => {
    console.log('🔍 Dataset analysis memoization triggered:', {
      hasContext: !!currentState?.context,
      analysisTrigger: datasetAnalysisTrigger,
      contextTimestamp: currentState?.context ? 'exists' : 'null'
    })
    
    if (!currentState?.context) {
      console.log('❌ No context available for dataset analysis')
      return { datasets: [], totalRecords: 0, summary: 'No context available' }
    }
    
    console.log('📊 Running fresh dataset parameter detection...')
    const result = detectDatasetParameters(currentState.context)
    console.log('✅ Dataset analysis complete:', {
      datasetCount: result.datasets.length,
      totalRecords: result.totalRecords,
      summary: result.summary
    })
    
    return result
  }, [currentState?.context, datasetAnalysisTrigger])

  // Define datasets immediately after datasetAnalysis to avoid temporal dead zone issues
  const datasets = datasetAnalysis.datasets.map(ds => ({
    key: ds.name,
    dataset: {
      ...ds,
      type: 'DataSet',
    },
  }))

  // Trigger dataset refresh when parent entity changes
  useEffect(() => {
    if (selectedParentEntity && datasets.length > 0) {
      console.log('🚀 Parent entity changed, scheduling dataset refresh:', {
        parentEntity: selectedParentEntity.name,
        parentId: selectedParentEntity.id,
        datasetCount: datasets.length,
        delay: '100ms'
      })
      
      // Add a small delay to ensure caches are cleared
      const timer = setTimeout(() => {
        console.log('⏰ Timer expired, triggering dataset analysis refresh now')
        setDatasetAnalysisTrigger(prev => {
          const newValue = prev + 1
          console.log('📊 Dataset analysis trigger updated:', prev, '→', newValue)
          return newValue
        })
      }, 100)
      
      return () => {
        console.log('🛑 Cleanup: clearing dataset refresh timer')
        clearTimeout(timer)
      }
    } else {
      console.log('⏭️ Skipping dataset refresh trigger:', {
        hasParentEntity: !!selectedParentEntity,
        datasetCount: datasets.length,
        reason: !selectedParentEntity ? 'no parent entity' : 'no datasets'
      })
    }
  }, [selectedParentEntity?.id, datasets.length])

  // Helper function to get the correct target entity
  const getTargetEntity = useCallback(() => {
    return targetEntity
  }, [targetEntity])

  // Helper function to get the correct page/form entity
  const getPageEntity = useCallback(() => {
    return import.meta.env.VITE_PCF_PAGE_TABLE || 
           currentEntity || 
           'unknown'
  }, [currentEntity])

  // Refs to prevent duplicate operations
  const relationshipDiscoveryInProgress = useRef(false)

  // Update current entity when datasets change
  useEffect(() => {
    if (datasets.length > 0 && datasets[0]?.dataset?.entityLogicalName) {
      const entityName = datasets[0].dataset.entityLogicalName
      console.log('📋 Updating target entity from dataset:', entityName)
      onTargetEntityUpdate(entityName)
    }
  }, [datasets, onTargetEntityUpdate])

  

  // Callbacks for EntityDetectionPanel
  const handleEntityChange = useCallback((entity: string) => {
    onCurrentEntityUpdate(entity)
  }, [onCurrentEntityUpdate])

  const handleFormSelect = useCallback((form: FormPCFMatch | null) => {
    setSelectedForm(form)
    if (form) {
      // Clear relationship cache when switching forms
      clearDiscoveryCache()
      onDiscoveredRelationshipsUpdate([])
    }
  }, [onDiscoveredRelationshipsUpdate])

  const handleDatasetAnalysisTrigger = useCallback(() => {
    setDatasetAnalysisTrigger(prev => prev + 1)
  }, [])



  // Auto-discover relationships when datasets are available
  useEffect(() => {
    if (datasets.length > 0 && currentEntity !== 'unknown' && currentState?.webAPI) {
      // Prevent duplicate discovery operations
      if (relationshipDiscoveryInProgress.current) {
        console.log('⏳ Relationship discovery already in progress, skipping...')
        return
      }
      
      console.log(
        `🚀 Auto-discovering relationships for ${currentEntity} with ${datasets.length} datasets`,
        { 
          currentEntity, 
          datasets: datasets.map(d => ({ 
            key: d.key, 
            entityLogicalName: d.dataset.entityLogicalName 
          })),
          hasWebAPI: !!currentState?.webAPI,
          hasContext: !!currentState?.context
        }
      )

      const discoverRelationships = async () => {
        relationshipDiscoveryInProgress.current = true
        const context = currentState.context
        const webAPI = currentState.webAPI

        // Try to discover relationships for each dataset
        for (const { dataset } of datasets) {
          if (dataset.entityLogicalName && 
              dataset.entityLogicalName !== currentEntity && 
              dataset.entityLogicalName !== 'unknown') {
            console.log(`🔍 Attempting discovery: ${currentEntity} -> ${dataset.entityLogicalName}`, {
              currentEntity,
              datasetEntity: dataset.entityLogicalName,
              condition1: dataset.entityLogicalName !== currentEntity,
              condition2: dataset.entityLogicalName !== 'unknown'
            })

            try {
              // Import the discovery function and try to discover the relationship
              const { discoverRelationshipMultiStrategy, discoverRelationshipsFromRecords } = await import('../utils/dataset')

              const discoveredRelationship = await discoverRelationshipMultiStrategy(
                currentEntity,
                dataset.entityLogicalName,
                webAPI
              )

              if (discoveredRelationship) {
                console.log(
                  `✅ Auto-discovered relationship: ${discoveredRelationship.parentEntity} -> ${discoveredRelationship.childEntity} via ${discoveredRelationship.lookupColumn}`
                )
              }
            } catch (error) {
              console.log(
                `⚠️ Auto-discovery failed for ${currentEntity} -> ${dataset.entityLogicalName}:`,
                error
              )
            }
          }
        }

        // Update the UI with discovered relationships
        const timer = setTimeout(() => {
          const current = getDiscoveredRelationships()
          onDiscoveredRelationshipsUpdate(current)
          console.log(`🔍 Auto-discovery complete: ${current.length} relationships found`)
          relationshipDiscoveryInProgress.current = false
        }, 1000)

        return timer
      }

      const timer = setTimeout(() => {
        discoverRelationships()
      }, 800) // Give a bit more time for context to stabilize

      return () => clearTimeout(timer)
    }
  }, [datasets.length, currentEntity, currentState?.webAPI])

  const handleRefreshDatasets = useCallback(async () => {
    console.log('🎯 Refresh button clicked - validating prerequisites:', {
      hasContext: !!currentState?.context,
      hasWebAPI: !!currentState?.webAPI,
      datasetCount: datasets.length,
      currentEntity,
      selectedParent: selectedParentEntity ? `${selectedParentEntity.name} (${selectedParentEntity.id})` : 'none'
    })
    
    if (!currentState?.context || !currentState?.webAPI || datasets.length === 0) {
      console.warn('⚠️ Cannot refresh: missing context, webAPI, or datasets')
      return
    }

    console.log(`🚀 Starting dataset refresh for entity: ${currentEntity}`)
    console.log('📋 Refresh context:', {
      totalDatasets: datasets.length,
      datasetNames: datasets.map(d => d.key),
      parentEntityFilter: selectedParentEntity?.id || 'none',
      refreshTime: new Date().toISOString()
    })

    setRefreshState({
      isRefreshing: true,
      refreshResults: [],
      successCount: 0,
      errorCount: 0,
      totalFormsToRefresh: datasets.length,
      currentlyRefreshing: datasets.map(d => d.key),
      lastRefresh: new Date(),
    })

    const context = currentState.context
    const webAPI = currentState.webAPI
    const refreshResults = []
    let successCount = 0
    let errorCount = 0

    try {
      // Test WebAPI connection first
      const connectionTest = await testWebAPIConnection(webAPI)
      if (!connectionTest.success) {
        throw new Error(`WebAPI connection failed: ${connectionTest.error}`)
      }

      // Process each dataset
      for (const { key, dataset } of datasets) {
        try {
          const targetEntity = dataset.entityLogicalName || currentEntity || 'unknown'
          
          // Skip datasets with unknown entity
          if (targetEntity === 'unknown') {
            console.warn(`⚠️ Skipping dataset ${key} with unknown entity type`)
            errorCount++
            setRefreshState(prev => ({
              ...prev,
              errorCount: errorCount,
              refreshResults: [
                ...prev.refreshResults,
                {
                  subgridInfo: {
                    formId: '',
                    formName: '',
                    entityTypeCode: 0,
                    controlId: key,
                    targetEntity: 'unknown',
                    viewId: dataset.viewId,
                    relationshipName: dataset.relationshipName,
                    isCustomView: false,
                    allowViewSelection: false,
                  },
                  queryResult: null,
                  query: '',
                  error: 'Cannot refresh dataset with unknown entity type. Please select a form or set VITE_PCF_TARGET_TABLE environment variable.',
                  success: false,
                },
              ],
            }))
            continue
          }
          
          console.log(`🔍 Processing dataset: ${key} (${targetEntity})`)

          // Create SubgridInfo from dataset for query building
          const subgridInfo = {
            formId: 'current-form',
            formName: 'Current PCF Context',
            entityTypeCode: 0,
            controlId: key,
            targetEntity: targetEntity,
            viewId: dataset.viewId,
            relationshipName:
              selectedParentEntity && detectedParentEntityType
                ? dataset.relationshipName || `${detectedParentEntityType}_${dataset.entityLogicalName}s`
                : dataset.relationshipName || `${currentEntity}_${dataset.entityLogicalName}`,
            isCustomView: false,
            allowViewSelection: false,
            enableViewPicker: false,
          }

          // Build query with runtime discovery
          const queryOptions = {
            includeFormattedValues: true,
            parentEntity: selectedParentEntity
              ? selectedParentEntity.entityType
              : currentEntity,
            parentRecordId: selectedParentEntity
              ? selectedParentEntity.id
              : undefined,
            webAPI: webAPI,
          }
          
          const query = await buildDatasetRefreshQueryWithDiscovery(subgridInfo, queryOptions)

          console.log(`🏗️ Built query for ${key}:`, query.odataQuery)

          // Execute query
          const queryResult = await executeDatasetQuery(query, webAPI)

          refreshResults.push({
            subgridInfo,
            queryResult,
            query: query.odataQuery,
          })

          if (queryResult.success) {
            successCount++
            console.log(`✅ Success for ${key}: ${queryResult.entities.length} records`)
            console.log(`🔍 Records retrieved:`, queryResult.entities.slice(0, 3).map(e => ({ id: e.id, name: e.name || e.displayName || 'unnamed' })))
            
            // Log the dataset state before injection
            const datasetBefore = context.parameters?.[key]
            console.log(`📊 Dataset ${key} before injection:`, {
              hasRecords: !!datasetBefore?.records,
              recordCount: Object.keys(datasetBefore?.records || {}).length,
              records: datasetBefore?.records ? Object.keys(datasetBefore.records).slice(0, 5) : []
            })
            
            console.log(`💉 Starting injection of ${queryResult.entities.length} records into ${key}...`)
            
            // Inject the retrieved records into the dataset
            const injected = await injectDatasetRecords({
              context,
              datasetName: key,
              queryResult,
              // Don't trigger updateView yet - wait until all datasets are processed
            })
            
            if (injected) {
              console.log(`✨ Successfully injected records into dataset: ${key}`)
              
              // Log the dataset state after injection
              const datasetAfter = context.parameters?.[key]
              console.log(`📊 Dataset ${key} after injection:`, {
                hasRecords: !!datasetAfter?.records,
                recordCount: Object.keys(datasetAfter?.records || {}).length,
                records: datasetAfter?.records ? Object.keys(datasetAfter.records).slice(0, 5) : []
              })
            }
          } else {
            errorCount++
            console.error(`❌ Failed for ${key}:`, queryResult.error)
          }
        } catch (error) {
          console.error(`💥 Error processing dataset ${key}:`, error)

          let errorAnalysisResult: DatasetErrorAnalysis | null = null

          if (error && typeof error === 'object' && 'status' in error) {
            try {
              errorAnalysisResult = await analyzeDatasetRefreshErrorWithDiscovery(
                error as Response,
                `${datasets.find(d => d.key === key)?.dataset?.entityLogicalName}s`,
                currentEntity,
                dataset.entityLogicalName,
                webAPI
              )
            } catch (analysisError) {
              console.warn('Error analysis failed:', analysisError)
            }
          }

          refreshResults.push({
            subgridInfo: {
              formId: 'current-form',
              formName: 'Current PCF Context',
              entityTypeCode: 0,
              controlId: key,
              targetEntity: dataset.entityLogicalName || currentEntity || 'unknown',
              isCustomView: false,
              allowViewSelection: false,
              enableViewPicker: false,
            },
            queryResult: {
              success: false,
              entities: [],
              error: String(error),
            },
            errorAnalysis: errorAnalysisResult,
            query: `${dataset.entityLogicalName}s?$select=*`,
          })
          errorCount++
        }
      }

      // Discover relationships for the dataset entity if not already done
      if (datasets.length > 0) {
        const targetEntity = datasets[0]?.dataset?.entityLogicalName
        if (targetEntity && targetEntity !== 'unknown') {
          try {
            // Check if we already have relationships discovered
            let currentDiscovered = getDiscoveredRelationships()
            
            // If no relationships found, try to discover them
            if (currentDiscovered.length === 0) {
              console.log(`🔍 Discovering relationships for ${targetEntity}...`)
              
              // Get entity metadata to find relationships
              const metadataUrl = `EntityDefinitions(LogicalName='${targetEntity}')/ManyToOneRelationships?$select=ReferencingAttribute,ReferencedEntity,ReferencedAttribute`
              const metadataResponse = await fetch(`/api/data/v9.2/${metadataUrl}`)
              
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json()
                const relationships: DiscoveredRelationship[] = metadata.value?.map((rel: any) => ({
                  relationshipName: `${rel.ReferencedEntity}_${targetEntity}s`,
                  parentEntity: rel.ReferencedEntity,
                  childEntity: targetEntity,
                  lookupColumn: `_${rel.ReferencingAttribute}_value`,
                  referencingAttribute: rel.ReferencingAttribute,
                  referencedEntity: rel.ReferencedEntity
                })) || []
                
                console.log(`✅ Discovered ${relationships.length} relationships for ${targetEntity}`)
                
                // Also analyze dataset records if available to discover more relationships
                if (refreshResults.length > 0) {
                  for (const result of refreshResults) {
                    if (result.queryResult?.success && result.queryResult.entities.length > 0) {
                      const recordRelationships = await discoverRelationshipsFromRecords(
                        result.queryResult.entities,
                        targetEntity,
                        webAPI
                      )
                      
                      // Merge with existing relationships, avoiding duplicates
                      recordRelationships.forEach(rel => {
                        if (!relationships.find(r => 
                          r.parentEntity === rel.parentEntity && 
                          r.childEntity === rel.childEntity && 
                          r.lookupColumn === rel.lookupColumn
                        )) {
                          relationships.push(rel)
                        }
                      })
                    }
                  }
                  console.log(`✅ Total relationships after record analysis: ${relationships.length}`)
                }
                
                onDiscoveredRelationshipsUpdate(relationships)
              }
            } else {
              onDiscoveredRelationshipsUpdate(currentDiscovered)
            }
            
            // If we don't have a view ID from form discovery, try to get appropriate view
            if (datasets[0] && !datasets[0].dataset.viewId) {
              console.log(`🔍 Looking for appropriate view for ${targetEntity}...`)
              
              // Query for views associated with this entity
              const viewsUrl = `/api/data/v9.2/savedqueries?$filter=returnedtypecode eq '${targetEntity}'&$select=savedqueryid,name,isdefault,fetchxml&$orderby=name`
              const viewsResponse = await fetch(viewsUrl)
              
              if (viewsResponse.ok) {
                const viewsData = await viewsResponse.json()
                if (viewsData.value && viewsData.value.length > 0) {
                  console.log(`📋 Found ${viewsData.value.length} views for ${targetEntity}`)
                  
                  // Store available views
                  setAvailableViews(viewsData.value)
                  
                  // Look for views that might be appropriate for the current context
                  let selectedView = null
                  
                  // If we have a parent entity selected, look for views that filter by that parent
                  if (selectedParentEntity && detectedParentEntityType) {
                    // Look for views that might be designed for this relationship
                    for (const view of viewsData.value) {
                      // Check if the view name suggests it's for this relationship
                      const viewNameLower = view.name.toLowerCase()
                      const parentEntityLower = detectedParentEntityType.toLowerCase()
                      
                      if (viewNameLower.includes(parentEntityLower) || 
                          viewNameLower.includes('associated') ||
                          viewNameLower.includes('related')) {
                        selectedView = view
                        console.log(`✅ Found relationship-specific view: ${view.name}`)
                        break
                      }
                    }
                  }
                  
                  // If no relationship-specific view found, look for common view types
                  if (!selectedView) {
                    // Priority order: Gantt View, Active Records, Default View, First View
                    selectedView = viewsData.value.find((v: any) => v.name.toLowerCase().includes('gantt')) ||
                                  viewsData.value.find((v: any) => v.name.toLowerCase().includes('active')) ||
                                  viewsData.value.find((v: any) => v.isdefault) ||
                                  viewsData.value[0]
                  }
                  
                  if (selectedView) {
                    console.log(`✅ Selected view: ${selectedView.name} (${selectedView.savedqueryid})`)
                    setSelectedViewId(selectedView.savedqueryid)
                    
                    // Update the dataset's view ID
                    if (currentState?.context?.parameters?.sampleDataSet) {
                      const dataset = currentState.context.parameters.sampleDataSet as any
                      dataset._viewId = selectedView.savedqueryid
                      
                      // Also update getViewId to return this value
                      Object.defineProperty(dataset, 'getViewId', {
                        value: () => selectedView.savedqueryid,
                        writable: true,
                        configurable: true
                      })
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to discover relationships:', error)
            // Still use cached relationships if discovery fails
            const currentDiscovered = getDiscoveredRelationships()
            setDiscoveredRelationships(currentDiscovered)
          }
        }
      }
    } catch (error) {
      console.error('💥 Overall refresh failed:', error)
      errorCount = datasets.length
    }

    const finalState = {
      isRefreshing: false,
      refreshResults,
      successCount,
      errorCount,
      totalFormsToRefresh: datasets.length,
      currentlyRefreshing: [],
      lastRefresh: new Date(),
    }

    setRefreshState(finalState)
    console.log(`🏁 Refresh complete: ${successCount} success, ${errorCount} errors`)
    
    // Trigger updateView if we successfully injected any records
    if (successCount > 0 && onUpdateView) {
      console.log(`🔄 Triggering PCF updateView after dataset refresh`)
      await onUpdateView()
    }
  }, [currentState, datasets, currentEntity, selectedParentEntity, onUpdateView])

  const handleSelectDataset = useCallback((key: string) => {
    setSelectedDataset(key)
  }, [])



  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      <LeftPanel
        datasets={datasets}
        selectedDataset={selectedDataset}
        refreshState={refreshState}
        datasetAnalysis={datasetAnalysis}
        currentEntity={currentEntity}
        detectedParentEntityType={detectedParentEntityType}
        selectedParentEntity={selectedParentEntity}
        availableViews={availableViews}
        selectedViewId={selectedViewId}
        currentState={currentState}
        onSelectDataset={handleSelectDataset}
        onRefreshDatasets={handleRefreshDatasets}
        onSelectView={(viewId) => {
          setSelectedViewId(viewId)
          
          // Update the dataset's view ID
          if (currentState?.context?.parameters?.sampleDataSet && viewId) {
            const dataset = currentState.context.parameters.sampleDataSet as any
            dataset._viewId = viewId
            
            // Also update getViewId to return this value
            Object.defineProperty(dataset, 'getViewId', {
              value: () => viewId,
              writable: true,
              configurable: true
            })
            
            const selectedView = availableViews.find(v => v.savedqueryid === viewId)
            console.log(`👁️ View changed to: ${selectedView?.name} (${viewId})`)
          }
        }}
      />

      <RightPanel
        currentState={currentState}
        selectedDataset={selectedDataset}
        datasets={datasets}
        currentEntity={currentEntity}
        selectedForm={selectedForm}
        selectedParentEntity={selectedParentEntity}
        discoveredRelationships={discoveredRelationships}
        onEntityChange={handleEntityChange}
        onFormSelect={handleFormSelect}
      />
    </div>
  )
}

// Export memoized component for performance
export const UnifiedDatasetTab = memo(UnifiedDatasetTabComponent)
