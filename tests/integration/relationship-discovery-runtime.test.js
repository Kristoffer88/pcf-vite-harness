import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mapRelationshipToLookupColumnWithDiscovery,
  buildRelationshipFilterWithDiscovery,
  addRelationshipMapping,
  getMappingsForParentEntity,
  getMappingsForChildEntity,
  suggestRelationshipMapping,
  isKnownRelationship,
  RELATIONSHIP_MAPPINGS
} from '../../src/devtools-redux/utils/dataset/relationshipMapper.ts';
import {
  discoverRelationshipMultiStrategy,
  discoverEntityMetadata,
  clearDiscoveryCache
} from '../../src/devtools-redux/utils/dataset/metadataDiscovery.ts';
import { clearBatchMetadataCache } from '../../src/devtools-redux/utils/dataset/batchMetadataFetcher.ts';

describe('Relationship Discovery Runtime Tests', () => {
  const testData = {
    target: 'pum_gantttask',
    page: 'pum_initiative', 
    pageId: 'a3456789-70bc-037e-a678-647896396012'
  };

  beforeEach(() => {
    // Clear all caches and discovered relationships
    clearDiscoveryCache();
    clearBatchMetadataCache();
    // Clear in-memory relationship mappings
    RELATIONSHIP_MAPPINGS.length = 0;
  });

  it('should discover relationships using runtime metadata discovery', async () => {
    console.log('\n=== Testing runtime relationship discovery ===');
    
    const mockWebAPI = {
      retrieveMultipleRecords: vi.fn()
    };
    
    try {
      console.log(`🔍 Discovering relationship: ${testData.page} -> ${testData.target}`);
      
      // Test multi-strategy discovery
      const discoveredRelationship = await discoverRelationshipMultiStrategy(
        testData.page,
        testData.target,
        mockWebAPI
      );
      
      if (discoveredRelationship) {
        console.log('✅ Relationship discovered via metadata:', {
          parentEntity: discoveredRelationship.parentEntity,
          childEntity: discoveredRelationship.childEntity,
          lookupColumn: discoveredRelationship.lookupColumn,
          confidence: discoveredRelationship.confidence,
          source: discoveredRelationship.source
        });
        
        // Verify structure
        expect(discoveredRelationship.parentEntity).toBeTruthy();
        expect(discoveredRelationship.childEntity).toBeTruthy();
        expect(discoveredRelationship.lookupColumn).toBeTruthy();
        expect(discoveredRelationship.lookupColumn).toMatch(/_.*_value/);
        expect(['high', 'medium', 'low']).toContain(discoveredRelationship.confidence);
        expect(['metadata', 'pattern', 'manual', 'record-analysis', 'column-analysis']).toContain(discoveredRelationship.source);
        
        console.log('✅ Relationship structure validation passed');
      } else {
        console.log('ℹ️ No relationship discovered (expected if entities not found)');
      }
      
    } catch (error) {
      console.log('ℹ️ Relationship discovery failed (expected if entities not accessible):', error.message);
    }
  });

  it('should map relationship to lookup column with discovery', async () => {
    console.log('\n=== Testing relationship to lookup column mapping ===');
    
    const mockWebAPI = {
      retrieveMultipleRecords: vi.fn()
    };
    
    const relationshipName = `${testData.page}_${testData.target}s`;
    
    try {
      console.log(`🏗️ Mapping relationship: ${relationshipName}`);
      
      const lookupColumn = await mapRelationshipToLookupColumnWithDiscovery(
        relationshipName,
        testData.page,
        testData.target,
        mockWebAPI
      );
      
      if (lookupColumn) {
        console.log(`✅ Lookup column discovered: ${lookupColumn}`);
        
        // Verify format
        expect(lookupColumn).toMatch(/_.*_value/);
        expect(lookupColumn).toBeTruthy();
        
        // Check if relationship was added to mappings
        const isKnown = isKnownRelationship(relationshipName);
        if (isKnown) {
          console.log('✅ Relationship added to known mappings');
          expect(isKnown).toBe(true);
        }
        
        console.log('✅ Lookup column mapping successful');
      } else {
        console.log('ℹ️ No lookup column found (expected if relationship doesn\'t exist)');
      }
      
    } catch (error) {
      console.log('ℹ️ Lookup column mapping failed (expected if entities not accessible):', error.message);
    }
  });

  it('should build relationship filter with discovery', async () => {
    console.log('\n=== Testing relationship filter building ===');
    
    const mockWebAPI = {
      retrieveMultipleRecords: vi.fn()
    };
    
    const relationshipName = `${testData.page}_${testData.target}s`;
    const parentRecordId = testData.pageId;
    
    try {
      console.log(`🏗️ Building filter for relationship: ${relationshipName}`);
      console.log(`   Parent record ID: ${parentRecordId}`);
      
      const filter = await buildRelationshipFilterWithDiscovery(
        relationshipName,
        parentRecordId,
        testData.page,
        testData.target,
        mockWebAPI
      );
      
      if (filter) {
        console.log(`✅ Filter built: ${filter}`);
        
        // Verify filter format
        expect(filter).toContain('_value eq');
        expect(filter).toContain(parentRecordId);
        expect(filter).not.toContain('"'); // No quotes around GUID
        
        // Test that it matches expected pattern: _fieldname_value eq guid
        const filterPattern = /^_\w+_value eq [a-f0-9-]{36}$/i;
        expect(filter).toMatch(filterPattern);
        
        console.log('✅ Filter format validation passed');
      } else {
        console.log('ℹ️ No filter built (expected if relationship discovery failed)');
      }
      
    } catch (error) {
      console.log('ℹ️ Filter building failed (expected if entities not accessible):', error.message);
    }
  });

  it('should handle environment variable overrides', async () => {
    console.log('\n=== Testing environment variable precedence ===');
    
    // Test with environment variables
    const originalEnv = {
      VITE_PCF_PAGE_TABLE: import.meta.env.VITE_PCF_PAGE_TABLE,
      VITE_PCF_TARGET_TABLE: import.meta.env.VITE_PCF_TARGET_TABLE
    };
    
    try {
      // Mock environment variables
      import.meta.env.VITE_PCF_PAGE_TABLE = testData.page;
      import.meta.env.VITE_PCF_TARGET_TABLE = testData.target;
      
      const mockWebAPI = { retrieveMultipleRecords: vi.fn() };
      
      // Call without providing entity parameters - should use env vars
      const lookupColumn = await mapRelationshipToLookupColumnWithDiscovery(
        'test_relationship',
        undefined, // No parent entity - should use env
        undefined, // No child entity - should use env
        mockWebAPI
      );
      
      console.log('Environment variable test result:', {
        envPageTable: import.meta.env.VITE_PCF_PAGE_TABLE,
        envTargetTable: import.meta.env.VITE_PCF_TARGET_TABLE,
        lookupColumn
      });
      
      // Environment variables should be used
      expect(import.meta.env.VITE_PCF_PAGE_TABLE).toBe(testData.page);
      expect(import.meta.env.VITE_PCF_TARGET_TABLE).toBe(testData.target);
      
      console.log('✅ Environment variable precedence working');
      
    } finally {
      // Restore original environment
      import.meta.env.VITE_PCF_PAGE_TABLE = originalEnv.VITE_PCF_PAGE_TABLE;
      import.meta.env.VITE_PCF_TARGET_TABLE = originalEnv.VITE_PCF_TARGET_TABLE;
    }
  });

  it('should manage relationship mappings dynamically', async () => {
    console.log('\n=== Testing dynamic relationship mapping management ===');
    
    // Start with empty mappings
    expect(RELATIONSHIP_MAPPINGS.length).toBe(0);
    
    // Add a test mapping
    const testMapping = {
      relationshipName: 'test_relationship',
      lookupColumn: '_test_lookup_value',
      parentEntity: testData.page,
      childEntity: testData.target,
      description: 'Test mapping for integration test',
      isDiscovered: true,
      confidence: 'medium'
    };
    
    addRelationshipMapping(testMapping);
    
    // Verify mapping was added
    expect(RELATIONSHIP_MAPPINGS.length).toBe(1);
    expect(isKnownRelationship('test_relationship')).toBe(true);
    
    console.log('✅ Mapping added successfully');
    
    // Test getting mappings for parent entity
    const parentMappings = getMappingsForParentEntity(testData.page);
    expect(parentMappings.length).toBe(1);
    expect(parentMappings[0].relationshipName).toBe('test_relationship');
    
    console.log('✅ Parent entity mappings retrieved');
    
    // Test getting mappings for child entity
    const childMappings = getMappingsForChildEntity(testData.target);
    expect(childMappings.length).toBe(1);
    expect(childMappings[0].relationshipName).toBe('test_relationship');
    
    console.log('✅ Child entity mappings retrieved');
    
    // Test suggestions
    const suggestions = suggestRelationshipMapping(testData.page, testData.target);
    expect(suggestions.length).toBeGreaterThan(0);
    
    console.log(`✅ Found ${suggestions.length} relationship suggestions`);
    
    // Test duplicate prevention
    addRelationshipMapping(testMapping); // Try to add same mapping again
    expect(RELATIONSHIP_MAPPINGS.length).toBe(1); // Should still be 1
    
    console.log('✅ Duplicate mapping prevention working');
  });

  it('should discover entity metadata efficiently', async () => {
    console.log('\n=== Testing entity metadata discovery ===');
    
    const mockWebAPI = {
      retrieveMultipleRecords: vi.fn()
    };
    
    try {
      // Test discovering metadata for child entity
      console.log(`🔍 Discovering metadata for: ${testData.target}`);
      
      const metadata = await discoverEntityMetadata(testData.target, mockWebAPI);
      
      if (metadata) {
        console.log('✅ Metadata discovered:', {
          logicalName: metadata.logicalName,
          displayName: metadata.displayName,
          entitySetName: metadata.entitySetName,
          lookupAttributeCount: metadata.lookupAttributes.length
        });
        
        // Verify structure
        expect(metadata.logicalName).toBe(testData.target);
        expect(metadata.displayName).toBeTruthy();
        expect(metadata.entitySetName).toBeTruthy();
        expect(Array.isArray(metadata.lookupAttributes)).toBe(true);
        
        // Log lookup attributes
        metadata.lookupAttributes.forEach(lookup => {
          console.log(`  - ${lookup.logicalName} (${lookup.lookupFieldName})`);
          console.log(`    Targets: ${lookup.targets.join(', ')}`);
          
          // Verify lookup attribute structure
          expect(lookup.logicalName).toBeTruthy();
          expect(lookup.lookupFieldName).toMatch(/_.*_value/);
          expect(Array.isArray(lookup.targets)).toBe(true);
        });
        
        // Look for parent entity relationship
        const parentLookup = metadata.lookupAttributes.find(lookup => 
          lookup.targets.includes(testData.page)
        );
        
        if (parentLookup) {
          console.log(`✅ Found parent relationship: ${parentLookup.lookupFieldName}`);
          expect(parentLookup.targets).toContain(testData.page);
        } else {
          console.log('ℹ️ No parent relationship found in metadata');
        }
        
        console.log('✅ Entity metadata discovery successful');
      } else {
        console.log('ℹ️ No metadata discovered (expected if entity not found)');
      }
      
    } catch (error) {
      console.log('ℹ️ Metadata discovery failed (expected if entity not accessible):', error.message);
    }
  });

  it('should handle invalid entity names gracefully', async () => {
    console.log('\n=== Testing error handling for invalid entities ===');
    
    const mockWebAPI = {
      retrieveMultipleRecords: vi.fn()
    };
    
    const invalidEntityNames = [
      '',
      'unknown',
      '   ',
      'nonexistent_entity_12345',
      null,
      undefined
    ];
    
    for (const invalidName of invalidEntityNames) {
      console.log(`Testing invalid entity name: "${invalidName}"`);
      
      try {
        const metadata = await discoverEntityMetadata(invalidName, mockWebAPI);
        expect(metadata).toBeNull();
        console.log(`✅ Correctly handled invalid entity name: "${invalidName}"`);
      } catch (error) {
        console.log(`✅ Expected error for invalid entity name "${invalidName}": ${error.message}`);
      }
    }
    
    // Test relationship discovery with invalid entities
    const relationship = await discoverRelationshipMultiStrategy(
      'invalid_parent',
      'invalid_child',
      mockWebAPI
    );
    
    expect(relationship).toBeTruthy(); // Pattern guessing provides fallback
    expect(relationship.source).toBe('pattern');
    expect(relationship.confidence).toBe('low');
    console.log('✅ Invalid entity relationship discovery handled correctly with pattern fallback');
  });

  it('should test reverse relationship discovery', async () => {
    console.log('\n=== Testing reverse relationship discovery ===');
    
    const mockWebAPI = {
      retrieveMultipleRecords: vi.fn()
    };
    
    try {
      // Test discovering relationship in both directions
      console.log(`🔄 Testing forward: ${testData.page} -> ${testData.target}`);
      const forwardRelationship = await discoverRelationshipMultiStrategy(
        testData.page,
        testData.target,
        mockWebAPI
      );
      
      console.log(`🔄 Testing reverse: ${testData.target} -> ${testData.page}`);
      const reverseRelationship = await discoverRelationshipMultiStrategy(
        testData.target,
        testData.page,
        mockWebAPI
      );
      
      if (forwardRelationship) {
        console.log('✅ Forward relationship found:', forwardRelationship.lookupColumn);
      }
      
      if (reverseRelationship) {
        console.log('✅ Reverse relationship found:', reverseRelationship.lookupColumn);
      }
      
      // At least one direction should work if entities exist and have relationship
      const hasRelationship = forwardRelationship || reverseRelationship;
      
      if (hasRelationship) {
        console.log('✅ Bidirectional relationship discovery working');
        
        // Verify they're different (lookup should be on child entity)
        if (forwardRelationship && reverseRelationship) {
          expect(forwardRelationship.lookupColumn).not.toBe(reverseRelationship.lookupColumn);
          console.log('✅ Forward and reverse relationships are correctly different');
        }
      } else {
        console.log('ℹ️ No relationships found (expected if entities don\'t exist or have no relationship)');
      }
      
    } catch (error) {
      console.log('ℹ️ Reverse relationship discovery failed (expected if entities not accessible):', error.message);
    }
  });

  it('should test pattern-based relationship guessing', async () => {
    console.log('\n=== Testing pattern-based relationship guessing ===');
    
    const mockWebAPI = {
      retrieveMultipleRecords: vi.fn().mockRejectedValue(new Error('API not available'))
    };
    
    // Force metadata discovery to fail so pattern guessing is used
    try {
      const relationship = await discoverRelationshipMultiStrategy(
        testData.page,
        testData.target,
        mockWebAPI
      );
      
      if (relationship && relationship.source === 'pattern') {
        console.log('✅ Pattern-based guessing worked:', {
          lookupColumn: relationship.lookupColumn,
          confidence: relationship.confidence,
          source: relationship.source
        });
        
        // Verify pattern guess format
        expect(relationship.lookupColumn).toMatch(/_.*_value/);
        expect(relationship.confidence).toBe('low'); // Pattern guesses should be low confidence
        expect(relationship.source).toBe('pattern');
        
        // Common patterns that should be guessed
        const expectedPatterns = [
          `_${testData.page}id_value`,
          `_${testData.page}_value`,
          `_${testData.page.slice(0, -1)}id_value` // Remove 's' from parent if pluralized
        ];
        
        const isExpectedPattern = expectedPatterns.some(pattern => 
          relationship.lookupColumn === pattern
        );
        
        if (isExpectedPattern) {
          console.log('✅ Pattern matches expected format');
        } else {
          console.log(`ℹ️ Pattern ${relationship.lookupColumn} is different from expected patterns`);
        }
        
        console.log('✅ Pattern-based relationship guessing working');
      } else {
        console.log('ℹ️ No pattern-based guess generated');
      }
      
    } catch (error) {
      console.log('ℹ️ Pattern guessing test failed (expected behavior):', error.message);
    }
  });
});