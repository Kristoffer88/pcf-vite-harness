/**
 * PCF DevTools Redux Protocol Connector
 * Connects to Redux DevTools Extension without requiring Redux
 * Includes embedded UI fallback when browser extension is not available
 */

import { type LifecycleEvent, type LifecycleStats, lifecycleHooks } from './hooks/LifecycleHooks'
import { BackgroundDataLoader } from './utils/backgroundDataLoader'

interface PCFManifest {
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
}

interface PCFState {
  context?: ComponentFramework.Context<any>
  webAPI?: ComponentFramework.WebApi
  manifest?: PCFManifest
  webApiRequests: Array<{
    id: string
    method: string
    url: string
    timestamp: number
    status: 'pending' | 'success' | 'error'
    duration?: number
    response?: any
    error?: string
  }>
  lifecycle: {
    initialized: boolean
    lastUpdate: number
    updateCount: number
    events: Array<{
      type: 'init' | 'updateView' | 'destroy'
      timestamp: number
      context?: any
    }>
  }
  datasets: {
    discovered: Array<{
      formId: string
      formName: string
      controls: Array<{
        namespace: string
        constructor: string
        controlId: string
      }>
    }>
    enhanced: boolean
    lastEnhancement?: {
      success: boolean
      datasetsEnhanced: number
      errors: string[]
    }
  }
  lifecycleStats: LifecycleStats
  lifecycleEvents: LifecycleEvent[]
  hooks: {
    registered: Record<string, number>
  }
}

// Types for DevTools connection
interface DevToolsConnection {
  send: (action: string | { type: string }, state: any) => void
  subscribe: (listener: (message: any) => void) => () => void
  unsubscribe: () => void
  init: (state: any) => void
}

export class PCFDevToolsConnector {
  private devtools: any = null
  private listeners: Array<(message: any) => void> = []
  private state: PCFState = {
    webApiRequests: [],
    lifecycle: {
      initialized: false,
      lastUpdate: 0,
      updateCount: 0,
      events: [],
    },
    datasets: {
      discovered: [],
      enhanced: false,
    },
    lifecycleStats: {
      totalInits: 0,
      totalUpdates: 0,
      totalErrors: 0,
      lastActivity: Date.now(),
    },
    lifecycleEvents: [],
    hooks: {
      registered: {},
    },
  }

  constructor() {
    this.connect()
  }

  private connect() {
    if (typeof window === 'undefined') {
      return
    }

    // Create embedded devtools instead of relying on browser extension
    this.devtools = {
      send: (action: any, state: any) => {
        this.handleDevToolsMessage({ action, state })
      },
      init: (state: any) => {
        this.handleDevToolsMessage({ type: 'INIT', state })
      },
      subscribe: (listener: any) => {
        this.listeners.push(listener)
        return () => {
          const index = this.listeners.indexOf(listener)
          if (index > -1) {
            this.listeners.splice(index, 1)
          }
        }
      },
      unsubscribe: () => {
        this.listeners = []
      },
    }

    console.log('🔗 PCF DevTools connected with embedded UI')

    if (this.devtools) {
      // Initialize with current state
      this.devtools.init(this.state)

      // Subscribe to time-travel actions from devtools
      this.devtools.subscribe((message: any) => {
        if (message.type === 'DISPATCH') {
          switch (message.payload.type) {
            case 'JUMP_TO_ACTION':
            case 'JUMP_TO_STATE':
              // Handle time-travel debugging
              this.handleTimeTravel(message.payload)
              break
            case 'RESET':
              // Reset state
              this.resetState()
              break
            case 'COMMIT':
              // Commit current state as initial
              console.log('State committed')
              break
          }
        }
      })
    }
  }

  private handleDevToolsMessage(message: any) {
    // Notify UI components about the update
    this.notifyListeners(message)
  }

