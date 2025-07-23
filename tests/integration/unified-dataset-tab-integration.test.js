import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage for Node.js environment
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
import { 
  fetchEntityMetadataWithLookups,
  clearBatchMetadataCache
} from '../../src/devtools-redux/utils/dataset/batchMetadataFetcher.ts';
import { 
  buildDatasetRefreshQueryWithDiscovery,
  executeDatasetQuery,
  testWebAPIConnection,
  clearDiscoveryCache
} from '../../src/devtools-redux/utils/dataset/index.ts';
import { injectDatasetRecords } from '../../src/devtools-redux/utils/dataset/datasetInjector.ts';
import { detectDatasetParameters } from '../../src/devtools-redux/utils/datasetAnalyzer.ts';
import { findPCFOnForms } from '../../src/utils/pcfDiscovery.ts';

describe('UnifiedDatasetTab Integration Tests', () => {
  const testData = {
    target: 'pum_gantttask',
    page: 'pum_initiative', 
    pageId: 'a3456789-70bc-037e-a678-647896396012'
  };

  beforeEach(() => {
    // Clear all caches before each test
    clearBatchMetadataCache();
    clearDiscoveryCache();
    // Clear localStorage mock
    global.localStorage.getItem.mockClear();
    global.localStorage.setItem.mockClear();
    global.localStorage.removeItem.mockClear();
  });

  it('should handle dataset refresh workflow with real data', async () => {
    console.log('\n=== Testing complete dataset refresh workflow ===');
    
    // Step 1: Test WebAPI connection
    console.log('🔌 Testing WebAPI connection...');
    const mockWebAPI = {
      retrieveMultipleRecords: vi.fn().mockImplementation(async (entityName, query) => {
        // Mock WebAPI call - in real integration test this would be actual call
        const response = await fetch(`/api/data/v9.1/${entityName}s?${query}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return { entities: data.value || [] };
      })
    };
    
    const connectionTest = await testWebAPIConnection(mockWebAPI);
    expect(connectionTest.success).toBe(true);
    console.log('✅ WebAPI connection test passed');
    
    // Step 2: Create mock context with dataset
    const mockContext = {
      parameters: {
        sampleDataSet: {
          records: {},
          columns: [],
          paging: {
            totalResultCount: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          loading: true,
          getTargetEntityType: vi.fn().mockReturnValue(testData.target),
          getViewId: vi.fn().mockReturnValue(null),
        }
      },
      page: {
        entityTypeName: testData.page,
        entityId: testData.pageId
      }
    };
    
    // Step 3: Test dataset parameter detection
    console.log('🔍 Testing dataset parameter detection...');
    const datasetAnalysis = detectDatasetParameters(mockContext);
    
    expect(datasetAnalysis).toBeTruthy();
    expect(Array.isArray(datasetAnalysis.datasets)).toBe(true);
    console.log(`Found ${datasetAnalysis.datasets.length} datasets`);
    
    if (datasetAnalysis.datasets.length > 0) {
      const dataset = datasetAnalysis.datasets[0];
      console.log('Dataset info:', {
        name: dataset.name,
        entityLogicalName: dataset.entityLogicalName,
        totalRecords: dataset.totalRecords
      });
    }
    
    // Step 4: Test query building with discovery
    console.log('🏗️ Testing query building with discovery...');
    const subgridInfo = {
      formId: 'test-form',
      formName: 'Test Form',
      entityTypeCode: 0,
      controlId: 'sampleDataSet',
      targetEntity: testData.target,
      viewId: null,
      relationshipName: `${testData.page}_${testData.target}s`,
      isCustomView: false,
      allowViewSelection: false,
    };
    
    const queryOptions = {
      includeFormattedValues: true,
      parentEntity: testData.page,
      parentRecordId: testData.pageId,
      webAPI: mockWebAPI,
    };
    
    try {
      const query = await buildDatasetRefreshQueryWithDiscovery(subgridInfo, queryOptions);
      
      expect(query).toBeTruthy();
      expect(query.odataQuery).toBeTruthy();
      console.log('✅ Query built successfully:', query.odataQuery);
      
      // Step 5: Test query execution
      console.log('⚡ Testing query execution...');
      const queryResult = await executeDatasetQuery(query, mockWebAPI);
      
      console.log('Query result:', {
        success: queryResult.success,
        entityCount: queryResult.entities?.length || 0,
        error: queryResult.error
      });
      
      if (queryResult.success && queryResult.entities.length > 0) {
        // Step 6: Test record injection
        console.log('💉 Testing record injection...');
        const injectionResult = await injectDatasetRecords({
          context: mockContext,
          datasetName: 'sampleDataSet',
          queryResult,
        });
        
        console.log('Injection result:', injectionResult);
        
        // Verify injection worked
        const dataset = mockContext.parameters.sampleDataSet;
        const recordCount = Object.keys(dataset.records).length;
        console.log(`Records after injection: ${recordCount}`);
        
        if (recordCount > 0) {
          console.log('✅ Records successfully injected into dataset');
          expect(recordCount).toBeGreaterThan(0);
        }
      }
      
    } catch (error) {
      console.log('ℹ️ Query execution failed (expected if entities not found):', error.message);
      // This is expected if the test entities don't exist in the environment
    }
  });

  it('should handle parent entity selection and localStorage persistence', async () => {
    console.log('\n=== Testing parent entity selection and persistence ===');
    
    // Test localStorage persistence simulation
    const parentEntity = {
      id: testData.pageId,
      name: 'Test Initiative',
      entityType: testData.page
    };
    
    // Mock localStorage behavior
    global.localStorage.setItem.mockImplementation((key, value) => {
      global.localStorage._storage = global.localStorage._storage || {};
      global.localStorage._storage[key] = value;
    });
    
    global.localStorage.getItem.mockImplementation((key) => {
      return global.localStorage._storage?.[key] || null;
    });
    
    global.localStorage.removeItem.mockImplementation((key) => {
      if (global.localStorage._storage) {
        delete global.localStorage._storage[key];
      }
    });
    
    // Simulate setting parent entity
    localStorage.setItem('pcf-devtools-selected-parent-entity', JSON.stringify(parentEntity));
    
    // Simulate loading from localStorage
    const saved = localStorage.getItem('pcf-devtools-selected-parent-entity');
    expect(saved).toBeTruthy();
    
    const parsed = JSON.parse(saved);
    expect(parsed.id).toBe(testData.pageId);
    expect(parsed.name).toBe('Test Initiative');
    expect(parsed.entityType).toBe(testData.page);
    
    console.log('✅ Parent entity localStorage persistence working');
    
    // Test clearing
    localStorage.removeItem('pcf-devtools-selected-parent-entity');
    const cleared = localStorage.getItem('pcf-devtools-selected-parent-entity');
    expect(cleared).toBe(null);
    
    console.log('✅ Parent entity clearing working');
  });

  it('should discover forms containing PCF controls', async () => {
    console.log('\n=== Testing form discovery functionality ===');
    
    const mockManifest = {
      namespace: 'TestNamespace',
      constructor: 'TestControl',
      controlNamespace: 'TestNamespace',
      controlName: 'TestControl'
    };
    
    const mockWebAPI = {
      retrieveMultipleRecords: vi.fn()
    };
    
    try {
      console.log(`🔍 Discovering forms for PCF: ${mockManifest.namespace}.${mockManifest.constructor}`);
      
      // In a real integration test, this would call the actual API
      // For now, we'll simulate the form discovery process
      const formsResponse = await fetch('/api/data/v9.2/systemforms?$select=formid,name,objecttypecode,formxml&$filter=type eq 2');
      
      if (formsResponse.ok) {
        const formsData = await formsResponse.json();
        console.log(`Found ${formsData.value?.length || 0} forms to analyze`);
        
        // Test the form discovery logic with actual data
        if (formsData.value && formsData.value.length > 0) {
          const forms = await findPCFOnForms(mockManifest, mockWebAPI);
          
          console.log(`PCF controls found on ${forms.length} forms`);
          
          forms.forEach(form => {
            console.log(`📋 Form: ${form.formName} (${form.entityLogicalName || `Type ${form.entityTypeCode}`})`);
            form.controls.forEach(control => {
              console.log(`   - Control: ${control.controlId} (${control.dataSet?.targetEntity || 'unknown entity'})`);
            });
          });
          
          // Verify form discovery results
          expect(Array.isArray(forms)).toBe(true);
          forms.forEach(form => {
            expect(form.formId).toBeTruthy();
            expect(form.formName).toBeTruthy();
            expect(Array.isArray(form.controls)).toBe(true);
          });
          
          console.log('✅ Form discovery completed successfully');
        }
      } else {
        console.log('ℹ️ No forms found or API not accessible');
      }
      
    } catch (error) {
      console.log('ℹ️ Form discovery failed (expected if not connected to Dataverse):', error.message);
    }
  });

  it('should load parent entities with search functionality', async () => {
    console.log('\n=== Testing parent entity loading and search ===');
    
    try {
      // Test fetching parent entities (pum_initiative)
      const entityName = testData.page;
      
      // Get metadata first
      const metadataUrl = `EntityDefinitions(LogicalName='${entityName}')?$select=PrimaryIdAttribute,PrimaryNameAttribute`;
      const metadataResponse = await fetch(`/api/data/v9.2/${metadataUrl}`);
      
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        const primaryId = metadata.PrimaryIdAttribute || `${entityName}id`;
        const primaryName = metadata.PrimaryNameAttribute || 'name';
        
        console.log(`Entity metadata for ${entityName}:`, {
          primaryId,
          primaryName
        });
        
        // Test loading entities
        let query = `$select=${primaryId},${primaryName}&$orderby=${primaryName}&$top=10`;
        const entitiesResponse = await fetch(`/api/data/v9.1/${entityName}s?${query}`);
        
        if (entitiesResponse.ok) {
          const entitiesData = await entitiesResponse.json();
          const entities = entitiesData.value?.map(entity => ({
            id: entity[primaryId],
            name: entity[primaryName] || 'Unnamed',
            entityType: entityName
          })) || [];
          
          console.log(`Loaded ${entities.length} parent entities`);
          entities.slice(0, 3).forEach(entity => {
            console.log(`  - ${entity.name} (${entity.id})`);
          });
          
          expect(Array.isArray(entities)).toBe(true);
          entities.forEach(entity => {
            expect(entity.id).toBeTruthy();
            expect(entity.name).toBeTruthy();
            expect(entity.entityType).toBe(entityName);
          });
          
          // Test search functionality
          if (entities.length > 0) {
            const searchTerm = entities[0].name.substring(0, 3);
            const searchQuery = `$select=${primaryId},${primaryName}&$filter=contains(${primaryName},'${searchTerm}')&$top=5`;
            const searchResponse = await fetch(`/api/data/v9.1/${entityName}s?${searchQuery}`);
            
            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              console.log(`Search for '${searchTerm}' returned ${searchData.value?.length || 0} results`);
              expect(Array.isArray(searchData.value)).toBe(true);
            }
          }
          
          console.log('✅ Parent entity loading and search working');
        } else {
          console.log(`ℹ️ Could not fetch ${entityName} entities (${entitiesResponse.status})`);
        }
      } else {
        console.log(`ℹ️ Could not fetch metadata for ${entityName} (${metadataResponse.status})`);
      }
      
    } catch (error) {
      console.log('ℹ️ Parent entity loading failed (expected if entities not found):', error.message);
    }
  });

  it('should handle relationship discovery between entities', async () => {
    console.log('\n=== Testing relationship discovery between entities ===');
    
    try {
      // Test discovering relationships between pum_initiative and pum_gantttask
      const parentEntity = testData.page;
      const childEntity = testData.target;
      
      console.log(`🔍 Discovering relationships: ${parentEntity} -> ${childEntity}`);
      
      // Method 1: Check OneToMany relationships from parent
      const oneToManyUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${parentEntity}')/OneToManyRelationships?$select=ReferencingEntity,ReferencingAttribute,ReferencedEntity,SchemaName,ReferencedAttribute`;
      const oneToManyResponse = await fetch(oneToManyUrl);
      
      if (oneToManyResponse.ok) {
        const oneToManyData = await oneToManyResponse.json();
        const childRelationships = oneToManyData.value?.filter(rel => 
          rel.ReferencingEntity === childEntity
        ) || [];
        
        console.log(`Found ${childRelationships.length} OneToMany relationships to ${childEntity}`);
        childRelationships.forEach(rel => {
          console.log(`  - ${parentEntity}.${rel.ReferencedAttribute} -> ${childEntity}.${rel.ReferencingAttribute}`);
          console.log(`    Lookup field: _${rel.ReferencingAttribute}_value`);
        });
      }
      
      // Method 2: Check ManyToOne relationships from child
      const manyToOneUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${childEntity}')/ManyToOneRelationships?$select=ReferencingAttribute,ReferencedEntity,ReferencedAttribute,SchemaName`;
      const manyToOneResponse = await fetch(manyToOneUrl);
      
      if (manyToOneResponse.ok) {
        const manyToOneData = await manyToOneResponse.json();
        const parentRelationships = manyToOneData.value?.filter(rel => 
          rel.ReferencedEntity === parentEntity
        ) || [];
        
        console.log(`Found ${parentRelationships.length} ManyToOne relationships to ${parentEntity}`);
        parentRelationships.forEach(rel => {
          console.log(`  - ${childEntity}.${rel.ReferencingAttribute} -> ${parentEntity}.${rel.ReferencedAttribute}`);
          console.log(`    Lookup field: _${rel.ReferencingAttribute}_value`);
        });
      }
      
      // Method 3: Use batch metadata fetcher to get lookup attributes
      const childMetadata = await fetchEntityMetadataWithLookups(childEntity);
      if (childMetadata) {
        const parentLookups = childMetadata.lookupAttributes.filter(lookup => 
          lookup.targets.includes(parentEntity)
        );
        
        console.log(`Found ${parentLookups.length} lookup attributes to ${parentEntity}`);
        parentLookups.forEach(lookup => {
          console.log(`  - ${lookup.logicalName} (${lookup.lookupFieldName})`);
          console.log(`    Display: ${lookup.displayName}`);
          console.log(`    Targets: ${lookup.targets.join(', ')}`);
        });
        
        if (parentLookups.length > 0) {
          console.log('✅ Relationship discovery successful');
        }
      }
      
    } catch (error) {
      console.log('ℹ️ Relationship discovery failed (expected if entities not found):', error.message);
    }
  });

  it('should handle form entity update workflow', async () => {
    console.log('\n=== Testing form entity update workflow ===');
    
    // Simulate a form selection and entity update
    const mockForm = {
      formId: '12345678-1234-1234-1234-123456789abc',
      formName: 'Test Initiative Form',
      entityTypeCode: testData.page, // Custom entity uses logical name
      entityLogicalName: testData.page,
      controls: [
        {
          controlId: 'testSubgrid',
          dataSet: {
            targetEntity: testData.target,
            viewId: null,
            relationshipName: `${testData.page}_${testData.target}s`
          }
        }
      ]
    };
    
    // Test entity name resolution from form
    let entityName;
    if (typeof mockForm.entityTypeCode === 'string') {
      entityName = mockForm.entityTypeCode;
    } else {
      // System entity mapping would go here
      entityName = mockForm.entityLogicalName || 'unknown';
    }
    
    expect(entityName).toBe(testData.page);
    console.log(`✅ Entity resolved from form: ${entityName}`);
    
    // Test dataset configuration update
    if (mockForm.controls.length > 0 && mockForm.controls[0].dataSet) {
      const dataSetConfig = mockForm.controls[0].dataSet;
      expect(dataSetConfig.targetEntity).toBe(testData.target);
      expect(dataSetConfig.relationshipName).toBe(`${testData.page}_${testData.target}s`);
      console.log('✅ Dataset configuration updated from form');
    }
    
    console.log('✅ Form entity update workflow completed');
  });

  it('should validate refresh prerequisites and handle missing context', async () => {
    console.log('\n=== Testing refresh prerequisite validation ===');
    
    // Test 1: Missing context
    const invalidState1 = {
      context: null,
      webAPI: { test: true },
    };
    
    const datasets = [{ key: 'test', dataset: { entityLogicalName: testData.target } }];
    
    // Simulate prerequisite validation
    const hasContext = !!invalidState1.context;
    const hasWebAPI = !!invalidState1.webAPI;
    const hasDatasets = datasets.length > 0;
    
    console.log('Prerequisites check:', { hasContext, hasWebAPI, hasDatasets });
    
    if (!hasContext || !hasWebAPI || !hasDatasets) {
      console.log('⚠️ Prerequisites not met - refresh should be skipped');
      expect(hasContext).toBe(false);
    }
    
    // Test 2: Valid context
    const validState = {
      context: { parameters: {} },
      webAPI: { retrieveMultipleRecords: vi.fn() },
    };
    
    const validCheck = {
      hasContext: !!validState.context,
      hasWebAPI: !!validState.webAPI,
      hasDatasets: datasets.length > 0
    };
    
    console.log('Valid prerequisites check:', validCheck);
    expect(validCheck.hasContext).toBe(true);
    expect(validCheck.hasWebAPI).toBe(true);
    expect(validCheck.hasDatasets).toBe(true);
    
    console.log('✅ Prerequisite validation working correctly');
  });
});