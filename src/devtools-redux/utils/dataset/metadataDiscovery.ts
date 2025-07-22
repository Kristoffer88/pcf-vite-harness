/**
 * Runtime Metadata Discovery Service
 * Dynamically discovers entity relationships and lookup columns using Dataverse WebAPI
 * Perfect for development tools that need to work with any custom entities
 */

export interface EntityMetadata {
  logicalName: string
  displayName: string
  entitySetName: string
  lookupAttributes: LookupAttribute[]
}

export interface LookupAttribute {
  logicalName: string
  displayName: string
  targets: string[] // Array of target entity logical names
  lookupFieldName: string // The _fieldname_value format for OData queries
}

export interface DiscoveredRelationship {
  parentEntity: string
  childEntity: string
  lookupColumn: string
  relationshipDisplayName: string
  discoveredAt: Date
  confidence: 'high' | 'medium' | 'low'
  source: 'metadata' | 'pattern' | 'manual'
}

// In-memory cache for discovered metadata
const metadataCache = new Map<string, EntityMetadata>()
const relationshipCache = new Map<string, DiscoveredRelationship>()

/**
 * Discover all lookup attributes for a specific entity
 */
export async function discoverEntityMetadata(
  entityLogicalName: string,
  webAPI?: ComponentFramework.WebApi
): Promise<EntityMetadata | null> {
  // Check cache first
  const cached = metadataCache.get(entityLogicalName)
  if (cached) {
    console.log(`📋 Using cached metadata for ${entityLogicalName}`)
    return cached
  }

  if (!webAPI) {
    console.warn('⚠️ WebAPI not available for metadata discovery')
    return null
  }

  try {
    console.log(`🔍 Discovering metadata for entity: ${entityLogicalName}`)

    // Query entity definition with lookup attributes
    // We need to make a direct HTTP request for metadata, not use retrieveRecord
    const metadataUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,DisplayName,EntitySetName&$expand=Attributes($filter=AttributeType eq Microsoft.Dynamics.CRM.AttributeTypeCode'Lookup';$select=LogicalName,DisplayName)`

    const metadataResponse = await fetch(metadataUrl)
    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`)
    }
    const response = await metadataResponse.json()

    const lookupAttributes: LookupAttribute[] = []

    if (response.Attributes && Array.isArray(response.Attributes)) {
      for (const attr of response.Attributes) {
        // Get the targets for this lookup attribute
        const targets = await discoverLookupTargets(entityLogicalName, attr.LogicalName)

        lookupAttributes.push({
          logicalName: attr.LogicalName,
          displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
          targets: targets,
          lookupFieldName: `_${attr.LogicalName}_value`,
        })
      }
    }

    const metadata: EntityMetadata = {
      logicalName: entityLogicalName,
      displayName: response.DisplayName?.UserLocalizedLabel?.Label || entityLogicalName,
      entitySetName: response.EntitySetName || `${entityLogicalName}s`,
      lookupAttributes,
    }

    // Cache the result
    metadataCache.set(entityLogicalName, metadata)

    console.log(
      `✅ Discovered ${lookupAttributes.length} lookup attributes for ${entityLogicalName}`
    )

    return metadata
  } catch (error) {
    console.error(`❌ Failed to discover metadata for ${entityLogicalName}:`, error)
    return null
  }
}

/**
 * Get the target entities for a specific lookup attribute
 */
async function discoverLookupTargets(
  entityLogicalName: string,
  attributeLogicalName: string
): Promise<string[]> {
  try {
    // Query the specific lookup attribute to get its targets
    const metadataUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=Targets`

    const metadataResponse = await fetch(metadataUrl)
    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch lookup targets: ${metadataResponse.status}`)
    }
    const response = await metadataResponse.json()

    return response.Targets || []
  } catch (error) {
    console.warn(`⚠️ Could not get targets for ${entityLogicalName}.${attributeLogicalName}:`, error)
    return []
  }
}

/**
 * Find the lookup column that relates a child entity to a parent entity
 */
export async function discoverRelationshipLookupColumn(
  parentEntity: string,
  childEntity: string,
  webAPI?: ComponentFramework.WebApi
): Promise<DiscoveredRelationship | null> {
  // Check cache first
  const cacheKey = `${parentEntity}->${childEntity}`
  const cached = relationshipCache.get(cacheKey)
  if (cached) {
    console.log(`📋 Using cached relationship: ${cacheKey}`)
    return cached
  }

  console.log(`🔍 Discovering relationship: ${parentEntity} -> ${childEntity}`)

  // Get metadata for the child entity (which should have lookup to parent)
  const childMetadata = await discoverEntityMetadata(childEntity, webAPI)

  if (!childMetadata) {
    console.warn(`⚠️ Could not get metadata for child entity: ${childEntity}`)
    return null
  }

  // Find lookup attributes that target the parent entity
  const matchingLookups = childMetadata.lookupAttributes.filter(attr =>
    attr.targets.includes(parentEntity)
  )

  if (matchingLookups.length === 0) {
    console.warn(`⚠️ No lookup found from ${childEntity} to ${parentEntity}`)
    return null
  }

  // Prefer lookups that have obvious naming patterns
  const preferredLookup =
    matchingLookups.find(
      attr =>
        attr.logicalName.toLowerCase().includes(parentEntity.toLowerCase()) ||
        attr.logicalName.toLowerCase().includes('parent') ||
        attr.logicalName.toLowerCase().includes('primary')
    ) || matchingLookups[0]

  if (!preferredLookup) {
    console.warn(`⚠️ No preferred lookup found for ${parentEntity} -> ${childEntity}`)
    return null
  }

  const discoveredRelationship: DiscoveredRelationship = {
    parentEntity,
    childEntity,
    lookupColumn: preferredLookup.lookupFieldName,
    relationshipDisplayName: preferredLookup.displayName,
    discoveredAt: new Date(),
    confidence: matchingLookups.length === 1 ? 'high' : 'medium',
    source: 'metadata',
  }

  // Cache the result
  relationshipCache.set(cacheKey, discoveredRelationship)

  console.log(
    `✅ Discovered relationship: ${parentEntity} -> ${childEntity} via ${preferredLookup.lookupFieldName}`
  )

  return discoveredRelationship
}

