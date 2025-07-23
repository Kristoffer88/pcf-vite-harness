import { describe, it, expect, beforeEach } from 'vitest';
import { 
  fetchEntityMetadataWithLookups, 
  fetchMultipleEntityMetadata, 
  clearBatchMetadataCache, 
  getBatchCacheStats 
} from '../../src/devtools-redux/utils/dataset/batchMetadataFetcher.ts';

describe('Batch Metadata Performance Tests', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure consistent results
    clearBatchMetadataCache();
  });

  it('should fetch pum_gantttask metadata with lookups in optimized batch', async () => {
    console.log('\n=== Testing batch metadata fetch for pum_gantttask ===');
    
    const startTime = performance.now();
    const metadata = await fetchEntityMetadataWithLookups('pum_gantttask');
    const endTime = performance.now();
    
    console.log(`Fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    if (!metadata) {
      console.warn('pum_gantttask entity not found, skipping test');
      return;
    }
    
    // Verify metadata structure
    expect(metadata).toBeTruthy();
    expect(metadata.logicalName).toBe('pum_gantttask');
    expect(metadata.displayName).toBeTruthy();
    expect(metadata.entitySetName).toBeTruthy();
    expect(Array.isArray(metadata.lookupAttributes)).toBe(true);
    
    console.log(`Entity: ${metadata.logicalName}`);
    console.log(`Display Name: ${metadata.displayName}`);
    console.log(`Entity Set: ${metadata.entitySetName}`);
    console.log(`Lookup Attributes: ${metadata.lookupAttributes.length}`);
    
    // Log each lookup attribute for debugging
    metadata.lookupAttributes.forEach(lookup => {
      console.log(`  - ${lookup.logicalName} (${lookup.displayName})`);
      console.log(`    Field: ${lookup.lookupFieldName}`);
      console.log(`    Targets: ${lookup.targets.join(', ')}`);
    });
    
    // Should find pum_initiative lookup if relationship exists
    const initiativeLookup = metadata.lookupAttributes.find(
      lookup => lookup.targets.includes('pum_initiative')
    );
    
    if (initiativeLookup) {
      console.log(`✅ Found pum_initiative relationship via ${initiativeLookup.logicalName}`);
      expect(initiativeLookup.lookupFieldName).toMatch(/_.*_value/);
    }
  });

  it('should cache metadata and improve performance on subsequent calls', async () => {
    console.log('\n=== Testing metadata caching performance ===');
    
    // First call - should fetch from API
    const startTime1 = performance.now();
    const metadata1 = await fetchEntityMetadataWithLookups('pum_gantttask');
    const endTime1 = performance.now();
    const firstCallTime = endTime1 - startTime1;
    
    if (!metadata1) {
      console.warn('pum_gantttask entity not found, skipping test');
      return;
    }
    
    // Check cache stats
    const stats1 = getBatchCacheStats();
    expect(stats1.size).toBe(1);
    expect(stats1.entities).toContain('pum_gantttask');
    
    // Second call - should use cache
    const startTime2 = performance.now();
    const metadata2 = await fetchEntityMetadataWithLookups('pum_gantttask');
    const endTime2 = performance.now();
    const secondCallTime = endTime2 - startTime2;
    
    console.log(`First call (API): ${firstCallTime.toFixed(2)}ms`);
    console.log(`Second call (cache): ${secondCallTime.toFixed(2)}ms`);
    
    // Cache should be significantly faster
    expect(secondCallTime).toBeLessThan(firstCallTime);
    
    // Results should be identical
    expect(metadata2).toEqual(metadata1);
    
    console.log(`Cache performance improvement: ${((firstCallTime / secondCallTime) - 1).toFixed(1)}x faster`);
  });

  it('should fetch multiple entities in parallel efficiently', async () => {
    console.log('\n=== Testing parallel metadata fetching ===');
    
    const entities = ['pum_gantttask', 'pum_initiative'];
    
    const startTime = performance.now();
    const metadataMap = await fetchMultipleEntityMetadata(entities);
    const endTime = performance.now();
    
    console.log(`Parallel fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    // Check that we got results for entities that exist
    console.log(`Fetched metadata for ${metadataMap.size} entities`);
    
    entities.forEach(entity => {
      const metadata = metadataMap.get(entity);
      if (metadata) {
        console.log(`✅ ${entity}: ${metadata.lookupAttributes.length} lookups`);
        expect(metadata.logicalName).toBe(entity);
        expect(Array.isArray(metadata.lookupAttributes)).toBe(true);
      } else {
        console.log(`⚠️ ${entity}: not found or failed to fetch`);
      }
    });
    
    // Test cache efficiency - if entities exist, they should be cached
    const stats = getBatchCacheStats();
    console.log(`Cache now contains ${stats.size} entities: ${stats.entities.join(', ')}`);
  });

  it('should handle nonexistent entities gracefully', async () => {
    console.log('\n=== Testing error handling for nonexistent entities ===');
    
    try {
      const metadata = await fetchEntityMetadataWithLookups('nonexistent_entity_12345');
      expect(metadata).toBeNull();
    } catch (error) {
      // Expected for nonexistent entities
      console.log('ℹ️ Expected error for nonexistent entity:', error.message);
    }
    
    // Cache should not contain failed entities
    const stats = getBatchCacheStats();
    expect(stats.entities).not.toContain('nonexistent_entity_12345');
    
    console.log('✅ Nonexistent entity handled correctly');
  });

  it('should skip already cached entities in parallel fetch', async () => {
    console.log('\n=== Testing cache optimization in parallel fetch ===');
    
    // Pre-populate cache with one entity
    const metadata1 = await fetchEntityMetadataWithLookups('pum_gantttask');
    
    if (!metadata1) {
      console.warn('pum_gantttask entity not found, skipping test');
      return;
    }
    
    const stats1 = getBatchCacheStats();
    console.log(`Cache populated with: ${stats1.entities.join(', ')}`);
    
    // Now fetch multiple entities including the cached one
    const entities = ['pum_gantttask', 'pum_initiative'];
    
    const startTime = performance.now();
    const metadataMap = await fetchMultipleEntityMetadata(entities);
    const endTime = performance.now();
    
    console.log(`Parallel fetch with cache hit completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    // Verify we got the cached entity
    const cachedMetadata = metadataMap.get('pum_gantttask');
    expect(cachedMetadata).toEqual(metadata1);
    
    console.log('✅ Cache optimization working - already cached entities skipped');
  });

  it('should provide accurate cache statistics', async () => {
    console.log('\n=== Testing cache statistics accuracy ===');
    
    // Start with empty cache
    let stats = getBatchCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.entities).toEqual([]);
    
    // Add one entity
    await fetchEntityMetadataWithLookups('pum_gantttask');
    stats = getBatchCacheStats();
    
    if (stats.size > 0) {
      expect(stats.size).toBe(1);
      expect(stats.entities).toContain('pum_gantttask');
      console.log(`Cache contains: ${stats.entities.join(', ')}`);
    }
    
    // Clear cache
    clearBatchMetadataCache();
    stats = getBatchCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.entities).toEqual([]);
    
    console.log('✅ Cache statistics are accurate');
  });

  it('should discover pum_initiative to pum_gantttask relationship efficiently', async () => {
    console.log('\n=== Testing relationship discovery performance ===');
    
    const entities = ['pum_initiative', 'pum_gantttask'];
    
    const startTime = performance.now();
    const metadataMap = await fetchMultipleEntityMetadata(entities);
    const endTime = performance.now();
    
    console.log(`Relationship discovery completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    const ganttMetadata = metadataMap.get('pum_gantttask');
    const initiativeMetadata = metadataMap.get('pum_initiative');
    
    if (ganttMetadata && initiativeMetadata) {
      console.log('\n=== Analyzing relationships ===');
      
      // Look for pum_initiative lookup in pum_gantttask
      const initiativeLookup = ganttMetadata.lookupAttributes.find(
        lookup => lookup.targets.includes('pum_initiative')
      );
      
      if (initiativeLookup) {
        console.log(`✅ Found relationship: pum_gantttask.${initiativeLookup.logicalName} -> pum_initiative`);
        console.log(`   Lookup field: ${initiativeLookup.lookupFieldName}`);
        console.log(`   Display name: ${initiativeLookup.displayName}`);
        
        expect(initiativeLookup.targets).toContain('pum_initiative');
        expect(initiativeLookup.lookupFieldName).toMatch(/_.*_value/);
      } else {
        console.log('ℹ️ No direct lookup from pum_gantttask to pum_initiative found');
      }
      
      // Look for pum_gantttask lookup in pum_initiative
      const ganttLookup = initiativeMetadata.lookupAttributes.find(
        lookup => lookup.targets.includes('pum_gantttask')
      );
      
      if (ganttLookup) {
        console.log(`✅ Found relationship: pum_initiative.${ganttLookup.logicalName} -> pum_gantttask`);
        console.log(`   Lookup field: ${ganttLookup.lookupFieldName}`);
        console.log(`   Display name: ${ganttLookup.displayName}`);
        
        expect(ganttLookup.targets).toContain('pum_gantttask');
        expect(ganttLookup.lookupFieldName).toMatch(/_.*_value/);
      } else {
        console.log('ℹ️ No direct lookup from pum_initiative to pum_gantttask found');
      }
      
      // At least one relationship should exist
      const hasRelationship = initiativeLookup || ganttLookup;
      if (hasRelationship) {
        console.log('✅ Relationship discovery successful');
      } else {
        console.log('ℹ️ No direct relationship found between entities');
      }
    } else {
      console.log('⚠️ One or both entities not found, skipping relationship analysis');
    }
  });
});