  private notifyListeners(message: any) {
    this.listeners.forEach(listener => {
      try {
        listener(message)
      } catch (error) {
        console.warn('DevTools listener error:', error)
      }
    })
  }

  private handleTimeTravel(payload: any) {
    console.log('🕐 Time travel requested:', payload)
    // In a real implementation, you would restore the PCF component to this state
    // For now, just log the action
  }

  private resetState() {
    this.state = {
      webApiRequests: [],
      lifecycle: {
        initialized: false,
        lastUpdate: 0,
        updateCount: 0,
        events: [],
      },
      datasets: {
        discovered: [],
        enhanced: false,
      },
      lifecycleStats: {
        totalInits: 0,
        totalUpdates: 0,
        totalErrors: 0,
        lastActivity: Date.now(),
      },
      lifecycleEvents: [],
      hooks: {
        registered: {},
      },
    }
    this.devtools?.init(this.state)
  }

  // PCF Lifecycle Actions
  async logInit(context: ComponentFramework.Context<any>) {
    // Execute lifecycle with hooks
    await lifecycleHooks.executeInit(context)

    const event = {
      type: 'init' as const,
      timestamp: Date.now(),
      context: this.serializeContext(context),
    }

    this.state.context = context
    this.state.webAPI = context.webAPI
    this.state.lifecycle.initialized = true
    this.state.lifecycle.events.push(event)

    // Update state with latest lifecycle data
    this.updateEnhancedState()

    this.devtools?.send(
      {
        type: 'PCF_INIT_ENHANCED',
        payload: {
          context: this.serializeContext(context),
          lifecycleStats: lifecycleHooks.getStats(),
          lifecycleEvents: lifecycleHooks.getRecentEvents(10),
        },
      },
      this.state
    )

    // Start background data loading
    BackgroundDataLoader.initialize(context, async () => {
      // First try to use the actual PCF component updateView if available
      if (this.pcfUpdateViewCallback) {
        console.log('🔄 Using actual PCF component updateView')
        await this.pcfUpdateViewCallback()
      } else {
        console.log('⚠️ PCF updateView callback not available, using lifecycle hooks')
        // Fallback to lifecycle hooks (for monitoring only)
        await lifecycleHooks.executeUpdateView(context)
      }
    }).catch(error => {
      console.error('Background data loading failed:', error)
    })
  }

  async logUpdateView(context: ComponentFramework.Context<any>) {
    // Execute lifecycle with hooks
    await lifecycleHooks.executeUpdateView(context)

    const event = {
      type: 'updateView' as const,
      timestamp: Date.now(),
      context: this.serializeContext(context),
    }

    this.state.context = context
    this.state.webAPI = context.webAPI
    this.state.lifecycle.lastUpdate = Date.now()
    this.state.lifecycle.updateCount++
    this.state.lifecycle.events.push(event)

    // Update state with latest lifecycle data
    this.updateEnhancedState()

    this.devtools?.send(
      {
        type: 'PCF_UPDATE_VIEW_ENHANCED',
        payload: {
          context: this.serializeContext(context),
          updateCount: this.state.lifecycle.updateCount,
          lifecycleStats: lifecycleHooks.getStats(),
          lifecycleEvents: lifecycleHooks.getRecentEvents(5),
        },
      },
      this.state
    )
  }

  async logDestroy() {
    // Execute lifecycle with hooks
    await lifecycleHooks.executeDestroy()

    const event = {
      type: 'destroy' as const,
      timestamp: Date.now(),
    }

    this.state.lifecycle.initialized = false
    this.state.lifecycle.events.push(event)

    // Update state with latest lifecycle data
    this.updateEnhancedState()

    this.devtools?.send(
      {
        type: 'PCF_DESTROY_ENHANCED',
        payload: {
          timestamp: Date.now(),
          lifecycleStats: lifecycleHooks.getStats(),
          lifecycleEvents: lifecycleHooks.getRecentEvents(5),
        },
      },
      this.state
    )
  }

