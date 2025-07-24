/**
 * useLifecycleTracking Hook
 * Custom hook for PCF lifecycle monitoring and events
 * Encapsulates lifecycle management business logic
 */

import { useState, useCallback, useEffect, useRef } from 'react'

export interface LifecycleEvent {
  id: string
  type: 'init' | 'updateView' | 'destroy' | 'custom'
  phase: 'before' | 'after' | 'error'
  timestamp: number
  duration?: number
  context?: any
  metadata?: Record<string, any>
  error?: Error
}

export interface LifecycleStats {
  totalInits: number
  totalUpdates: number
  totalErrors: number
  lastActivity: number
  averageUpdateDuration?: number
  averageInitDuration?: number
}

export interface LifecycleState {
  events: LifecycleEvent[]
  stats: LifecycleStats
  isTracking: boolean
  lastEvent?: LifecycleEvent
}

export type LifecycleHookCallback = (event: LifecycleEvent) => void | Promise<void>

export interface UseLifecycleTrackingOptions {
  maxEvents?: number
  enablePerformanceTracking?: boolean
  autoTrack?: boolean
}

export function useLifecycleTracking(options: UseLifecycleTrackingOptions = {}) {
  const {
    maxEvents = 1000,
    enablePerformanceTracking = true,
    autoTrack = true,
  } = options

  // State
  const [state, setState] = useState<LifecycleState>({
    events: [],
    stats: {
      totalInits: 0,
      totalUpdates: 0,
      totalErrors: 0,
      lastActivity: Date.now(),
    },
    isTracking: autoTrack,
  })

  // Hook callbacks storage
  const hooks = useRef<Map<string, Set<LifecycleHookCallback>>>(new Map())
  const pendingEvents = useRef<Map<string, { startTime: number; event: LifecycleEvent }>>(new Map())

  // Initialize hook categories
  useEffect(() => {
    const hookCategories = [
      'before:init',
      'after:init',
      'before:updateView',
      'after:updateView',
      'before:destroy',
      'after:destroy',
      'error',
      'custom',
    ]

    hookCategories.forEach(category => {
      if (!hooks.current.has(category)) {
        hooks.current.set(category, new Set())
      }
    })
  }, [])

  // Generate unique event ID
  const generateEventId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Calculate performance metrics
  const calculateMetrics = useCallback((events: LifecycleEvent[]) => {
    const initEvents = events.filter(e => e.type === 'init' && e.duration)
    const updateEvents = events.filter(e => e.type === 'updateView' && e.duration)

    const averageInitDuration = initEvents.length > 0
      ? initEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / initEvents.length
      : undefined

    const averageUpdateDuration = updateEvents.length > 0
      ? updateEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / updateEvents.length
      : undefined

    return { averageInitDuration, averageUpdateDuration }
  }, [])

  // Track lifecycle event
  const trackEvent = useCallback((
    type: LifecycleEvent['type'],
    phase: LifecycleEvent['phase'],
    options: {
      context?: any
      metadata?: Record<string, any>
      error?: Error
      eventId?: string
    } = {}
  ) => {
    if (!state.isTracking) return null

    const eventId = options.eventId || generateEventId()
    const timestamp = Date.now()

    // Handle performance tracking for paired events
    let duration: number | undefined
    const pairKey = `${type}-${JSON.stringify(options.context?.parameters || {})}`

    if (phase === 'before' && enablePerformanceTracking) {
      pendingEvents.current.set(pairKey, {
        startTime: timestamp,
        event: { id: eventId, type, phase, timestamp, ...options },
      })
    } else if (phase === 'after' && enablePerformanceTracking) {
      const pending = pendingEvents.current.get(pairKey)
      if (pending) {
        duration = timestamp - pending.startTime
        pendingEvents.current.delete(pairKey)
      }
    }

    const event: LifecycleEvent = {
      id: eventId,
      type,
      phase,
      timestamp,
      duration,
      context: options.context,
      metadata: options.metadata,
      error: options.error,
    }

    setState(prev => {
      const newEvents = [...prev.events, event].slice(-maxEvents)
      const metrics = calculateMetrics(newEvents)

      const newStats: LifecycleStats = {
        ...prev.stats,
        lastActivity: timestamp,
        ...metrics,
      }

      // Update counters
      if (type === 'init' && phase === 'after') {
        newStats.totalInits++
      } else if (type === 'updateView' && phase === 'after') {
        newStats.totalUpdates++
      } else if (phase === 'error') {
        newStats.totalErrors++
      }

      return {
        ...prev,
        events: newEvents,
        stats: newStats,
        lastEvent: event,
      }
    })

    // Emit to registered hooks
    emitToHooks(`${phase}:${type}`, event)

    return event
  }, [state.isTracking, generateEventId, enablePerformanceTracking, maxEvents, calculateMetrics])

  // Emit to hook callbacks
  const emitToHooks = useCallback(async (hookName: string, event: LifecycleEvent) => {
    const callbacks = hooks.current.get(hookName)
    if (!callbacks || callbacks.size === 0) return

    for (const callback of callbacks) {
      try {
        await callback(event)
      } catch (error) {
        console.warn(`Lifecycle hook error (${hookName}):`, error)
      }
    }
  }, [])

  // Register lifecycle hook
  const on = useCallback((hookName: string, callback: LifecycleHookCallback): (() => void) => {
    if (!hooks.current.has(hookName)) {
      hooks.current.set(hookName, new Set())
    }

    hooks.current.get(hookName)!.add(callback)

    // Return unsubscribe function
    return () => {
      hooks.current.get(hookName)?.delete(callback)
    }
  }, [])

  // Register multiple hooks
  const onMultiple = useCallback((hookMap: Record<string, LifecycleHookCallback>): (() => void) => {
    const unsubscribeFunctions = Object.entries(hookMap).map(([hookName, callback]) =>
      on(hookName, callback)
    )

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub())
    }
  }, [on])

  // Convenience methods for common lifecycle events
  const trackInit = useCallback((context?: any, metadata?: Record<string, any>) => {
    const beforeEvent = trackEvent('init', 'before', { context, metadata })
    
    return {
      complete: (error?: Error) => {
        trackEvent('init', error ? 'error' : 'after', {
          context,
          metadata,
          error,
          eventId: beforeEvent?.id,
        })
      },
    }
  }, [trackEvent])

  const trackUpdateView = useCallback((context?: any, metadata?: Record<string, any>) => {
    const beforeEvent = trackEvent('updateView', 'before', { context, metadata })
    
    return {
      complete: (error?: Error) => {
        trackEvent('updateView', error ? 'error' : 'after', {
          context,
          metadata,
          error,
          eventId: beforeEvent?.id,
        })
      },
    }
  }, [trackEvent])

  const trackDestroy = useCallback((context?: any, metadata?: Record<string, any>) => {
    const beforeEvent = trackEvent('destroy', 'before', { context, metadata })
    
    return {
      complete: (error?: Error) => {
        trackEvent('destroy', error ? 'error' : 'after', {
          context,
          metadata,
          error,
          eventId: beforeEvent?.id,
        })
      },
    }
  }, [trackEvent])

  const trackCustomEvent = useCallback((
    name: string,
    data?: any,
    metadata?: Record<string, any>
  ) => {
    return trackEvent('custom', 'after', {
      context: { name, data },
      metadata,
    })
  }, [trackEvent])

  // Control tracking
  const startTracking = useCallback(() => {
    setState(prev => ({ ...prev, isTracking: true }))
  }, [])

  const stopTracking = useCallback(() => {
    setState(prev => ({ ...prev, isTracking: false }))
  }, [])

  const clearEvents = useCallback(() => {
    setState(prev => ({
      ...prev,
      events: [],
      stats: {
        totalInits: 0,
        totalUpdates: 0,
        totalErrors: 0,
        lastActivity: Date.now(),
      },
    }))
    pendingEvents.current.clear()
  }, [])

  // Get filtered events
  const getEventsByType = useCallback((type: LifecycleEvent['type']) => {
    return state.events.filter(event => event.type === type)
  }, [state.events])

  const getRecentEvents = useCallback((limit = 10) => {
    return state.events.slice(-limit)
  }, [state.events])

  const getErrorEvents = useCallback(() => {
    return state.events.filter(event => event.phase === 'error')
  }, [state.events])

  return {
    // State
    ...state,

    // Tracking methods
    trackEvent,
    trackInit,
    trackUpdateView,
    trackDestroy,
    trackCustomEvent,

    // Hook registration
    on,
    onMultiple,

    // Control
    startTracking,
    stopTracking,
    clearEvents,

    // Queries
    getEventsByType,
    getRecentEvents,
    getErrorEvents,

    // Computed
    hasEvents: state.events.length > 0,
    hasErrors: state.stats.totalErrors > 0,
    isPerformanceTrackingEnabled: enablePerformanceTracking,
  }
}