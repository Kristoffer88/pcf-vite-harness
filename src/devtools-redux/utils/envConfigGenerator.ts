/**
 * Environment Configuration Generator
 * Generates .env configuration from current devtools state
 */

import type { DiscoveredRelationship } from './dataset'
import type { ParentEntity } from '../components/UnifiedDatasetTab'

export interface EnvConfigData {
  pageEntity: string
  targetEntity: string
  parentEntityType?: string
  parentEntityId?: string
  parentEntityName?: string
  viewId?: string
  relationships?: DiscoveredRelationship[]
  datasetKey?: string
}

export class EnvConfigGenerator {
  /**
   * Generate environment variable configuration from current state
   */
  static generateEnvConfig(data: EnvConfigData): string {
    const lines: string[] = [
      '# PCF DevTools Configuration',
      '# Generated on: ' + new Date().toISOString(),
      '',
      '# Entity Configuration',
      `VITE_PCF_PAGE_TABLE=${data.pageEntity}`,
      `VITE_PCF_TARGET_TABLE=${data.targetEntity}`,
    ]

    if (data.parentEntityType) {
      lines.push(`VITE_PCF_PARENT_ENTITY_TYPE=${data.parentEntityType}`)
    }

    if (data.parentEntityId) {
      lines.push(`VITE_PCF_PARENT_ENTITY_ID=${data.parentEntityId}`)
    }

    if (data.parentEntityName) {
      lines.push(`VITE_PCF_PARENT_ENTITY_NAME=${data.parentEntityName}`)
    }

    if (data.viewId) {
      lines.push('', '# View Configuration')
      lines.push(`VITE_PCF_DEFAULT_VIEW_ID=${data.viewId}`)
    }

    if (data.datasetKey) {
      lines.push(`VITE_PCF_DATASET_KEY=${data.datasetKey}`)
    }

    if (data.relationships && data.relationships.length > 0) {
      lines.push('', '# Discovered Relationships (for reference)')
      lines.push('# Format: parentEntity|childEntity|lookupColumn|relationshipName')
      data.relationships.forEach((rel, index) => {
        lines.push(`# VITE_PCF_RELATIONSHIP_${index}=${rel.parentEntity}|${rel.childEntity}|${rel.lookupColumn}|${rel.relationshipName || ''}`)
      })
    }

    lines.push('', '# Auto-refresh Configuration')
    lines.push('VITE_PCF_AUTO_REFRESH=true')
    lines.push('VITE_PCF_AUTO_REFRESH_DELAY=1000')

    return lines.join('\n')
  }

  /**
   * Copy environment configuration to clipboard
   */
  static async copyToClipboard(data: EnvConfigData): Promise<boolean> {
    try {
      const config = this.generateEnvConfig(data)
      await navigator.clipboard.writeText(config)
      console.log('📋 Environment configuration copied to clipboard')
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  /**
   * Parse relationships from environment variables
   */
  static parseRelationshipsFromEnv(): DiscoveredRelationship[] {
    const relationships: DiscoveredRelationship[] = []
    
    // Look for relationship env vars
    for (let i = 0; i < 10; i++) {
      const relEnv = import.meta.env[`VITE_PCF_RELATIONSHIP_${i}`]
      if (relEnv) {
        const [parentEntity, childEntity, lookupColumn, relationshipName] = relEnv.split('|')
        if (parentEntity && childEntity && lookupColumn) {
          relationships.push({
            parentEntity,
            childEntity,
            lookupColumn,
            relationshipName: relationshipName || undefined,
            source: 'env',
            confidence: 'high',
            discoveredAt: new Date().toISOString(),
          })
        }
      }
    }
    
    return relationships
  }

  /**
   * Load parent entity from environment
   */
  static loadParentEntityFromEnv(): ParentEntity | null {
    const id = import.meta.env.VITE_PCF_PARENT_ENTITY_ID
    const name = import.meta.env.VITE_PCF_PARENT_ENTITY_NAME
    const entityType = import.meta.env.VITE_PCF_PARENT_ENTITY_TYPE

    if (id && name && entityType) {
      return { id, name, entityType }
    }

    return null
  }

  /**
   * Check if auto-refresh is enabled
   */
  static isAutoRefreshEnabled(): boolean {
    const value = import.meta.env.VITE_PCF_AUTO_REFRESH
    const result = value === 'true' || value === true
    console.log('🔍 EnvConfigGenerator.isAutoRefreshEnabled:', {
      rawValue: value,
      type: typeof value,
      result,
      stringComparison: value === 'true',
      booleanComparison: value === true
    })
    return result
  }

  /**
   * Get auto-refresh delay
   */
  static getAutoRefreshDelay(): number {
    const delay = parseInt(import.meta.env.VITE_PCF_AUTO_REFRESH_DELAY)
    return isNaN(delay) ? 1000 : delay
  }
}