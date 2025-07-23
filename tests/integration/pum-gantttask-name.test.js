import { describe, it, expect } from 'vitest';

describe('PUM GanttTask Name Mapping', () => {
  it('should fetch pum_gantttask metadata and identify primary name field', async () => {
    // Fetch metadata for pum_gantttask
    const metadataUrl = `EntityDefinitions(LogicalName='pum_gantttask')?$select=LogicalName,PrimaryIdAttribute,PrimaryNameAttribute,LogicalCollectionName,DisplayName`;
    const response = await fetch(`/api/data/v9.2/${metadataUrl}`);
    const metadata = await response.json();
    
    console.log('pum_gantttask metadata:', metadata);
    
    expect(metadata).toBeTruthy();
    expect(metadata.PrimaryNameAttribute).toBeTruthy();
    
    console.log('Primary name attribute for pum_gantttask:', metadata.PrimaryNameAttribute);
  });

  it('should fetch pum_gantttask records and verify name field', async () => {
    // First get metadata to know the primary name field
    const metadataResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='pum_gantttask')?$select=PrimaryNameAttribute,PrimaryIdAttribute`);
    const metadata = await metadataResponse.json();
    
    console.log('Primary fields:', {
      id: metadata.PrimaryIdAttribute,
      name: metadata.PrimaryNameAttribute
    });
    
    // Fetch some pum_gantttask records
    const response = await fetch('/api/data/v9.1/pum_gantttasks?$top=5');
    const data = await response.json();
    
    console.log(`Found ${data.value?.length || 0} pum_gantttask records`);
    
    if (data.value && data.value.length > 0) {
      // Check first few records
      data.value.forEach((task, index) => {
        console.log(`\nTask ${index + 1}:`, {
          id: task[metadata.PrimaryIdAttribute],
          primaryNameField: metadata.PrimaryNameAttribute,
          primaryNameValue: task[metadata.PrimaryNameAttribute],
          // Check common name fields
          name: task.name,
          pum_name: task.pum_name,
          pum_gantttaskname: task.pum_gantttaskname,
          // List all fields that might contain a name
          nameFields: Object.keys(task).filter(k => 
            k.includes('name') || 
            k.includes('title') || 
            k.includes('subject')
          ).map(k => ({ field: k, value: task[k] }))
        });
        
        // Check if the primary name field has a value
        const primaryNameValue = task[metadata.PrimaryNameAttribute];
        if (!primaryNameValue || primaryNameValue === '') {
          console.warn(`⚠️ Task ${index + 1} has empty primary name field!`);
        }
      });
    }
  });

  it('should check what fields are available in pum_gantttask', async () => {
    // Get attribute metadata to understand all fields
    const response = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='pum_gantttask')/Attributes?$select=LogicalName,AttributeType,DisplayName&$filter=IsValidForRead eq true`);
    const data = await response.json();
    
    console.log('\nAll readable attributes for pum_gantttask:');
    
    // Find name-like attributes
    const nameAttributes = data.value.filter(attr => 
      attr.LogicalName.includes('name') || 
      attr.LogicalName.includes('title') ||
      attr.LogicalName.includes('subject')
    );
    
    console.log('\nName-related attributes:');
    nameAttributes.forEach(attr => {
      console.log(`- ${attr.LogicalName} (${attr.AttributeType})`);
    });
    
    // Find the primary name attribute
    const primaryNameAttr = data.value.find(attr => attr.IsPrimaryName === true);
    if (primaryNameAttr) {
      console.log('\nPrimary name attribute from metadata:', primaryNameAttr.LogicalName);
    }
  });

  it('should test the specific view being used', async () => {
    // Based on the logs, it seems like a specific view is being used
    // Let's check what views are available for pum_gantttask
    const viewsResponse = await fetch(`/api/data/v9.1/savedqueries?$filter=returnedtypecode eq 'pum_gantttask' and querytype eq 0&$select=savedqueryid,name,fetchxml&$top=5`);
    const viewsData = await viewsResponse.json();
    
    console.log(`\nFound ${viewsData.value?.length || 0} views for pum_gantttask`);
    
    if (viewsData.value && viewsData.value.length > 0) {
      viewsData.value.forEach((view, index) => {
        console.log(`\nView ${index + 1}: ${view.name}`);
        
        // Parse fetchxml to see what columns are included
        if (view.fetchxml) {
          const nameMatches = view.fetchxml.match(/attribute name="([^"]+)"/g);
          if (nameMatches) {
            const attributes = nameMatches.map(m => m.match(/name="([^"]+)"/)?.[1]).filter(Boolean);
            console.log('Columns in view:', attributes);
            
            // Check if any name field is included
            const hasNameField = attributes.some(attr => 
              attr.includes('name') || 
              attr.includes('title')
            );
            console.log('View includes name field:', hasNameField);
          }
        }
      });
    }
  });
});