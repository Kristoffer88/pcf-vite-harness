/**
 * DevTools Configuration Types
 * Defines the structure for saving and loading devtools state
 */

import type { DiscoveredRelationship } from '../utils/dataset'
import type { ParentEntity } from '../components/UnifiedDatasetTab'

export interface DevToolsConfig {
  version: string
  lastModified: string
  
  // Entity Configuration
  entities: {
    pageEntity: string
    targetEntity: string
    detectedParentEntityType: string | null
  }
  
  // Dataset Configuration
  datasets: {
    refreshedData: Array<{
      key: string
      entityLogicalName: string
      viewId?: string
      relationshipName?: string
      records: any[]
      columns: Array<{
        name: string
        displayName: string
        dataType: string
        alias?: string
      }>
      lastRefreshTime: string
    }>
    selectedDatasetKey: string | null
    selectedViewId: string | null
    availableViews: Array<{
      savedqueryid: string
      name: string
      isdefault: boolean
      fetchxml?: string
    }>
  }
  
  // Relationship Configuration
  relationships: {
    discovered: DiscoveredRelationship[]
    selectedParentEntity: ParentEntity | null
  }
  
  // UI State
  ui: {
    activeTab: string
    isDevToolsOpen: boolean
    expandedSections: string[]
  }
  
  // Performance & Debug
  debug: {
    autoRefreshEnabled: boolean
    autoRefreshDelay: number
    cacheEnabled: boolean
  }
}

export interface ConfigSaveOptions {
  includeRecords?: boolean
  includeUIState?: boolean
  compress?: boolean
}

export interface ConfigLoadOptions {
  merge?: boolean
  overrideEntities?: boolean
  autoRefresh?: boolean
}