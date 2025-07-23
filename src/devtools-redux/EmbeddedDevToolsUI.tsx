/**
 * Embedded DevTools UI Component
 * Provides a simple, built-in devtools interface
 */

import type React from 'react'
import { memo, useCallback, useEffect } from 'react'
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
import { useDevToolsStore, selectDevToolsUI, selectEntityManagement, selectDevToolsActions } from './stores'
import { shallow } from 'zustand/shallow'
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
  const { triggerUpdateView } = usePCFLifecycle()
  
  // Zustand stores - using individual property access to prevent re-render loops
  const isOpen = useDevToolsStore((state) => state.isOpen)
  const activeTab = useDevToolsStore((state) => state.activeTab)
  const currentState = useDevToolsStore((state) => state.currentState)
  const selectedParentEntity = useDevToolsStore((state) => state.selectedParentEntity)
  const discoveredRelationships = useDevToolsStore((state) => state.discoveredRelationships)
  const detectedParentEntityType = useDevToolsStore((state) => state.detectedParentEntityType)
  const currentEntity = useDevToolsStore((state) => state.currentEntity)
  const targetEntity = useDevToolsStore((state) => state.targetEntity)
  const setCurrentState = useDevToolsStore((state) => state.setCurrentState)
  const setSelectedParentEntity = useDevToolsStore((state) => state.setSelectedParentEntity)
  const setDiscoveredRelationships = useDevToolsStore((state) => state.setDiscoveredRelationships)
  const setDetectedParentEntityType = useDevToolsStore((state) => state.setDetectedParentEntityType)
  const setCurrentEntity = useDevToolsStore((state) => state.setCurrentEntity)
  const setTargetEntity = useDevToolsStore((state) => state.setTargetEntity)
  const openDevTools = useDevToolsStore((state) => state.openDevTools)
  const closeDevTools = useDevToolsStore((state) => state.closeDevTools)
  const setActiveTab = useDevToolsStore((state) => state.setActiveTab)

  // Memoized event handlers
  const handleOpen = useCallback(() => openDevTools(), [openDevTools])
  const handleClose = useCallback(() => closeDevTools(), [closeDevTools])
  const handleTabChange = useCallback((tab: 'lifecycle' | 'relationships' | 'data' | 'parent') => setActiveTab(tab), [setActiveTab])

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
  }, [connector, setCurrentState])

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
  }, [discoveredRelationships, targetEntity, setDetectedParentEntityType])

  // Update current entity based on context
  useEffect(() => {
    if (currentState?.context) {
      const contextEntity = currentState.context.page?.entityTypeName
      if (contextEntity && contextEntity !== 'unknown') {
        setCurrentEntity(contextEntity)
      }
    }
  }, [currentState, setCurrentEntity])

  // Initialize target entity from environment or default
  useEffect(() => {
    const envTargetTable = import.meta.env.VITE_PCF_TARGET_TABLE
    if (envTargetTable && targetEntity === 'unknown') {
      setTargetEntity(envTargetTable)
      console.log(`🎯 Using target entity from VITE_PCF_TARGET_TABLE: ${envTargetTable}`)
    }
  }, [targetEntity, setTargetEntity])

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
              onSelectParentEntity={setSelectedParentEntity}
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
              onSelectParentEntity={setSelectedParentEntity}
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
