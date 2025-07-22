/**
 * Advanced Debugger Component
 * Combines state inspection, props tracking, and debugging tools
 */

import React, { useState, useEffect, useRef } from 'react'
import { StateInspector, InspectedState } from './StateInspector'
import { propsTracker, PropChange, PropAnalysis } from '../hooks/PropsTracker'

export interface AdvancedDebuggerProps {
  context?: ComponentFramework.Context<any>
  componentId?: string
  className?: string
}

export const AdvancedDebugger: React.FC<AdvancedDebuggerProps> = ({
  context,
  componentId = 'pcf-component',
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'states' | 'props' | 'analytics'>('states')
  const [inspectedStates, setInspectedStates] = useState<InspectedState[]>([])
  const [propChanges, setPropChanges] = useState<PropChange[]>([])
  const [propAnalytics, setPropAnalytics] = useState<PropAnalysis[]>([])
  const [isTracking, setIsTracking] = useState(true)
  const prevContextRef = useRef<ComponentFramework.Context<any> | undefined>(undefined)

  // Initialize state inspection for PCF context
  useEffect(() => {
    if (context) {
      const states: InspectedState[] = []

      // Add context as inspectable state
      states.push({
        id: 'pcf-context',
        name: 'PCF Context',
        type: 'context',
        value: context,
        path: ['context'],
        timestamp: Date.now()
      })

      // Add parameters as inspectable states
      if (context.parameters) {
        Object.entries(context.parameters).forEach(([paramName, paramValue]) => {
          states.push({
            id: `param-${paramName}`,
            name: `Parameter: ${paramName}`,
            type: 'props',
            value: paramValue,
            path: ['context', 'parameters', paramName],
            timestamp: Date.now()
          })
        })
      }

      // Track changes from previous context
      if (prevContextRef.current) {
        states.forEach(state => {
          const existingState = inspectedStates.find(s => s.id === state.id)
          if (existingState && JSON.stringify(existingState.value) !== JSON.stringify(state.value)) {
            state.changes = existingState.changes || []
            state.changes.push({
              previous: existingState.value,
              current: state.value,
              changedAt: Date.now()
            })
            
            // Track prop change
            if (isTracking) {
              propsTracker.trackPropChange(
                componentId,
                state.name,
                existingState.value,
                state.value,
                'modified'
              )
            }
          }
        })
      }

      setInspectedStates(states)
      prevContextRef.current = context
    }
  }, [context, componentId, isTracking])

  // Subscribe to prop changes
  useEffect(() => {
    if (isTracking) {
      const unsubscribe = propsTracker.subscribe(componentId, (changes) => {
        setPropChanges(prev => [...prev, ...changes].slice(-50)) // Keep last 50 changes
      })

      return unsubscribe
    }
    return () => {} // Return empty cleanup function if not tracking
  }, [componentId, isTracking])

  // Update analytics periodically
  useEffect(() => {
    const updateAnalytics = () => {
      const analytics = Array.from(propsTracker.getAllPropAnalytics().values())
      setPropAnalytics(analytics)
      return analytics
    }

    updateAnalytics()
    const interval = setInterval(updateAnalytics, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleClearData = () => {
    propsTracker.clearComponent(componentId)
    setPropChanges([])
    setPropAnalytics([])
    return true
  }

  const handleTakeSnapshot = () => {
    if (context) {
      const props: Record<string, any> = {}
      if (context.parameters) {
        Object.entries(context.parameters).forEach(([key, value]) => {
          props[key] = value
        })
      }
      const snapshot = propsTracker.takeSnapshot(componentId, props, context)
      return snapshot
    }
    return null
  }

  const renderPropsTab = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Props tracking controls */}
      <div style={{
        padding: '12px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsTracking(!isTracking)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isTracking ? '#dc2626' : '#16a34a',
              color: '#ffffff'
            }}
          >
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
          <button
            onClick={handleTakeSnapshot}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #475569',
              cursor: 'pointer',
              backgroundColor: '#334155',
              color: '#e2e8f0'
            }}
          >
            Take Snapshot
          </button>
          <button
            onClick={handleClearData}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #475569',
              cursor: 'pointer',
              backgroundColor: '#334155',
              color: '#e2e8f0'
            }}
          >
            Clear Data
          </button>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          {propChanges.length} changes tracked
        </div>
      </div>

      {/* Props changes list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {propChanges.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#94a3b8',
            fontSize: '14px'
          }}>
            No prop changes tracked yet. Interact with the component to see changes.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {propChanges.slice().reverse().map((change, index) => (
              <div
                key={change.id}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '12px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#f1f5f9'
                    }}>
                      {change.propName}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: 
                        change.changeType === 'added' ? '#16a34a' :
                        change.changeType === 'removed' ? '#dc2626' : '#f59e0b',
                      color: '#ffffff'
                    }}>
                      {change.changeType.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {new Date(change.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                  {change.changeType !== 'added' && (
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#ef4444', marginBottom: '4px', fontWeight: '500' }}>
                        Previous:
                      </div>
                      <pre style={{
                        margin: 0,
                        padding: '6px',
                        backgroundColor: '#0f172a',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#e2e8f0',
                        overflow: 'auto',
                        maxHeight: '100px'
                      }}>
                        {JSON.stringify(change.oldValue, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {change.changeType !== 'removed' && (
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#22c55e', marginBottom: '4px', fontWeight: '500' }}>
                        Current:
                      </div>
                      <pre style={{
                        margin: 0,
                        padding: '6px',
                        backgroundColor: '#0f172a',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#e2e8f0',
                        overflow: 'auto',
                        maxHeight: '100px'
                      }}>
                        {JSON.stringify(change.newValue, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderAnalyticsTab = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Summary stats */}
      <div style={{
        padding: '12px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          fontSize: '12px'
        }}>
          {(() => {
            const stats = propsTracker.getSummaryStats()
            return (
              <>
                <div>
                  <div style={{ color: '#94a3b8' }}>Total Changes</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9' }}>
                    {stats.totalChanges}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8' }}>Props Tracked</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9' }}>
                    {stats.totalProps}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8' }}>Snapshots</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9' }}>
                    {stats.totalSnapshots}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Props analytics */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {propAnalytics.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#94a3b8',
            fontSize: '14px'
          }}>
            No analytics available yet. Start tracking props to see insights.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {propAnalytics.map(analysis => (
              <div
                key={analysis.propName}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '12px'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#f1f5f9',
                      marginBottom: '4px'
                    }}>
                      {analysis.propName}
                    </div>
                    {analysis.hasPattern && (
                      <div style={{
                        fontSize: '11px',
                        color: '#f59e0b',
                        fontStyle: 'italic'
                      }}>
                        Pattern: {analysis.patternDescription}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                    <div style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: analysis.changeCount > 10 ? '#dc2626' : 
                                     analysis.changeCount > 5 ? '#f59e0b' : '#16a34a',
                      color: '#ffffff'
                    }}>
                      {analysis.changeCount} changes
                    </div>
                    {analysis.changeFrequency > 0 && (
                      <div style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff'
                      }}>
                        {analysis.changeFrequency.toFixed(1)}/min
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#94a3b8'
                }}>
                  <div>
                    <span>First seen: </span>
                    <span style={{ color: '#e2e8f0' }}>
                      {new Date(analysis.firstSeen).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <span>Last seen: </span>
                    <span style={{ color: '#e2e8f0' }}>
                      {new Date(analysis.lastSeen).toLocaleTimeString()}
                    </span>
                  </div>
                  <div>
                    <span>Unique values: </span>
                    <span style={{ color: '#e2e8f0' }}>
                      {analysis.uniqueValues.size}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`advanced-debugger ${className}`} style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace'
    }}>
      {/* Tab navigation */}
      <div style={{
        display: 'flex',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155'
      }}>
        {[
          { id: 'states', label: 'State Inspector', count: inspectedStates.length },
          { id: 'props', label: 'Props Tracker', count: propChanges.length },
          { id: 'analytics', label: 'Analytics', count: propAnalytics.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {tab.label}
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '10px',
              backgroundColor: activeTab === tab.id ? '#3b82f6' : '#475569',
              color: '#ffffff',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'states' && (
          <StateInspector
            states={inspectedStates}
            onStateSelect={(stateId) => {
              console.log('Selected state:', stateId)
            }}
          />
        )}
        {activeTab === 'props' && renderPropsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
      </div>
    </div>
  )
}