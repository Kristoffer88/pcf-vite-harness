/**
 * Metadata Service
 * Centralized service for entity metadata discovery and relationship mapping
 * Consolidates logic from metadataDiscovery, entityMetadata, and related utilities
 */

// Import type for compatibility with existing code
type DataverseEntityMetadata = {
  LogicalName: string
  PrimaryIdAttribute: string
  PrimaryNameAttribute: string
  LogicalCollectionName: string
  DisplayName: { LocalizedLabels: Array<{ Label: string }> }
}
import { fetchEntityMetadataWithLookups, clearBatchMetadataCache } from '../utils/dataset/batchMetadataFetcher'

export interface EntityMetadata {
  logicalName: string
  displayName: string
  entitySetName: string
  lookupAttributes: LookupAttribute[]
  primaryIdAttribute?: string
  primaryNameAttribute?: string
  logicalCollectionName?: string
}

export interface LookupAttribute {
  logicalName: string
  displayName: string
  targets: string[]
  lookupFieldName: string
}

export interface DiscoveredRelationship {
  parentEntity: string
  childEntity: string
  lookupColumn: string
  relationshipDisplayName: string
  discoveredAt: Date
  confidence: 'high' | 'medium' | 'low'
  source: 'metadata' | 'pattern' | 'manual' | 'record-analysis' | 'column-analysis'
}

export interface MetadataServiceOptions {
  webAPI?: ComponentFramework.WebApi
  cacheTimeout?: number
}

export class MetadataService {
  private webAPI?: ComponentFramework.WebApi
  private metadataCache = new Map<string, EntityMetadata>()
  private relationshipCache = new Map<string, DiscoveredRelationship>()
  private fetchingKeys = new Set<string>()
  private cacheTimeout: number

  constructor(options: MetadataServiceOptions = {}) {
    this.webAPI = options.webAPI
    this.cacheTimeout = options.cacheTimeout ?? 300000 // 5 minutes default
  }

  /**
   * Update WebAPI reference
   */
  updateWebAPI(webAPI?: ComponentFramework.WebApi): void {
    this.webAPI = webAPI
  }

  /**
   * Discover entity metadata including lookup attributes
   */
  async discoverEntityMetadata(entityLogicalName: string): Promise<EntityMetadata | null> {
    if (!this.isValidEntityName(entityLogicalName)) {
      console.warn(`⚠️ Invalid entity name for metadata discovery: "${entityLogicalName}"`)
      return null
    }

    // Check cache first
    const cached = this.metadataCache.get(entityLogicalName)
    if (cached) {
      console.log(`📋 Using cached metadata for ${entityLogicalName}`)
      return cached
    }

    // Prevent duplicate requests
    const fetchKey = `fetching_${entityLogicalName}`
    if (this.fetchingKeys.has(fetchKey)) {
      console.log(`⏳ Already fetching metadata for ${entityLogicalName}, waiting...`)
      await this.waitForFetch(fetchKey)
      return this.metadataCache.get(entityLogicalName) || null
    }

    this.fetchingKeys.add(fetchKey)

    if (!this.webAPI) {
      console.warn('⚠️ WebAPI not available for metadata discovery')
      this.fetchingKeys.delete(fetchKey)
      return null
    }

    try {
      const metadata = await fetchEntityMetadataWithLookups(entityLogicalName)
      
      if (metadata) {
        this.metadataCache.set(entityLogicalName, metadata)
        this.fetchingKeys.delete(fetchKey)
        return metadata
      }
      
      throw new Error('Failed to fetch metadata using batch fetcher')
    } catch (error) {
      console.error(`❌ Failed to discover metadata for ${entityLogicalName}:`, error)
      this.fetchingKeys.delete(fetchKey)
      return null
    }
  }

