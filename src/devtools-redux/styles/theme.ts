/**
 * Theme constants for PCF DevTools
 * Consistent styling across all components
 */

export const colors = {
  // Background colors
  background: {
    primary: '#0d1117',
    secondary: '#161b22',
    tertiary: '#1e293b',
    surface: '#21262d',
  },

  // Text colors
  text: {
    primary: '#e6edf3',
    secondary: '#b1bac4',
    muted: '#7d8590',
    disabled: '#6e7681',
  },

  // Border colors
  border: {
    primary: '#21262d',
    secondary: '#30363d',
    tertiary: '#334155',
    accent: '#58a6ff',
  },

  // Status colors
  status: {
    success: '#238636',
    warning: '#f59e0b',
    error: '#da3633',
    info: '#0969da',
    accent: '#58a6ff',
  },

  // Action colors
  action: {
    init: '#238636',
    update: '#0969da',
    view: '#fd7e14',
    webapi: '#8957e5',
    destroy: '#da3633',
    default: '#7d8590',
  },
} as const

export const spacing = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '24px',
} as const

export const fontSize = {
  xs: '10px',
  sm: '11px',
  md: '12px',
  lg: '13px',
  xl: '14px',
  xxl: '16px',
} as const

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

export const borderRadius = {
  sm: '3px',
  md: '4px',
  lg: '6px',
} as const

export const zIndex = {
  devtools: 10000,
} as const

export const fonts = {
  mono: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const

// Component-specific style helpers
export const getActionColor = (actionType: string): string => {
  if (actionType.includes('INIT')) return colors.action.init
  if (actionType.includes('UPDATE')) return colors.action.update
  if (actionType.includes('VIEW')) return colors.action.view
  if (actionType.includes('WEBAPI')) return colors.action.webapi
  if (actionType.includes('DESTROY')) return colors.action.destroy
  return colors.action.default
}

export const getStatusColor = (status: 'success' | 'error' | 'warning' | 'info'): string => {
  return colors.status[status]
}

// Common style objects
export const commonStyles = {
  button: {
    primary: {
      backgroundColor: colors.status.success,
      color: colors.text.primary,
      border: 'none',
      padding: `${spacing.sm} ${spacing.lg}`,
      borderRadius: borderRadius.sm,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      cursor: 'pointer' as const,
    },

    secondary: {
      backgroundColor: colors.background.surface,
      color: colors.text.primary,
      border: `1px solid ${colors.border.secondary}`,
      padding: `${spacing.sm} ${spacing.lg}`,
      borderRadius: borderRadius.sm,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      cursor: 'pointer' as const,
    },

    tab: {
      backgroundColor: colors.background.surface,
      color: colors.text.primary,
      border: 'none',
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: borderRadius.sm,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      cursor: 'pointer' as const,
    },
  },

  container: {
    main: {
      backgroundColor: colors.background.primary,
      color: colors.text.primary,
      fontFamily: fonts.system,
    },

    panel: {
      backgroundColor: colors.background.secondary,
      borderBottom: `1px solid ${colors.border.primary}`,
      padding: `${spacing.lg} ${spacing.xl}`,
    },

    content: {
      flex: 1,
      overflow: 'auto' as const,
      backgroundColor: colors.background.primary,
    },
  },

  text: {
    heading: {
      fontWeight: fontWeight.semibold,
      fontSize: fontSize.xl,
      color: colors.text.primary,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },

    label: {
      fontSize: fontSize.md,
      color: colors.text.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },

    code: {
      fontFamily: fonts.mono,
      fontSize: fontSize.md,
      lineHeight: '1.6',
      color: colors.text.primary,
      backgroundColor: colors.background.primary,
    },
  },
} as const
