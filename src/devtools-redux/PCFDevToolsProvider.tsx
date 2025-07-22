/**
 * PCF DevTools Provider - Redux DevTools Integration
 * Provides PCF devtools functionality using Redux DevTools Protocol
 */

import React, { createContext, useContext, useEffect, useRef } from 'react'
import { pcfDevTools, PCFDevToolsConnector } from './PCFDevToolsConnector'

// Context for sharing devtools instance
const PCFDevToolsContext = createContext<PCFDevToolsConnector>(pcfDevTools)

export interface PCFDevToolsProviderProps {
  children: React.ReactNode
  context?: ComponentFramework.Context<any>
  manifestInfo?: {
    namespace: string
    constructor: string
    version: string
    displayName?: string
    description?: string
  }
}

export const PCFDevToolsProvider: React.FC<PCFDevToolsProviderProps> = ({
  children,
  context,
  manifestInfo
}) => {
  const prevContextRef = useRef<ComponentFramework.Context<any> | undefined>(undefined)

  // Log initial context
  useEffect(() => {
    if (context && !prevContextRef.current) {
      pcfDevTools.logInit(context)
      prevContextRef.current = context
    }
  }, [context])

  // Track context changes
  useEffect(() => {
    if (context && prevContextRef.current && prevContextRef.current !== context) {
      pcfDevTools.logContextChange(prevContextRef.current, context, 'context')
      prevContextRef.current = context
    }
  }, [context])

  return (
    <PCFDevToolsContext.Provider value={pcfDevTools}>
      {children}
      {pcfDevTools.isConnected() && (
        <ReduxDevToolsIndicator />
      )}
    </PCFDevToolsContext.Provider>
  )
}

// Small indicator that Redux DevTools is connected
const ReduxDevToolsIndicator: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(true)

  // Auto-hide after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: '#059669',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 'bold',
      zIndex: 10000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      transition: 'opacity 0.3s ease'
    }}
    onClick={() => setIsVisible(false)}
    title="Click to dismiss"
    >
      🔗 Redux DevTools Connected
    </div>
  )
}

// Hook to use PCF devtools in components
export const usePCFDevTools = () => {
  return useContext(PCFDevToolsContext)
}

// Enhanced lifecycle hooks
export const useEnhancedPCFLifecycle = (context?: ComponentFramework.Context<any>) => {
  const devtools = usePCFDevTools()
  
  return {
    // Original lifecycle methods
    triggerInit: async () => {
      if (context) {
        await devtools.logInit(context)
        console.log('🔄 PCF Init triggered via Enhanced DevTools')
      }
    },
    
    triggerUpdateView: async () => {
      if (context) {
        await devtools.logUpdateView(context)
        console.log('🔁 PCF UpdateView triggered via Enhanced DevTools')
      }
    },
    
    triggerDestroy: async () => {
      await devtools.logDestroy()
      console.log('🔥 PCF Destroy triggered via Enhanced DevTools')
    },

    // Enhanced lifecycle methods
    registerHook: (hookName: string, callback: (event: any) => void) => {
      return devtools.registerLifecycleHook(hookName, callback)
    },

    emitCustomEvent: async (name: string, data?: any, metadata?: Record<string, any>) => {
      await devtools.emitCustomLifecycleEvent(name, data, metadata)
      console.log(`📡 Custom lifecycle event emitted: ${name}`)
    },

    getLifecycleHooks: () => devtools.getLifecycleHooks(),
    clearLifecycleData: () => devtools.clearLifecycleData()
  }
}

// PCF Lifecycle hooks
export const usePCFLifecycle = (context?: ComponentFramework.Context<any>) => {
  const devtools = usePCFDevTools()
  
  return {
    triggerInit: () => {
      if (context) {
        devtools.logInit(context)
        console.log('🔄 PCF Init triggered via DevTools')
      }
    },
    
    triggerUpdateView: () => {
      if (context) {
        devtools.logUpdateView(context)
        console.log('🔁 PCF UpdateView triggered via DevTools')
      }
    },
    
    triggerDestroy: () => {
      devtools.logDestroy()
      console.log('🔥 PCF Destroy triggered via DevTools')
    }
  }
}

// WebAPI monitoring hook
export const usePCFWebAPI = () => {
  const devtools = usePCFDevTools()
  
  return {
    logRequest: (request: {
      id: string
      method: string
      url: string
      timestamp: number
      status: 'pending' | 'success' | 'error'
      duration?: number
      response?: any
      error?: string
    }) => {
      devtools.logWebApiRequest(request)
    }
  }
}

// Dataset operations hook
export const usePCFDatasets = () => {
  const devtools = usePCFDevTools()
  
  return {
    logDiscovery: (discovered: Array<{
      formId: string
      formName: string
      controls: Array<{
        namespace: string
        constructor: string
        controlId: string
      }>
    }>) => {
      devtools.logDatasetDiscovery(discovered)
    },
    
    logEnhancement: (result: {
      success: boolean
      datasetsEnhanced: number
      errors: string[]
    }) => {
      devtools.logDatasetEnhancement(result)
    },

    logRecordInjection: (datasetKey: string, injectedRecords: any[], viewInfo?: {
      viewId: string
      entityName: string
      recordCount: number
    }) => {
      devtools.logDatasetRecordInjection(datasetKey, injectedRecords, viewInfo)
    },

    // Helper function to inject records into a dataset parameter
    injectRecords: async (context: ComponentFramework.Context<any>, datasetKey: string, viewId?: string) => {
      if (!context?.parameters?.[datasetKey]) {
        console.warn(`Dataset parameter '${datasetKey}' not found in context`)
        return { success: false, error: 'Dataset parameter not found' }
      }

      const dataset = context.parameters[datasetKey] as any
      
      try {
        // If no viewId provided, try to get it from the dataset
        const targetViewId = viewId || dataset.getViewId?.()
        
        if (!targetViewId) {
          return { success: false, error: 'No view ID available for dataset' }
        }

        // Import record retrieval utilities
        const { getRecordsForView } = await import('../utils/recordRetrieval')
        const { getViewById } = await import('../utils/viewDiscovery')
        
        // Get view info and records
        const viewInfo = await getViewById(targetViewId)
        if (!viewInfo) {
          return { success: false, error: `View not found: ${targetViewId}` }
        }

        const recordResult = await getRecordsForView(targetViewId, { maxPageSize: 50 })
        
        if (!recordResult.success) {
          return { success: false, error: recordResult.error }
        }

        // Log the injection for devtools
        devtools.logDatasetRecordInjection(datasetKey, recordResult.entities, {
          viewId: targetViewId,
          entityName: viewInfo.entityName,
          recordCount: recordResult.entities.length
        })

        return { 
          success: true, 
          recordCount: recordResult.entities.length,
          viewInfo,
          records: recordResult.entities
        }
      } catch (error) {
        const errorMsg = `Failed to inject records into ${datasetKey}: ${error}`
        console.error(errorMsg)
        return { success: false, error: errorMsg }
      }
    }
  }
}