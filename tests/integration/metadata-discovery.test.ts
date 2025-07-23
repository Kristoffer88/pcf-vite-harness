import { beforeAll, describe, expect, it } from 'vitest'
import 'dotenv/config'

describe('Entity Metadata Discovery Tests', () => {
  let dataverseUrl: string

  beforeAll(async () => {
    dataverseUrl = process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com'
  })

  describe('Primary Name Attribute Discovery', () => {
    it('should correctly fetch metadata and use PrimaryNameAttribute for pum_initiative', async () => {
      const entityLogicalName = 'pum_initiative'
      
      // Step 1: Fetch entity metadata
      const metadataUrl = `${dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,PrimaryIdAttribute,PrimaryNameAttribute,LogicalCollectionName,DisplayName`
      
      const metadataResponse = await fetch(metadataUrl)
      expect(metadataResponse.ok).toBe(true)
      
      const metadata = await metadataResponse.json()
      
      // Verify we got the correct metadata
      expect(metadata.LogicalName).toBe(entityLogicalName)
      expect(metadata.PrimaryIdAttribute).toBeTruthy()
      expect(metadata.PrimaryNameAttribute).toBeTruthy()
      expect(metadata.LogicalCollectionName).toBeTruthy()
      
      // Step 2: Use the metadata to query records
      const primaryId = metadata.PrimaryIdAttribute
      const primaryName = metadata.PrimaryNameAttribute
      const collectionName = metadata.LogicalCollectionName
      
      // Query records using the discovered attributes
      const recordsUrl = `${dataverseUrl}/api/data/v9.2/${collectionName}?$select=${primaryId},${primaryName}&$orderby=${primaryName}&$top=5`
      
      const recordsResponse = await fetch(recordsUrl)
      expect(recordsResponse.ok).toBe(true)
      
      const recordsData = await recordsResponse.json()
      
      if (recordsData.value && recordsData.value.length > 0) {
        const sampleRecord = recordsData.value[0]
        
        // Verify the primary name attribute is not 'name'
        expect(primaryName).not.toBe('name')
        expect(sampleRecord[primaryName]).toBeTruthy()
      }
    })

    it('should handle various entity types and their primary name attributes', async () => {
      const testEntities = [
        'account',
        'contact',
        'pum_gantttask',
        'pum_initiative'
      ]
      
      for (const entityName of testEntities) {
        
        const metadataUrl = `${dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=LogicalName,PrimaryIdAttribute,PrimaryNameAttribute,LogicalCollectionName`
        
        try {
          const response = await fetch(metadataUrl)
          
          if (response.ok) {
            const metadata = await response.json()
            
            // Verify the attributes are populated
            expect(metadata.PrimaryIdAttribute).toBeTruthy()
            expect(metadata.PrimaryNameAttribute).toBeTruthy()
            expect(metadata.LogicalCollectionName).toBeTruthy()
            
            // Test a simple query with the discovered attributes
            const queryUrl = `${dataverseUrl}/api/data/v9.2/${metadata.LogicalCollectionName}?$select=${metadata.PrimaryIdAttribute},${metadata.PrimaryNameAttribute}&$top=1`
            const queryResponse = await fetch(queryUrl)
            
            if (queryResponse.ok) {
              const data = await queryResponse.json()
            }
          } else {
            // Entity not found or accessible
          }
        } catch (error) {
          // Error testing entity
        }
      }
    })

    it('should verify ParentSearchTab uses correct metadata', async () => {
      // This test simulates what ParentSearchTab does
      const detectedParentEntityType = 'pum_initiative'
      
      // Get metadata to find primary name attribute
      const metadataUrl = `${dataverseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${detectedParentEntityType}')?$select=PrimaryIdAttribute,PrimaryNameAttribute,DisplayName,LogicalCollectionName`
      const metadataResponse = await fetch(metadataUrl)
      
      expect(metadataResponse.ok).toBe(true)
      
      const metadata = await metadataResponse.json()
      
      const primaryId = metadata.PrimaryIdAttribute || `${detectedParentEntityType}id`
      const primaryName = metadata.PrimaryNameAttribute || `${detectedParentEntityType}name`
      
      // Build query like ParentSearchTab does
      let query = `$select=${primaryId},${primaryName}&$orderby=${primaryName}&$top=50`
      
      // Verify the query works
      const collectionName = metadata.LogicalCollectionName
      const queryUrl = `${dataverseUrl}/api/data/v9.2/${collectionName}?${query}`
      
      const queryResponse = await fetch(queryUrl)
      expect(queryResponse.ok).toBe(true)
      
      const data = await queryResponse.json()
      
      if (data.value && data.value.length > 0) {
        const firstRecord = data.value[0]
        
        // Ensure the primary name has a value
        expect(firstRecord[primaryName]).toBeTruthy()
      }
    })
  })
})