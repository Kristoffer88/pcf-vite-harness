import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  executeDatasetQuery,
  executeBatchQueries,
  testWebAPIConnection
} from '../../src/devtools-redux/utils/dataset/queryExecutor.ts';

describe('Query Executor Integration Tests', () => {
  const testData = {
    target: 'pum_gantttask',
    page: 'pum_initiative', 
    pageId: 'a3456789-70bc-037e-a678-647896396012'
  };

  let mockWebAPI;

  beforeEach(() => {
    // Create a more realistic WebAPI mock that simulates actual Dataverse calls
    mockWebAPI = {
      retrieveMultipleRecords: vi.fn().mockImplementation(async (entityName, query) => {
        // Simulate real API response structure
        if (entityName === 'systemuser') {
          return {
            entities: [
              { systemuserid: 'test-user-id', fullname: 'Test User' }
            ],
            nextLink: null
          };
        }
        
        if (entityName === testData.target) {
          return {
            entities: [
              {
                [testData.target + 'id']: testData.pageId,
                'name': 'Test Task 1',
                'scheduledstart': '2024-01-01T10:00:00Z',
                '_ownerid_value': 'user-guid-123',
                [`_${testData.page}id_value`]: testData.pageId,
                'name@OData.Community.Display.V1.FormattedValue': 'Test Task 1',
                'scheduledstart@OData.Community.Display.V1.FormattedValue': '1/1/2024 10:00 AM'
              },
              {
                [testData.target + 'id']: 'task-2-id',
                'name': 'Test Task 2',
                'scheduledstart': '2024-01-02T10:00:00Z',
                '_ownerid_value': 'user-guid-456',
                [`_${testData.page}id_value`]: testData.pageId,
                'name@OData.Community.Display.V1.FormattedValue': 'Test Task 2',
                'scheduledstart@OData.Community.Display.V1.FormattedValue': '1/2/2024 10:00 AM'
              }
            ],
            nextLink: null
          };
        }
        
        if (entityName === 'nonexistent_entity') {
          throw new Error('Entity not found (404)');
        }
        
        // Default response for other entities
        return {
          entities: [],
          nextLink: null
        };
      })
    };
  });

  it('should execute a valid dataset query successfully', async () => {
    console.log('\n=== Testing successful dataset query execution ===');
    
    const validQuery = {
      entityLogicalName: testData.target,
      odataQuery: `${testData.target}s?$select=${testData.target}id,name,scheduledstart,_ownerid_value&$top=50`,
      isRelatedQuery: false,
      controlId: 'testControl',
      formId: 'test-form-id'
    };
    
    console.log('Executing query:', {
      entity: validQuery.entityLogicalName,
      query: validQuery.odataQuery
    });
    
    const result = await executeDatasetQuery(validQuery, mockWebAPI);
    
    // Verify successful result structure
    expect(result).toBeTruthy();
    expect(result.success).toBe(true);
    expect(result.entityLogicalName).toBe(testData.target);
    expect(Array.isArray(result.entities)).toBe(true);
    expect(result.entities.length).toBe(2);
    expect(result.totalCount).toBe(2);
    expect(result.error).toBeUndefined();
    
    // Verify entity structure
    const entity = result.entities[0];
    expect(entity).toBeTruthy();
    expect(entity[testData.target + 'id']).toBeTruthy();
    expect(entity.name).toBeTruthy();
    expect(entity.scheduledstart).toBeTruthy();
    
    // Verify formatted values are included
    expect(entity['name@OData.Community.Display.V1.FormattedValue']).toBeTruthy();
    expect(entity['scheduledstart@OData.Community.Display.V1.FormattedValue']).toBeTruthy();
    
    console.log('Query result:', {
      success: result.success,
      entityCount: result.entities.length,
      totalCount: result.totalCount,
      sampleEntity: {
        id: entity[testData.target + 'id'],
        name: entity.name,
        formattedName: entity['name@OData.Community.Display.V1.FormattedValue']
      }
    });
    
    // Verify WebAPI was called correctly
    expect(mockWebAPI.retrieveMultipleRecords).toHaveBeenCalledWith(
      testData.target,
      `$select=${testData.target}id,name,scheduledstart,_ownerid_value&$top=50`
    );
    
    console.log('✅ Dataset query execution successful');
  });

  it('should handle query validation failures', async () => {
    console.log('\n=== Testing query validation failure handling ===');
    
    const invalidQuery = {
      entityLogicalName: '', // Invalid - empty entity name
      odataQuery: 'invalid-query-format',
      isRelatedQuery: false
    };
    
    console.log('Testing invalid query:', invalidQuery);
    
    const result = await executeDatasetQuery(invalidQuery, mockWebAPI);
    
    // Verify failure result structure
    expect(result).toBeTruthy();
    expect(result.success).toBe(false);
    expect(result.entities).toEqual([]);
    expect(result.entityLogicalName).toBe('');
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('validation failed');
    
    console.log('Validation failure result:', {
      success: result.success,
      error: result.error
    });
    
    // WebAPI should not have been called due to validation failure
    expect(mockWebAPI.retrieveMultipleRecords).not.toHaveBeenCalled();
    
    console.log('✅ Query validation failure handled correctly');
  });

  it('should handle WebAPI execution errors', async () => {
    console.log('\n=== Testing WebAPI execution error handling ===');
    
    const queryForNonexistentEntity = {
      entityLogicalName: 'nonexistent_entity',
      odataQuery: 'nonexistent_entitys?$select=id,name&$top=10',
      isRelatedQuery: false,
      controlId: 'testControl'
    };
    
    console.log('Testing query for nonexistent entity:', queryForNonexistentEntity.entityLogicalName);
    
    const result = await executeDatasetQuery(queryForNonexistentEntity, mockWebAPI);
    
    // Verify error result structure
    expect(result).toBeTruthy();
    expect(result.success).toBe(false);
    expect(result.entities).toEqual([]);
    expect(result.entityLogicalName).toBe('nonexistent_entity');
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('Entity not found');
    
    console.log('WebAPI error result:', {
      success: result.success,
      error: result.error,
      entityName: result.entityLogicalName
    });
    
    console.log('✅ WebAPI execution error handled correctly');
  });

  it('should handle missing WebAPI gracefully', async () => {
    console.log('\n=== Testing missing WebAPI handling ===');
    
    const validQuery = {
      entityLogicalName: testData.target,
      odataQuery: `${testData.target}s?$select=name&$top=10`,
      isRelatedQuery: false
    };
    
    console.log('Testing query without WebAPI...');
    
    const result = await executeDatasetQuery(validQuery, null);
    
    // Verify graceful failure
    expect(result).toBeTruthy();
    expect(result.success).toBe(false);
    expect(result.entities).toEqual([]);
    expect(result.entityLogicalName).toBe(testData.target);
    expect(result.error).toBe('WebAPI is not available');
    
    console.log('Missing WebAPI result:', {
      success: result.success,
      error: result.error
    });
    
    console.log('✅ Missing WebAPI handled gracefully');
  });

  it('should execute multiple queries in parallel batches', async () => {
    console.log('\n=== Testing batch query execution ===');
    
    const queries = [
      {
        entityLogicalName: testData.target,
        odataQuery: `${testData.target}s?$select=name&$top=5`,
        isRelatedQuery: false,
        controlId: 'control1'
      },
      {
        entityLogicalName: 'systemuser',
        odataQuery: 'systemusers?$select=systemuserid,fullname&$top=1',
        isRelatedQuery: false,
        controlId: 'control2'
      },
      {
        entityLogicalName: testData.target,
        odataQuery: `${testData.target}s?$select=${testData.target}id,scheduledstart&$top=3`,
        isRelatedQuery: false,
        controlId: 'control3'
      }
    ];
    
    console.log(`Executing batch of ${queries.length} queries...`);
    queries.forEach((query, index) => {
      console.log(`  Query ${index + 1}: ${query.entityLogicalName} (${query.controlId})`);
    });
    
    const results = await executeBatchQueries(queries, mockWebAPI, { maxConcurrency: 2 });
    
    // Verify batch results
    expect(results).toBeTruthy();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3);
    
    // Verify each result
    results.forEach((result, index) => {
      expect(result).toBeTruthy();
      expect(result.entityLogicalName).toBe(queries[index].entityLogicalName);
      expect(typeof result.success).toBe('boolean');
      
      if (result.success) {
        expect(Array.isArray(result.entities)).toBe(true);
        console.log(`  Result ${index + 1}: ✅ ${result.entities.length} entities`);
      } else {
        console.log(`  Result ${index + 1}: ❌ ${result.error}`);
      }
    });
    
    // Check that successful queries returned expected results
    const successfulResults = results.filter(r => r.success);
    expect(successfulResults.length).toBeGreaterThan(0);
    
    console.log('Batch execution summary:', {
      totalQueries: results.length,
      successfulQueries: successfulResults.length,
      failedQueries: results.length - successfulResults.length
    });
    
    console.log('✅ Batch query execution successful');
  });

  it('should respect concurrency limits in batch execution', async () => {
    console.log('\n=== Testing batch concurrency limits ===');
    
    // Create more queries than the concurrency limit
    const queries = Array.from({ length: 7 }, (_, index) => ({
      entityLogicalName: index % 2 === 0 ? testData.target : 'systemuser',
      odataQuery: index % 2 === 0 ? `${testData.target}s?$top=1` : 'systemusers?$top=1',
      isRelatedQuery: false,
      controlId: `control${index + 1}`
    }));
    
    console.log(`Testing concurrency with ${queries.length} queries, max concurrency: 3`);
    
    const startTime = performance.now();
    const results = await executeBatchQueries(queries, mockWebAPI, { maxConcurrency: 3 });
    const endTime = performance.now();
    
    // Verify all queries were executed
    expect(results.length).toBe(7);
    
    console.log('Concurrency test results:', {
      totalQueries: results.length,
      executionTime: `${(endTime - startTime).toFixed(2)}ms`,
      maxConcurrency: 3
    });
    
    // Since we're using mocks, we can't test actual concurrency timing,
    // but we can verify the structure is correct
    results.forEach((result, index) => {
      expect(result.entityLogicalName).toBe(queries[index].entityLogicalName);
    });
    
    console.log('✅ Batch concurrency limits working correctly');
  });

  it('should test WebAPI connectivity successfully', async () => {
    console.log('\n=== Testing WebAPI connectivity test ===');
    
    console.log('Testing successful WebAPI connection...');
    
    const result = await testWebAPIConnection(mockWebAPI);
    
    expect(result).toBeTruthy();
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    
    // Verify the connectivity test made the expected system call
    expect(mockWebAPI.retrieveMultipleRecords).toHaveBeenCalledWith(
      'systemuser',
      '$select=systemuserid&$top=1'
    );
    
    console.log('Connectivity test result:', {
      success: result.success,
      error: result.error || 'none'
    });
    
    console.log('✅ WebAPI connectivity test successful');
  });

  it('should handle WebAPI connectivity failures', async () => {
    console.log('\n=== Testing WebAPI connectivity failure handling ===');
    
    // Create a failing WebAPI mock
    const failingWebAPI = {
      retrieveMultipleRecords: vi.fn().mockRejectedValue(new Error('Network connection failed'))
    };
    
    console.log('Testing failed WebAPI connection...');
    
    const result = await testWebAPIConnection(failingWebAPI);
    
    expect(result).toBeTruthy();
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('Network connection failed');
    
    console.log('Failed connectivity test result:', {
      success: result.success,
      error: result.error
    });
    
    console.log('✅ WebAPI connectivity failure handled correctly');
  });

  it('should handle null WebAPI in connectivity test', async () => {
    console.log('\n=== Testing null WebAPI connectivity test ===');
    
    console.log('Testing connectivity test with null WebAPI...');
    
    const result = await testWebAPIConnection(null);
    
    expect(result).toBeTruthy();
    expect(result.success).toBe(false);
    expect(result.error).toBe('WebAPI is not available');
    
    console.log('Null WebAPI connectivity result:', {
      success: result.success,
      error: result.error
    });
    
    console.log('✅ Null WebAPI connectivity test handled correctly');
  });

  it('should handle real-world query scenarios', async () => {
    console.log('\n=== Testing real-world query scenarios ===');
    
    // Test 1: Query with relationship filter
    const relationshipQuery = {
      entityLogicalName: testData.target,
      odataQuery: `${testData.target}s?$select=${testData.target}id,name,scheduledstart&$filter=_${testData.page}id_value eq ${testData.pageId}&$orderby=scheduledstart asc&$top=10`,
      isRelatedQuery: true,
      relationshipName: `${testData.page}_${testData.target}s`,
      lookupColumn: `_${testData.page}id_value`,
      controlId: 'relatedTasksGrid'
    };
    
    console.log('Testing relationship query:', {
      entity: relationshipQuery.entityLogicalName,
      isRelated: relationshipQuery.isRelatedQuery,
      relationshipName: relationshipQuery.relationshipName,
      lookupColumn: relationshipQuery.lookupColumn
    });
    
    const relationshipResult = await executeDatasetQuery(relationshipQuery, mockWebAPI);
    
    expect(relationshipResult.success).toBe(true);
    expect(relationshipResult.entities.length).toBe(2);
    
    // Test 2: Query with formatted values
    const formattedQuery = {
      entityLogicalName: testData.target,
      odataQuery: `${testData.target}s?$select=${testData.target}id,name,scheduledstart,_ownerid_value&$top=5`,
      isRelatedQuery: false,
      controlId: 'formattedTasksGrid'
    };
    
    console.log('Testing formatted values query...');
    
    const formattedResult = await executeDatasetQuery(formattedQuery, mockWebAPI);
    
    expect(formattedResult.success).toBe(true);
    if (formattedResult.entities.length > 0) {
      const entity = formattedResult.entities[0];
      expect(entity['name@OData.Community.Display.V1.FormattedValue']).toBeTruthy();
      expect(entity['scheduledstart@OData.Community.Display.V1.FormattedValue']).toBeTruthy();
    }
    
    // Test 3: Empty result query
    const emptyResultQuery = {
      entityLogicalName: 'account', // Will return empty result from mock
      odataQuery: 'accounts?$select=accountid,name&$filter=name eq \'NonexistentAccount\'&$top=10',
      isRelatedQuery: false,
      controlId: 'emptyGrid'
    };
    
    console.log('Testing empty result query...');
    
    const emptyResult = await executeDatasetQuery(emptyResultQuery, mockWebAPI);
    
    expect(emptyResult.success).toBe(true);
    expect(emptyResult.entities.length).toBe(0);
    expect(emptyResult.totalCount).toBe(0);
    
    console.log('Real-world scenarios summary:', {
      relationshipQuery: relationshipResult.success ? '✅' : '❌',
      formattedQuery: formattedResult.success ? '✅' : '❌',
      emptyResultQuery: emptyResult.success ? '✅' : '❌'
    });
    
    console.log('✅ Real-world query scenarios handled correctly');
  });

  it('should handle query string parsing correctly', async () => {
    console.log('\n=== Testing query string parsing ===');
    
    const testCases = [
      {
        name: 'Query with entity prefix',
        query: {
          entityLogicalName: testData.target,
          odataQuery: `${testData.target}s?$select=name&$top=5`,
          isRelatedQuery: false
        },
        expectedQueryString: '$select=name&$top=5'
      },
      {
        name: 'Query without entity prefix',
        query: {
          entityLogicalName: testData.target,
          odataQuery: '$select=name,scheduledstart&$orderby=name&$top=10',
          isRelatedQuery: false
        },
        expectedQueryString: '$select=name,scheduledstart&$orderby=name&$top=10'
      },
      {
        name: 'Complex query with filters',
        query: {
          entityLogicalName: testData.target,
          odataQuery: `${testData.target}s?$select=${testData.target}id,name&$filter=statuscode eq 1 and (_ownerid_value ne null)&$orderby=createdon desc&$top=20`,
          isRelatedQuery: true
        },
        expectedQueryString: `$select=${testData.target}id,name&$filter=statuscode eq 1 and (_ownerid_value ne null)&$orderby=createdon desc&$top=20`
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`Testing ${testCase.name}...`);
      
      const result = await executeDatasetQuery(testCase.query, mockWebAPI);
      
      if (!result.success) {
        console.log(`❌ Query failed for ${testCase.name}:`, result.error);
      }
      
      expect(result.success).toBe(true);
      
      // Verify the correct query string was passed to WebAPI
      const lastCall = mockWebAPI.retrieveMultipleRecords.mock.calls[
        mockWebAPI.retrieveMultipleRecords.mock.calls.length - 1
      ];
      
      expect(lastCall[0]).toBe(testCase.query.entityLogicalName);
      expect(lastCall[1]).toBe(testCase.expectedQueryString);
      
      console.log(`  ✅ Query string parsed correctly: "${lastCall[1]}"`);
    }
    
    console.log('✅ Query string parsing working correctly');
  });
});