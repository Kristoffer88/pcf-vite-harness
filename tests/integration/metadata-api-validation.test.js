import { describe, it, expect } from 'vitest';

describe('Metadata API Validation', () => {
  it('should validate the fixed metadata API calls for pum_gantttask', async () => {
    const entityLogicalName = 'pum_gantttask';
    
    // First test: Basic entity metadata fetch
    console.log(`\n🔍 Testing basic entity metadata fetch for ${entityLogicalName}...`);
    const entityUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute`;
    
    const entityResponse = await fetch(`/api/data/v9.2/${entityUrl}`);
    console.log(`Entity metadata response status: ${entityResponse.status}`);
    
    expect(entityResponse.ok).toBe(true);
    const entityData = await entityResponse.json();
    
    console.log('Entity metadata:', {
      logicalName: entityData.LogicalName,
      displayName: entityData.DisplayName?.UserLocalizedLabel?.Label,
      entitySetName: entityData.EntitySetName,
      primaryId: entityData.PrimaryIdAttribute,
      primaryName: entityData.PrimaryNameAttribute
    });
    
    expect(entityData.LogicalName).toBe(entityLogicalName);
    expect(entityData.PrimaryIdAttribute).toBeTruthy();
    expect(entityData.PrimaryNameAttribute).toBeTruthy();
  });

  it('should validate lookup attribute fetch for pum_gantttask', async () => {
    const entityLogicalName = 'pum_gantttask';
    
    // Second test: Lookup attributes with proper type casting
    console.log(`\n🔍 Testing lookup attributes fetch for ${entityLogicalName}...`);
    const lookupUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,DisplayName,AttributeType,Targets&$filter=IsValidForRead eq true`;
    
    const lookupResponse = await fetch(`/api/data/v9.2/${lookupUrl}`);
    console.log(`Lookup attributes response status: ${lookupResponse.status}`);
    
    expect(lookupResponse.ok).toBe(true);
    const lookupData = await lookupResponse.json();
    
    console.log(`Found ${lookupData.value?.length || 0} lookup attributes`);
    
    if (lookupData.value && lookupData.value.length > 0) {
      lookupData.value.forEach((attr, index) => {
        console.log(`\nLookup ${index + 1}: ${attr.LogicalName}`);
        console.log(`  Display Name: ${attr.DisplayName?.UserLocalizedLabel?.Label || 'N/A'}`);
        console.log(`  Targets: ${attr.Targets?.join(', ') || 'None'}`);
        console.log(`  Lookup field name: _${attr.LogicalName}_value`);
        
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
    console.log(`\n🔍 Testing metadata fetch for ${entityLogicalName}...`);
    
    // Basic entity metadata
    const entityUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute`;
    const entityResponse = await fetch(`/api/data/v9.2/${entityUrl}`);
    
    expect(entityResponse.ok).toBe(true);
    const entityData = await entityResponse.json();
    
    console.log('Entity metadata:', {
      logicalName: entityData.LogicalName,
      primaryId: entityData.PrimaryIdAttribute,
      primaryName: entityData.PrimaryNameAttribute
    });
    
    // Lookup attributes
    const lookupUrl = `EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,DisplayName,AttributeType,Targets&$filter=IsValidForRead eq true`;
    const lookupResponse = await fetch(`/api/data/v9.2/${lookupUrl}`);
    
    expect(lookupResponse.ok).toBe(true);
    const lookupData = await lookupResponse.json();
    
    console.log(`\nFound ${lookupData.value?.length || 0} lookup attributes for ${entityLogicalName}`);
    
    // Look for relationships to pum_gantttask
    const ganttTaskRelationships = lookupData.value?.filter(attr => 
      attr.Targets?.includes('pum_gantttask')
    ) || [];
    
    console.log(`\nRelationships to pum_gantttask: ${ganttTaskRelationships.length}`);
    ganttTaskRelationships.forEach(rel => {
      console.log(`  - ${rel.LogicalName} -> pum_gantttask`);
    });
  });

  it('should test relationship discovery between pum_initiative and pum_gantttask', async () => {
    console.log('\n🔍 Testing relationship discovery...');
    
    // Check from pum_gantttask side - looking for lookups to pum_initiative
    const ganttTaskLookupUrl = `EntityDefinitions(LogicalName='pum_gantttask')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,DisplayName,AttributeType,Targets&$filter=IsValidForRead eq true`;
    const ganttTaskResponse = await fetch(`/api/data/v9.2/${ganttTaskLookupUrl}`);
    
    expect(ganttTaskResponse.ok).toBe(true);
    const ganttTaskLookups = await ganttTaskResponse.json();
    
    // Find lookups that target pum_initiative
    const initiativeLookups = ganttTaskLookups.value?.filter(attr => 
      attr.Targets?.includes('pum_initiative')
    ) || [];
    
    console.log(`\npum_gantttask lookups to pum_initiative: ${initiativeLookups.length}`);
    initiativeLookups.forEach(lookup => {
      console.log(`  - ${lookup.LogicalName} (field: _${lookup.LogicalName}_value)`);
    });
    
    // The expected relationship field based on the logs
    const expectedField = initiativeLookups.find(l => 
      l.LogicalName === 'pum_initiativeid' || 
      `_${l.LogicalName}_value` === '_pum_initiativeid_value'
    );
    
    if (expectedField) {
      console.log(`\n✅ Found expected relationship field: ${expectedField.LogicalName}`);
      console.log(`   Lookup field name: _${expectedField.LogicalName}_value`);
    } else {
      console.log('\n⚠️ Expected relationship field not found, checking pattern...');
      // Log all lookup fields for debugging
      ganttTaskLookups.value?.forEach(attr => {
        if (attr.LogicalName.includes('initiative')) {
          console.log(`  Potential match: ${attr.LogicalName} -> ${attr.Targets?.join(', ')}`);
        }
      });
    }
  });

  it('should validate metadata caching behavior', async () => {
    console.log('\n🔍 Testing metadata caching...');
    
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
    
    console.log(`First request: ${time1}ms`);
    console.log(`Second request: ${time2}ms`);
    console.log(`Speed improvement: ${time2 < time1 ? 'Yes' : 'No'}`);
  });
});