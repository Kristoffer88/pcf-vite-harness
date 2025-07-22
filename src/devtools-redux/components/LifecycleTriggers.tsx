/**
 * Simple Lifecycle Triggers Component
 * Provides buttons to trigger actual PCF lifecycle methods
 */

import React from 'react'
import { usePCFLifecycle } from '../contexts/PCFLifecycleContext'

export interface LifecycleTriggersProps {
  className?: string
}

export const LifecycleTriggers: React.FC<LifecycleTriggersProps> = ({
  className = ''
}) => {
  const { 
    triggerInit, 
    triggerUpdateView, 
    triggerDestroy, 
    triggerDestroyAndInit,
    isInitialized 
  } = usePCFLifecycle()

  const [isLoading, setIsLoading] = React.useState<string | null>(null)

  const handleInit = async () => {
    setIsLoading('init')
    try {
      await triggerInit()
    } catch (error) {
      console.error('Init failed:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleUpdateView = async () => {
    setIsLoading('update')
    try {
      await triggerUpdateView()
    } catch (error) {
      console.error('UpdateView failed:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleDestroy = async () => {
    setIsLoading('destroy')
    try {
      await triggerDestroy()
    } catch (error) {
      console.error('Destroy failed:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleDestroyAndInit = async () => {
    setIsLoading('destroyinit')
    try {
      await triggerDestroyAndInit()
    } catch (error) {
      console.error('Destroy → Init failed:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const buttonStyle = {
    padding: '8px 16px',
    margin: '4px',
    borderRadius: '4px',
    border: '1px solid #475569',
    backgroundColor: '#334155',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  }

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb'
  }

  return (
    <div className={`lifecycle-triggers ${className}`} style={{
      padding: '12px',
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '6px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#f1f5f9',
        marginBottom: '4px'
      }}>
        PCF Lifecycle Controls
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button
          onClick={handleInit}
          style={activeButtonStyle}
          disabled={isLoading !== null}
          title="Initialize the PCF component"
        >
          {isLoading === 'init' ? '⏳' : '🔄'} Run Init
        </button>

        <button
          onClick={handleUpdateView}
          style={isInitialized ? activeButtonStyle : buttonStyle}
          disabled={!isInitialized || isLoading !== null}
          title="Update the PCF component view"
        >
          {isLoading === 'update' ? '⏳' : '🔁'} Run UpdateView
        </button>

        <button
          onClick={handleDestroyAndInit}
          style={activeButtonStyle}
          disabled={isLoading !== null}
          title="Destroy and reinitialize the PCF component"
        >
          {isLoading === 'destroyinit' ? '⏳' : '🔥➡️🔄'} Destroy → Init
        </button>

        <button
          onClick={handleDestroy}
          style={isInitialized ? { ...buttonStyle, backgroundColor: '#dc2626', borderColor: '#b91c1c' } : buttonStyle}
          disabled={!isInitialized || isLoading !== null}
          title="Destroy the PCF component"
        >
          {isLoading === 'destroy' ? '⏳' : '🔥'} Run Destroy
        </button>
      </div>

      <div style={{
        fontSize: '11px',
        color: isInitialized ? '#22c55e' : '#94a3b8',
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isInitialized ? '#22c55e' : '#6b7280'
        }} />
        PCF Component {isInitialized ? 'Initialized' : 'Not Initialized'}
      </div>
    </div>
  )
}