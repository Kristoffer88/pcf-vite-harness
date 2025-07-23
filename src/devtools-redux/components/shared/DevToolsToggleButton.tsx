/**
 * DevToolsToggleButton Component
 * Floating button to open DevTools when closed
 */

import type React from 'react'
import { memo } from 'react'
import {
  borderRadius,
  colors,
  fontSize,
  fonts,
  fontWeight,
  spacing,
  zIndex,
} from '../../styles/theme'

interface DevToolsToggleButtonProps {
  onOpen: () => void
}

const DevToolsToggleButtonComponent: React.FC<DevToolsToggleButtonProps> = ({
  onOpen,
}) => {
  return (
    <button
      onClick={onOpen}
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

export const DevToolsToggleButton = memo(DevToolsToggleButtonComponent)