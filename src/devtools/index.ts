// PCF Devtools - Main exports
// Adapted from TanStack Query DevTools architecture

export { PCFDevtools, PCFDevtoolsPanel_Embedded } from './components/PCFDevtools'
export { PCFDevtoolsPanel } from './components/PCFDevtoolsPanel'
export { Explorer } from './components/Explorer'

export { PCFDevtoolsProvider, usePCFDevtools, useSystemTheme } from './contexts/PCFDevtoolsContext'

export { tokens, lightTheme, darkTheme, getThemeColors } from './theme'
export type { Theme } from './theme'

export {
  getWebApiStatusColor,
  getWebApiStatusLabel,
  formatDuration,
  formatTimestamp,
  truncateUrl,
  updateNestedProperty,
  deleteNestedProperty,
  getDataType,
  isExpandable,
  copyToClipboard,
  sortWebApiRequests,
} from './utils'

export type { WebApiRequest, PCFContextUpdate } from './utils'
export type { PCFDevtoolsTab, WebApiMethod } from './constants'