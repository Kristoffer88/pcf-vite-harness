/**
 * Search & Discovery Zustand Store
 * Handles parent entity search and relationship discovery functionality
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { shallow } from 'zustand/shallow'

// Define ParentEntity type locally since UI components were removed
export interface ParentEntity {
  entitySetName: string
  logicalName: string
  displayName: string
  primaryIdAttribute: string
  primaryNameAttribute: string
  recordId?: string
  recordDisplayName?: string
}

export interface SearchState {
  // Parent Entity Search
  parentEntities: ParentEntity[]
  parentEntitySearch: string
  isLoadingParentEntities: boolean
  searchError: string | null
  
  // Discovery Operations
  relationshipDiscoveryInProgress: boolean
  
  // Actions
  setParentEntities: (entities: ParentEntity[]) => void
  setParentEntitySearch: (search: string) => void
  setIsLoadingParentEntities: (loading: boolean) => void
  setSearchError: (error: string | null) => void
  setRelationshipDiscoveryInProgress: (inProgress: boolean) => void
  
  // Composite Actions
  clearSearch: () => void
  resetSearchState: () => void
}

export const useSearchStore = create<SearchState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    parentEntities: [],
    parentEntitySearch: '',
    isLoadingParentEntities: false,
    searchError: null,
    relationshipDiscoveryInProgress: false,

    // Basic Actions
    setParentEntities: (parentEntities) => set({ parentEntities }),
    setParentEntitySearch: (parentEntitySearch) => set({ parentEntitySearch }),
    setIsLoadingParentEntities: (isLoadingParentEntities) => set({ isLoadingParentEntities }),
    setSearchError: (searchError) => set({ searchError }),
    setRelationshipDiscoveryInProgress: (relationshipDiscoveryInProgress) => set({ relationshipDiscoveryInProgress }),

    // Composite Actions
    clearSearch: () => set({
      parentEntitySearch: '',
      parentEntities: [],
      searchError: null,
    }),
    
    resetSearchState: () => set({
      parentEntities: [],
      parentEntitySearch: '',
      isLoadingParentEntities: false,
      searchError: null,
      relationshipDiscoveryInProgress: false,
    }),
  }))
)

// Convenience selectors for specific slices of state
export const selectParentSearch = (state: SearchState) => ({
  parentEntities: state.parentEntities,
  parentEntitySearch: state.parentEntitySearch,
  isLoadingParentEntities: state.isLoadingParentEntities,
  searchError: state.searchError,
})

export const selectDiscoveryState = (state: SearchState) => ({
  relationshipDiscoveryInProgress: state.relationshipDiscoveryInProgress,
})

export const selectSearchActions = (state: SearchState) => ({
  setParentEntities: state.setParentEntities,
  setParentEntitySearch: state.setParentEntitySearch,
  setIsLoadingParentEntities: state.setIsLoadingParentEntities,
  setSearchError: state.setSearchError,
  setRelationshipDiscoveryInProgress: state.setRelationshipDiscoveryInProgress,
  clearSearch: state.clearSearch,
  resetSearchState: state.resetSearchState,
})