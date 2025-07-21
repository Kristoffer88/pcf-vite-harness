// PCF Devtools Context - Adapted from TanStack Query DevTools architecture
// Provides state management for PCF devtools without QueryClient dependencies

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { WebApiRequest, PCFContextUpdate } from '../utils'
import type { PCFDevtoolsTab } from '../constants'
import type { PCFManifest } from '../utils/pcfDiscovery'
import type { DatasetDiscoveryState, EnhancementResult } from '../utils/contextEnhancer'
import { 
  createDatasetDiscoveryState, 
  updateDatasetDiscoveryState,
  enhanceDatasetContext,
  triggerEnhancedUpdateView
} from '../utils/contextEnhancer'

interface PCFDevtoolsState {
  // UI State
  isOpen: boolean
  activeTab: PCFDevtoolsTab
  theme: 'light' | 'dark' | 'system'
  
  // Data State
  webApiRequests: WebApiRequest[]
  contextUpdates: PCFContextUpdate[]
  
  // Current PCF Context
  currentContext?: ComponentFramework.Context<any>
  
  // PCF Component Instance Management
  pcfComponentRef?: React.RefObject<ComponentFramework.StandardControl<any, any> | null>
  pcfContainerRef?: React.RefObject<HTMLDivElement | null>
  pcfClass?: new () => ComponentFramework.StandardControl<any, any>
  
  // Dataset Discovery State
  datasetDiscovery: DatasetDiscoveryState
  lastEnhancementResult?: EnhancementResult
}

interface PCFDevtoolsActions {
  // UI Actions
  setIsOpen: (open: boolean) => void
  setActiveTab: (tab: PCFDevtoolsTab) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  
  // Data Actions
  addWebApiRequest: (request: WebApiRequest) => void
  updateWebApiRequest: (id: string, updates: Partial<WebApiRequest>) => void
  clearWebApiRequests: () => void
  
  addContextUpdate: (update: PCFContextUpdate) => void
  clearContextUpdates: () => void
  
  // Context Actions
  setCurrentContext: (context: ComponentFramework.Context<any>) => void
  
  // PCF Component Lifecycle Actions
  setPCFRefs: (componentRef: React.RefObject<ComponentFramework.StandardControl<any, any> | null>, containerRef: React.RefObject<HTMLDivElement | null>, pcfClass: new () => ComponentFramework.StandardControl<any, any>) => void
  triggerInit: () => void
  triggerUpdate: () => void
  triggerDestroyInit: () => void
  
  // Dataset Discovery Actions
  discoverPCFControls: (manifest: PCFManifest) => Promise<void>
  enhanceDatasets: (manifest: PCFManifest) => Promise<void>
  triggerEnhancedUpdate: () => Promise<void>
  clearDatasetDiscovery: () => void
}

type PCFDevtoolsContextType = PCFDevtoolsState & PCFDevtoolsActions

const PCFDevtoolsContext = createContext<PCFDevtoolsContextType | null>(null)

interface PCFDevtoolsProviderProps {
  children: ReactNode
  initialOpen?: boolean
  initialTheme?: 'light' | 'dark' | 'system'
}

