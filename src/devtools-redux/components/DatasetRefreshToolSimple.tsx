/**
 * Simplified Dataset Refresh Tool Component
 * Temporarily replaces the complex DatasetRefreshTool while APIs stabilize
 */

import type React from 'react'
import { borderRadius, colors, commonStyles, fontSize, fontWeight, spacing } from '../styles/theme'

export interface DatasetRefreshToolProps {
  manifest?: any
  context?: ComponentFramework.Context<any>
  webAPI?: ComponentFramework.WebApi
  className?: string
  onRefreshComplete?: (result: any) => void
}

export const DatasetRefreshTool: React.FC<DatasetRefreshToolProps> = ({
  manifest,
  context,
  webAPI,
  className = '',
  onRefreshComplete,
}) => {
  return (
    <div
      className={`dataset-refresh-tool ${className}`}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.background.primary,
        color: colors.text.primary,
        padding: spacing.xl,
      }}
    >
      <div
        style={{
          ...commonStyles.text.heading,
          marginBottom: spacing.lg,
          textAlign: 'center',
        }}
      >
        Dataset Refresh Tool
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: spacing.lg,
        }}
      >
        <div
          style={{
            fontSize: fontSize.xl,
            color: colors.text.secondary,
            textAlign: 'center',
          }}
        >
          🚧 Under Development
        </div>

        <div
          style={{
            fontSize: fontSize.lg,
            color: colors.text.muted,
            textAlign: 'center',
            maxWidth: '400px',
            lineHeight: '1.5',
          }}
        >
          The Dataset Refresh Tool is being refactored to work with the new modular architecture. It
          will be available in a future version.
        </div>

        {context && (
          <div
            style={{
              backgroundColor: colors.background.secondary,
              padding: spacing.lg,
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.border.primary}`,
            }}
          >
            <div
              style={{
                fontSize: fontSize.md,
                color: colors.text.secondary,
                marginBottom: spacing.sm,
              }}
            >
              Context Available:
            </div>
            <div
              style={{
                fontSize: fontSize.sm,
                color: colors.status.success,
              }}
            >
              ✅ PCF Context detected
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