/**
 * Build a relationship filter using discovered metadata
 */
export async function buildDynamicRelationshipFilter(
  parentEntity: string,
  childEntity: string,
  parentRecordId: string,
  webAPI?: ComponentFramework.WebApi
): Promise<string | null> {
  const relationship = await discoverRelationshipLookupColumn(parentEntity, childEntity, webAPI)

  if (!relationship) {
    console.warn(`⚠️ Could not discover relationship filter for ${parentEntity} -> ${childEntity}`)
    return null
  }

  // Build the OData filter using the discovered lookup column
  const filter = `${relationship.lookupColumn} eq ${parentRecordId}`

  console.log(`🏗️ Built dynamic relationship filter: ${filter}`)

  return filter
}

/**
 * Try multiple strategies to discover a relationship
 */
export async function discoverRelationshipMultiStrategy(
  parentEntity: string,
  childEntity: string,
  webAPI?: ComponentFramework.WebApi
): Promise<DiscoveredRelationship | null> {
  console.log(`🎯 Multi-strategy discovery: ${parentEntity} -> ${childEntity}`)

  // Strategy 1: Direct metadata discovery
  let relationship = await discoverRelationshipLookupColumn(parentEntity, childEntity, webAPI)
  if (relationship) {
    console.log(`✅ Strategy 1 (metadata) successful`)
    return relationship
  }

  // Strategy 2: Try reverse relationship (parent -> child might be child -> parent)
  relationship = await discoverRelationshipLookupColumn(childEntity, parentEntity, webAPI)
  if (relationship) {
    console.log(`✅ Strategy 2 (reverse) successful`)
    return relationship
  }

  // Strategy 3: Pattern-based guessing for common scenarios
  const patternGuess = guessRelationshipPattern(parentEntity, childEntity)
  if (patternGuess) {
    console.log(`✅ Strategy 3 (pattern) guessed: ${patternGuess.lookupColumn}`)
    relationshipCache.set(`${parentEntity}->${childEntity}`, patternGuess)
    return patternGuess
  }

  console.warn(`❌ All strategies failed for ${parentEntity} -> ${childEntity}`)
  return null
}

/**
 * Pattern-based relationship guessing as fallback
 */
function guessRelationshipPattern(
  parentEntity: string,
  childEntity: string
): DiscoveredRelationship | null {
  // Common patterns for lookup field naming
  const possiblePatterns = [
    `_${parentEntity}id_value`, // Standard pattern
    `_parent${parentEntity}id_value`, // Parent prefix pattern
    `_primary${parentEntity}id_value`, // Primary prefix pattern
    `_${parentEntity}_value`, // Without 'id'
    `_${parentEntity.toLowerCase()}id_value`, // Lowercase version
  ]

  // Return the most likely pattern
  const guessedLookupColumn = possiblePatterns[0]

  if (!guessedLookupColumn) {
    return null
  }

  return {
    parentEntity,
    childEntity,
    lookupColumn: guessedLookupColumn,
    relationshipDisplayName: `${parentEntity} lookup`,
    discoveredAt: new Date(),
    confidence: 'low',
    source: 'pattern',
  }
}

/**
 * Get all discovered relationships from cache
 */
export function getDiscoveredRelationships(): DiscoveredRelationship[] {
  const relationships = Array.from(relationshipCache.values())
  
  // Filter out duplicates by creating a unique key for each relationship
  const uniqueRelationships = new Map<string, DiscoveredRelationship>()
  
  relationships.forEach(rel => {
    const key = `${rel.parentEntity}->${rel.childEntity}->${rel.lookupColumn}`
    if (!uniqueRelationships.has(key)) {
      uniqueRelationships.set(key, rel)
    }
  })
  
  return Array.from(uniqueRelationships.values())
}

/**
 * Clear all caches (useful for testing)
 */
export function clearDiscoveryCache(): void {
  metadataCache.clear()
  relationshipCache.clear()
  console.log('🧹 Discovery cache cleared')
}

/**
 * Export discovered relationships as static mappings
 */
export function exportDiscoveredMappings(): string {
  const relationships = getDiscoveredRelationships()
  const mappings = relationships
    .filter(rel => rel.confidence !== 'low') // Only export confident discoveries
    .map(rel => ({
      relationshipName: `${rel.parentEntity}_${rel.childEntity}`,
      lookupColumn: rel.lookupColumn,
      parentEntity: rel.parentEntity,
      childEntity: rel.childEntity,
      description: `${rel.relationshipDisplayName} (discovered ${rel.discoveredAt.toISOString()})`,
    }))

  return `// Auto-generated relationship mappings from runtime discovery
// Generated: ${new Date().toISOString()}

export const DISCOVERED_RELATIONSHIPS = ${JSON.stringify(mappings, null, 2)};`
}
