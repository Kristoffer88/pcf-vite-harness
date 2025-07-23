/**
 * Entity Metadata Utilities
 * Fetches and caches entity metadata including PrimaryIdAttribute and PrimaryNameAttribute
 */

export interface EntityMetadataInfo {
  LogicalName: string
  PrimaryIdAttribute: string
  PrimaryNameAttribute: string
  LogicalCollectionName?: string
  DisplayName?: {
    UserLocalizedLabel?: {
      Label: string
    }
  }
}

// Cache for entity metadata to avoid repeated API calls
const entityMetadataCache = new Map<string, EntityMetadataInfo>()

/**
 * Fetch entity metadata including primary attributes
 */
export async function fetchEntityMetadata(
  entityLogicalName: string,
  webAPI?: ComponentFramework.WebApi
): Promise<EntityMetadataInfo | null> {
  // Check cache first
  const cached = entityMetadataCache.get(entityLogicalName)
  if (cached) {
    console.log(`📋 Using cached metadata for ${entityLogicalName}`)
    return cached
  }

  try {
    console.log(`🔍 Fetching metadata for entity: ${entityLogicalName}`)
    
    // Use WebAPI if available, otherwise use fetch
    const metadataUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,PrimaryIdAttribute,PrimaryNameAttribute,LogicalCollectionName,DisplayName`
    
    let metadata: EntityMetadataInfo
    
    // WebAPI doesn't directly support metadata queries, so we use fetch
    const response = await fetch(`/api/data/v9.2/${metadataUrl}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`)
    }
    metadata = await response.json()
    
    // Cache the result
    entityMetadataCache.set(entityLogicalName, metadata)
    
    console.log(`✅ Fetched metadata for ${entityLogicalName}:`, {
      PrimaryIdAttribute: metadata.PrimaryIdAttribute,
      PrimaryNameAttribute: metadata.PrimaryNameAttribute
    })
    
    return metadata
  } catch (error) {
    console.error(`❌ Failed to fetch metadata for ${entityLogicalName}:`, error)
    
    // Return default values as fallback
    const fallback: EntityMetadataInfo = {
      LogicalName: entityLogicalName,
      PrimaryIdAttribute: `${entityLogicalName}id`,
      PrimaryNameAttribute: 'name',
      LogicalCollectionName: `${entityLogicalName}s`
    }
    
    // Cache the fallback
    entityMetadataCache.set(entityLogicalName, fallback)
    
    return fallback
  }
}

/**
 * Get primary key value from an entity record
 */
export function getEntityPrimaryKey(
  entity: ComponentFramework.WebApi.Entity,
  metadata: EntityMetadataInfo
): string | null {
  const primaryKey = metadata.PrimaryIdAttribute
  const value = entity[primaryKey]
  
  if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return value
  }
  
  // Try without metadata prefix (some entities don't include the prefix in the data)
  const alternateKey = primaryKey.replace(/^[^_]+_/, '')
  const alternateValue = entity[alternateKey]
  
  if (typeof alternateValue === 'string' && alternateValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return alternateValue
  }
  
  return null
}

/**
 * Get primary name value from an entity record
 */
export function getEntityPrimaryName(
  entity: ComponentFramework.WebApi.Entity,
  metadata: EntityMetadataInfo
): string {
  const nameAttribute = metadata.PrimaryNameAttribute
  
  // Check for formatted value first
  const formattedKey = `${nameAttribute}@OData.Community.Display.V1.FormattedValue`
  if (entity[formattedKey]) {
    return entity[formattedKey] as string
  }
  
  // Then raw value
  if (entity[nameAttribute]) {
    return String(entity[nameAttribute])
  }
  
  // Try without metadata prefix
  const alternateKey = nameAttribute.replace(/^[^_]+_/, '')
  if (entity[alternateKey]) {
    return String(entity[alternateKey])
  }
  
  // Fallback to any name-like field
  const nameLikeFields = ['name', 'title', 'subject', 'fullname', 'lastname']
  for (const field of nameLikeFields) {
    if (entity[field]) {
      return String(entity[field])
    }
    
    // Also check with entity prefix
    const prefixedField = `${metadata.LogicalName}_${field}`
    if (entity[prefixedField]) {
      return String(entity[prefixedField])
    }
  }
  
  return 'Unnamed Record'
}

/**
 * Clear the metadata cache
 */
export function clearEntityMetadataCache(): void {
  entityMetadataCache.clear()
  console.log('🧹 Entity metadata cache cleared')
}

/**
 * Get all cached metadata
 */
export function getCachedEntityMetadata(): Map<string, EntityMetadataInfo> {
  return new Map(entityMetadataCache)
}