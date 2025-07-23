/**
 * Relationship Mapper Utility
 * Maps relationship names to correct lookup column syntax for Dataverse queries
 * Enhanced with runtime discovery fallback for custom entities
 */

import { type DiscoveredRelationship, discoverRelationshipMultiStrategy } from './metadataDiscovery'

export interface RelationshipMapping {
  relationshipName: string
  lookupColumn: string
  parentEntity: string
  childEntity: string
  description: string
  isDiscovered?: boolean
  confidence?: 'high' | 'medium' | 'low'
}

/**
 * All relationship mappings are now discovered through metadata API calls
 * No hardcoded mappings - everything is runtime discovery based
 */
export const RELATIONSHIP_MAPPINGS: RelationshipMapping[] = []

/**
 * Map a relationship name to its corresponding lookup column
 * All mappings are now runtime-discovered - no static mappings
 */
export function mapRelationshipToLookupColumn(relationshipName: string): string | null {
  // No static mappings - all are discovered at runtime
  return null
}

/**
 * Map a relationship name to its corresponding lookup column with runtime discovery
 */
export async function mapRelationshipToLookupColumnWithDiscovery(
  relationshipName: string,
  parentEntity?: string,
  childEntity?: string,
  webAPI?: ComponentFramework.WebApi
): Promise<string | null> {
  // Check for environment variable overrides
  const envPageTable = import.meta.env.VITE_PCF_PAGE_TABLE as string
  const envTargetTable = import.meta.env.VITE_PCF_TARGET_TABLE as string
  
  // Use environment variables if available and not already provided
  const resolvedParentEntity = parentEntity || envPageTable
  const resolvedChildEntity = childEntity || envTargetTable
  
  if ((envPageTable || envTargetTable) && (!parentEntity || !childEntity)) {
    console.log(`📋 Using environment variables - Page: ${envPageTable}, Target: ${envTargetTable}`)
  }

  // All mappings are now runtime-discovered through metadata API
  // If we have entity information, try runtime discovery
  if (resolvedParentEntity && resolvedChildEntity && webAPI) {
    console.log(`🔍 Discovering relationship through metadata API: ${relationshipName}...`)

    const discoveredRelationship = await discoverRelationshipMultiStrategy(
      resolvedParentEntity,
      resolvedChildEntity,
      webAPI
    )

    if (discoveredRelationship) {
      // Add the discovered relationship to our static mappings for future use
      addRelationshipMapping({
        relationshipName,
        lookupColumn: discoveredRelationship.lookupColumn,
        parentEntity: discoveredRelationship.parentEntity,
        childEntity: discoveredRelationship.childEntity,
        description: `${discoveredRelationship.relationshipDisplayName} (auto-discovered)`,
        isDiscovered: true,
        confidence: discoveredRelationship.confidence,
      })

      console.log(
        `✅ Runtime discovery successful for ${relationshipName}: ${discoveredRelationship.lookupColumn}`
      )
      return discoveredRelationship.lookupColumn
    }
  }

  console.warn(`⚠️ Could not find lookup column for relationship: ${relationshipName}`)
  return null
}

/**
 * Get all mappings for a specific parent entity
 */
export function getMappingsForParentEntity(parentEntity: string): RelationshipMapping[] {
  return RELATIONSHIP_MAPPINGS.filter(m => m.parentEntity === parentEntity)
}

/**
 * Get all mappings for a specific child entity
 */
export function getMappingsForChildEntity(childEntity: string): RelationshipMapping[] {
  return RELATIONSHIP_MAPPINGS.filter(m => m.childEntity === childEntity)
}

/**
 * Build a relationship filter for OData query
 * Uses the correct lookup column syntax discovered in tests
 */
export function buildRelationshipFilter(
  relationshipName: string,
  parentRecordId: string
): string | null {
  const lookupColumn = mapRelationshipToLookupColumn(relationshipName)

  if (!lookupColumn || !parentRecordId) {
    return null
  }

  // Use the format discovered in tests: field eq guid (no quotes)
  return `${lookupColumn} eq ${parentRecordId}`
}

/**
 * Build a relationship filter with runtime discovery support
 */
export async function buildRelationshipFilterWithDiscovery(
  relationshipName: string,
  parentRecordId: string,
  parentEntity?: string,
  childEntity?: string,
  webAPI?: ComponentFramework.WebApi
): Promise<string | null> {
  const lookupColumn = await mapRelationshipToLookupColumnWithDiscovery(
    relationshipName,
    parentEntity,
    childEntity,
    webAPI
  )

  if (!lookupColumn || !parentRecordId) {
    return null
  }

  // Use the format discovered in tests: field eq guid (no quotes)
  return `${lookupColumn} eq ${parentRecordId}`
}

/**
 * Validate if a relationship mapping exists
 */
export function isKnownRelationship(relationshipName: string): boolean {
  return RELATIONSHIP_MAPPINGS.some(m => m.relationshipName === relationshipName)
}

/**
 * Get suggestions for unknown relationships based on entity names
 */
export function suggestRelationshipMapping(
  parentEntity: string,
  childEntity: string
): RelationshipMapping[] {
  // Return mappings where either entity matches
  return RELATIONSHIP_MAPPINGS.filter(
    m =>
      m.parentEntity === parentEntity ||
      m.childEntity === childEntity ||
      m.parentEntity === childEntity ||
      m.childEntity === parentEntity
  )
}

/**
 * Add a new relationship mapping (for dynamic discovery)
 */
export function addRelationshipMapping(mapping: RelationshipMapping): void {
  // Check if already exists
  const existing = RELATIONSHIP_MAPPINGS.find(m => m.relationshipName === mapping.relationshipName)

  if (existing) {
    console.warn(`Relationship mapping for '${mapping.relationshipName}' already exists`)
    return
  }

  RELATIONSHIP_MAPPINGS.push(mapping)
  console.log(
    `Added new relationship mapping: ${mapping.relationshipName} -> ${mapping.lookupColumn}`
  )
}
