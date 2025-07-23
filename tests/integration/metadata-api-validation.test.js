import { describe, it, expect } from 'vitest';

describe('Metadata API Validation', () => {
  it('should validate the fixed metadata API calls for pum_gantttask', async () => {
    const entityLogicalName = 'pum_gantttask';
    
    // First test: Basic entity metadata fetch
    const entityUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute`;
    
    const entityResponse = await fetch(`/api/data/v9.2/${entityUrl}`);
    
    expect(entityResponse.ok).toBe(true);
    const entityData = await entityResponse.json();
    
    expect(entityData.LogicalName).toBe(entityLogicalName);
    expect(entityData.PrimaryIdAttribute).toBeTruthy();
    expect(entityData.PrimaryNameAttribute).toBeTruthy();
  });

  it('should validate lookup attribute fetch for pum_gantttask', async () => {
    const entityLogicalName = 'pum_gantttask';
    
    // Second test: Lookup attributes with proper type casting
    const lookupUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,DisplayName,AttributeType,Targets&$filter=IsValidForRead eq true`;
    
    const lookupResponse = await fetch(`/api/data/v9.2/${lookupUrl}`);
    expect(lookupResponse.ok).toBe(true);
    const lookupData = await lookupResponse.json();
    
    if (lookupData.value && lookupData.value.length > 0) {
      lookupData.value.forEach((attr, index) => {
        
        // Validate structure
        expect(attr.LogicalName).toBeTruthy();
        // Owner and Customer are special types of lookup attributes
        expect(['Lookup', 'Owner', 'Customer']).toContain(attr.AttributeType);
      });
    }
  });

  it('should validate the fixed metadata API calls for pum_initiative', async () => {
    const entityLogicalName = 'pum_initiative';
    
    // Test for pum_initiative as well
    
    // Basic entity metadata
    const entityUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute`;
    const entityResponse = await fetch(`/api/data/v9.2/${entityUrl}`);
    
    expect(entityResponse.ok).toBe(true);
    const entityData = await entityResponse.json();
    
    
    // Lookup attributes
    const lookupUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,DisplayName,AttributeType,Targets&$filter=IsValidForRead eq true`;
    const lookupResponse = await fetch(`/api/data/v9.2/${lookupUrl}`);
    
    expect(lookupResponse.ok).toBe(true);
    const lookupData = await lookupResponse.json();
    
    
    // Look for relationships to pum_gantttask
    const ganttTaskRelationships = lookupData.value?.filter(attr => 
      attr.Targets?.includes('pum_gantttask')
    ) || [];
    
  });

  it('should test relationship discovery between pum_initiative and pum_gantttask', async () => {
    
    // Check from pum_gantttask side - looking for lookups to pum_initiative
    const ganttTaskLookupUrl = `EntityDefinitions(LogicalName='pum_gantttask')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,DisplayName,AttributeType,Targets&$filter=IsValidForRead eq true`;
    const ganttTaskResponse = await fetch(`/api/data/v9.2/${ganttTaskLookupUrl}`);
    
    expect(ganttTaskResponse.ok).toBe(true);
    const ganttTaskLookups = await ganttTaskResponse.json();
    
    // Find lookups that target pum_initiative
    const initiativeLookups = ganttTaskLookups.value?.filter(attr => 
      attr.Targets?.includes('pum_initiative')
    ) || [];
    
    
    // The expected relationship field based on the logs
    const expectedField = initiativeLookups.find(l => 
      l.LogicalName === 'pum_initiativeid' || 
      `_${l.LogicalName}_value` === '_pum_initiativeid_value'
    );
    
    if (expectedField) {
      // Found expected relationship field
    } else {
      // Check pattern for debugging
    }
  });

  it('should validate metadata caching behavior', async () => {
    // Make the same request twice to see if caching works
    const entityLogicalName = 'pum_gantttask';
    const entityUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute`;
    
    // First request
    const start1 = Date.now();
    const response1 = await fetch(`/api/data/v9.2/${entityUrl}`);
    const time1 = Date.now() - start1;
    expect(response1.ok).toBe(true);
    
    // Second request (might be browser cached)
    const start2 = Date.now();
    const response2 = await fetch(`/api/data/v9.2/${entityUrl}`);
    const time2 = Date.now() - start2;
    expect(response2.ok).toBe(true);
    
  });
});