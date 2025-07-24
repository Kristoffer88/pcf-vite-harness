/**
 * Button Component
 * Reusable button with consistent styling and variants
 */

import type React from 'react'
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../styles/theme'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'tab'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'secondary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  className = '',
  style = {},
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.status.accent,
          color: colors.text.primary,
          border: `1px solid ${colors.status.accent}`,
        }
      case 'success':
        return {
          backgroundColor: colors.status.success,
          color: colors.text.primary,
          border: `1px solid ${colors.status.success}`,
        }
      case 'warning':
        return {
          backgroundColor: colors.status.warning,
          color: colors.text.primary,
          border: `1px solid ${colors.status.warning}`,
        }
      case 'danger':
        return {
          backgroundColor: colors.status.error,
          color: colors.text.primary,
          border: `1px solid ${colors.status.error}`,
        }
      case 'tab':
        return {
          backgroundColor: colors.background.surface,
          color: colors.text.secondary,
          border: `1px solid ${colors.border.primary}`,
          borderRadius: borderRadius.sm,
          padding: `${spacing.xs} ${spacing.sm}`,
        }
      default: // secondary
        return {
          backgroundColor: colors.background.surface,
          color: colors.text.secondary,
          border: `1px solid ${colors.border.primary}`,
        }
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: `${spacing.xs} ${spacing.sm}`,
          fontSize: fontSize.sm,
        }
      case 'large':
        return {
          padding: `${spacing.md} ${spacing.lg}`,
          fontSize: fontSize.lg,
        }
      default: // medium
        return {
          padding: `${spacing.sm} ${spacing.md}`,
          fontSize: fontSize.md,
        }
    }
  }

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: variant === 'tab' ? borderRadius.sm : borderRadius.md,
    fontWeight: fontWeight.medium,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled || loading ? 0.6 : 1,
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  }

  return (
    <button
      className={className}
      style={baseStyles}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <div
          style={{
            width: '12px',
            height: '12px',
            border: '2px solid currentColor',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : (
        icon
      )}
      {children}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}