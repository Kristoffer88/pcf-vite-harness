// Adapted from TanStack Query DevTools constants.ts
// Original: https://github.com/TanStack/query/blob/main/packages/query-devtools/src/constants.ts

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export const defaultPosition = {
  x: 20,
  y: 20,
}

export const defaultSize = {
  width: 500,
  height: 400,
}

export const defaultThemePreference = 'system' as const

export const sortingOptions = ['Status > Last Updated', 'Query Hash', 'Last Updated'] as const

// PCF-specific constants
export const pcfDevtoolsTabs = ['overview', 'webapi', 'context', 'lifecycle', 'datasets'] as const

export type PCFDevtoolsTab = (typeof pcfDevtoolsTabs)[number]

export const webApiMethods = ['GET', 'POST', 'PATCH', 'DELETE'] as const

export type WebApiMethod = (typeof webApiMethods)[number]

export const webApiStatusColors = {
  pending: '#f59e0b', // yellow-500
  success: '#10b981', // green-500
  error: '#ef4444', // red-500
} as const
