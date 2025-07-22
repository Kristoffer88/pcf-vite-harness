/**
 * State Inspector Component
 * Provides deep inspection of PCF component state and properties
 */

import React, { useState, useEffect } from 'react'

export interface InspectedState {
  id: string
  name: string
  type: 'state' | 'props' | 'context' | 'dataset'
  value: any
  path: string[]
  timestamp: number
  changes?: {
    previous: any
    current: any
    changedAt: number
  }[]
}

export interface StateInspectorProps {
  states: InspectedState[]
  onStateSelect?: (stateId: string) => void
  onStateUpdate?: (stateId: string, newValue: any) => void
  className?: string
}

export const StateInspector: React.FC<StateInspectorProps> = ({
  states,
  onStateSelect,
  onStateUpdate,
  className = ''
}) => {
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<'all' | 'state' | 'props' | 'context' | 'dataset'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const selectedState = states.find(s => s.id === selectedStateId)
  
  // Filter states based on type and search
  const filteredStates = states.filter(state => {
    const matchesType = filterType === 'all' || state.type === filterType
    const matchesSearch = searchTerm === '' || 
      state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      state.path.join('.').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
  })

  const handleStateSelect = (stateId: string) => {
    setSelectedStateId(stateId)
    onStateSelect?.(stateId)
  }

  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedPaths(newExpanded)
  }

  const renderValue = (value: any, depth: number = 0, keyPath: string[] = []): React.ReactNode => {
    if (value === null) return <span style={{ color: '#6b7280', fontStyle: 'italic' }}>null</span>
    if (value === undefined) return <span style={{ color: '#6b7280', fontStyle: 'italic' }}>undefined</span>
    
    const currentPath = keyPath.join('.')
    const isExpanded = expandedPaths.has(currentPath)
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return <span style={{ color: '#7c3aed' }}>[]</span>
        }
        
        return (
          <div style={{ marginLeft: depth > 0 ? '16px' : '0' }}>
            <button
              onClick={() => togglePath(currentPath)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7c3aed',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '12px'
              }}
            >
              {isExpanded ? '▼' : '▶'} Array[{value.length}]
            </button>
            {isExpanded && (
              <div style={{ marginLeft: '12px', borderLeft: '1px solid #374151', paddingLeft: '8px' }}>
                {value.slice(0, 100).map((item, index) => (
                  <div key={index} style={{ margin: '4px 0', fontSize: '12px' }}>
                    <span style={{ color: '#9ca3af' }}>[{index}]: </span>
                    {renderValue(item, depth + 1, [...keyPath, index.toString()])}
                  </div>
                ))}
                {value.length > 100 && (
                  <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '12px' }}>
                    ... and {value.length - 100} more items
                  </div>
                )}
              </div>
            )}
          </div>
        )
      } else {
        const entries = Object.entries(value)
        if (entries.length === 0) {
          return <span style={{ color: '#7c3aed' }}>{'{}'}</span>
        }
        
        return (
          <div style={{ marginLeft: depth > 0 ? '16px' : '0' }}>
            <button
              onClick={() => togglePath(currentPath)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7c3aed',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: '12px'
              }}
            >
              {isExpanded ? '▼' : '▶'} Object ({entries.length})
            </button>
            {isExpanded && (
              <div style={{ marginLeft: '12px', borderLeft: '1px solid #374151', paddingLeft: '8px' }}>
                {entries.slice(0, 50).map(([key, val]) => (
                  <div key={key} style={{ margin: '4px 0', fontSize: '12px' }}>
                    <span style={{ color: '#10b981', fontWeight: '500' }}>{key}: </span>
                    {renderValue(val, depth + 1, [...keyPath, key])}
                  </div>
                ))}
                {entries.length > 50 && (
                  <div style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '12px' }}>
                    ... and {entries.length - 50} more properties
                  </div>
                )}
              </div>
            )}
          </div>
        )
      }
    }
    
    // Primitive values
    if (typeof value === 'string') {
      const truncated = value.length > 100 ? value.substring(0, 100) + '...' : value
      return <span style={{ color: '#059669' }}>"{truncated}"</span>
    }
    if (typeof value === 'number') {
      return <span style={{ color: '#dc2626' }}>{value}</span>
    }
    if (typeof value === 'boolean') {
      return <span style={{ color: '#7c3aed' }}>{String(value)}</span>
    }
    if (typeof value === 'function') {
      return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>[Function]</span>
    }
    
    return <span style={{ color: '#6b7280' }}>{String(value)}</span>
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'state': return '#10b981'
      case 'props': return '#3b82f6' 
      case 'context': return '#f59e0b'
      case 'dataset': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  return (
    <div className={`state-inspector ${className}`} style={{
      display: 'flex',
      height: '100%',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
      fontSize: '13px'
    }}>
      {/* States List */}
      <div style={{
        width: '320px',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header with filters */}
        <div style={{
          padding: '12px',
          borderBottom: '1px solid #334155',
          backgroundColor: '#1e293b'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Search states..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#334155',
                border: '1px solid #475569',
                borderRadius: '4px',
                color: '#e2e8f0',
                fontSize: '12px'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['all', 'state', 'props', 'context', 'dataset'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  borderRadius: '3px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterType === type ? '#3b82f6' : '#475569',
                  color: '#ffffff'
                }}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* States list */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filteredStates.map(state => (
            <div
              key={state.id}
              onClick={() => handleStateSelect(state.id)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #334155',
                backgroundColor: selectedStateId === state.id ? '#1e40af' : 'transparent',
                borderLeft: selectedStateId === state.id ? '3px solid #3b82f6' : '3px solid transparent'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <div style={{ fontWeight: '500', color: '#f1f5f9' }}>
                  {state.name}
                </div>
                <div style={{
                  fontSize: '10px',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  backgroundColor: getTypeColor(state.type),
                  color: '#ffffff'
                }}>
                  {state.type.toUpperCase()}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {state.path.join(' › ')}
              </div>
              {state.changes && state.changes.length > 0 && (
                <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>
                  {state.changes.length} change{state.changes.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* State Details */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedState ? (
          <>
            {/* Header */}
            <div style={{
              padding: '12px',
              borderBottom: '1px solid #334155',
              backgroundColor: '#1e293b'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9' }}>
                    {selectedState.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {selectedState.path.join(' › ')}
                  </div>
                </div>
                <div style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: getTypeColor(selectedState.type),
                  color: '#ffffff'
                }}>
                  {selectedState.type.toUpperCase()}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Last updated: {new Date(selectedState.timestamp).toLocaleString()}
              </div>
            </div>

            {/* Value display */}
            <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#f1f5f9' }}>
                  Current Value:
                </div>
                <div style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '12px',
                  maxHeight: '300px',
                  overflow: 'auto'
                }}>
                  {renderValue(selectedState.value)}
                </div>
              </div>

              {/* Change history */}
              {selectedState.changes && selectedState.changes.length > 0 && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#f1f5f9' }}>
                    Change History:
                  </div>
                  <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                    {selectedState.changes.slice(-10).reverse().map((change, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          padding: '8px',
                          marginBottom: '8px'
                        }}
                      >
                        <div style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          marginBottom: '4px'
                        }}>
                          {new Date(change.changedAt).toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#ef4444', marginBottom: '4px' }}>Previous:</div>
                            {renderValue(change.previous)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#22c55e', marginBottom: '4px' }}>Current:</div>
                            {renderValue(change.current)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: '14px'
          }}>
            Select a state to inspect its details
          </div>
        )}
      </div>
    </div>
  )
}