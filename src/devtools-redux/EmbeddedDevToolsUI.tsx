/**
 * Embedded DevTools UI Component
 * Provides a simple, built-in devtools interface
 */

import type React from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { LifecycleTriggers } from './components/LifecycleTriggers'
import { UnifiedDatasetTab } from './components/UnifiedDatasetTab'
import type { PCFDevToolsConnector } from './PCFDevToolsConnector'
import { usePCFLifecycle } from './contexts/PCFLifecycleContext'
import {
  borderRadius,
  colors,
  commonStyles,
  fontSize,
  fonts,
  fontWeight,
  spacing,
  zIndex,
} from './styles/theme'

interface EmbeddedDevToolsUIProps {
  connector: PCFDevToolsConnector
}

const EmbeddedDevToolsUIComponent: React.FC<EmbeddedDevToolsUIProps> = ({ connector }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentState, setCurrentState] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'datasets'>('datasets')
  const { triggerUpdateView } = usePCFLifecycle()

  // Memoized event handlers
  const handleOpen = useCallback(() => setIsOpen(true), [])
  const handleClose = useCallback(() => setIsOpen(false), [])
  const handleTabChange = useCallback((tab: 'lifecycle' | 'datasets') => setActiveTab(tab), [])

  useEffect(() => {
    // Subscribe to devtools updates
    const unsubscribe = connector.subscribe((message: any) => {
      setCurrentState(connector.getState())
    })

    // Initial load
    setCurrentState(connector.getState())

    return () => {
      // Ensure cleanup
      unsubscribe()
    }
  }, [connector])

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: colors.background.surface,
          color: colors.text.primary,
          border: `1px solid ${colors.border.secondary}`,
          borderRadius: borderRadius.lg,
          padding: `${spacing.md} ${spacing.lg}`,
          fontSize: fontSize.md,
          fontWeight: fontWeight.semibold,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: zIndex.devtools,
          fontFamily: fonts.system,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          transition: 'all 0.2s ease',
        }}
        title="Open PCF DevTools"
      >
        🔍 PCF DevTools
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '400px',
        backgroundColor: colors.background.primary,
        color: colors.text.primary,
        borderTop: `1px solid ${colors.border.primary}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: zIndex.devtools,
        fontFamily: fonts.system,
        fontSize: fontSize.lg,
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: colors.background.secondary,
          padding: `${spacing.lg} ${spacing.xl}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${colors.border.primary}`,
          fontSize: fontSize.xl,
          fontWeight: fontWeight.semibold,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
          <span style={{ color: colors.status.accent }}>🔍 PCF DEVTOOLS</span>
          <div style={{ display: 'flex', gap: spacing.xs }}>
            <button
              onClick={() => handleTabChange('lifecycle')}
              style={{
                ...commonStyles.button.tab,
                backgroundColor:
                  activeTab === 'lifecycle' ? colors.status.success : colors.background.surface,
              }}
            >
              Lifecycle
            </button>
            <button
              onClick={() => handleTabChange('datasets')}
              style={{
                ...commonStyles.button.tab,
                backgroundColor:
                  activeTab === 'datasets' ? colors.status.success : colors.background.surface,
              }}
            >
              📊 Datasets & Refresh
            </button>
          </div>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: colors.text.muted,
            cursor: 'pointer',
            fontSize: '18px',
            padding: spacing.xs,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {activeTab === 'lifecycle' ? (
          /* Lifecycle Tab - Full Width */
          <div
            style={{
              flex: 1,
              padding: spacing.xl,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.xl,
            }}
          >
            <LifecycleTriggers />
            {/* Show recent lifecycle events */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div
                style={{
                  ...commonStyles.text.heading,
                  marginBottom: spacing.md,
                }}
              >
                Recent Lifecycle Events
              </div>
              <div
                style={{
                  backgroundColor: colors.background.tertiary,
                  border: `1px solid ${colors.border.tertiary}`,
                  borderRadius: borderRadius.lg,
                  padding: spacing.lg,
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                {currentState?.lifecycle?.events?.length > 0 ? (
                  currentState.lifecycle.events
                    .slice(-5)
                    .reverse()
                    .map((event: any, index: number) => (
                      <div
                        key={index}
                        style={{
                          padding: '6px 0',
                          borderBottom: index < 4 ? '1px solid #334155' : 'none',
                          fontSize: '12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              color:
                                event.type === 'init'
                                  ? '#22c55e'
                                  : event.type === 'updateView'
                                    ? '#3b82f6'
                                    : '#ef4444',
                            }}
                          >
                            {event.type === 'init'
                              ? '🔄'
                              : event.type === 'updateView'
                                ? '🔁'
                                : '🔥'}{' '}
                            {event.type}
                          </span>
                          <span style={{ color: '#94a3b8' }}>
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div
                    style={{
                      color: '#94a3b8',
                      fontStyle: 'italic',
                      fontSize: '12px',
                    }}
                  >
                    No lifecycle events yet. Use the buttons above to trigger events.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'datasets' ? (
          /* Unified Datasets Tab - Full Width */
          <div style={{ flex: 1, height: '100%' }}>
            <UnifiedDatasetTab connector={connector} currentState={currentState} onUpdateView={triggerUpdateView} />
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: colors.background.secondary,
          padding: `${spacing.md} ${spacing.xl}`,
          borderTop: `1px solid ${colors.border.primary}`,
          fontSize: fontSize.sm,
          color: colors.text.muted,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        <span>PCF Component DevTools</span>
      </div>
    </div>
  )
}

// Export memoized component for performance
export const EmbeddedDevToolsUI = memo(EmbeddedDevToolsUIComponent)
