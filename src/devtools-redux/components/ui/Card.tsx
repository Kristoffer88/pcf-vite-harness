/**
 * Card Component
 * Reusable card container with consistent styling
 */

import type React from 'react'
import { colors, spacing, borderRadius } from '../../styles/theme'

interface CardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  padding?: 'none' | 'small' | 'medium' | 'large'
  className?: string
  style?: React.CSSProperties
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  variant = 'default',
  padding = 'medium',
  className = '',
  style = {},
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          borderColor: colors.status.success,
          backgroundColor: `${colors.status.success}10`,
        }
      case 'warning':
        return {
          borderColor: colors.status.warning,
          backgroundColor: `${colors.status.warning}10`,
        }
      case 'error':
        return {
          borderColor: colors.status.error,
          backgroundColor: `${colors.status.error}10`,
        }
      case 'info':
        return {
          borderColor: colors.status.accent,
          backgroundColor: `${colors.status.accent}10`,
        }
      default:
        return {
          borderColor: colors.border.primary,
          backgroundColor: colors.background.surface,
        }
    }
  }

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return { padding: '0' }
      case 'small':
        return { padding: spacing.sm }
      case 'large':
        return { padding: spacing.xl }
      default: // medium
        return { padding: spacing.lg }
    }
  }

  const baseStyles: React.CSSProperties = {
    border: '1px solid',
    borderRadius: borderRadius.md,
    ...getVariantStyles(),
    ...getPaddingStyles(),
    ...style,
  }

  return (
    <div className={className} style={baseStyles}>
      {(title || subtitle) && (
        <div style={{ marginBottom: spacing.md }}>
          {title && (
            <h3
              style={{
                margin: 0,
                marginBottom: subtitle ? spacing.xs : 0,
                color: colors.text.primary,
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p
              style={{
                margin: 0,
                color: colors.text.muted,
                fontSize: '14px',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}