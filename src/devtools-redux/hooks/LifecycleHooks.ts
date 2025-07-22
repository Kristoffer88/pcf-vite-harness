/**
 * Enhanced PCF Lifecycle Hooks System
 * Provides pre/post hooks, custom events, and performance monitoring
 */

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
}

export interface LifecycleHookCallback {
  (event: LifecycleEvent): void | Promise<void>
}

export interface CustomLifecycleEvent {
  name: string
  data?: any
  metadata?: Record<string, any>
}

export class LifecycleHooksManager {
  private hooks: Map<string, Set<LifecycleHookCallback>> = new Map()
  private events: LifecycleEvent[] = []
  private stats: LifecycleStats = {
    totalInits: 0,
    totalUpdates: 0,
    totalErrors: 0,
    lastActivity: Date.now()
  }

  constructor() {
    // Initialize hook categories
    this.hooks.set('before:init', new Set())
    this.hooks.set('after:init', new Set())
    this.hooks.set('before:updateView', new Set())
    this.hooks.set('after:updateView', new Set())
    this.hooks.set('before:destroy', new Set())
    this.hooks.set('after:destroy', new Set())
    this.hooks.set('error', new Set())
    this.hooks.set('custom', new Set())
  }

  /**
   * Register a lifecycle hook
   */
  on(hookName: string, callback: LifecycleHookCallback): () => void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, new Set())
    }
    
    this.hooks.get(hookName)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.hooks.get(hookName)?.delete(callback)
    }
  }

  /**
   * Register multiple hooks at once
   */
  onMultiple(hooks: Record<string, LifecycleHookCallback>): () => void {
    const unsubscribeFunctions = Object.entries(hooks).map(([hookName, callback]) => 
      this.on(hookName, callback)
    )

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub())
    }
  }

  /**
   * Emit a lifecycle event
   */
  public async emit(hookName: string, event: LifecycleEvent): Promise<void> {
    const callbacks = this.hooks.get(hookName)
    if (!callbacks || callbacks.size === 0) return

    // Add to events history
    this.events.push(event)
    this.trimEventHistory()

    // Execute callbacks
    for (const callback of callbacks) {
      try {
        await callback(event)
      } catch (error) {
        console.warn(`Lifecycle hook error (${hookName}):`, error)
        
        // Emit error event
        const errorEvent: LifecycleEvent = {
          id: this.generateEventId(),
          type: 'custom',
          phase: 'error',
          timestamp: Date.now(),
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { originalHook: hookName, originalEvent: event.id }
        }
        
        // Emit error without await to prevent recursion
        setImmediate(() => this.emit('error', errorEvent))
      }
    }
  }

  /**
   * Execute init lifecycle with hooks
   */
  async executeInit(context: ComponentFramework.Context<any>): Promise<void> {
    const eventId = this.generateEventId()

    // Before hook
    await this.emit('before:init', {
      id: eventId,
      type: 'init',
      phase: 'before',
      timestamp: Date.now(),
      context: this.serializeContext(context)
    })

    try {
      // After hook (simulating actual init completion)
      await this.emit('after:init', {
        id: eventId,
        type: 'init',
        phase: 'after',
        timestamp: Date.now(),
        context: this.serializeContext(context)
      })

      // Update stats
      this.stats.totalInits++
      this.stats.lastActivity = Date.now()
    } catch (error) {
      const errorEvent: LifecycleEvent = {
        id: eventId,
        type: 'init',
        phase: 'error',
        timestamp: Date.now(),
        context: this.serializeContext(context),
        error: error instanceof Error ? error : new Error(String(error))
      }
      
      await this.emit('error', errorEvent)
      this.stats.totalErrors++
    }
  }

  /**
   * Execute updateView lifecycle with hooks
   */
  async executeUpdateView(context: ComponentFramework.Context<any>): Promise<void> {
    const eventId = this.generateEventId()

    // Before hook
    await this.emit('before:updateView', {
      id: eventId,
      type: 'updateView',
      phase: 'before',
      timestamp: Date.now(),
      context: this.serializeContext(context)
    })

    try {
      // After hook (simulating actual updateView completion)
      await this.emit('after:updateView', {
        id: eventId,
        type: 'updateView',
        phase: 'after',
        timestamp: Date.now(),
        context: this.serializeContext(context)
      })

      // Update stats
      this.stats.totalUpdates++
      this.stats.lastActivity = Date.now()
    } catch (error) {
      const errorEvent: LifecycleEvent = {
        id: eventId,
        type: 'updateView',
        phase: 'error',
        timestamp: Date.now(),
        context: this.serializeContext(context),
        error: error instanceof Error ? error : new Error(String(error))
      }
      
      await this.emit('error', errorEvent)
      this.stats.totalErrors++
    }
  }

  /**
   * Execute destroy lifecycle with hooks
   */
  async executeDestroy(): Promise<void> {
    const eventId = this.generateEventId()

    // Before hook
    await this.emit('before:destroy', {
      id: eventId,
      type: 'destroy',
      phase: 'before',
      timestamp: Date.now()
    })

    try {
      // After hook (simulating actual destroy completion)
      await this.emit('after:destroy', {
        id: eventId,
        type: 'destroy',
        phase: 'after',
        timestamp: Date.now()
      })

      // Update stats
      this.stats.lastActivity = Date.now()
    } catch (error) {
      const errorEvent: LifecycleEvent = {
        id: eventId,
        type: 'destroy',
        phase: 'error',
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error(String(error))
      }
      
      await this.emit('error', errorEvent)
      this.stats.totalErrors++
    }
  }

  /**
   * Emit custom lifecycle event
   */
  async emitCustomEvent(event: CustomLifecycleEvent): Promise<void> {
    const lifecycleEvent: LifecycleEvent = {
      id: this.generateEventId(),
      type: 'custom',
      phase: 'after', // Custom events are always considered completed
      timestamp: Date.now(),
      metadata: {
        customEventName: event.name,
        customEventData: event.data,
        ...event.metadata
      }
    }

    await this.emit('custom', lifecycleEvent)
  }

  /**
   * Get lifecycle statistics
   */
  getStats(): LifecycleStats {
    return { ...this.stats }
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): LifecycleEvent[] {
    return this.events.slice(-limit)
  }

  /**
   * Get events by type
   */
  getEventsByType(type: LifecycleEvent['type']): LifecycleEvent[] {
    return this.events.filter(event => event.type === type)
  }

  /**
   * Get events by phase
   */
  getEventsByPhase(phase: LifecycleEvent['phase']): LifecycleEvent[] {
    return this.events.filter(event => event.phase === phase)
  }

  /**
   * Clear all events and reset stats
   */
  clear(): void {
    this.events = []
    this.stats = {
      totalInits: 0,
      totalUpdates: 0,
      totalErrors: 0,
      lastActivity: Date.now()
    }
  }

  /**
   * Get hook registration status
   */
  getHookStatus(): Record<string, number> {
    const status: Record<string, number> = {}
    for (const [hookName, callbacks] of this.hooks) {
      status[hookName] = callbacks.size
    }
    return status
  }

  public generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  public serializeContext(context: ComponentFramework.Context<any>): any {
    // Simplified context serialization for lifecycle hooks
    try {
      return {
        mode: context.mode,
        hasParameters: !!context.parameters,
        parameterCount: context.parameters ? Object.keys(context.parameters).length : 0,
        userSettings: {
          userId: context.userSettings?.userId,
          userName: context.userSettings?.userName,
          languageId: context.userSettings?.languageId
        }
      }
    } catch (error) {
      return { error: 'Failed to serialize context', message: String(error) }
    }
  }


  public trimEventHistory(): void {
    // Keep only last 500 events to prevent memory issues
    if (this.events.length > 500) {
      this.events = this.events.slice(-500)
    }
  }

}

// Global instance
export const lifecycleHooks = new LifecycleHooksManager()

// Convenience hooks for React components
export const useLifecycleHooks = () => {
  return {
    on: lifecycleHooks.on.bind(lifecycleHooks),
    onMultiple: lifecycleHooks.onMultiple.bind(lifecycleHooks),
    emitCustomEvent: lifecycleHooks.emitCustomEvent.bind(lifecycleHooks),
    getStats: lifecycleHooks.getStats.bind(lifecycleHooks),
    getRecentEvents: lifecycleHooks.getRecentEvents.bind(lifecycleHooks),
    getEventsByType: lifecycleHooks.getEventsByType.bind(lifecycleHooks),
    getEventsByPhase: lifecycleHooks.getEventsByPhase.bind(lifecycleHooks),
    getHookStatus: lifecycleHooks.getHookStatus.bind(lifecycleHooks),
    clear: lifecycleHooks.clear.bind(lifecycleHooks)
  }
}