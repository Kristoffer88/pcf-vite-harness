import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  convertEntitiesToDatasetRecords,
  createDatasetColumnsFromEntities,
  mergeDatasetResults,
  createEnhancedContext
} from '../../src/devtools-redux/utils/dataset/datasetEnhancer.ts';

describe('Dataset Enhancer Integration Tests', () => {
  const testData = {
    target: 'pum_gantttask',
    page: 'pum_initiative', 
    pageId: 'a3456789-70bc-037e-a678-647896396012'
  };

  let mockWebAPI;
  let sampleEntities;
  let entityMetadata;

  beforeEach(() => {
    // Mock entity metadata
    entityMetadata = {
      LogicalName: testData.target,
      PrimaryIdAttribute: testData.target + 'id',
      PrimaryNameAttribute: 'pum_name', // Correct primary name for pum_gantttask
      DisplayName: { UserLocalizedLabel: { Label: 'PUM Gantt Task' } },
      EntitySetName: testData.target + 's'
    };

    // Mock WebAPI with entity metadata response
    mockWebAPI = {
      retrieveMultipleRecords: vi.fn().mockImplementation(async (entityName, query) => {
        if (entityName === 'EntityDefinitions') {
          return {
            entities: [entityMetadata]
          };
        }
        return { entities: [] };
      })
    };

    // Sample Dataverse entities for testing
    sampleEntities = [
      {
        [testData.target + 'id']: '11111111-1111-1111-1111-111111111111',
        name: 'Test Task 1',
        scheduledstart: '2024-01-01T10:00:00Z',
        statuscode: 1,
        priority: 1,
        estimatedhours: 8.5,
        iscomplete: false,
        '_ownerid_value': '22222222-2222-2222-2222-222222222222',
        [`_${testData.page}id_value`]: testData.pageId,
        // Formatted values
        'name@OData.Community.Display.V1.FormattedValue': 'Test Task 1',
        'scheduledstart@OData.Community.Display.V1.FormattedValue': '1/1/2024 10:00 AM',
        'statuscode@OData.Community.Display.V1.FormattedValue': 'Not Started',
        'priority@OData.Community.Display.V1.FormattedValue': 'High',
        'estimatedhours@OData.Community.Display.V1.FormattedValue': '8.50',
        'iscomplete@OData.Community.Display.V1.FormattedValue': 'No',
        '_ownerid_value@OData.Community.Display.V1.FormattedValue': 'John Doe',
        [`_${testData.page}id_value@OData.Community.Display.V1.FormattedValue`]: 'Test Initiative'
      },
      {
        [testData.target + 'id']: '33333333-3333-3333-3333-333333333333',
        name: 'Test Task 2',
        scheduledstart: '2024-01-02T14:00:00Z',
        statuscode: 2,
        priority: 2,
        estimatedhours: 4.0,
        iscomplete: true,
        '_ownerid_value': '44444444-4444-4444-4444-444444444444',
        [`_${testData.page}id_value`]: testData.pageId,
        // Formatted values
        'name@OData.Community.Display.V1.FormattedValue': 'Test Task 2',
        'scheduledstart@OData.Community.Display.V1.FormattedValue': '1/2/2024 2:00 PM',
        'statuscode@OData.Community.Display.V1.FormattedValue': 'In Progress',
        'priority@OData.Community.Display.V1.FormattedValue': 'Medium',
        'estimatedhours@OData.Community.Display.V1.FormattedValue': '4.00',
        'iscomplete@OData.Community.Display.V1.FormattedValue': 'Yes',
        '_ownerid_value@OData.Community.Display.V1.FormattedValue': 'Jane Smith',
        [`_${testData.page}id_value@OData.Community.Display.V1.FormattedValue`]: 'Test Initiative'
      }
    ];
  });

  it('should convert entities to dataset records format', async () => {
    console.log('\n=== Testing entity to dataset record conversion ===');
    
    console.log(`Converting ${sampleEntities.length} entities to dataset records...`);
    
    const records = await convertEntitiesToDatasetRecords(
      sampleEntities,
      testData.target,
      mockWebAPI
    );
    
    // Verify records structure
    expect(records).toBeTruthy();
    expect(typeof records).toBe('object');
    expect(Object.keys(records).length).toBe(2);
    
    console.log('Conversion result:', {
      recordCount: Object.keys(records).length,
      recordIds: Object.keys(records)
    });
    
    // Test first record
    const recordId1 = '11111111-1111-1111-1111-111111111111';
    const record1 = records[recordId1];
    
    expect(record1).toBeTruthy();
    expect(record1._record).toBeTruthy();
    expect(record1._record.identifier).toBeTruthy();
    expect(record1._record.identifier.id.guid).toBe(recordId1);
    expect(record1._record.identifier.etn).toBe(testData.target);
    expect(record1._entityReference._id).toBe(recordId1);
    expect(record1._entityReference._name).toBe('Test Task 1');
    expect(record1._primaryFieldName).toBe('pum_name');
    
    // Verify fields structure
    expect(record1._record.fields).toBeTruthy();
    expect(record1._record.fields.name).toBeTruthy();
    expect(record1._record.fields.name.value).toBe('Test Task 1');
    expect(record1._record.fields.scheduledstart).toBeTruthy();
    expect(record1._record.fields.scheduledstart.value).toBe('2024-01-01T10:00:00Z');
    
    // Verify formatted values are preserved
    expect(record1._record.fields.name.formatted).toBe('Test Task 1');
    expect(record1._record.fields.scheduledstart.formatted).toBe('1/1/2024 10:00 AM');
    expect(record1._record.fields.statuscode.formatted).toBe('Not Started');
    
    console.log('Sample record structure:', {
      id: record1._record.identifier.id.guid,
      entityType: record1._record.identifier.etn,
      primaryName: record1._entityReference._name,
      fieldCount: Object.keys(record1._record.fields).length,
      sampleFields: Object.keys(record1._record.fields).slice(0, 5)
    });
    
    // Test second record
    const recordId2 = '33333333-3333-3333-3333-333333333333';
    const record2 = records[recordId2];
    
    expect(record2).toBeTruthy();
    expect(record2._record.identifier.id.guid).toBe(recordId2);
    expect(record2._entityReference._name).toBe('Test Task 2');
    expect(record2._record.fields.iscomplete.value).toBe(true);
    expect(record2._record.fields.iscomplete.formatted).toBe('Yes');
    
    console.log('✅ Entity to dataset record conversion successful');
  });

  it('should create dataset columns from entities', async () => {
    console.log('\n=== Testing dataset column creation ===');
    
    console.log('Creating columns from sample entities...');
    
    const columns = await createDatasetColumnsFromEntities(
      sampleEntities,
      testData.target,
      mockWebAPI
    );
    
    // Verify columns structure
    expect(columns).toBeTruthy();
    expect(Array.isArray(columns)).toBe(true);
    expect(columns.length).toBeGreaterThan(0);
    
    console.log('Column creation result:', {
      columnCount: columns.length,
      columnNames: columns.map(c => c.name).slice(0, 10)
    });
    
    // Find specific columns
    const idColumn = columns.find(c => c.name === testData.target + 'id');
    const nameColumn = columns.find(c => c.name === 'name');
    const dateColumn = columns.find(c => c.name === 'scheduledstart');
    const numberColumn = columns.find(c => c.name === 'estimatedhours');
    const booleanColumn = columns.find(c => c.name === 'iscomplete');
    const lookupColumn = columns.find(c => c.name === '_ownerid_value');
    
    // Verify ID column
    expect(idColumn).toBeTruthy();
    expect(idColumn.isPrimary).toBe(false); // pum_gantttaskid contains underscore, so not detected as primary
    expect(idColumn.displayName).toBeTruthy();
    expect(idColumn.dataType).toBe('Lookup.Simple'); // GUID format
    
    // Verify name column
    expect(nameColumn).toBeTruthy();
    expect(nameColumn.dataType).toBe('SingleLine.Text');
    expect(nameColumn.displayName).toBe('Name');
    
    // Verify date column
    expect(dateColumn).toBeTruthy();
    expect(dateColumn.dataType).toBe('DateAndTime.DateAndTime');
    expect(dateColumn.displayName).toBe('Scheduledstart');
    
    // Verify number column
    expect(numberColumn).toBeTruthy();
    expect(numberColumn.dataType).toBe('Decimal');
    expect(numberColumn.displayName).toBe('Estimatedhours');
    
    // Verify boolean column
    expect(booleanColumn).toBeTruthy();
    expect(booleanColumn.dataType).toBe('TwoOptions');
    expect(booleanColumn.displayName).toBe('Iscomplete');
    
    // Verify lookup column
    expect(lookupColumn).toBeTruthy();
    expect(lookupColumn.dataType).toBe('Lookup.Simple'); // GUID format
    expect(lookupColumn.displayName).toBe('ownerid value'); // Actual formatting from implementation
    
    console.log('Column details verification:', {
      idColumn: { name: idColumn.name, dataType: idColumn.dataType, isPrimary: idColumn.isPrimary },
      nameColumn: { name: nameColumn.name, dataType: nameColumn.dataType, displayName: nameColumn.displayName },
      dateColumn: { name: dateColumn.name, dataType: dateColumn.dataType },
      numberColumn: { name: numberColumn.name, dataType: numberColumn.dataType },
      booleanColumn: { name: booleanColumn.name, dataType: booleanColumn.dataType },
      lookupColumn: { name: lookupColumn.name, dataType: lookupColumn.dataType }
    });
    
    // Verify no system attributes are included
    const systemColumns = columns.filter(c => c.name.startsWith('@'));
    expect(systemColumns.length).toBe(0);
    
    console.log('✅ Dataset column creation successful');
  });

  it('should handle empty entities array', async () => {
    console.log('\n=== Testing empty entities handling ===');
    
    // Test empty array for records
    const emptyRecords = await convertEntitiesToDatasetRecords(
      [],
      testData.target,
      mockWebAPI
    );
    
    expect(emptyRecords).toBeTruthy();
    expect(typeof emptyRecords).toBe('object');
    expect(Object.keys(emptyRecords).length).toBe(0);
    
    // Test empty array for columns
    const emptyColumns = await createDatasetColumnsFromEntities(
      [],
      testData.target,
      mockWebAPI
    );
    
    expect(emptyColumns).toBeTruthy();
    expect(Array.isArray(emptyColumns)).toBe(true);
    expect(emptyColumns.length).toBe(0);
    
    console.log('✅ Empty entities handled correctly');
  });

  it('should merge dataset results with existing dataset', async () => {
    console.log('\n=== Testing dataset result merging ===');
    
    // Create mock existing dataset
    const mockDataset = {
      records: {
        'existing-id': {
          _record: {
            identifier: { id: { guid: 'existing-id' }, etn: testData.target },
            fields: { name: { value: 'Existing Record' } }
          }
        }
      },
      columns: [
        { name: 'name', displayName: 'Name', dataType: 'SingleLine.Text' }
      ]
    };
    
    // Create mock query result
    const queryResult = {
      success: true,
      entities: sampleEntities,
      entityLogicalName: testData.target,
      totalCount: 2
    };
    
    console.log('Merging query results with existing dataset...');
    
    const mergedResult = await mergeDatasetResults(mockDataset, queryResult);
    
    // Verify merge result structure
    expect(mergedResult).toBeTruthy();
    expect(mergedResult.originalDataset).toBe(mockDataset);
    expect(mergedResult.queryResult).toBe(queryResult);
    expect(mergedResult.newRecordCount).toBe(2);
    expect(mergedResult.columnsUpdated).toBe(true);
    expect(Array.isArray(mergedResult.mergedRecords)).toBe(true);
    expect(mergedResult.mergedRecords.length).toBe(3); // 1 existing + 2 new
    
    console.log('Merge result:', {
      originalRecordCount: Object.keys(mockDataset.records).length,
      newRecordCount: mergedResult.newRecordCount,
      totalMergedCount: mergedResult.mergedRecords.length,
      columnsUpdated: mergedResult.columnsUpdated
    });
    
    console.log('✅ Dataset result merging successful');
  });

  it('should handle failed query results in merge', async () => {
    console.log('\n=== Testing failed query result merge handling ===');
    
    const mockDataset = {
      records: {},
      columns: []
    };
    
    const failedQueryResult = {
      success: false,
      entities: [],
      entityLogicalName: testData.target,
      error: 'Query execution failed'
    };
    
    const mergedResult = await mergeDatasetResults(mockDataset, failedQueryResult);
    
    expect(mergedResult).toBeTruthy();
    expect(mergedResult.originalDataset).toBe(mockDataset);
    expect(mergedResult.queryResult).toBe(failedQueryResult);
    expect(mergedResult.newRecordCount).toBe(0);
    expect(mergedResult.columnsUpdated).toBe(false);
    expect(mergedResult.mergedRecords).toEqual([]);
    
    console.log('✅ Failed query result merge handled correctly');
  });

  it('should create enhanced context with new dataset data', async () => {
    console.log('\n=== Testing enhanced context creation ===');
    
    // Create mock original context
    const mockContext = {
      parameters: {
        sampleDataSet: {
          records: {},
          columns: []
        }
      },
      page: {
        entityTypeName: testData.page,
        entityId: testData.pageId
      }
    };
    
    // Create mock enhanced result
    const enhancedResult = {
      originalDataset: mockContext.parameters.sampleDataSet,
      queryResult: {
        success: true,
        entities: sampleEntities,
        entityLogicalName: testData.target
      },
      mergedRecords: [],
      newRecordCount: 2,
      columnsUpdated: true
    };
    
    console.log('Creating enhanced context...');
    
    const enhancedContext = await createEnhancedContext(
      mockContext,
      'sampleDataSet',
      enhancedResult
    );
    
    // Verify enhanced context structure
    expect(enhancedContext).toBeTruthy();
    expect(enhancedContext.parameters).toBeTruthy();
    expect(enhancedContext.parameters.sampleDataSet).toBeTruthy();
    expect(enhancedContext.page).toBe(mockContext.page);
    
    // Verify dataset was updated
    const dataset = enhancedContext.parameters.sampleDataSet;
    expect(dataset.records).toBeTruthy();
    expect(Object.keys(dataset.records).length).toBe(2);
    
    console.log('Enhanced context result:', {
      hasParameters: !!enhancedContext.parameters,
      datasetRecordCount: Object.keys(dataset.records).length,
      pageEntityType: enhancedContext.page.entityTypeName
    });
    
    console.log('✅ Enhanced context creation successful');
  });

  it('should handle data type inference correctly', async () => {
    console.log('\n=== Testing data type inference ===');
    
    // Create entities with various data types
    const typedEntities = [
      {
        [testData.target + 'id']: '12345678-1234-1234-1234-123456789abc',
        stringField: 'Some text value',
        dateField: '2024-01-01T10:00:00Z',
        integerField: 42,
        decimalField: 3.14,
        booleanField: true,
        guidField: '87654321-4321-4321-4321-210987654321',
        nullField: null,
        undefinedField: undefined
      }
    ];
    
    const columns = await createDatasetColumnsFromEntities(
      typedEntities,
      testData.target,
      mockWebAPI
    );
    
    // Verify data type inference
    const stringColumn = columns.find(c => c.name === 'stringField');
    const dateColumn = columns.find(c => c.name === 'dateField');
    const intColumn = columns.find(c => c.name === 'integerField');
    const decimalColumn = columns.find(c => c.name === 'decimalField');
    const boolColumn = columns.find(c => c.name === 'booleanField');
    const guidColumn = columns.find(c => c.name === 'guidField');
    const nullColumn = columns.find(c => c.name === 'nullField');
    
    expect(stringColumn.dataType).toBe('SingleLine.Text');
    expect(dateColumn.dataType).toBe('DateAndTime.DateAndTime');
    expect(intColumn.dataType).toBe('Whole.None');
    expect(decimalColumn.dataType).toBe('Decimal');
    expect(boolColumn.dataType).toBe('TwoOptions');
    expect(guidColumn.dataType).toBe('Lookup.Simple');
    expect(nullColumn.dataType).toBe('SingleLine.Text'); // Default for null/undefined
    
    console.log('Data type inference results:', {
      string: stringColumn.dataType,
      date: dateColumn.dataType,
      integer: intColumn.dataType,
      decimal: decimalColumn.dataType,
      boolean: boolColumn.dataType,
      guid: guidColumn.dataType,
      null: nullColumn.dataType
    });
    
    console.log('✅ Data type inference working correctly');
  });

  it('should handle duplicate record IDs gracefully', async () => {
    console.log('\n=== Testing duplicate record ID handling ===');
    
    // Create entities with duplicate IDs
    const duplicateId = '99999999-9999-9999-9999-999999999999';
    const entitiesWithDuplicates = [
      {
        [testData.target + 'id']: duplicateId,
        name: 'First Record',
        priority: 1
      },
      {
        [testData.target + 'id']: duplicateId,
        name: 'Duplicate Record',
        priority: 2
      },
      {
        [testData.target + 'id']: '88888888-8888-8888-8888-888888888888',
        name: 'Unique Record',
        priority: 3
      }
    ];
    
    console.log('Converting entities with duplicate IDs...');
    
    const records = await convertEntitiesToDatasetRecords(
      entitiesWithDuplicates,
      testData.target,
      mockWebAPI
    );
    
    // Should have 2 unique records (duplicate overwrites first)
    expect(Object.keys(records).length).toBe(2);
    expect(records[duplicateId]).toBeTruthy();
    expect(records['88888888-8888-8888-8888-888888888888']).toBeTruthy();
    
    // The duplicate should overwrite the first one
    expect(records[duplicateId]._record.fields.name.value).toBe('Duplicate Record');
    expect(records[duplicateId]._record.fields.priority.value).toBe(2);
    
    console.log('Duplicate handling result:', {
      totalInputEntities: entitiesWithDuplicates.length,
      uniqueRecords: Object.keys(records).length,
      duplicateRecordName: records[duplicateId]._record.fields.name.value
    });
    
    console.log('✅ Duplicate record ID handling working correctly');
  });

  it('should handle missing primary key gracefully', async () => {
    console.log('\n=== Testing missing primary key handling ===');
    
    // Create entities without primary key fields
    const entitiesWithoutPrimaryKey = [
      {
        name: 'Record Without ID',
        status: 'Active'
      },
      {
        [testData.target + 'id']: '11111111-1111-1111-1111-111111111111',
        name: 'Record With ID'
      }
    ];
    
    console.log('Converting entities with missing primary keys...');
    
    const records = await convertEntitiesToDatasetRecords(
      entitiesWithoutPrimaryKey,
      testData.target,
      mockWebAPI
    );
    
    // Should only have the record with valid primary key
    expect(Object.keys(records).length).toBe(1);
    expect(records['11111111-1111-1111-1111-111111111111']).toBeTruthy();
    
    console.log('Missing primary key handling result:', {
      totalInputEntities: entitiesWithoutPrimaryKey.length,
      validRecords: Object.keys(records).length
    });
    
    console.log('✅ Missing primary key handling working correctly');
  });

  it('should format display names correctly', async () => {
    console.log('\n=== Testing display name formatting ===');
    
    const entityWithVariousNames = [
      {
        [testData.target + 'id']: '12345678-1234-1234-1234-123456789abc',
        camelCaseField: 'value1',
        under_score_field: 'value2',
        PascalCaseField: 'value3',
        mixedCase_withUnderscore: 'value4',
        singleword: 'value5',
        ALLCAPS: 'value6'
      }
    ];
    
    const columns = await createDatasetColumnsFromEntities(
      entityWithVariousNames,
      testData.target,
      mockWebAPI
    );
    
    // Verify display name formatting
    const testCases = [
      { field: 'camelCaseField', expectedDisplay: 'Camel Case Field' },
      { field: 'under_score_field', expectedDisplay: 'Under score field' },
      { field: 'PascalCaseField', expectedDisplay: 'Pascal Case Field' },
      { field: 'mixedCase_withUnderscore', expectedDisplay: 'Mixed Case with Underscore' }, // Actual implementation
      { field: 'singleword', expectedDisplay: 'Singleword' },
      { field: 'ALLCAPS', expectedDisplay: 'A L L C A P S' }
    ];
    
    console.log('Display name formatting results:');
    testCases.forEach(testCase => {
      const column = columns.find(c => c.name === testCase.field);
      expect(column).toBeTruthy();
      expect(column.displayName).toBe(testCase.expectedDisplay);
      console.log(`  ${testCase.field} → "${column.displayName}"`);
    });
    
    console.log('✅ Display name formatting working correctly');
  });
});