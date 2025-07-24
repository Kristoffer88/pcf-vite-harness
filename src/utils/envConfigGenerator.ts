/**
 * Environment Configuration Generator
 * Generates .env configuration from current devtools state
 */

export interface EnvConfigData {
  pageEntity: string
  targetEntity: string
  parentEntityType?: string
  parentEntityId?: string
  parentEntityName?: string
  viewId?: string
  relationships?: any[]
  datasetKey?: string
}

/**
 * Generate environment variable configuration from current state
 */
export function generateEnvConfig(data: EnvConfigData): string {
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
      lines.push(
        `# VITE_PCF_RELATIONSHIP_${index}=${rel.parentEntity}|${rel.childEntity}|${rel.lookupColumn}|${rel.relationshipName || ''}`
      )
    })
  }

  lines.push('', '# Auto-refresh Configuration')
  lines.push('VITE_PCF_AUTO_REFRESH=true')
  lines.push('VITE_PCF_AUTO_REFRESH_DELAY=1000')

  lines.push('', '# DevTools Configuration')
  lines.push('# Set to false to disable DevTools rendering (keeps code as reference)')
  lines.push('VITE_PCF_SHOW_DEVTOOLS=true')

  return lines.join('\n')
}

/**
 * Copy environment configuration to clipboard
 */
export async function copyEnvConfigToClipboard(data: EnvConfigData): Promise<boolean> {
  try {
    const config = generateEnvConfig(data)
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
export function parseRelationshipsFromEnv(): any[] {
  const relationships: any[] = []

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
export function loadParentEntityFromEnv(): any | null {
  // Try the new PCF_PAGE_* variables first, then fall back to legacy PARENT_ENTITY_* variables
  const id = import.meta.env.VITE_PCF_PAGE_RECORD_ID || import.meta.env.VITE_PCF_PARENT_ENTITY_ID
  const name =
    import.meta.env.VITE_PCF_PAGE_TABLE_NAME || import.meta.env.VITE_PCF_PARENT_ENTITY_NAME
  const entityType =
    import.meta.env.VITE_PCF_PAGE_TABLE || import.meta.env.VITE_PCF_PARENT_ENTITY_TYPE

  console.log('🔍 loadParentEntityFromEnv:', {
    pageRecordId: import.meta.env.VITE_PCF_PAGE_RECORD_ID,
    pageTableName: import.meta.env.VITE_PCF_PAGE_TABLE_NAME,
    pageTable: import.meta.env.VITE_PCF_PAGE_TABLE,
    legacyParentId: import.meta.env.VITE_PCF_PARENT_ENTITY_ID,
    legacyParentName: import.meta.env.VITE_PCF_PARENT_ENTITY_NAME,
    legacyParentType: import.meta.env.VITE_PCF_PARENT_ENTITY_TYPE,
    resolvedId: id,
    resolvedName: name,
    resolvedEntityType: entityType,
  })

  if (id && entityType) {
    return { id, name: name || entityType, entityType }
  }

  return null
}

/**
 * Check if auto-refresh is enabled
 */
export function isAutoRefreshEnabled(): boolean {
  const value = import.meta.env.VITE_PCF_AUTO_REFRESH
  const result = value === 'true' || value === true
  console.log('🔍 isAutoRefreshEnabled:', {
    rawValue: value,
    type: typeof value,
    result,
    stringComparison: value === 'true',
    booleanComparison: value === true,
  })
  return result
}

/**
 * Get auto-refresh delay
 */
export function getAutoRefreshDelay(): number {
  const delay = Number.parseInt(import.meta.env.VITE_PCF_AUTO_REFRESH_DELAY)
  return isNaN(delay) ? 1000 : delay
}

/**
 * Check if DevTools should be shown
 */
export function shouldShowDevTools(): boolean {
  const value = import.meta.env.VITE_PCF_SHOW_DEVTOOLS
  // Default to true unless explicitly set to 'false'
  return value !== 'false'
}