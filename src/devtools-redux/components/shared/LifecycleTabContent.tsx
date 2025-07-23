/**
 * LifecycleTabContent Component
 * Content for the lifecycle tab including triggers and event history
 */

import type React from 'react'
import { memo } from 'react'
import { LifecycleTriggers } from '../LifecycleTriggers'
import {
  borderRadius,
  colors,
  commonStyles,
  spacing,
} from '../../styles/theme'

interface LifecycleTabContentProps {
  currentState: any
}

const LifecycleTabContentComponent: React.FC<LifecycleTabContentProps> = ({
  currentState,
}) => {
  return (
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
  )
}

export const LifecycleTabContent = memo(LifecycleTabContentComponent)