  // WebAPI Actions
  logWebApiRequest(request: {
    id: string
    method: string
    url: string
    timestamp: number
    status: 'pending' | 'success' | 'error'
    duration?: number
    response?: any
    error?: string
  }) {
    this.state.webApiRequests.push(request)

    const actionType =
      request.status === 'pending'
        ? 'WEBAPI_REQUEST_START'
        : request.status === 'success'
          ? 'WEBAPI_REQUEST_SUCCESS'
          : 'WEBAPI_REQUEST_ERROR'

    // Check if this is a view-based request
    const isViewRequest =
      request.url.includes('savedQuery=') ||
      request.url.includes('userQuery=') ||
      request.url.includes('fetchXml=')
    const finalActionType = isViewRequest ? `VIEW_${actionType}` : actionType

    this.devtools?.send(
      {
        type: finalActionType,
        payload: {
          ...request,
          isViewRequest,
        },
      },
      this.state
    )
  }

  // View-specific Actions
  logViewDiscovery(viewInfo: {
    viewId: string
    viewName: string
    entityName: string
    isUserView: boolean
    recordCount?: number
  }) {
    this.devtools?.send(
      {
        type: 'VIEW_DISCOVERED',
        payload: viewInfo,
      },
      this.state
    )
  }

  logViewQuery(queryInfo: {
    viewId: string
    viewName?: string
    entityName: string
    fetchXml?: string
    recordCount: number
    duration: number
    success: boolean
    error?: string
  }) {
    this.devtools?.send(
      {
        type: queryInfo.success ? 'VIEW_QUERY_SUCCESS' : 'VIEW_QUERY_ERROR',
        payload: queryInfo,
      },
      this.state
    )
  }

  // Dataset Actions
  logDatasetDiscovery(discovered: PCFState['datasets']['discovered']) {
    this.state.datasets.discovered = discovered

    this.devtools?.send(
      {
        type: 'PCF_DATASETS_DISCOVERED',
        payload: { discovered, count: discovered.length },
      },
      this.state
    )
  }

  logDatasetEnhancement(result: { success: boolean; datasetsEnhanced: number; errors: string[] }) {
    this.state.datasets.enhanced = result.success
    this.state.datasets.lastEnhancement = result

    this.devtools?.send(
      {
        type: 'PCF_DATASETS_ENHANCED',
        payload: result,
      },
      this.state
    )
  }

  // Dataset Record Injection
  logDatasetRecordInjection(
    datasetKey: string,
    injectedRecords: any[],
    viewInfo?: {
      viewId: string
      entityName: string
      recordCount: number
    }
  ) {
    this.devtools?.send(
      {
        type: 'PCF_DATASET_RECORDS_INJECTED',
        payload: {
          datasetKey,
          recordCount: injectedRecords.length,
          records: injectedRecords.map(record => ({
            id: record.id || record[`${viewInfo?.entityName}id`] || 'unknown',
            fields: this.extractRecordFields(record),
          })),
          viewInfo,
        },
      },
      this.state
    )
  }

  private extractRecordFields(record: any): Record<string, any> {
    const fields: Record<string, any> = {}

    for (const [key, value] of Object.entries(record)) {
      // Skip system fields that start with @
      if (key.startsWith('@')) continue

      // Handle formatted values
      if (key.includes('@OData')) continue

      fields[key] = value
    }

    return fields
  }

  // Context Change Actions
  logContextChange(oldContext: any, newContext: ComponentFramework.Context<any>, property: string) {
    this.state.context = newContext

    this.devtools?.send(
      {
        type: 'PCF_CONTEXT_CHANGE',
        payload: {
          property,
          oldValue: this.serializeContext(oldContext),
          newValue: this.serializeContext(newContext),
        },
      },
      this.state
    )
  }

