/**
 * DevToolsFooter Component
 * Footer section with branding
 */

import type React from 'react'
import { memo } from 'react'
import {
  colors,
  fontSize,
  spacing,
} from '../../styles/theme'

const DevToolsFooterComponent: React.FC = () => {
  return (
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
  )
}

export const DevToolsFooter = memo(DevToolsFooterComponent)