export const PCFDevtoolsProvider: React.FC<PCFDevtoolsProviderProps> = ({
  children,
  initialOpen = false,
  initialTheme = 'system',
}) => {
  // UI State
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [activeTab, setActiveTab] = useState<PCFDevtoolsTab>('lifecycle')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(initialTheme)
  
  // Data State
  const [webApiRequests, setWebApiRequests] = useState<WebApiRequest[]>([])
  const [contextUpdates, setContextUpdates] = useState<PCFContextUpdate[]>([])
  const [currentContext, setCurrentContext] = useState<ComponentFramework.Context<any>>()
  
  // PCF Component Instance State
  const [pcfComponentRef, setPCFComponentRef] = useState<React.RefObject<ComponentFramework.StandardControl<any, any> | null>>()
  const [pcfContainerRef, setPCFContainerRef] = useState<React.RefObject<HTMLDivElement | null>>()
  const [pcfClass, setPCFClass] = useState<new () => ComponentFramework.StandardControl<any, any>>()
  
  // Dataset Discovery State
  const [datasetDiscovery, setDatasetDiscovery] = useState<DatasetDiscoveryState>(createDatasetDiscoveryState())
  const [lastEnhancementResult, setLastEnhancementResult] = useState<EnhancementResult>()
  
  // Actions
  const addWebApiRequest = useCallback((request: WebApiRequest) => {
    setWebApiRequests(prev => [request, ...prev])
  }, [])
  
  const updateWebApiRequest = useCallback((id: string, updates: Partial<WebApiRequest>) => {
    setWebApiRequests(prev => prev.map(req => 
      req.id === id ? { ...req, ...updates } : req
    ))
  }, [])
  
  const clearWebApiRequests = useCallback(() => {
    setWebApiRequests([])
  }, [])
  
  const addContextUpdate = useCallback((update: PCFContextUpdate) => {
    setContextUpdates(prev => [update, ...prev])
  }, [])
  
  const clearContextUpdates = useCallback(() => {
    setContextUpdates([])
  }, [])
  
  // PCF Component Lifecycle Actions
  const setPCFRefs = useCallback((
    componentRef: React.RefObject<ComponentFramework.StandardControl<any, any> | null>,
    containerRef: React.RefObject<HTMLDivElement | null>,
    pcfClassConstructor: new () => ComponentFramework.StandardControl<any, any>
  ) => {
    setPCFComponentRef(componentRef)
    setPCFContainerRef(containerRef)
    setPCFClass(() => pcfClassConstructor)
  }, [])
  
  const triggerInit = useCallback(() => {
    if (!pcfComponentRef || !pcfContainerRef?.current || !pcfClass || !currentContext) {
      console.warn('Cannot trigger init: missing component refs, class, or context')
      return
    }
    
    try {
      // Destroy existing instance if it exists
      if (pcfComponentRef.current) {
        pcfComponentRef.current.destroy()
      }
      
      // Clear the container to prevent duplication
      if (pcfContainerRef.current) {
        pcfContainerRef.current.innerHTML = ''
      }
      
      // Create new instance and initialize
      pcfComponentRef.current = new pcfClass()
      pcfComponentRef.current.init(
        currentContext,
        () => console.log('PCF notifyOutputChanged called'),
        {},
        pcfContainerRef.current
      )
      pcfComponentRef.current.updateView(currentContext)
      
      console.log('✅ PCF Component init() triggered successfully')
      
      // Log lifecycle event
      addContextUpdate({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        property: 'lifecycle:init',
        oldValue: undefined,
        newValue: 'Component initialized'
      })
    } catch (error) {
      console.error('❌ Failed to trigger init:', error)
    }
  }, [pcfComponentRef, pcfContainerRef, pcfClass, currentContext, addContextUpdate])
  
  const triggerUpdate = useCallback(() => {
    if (!pcfComponentRef?.current || !currentContext) {
      console.warn('Cannot trigger update: missing component or context')
      return
    }
    
    try {
      pcfComponentRef.current.updateView(currentContext)
      console.log('✅ PCF Component updateView() triggered successfully')
      
      // Log lifecycle event
      addContextUpdate({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        property: 'lifecycle:updateView',
        oldValue: undefined,
        newValue: 'Component updated'
      })
    } catch (error) {
      console.error('❌ Failed to trigger update:', error)
    }
  }, [pcfComponentRef, currentContext, addContextUpdate])
  
  const triggerDestroyInit = useCallback(() => {
    if (!pcfComponentRef || !pcfContainerRef?.current || !pcfClass || !currentContext) {
      console.warn('Cannot trigger destroy->init: missing component refs, class, or context')
      return
    }
    
    try {
      // First destroy
      if (pcfComponentRef.current) {
        pcfComponentRef.current.destroy()
      }
      
      // Clear the container to prevent duplication
      if (pcfContainerRef.current) {
        pcfContainerRef.current.innerHTML = ''
      }
      
      console.log('✅ PCF Component destroy() called')
      
      // Log destroy event
      addContextUpdate({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        property: 'lifecycle:destroy',
        oldValue: undefined,
        newValue: 'Component destroyed'
      })
      
      // Small delay to simulate real-world scenario
      setTimeout(() => {
        try {
          // Then re-initialize
          if (pcfContainerRef.current && pcfClass && currentContext) {
            pcfComponentRef.current = new pcfClass()
            pcfComponentRef.current.init(
              currentContext,
              () => console.log('PCF notifyOutputChanged called'),
              {},
              pcfContainerRef.current
            )
            pcfComponentRef.current.updateView(currentContext)
            
            console.log('✅ PCF Component re-initialized after destroy')
            
            // Log re-init event
            addContextUpdate({
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              property: 'lifecycle:init',
              oldValue: undefined,
              newValue: 'Component re-initialized after destroy'
            })
          }
        } catch (error) {
          console.error('❌ Failed to re-initialize after destroy:', error)
        }
      }, 100)
    } catch (error) {
      console.error('❌ Failed to trigger destroy:', error)
    }
  }, [pcfComponentRef, pcfContainerRef, pcfClass, currentContext, addContextUpdate])

  // Dataset Discovery Actions
  const discoverPCFControls = useCallback(async (manifest: PCFManifest) => {
    try {
      setDatasetDiscovery(prev => updateDatasetDiscoveryState(prev, { isDiscovering: true }))
      
      const { findPCFOnForms } = await import('../utils/pcfDiscovery')
      const discoveredForms = await findPCFOnForms(manifest)
      const controlsFound = discoveredForms.flatMap(form => form.controls)
      
      setDatasetDiscovery(prev => updateDatasetDiscoveryState(prev, {
        isDiscovering: false,
        manifest,
        discoveredForms,
        controlsFound
      }))
      
      console.log(`🔍 PCF Discovery complete: ${discoveredForms.length} forms, ${controlsFound.length} controls`)
    } catch (error) {
      console.error('❌ PCF Discovery failed:', error)
      setDatasetDiscovery(prev => updateDatasetDiscoveryState(prev, { isDiscovering: false }))
    }
  }, [])

  const enhanceDatasets = useCallback(async (manifest: PCFManifest) => {
    if (!currentContext) {
      console.warn('Cannot enhance datasets: no current context available')
      return
    }

    try {
      const result = await enhanceDatasetContext(
        currentContext,
        manifest,
        currentContext.webAPI
      )
      
      setLastEnhancementResult(result)
      
      if (result.enhancedContext) {
        setCurrentContext(result.enhancedContext)
      }
      
      // Log context update
      addContextUpdate({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        property: 'datasets:enhanced',
        oldValue: undefined,
        newValue: `Enhanced ${result.datasetsEnhanced} dataset(s)`
      })
      
      console.log(`✅ Dataset enhancement complete: ${result.datasetsEnhanced} enhanced`)
    } catch (error) {
      console.error('❌ Dataset enhancement failed:', error)
    }
  }, [currentContext, addContextUpdate])

  const triggerEnhancedUpdate = useCallback(async () => {
    if (!pcfComponentRef?.current || !currentContext) {
      console.warn('Cannot trigger enhanced update: missing component or context')
      return
    }

    try {
      const success = triggerEnhancedUpdateView(pcfComponentRef.current, currentContext)
      
      if (success) {
        addContextUpdate({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          property: 'lifecycle:enhancedUpdateView',
          oldValue: undefined,
          newValue: 'Enhanced updateView with dataset data'
        })
      }
    } catch (error) {
      console.error('❌ Failed to trigger enhanced update:', error)
    }
  }, [pcfComponentRef, currentContext, addContextUpdate])

  const clearDatasetDiscovery = useCallback(() => {
    setDatasetDiscovery(createDatasetDiscoveryState())
    setLastEnhancementResult(undefined)
  }, [])
  
  const contextValue: PCFDevtoolsContextType = {
    // State
    isOpen,
    activeTab,
    theme,
    webApiRequests,
    contextUpdates,
    currentContext,
    pcfComponentRef,
    pcfContainerRef,
    pcfClass,
    datasetDiscovery,
    lastEnhancementResult,
    
    // Actions
    setIsOpen,
    setActiveTab,
    setTheme,
    addWebApiRequest,
    updateWebApiRequest,
    clearWebApiRequests,
    addContextUpdate,
    clearContextUpdates,
    setCurrentContext,
    setPCFRefs,
    triggerInit,
    triggerUpdate,
    triggerDestroyInit,
    discoverPCFControls,
    enhanceDatasets,
    triggerEnhancedUpdate,
    clearDatasetDiscovery,
  }
  
  return (
    <PCFDevtoolsContext.Provider value={contextValue}>
      {children}
    </PCFDevtoolsContext.Provider>
  )
}

export const usePCFDevtools = () => {
  const context = useContext(PCFDevtoolsContext)
  if (!context) {
    throw new Error('usePCFDevtools must be used within a PCFDevtoolsProvider')
  }
  return context
}

// Hook for theme detection
export const useSystemTheme = () => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  return systemTheme
}