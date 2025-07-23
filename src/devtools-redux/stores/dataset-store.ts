/**
 * Dataset Operations Zustand Store  
 * Replaces the complex useState logic from UnifiedDatasetTab.tsx
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { shallow } from 'zustand/shallow'
import type { DatasetRefreshState } from '../utils/dataset/types'
import type { FormPCFMatch } from '../../utils/pcfDiscovery'

export interface DatasetState {
  // Dataset Selection & Views
  selectedDataset: string | null
  availableViews: Array<{savedqueryid: string, name: string, isdefault: boolean}>
  selectedViewId: string | null
  
  // Refresh State
  refreshState: DatasetRefreshState
  
  // Form and Analysis
  selectedForm: FormPCFMatch | null
  datasetAnalysisTrigger: number
}

export interface DatasetActions {
  // Actions
  setSelectedDataset: (dataset: string | null) => void
  setAvailableViews: (views: Array<{savedqueryid: string, name: string, isdefault: boolean}>) => void
  setSelectedViewId: (viewId: string | null) => void
  setRefreshState: (state: DatasetRefreshState | ((prev: DatasetRefreshState) => DatasetRefreshState)) => void
  setSelectedForm: (form: FormPCFMatch | null) => void
  triggerDatasetAnalysis: () => void
  
  // Composite Actions
  resetDatasetState: () => void
  updateRefreshProgress: (progress: Partial<DatasetRefreshState>) => void
}

export type DatasetStore = DatasetState & DatasetActions

const initialRefreshState: DatasetRefreshState = {
  isRefreshing: false,
  refreshResults: [],
  successCount: 0,
  errorCount: 0,
  totalFormsToRefresh: 0,
  currentlyRefreshing: [],
}

export const useDatasetStore = create<DatasetStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
    // Initial State
    selectedDataset: null,
    availableViews: [],
    selectedViewId: null,
    refreshState: initialRefreshState,
    selectedForm: null,
    datasetAnalysisTrigger: 0,

    // Basic Actions
    setSelectedDataset: (selectedDataset) => set((draft) => { draft.selectedDataset = selectedDataset }),
    setAvailableViews: (availableViews) => set((draft) => { draft.availableViews = availableViews }),
    setSelectedViewId: (selectedViewId) => set((draft) => { draft.selectedViewId = selectedViewId }),
    
    setRefreshState: (refreshState) => set((draft) => {
      draft.refreshState = typeof refreshState === 'function' 
        ? refreshState(draft.refreshState)
        : refreshState
    }),
    
    setSelectedForm: (selectedForm) => set((draft) => { draft.selectedForm = selectedForm }),
    
    triggerDatasetAnalysis: () => set((draft) => { draft.datasetAnalysisTrigger += 1 }),

    // Composite Actions
    resetDatasetState: () => set((draft) => {
      draft.selectedDataset = null
      draft.availableViews = []
      draft.selectedViewId = null
      draft.refreshState = initialRefreshState
      draft.selectedForm = null
    }),
    
    updateRefreshProgress: (progress) => set((draft) => {
      Object.assign(draft.refreshState, progress)
    }),
  }))
  )
)

// Convenience selectors for specific slices of state
export const selectDatasetSelection = (state: DatasetStore) => ({
  selectedDataset: state.selectedDataset,
  availableViews: state.availableViews,
  selectedViewId: state.selectedViewId,
})

export const selectDatasetRefresh = (state: DatasetStore) => ({
  refreshState: state.refreshState,
  isRefreshing: state.refreshState.isRefreshing,
})

export const selectDatasetForm = (state: DatasetStore) => ({
  selectedForm: state.selectedForm,
  datasetAnalysisTrigger: state.datasetAnalysisTrigger,
})

export const selectDatasetActions = (state: DatasetStore) => ({
  setSelectedDataset: state.setSelectedDataset,
  setAvailableViews: state.setAvailableViews,
  setSelectedViewId: state.setSelectedViewId,
  setRefreshState: state.setRefreshState,
  setSelectedForm: state.setSelectedForm,
  triggerDatasetAnalysis: state.triggerDatasetAnalysis,
  resetDatasetState: state.resetDatasetState,
  updateRefreshProgress: state.updateRefreshProgress,
})