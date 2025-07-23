/**
 * Embedded DevTools UI Component
 * Provides a simple, built-in devtools interface
 */

import type React from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { FluentProvider, webDarkTheme } from '@fluentui/react-components'
import { LifecycleTriggers } from './components/LifecycleTriggers'
import { UnifiedDatasetTab } from './components/UnifiedDatasetTab'
import { RelationshipsTab, type ParentEntity } from './components/RelationshipsTab'
import { ParentSearchTab } from './components/ParentSearchTab'
import { 
  DevToolsHeader, 
  DevToolsFooter, 
  LifecycleTabContent, 
  DevToolsToggleButton 
} from './components/shared'
import type { PCFDevToolsConnector } from './PCFDevToolsConnector'
import { usePCFLifecycle } from './contexts/PCFLifecycleContext'
import type { DiscoveredRelationship } from './utils/dataset'
import {
  borderRadius,
  colors,
  commonStyles,
  fontSize,
  fonts,
  fontWeight,
  spacing,
  zIndex,
} from './styles/theme'

interface EmbeddedDevToolsUIProps {
  connector: PCFDevToolsConnector
}

const EmbeddedDevToolsUIComponent: React.FC<EmbeddedDevToolsUIProps> = ({ connector }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentState, setCurrentState] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'relationships' | 'data' | 'parent'>('data')
  const { triggerUpdateView } = usePCFLifecycle()

  // Shared state between Relationships and Datasets tabs
  const [selectedParentEntity, setSelectedParentEntity] = useState<ParentEntity | null>(() => {
    try {
      const saved = localStorage.getItem('pcf-devtools-selected-parent-entity')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
          return parsed
        }
      }
    } catch (error) {
      console.warn('Failed to load selected parent entity from localStorage:', error)
    }
    return null
  })
  const [discoveredRelationships, setDiscoveredRelationships] = useState<DiscoveredRelationship[]>([])
  const [detectedParentEntityType, setDetectedParentEntityType] = useState<string | null>(null)
  const [currentEntity, setCurrentEntity] = useState<string>('unknown')
  const [targetEntity, setTargetEntity] = useState<string>('unknown')

  // Wrapper to persist parent entity to localStorage
  const handleSelectParentEntity = useCallback((entity: ParentEntity | null) => {
    setSelectedParentEntity(entity)
    try {
      if (entity) {
        localStorage.setItem('pcf-devtools-selected-parent-entity', JSON.stringify(entity))
      } else {
        localStorage.removeItem('pcf-devtools-selected-parent-entity')
      }
    } catch (error) {
      console.warn('Failed to persist selected parent entity:', error)
    }
  }, [])

  // Memoized event handlers
  const handleOpen = useCallback(() => setIsOpen(true), [])
  const handleClose = useCallback(() => setIsOpen(false), [])
  const handleTabChange = useCallback((tab: 'lifecycle' | 'relationships' | 'data' | 'parent') => setActiveTab(tab), [])

  useEffect(() => {
    // Subscribe to devtools updates
    const unsubscribe = connector.subscribe((message: any) => {
      setCurrentState(connector.getState())
    })

    // Initial load
    setCurrentState(connector.getState())

    return () => {
      // Ensure cleanup
      unsubscribe()
    }
  }, [connector])

  // Detect parent entity type from relationships or environment
  useEffect(() => {
    // First check environment variable - PAGE_TABLE is the parent entity
    const envPageTable = import.meta.env.VITE_PCF_PAGE_TABLE
    if (envPageTable) {
      setDetectedParentEntityType(envPageTable)
      console.log(`🔍 Using parent entity from VITE_PCF_PAGE_TABLE: ${envPageTable}`)
      return
    }

    // Then check discovered relationships
    if (discoveredRelationships.length > 0 && targetEntity !== 'unknown') {
      // Find relationships where target entity is the child
      const parentRelationship = discoveredRelationships.find(rel => 
        rel.childEntity === targetEntity && rel.parentEntity !== targetEntity
      )
      if (parentRelationship) {
        setDetectedParentEntityType(parentRelationship.parentEntity)
        console.log(`🔍 Detected parent entity type: ${parentRelationship.parentEntity} for ${targetEntity}`)
      }
    }
  }, [discoveredRelationships, targetEntity])

  // Update current entity based on context
  useEffect(() => {
    if (currentState?.context) {
      const contextEntity = currentState.context.page?.entityTypeName
      if (contextEntity && contextEntity !== 'unknown') {
        setCurrentEntity(contextEntity)
      }
    }
  }, [currentState])

  // Initialize target entity from environment or default
  useEffect(() => {
    const envTargetTable = import.meta.env.VITE_PCF_TARGET_TABLE
    if (envTargetTable && targetEntity === 'unknown') {
      setTargetEntity(envTargetTable)
      console.log(`🎯 Using target entity from VITE_PCF_TARGET_TABLE: ${envTargetTable}`)
    }
  }, [])

  if (!isOpen) {
    return <DevToolsToggleButton onOpen={handleOpen} />
  }

  return (
    <FluentProvider theme={webDarkTheme}>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '400px',
          backgroundColor: colors.background.primary,
          color: colors.text.primary,
          borderTop: `1px solid ${colors.border.primary}`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: zIndex.devtools,
          fontFamily: fonts.system,
          fontSize: fontSize.lg,
        }}
      >
      <DevToolsHeader 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        onClose={handleClose} 
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {activeTab === 'lifecycle' ? (
          <LifecycleTabContent currentState={currentState} />
        ) : activeTab === 'relationships' ? (
          /* Relationships Tab - Full Width */
          <div style={{ flex: 1, height: '100%' }}>
            <RelationshipsTab
              connector={connector}
              currentState={currentState}
              discoveredRelationships={discoveredRelationships}
              onRelationshipsUpdate={setDiscoveredRelationships}
              currentEntity={currentEntity}
              targetEntity={targetEntity}
            />
          </div>
        ) : activeTab === 'parent' ? (
          /* Parent Search Tab - Full Width */
          <div style={{ flex: 1, height: '100%' }}>
            <ParentSearchTab
              connector={connector}
              currentState={currentState}
              selectedParentEntity={selectedParentEntity}
              onSelectParentEntity={handleSelectParentEntity}
              detectedParentEntityType={detectedParentEntityType}
              currentEntity={currentEntity}
              targetEntity={targetEntity}
            />
          </div>
        ) : activeTab === 'data' ? (
          /* Data & Search Tab - Full Width */
          <div style={{ flex: 1, height: '100%' }}>
            <UnifiedDatasetTab 
              connector={connector} 
              currentState={currentState} 
              onUpdateView={triggerUpdateView}
              selectedParentEntity={selectedParentEntity}
              onSelectParentEntity={handleSelectParentEntity}
              discoveredRelationships={discoveredRelationships}
              onDiscoveredRelationshipsUpdate={setDiscoveredRelationships}
              detectedParentEntityType={detectedParentEntityType}
              onDetectedParentEntityTypeUpdate={setDetectedParentEntityType}
              currentEntity={currentEntity}
              onCurrentEntityUpdate={setCurrentEntity}
              targetEntity={targetEntity}
              onTargetEntityUpdate={setTargetEntity}
            />
          </div>
        ) : null}
      </div>

      <DevToolsFooter />
      </div>
    </FluentProvider>
  )
}

// Export memoized component for performance
export const EmbeddedDevToolsUI = memo(EmbeddedDevToolsUIComponent)
