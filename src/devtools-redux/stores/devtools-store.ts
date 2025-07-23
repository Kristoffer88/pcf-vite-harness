/**
 * Main DevTools Zustand Store
 * Replaces the useState logic from EmbeddedDevToolsUI.tsx
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { shallow } from 'zustand/shallow'
import { setAutoFreeze } from 'immer'

// Disable Immer's autoFreeze to prevent "object is not extensible" errors
// This is needed because PCFDevToolsConnector state gets frozen by Redux DevTools
setAutoFreeze(false)
import type { ParentEntity } from '../components/RelationshipsTab'
import type { DiscoveredRelationship } from '../utils/dataset'

export type DevToolsTab = 'lifecycle' | 'relationships' | 'data' | 'parent'

export interface DevToolsState {
  // UI State
  isOpen: boolean
  activeTab: DevToolsTab
  currentState: any

  // Entity Management
  selectedParentEntity: ParentEntity | null
  discoveredRelationships: DiscoveredRelationship[]
  detectedParentEntityType: string | null
  currentEntity: string
  targetEntity: string
}

export interface DevToolsActions {
  // Actions
  setIsOpen: (isOpen: boolean) => void
  setActiveTab: (tab: DevToolsTab) => void
  setCurrentState: (state: any) => void
  
  setSelectedParentEntity: (entity: ParentEntity | null) => void
  setDiscoveredRelationships: (relationships: DiscoveredRelationship[]) => void
  setDetectedParentEntityType: (type: string | null) => void
  setCurrentEntity: (entity: string) => void
  setTargetEntity: (entity: string) => void

  // Composite Actions
  openDevTools: () => void
  closeDevTools: () => void
  toggleDevTools: () => void
}

export type DevToolsStore = DevToolsState & DevToolsActions

const STORAGE_KEY = 'pcf-devtools-selected-parent-entity'

export const useDevToolsStore = create<DevToolsStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
    // Initial State
    isOpen: false,
    activeTab: 'data' as DevToolsTab,
    currentState: null,
    
    selectedParentEntity: (() => {
      // Only access localStorage in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null
      }
      
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
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
    })(),
    discoveredRelationships: [],
    detectedParentEntityType: null,
    currentEntity: 'unknown',
    targetEntity: 'unknown',

    // Basic Actions
    setIsOpen: (isOpen) => set((draft) => { draft.isOpen = isOpen }),
    setActiveTab: (activeTab) => set((draft) => { draft.activeTab = activeTab }),
    setCurrentState: (currentState) => set((draft) => { draft.currentState = currentState }),
    
    setSelectedParentEntity: (selectedParentEntity) => {
      set((draft) => { draft.selectedParentEntity = selectedParentEntity })
      
      // Persist to localStorage (only in browser environment)
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          if (selectedParentEntity) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedParentEntity))
          } else {
            localStorage.removeItem(STORAGE_KEY)
          }
        } catch (error) {
          console.warn('Failed to persist selected parent entity:', error)
        }
      }
    },
    
    setDiscoveredRelationships: (discoveredRelationships) => set((draft) => { draft.discoveredRelationships = discoveredRelationships }),
    setDetectedParentEntityType: (detectedParentEntityType) => set((draft) => { draft.detectedParentEntityType = detectedParentEntityType }),
    setCurrentEntity: (currentEntity) => set((draft) => { draft.currentEntity = currentEntity }),
    setTargetEntity: (targetEntity) => set((draft) => { draft.targetEntity = targetEntity }),

    // Composite Actions
    openDevTools: () => set((draft) => { draft.isOpen = true }),
    closeDevTools: () => set((draft) => { draft.isOpen = false }),
    toggleDevTools: () => set((draft) => { draft.isOpen = !draft.isOpen }),
  }))
  )
)

// Convenience selectors for specific slices of state
export const selectDevToolsUI = (state: DevToolsStore) => ({
  isOpen: state.isOpen,
  activeTab: state.activeTab,
  currentState: state.currentState,
})

export const selectEntityManagement = (state: DevToolsStore) => ({
  selectedParentEntity: state.selectedParentEntity,
  discoveredRelationships: state.discoveredRelationships,
  detectedParentEntityType: state.detectedParentEntityType,
  currentEntity: state.currentEntity,
  targetEntity: state.targetEntity,
})

export const selectDevToolsActions = (state: DevToolsStore) => ({
  setIsOpen: state.setIsOpen,
  setActiveTab: state.setActiveTab,
  setCurrentState: state.setCurrentState,
  setSelectedParentEntity: state.setSelectedParentEntity,
  setDiscoveredRelationships: state.setDiscoveredRelationships,
  setDetectedParentEntityType: state.setDetectedParentEntityType,
  setCurrentEntity: state.setCurrentEntity,
  setTargetEntity: state.setTargetEntity,
  openDevTools: state.openDevTools,
  closeDevTools: state.closeDevTools,
  toggleDevTools: state.toggleDevTools,
})