  /**
   * Fetch basic entity metadata (primary attributes, collection name)
   */
  async fetchEntityMetadata(
    entityLogicalName: string
  ): Promise<Partial<DataverseEntityMetadata> | null> {
    if (!this.isValidEntityName(entityLogicalName)) {
      console.warn(`⚠️ Invalid entity name for metadata fetch: "${entityLogicalName}"`)
      return null
    }

    try {
      console.log(`🔍 Fetching metadata for entity: ${entityLogicalName}`)
      
      const metadataUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,PrimaryIdAttribute,PrimaryNameAttribute,LogicalCollectionName,DisplayName`
      
      const response = await fetch(`/api/data/v9.2/${metadataUrl}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`)
      }
      
      const metadata = await response.json()
      console.log(`✅ Successfully fetched metadata for ${entityLogicalName}`)
      return metadata
    } catch (error) {
      console.error(`❌ Failed to fetch basic metadata for ${entityLogicalName}:`, error)
      return null
    }
  }

  /**
   * Discover relationship between two entities
   */
  async discoverRelationship(
    parentEntity: string,
    childEntity: string,
    options: {
      parentRecordId?: string
      useRecordAnalysis?: boolean
    } = {}
  ): Promise<DiscoveredRelationship | null> {
    const relationshipKey = `${parentEntity}->${childEntity}`
    
    // Check cache first
    const cached = this.relationshipCache.get(relationshipKey)
    if (cached) {
      return cached
    }

    try {
      // Discover child entity metadata to find lookup fields
      const childMetadata = await this.discoverEntityMetadata(childEntity)
      if (!childMetadata) {
        console.warn(`⚠️ Could not fetch metadata for child entity: ${childEntity}`)
        return null
      }

      // Look for lookup attributes that target the parent entity
      const matchingLookups = childMetadata.lookupAttributes.filter(lookup =>
        lookup.targets.includes(parentEntity)
      )

      if (matchingLookups.length === 0) {
        console.warn(`⚠️ No lookup relationship found from ${childEntity} to ${parentEntity}`)
        return null
      }

      // Use the first matching lookup (most common case)
      const bestMatch = matchingLookups[0]
      
      if (!bestMatch) {
        console.warn(`⚠️ No valid lookup relationship found from ${childEntity} to ${parentEntity}`)
        return null
      }
      
      const relationship: DiscoveredRelationship = {
        parentEntity,
        childEntity,
        lookupColumn: bestMatch.lookupFieldName,
        relationshipDisplayName: `${parentEntity} -> ${childEntity} (${bestMatch.displayName})`,
        discoveredAt: new Date(),
        confidence: matchingLookups.length === 1 ? 'high' : 'medium',
        source: 'metadata',
      }

      // Cache the discovered relationship
      this.relationshipCache.set(relationshipKey, relationship)
      
      console.log(`✅ Discovered relationship: ${relationship.relationshipDisplayName}`)
      return relationship
    } catch (error) {
      console.error(`❌ Failed to discover relationship ${relationshipKey}:`, error)
      return null
    }
  }

  /**
   * Get all discovered relationships for an entity
   */
  getDiscoveredRelationships(entityName?: string): DiscoveredRelationship[] {
    const relationships = Array.from(this.relationshipCache.values())
    
    if (!entityName) {
      return relationships
    }
    
    return relationships.filter(
      rel => rel.parentEntity === entityName || rel.childEntity === entityName
    )
  }

  /**
   * Clear metadata cache
   */
  clearCache(): void {
    this.metadataCache.clear()
    this.relationshipCache.clear()
    this.fetchingKeys.clear()
    clearBatchMetadataCache()
    console.log('🧹 Metadata cache cleared')
  }

  /**
   * Export discovered relationships for persistence
   */
  exportDiscoveredMappings(): Record<string, DiscoveredRelationship> {
    const mappings: Record<string, DiscoveredRelationship> = {}
    
    for (const [key, relationship] of this.relationshipCache.entries()) {
      mappings[key] = relationship
    }
    
    return mappings
  }

  /**
   * Import relationship mappings
   */
  importRelationshipMappings(mappings: Record<string, DiscoveredRelationship>): void {
    for (const [key, relationship] of Object.entries(mappings)) {
      this.relationshipCache.set(key, relationship)
    }
    
    console.log(`📥 Imported ${Object.keys(mappings).length} relationship mappings`)
  }

  /**
   * Build relationship filter for OData queries
   */
  async buildRelationshipFilter(
    parentEntity: string,
    childEntity: string,
    parentRecordId: string
  ): Promise<string | null> {
    const relationship = await this.discoverRelationship(parentEntity, childEntity)
    
    if (!relationship) {
      return null
    }
    
    return `${relationship.lookupColumn} eq ${parentRecordId}`
  }

  /**
   * Validate entity name
   */
  private isValidEntityName(entityName: string): boolean {
    return !!(entityName && entityName !== 'unknown' && entityName.trim() !== '')
  }

  /**
   * Wait for an ongoing fetch operation
   */
  private async waitForFetch(fetchKey: string): Promise<void> {
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max wait

    while (this.fetchingKeys.has(fetchKey) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
  }
}

// Singleton instance for global use
let metadataServiceInstance: MetadataService | null = null

/**
 * Get the global metadata service instance
 */
export function getMetadataService(): MetadataService {
  if (!metadataServiceInstance) {
    metadataServiceInstance = new MetadataService()
  }
  return metadataServiceInstance
}

/**
 * Initialize the global metadata service
 */
export function initializeMetadataService(options: MetadataServiceOptions): MetadataService {
  metadataServiceInstance = new MetadataService(options)
  return metadataServiceInstance
}