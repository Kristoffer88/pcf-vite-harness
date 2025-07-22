/**
 * PCF DevTools Redux Protocol Connector
 * Connects to Redux DevTools Extension without requiring Redux
 * Includes embedded UI fallback when browser extension is not available
 */

// No imports needed for embedded devtools

interface PCFState {
  context?: ComponentFramework.Context<any>
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
  private actions: Array<{ action: any, state: any, timestamp: number }> = []
  private state: PCFState = {
    webApiRequests: [],
    lifecycle: {
      initialized: false,
      lastUpdate: 0,
      updateCount: 0,
      events: []
    },
    datasets: {
      discovered: [],
      enhanced: false
    }
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
      }
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
    // Store action in history
    if (message.action && message.state) {
      this.actions.push({
        action: message.action,
        state: JSON.parse(JSON.stringify(message.state)), // deep copy
        timestamp: Date.now()
      })
      
      // Keep only last 100 actions
      if (this.actions.length > 100) {
        this.actions = this.actions.slice(-100)
      }
    }
    
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
        events: []
      },
      datasets: {
        discovered: [],
        enhanced: false
      }
    }
    this.devtools?.init(this.state)
  }

  // PCF Lifecycle Actions
  logInit(context: ComponentFramework.Context<any>) {
    const event = {
      type: 'init' as const,
      timestamp: Date.now(),
      context: this.serializeContext(context)
    }

    this.state.context = context
    this.state.lifecycle.initialized = true
    this.state.lifecycle.events.push(event)

    this.devtools?.send({
      type: 'PCF_INIT',
      payload: { context: this.serializeContext(context) }
    }, this.state)
  }

  logUpdateView(context: ComponentFramework.Context<any>) {
    const event = {
      type: 'updateView' as const,
      timestamp: Date.now(),
      context: this.serializeContext(context)
    }

    this.state.context = context
    this.state.lifecycle.lastUpdate = Date.now()
    this.state.lifecycle.updateCount++
    this.state.lifecycle.events.push(event)

    this.devtools?.send({
      type: 'PCF_UPDATE_VIEW',
      payload: { 
        context: this.serializeContext(context),
        updateCount: this.state.lifecycle.updateCount
      }
    }, this.state)
  }

  logDestroy() {
    const event = {
      type: 'destroy' as const,
      timestamp: Date.now()
    }

    this.state.lifecycle.initialized = false
    this.state.lifecycle.events.push(event)

    this.devtools?.send({
      type: 'PCF_DESTROY',
      payload: { timestamp: Date.now() }
    }, this.state)
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

    const actionType = request.status === 'pending' ? 'WEBAPI_REQUEST_START' :
                      request.status === 'success' ? 'WEBAPI_REQUEST_SUCCESS' :
                      'WEBAPI_REQUEST_ERROR'

    this.devtools?.send({
      type: actionType,
      payload: request
    }, this.state)
  }

  // Dataset Actions
  logDatasetDiscovery(discovered: PCFState['datasets']['discovered']) {
    this.state.datasets.discovered = discovered

    this.devtools?.send({
      type: 'PCF_DATASETS_DISCOVERED',
      payload: { discovered, count: discovered.length }
    }, this.state)
  }

  logDatasetEnhancement(result: {
    success: boolean
    datasetsEnhanced: number
    errors: string[]
  }) {
    this.state.datasets.enhanced = result.success
    this.state.datasets.lastEnhancement = result

    this.devtools?.send({
      type: 'PCF_DATASETS_ENHANCED',
      payload: result
    }, this.state)
  }

  // Context Change Actions
  logContextChange(oldContext: any, newContext: ComponentFramework.Context<any>, property: string) {
    this.state.context = newContext

    this.devtools?.send({
      type: 'PCF_CONTEXT_CHANGE',
      payload: {
        property,
        oldValue: this.serializeContext(oldContext),
        newValue: this.serializeContext(newContext)
      }
    }, this.state)
  }

  // Helper Methods
  private serializeContext(context: ComponentFramework.Context<any>) {
    if (!context) return null

    try {
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
          numberFormattingInfo: context.userSettings?.numberFormattingInfo
        },
        client: {
          formFactor: context.client?.getFormFactor(),
          clientName: (context.client as any)?.client
        },
        device: {
          captureAudio: context.device?.captureAudio !== undefined,
          captureImage: context.device?.captureImage !== undefined,
          captureVideo: context.device?.captureVideo !== undefined,
          getBarcodeValue: context.device?.getBarcodeValue !== undefined,
          getCurrentPosition: context.device?.getCurrentPosition !== undefined,
          pickFile: context.device?.pickFile !== undefined
        }
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
            serialized[key] = {
              type: 'DataSet',
              recordCount: Object.keys((param as any).records || {}).length,
              columnCount: ((param as any).columns || []).length,
              hasData: Object.keys((param as any).records || {}).length > 0,
              sorting: (param as any).sorting,
              filtering: (param as any).filtering,
              paging: (param as any).paging
            }
          } else {
            serialized[key] = {
              type: typeof param,
              value: String(param)
            }
          }
        } else {
          serialized[key] = {
            type: typeof param,
            value: param
          }
        }
      } catch (error) {
        serialized[key] = {
          type: 'error',
          error: String(error)
        }
      }
    }
    return serialized
  }

  // Public method to get current state (for embedded UI)
  getState(): PCFState {
    return { ...this.state }
  }

  // Get actions history (for embedded UI)
  getActions(): Array<{ action: any, state: any, timestamp: number }> {
    return [...this.actions]
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

  // Cleanup
  disconnect() {
    if (this.devtools) {
      this.devtools.unsubscribe()
      this.devtools = null
    }
  }
}

// Global instance
export const pcfDevTools = new PCFDevToolsConnector()