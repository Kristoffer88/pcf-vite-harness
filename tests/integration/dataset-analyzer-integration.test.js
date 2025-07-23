import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectDatasetParameters,
  compareDatasetStates
} from '../../src/devtools-redux/utils/datasetAnalyzer.ts';

describe('Dataset Analyzer Integration Tests', () => {
  const testData = {
    target: 'pum_gantttask',
    page: 'pum_initiative', 
    pageId: 'a3456789-70bc-037e-a678-647896396012'
  };

  beforeEach(() => {
    // Clear environment variables
    delete import.meta.env.VITE_PCF_TARGET_TABLE;
    delete import.meta.env.VITE_PCF_PAGE_TABLE;
  });

  it('should detect dataset parameters from PCF context', async () => {
    console.log('\n=== Testing dataset parameter detection ===');
    
    // Create mock PCF context with dataset
    const mockContext = {
      parameters: {
        sampleDataSet: {
          records: {
            'id1': { 
              id: 'id1', 
              name: 'Record 1',
              'name@OData.Community.Display.V1.FormattedValue': 'Record 1' 
            },
            'id2': { 
              id: 'id2', 
              name: 'Record 2',
              'name@OData.Community.Display.V1.FormattedValue': 'Record 2' 
            }
          },
          columns: [
            { name: 'id', displayName: 'ID', dataType: 'SingleLine.Text' },
            { name: 'name', displayName: 'Name', dataType: 'SingleLine.Text' },
            { name: '_parent_value', displayName: 'Parent', dataType: 'Lookup.Simple' }
          ],
          getTargetEntityType: vi.fn().mockReturnValue(testData.target),
          getViewId: vi.fn().mockReturnValue('test-view-id'),
          _relationshipName: `${testData.page}_${testData.target}s`
        },
        nonDatasetParameter: {
          // This should be ignored as it's not a dataset
          value: 'some string value'
        }
      },
      page: {
        entityTypeName: testData.page,
        entityId: testData.pageId
      }
    };
    
    console.log('🔍 Analyzing context with mock dataset...');
    const result = detectDatasetParameters(mockContext);
    
    // Verify analysis results
    expect(result).toBeTruthy();
    expect(result.datasets).toBeTruthy();
    expect(Array.isArray(result.datasets)).toBe(true);
    expect(result.datasets.length).toBe(1);
    expect(result.totalRecords).toBe(2);
    expect(result.summary).toBeTruthy();
    
    console.log('Analysis result:', {
      datasetCount: result.datasets.length,
      totalRecords: result.totalRecords,
      summary: result.summary
    });
    
    // Verify dataset details
    const dataset = result.datasets[0];
    expect(dataset.name).toBe('sampleDataSet');
    expect(dataset.recordCount).toBe(2);
    expect(dataset.columnCount).toBe(3);
    expect(dataset.hasData).toBe(true);
    expect(dataset.entityLogicalName).toBe(testData.target);
    expect(dataset.viewId).toBe('test-view-id');
    expect(dataset.relationshipName).toBe(`${testData.page}_${testData.target}s`);
    
    // Verify columns
    expect(dataset.columns.length).toBe(3);
    const columns = dataset.columns;
    expect(columns[0].name).toBe('id');
    expect(columns[1].name).toBe('name');
    expect(columns[2].name).toBe('_parent_value');
    expect(columns[2].dataType).toBe('Lookup.Simple');
    
    console.log('Dataset details:', {
      name: dataset.name,
      entityType: dataset.entityLogicalName,
      recordCount: dataset.recordCount,
      columnCount: dataset.columnCount,
      hasData: dataset.hasData
    });
    
    // Verify primary dataset detection
    expect(result.primaryDataset).toBe(dataset);
    
    console.log('✅ Dataset parameter detection successful');
  });

  it('should handle empty context gracefully', async () => {
    console.log('\n=== Testing empty context handling ===');
    
    const emptyContexts = [
      null,
      undefined,
      {},
      { parameters: null },
      { parameters: {} }
    ];
    
    for (const context of emptyContexts) {
      console.log(`Testing context: ${JSON.stringify(context)}`);
      
      const result = detectDatasetParameters(context);
      
      expect(result).toBeTruthy();
      expect(result.datasets.length).toBe(0);
      expect(result.totalRecords).toBe(0);
      expect(result.summary).toContain('No');
      expect(result.primaryDataset).toBeUndefined();
      
      console.log(`✅ Empty context handled correctly: ${result.summary}`);
    }
  });

  it('should prioritize environment variables for entity type', async () => {
    console.log('\n=== Testing environment variable precedence ===');
    
    // Set environment variable
    import.meta.env.VITE_PCF_TARGET_TABLE = 'env_target_entity';
    
    const mockContext = {
      parameters: {
        testDataSet: {
          records: { 'id1': { id: 'id1', name: 'Test' } },
          columns: [{ name: 'id', displayName: 'ID', dataType: 'SingleLine.Text' }],
          getTargetEntityType: vi.fn().mockReturnValue('original_entity'),
          entityLogicalName: 'context_entity'
        }
      }
    };
    
    const result = detectDatasetParameters(mockContext);
    
    expect(result.datasets.length).toBe(1);
    const dataset = result.datasets[0];
    
    // Environment variable should take precedence
    expect(dataset.entityLogicalName).toBe('env_target_entity');
    
    console.log('Entity type resolution:', {
      environmentVariable: import.meta.env.VITE_PCF_TARGET_TABLE,
      getTargetEntityType: 'original_entity',
      entityLogicalName: 'context_entity',
      resolved: dataset.entityLogicalName
    });
    
    console.log('✅ Environment variable precedence working correctly');
    
    // Clean up
    delete import.meta.env.VITE_PCF_TARGET_TABLE;
  });

  it('should detect lookup field patterns in columns', async () => {
    console.log('\n=== Testing lookup field pattern detection ===');
    
    const mockContext = {
      parameters: {
        testDataSet: {
          records: {},
          columns: [
            { name: 'id', displayName: 'ID', dataType: 'SingleLine.Text' },
            { name: 'name', displayName: 'Name', dataType: 'SingleLine.Text' },
            { name: '_parentid_value', displayName: 'Parent', dataType: 'Lookup.Simple' },
            { name: '_ownerid_value', displayName: 'Owner', dataType: 'Lookup.Simple' },
            { name: 'accountid', displayName: 'Account ID', dataType: 'Uniqueidentifier' }
          ],
          getTargetEntityType: vi.fn().mockReturnValue(testData.target)
        }
      }
    };
    
    const result = detectDatasetParameters(mockContext);
    const dataset = result.datasets[0];
    
    // Check that lookup patterns are detected (logged in console)
    const lookupColumns = dataset.columns.filter(col => 
      col.name.endsWith('_value') || col.name.endsWith('id')
    );
    
    expect(lookupColumns.length).toBeGreaterThan(0);
    
    console.log('Lookup field patterns detected:');
    lookupColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.dataType})`);
      
      if (col.name.endsWith('_value')) {
        console.log(`    ✅ Standard lookup field pattern`);
      } else if (col.name.endsWith('id')) {
        console.log(`    ℹ️ Potential ID field pattern`);
      }
    });
    
    console.log('✅ Lookup field pattern detection working');
  });

  it('should find primary dataset correctly', async () => {
    console.log('\n=== Testing primary dataset selection ===');
    
    // Test 1: Multiple datasets with different names
    const mockContextMultiple = {
      parameters: {
        sampleDataSet: {
          records: { 'id1': { id: 'id1' } },
          columns: [{ name: 'id', displayName: 'ID' }],
          getTargetEntityType: vi.fn().mockReturnValue('entity1')
        },
        dataSet: {
          records: { 'id1': { id: 'id1' }, 'id2': { id: 'id2' } },
          columns: [{ name: 'id', displayName: 'ID' }],
          getTargetEntityType: vi.fn().mockReturnValue('entity2')
        },
        customGrid: {
          records: { 'id1': { id: 'id1' }, 'id2': { id: 'id2' }, 'id3': { id: 'id3' } },
          columns: [{ name: 'id', displayName: 'ID' }],
          getTargetEntityType: vi.fn().mockReturnValue('entity3')
        }
      }
    };
    
    const result = detectDatasetParameters(mockContextMultiple);
    
    expect(result.datasets.length).toBe(3);
    
    // Should prioritize 'dataSet' as primary name
    expect(result.primaryDataset.name).toBe('dataSet');
    
    console.log('Primary dataset selection test 1:', {
      totalDatasets: result.datasets.length,
      primaryDataset: result.primaryDataset.name,
      primaryRecordCount: result.primaryDataset.recordCount
    });
    
    // Test 2: No standard names - should pick the one with most records
    const mockContextRecordCount = {
      parameters: {
        grid1: {
          records: { 'id1': { id: 'id1' } },
          columns: [{ name: 'id', displayName: 'ID' }],
          getTargetEntityType: vi.fn().mockReturnValue('entity1')
        },
        grid2: {
          records: { 'id1': { id: 'id1' }, 'id2': { id: 'id2' }, 'id3': { id: 'id3' } },
          columns: [{ name: 'id', displayName: 'ID' }],
          getTargetEntityType: vi.fn().mockReturnValue('entity2')
        }
      }
    };
    
    const result2 = detectDatasetParameters(mockContextRecordCount);
    
    expect(result2.datasets.length).toBe(2);
    expect(result2.primaryDataset.name).toBe('grid2'); // Most records
    expect(result2.primaryDataset.recordCount).toBe(3);
    
    console.log('Primary dataset selection test 2:', {
      primaryDataset: result2.primaryDataset.name,
      primaryRecordCount: result2.primaryDataset.recordCount
    });
    
    console.log('✅ Primary dataset selection working correctly');
  });

  it('should compare dataset states and detect changes', async () => {
    console.log('\n=== Testing dataset state comparison ===');
    
    // Create initial state
    const mockContext1 = {
      parameters: {
        dataSet1: {
          records: { 'id1': { id: 'id1' }, 'id2': { id: 'id2' } },
          columns: [{ name: 'id', displayName: 'ID' }],
          getTargetEntityType: vi.fn().mockReturnValue('entity1')
        },
        dataSet2: {
          records: { 'id1': { id: 'id1' } },
          columns: [{ name: 'id', displayName: 'ID' }],
          getTargetEntityType: vi.fn().mockReturnValue('entity2')
        }
      }
    };
    
    // Create modified state
    const mockContext2 = {
      parameters: {
        dataSet1: {
          records: { 'id1': { id: 'id1' }, 'id2': { id: 'id2' }, 'id3': { id: 'id3' } },
          columns: [{ name: 'id', displayName: 'ID' }],
          getTargetEntityType: vi.fn().mockReturnValue('entity1')
        },
        dataSet3: {
          records: { 'id1': { id: 'id1' } },
          columns: [{ name: 'id', displayName: 'ID' }],
          getTargetEntityType: vi.fn().mockReturnValue('entity3')
        }
      }
    };
    
    const state1 = detectDatasetParameters(mockContext1);
    const state2 = detectDatasetParameters(mockContext2);
    
    const comparison = compareDatasetStates(state1, state2);
    
    console.log('State comparison result:', {
      hasChanges: comparison.hasChanges,
      addedDatasets: comparison.addedDatasets,
      removedDatasets: comparison.removedDatasets,
      changedDatasets: comparison.changedDatasets,
      recordCountChanges: comparison.recordCountChanges
    });
    
    // Verify changes detected
    expect(comparison.hasChanges).toBe(true);
    expect(comparison.addedDatasets).toContain('dataSet3');
    expect(comparison.removedDatasets).toContain('dataSet2');
    expect(comparison.changedDatasets).toContain('dataSet1');
    expect(comparison.recordCountChanges['dataSet1']).toEqual({ old: 2, new: 3 });
    
    console.log('✅ Dataset state comparison working correctly');
  });

  it('should handle datasets with no data', async () => {
    console.log('\n=== Testing empty dataset handling ===');
    
    const mockContext = {
      parameters: {
        emptyDataSet: {
          records: {},
          columns: [
            { name: 'id', displayName: 'ID', dataType: 'SingleLine.Text' },
            { name: 'name', displayName: 'Name', dataType: 'SingleLine.Text' }
          ],
          getTargetEntityType: vi.fn().mockReturnValue(testData.target)
        }
      }
    };
    
    const result = detectDatasetParameters(mockContext);
    
    expect(result.datasets.length).toBe(1);
    const dataset = result.datasets[0];
    
    expect(dataset.recordCount).toBe(0);
    expect(dataset.hasData).toBe(false);
    expect(dataset.columnCount).toBe(2);
    expect(result.totalRecords).toBe(0);
    
    console.log('Empty dataset analysis:', {
      name: dataset.name,
      recordCount: dataset.recordCount,
      hasData: dataset.hasData,
      columnCount: dataset.columnCount
    });
    
    console.log('✅ Empty dataset handling working correctly');
  });

  it('should detect various entity type sources', async () => {
    console.log('\n=== Testing entity type source detection ===');
    
    const testCases = [
      {
        name: 'getTargetEntityType method',
        mockDataset: {
          records: {},
          columns: [],
          getTargetEntityType: vi.fn().mockReturnValue('method_entity')
        },
        expectedEntity: 'method_entity'
      },
      {
        name: '_targetEntityType property',
        mockDataset: {
          records: {},
          columns: [],
          _targetEntityType: 'property_entity'
        },
        expectedEntity: 'property_entity'
      },
      {
        name: 'entityLogicalName property',
        mockDataset: {
          records: {},
          columns: [],
          entityLogicalName: 'logical_entity'
        },
        expectedEntity: 'logical_entity'
      },
      {
        name: 'no entity type',
        mockDataset: {
          records: {},
          columns: []
        },
        expectedEntity: undefined
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`Testing ${testCase.name}...`);
      
      const mockContext = {
        parameters: {
          testDataSet: testCase.mockDataset
        }
      };
      
      const result = detectDatasetParameters(mockContext);
      const dataset = result.datasets[0];
      
      expect(dataset.entityLogicalName).toBe(testCase.expectedEntity);
      
      console.log(`✅ ${testCase.name}: resolved to "${dataset.entityLogicalName || 'undefined'}"`);
    }
    
    console.log('✅ Entity type source detection working correctly');
  });

  it('should generate appropriate summaries', async () => {
    console.log('\n=== Testing summary generation ===');
    
    const testCases = [
      {
        name: 'No datasets',
        context: { parameters: {} },
        expectedSummaryPattern: /No.*found/i
      },
      {
        name: 'Single dataset',
        context: {
          parameters: {
            testDataSet: {
              records: { 'id1': { id: 'id1' }, 'id2': { id: 'id2' } },
              columns: [{ name: 'id' }, { name: 'name' }, { name: 'status' }],
              getTargetEntityType: vi.fn().mockReturnValue('test_entity')
            }
          }
        },
        expectedSummaryPattern: /1 dataset.*testDataSet.*2 records.*3 columns/i
      },
      {
        name: 'Multiple datasets',
        context: {
          parameters: {
            dataSet1: {
              records: { 'id1': { id: 'id1' } },
              columns: [{ name: 'id' }],
              getTargetEntityType: vi.fn().mockReturnValue('entity1')
            },
            dataSet2: {
              records: { 'id1': { id: 'id1' }, 'id2': { id: 'id2' } },
              columns: [{ name: 'id' }],
              getTargetEntityType: vi.fn().mockReturnValue('entity2')
            }
          }
        },
        expectedSummaryPattern: /2 datasets.*3 total records/i
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`Testing summary: ${testCase.name}...`);
      
      const result = detectDatasetParameters(testCase.context);
      
      expect(result.summary).toMatch(testCase.expectedSummaryPattern);
      
      console.log(`Summary: "${result.summary}"`);
      console.log(`✅ ${testCase.name} summary generated correctly`);
    }
    
    console.log('✅ Summary generation working correctly');
  });

  it('should handle real-world PCF context structure', async () => {
    console.log('\n=== Testing real-world PCF context simulation ===');
    
    // Simulate a realistic PCF context structure
    const realisticContext = {
      parameters: {
        // Main dataset parameter
        sampleDataSet: {
          records: {
            [testData.pageId]: {
              [testData.target + 'id']: testData.pageId,
              'name': 'Test Task 1',
              'scheduledstart': '2024-01-01T10:00:00Z',
              '_ownerid_value': 'user-guid-123',
              [`_${testData.page}id_value`]: testData.pageId,
              'statuscode': 1,
              'name@OData.Community.Display.V1.FormattedValue': 'Test Task 1',
              'scheduledstart@OData.Community.Display.V1.FormattedValue': '1/1/2024 10:00 AM',
              '_ownerid_value@OData.Community.Display.V1.FormattedValue': 'John Doe',
              'statuscode@OData.Community.Display.V1.FormattedValue': 'Not Started'
            }
          },
          columns: [
            { name: testData.target + 'id', displayName: 'Task ID', dataType: 'Uniqueidentifier' },
            { name: 'name', displayName: 'Task Name', dataType: 'SingleLine.Text' },
            { name: 'scheduledstart', displayName: 'Scheduled Start', dataType: 'DateAndTime.DateAndTime' },
            { name: '_ownerid_value', displayName: 'Owner', dataType: 'Lookup.Simple' },
            { name: `_${testData.page}id_value`, displayName: 'Initiative', dataType: 'Lookup.Simple' },
            { name: 'statuscode', displayName: 'Status', dataType: 'OptionSet' }
          ],
          getTargetEntityType: vi.fn().mockReturnValue(testData.target),
          getViewId: vi.fn().mockReturnValue('default-view-guid'),
          _relationshipName: `${testData.page}_${testData.target}s`,
          loading: false,
          paging: {
            totalResultCount: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        },
        // Non-dataset parameters
        inputParam: {
          raw: 'some value',
          formatted: 'Some Value'
        },
        boolParam: {
          raw: true
        }
      },
      page: {
        entityTypeName: testData.page,
        entityId: testData.pageId
      },
      client: {
        getClient: vi.fn().mockReturnValue('Web')
      },
      device: {
        deviceType: 'Desktop'
      }
    };
    
    const result = detectDatasetParameters(realisticContext);
    
    expect(result).toBeTruthy();
    expect(result.datasets.length).toBe(1);
    expect(result.totalRecords).toBe(1);
    
    const dataset = result.datasets[0];
    
    // Verify realistic dataset properties
    expect(dataset.name).toBe('sampleDataSet');
    expect(dataset.entityLogicalName).toBe(testData.target);
    expect(dataset.recordCount).toBe(1);
    expect(dataset.columnCount).toBe(6);
    expect(dataset.hasData).toBe(true);
    expect(dataset.relationshipName).toBe(`${testData.page}_${testData.target}s`);
    
    // Verify column detection
    const lookupColumns = dataset.columns.filter(col => col.name.includes('_value'));
    expect(lookupColumns.length).toBe(2); // Owner and Initiative lookups
    
    const idColumns = dataset.columns.filter(col => col.name.endsWith('id'));
    expect(idColumns.length).toBe(1); // Task ID
    
    console.log('Realistic PCF context analysis:', {
      datasetName: dataset.name,
      entityType: dataset.entityLogicalName,
      recordCount: dataset.recordCount,
      columnCount: dataset.columnCount,
      lookupColumns: lookupColumns.length,
      idColumns: idColumns.length,
      relationshipName: dataset.relationshipName
    });
    
    console.log('Sample record keys:', Object.keys(dataset.records)[0]);
    console.log('Sample columns:', dataset.columns.map(c => c.name).slice(0, 3));
    
    console.log('✅ Real-world PCF context structure handled correctly');
  });
});