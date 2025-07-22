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
 * Known relationship mappings discovered through testing
 * Key insight: Contact -> Account uses '_parentcustomerid_value' NOT '_parentaccountid_value'
 */
export const RELATIONSHIP_MAPPINGS: RelationshipMapping[] = [
  {
    relationshipName: 'account_contact',
    lookupColumn: '_parentcustomerid_value',
    parentEntity: 'account',
    childEntity: 'contact',
    description: 'Contacts related to an Account',
  },
  {
    relationshipName: 'contact_account',
    lookupColumn: '_parentcustomerid_value',
    parentEntity: 'account',
    childEntity: 'contact',
    description: 'Account parent of Contact',
  },
  // Add more mappings as they are discovered
]

/**
 * Map a relationship name to its corresponding lookup column
 * Enhanced with runtime discovery fallback
 */
export function mapRelationshipToLookupColumn(relationshipName: string): string | null {
  const mapping = RELATIONSHIP_MAPPINGS.find(m => m.relationshipName === relationshipName)
  return mapping?.lookupColumn || null
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
  // First try static mapping
  const staticMapping = mapRelationshipToLookupColumn(relationshipName)
  if (staticMapping) {
    console.log(`✅ Found static mapping for ${relationshipName}: ${staticMapping}`)
    return staticMapping
  }

  // If no static mapping and we have entity information, try runtime discovery
  if (parentEntity && childEntity && webAPI) {
    console.log(`🔍 No static mapping found for ${relationshipName}, trying runtime discovery...`)

    const discoveredRelationship = await discoverRelationshipMultiStrategy(
      parentEntity,
      childEntity,
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
