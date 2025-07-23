import { describe, it, expect } from 'vitest';

describe('Lookup Targets Metadata Discovery', () => {
  it('should fetch lookup targets for all lookup fields on pum_initiative', async () => {
    // First get all attributes for pum_initiative
    const attrsUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='pum_initiative')/Attributes?$select=LogicalName,DisplayName,AttributeType&$filter=AttributeType eq 'Lookup' or AttributeType eq 'Customer' or AttributeType eq 'Owner'`;
    const attrsResponse = await fetch(attrsUrl);
    const attrsData = await attrsResponse.json();
    
    console.log(`\nFound ${attrsData.value?.length || 0} lookup attributes on pum_initiative:\n`);
    
    const lookupTargets = {};
    
    // For each lookup attribute, fetch its targets
    for (const attr of attrsData.value || []) {
      const lookupUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='pum_initiative')/Attributes(LogicalName='${attr.LogicalName}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets,DisplayName`;
      
      try {
        const lookupResponse = await fetch(lookupUrl);
        if (lookupResponse.ok) {
          const lookupData = await lookupResponse.json();
          lookupTargets[attr.LogicalName] = {
            displayName: lookupData.DisplayName?.UserLocalizedLabel?.Label || attr.DisplayName?.UserLocalizedLabel?.Label,
            targets: lookupData.Targets || [],
            dataFieldName: `_${attr.LogicalName}_value`
          };
          
          console.log(`${attr.LogicalName}:`);
          console.log(`  Display Name: ${lookupTargets[attr.LogicalName].displayName}`);
          console.log(`  Field in data: ${lookupTargets[attr.LogicalName].dataFieldName}`);
          console.log(`  Targets: ${lookupTargets[attr.LogicalName].targets.join(', ') || 'none'}`);
          
          if (lookupTargets[attr.LogicalName].targets.length === 0) {
            console.log(`  ⚠️ WARNING: No targets found - might be polymorphic`);
          }
        } else {
          console.error(`  ❌ Failed to fetch metadata for ${attr.LogicalName}: ${lookupResponse.status}`);
        }
      } catch (error) {
        console.error(`  ❌ Error fetching metadata for ${attr.LogicalName}:`, error.message);
      }
      
      console.log('');
    }
    
    // Verify we found some lookups with targets
    const lookupsWithTargets = Object.values(lookupTargets).filter(lt => lt.targets.length > 0);
    expect(lookupsWithTargets.length).toBeGreaterThan(0);
    
    console.log(`\nSummary: ${lookupsWithTargets.length} of ${Object.keys(lookupTargets).length} lookups have target metadata`);
  });

  it('should check if pum_initiativeid exists as a field name', async () => {
    // Check on various entities to see if pum_initiativeid is a field
    const entitiesToCheck = ['pum_gantttask', 'pum_initiative', 'pum_program', 'pum_portfolio'];
    
    console.log('\nChecking for pum_initiativeid field on entities:');
    
    for (const entity of entitiesToCheck) {
      try {
        const url = `/api/data/v9.2/EntityDefinitions(LogicalName='${entity}')/Attributes?$filter=LogicalName eq 'pum_initiativeid' or LogicalName eq 'pum_initiative'&$select=LogicalName,AttributeType,DisplayName`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.value && data.value.length > 0) {
            console.log(`\n${entity}:`);
            data.value.forEach(attr => {
              console.log(`  - ${attr.LogicalName} (${attr.AttributeType})`);
              console.log(`    Display: ${attr.DisplayName?.UserLocalizedLabel?.Label || 'N/A'}`);
              console.log(`    Data field: _${attr.LogicalName}_value`);
            });
          } else {
            console.log(`\n${entity}: No pum_initiative* fields found`);
          }
        }
      } catch (error) {
        console.error(`Error checking ${entity}:`, error.message);
      }
    }
  });

  it('should verify field name patterns in actual data vs metadata', async () => {
    // Get a sample pum_initiative record
    const recordsResponse = await fetch('/api/data/v9.1/pum_initiatives?$top=1');
    if (!recordsResponse.ok) {
      console.warn('Could not fetch pum_initiative records');
      return;
    }
    
    const recordsData = await recordsResponse.json();
    if (!recordsData.value || recordsData.value.length === 0) {
      console.warn('No pum_initiative records found');
      return;
    }
    
    const record = recordsData.value[0];
    const lookupFields = Object.keys(record).filter(key => key.endsWith('_value'));
    
    console.log('\nLookup fields in actual pum_initiative data:');
    lookupFields.forEach(field => {
      const attrName = field.slice(1, -6); // Remove _ and _value
      console.log(`  ${field} -> attribute name: ${attrName}`);
    });
    
    // Now check if _pum_initiativeid_value exists in the data
    const hasInitiativeIdField = lookupFields.includes('_pum_initiativeid_value');
    console.log(`\n_pum_initiativeid_value exists in data: ${hasInitiativeIdField}`);
    
    if (hasInitiativeIdField) {
      console.log('\n⚠️ Found _pum_initiativeid_value in data!');
      console.log('This suggests pum_initiativeid is a lookup field on pum_initiative itself.');
      console.log('Need to check what entity this references.');
    }
  });

  it('should analyze the relationship pattern causing the unknown entity issue', async () => {
    console.log('\n=== Analyzing the _pum_initiativeid_value issue ===\n');
    
    // The screenshot shows _pum_initiativeid_value with target entity "unknown"
    // Let's understand why this happens
    
    console.log('1. Field Pattern Analysis:');
    console.log('   _pum_initiativeid_value follows the standard lookup pattern');
    console.log('   Expected attribute name: pum_initiativeid');
    console.log('   But "pum_initiativeid" is likely the primary key, not a lookup!\n');
    
    console.log('2. Checking if pum_initiativeid is the primary key:');
    const entityResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='pum_initiative')?$select=PrimaryIdAttribute`);
    if (entityResponse.ok) {
      const entityData = await entityResponse.json();
      console.log(`   Primary key of pum_initiative: ${entityData.PrimaryIdAttribute}`);
      
      if (entityData.PrimaryIdAttribute === 'pum_initiativeid') {
        console.log('   ✅ Confirmed: pum_initiativeid is the primary key\n');
        
        console.log('3. Why is _pum_initiativeid_value appearing in relationships?');
        console.log('   This could be from:');
        console.log('   a) A self-referencing lookup on pum_initiative');
        console.log('   b) Data formatting that includes primary key with _value suffix');
        console.log('   c) A view that includes the primary key formatted as a lookup\n');
        
        // Check for self-referencing lookups
        const selfRefUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='pum_initiative')/Attributes?$filter=AttributeType eq 'Lookup' and contains(DisplayName/UserLocalizedLabel/Label, 'Initiative')&$select=LogicalName,DisplayName`;
        const selfRefResponse = await fetch(selfRefUrl);
        if (selfRefResponse.ok) {
          const selfRefData = await selfRefResponse.json();
          console.log('4. Self-referencing lookups on pum_initiative:');
          selfRefData.value?.forEach(attr => {
            console.log(`   - ${attr.LogicalName}: ${attr.DisplayName?.UserLocalizedLabel?.Label}`);
          });
        }
      }
    }
    
    console.log('\n=== Solution ===');
    console.log('The code should:');
    console.log('1. Check if a field name matches the entity primary key before treating it as a lookup');
    console.log('2. Use metadata API to verify if a field is actually a lookup attribute');
    console.log('3. Not infer entity names from field patterns for primary keys');
  });
});