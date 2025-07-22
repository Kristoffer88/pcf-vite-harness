/**
 * PCF DevTools Provider - Redux DevTools Integration
 * Provides PCF devtools functionality using Redux DevTools Protocol
 */

import React, { createContext, useContext, useEffect, useRef } from 'react'
import { pcfDevTools, PCFDevToolsConnector } from './PCFDevToolsConnector'
import { EmbeddedDevToolsUI } from './EmbeddedDevToolsUI'

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
        <>
          <ReduxDevToolsIndicator />
          <EmbeddedDevToolsUI connector={pcfDevTools} />
        </>
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
    }
  }
}