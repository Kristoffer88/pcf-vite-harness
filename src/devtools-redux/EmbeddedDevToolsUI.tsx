/**
 * Embedded DevTools UI Component
 * Provides a simple, built-in devtools interface
 */

import React, { useState, useEffect, useRef } from 'react'
import { PCFDevToolsConnector } from './PCFDevToolsConnector'

interface EmbeddedDevToolsUIProps {
  connector: PCFDevToolsConnector
}

export const EmbeddedDevToolsUI: React.FC<EmbeddedDevToolsUIProps> = ({ connector }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [actions, setActions] = useState<any[]>([])
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null)
  const [currentState, setCurrentState] = useState<any>(null)
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              backgroundColor: '#238636',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              Fresh {actions.filter(a => a.action?.type?.includes('INIT')).length}
            </span>
            <span style={{
              backgroundColor: '#0969da',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '11px',
              fontWeight: '500'
            }}>
              Actions {actions.length}
            </span>
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
        {/* Actions List */}
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

        {/* State Inspector */}
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