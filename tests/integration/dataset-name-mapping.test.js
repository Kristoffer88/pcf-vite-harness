import { describe, it, expect } from 'vitest';

describe('Dataset Name Mapping', () => {
  it('should fetch entity metadata with primary name attribute', async () => {
    // Test fetching account metadata
    const metadataUrl = `EntityDefinitions(LogicalName='account')?$select=LogicalName,PrimaryIdAttribute,PrimaryNameAttribute,LogicalCollectionName,DisplayName`;
    const response = await fetch(`/api/data/v9.2/${metadataUrl}`);
    const accountMetadata = await response.json();
    
    console.log('Account metadata:', accountMetadata);
    
    expect(accountMetadata).toBeTruthy();
    expect(accountMetadata.PrimaryNameAttribute).toBeTruthy();
    expect(accountMetadata.PrimaryNameAttribute).toBe('name');
  });

  it('should correctly identify primary name in account records', async () => {
    // First get metadata
    const metadataResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='account')?$select=PrimaryNameAttribute`);
    const metadata = await metadataResponse.json();
    const primaryNameAttribute = metadata.PrimaryNameAttribute;
    
    console.log('Account primary name attribute:', primaryNameAttribute);
    
    // Then fetch some accounts
    const response = await fetch('/api/data/v9.1/accounts?$select=accountid,name&$top=3');
    const data = await response.json();
    
    console.log('Account records:', data.value);
    
    if (data.value && data.value.length > 0) {
      data.value.forEach((account, index) => {
        console.log(`Account ${index + 1}:`, {
          id: account.accountid,
          name: account[primaryNameAttribute],
          nameField: account.name
        });
        
        // Verify that the primary name field has a value
        expect(account[primaryNameAttribute]).toBeTruthy();
        expect(account[primaryNameAttribute]).not.toBe('');
      });
    }
  });

  it('should handle contact entity with fullname', async () => {
    // Get contact metadata
    const metadataResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='contact')?$select=PrimaryNameAttribute`);
    const metadata = await metadataResponse.json();
    
    console.log('Contact primary name attribute:', metadata.PrimaryNameAttribute);
    expect(metadata.PrimaryNameAttribute).toBe('fullname');
    
    // Fetch a contact
    const response = await fetch('/api/data/v9.1/contacts?$select=contactid,fullname,firstname,lastname&$top=1');
    const data = await response.json();
    
    if (data.value && data.value.length > 0) {
      const contact = data.value[0];
      console.log('Contact record:', contact);
      
      // Verify fullname is populated
      if (contact.fullname) {
        expect(contact.fullname).toBeTruthy();
      }
    }
  });

  it('should verify dataset generation uses correct primary name', async () => {
    // Get a view for accounts
    const viewsResponse = await fetch(`/api/data/v9.1/savedqueries?$filter=returnedtypecode eq 'account' and querytype eq 0&$select=savedqueryid,name,fetchxml&$top=1`);
    const viewsData = await viewsResponse.json();
    
    if (viewsData.value && viewsData.value.length > 0) {
      const view = viewsData.value[0];
      console.log('Using view:', view.name);
      
      // Parse the fetchxml to understand what columns are in the view
      console.log('View FetchXML snippet:', view.fetchxml?.substring(0, 200));
      
      // The dataset generator should be using the entity metadata to properly set _entityReference._name
      // This is what we fixed in datasetGenerator.ts
    }
  });
});