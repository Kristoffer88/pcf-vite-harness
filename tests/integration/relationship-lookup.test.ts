/**
 * Integration tests for relationship lookup functionality
 * Tests the new Step3 filtering based on parent table relationships
 */

import { describe, it, expect } from 'vitest'
import { 
  getEntitiesWithLookupsToParent, 
  getRelationshipBetweenEntities,
  type EntityInfo,
  type RelationshipInfo
} from '../../src/utils/viewDiscovery'

describe('Relationship Lookup Functionality', () => {
  describe('getEntitiesWithLookupsToParent', () => {
    it('should find entities that have lookup relationships to account', async () => {
      // Account is a common parent entity that many entities reference
      const relatedEntities = await getEntitiesWithLookupsToParent('account')
      
      expect(relatedEntities).toBeInstanceOf(Array)
      expect(relatedEntities.length).toBeGreaterThan(0)
      
      // Verify structure of returned entities
      relatedEntities.forEach((entity: EntityInfo) => {
        expect(entity).toHaveProperty('logicalName')
        expect(entity).toHaveProperty('displayName')
        expect(entity).toHaveProperty('displayText')
        expect(typeof entity.logicalName).toBe('string')
        expect(typeof entity.displayName).toBe('string')
        expect(typeof entity.displayText).toBe('string')
      })
      
      // Common entities that should have lookups to account
      const logicalNames = relatedEntities.map(e => e.logicalName)
      
      // Contact typically has a lookup to account (parentcustomerid)
      const hasContact = logicalNames.includes('contact')
      const hasOpportunity = logicalNames.includes('opportunity')
      
      // At least one of these common relationships should exist
      expect(hasContact || hasOpportunity).toBe(true)
      
      console.log(`✅ Found ${relatedEntities.length} entities with lookups to account:`, 
                  logicalNames.slice(0, 5)) // Log first 5
    })

    it('should find entities that have lookup relationships to contact', async () => {
      const relatedEntities = await getEntitiesWithLookupsToParent('contact')
      
      expect(relatedEntities).toBeInstanceOf(Array)
      // Contact may have fewer child relationships than account, but should have at least some
      
      relatedEntities.forEach((entity: EntityInfo) => {
        expect(entity).toHaveProperty('logicalName')
        expect(entity).toHaveProperty('displayName')
        expect(entity).toHaveProperty('displayText')
      })
      
      console.log(`✅ Found ${relatedEntities.length} entities with lookups to contact`)
    })

    it('should return empty array for non-existent entity', async () => {
      const relatedEntities = await getEntitiesWithLookupsToParent('nonexistententity123')
      
      expect(relatedEntities).toBeInstanceOf(Array)
      expect(relatedEntities.length).toBe(0)
    })

    it('should handle entity with no child relationships gracefully', async () => {
      // Try with an entity that's less likely to have child relationships
      const relatedEntities = await getEntitiesWithLookupsToParent('systemuser')
      
      expect(relatedEntities).toBeInstanceOf(Array)
      // systemuser might have some child relationships, but could be empty
      
      console.log(`✅ Found ${relatedEntities.length} entities with lookups to systemuser`)
    })
  })

  describe('getRelationshipBetweenEntities', () => {
    it('should find relationship between account and contact', async () => {
      // Contact typically has a parentcustomerid lookup to account
      const relationships = await getRelationshipBetweenEntities('account', 'contact')
      
      expect(relationships).toBeInstanceOf(Array)
      
      if (relationships.length > 0) {
        relationships.forEach((relationship: RelationshipInfo) => {
          expect(relationship).toHaveProperty('schemaName')
          expect(relationship).toHaveProperty('relationshipType')
          expect(relationship).toHaveProperty('referencingEntity')
          expect(relationship).toHaveProperty('referencedEntity')
          expect(relationship).toHaveProperty('referencingAttribute')
          expect(relationship).toHaveProperty('referencedAttribute')
          expect(relationship).toHaveProperty('lookupFieldName')
          
          expect(relationship.relationshipType).toBe('OneToMany')
          expect(relationship.referencedEntity).toBe('account')
          expect(relationship.referencingEntity).toBe('contact')
        })
        
        console.log(`✅ Found ${relationships.length} relationships between account and contact:`,
                   relationships[0].schemaName)
      }
    })

    it('should find relationship between account and opportunity', async () => {
      const relationships = await getRelationshipBetweenEntities('account', 'opportunity')
      
      expect(relationships).toBeInstanceOf(Array)
      
      if (relationships.length > 0) {
        relationships.forEach((relationship: RelationshipInfo) => {
          expect(relationship.relationshipType).toBe('OneToMany')
          expect(relationship.referencedEntity).toBe('account')
          expect(relationship.referencingEntity).toBe('opportunity')
        })
        
        console.log(`✅ Found ${relationships.length} relationships between account and opportunity`)
      }
    })

    it('should return empty array for entities with no relationship', async () => {
      // Try two entities that are unlikely to have a direct relationship
      const relationships = await getRelationshipBetweenEntities('account', 'systemuser')
      
      expect(relationships).toBeInstanceOf(Array)
      // This might be empty or have some relationships, depends on the org
      
      console.log(`✅ Found ${relationships.length} relationships between account and systemuser`)
    })

    it('should handle non-existent entities gracefully', async () => {
      const relationships = await getRelationshipBetweenEntities('nonexistent1', 'nonexistent2')
      
      expect(relationships).toBeInstanceOf(Array)
      expect(relationships.length).toBe(0)
    })
  })

  describe('Integration: Step3 Filtering Logic', () => {
    it('should demonstrate the complete filtering workflow', async () => {
      // Simulate the Step3 workflow: user selected account as page table
      const pageTable = 'account'
      
      // 1. Get all entities with lookups to account
      const relatedEntities = await getEntitiesWithLookupsToParent(pageTable)
      
      expect(relatedEntities).toBeInstanceOf(Array)
      console.log(`📊 Step 1: Found ${relatedEntities.length} entities with lookups to ${pageTable}`)
      
      if (relatedEntities.length > 0) {
        // 2. User could select one of these entities as target
        const targetEntity = relatedEntities[0] // Take first one for testing
        
        // 3. Get the specific relationship details
        const relationships = await getRelationshipBetweenEntities(pageTable, targetEntity.logicalName)
        
        expect(relationships).toBeInstanceOf(Array)
        console.log(`📊 Step 2: Found ${relationships.length} relationships between ${pageTable} and ${targetEntity.logicalName}`)
        
        if (relationships.length > 0) {
          const relationship = relationships[0]
          console.log(`📊 Step 3: Relationship details:`)
          console.log(`  - Schema Name: ${relationship.schemaName}`)
          console.log(`  - Lookup Field: ${relationship.lookupFieldName}`)
          console.log(`  - Referencing Attribute: ${relationship.referencingAttribute}`)
          
          // Verify the relationship makes sense
          expect(relationship.referencedEntity).toBe(pageTable)
          expect(relationship.referencingEntity).toBe(targetEntity.logicalName)
        }
      }
    })
  })
})