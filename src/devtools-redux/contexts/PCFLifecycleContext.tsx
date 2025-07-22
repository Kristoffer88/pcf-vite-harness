/**
 * PCF Lifecycle Context
 * Provides access to actual PCF component lifecycle methods
 */

import type React from 'react'
import { createContext, useCallback, useContext, useRef } from 'react'

export interface PCFLifecycleContextType {
  // Component instance management
  pcfComponentRef: React.MutableRefObject<ComponentFramework.StandardControl<any, any> | null>
  containerRef: React.RefObject<HTMLDivElement>

  // Lifecycle actions
  triggerInit: () => Promise<void>
  triggerUpdateView: () => Promise<void>
  triggerDestroy: () => Promise<void>
  triggerDestroyAndInit: () => Promise<void>

  // State
  isInitialized: boolean
}

const PCFLifecycleContext = createContext<PCFLifecycleContextType | null>(null)

export interface PCFLifecycleProviderProps {
  children: React.ReactNode
  pcfClass: new () => ComponentFramework.StandardControl<any, any>
  context: ComponentFramework.Context<any>
  containerRef: React.RefObject<HTMLDivElement>
}

export const PCFLifecycleProvider: React.FC<PCFLifecycleProviderProps> = ({
  children,
  pcfClass,
  context,
  containerRef,
}) => {
  const pcfComponentRef = useRef<ComponentFramework.StandardControl<any, any> | null>(null)

  const triggerInit = useCallback(async () => {
    if (!containerRef.current) {
      console.warn('Container not available for PCF initialization')
      return
    }

    try {
      // Destroy existing instance if present
      if (pcfComponentRef.current) {
        console.log('🔄 Destroying existing PCF component before reinit')
        pcfComponentRef.current.destroy()
        pcfComponentRef.current = null
      }

      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      // Create new PCF component instance
      console.log('🔄 Initializing PCF component')
      pcfComponentRef.current = new pcfClass()

      // Initialize the component
      await pcfComponentRef.current.init(
        context,
        () => console.log('PCF notifyOutputChanged called'),
        {},
        containerRef.current
      )

      // Update view
      await pcfComponentRef.current.updateView(context)
      console.log('✅ PCF Component initialized successfully')
    } catch (error) {
      console.error('❌ PCF Init failed:', error)
      throw error
    }
  }, [pcfClass, context, containerRef])

  const triggerUpdateView = useCallback(async () => {
    if (!pcfComponentRef.current) {
      console.warn('No PCF component instance available for updateView')
      return
    }

    try {
      console.log('🔁 Calling PCF updateView')
      await pcfComponentRef.current.updateView(context)
      console.log('✅ PCF updateView completed')
    } catch (error) {
      console.error('❌ PCF updateView failed:', error)
      throw error
    }
  }, [context])

  const triggerDestroy = useCallback(async () => {
    if (!pcfComponentRef.current) {
      console.warn('No PCF component instance available for destroy')
      return
    }

    try {
      console.log('🔥 Destroying PCF component')
      pcfComponentRef.current.destroy()
      pcfComponentRef.current = null

      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      console.log('✅ PCF Component destroyed')
    } catch (error) {
      console.error('❌ PCF destroy failed:', error)
      throw error
    }
  }, [containerRef])

  const triggerDestroyAndInit = useCallback(async () => {
    console.log('🔥➡️🔄 Starting destroy and reinit cycle')

    try {
      await triggerDestroy()

      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 100))

      await triggerInit()
      console.log('✅ PCF Destroy → Init cycle completed')
    } catch (error) {
      console.error('❌ PCF Destroy → Init cycle failed:', error)
      throw error
    }
  }, [triggerDestroy, triggerInit])

  const contextValue: PCFLifecycleContextType = {
    pcfComponentRef,
    containerRef,
    triggerInit,
    triggerUpdateView,
    triggerDestroy,
    triggerDestroyAndInit,
    isInitialized: !!pcfComponentRef.current,
  }

  return (
    <PCFLifecycleContext.Provider value={contextValue}>{children}</PCFLifecycleContext.Provider>
  )
}

export const usePCFLifecycle = (): PCFLifecycleContextType => {
  const context = useContext(PCFLifecycleContext)
  if (!context) {
    throw new Error('usePCFLifecycle must be used within a PCFLifecycleProvider')
  }
  return context
}
