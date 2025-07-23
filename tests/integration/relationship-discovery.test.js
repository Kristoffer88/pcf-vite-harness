import { test, expect } from 'vitest'
import { discoverRelationshipMultiStrategy } from '../../src/devtools-redux/utils/dataset/metadataDiscovery.js'

test('Relationship discovery should find pum_initiative -> pum_gantttask relationship', async () => {
  // This test validates that the relationship discovery can find the custom entity relationship
  // between pum_initiative (parent) and pum_gantttask (child)
  
  const mockWebAPI = {
    retrieveMultipleRecords: async (entityLogicalName, options) => {
      console.log(`📡 Mock API call: ${entityLogicalName} with options:`, options)
      
      if (entityLogicalName === 'EntityDefinition') {
        // Mock entity definition response
        return {
          entities: [
            {
              LogicalName: 'pum_gantttask',
              DisplayName: { UserLocalizedLabel: { Label: 'Gantt Task' } },
              EntitySetName: 'pum_gantttasks'
            }
          ]
        }
      }
      
      if (entityLogicalName === 'AttributeDefinition') {
        // Mock attribute definition response - simulate a lookup field
        return {
          entities: [
            {
              LogicalName: 'pum_initiativeid',
              DisplayName: { UserLocalizedLabel: { Label: 'Initiative' } },
              AttributeType: 'Lookup',
              Targets: ['pum_initiative'],
              '@odata.type': '#Microsoft.Dynamics.CRM.LookupAttributeDefinition'
            }
          ]
        }
      }
      
      return { entities: [] }
    }
  }
  
  // Test the relationship discovery
  const relationships = await discoverRelationshipMultiStrategy(
    'pum_initiative',  // parent entity
    'pum_gantttask',   // child entity  
    mockWebAPI
  )
  
  console.log('🔍 Discovered relationships:', relationships)
  
  // Validate that at least one relationship was discovered
  expect(relationships).toBeDefined()
  expect(relationships.length).toBeGreaterThan(0)
  
  // Validate the relationship structure
  const relationship = relationships[0]
  expect(relationship.parentEntity).toBe('pum_initiative')
  expect(relationship.childEntity).toBe('pum_gantttask')
  expect(relationship.lookupColumn).toContain('pum_initiativeid')
})

test('Relationship discovery should handle missing entities gracefully', async () => {
  const mockWebAPI = {
    retrieveMultipleRecords: async () => {
      throw new Error('Entity not found')
    }
  }
  
  const relationships = await discoverRelationshipMultiStrategy(
    'nonexistent_parent',
    'nonexistent_child',
    mockWebAPI
  )
  
  // Should return empty array instead of throwing
  expect(relationships).toBeDefined()
  expect(Array.isArray(relationships)).toBe(true)
})

test('Environment variables should be used for relationship discovery', () => {
  // Test that the environment variables are properly set
  expect(import.meta.env.VITE_PCF_PAGE_TABLE).toBe('pum_initiative')
  expect(import.meta.env.VITE_PCF_TARGET_TABLE).toBe('pum_gantttask')
  
  console.log('✅ Environment variables validated:', {
    pageTable: import.meta.env.VITE_PCF_PAGE_TABLE,
    targetTable: import.meta.env.VITE_PCF_TARGET_TABLE
  })
})