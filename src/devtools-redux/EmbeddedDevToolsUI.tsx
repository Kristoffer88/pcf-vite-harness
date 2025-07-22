/**
 * Embedded DevTools UI Component
 * Provides a simple, built-in devtools interface
 */

import React, { useState, useEffect, useRef } from 'react'
import { PCFDevToolsConnector } from './PCFDevToolsConnector'
import { detectDatasetParameters } from './utils/datasetAnalyzer'
import { AdvancedDebugger } from './components/AdvancedDebugger'
import { LifecycleTriggers } from './components/LifecycleTriggers'

interface EmbeddedDevToolsUIProps {
  connector: PCFDevToolsConnector
}

export const EmbeddedDevToolsUI: React.FC<EmbeddedDevToolsUIProps> = ({ connector }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [actions, setActions] = useState<any[]>([])
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null)
  const [currentState, setCurrentState] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'actions' | 'datasets' | 'lifecycle' | 'debugger'>('lifecycle')
  const actionsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Subscribe to devtools updates
    const unsubscribe = connector.subscribe((message: any) => {
      setActions(connector.getActions())
      setCurrentState(connector.getState())
    })

    // Initial load
    setActions(connector.getActions())
    setCurrentState(connector.getState())

    return unsubscribe
  }, [connector])

  useEffect(() => {
    // Auto-scroll to latest action
    if (actionsEndRef.current && !selectedActionIndex) {
      actionsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [actions, selectedActionIndex])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#21262d',
          color: '#e6edf3',
          border: '1px solid #30363d',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 10000,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease'
        }}
        title="Open PCF DevTools"
      >
        🔍 PCF DevTools
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '400px',
      backgroundColor: '#0d1117',
      color: '#e6edf3',
      borderTop: '1px solid #21262d',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10000,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#161b22',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #21262d',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#58a6ff' }}>🔍 PCF DEVTOOLS</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('actions')}
              style={{
                backgroundColor: activeTab === 'actions' ? '#238636' : '#21262d',
                color: '#ffffff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Actions {actions.length}
            </button>
            <button
              onClick={() => setActiveTab('lifecycle')}
              style={{
                backgroundColor: activeTab === 'lifecycle' ? '#238636' : '#21262d',
                color: '#ffffff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Lifecycle
            </button>
            <button
              onClick={() => setActiveTab('datasets')}
              style={{
                backgroundColor: activeTab === 'datasets' ? '#238636' : '#21262d',
                color: '#ffffff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Datasets
            </button>
            <button
              onClick={() => setActiveTab('debugger')}
              style={{
                backgroundColor: activeTab === 'debugger' ? '#238636' : '#21262d',
                color: '#ffffff',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Debugger
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#7d8590',
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {activeTab === 'actions' ? (
          /* Actions List */
          <div style={{
            width: '350px',
            borderRight: '1px solid #21262d',
            overflow: 'auto',
            backgroundColor: '#0d1117'
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #21262d',
              backgroundColor: '#161b22',
              fontWeight: '600',
              fontSize: '12px',
              color: '#7d8590',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Actions
            </div>
            <div>
              {actions.map((actionItem, index) => {
                const isSelected = selectedActionIndex === index
                const actionType = actionItem.action?.type || 'UNKNOWN'
                const getActionColor = (type: string) => {
                  if (type.includes('INIT')) return '#238636'
                  if (type.includes('UPDATE')) return '#0969da'
                  if (type.includes('VIEW')) return '#fd7e14'
                  if (type.includes('WEBAPI')) return '#8957e5'
                  if (type.includes('DESTROY')) return '#da3633'
                  return '#7d8590'
                }
                
                return (
                  <div
                    key={index}
                    onClick={() => setSelectedActionIndex(index)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#1f6feb' : 'transparent',
                      borderLeft: isSelected ? '3px solid #58a6ff' : '3px solid transparent',
                      borderBottom: '1px solid #21262d',
                      fontSize: '12px',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <div style={{ 
                      fontWeight: '500', 
                      color: isSelected ? '#ffffff' : '#e6edf3',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getActionColor(actionType)
                      }} />
                      {actionType}
                    </div>
                    <div style={{ 
                      color: isSelected ? '#b1bac4' : '#7d8590', 
                      fontSize: '11px' 
                    }}>
                      {new Date(actionItem.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )
              })}
              <div ref={actionsEndRef} />
            </div>
          </div>
        ) : activeTab === 'lifecycle' ? (
          /* Lifecycle Tab - Full Width */
          <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <LifecycleTriggers />
            {/* Show recent lifecycle events */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#f1f5f9',
                marginBottom: '8px'
              }}>
                Recent Lifecycle Events
              </div>
              <div style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '12px',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {currentState?.lifecycle?.events?.length > 0 ? (
                  currentState.lifecycle.events.slice(-5).reverse().map((event: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        padding: '6px 0',
                        borderBottom: index < 4 ? '1px solid #334155' : 'none',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ 
                          color: event.type === 'init' ? '#22c55e' : 
                               event.type === 'updateView' ? '#3b82f6' : '#ef4444'
                        }}>
                          {event.type === 'init' ? '🔄' : event.type === 'updateView' ? '🔁' : '🔥'} {event.type}
                        </span>
                        <span style={{ color: '#94a3b8' }}>
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    fontSize: '12px'
                  }}>
                    No lifecycle events yet. Use the buttons above to trigger events.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'datasets' ? (
          /* Datasets Tab */
          <DatasetTab connector={connector} currentState={currentState} />
        ) : (
          /* Debugger Tab - Full Width */
          <div style={{ flex: 1, height: '100%' }}>
            <AdvancedDebugger 
              context={currentState?.context} 
              componentId="pcf-harness-component"
            />
          </div>
        )}

        {/* State Inspector - Only show for actions and datasets tabs */}
        {activeTab !== 'debugger' && activeTab !== 'lifecycle' && (
          <div style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#0d1117'
          }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #21262d',
            backgroundColor: '#161b22',
            fontWeight: '600',
            fontSize: '12px',
            color: '#7d8590',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{selectedActionIndex !== null ? 'Action State' : 'Current State'}</span>
            {selectedActionIndex !== null && (
              <button
                onClick={() => setSelectedActionIndex(null)}
                style={{
                  background: '#21262d',
                  border: '1px solid #30363d',
                  color: '#e6edf3',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: '500'
                }}
              >
                Current State
              </button>
            )}
          </div>
          <div style={{ padding: '16px' }}>
            <pre style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontSize: '12px',
              lineHeight: '1.6',
              fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
              color: '#e6edf3',
              backgroundColor: '#0d1117'
            }}>
              {JSON.stringify(
                selectedActionIndex !== null 
                  ? actions[selectedActionIndex]?.state || {}
                  : currentState || {},
                null,
                2
              )}
            </pre>
          </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#161b22',
        padding: '8px 16px',
        borderTop: '1px solid #21262d',
        fontSize: '11px',
        color: '#7d8590',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}>
        <span>PCF Component DevTools</span>
      </div>
    </div>
  )
}

// Datasets Tab Component
const DatasetTab: React.FC<{ 
  connector: PCFDevToolsConnector; 
  currentState: any 
}> = ({ connector, currentState }) => {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [injectionStatus, setInjectionStatus] = useState<{ [key: string]: any }>({})

  // Use the proper dataset analyzer to detect datasets
  const datasetAnalysis = currentState?.context 
    ? detectDatasetParameters(currentState.context)
    : { datasets: [], totalRecords: 0, summary: 'No context available' }
  
  const datasets = datasetAnalysis.datasets.map(ds => ({
    key: ds.name,
    dataset: {
      ...ds,
      type: 'DataSet' // For backward compatibility with the UI
    }
  }))

  console.log(`🔍 DevTools: Dataset analysis result:`, {
    totalDatasets: datasets.length,
    totalRecords: datasetAnalysis.totalRecords,
    summary: datasetAnalysis.summary,
    primaryDataset: datasetAnalysis.primaryDataset?.name
  })

  const handleInjectRecords = async (datasetKey: string) => {
    setInjectionStatus(prev => ({ ...prev, [datasetKey]: { loading: true } }))
    
    try {
      // Dynamic import to avoid circular dependencies
      const { usePCFDatasets } = await import('./PCFDevToolsProvider')
      
      // Mock a context with the dataset parameter for injection
      const mockContext = {
        parameters: {
          [datasetKey]: {
            getViewId: () => currentState?.context?.parameters?.[datasetKey]?.viewId || 'default-view-id'
          }
        }
      }
      
      // This is a simplified version - in real usage, you'd have access to the actual context
      console.log('Would inject records for dataset:', datasetKey)
      
      setInjectionStatus(prev => ({ 
        ...prev, 
        [datasetKey]: { 
          success: true, 
          message: 'Records injection simulated - check console for details',
          timestamp: new Date().toLocaleTimeString()
        } 
      }))
    } catch (error) {
      setInjectionStatus(prev => ({ 
        ...prev, 
        [datasetKey]: { 
          error: true, 
          message: String(error),
          timestamp: new Date().toLocaleTimeString()
        } 
      }))
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Dataset List */}
      <div style={{
        width: '350px',
        borderRight: '1px solid #21262d',
        overflow: 'auto',
        backgroundColor: '#0d1117'
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #21262d',
          backgroundColor: '#161b22',
          fontWeight: '600',
          fontSize: '12px',
          color: '#7d8590',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Dataset Parameters ({datasets.length})
          {datasetAnalysis.primaryDataset && (
            <div style={{
              fontSize: '10px',
              fontWeight: 'normal',
              color: '#58a6ff',
              textTransform: 'none',
              marginTop: '4px'
            }}>
              Primary: {datasetAnalysis.primaryDataset.name}
            </div>
          )}
        </div>
        
        {datasets.length === 0 ? (
          <div style={{
            padding: '16px',
            color: '#7d8590',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            {datasetAnalysis.summary}
          </div>
        ) : (
          <div>
            {datasets.map(({ key, dataset }: { key: string, dataset: any }) => {
              const isSelected = selectedDataset === key
              const status = injectionStatus[key]
              
              return (
                <div
                  key={key}
                  onClick={() => setSelectedDataset(key)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#1f6feb' : 'transparent',
                    borderLeft: isSelected ? '3px solid #58a6ff' : '3px solid transparent',
                    borderBottom: '1px solid #21262d',
                    fontSize: '12px',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div style={{ 
                      fontWeight: '500', 
                      color: isSelected ? '#ffffff' : '#e6edf3',
                      fontSize: '13px'
                    }}>
                      {key}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: dataset.hasData ? '#238636' : '#da3633',
                      color: '#ffffff'
                    }}>
                      {dataset.recordCount || 0} records
                    </div>
                  </div>
                  
                  <div style={{
                    color: isSelected ? '#b1bac4' : '#7d8590', 
                    fontSize: '11px',
                    marginBottom: '8px'
                  }}>
                    <div>Columns: {dataset.columnCount || 0}</div>
                    {dataset.entityLogicalName && (
                      <div>Entity: {dataset.entityLogicalName}</div>
                    )}
                    {dataset.viewId && (
                      <div>View: {dataset.viewId.substring(0, 8)}...</div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleInjectRecords(key)
                    }}
                    disabled={status?.loading}
                    style={{
                      fontSize: '10px',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      border: 'none',
                      backgroundColor: status?.loading ? '#7d8590' : '#238636',
                      color: '#ffffff',
                      cursor: status?.loading ? 'not-allowed' : 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {status?.loading ? 'Injecting...' : '💉 Inject Records'}
                  </button>

                  {status && !status.loading && (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '10px',
                      color: status.error ? '#ff7b72' : status.success ? '#7ee787' : '#7d8590'
                    }}>
                      {status.message} ({status.timestamp})
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dataset Details */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#0d1117'
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #21262d',
          backgroundColor: '#161b22',
          fontWeight: '600',
          fontSize: '12px',
          color: '#7d8590',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {selectedDataset ? `Dataset: ${selectedDataset}` : 'Dataset Analysis'}
          <div style={{
            fontSize: '10px',
            fontWeight: 'normal',
            color: '#7d8590',
            textTransform: 'none',
            marginTop: '4px'
          }}>
            {datasetAnalysis.summary}
          </div>
        </div>
        
        <div style={{ padding: '16px' }}>
          {selectedDataset ? (
            <pre style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              fontSize: '12px',
              lineHeight: '1.6',
              fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
              color: '#e6edf3',
              backgroundColor: '#0d1117'
            }}>
              {JSON.stringify(
                datasets.find((d: { key: string, dataset: any }) => d.key === selectedDataset)?.dataset || {},
                null,
                2
              )}
            </pre>
          ) : (
            <div style={{
              color: '#7d8590',
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              Select a dataset parameter from the list to view its details and inject test records.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}