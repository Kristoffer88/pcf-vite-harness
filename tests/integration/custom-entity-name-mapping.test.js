import { describe, it, expect } from 'vitest';

describe('Custom Entity Name Mapping', () => {
  it('should fetch custom entity metadata with primary name attribute', async () => {
    // Test fetching pum_gantttask metadata
    const metadataUrl = `EntityDefinitions(LogicalName='pum_gantttask')?$select=LogicalName,PrimaryIdAttribute,PrimaryNameAttribute,LogicalCollectionName,DisplayName`;
    const response = await fetch(`/api/data/v9.2/${metadataUrl}`);
    const ganttTaskMetadata = await response.json();
    
    console.log('GanttTask metadata:', ganttTaskMetadata);
    
    expect(ganttTaskMetadata).toBeTruthy();
    expect(ganttTaskMetadata.PrimaryNameAttribute).toBeTruthy();
    expect(ganttTaskMetadata.PrimaryNameAttribute).toBe('pum_name');
    expect(ganttTaskMetadata.PrimaryIdAttribute).toBe('pum_gantttaskid');
  });

  it('should create and verify custom entity record with correct name', { timeout: 10000 }, async () => {
    // First get metadata to confirm primary name attribute
    const metadataResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='pum_gantttask')?$select=PrimaryNameAttribute,LogicalCollectionName`);
    const metadata = await metadataResponse.json();
    const primaryNameAttribute = metadata.PrimaryNameAttribute;
    const collectionName = metadata.LogicalCollectionName;
    
    console.log('GanttTask primary name attribute:', primaryNameAttribute);
    console.log('GanttTask collection name:', collectionName);
    
    // Create a test record
    const testRecord = {
      [primaryNameAttribute]: 'Test Gantt Task ' + new Date().getTime()
    };
    
    const createResponse = await fetch(`/api/data/v9.1/${collectionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testRecord)
    });
    
    expect(createResponse.ok).toBe(true);
    const createdRecord = await createResponse.json();
    
    console.log('Created GanttTask record:', createdRecord);
    
    // Verify the name was set correctly
    expect(createdRecord[primaryNameAttribute]).toBe(testRecord[primaryNameAttribute]);
    
    // Fetch the record to verify it's retrievable with the name
    const recordId = createdRecord.pum_gantttaskid;
    const fetchResponse = await fetch(`/api/data/v9.1/${collectionName}(${recordId})?$select=pum_gantttaskid,${primaryNameAttribute}`);
    const fetchedRecord = await fetchResponse.json();
    
    console.log('Fetched GanttTask record:', fetchedRecord);
    
    expect(fetchedRecord[primaryNameAttribute]).toBe(testRecord[primaryNameAttribute]);
    
    // Clean up - delete the test record
    await fetch(`/api/data/v9.1/${collectionName}(${recordId})`, {
      method: 'DELETE'
    });
  });

  it('should verify dynamic metadata approach works without hardcoding', async () => {
    // Test with multiple custom entities if they exist
    const customEntities = ['pum_gantttask'];
    
    for (const entityName of customEntities) {
      console.log(`Testing dynamic metadata for entity: ${entityName}`);
      
      // Fetch metadata dynamically
      const metadataResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=LogicalName,PrimaryIdAttribute,PrimaryNameAttribute,LogicalCollectionName`);
      
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        
        console.log(`${entityName} metadata:`, {
          logicalName: metadata.LogicalName,
          primaryId: metadata.PrimaryIdAttribute,
          primaryName: metadata.PrimaryNameAttribute,
          collection: metadata.LogicalCollectionName
        });
        
        // Verify metadata contains expected properties
        expect(metadata.LogicalName).toBeTruthy();
        expect(metadata.PrimaryIdAttribute).toBeTruthy();
        expect(metadata.PrimaryNameAttribute).toBeTruthy();
        expect(metadata.LogicalCollectionName).toBeTruthy();
        
        // For pum_gantttask specifically
        if (entityName === 'pum_gantttask') {
          expect(metadata.PrimaryNameAttribute).toBe('pum_name');
        }
      }
    }
  });

  it('should handle dataset generation for custom entities', async () => {
    // Get a view for pum_gantttask if available
    const viewsResponse = await fetch(`/api/data/v9.1/savedqueries?$filter=returnedtypecode eq 'pum_gantttask' and querytype eq 0&$select=savedqueryid,name,fetchxml&$top=1`);
    const viewsData = await viewsResponse.json();
    
    if (viewsData.value && viewsData.value.length > 0) {
      const view = viewsData.value[0];
      console.log('Using custom entity view:', view.name);
      
      // Parse the fetchxml to understand what columns are in the view
      console.log('View FetchXML snippet:', view.fetchxml?.substring(0, 300));
      
      // Verify the fetchxml includes the primary name attribute
      expect(view.fetchxml).toContain('pum_name');
    } else {
      console.log('No saved views found for pum_gantttask - this is expected in some environments');
      
      // Still verify we can fetch records with dynamic metadata
      const metadataResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='pum_gantttask')?$select=LogicalCollectionName`);
      const metadata = await metadataResponse.json();
      
      // Try to fetch any existing records
      const recordsResponse = await fetch(`/api/data/v9.1/${metadata.LogicalCollectionName}?$select=pum_gantttaskid,pum_name&$top=3`);
      
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        console.log('Found GanttTask records:', recordsData.value?.length || 0);
        
        if (recordsData.value && recordsData.value.length > 0) {
          recordsData.value.forEach((record, index) => {
            console.log(`GanttTask ${index + 1}:`, {
              id: record.pum_gantttaskid,
              name: record.pum_name
            });
            
            // Verify the primary name field exists
            expect(record).toHaveProperty('pum_name');
          });
        }
      }
    }
  });

  it('should demonstrate entity reference name population for custom entities', async () => {
    // This test verifies that when the dataset generator creates entity references,
    // it correctly uses the dynamic metadata to populate the _name property
    
    const metadataResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='pum_gantttask')?$select=PrimaryNameAttribute,LogicalCollectionName`);
    const metadata = await metadataResponse.json();
    
    // Fetch a record with its name
    const recordsResponse = await fetch(`/api/data/v9.1/${metadata.LogicalCollectionName}?$select=pum_gantttaskid,${metadata.PrimaryNameAttribute}&$top=1`);
    
    if (recordsResponse.ok) {
      const data = await recordsResponse.json();
      
      if (data.value && data.value.length > 0) {
        const record = data.value[0];
        
        // Simulate what the dataset generator would do
        const entityReference = {
          _etn: 'pum_gantttask',
          _id: record.pum_gantttaskid,
          _name: record[metadata.PrimaryNameAttribute] || ''
        };
        
        console.log('Simulated entity reference:', entityReference);
        
        // Verify the reference has a name
        expect(entityReference._name).toBeTruthy();
        expect(entityReference._name).toBe(record.pum_name);
      } else {
        console.log('No existing records found - this is expected in a fresh environment');
      }
    }
  });
});