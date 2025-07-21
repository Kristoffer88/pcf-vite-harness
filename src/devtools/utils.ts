// Adapted from TanStack Query DevTools utils.tsx
// Original: https://github.com/TanStack/query/blob/main/packages/query-devtools/src/utils.tsx

import { type WebApiMethod, webApiStatusColors } from './constants'

// PCF-specific types
export interface WebApiRequest {
  id: string
  method: WebApiMethod
  url: string
  timestamp: number
  status: 'pending' | 'success' | 'error'
  duration?: number
  response?: any
  error?: string
  entityLogicalName?: string
}

export interface PCFContextUpdate {
  id: string
  timestamp: number
  property: string
  oldValue?: any
  newValue?: any
}

// Utility functions
export const getWebApiStatusColor = (status: WebApiRequest['status']): string => {
  return webApiStatusColors[status]
}

export const getWebApiStatusLabel = (status: WebApiRequest['status']): string => {
  switch (status) {
    case 'pending':
      return 'Loading...'
    case 'success':
      return 'Success'
    case 'error':
      return 'Error'
    default:
      return 'Unknown'
  }
}

export const formatDuration = (ms?: number): string => {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString()
}

export const truncateUrl = (url: string, maxLength: number = 50): string => {
  if (url.length <= maxLength) return url
  return `${url.substring(0, maxLength)}...`
}

// Data manipulation utilities adapted from TanStack
export const updateNestedProperty = (
  obj: any,
  path: (string | number)[],
  updater: (value: any) => any
): any => {
  if (path.length === 0) {
    return updater(obj)
  }

  const [key, ...restPath] = path

  if (Array.isArray(obj)) {
    const newArray = [...obj]
    newArray[key as number] = updateNestedProperty(newArray[key as number], restPath, updater)
    return newArray
  }

  if (obj && typeof obj === 'object') {
    return {
      ...obj,
      [key as string]: updateNestedProperty(obj[key as string], restPath, updater),
    }
  }

  return obj
}

export const deleteNestedProperty = (obj: any, path: (string | number)[]): any => {
  if (path.length === 0) {
    return undefined
  }

  if (path.length === 1) {
    const [key] = path
    if (Array.isArray(obj)) {
      const newArray = [...obj]
      newArray.splice(key as number, 1)
      return newArray
    }

    if (obj && typeof obj === 'object') {
      const { [key as string]: _, ...rest } = obj
      return rest
    }

    return obj
  }

  const [key, ...restPath] = path

  if (Array.isArray(obj)) {
    const newArray = [...obj]
    newArray[key as number] = deleteNestedProperty(newArray[key as number], restPath)
    return newArray
  }

  if (obj && typeof obj === 'object') {
    return {
      ...obj,
      [key as string]: deleteNestedProperty(obj[key as string], restPath),
    }
  }

  return obj
}

export const getDataType = (value: any): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  if (value instanceof Date) return 'date'
  if (value instanceof Map) return 'map'
  if (value instanceof Set) return 'set'
  return typeof value
}

export const isExpandable = (value: any): boolean => {
  const type = getDataType(value)
  return ['object', 'array', 'map', 'set'].includes(type) && value !== null
}

export const copyToClipboard = (text: string): void => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(console.error)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
    document.body.removeChild(textArea)
  }
}

export const sortWebApiRequests = (requests: WebApiRequest[], sortBy: string): WebApiRequest[] => {
  const sorted = [...requests]

  switch (sortBy) {
    case 'Status > Last Updated':
      return sorted.sort((a, b) => {
        if (a.status !== b.status) {
          const statusOrder = { pending: 0, error: 1, success: 2 }
          return statusOrder[a.status] - statusOrder[b.status]
        }
        return b.timestamp - a.timestamp
      })
    case 'Last Updated':
      return sorted.sort((a, b) => b.timestamp - a.timestamp)
    case 'Method':
      return sorted.sort((a, b) => a.method.localeCompare(b.method))
    case 'URL':
      return sorted.sort((a, b) => a.url.localeCompare(b.url))
    default:
      return sorted
  }
}
