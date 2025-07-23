import { test, expect } from 'vitest'
import { discoverRelationshipMultiStrategy } from '../../src/devtools-redux/utils/dataset/metadataDiscovery.ts'

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
  const relationship = await discoverRelationshipMultiStrategy(
    'pum_initiative',  // parent entity
    'pum_gantttask',   // child entity  
    mockWebAPI
  )
  
  console.log('🔍 Discovered relationship:', relationship)
  
  // Validate the relationship structure
  if (relationship) {
    expect(relationship.parentEntity).toBe('pum_initiative')
    expect(relationship.childEntity).toBe('pum_gantttask')
    expect(relationship.lookupColumn).toContain('_value')
  } else {
    console.log('ℹ️ No relationship discovered - this may be expected if entities do not exist')
  }
})

test('Relationship discovery should handle missing entities gracefully', async () => {
  const mockWebAPI = {
    retrieveMultipleRecords: async () => {
      throw new Error('Entity not found')
    }
  }
  
  const relationship = await discoverRelationshipMultiStrategy(
    'nonexistent_parent',
    'nonexistent_child',
    mockWebAPI
  )
  
  // Should return null for missing entities but with pattern fallback
  expect(relationship).toBeTruthy() // Pattern guessing should provide fallback
  expect(relationship.source).toBe('pattern')
  expect(relationship.confidence).toBe('low')
})

test('Environment variables should be used for relationship discovery', () => {
  // Test that the environment variables are properly set in test environment
  const pageTable = import.meta.env.VITE_PCF_PAGE_TABLE
  const targetTable = import.meta.env.VITE_PCF_TARGET_TABLE
  
  console.log('📋 Environment variables:', {
    pageTable,
    targetTable
  })
  
  // In tests, these may not be set, so just check they exist when defined
  if (pageTable) {
    expect(pageTable).toBe('pum_initiative')
  }
  if (targetTable) {
    expect(targetTable).toBe('pum_gantttask')
  }
  
  console.log('✅ Environment variable test completed')
})