  // Helper Methods
  private serializeContext(context: ComponentFramework.Context<any>) {
    if (!context) {
      console.log('🔍 DevTools: Context is null/undefined')
      return null
    }

    try {
      console.log('🔍 DevTools: Serializing context:', {
        hasParameters: !!context.parameters,
        parameterKeys: context.parameters ? Object.keys(context.parameters) : [],
        parameters: context.parameters,
      })

      // Create a serializable version of the context
      return {
        mode: context.mode,
        parameters: this.serializeParameters(context.parameters),
        userSettings: {
          displayName: (context.userSettings as any)?.displayName,
          userName: context.userSettings?.userName,
          userId: context.userSettings?.userId,
          languageId: context.userSettings?.languageId,
          isRTL: context.userSettings?.isRTL,
          dateFormattingInfo: context.userSettings?.dateFormattingInfo,
          numberFormattingInfo: context.userSettings?.numberFormattingInfo,
        },
        client: {
          formFactor: context.client?.getFormFactor(),
          clientName: (context.client as any)?.client,
        },
        device: {
          captureAudio: context.device?.captureAudio !== undefined,
          captureImage: context.device?.captureImage !== undefined,
          captureVideo: context.device?.captureVideo !== undefined,
          getBarcodeValue: context.device?.getBarcodeValue !== undefined,
          getCurrentPosition: context.device?.getCurrentPosition !== undefined,
          pickFile: context.device?.pickFile !== undefined,
        },
      }
    } catch (error) {
      console.warn('Failed to serialize context:', error)
      return { error: 'Serialization failed', message: String(error) }
    }
  }

  private serializeParameters(parameters: any) {
    if (!parameters) return null

    const serialized: any = {}
    for (const [key, param] of Object.entries(parameters)) {
      try {
        if (param && typeof param === 'object') {
          // Handle DataSet parameters
          if ('records' in param && 'columns' in param) {
            const dataset = param as any
            const records = dataset.records || {}
            const columns = dataset.columns || []

            // Extract detailed dataset information for devtools
            serialized[key] = {
              type: 'DataSet',
              recordCount: Object.keys(records).length,
              columnCount: columns.length,
              hasData: Object.keys(records).length > 0,
              sorting: dataset.sorting,
              filtering: dataset.filtering,
              paging: dataset.paging,
              // Include actual records data for devtools inspection
              records: this.serializeDatasetRecords(records),
              columns: this.serializeDatasetColumns(columns),
              // Additional dataset metadata
              targetEntityType: dataset.getTargetEntityType?.(),
              viewId: dataset.getViewId?.(),
              isUserView: dataset.isUserView?.(),
            }
          } else {
            serialized[key] = {
              type: typeof param,
              value: String(param),
            }
          }
        } else {
          serialized[key] = {
            type: typeof param,
            value: param,
          }
        }
      } catch (error) {
        serialized[key] = {
          type: 'error',
          error: String(error),
        }
      }
    }
    return serialized
  }

  private serializeDatasetRecords(
    records: any
  ): Array<{ id: string; fields: Record<string, any> }> {
    const serializedRecords: Array<{ id: string; fields: Record<string, any> }> = []

    for (const [recordId, record] of Object.entries(records)) {
      try {
        const recordObj = record as any
        const fields: Record<string, any> = {}

        // Extract all field values from the record
        if (recordObj && typeof recordObj === 'object') {
          for (const [fieldName, fieldValue] of Object.entries(recordObj)) {
            if (typeof fieldValue === 'object' && fieldValue !== null) {
              // Handle formatted values and lookup fields
              fields[fieldName] = {
                raw: (fieldValue as any).raw,
                formatted: (fieldValue as any).formatted,
              }
            } else {
              fields[fieldName] = fieldValue
            }
          }
        }

        serializedRecords.push({
          id: recordId,
          fields,
        })
      } catch (error) {
        serializedRecords.push({
          id: recordId,
          fields: { error: String(error) },
        })
      }
    }

    return serializedRecords
  }

