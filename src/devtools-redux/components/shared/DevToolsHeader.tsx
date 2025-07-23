/**
 * DevToolsHeader Component
 * Header section with title, tabs, and close button
 */

import type React from 'react'
import { memo } from 'react'
import {
  borderRadius,
  colors,
  commonStyles,
  fontSize,
  fontWeight,
  spacing,
} from '../../styles/theme'

interface DevToolsHeaderProps {
  activeTab: 'lifecycle' | 'relationships' | 'data' | 'parent'
  onTabChange: (tab: 'lifecycle' | 'relationships' | 'data' | 'parent') => void
  onClose: () => void
}

const DevToolsHeaderComponent: React.FC<DevToolsHeaderProps> = ({
  activeTab,
  onTabChange,
  onClose,
}) => {
  return (
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
            onClick={() => onTabChange('lifecycle')}
            style={{
              ...commonStyles.button.tab,
              backgroundColor:
                activeTab === 'lifecycle' ? colors.status.success : colors.background.surface,
            }}
          >
            Lifecycle
          </button>
          <button
            onClick={() => onTabChange('relationships')}
            style={{
              ...commonStyles.button.tab,
              backgroundColor:
                activeTab === 'relationships' ? colors.status.success : colors.background.surface,
            }}
          >
            🔗 Relationships
          </button>
          <button
            onClick={() => onTabChange('parent')}
            style={{
              ...commonStyles.button.tab,
              backgroundColor:
                activeTab === 'parent' ? colors.status.success : colors.background.surface,
            }}
          >
            🔍 Parent Search
          </button>
          <button
            onClick={() => onTabChange('data')}
            style={{
              ...commonStyles.button.tab,
              backgroundColor:
                activeTab === 'data' ? colors.status.success : colors.background.surface,
            }}
          >
            📊 Datasets
          </button>
        </div>
      </div>
      <button
        onClick={onClose}
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
  )
}

export const DevToolsHeader = memo(DevToolsHeaderComponent)