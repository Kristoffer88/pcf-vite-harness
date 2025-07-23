import { describe, it, expect } from 'vitest';

describe('PUM Initiative Relationship Discovery', () => {
  it('should discover pum_initiativeid lookup target entity using metadata API', async () => {
    // First, let's check if pum_initiative entity exists and get its metadata
    const entityResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='pum_initiative')?$select=LogicalName,DisplayName,PrimaryIdAttribute,PrimaryNameAttribute`);
    
    if (!entityResponse.ok) {
      console.warn('pum_initiative entity not found, skipping test');
      return;
    }
    
    const entityMetadata = await entityResponse.json();
    console.log('pum_initiative entity metadata:', entityMetadata);
    
    // Now check for the pum_initiativeid attribute on entities that might have it
    // We need to find which entity has a lookup to pum_initiative
    const entitiesResponse = await fetch(`/api/data/v9.2/EntityDefinitions?$select=LogicalName&$filter=LogicalName eq 'pum_gantttask' or startswith(LogicalName, 'pum_')`);
    const entitiesData = await entitiesResponse.json();
    
    for (const entity of entitiesData.value || []) {
      console.log(`\nChecking entity: ${entity.LogicalName} for pum_initiativeid lookup`);
      
      // Check if this entity has a pum_initiativeid attribute
      const attrResponse = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='${entity.LogicalName}')/Attributes(LogicalName='pum_initiativeid')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets,DisplayName`);
      
      if (attrResponse.ok) {
        const lookupMetadata = await attrResponse.json();
        console.log(`Found pum_initiativeid on ${entity.LogicalName}:`, lookupMetadata);
        
        expect(lookupMetadata.Targets).toBeTruthy();
        expect(lookupMetadata.Targets).toContain('pum_initiative');
        
        console.log(`✅ Confirmed: ${entity.LogicalName} has lookup to pum_initiative via pum_initiativeid`);
        console.log('Target entities:', lookupMetadata.Targets);
      }
    }
  });

  it('should get all lookup attributes that reference pum_gantttask', async () => {
    // Use the Relationships navigation property to find all relationships where pum_gantttask is the referenced entity
    const relationshipsUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='pum_gantttask')/ManyToOneRelationships?$select=ReferencingEntity,ReferencingAttribute,ReferencedEntity,SchemaName`;
    
    const response = await fetch(relationshipsUrl);
    if (!response.ok) {
      console.warn('Could not fetch relationships for pum_gantttask');
      return;
    }
    
    const relationshipsData = await response.json();
    console.log(`\nFound ${relationshipsData.value?.length || 0} entities with lookups to pum_gantttask:`);
    
    const relationships = relationshipsData.value || [];
    
    // Group by referencing entity
    const byEntity = relationships.reduce((acc, rel) => {
      if (!acc[rel.ReferencingEntity]) {
        acc[rel.ReferencingEntity] = [];
      }
      acc[rel.ReferencingEntity].push({
        attribute: rel.ReferencingAttribute,
        relationship: rel.SchemaName
      });
      return acc;
    }, {});
    
    Object.entries(byEntity).forEach(([entity, rels]) => {
      console.log(`\n${entity}:`);
      rels.forEach(rel => {
        console.log(`  - ${rel.attribute} (${rel.relationship})`);
      });
    });
    
    // Check if pum_initiative has a lookup to pum_gantttask
    const pumInitiativeRels = relationships.filter(rel => rel.ReferencingEntity === 'pum_initiative');
    if (pumInitiativeRels.length > 0) {
      console.log('\n✅ Found lookups from pum_initiative to pum_gantttask:');
      pumInitiativeRels.forEach(rel => {
        console.log(`  - Attribute: ${rel.ReferencingAttribute}`);
        console.log(`  - Lookup field name: _${rel.ReferencingAttribute}_value`);
      });
    }
  });

  it('should discover relationship by analyzing actual dataset records', async () => {
    // Fetch some pum_initiative records to see what lookup fields they have
    const response = await fetch('/api/data/v9.1/pum_initiatives?$top=5');
    
    if (!response.ok) {
      console.warn('Could not fetch pum_initiative records');
      return;
    }
    
    const data = await response.json();
    console.log(`\nAnalyzing ${data.value?.length || 0} pum_initiative records for lookup fields:`);
    
    if (data.value && data.value.length > 0) {
      // Get all fields that end with _value (lookup fields)
      const firstRecord = data.value[0];
      const lookupFields = Object.keys(firstRecord).filter(key => key.endsWith('_value'));
      
      console.log('\nFound lookup fields:', lookupFields);
      
      // For each lookup field, try to get metadata
      for (const lookupField of lookupFields) {
        // Extract the attribute name (remove _ prefix and _value suffix)
        const attributeName = lookupField.slice(1, -6); // Remove _..._value
        console.log(`\nChecking lookup field: ${lookupField} (attribute: ${attributeName})`);
        
        // Try to get the lookup metadata
        const metadataUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='pum_initiative')/Attributes(LogicalName='${attributeName}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets,DisplayName`;
        
        try {
          const metadataResponse = await fetch(metadataUrl);
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            console.log(`  Targets: ${metadata.Targets?.join(', ') || 'none'}`);
            console.log(`  Display Name: ${metadata.DisplayName?.UserLocalizedLabel?.Label || 'N/A'}`);
          } else {
            console.log(`  ⚠️ Could not fetch metadata (${metadataResponse.status})`);
          }
        } catch (error) {
          console.log(`  ❌ Error fetching metadata:`, error.message);
        }
        
        // Also show sample values
        const sampleValues = data.value
          .map(record => record[lookupField])
          .filter(Boolean)
          .slice(0, 3);
        
        if (sampleValues.length > 0) {
          console.log(`  Sample values: ${sampleValues.join(', ')}`);
        }
      }
    }
  });

  it('should use relationship metadata to discover parent-child relationships', async () => {
    // This is the most reliable way - use the OneToManyRelationships
    const url = `/api/data/v9.2/EntityDefinitions(LogicalName='pum_initiative')/OneToManyRelationships?$select=ReferencingEntity,ReferencingAttribute,ReferencedEntity,SchemaName,ReferencedAttribute`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Could not fetch OneToMany relationships for pum_initiative');
      return;
    }
    
    const data = await response.json();
    console.log(`\nOneToMany relationships from pum_initiative (${data.value?.length || 0} found):`);
    
    data.value?.forEach(rel => {
      console.log(`\npum_initiative -> ${rel.ReferencingEntity}`);
      console.log(`  Via lookup: ${rel.ReferencingAttribute}`);
      console.log(`  Field name: _${rel.ReferencingAttribute}_value`);
      console.log(`  Relationship: ${rel.SchemaName}`);
    });
    
    // Check if pum_gantttask is in the list
    const ganttTaskRel = data.value?.find(rel => rel.ReferencingEntity === 'pum_gantttask');
    if (ganttTaskRel) {
      console.log('\n✅ Found relationship: pum_initiative -> pum_gantttask');
      console.log(`Lookup field on pum_gantttask: _${ganttTaskRel.ReferencingAttribute}_value`);
    }
  });
});