/**
 * Batch Metadata Fetcher
 * Optimized metadata fetching that reduces API calls by batching requests
 */

import type { EntityMetadata, LookupAttribute } from './metadataDiscovery'

// Cache for batch-fetched metadata
const batchMetadataCache = new Map<string, EntityMetadata>()

/**
 * Fetch entity metadata with all lookup attributes in a single request
 * This is much more efficient than making separate requests for each lookup
 */
export async function fetchEntityMetadataWithLookups(
  entityLogicalName: string
): Promise<EntityMetadata | null> {
  // Check cache first
  const cached = batchMetadataCache.get(entityLogicalName)
  if (cached) {
    console.log(`📋 Using batch-cached metadata for ${entityLogicalName}`)
    return cached
  }

  try {
    console.log(`🚀 Batch-fetching metadata for ${entityLogicalName}...`)
    
    // First get basic entity metadata
    const entityUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')?` +
      `$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute`

    const entityResponse = await fetch(entityUrl)
    if (!entityResponse.ok) {
      throw new Error(`Failed to fetch entity metadata: ${entityResponse.status} ${entityResponse.statusText}`)
    }

    const entityData = await entityResponse.json()
    
    // Then fetch lookup attributes separately with proper type casting
    const lookupUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?` +
      `$select=LogicalName,DisplayName,AttributeType,Targets&` +
      `$filter=IsValidForRead eq true`

    const lookupResponse = await fetch(lookupUrl)
    if (!lookupResponse.ok) {
      throw new Error(`Failed to fetch lookup attributes: ${lookupResponse.status} ${lookupResponse.statusText}`)
    }

    const lookupData = await lookupResponse.json()
    
    // Process lookup attributes
    const lookupAttributes: LookupAttribute[] = []
    
    if (lookupData.value && Array.isArray(lookupData.value)) {
      for (const attr of lookupData.value) {
        // Targets are directly included in the response
        const targets = attr.Targets || []
        
        lookupAttributes.push({
          logicalName: attr.LogicalName,
          displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
          targets: targets,
          lookupFieldName: `_${attr.LogicalName}_value`,
        })
        
        if (targets.length === 0) {
          console.warn(`⚠️ No targets for ${attr.LogicalName} - might be polymorphic`)
        }
      }
    }

    const metadata: EntityMetadata = {
      logicalName: entityLogicalName,
      displayName: entityData.DisplayName?.UserLocalizedLabel?.Label || entityLogicalName,
      entitySetName: entityData.EntitySetName || `${entityLogicalName}s`,
      lookupAttributes,
    }

    // Cache the result
    batchMetadataCache.set(entityLogicalName, metadata)
    
    console.log(
      `✅ Batch-fetched metadata for ${entityLogicalName}: ` +
      `${lookupAttributes.length} lookups in 2 requests`
    )

    return metadata
  } catch (error) {
    console.error(`❌ Batch metadata fetch failed for ${entityLogicalName}:`, error)
    return null
  }
}

/**
 * Fetch multiple entities' metadata in parallel
 */
export async function fetchMultipleEntityMetadata(
  entityNames: string[]
): Promise<Map<string, EntityMetadata>> {
  const results = new Map<string, EntityMetadata>()
  
  // Filter out already cached entities
  const entitiesToFetch = entityNames.filter(name => !batchMetadataCache.has(name))
  
  if (entitiesToFetch.length === 0) {
    console.log('✅ All entities already cached')
    entityNames.forEach(name => {
      const cached = batchMetadataCache.get(name)
      if (cached) results.set(name, cached)
    })
    return results
  }

  console.log(`🚀 Fetching metadata for ${entitiesToFetch.length} entities in parallel...`)
  
  // Fetch all entities in parallel
  const promises = entitiesToFetch.map(entity => fetchEntityMetadataWithLookups(entity))
  const metadataResults = await Promise.all(promises)
  
  // Combine results
  entitiesToFetch.forEach((entity, index) => {
    const metadata = metadataResults[index]
    if (metadata) {
      results.set(entity, metadata)
    }
  })
  
  // Add cached results
  entityNames.forEach(name => {
    if (!results.has(name)) {
      const cached = batchMetadataCache.get(name)
      if (cached) results.set(name, cached)
    }
  })
  
  return results
}

/**
 * Clear the batch metadata cache
 */
export function clearBatchMetadataCache(): void {
  batchMetadataCache.clear()
  console.log('🧹 Batch metadata cache cleared')
}

/**
 * Get cache statistics
 */
export function getBatchCacheStats(): { size: number; entities: string[] } {
  return {
    size: batchMetadataCache.size,
    entities: Array.from(batchMetadataCache.keys())
  }
}