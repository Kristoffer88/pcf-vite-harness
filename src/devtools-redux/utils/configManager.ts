/**
 * Configuration Manager
 * Handles saving and loading devtools configuration
 */

import type { DevToolsConfig, ConfigSaveOptions, ConfigLoadOptions } from '../types/DevToolsConfig'
import type { DiscoveredRelationship } from './dataset'
import type { ParentEntity } from '../components/UnifiedDatasetTab'

const CONFIG_KEY = 'pcf-devtools-config'
const CONFIG_VERSION = '1.0.0'

export class ConfigManager {
  /**
   * Save current configuration to localStorage
   */
  static saveConfig(config: Partial<DevToolsConfig>, options: ConfigSaveOptions = {}): void {
    const {
      includeRecords = true,
      includeUIState = true,
      compress = false
    } = options

    try {
      const fullConfig: DevToolsConfig = {
        version: CONFIG_VERSION,
        lastModified: new Date().toISOString(),
        entities: config.entities || {
          pageEntity: 'unknown',
          targetEntity: 'unknown',
          detectedParentEntityType: null
        },
        datasets: config.datasets || {
          refreshedData: [],
          selectedDatasetKey: null,
          selectedViewId: null,
          availableViews: []
        },
        relationships: config.relationships || {
          discovered: [],
          selectedParentEntity: null
        },
        ui: includeUIState ? (config.ui || {
          activeTab: 'lifecycle',
          isDevToolsOpen: true,
          expandedSections: []
        }) : {
          activeTab: 'lifecycle',
          isDevToolsOpen: true,
          expandedSections: []
        },
        debug: config.debug || {
          autoRefreshEnabled: true,
          autoRefreshDelay: 1000,
          cacheEnabled: true
        }
      }

      // Optionally remove records to reduce size
      if (!includeRecords) {
        fullConfig.datasets.refreshedData = fullConfig.datasets.refreshedData.map(dataset => ({
          ...dataset,
          records: []
        }))
      }

      const configString = JSON.stringify(fullConfig, null, compress ? 0 : 2)
      localStorage.setItem(CONFIG_KEY, configString)
      
      console.log('💾 DevTools configuration saved', {
        size: configString.length,
        datasets: fullConfig.datasets.refreshedData.length,
        relationships: fullConfig.relationships.discovered.length
      })
    } catch (error) {
      console.error('❌ Failed to save configuration:', error)
    }
  }

  /**
   * Load configuration from localStorage
   */
  static loadConfig(options: ConfigLoadOptions = {}): DevToolsConfig | null {
    const {
      merge = false,
      overrideEntities = true,
      autoRefresh = true
    } = options

    try {
      const configString = localStorage.getItem(CONFIG_KEY)
      if (!configString) {
        console.log('📂 No saved configuration found')
        return null
      }

      const config: DevToolsConfig = JSON.parse(configString)
      
      // Validate version
      if (config.version !== CONFIG_VERSION) {
        console.warn('⚠️ Configuration version mismatch, may need migration')
      }

      console.log('📂 DevTools configuration loaded', {
        lastModified: config.lastModified,
        datasets: config.datasets.refreshedData.length,
        relationships: config.relationships.discovered.length,
        pageEntity: config.entities.pageEntity,
        targetEntity: config.entities.targetEntity
      })

      // Always override with environment variables when available (env vars take precedence)
      const envPageTable = import.meta.env.VITE_PCF_PAGE_TABLE
      const envTargetTable = import.meta.env.VITE_PCF_TARGET_TABLE
      
      if (envPageTable) {
        console.log(`🔧 Overriding cached pageEntity with environment: ${envPageTable}`)
        config.entities.pageEntity = envPageTable
      }
      if (envTargetTable) {
        console.log(`🔧 Overriding cached targetEntity with environment: ${envTargetTable}`)
        config.entities.targetEntity = envTargetTable
      }

      return config
    } catch (error) {
      console.error('❌ Failed to load configuration:', error)
      return null
    }
  }

  /**
   * Clear saved configuration
   */
  static clearConfig(): void {
    try {
      localStorage.removeItem(CONFIG_KEY)
      console.log('🗑️ DevTools configuration cleared')
    } catch (error) {
      console.error('❌ Failed to clear configuration:', error)
    }
  }

  /**
   * Export configuration to file
   */
  static async exportConfig(config: Partial<DevToolsConfig>, filename?: string): Promise<void> {
    try {
      const fullConfig = {
        version: CONFIG_VERSION,
        lastModified: new Date().toISOString(),
        ...config
      }

      const blob = new Blob([JSON.stringify(fullConfig, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `pcf-devtools-config-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('📤 Configuration exported to file')
    } catch (error) {
      console.error('❌ Failed to export configuration:', error)
    }
  }

  /**
   * Import configuration from file
   */
  static async importConfig(file: File): Promise<DevToolsConfig | null> {
    try {
      const text = await file.text()
      const config: DevToolsConfig = JSON.parse(text)
      
      // Validate the imported config
      if (!config.version || !config.entities) {
        throw new Error('Invalid configuration file format')
      }

      console.log('📥 Configuration imported from file', {
        filename: file.name,
        lastModified: config.lastModified
      })

      return config
    } catch (error) {
      console.error('❌ Failed to import configuration:', error)
      return null
    }
  }

  /**
   * Create a configuration snapshot from current state
   */
  static createSnapshot(
    entities: { pageEntity: string; targetEntity: string; detectedParentEntityType: string | null },
    refreshedDatasets: any[],
    discoveredRelationships: DiscoveredRelationship[],
    selectedParentEntity: ParentEntity | null,
    uiState?: Partial<DevToolsConfig['ui']>
  ): Partial<DevToolsConfig> {
    return {
      entities,
      datasets: {
        refreshedData: refreshedDatasets.map(dataset => ({
          key: dataset.key,
          entityLogicalName: dataset.entityLogicalName,
          viewId: dataset.viewId,
          relationshipName: dataset.relationshipName,
          records: dataset.records || [],
          columns: dataset.columns || [],
          lastRefreshTime: new Date().toISOString()
        })),
        selectedDatasetKey: null,
        selectedViewId: null,
        availableViews: []
      },
      relationships: {
        discovered: discoveredRelationships,
        selectedParentEntity
      },
      ui: uiState,
      debug: {
        autoRefreshEnabled: true,
        autoRefreshDelay: 1000,
        cacheEnabled: true
      }
    }
  }
}