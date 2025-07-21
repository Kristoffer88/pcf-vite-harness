// PCF Devtools Context - Adapted from TanStack Query DevTools architecture
// Provides state management for PCF devtools without QueryClient dependencies

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { WebApiRequest, PCFContextUpdate } from '../utils'
import type { PCFDevtoolsTab } from '../constants'

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
  const [activeTab, setActiveTab] = useState<PCFDevtoolsTab>('overview')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(initialTheme)
  
  // Data State
  const [webApiRequests, setWebApiRequests] = useState<WebApiRequest[]>([])
  const [contextUpdates, setContextUpdates] = useState<PCFContextUpdate[]>([])
  const [currentContext, setCurrentContext] = useState<ComponentFramework.Context<any>>()
  
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
  
  const contextValue: PCFDevtoolsContextType = {
    // State
    isOpen,
    activeTab,
    theme,
    webApiRequests,
    contextUpdates,
    currentContext,
    
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