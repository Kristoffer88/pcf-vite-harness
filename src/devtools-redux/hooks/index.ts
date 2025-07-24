/**
 * DevTools Hooks Exports
 * Custom React hooks for encapsulating business logic
 */

export { useDatasetOperations } from './useDatasetOperations'
export { useLifecycleTracking } from './useLifecycleTracking'
export { useErrorHandling } from './useErrorHandling'

// Re-export existing hooks for compatibility
export { lifecycleHooks } from './LifecycleHooks'
export { useStableEntityDetection } from './useStableEntityDetection'

// Re-export types
export type {
  UseDatasetOperationsOptions,
  DatasetOperationsState,
} from './useDatasetOperations'

export type {
  LifecycleEvent,
  LifecycleStats,
  LifecycleState,
  LifecycleHookCallback,
  UseLifecycleTrackingOptions,
} from './useLifecycleTracking'

export type {
  ErrorState,
  UseErrorHandlingOptions,
} from './useErrorHandling'