  private serializeDatasetColumns(
    columns: any[]
  ): Array<{ name: string; displayName: string; dataType: string; alias?: string }> {
    return columns.map(column => ({
      name: column.name || '',
      displayName: column.displayName || column.name || '',
      dataType: column.dataType || 'unknown',
      alias: column.alias,
    }))
  }

  // Public method to get current state (for embedded UI)
  getState(): PCFState {
    return { ...this.state }
  }

  // Check if DevTools is connected
  isConnected(): boolean {
    return this.devtools !== null
  }

  // Public method to subscribe to devtools updates
  subscribe(listener: (message: any) => void): () => void {
    if (this.devtools) {
      return this.devtools.subscribe(listener)
    }
    return () => {}
  }

  // Set PCF manifest information
  setManifest(manifest: PCFManifest) {
    this.state.manifest = manifest
    
    this.devtools?.send(
      {
        type: 'PCF_MANIFEST_SET',
        payload: manifest,
      },
      this.state
    )
  }

  // Set the actual PCF component updateView callback
  private pcfUpdateViewCallback?: () => Promise<void>
  
  setPCFUpdateViewCallback(callback: () => Promise<void>) {
    this.pcfUpdateViewCallback = callback
    console.log('🔄 PCF updateView callback registered with DevTools')
  }

  // Enhanced Methods
  private updateEnhancedState(): void {
    this.state.lifecycleStats = lifecycleHooks.getStats()
    this.state.lifecycleEvents = lifecycleHooks.getRecentEvents(20)
    this.state.hooks = {
      registered: lifecycleHooks.getHookStatus(),
    }
  }

  // Get lifecycle hooks manager (for external access)
  getLifecycleHooks() {
    return lifecycleHooks
  }

  // Register lifecycle hooks
  registerLifecycleHook(hookName: string, callback: (event: LifecycleEvent) => void): () => void {
    const unsubscribe = lifecycleHooks.on(hookName, callback)
    this.updateEnhancedState()

    // Send update to devtools
    this.devtools?.send(
      {
        type: 'LIFECYCLE_HOOK_REGISTERED',
        payload: {
          hookName,
          totalHooks: lifecycleHooks.getHookStatus(),
        },
      },
      this.state
    )

    return unsubscribe
  }

  // Emit custom lifecycle event
  async emitCustomLifecycleEvent(
    name: string,
    data?: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    await lifecycleHooks.emitCustomEvent({ name, data, metadata })
    this.updateEnhancedState()

    this.devtools?.send(
      {
        type: 'CUSTOM_LIFECYCLE_EVENT',
        payload: {
          eventName: name,
          data,
          metadata,
          recentEvents: lifecycleHooks.getRecentEvents(5),
        },
      },
      this.state
    )
  }

  // Clear lifecycle data
  clearLifecycleData(): void {
    lifecycleHooks.clear()
    this.updateEnhancedState()

    this.devtools?.send(
      {
        type: 'LIFECYCLE_DATA_CLEARED',
        payload: { timestamp: Date.now() },
      },
      this.state
    )
  }

  // Cleanup
  disconnect() {
    // Clear lifecycle data
    lifecycleHooks.clear()

    // Clear all listeners
    this.listeners = []

    if (this.devtools) {
      this.devtools.unsubscribe()
      this.devtools = null
    }

    // Clear state to free memory
    this.state = {
      webApiRequests: [],
      lifecycle: {
        initialized: false,
        lastUpdate: 0,
        updateCount: 0,
        events: [],
      },
      datasets: {
        discovered: [],
        enhanced: false,
      },
      lifecycleStats: {
        totalInits: 0,
        totalUpdates: 0,
        totalErrors: 0,
        lastActivity: Date.now(),
      },
      lifecycleEvents: [],
      hooks: {
        registered: {},
      },
    }

    console.log('🔌 PCF DevTools disconnected and cleaned up')
  }
}

// Global instance
export const pcfDevTools = new PCFDevToolsConnector()
