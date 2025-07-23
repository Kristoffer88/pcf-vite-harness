import { describe, it, expect } from 'vitest';

describe('View Columns Analysis', () => {
  it('should check if views include primary keys with _value suffix', async () => {
    // Get views for pum_initiative
    const viewsUrl = `/api/data/v9.1/savedqueries?$filter=returnedtypecode eq 'pum_initiative' and querytype eq 0&$select=savedqueryid,name,fetchxml,layoutxml&$top=10`;
    const viewsResponse = await fetch(viewsUrl);
    
    if (!viewsResponse.ok) {
      console.warn('Could not fetch views for pum_initiative');
      return;
    }
    
    const viewsData = await viewsResponse.json();
    console.log(`\nFound ${viewsData.value?.length || 0} views for pum_initiative`);
    
    let foundPrimaryKeyAsLookup = false;
    
    for (const view of viewsData.value || []) {
      console.log(`\n=== View: ${view.name} ===`);
      
      // Check fetchxml for pum_initiativeid
      if (view.fetchxml && view.fetchxml.includes('pum_initiativeid')) {
        console.log('✓ View includes pum_initiativeid in fetchxml');
        
        // Check if it's aliased or formatted specially
        const matches = view.fetchxml.match(/attribute[^>]*name=["']pum_initiativeid["'][^>]*>/g);
        if (matches) {
          console.log('FetchXML references:');
          matches.forEach(match => {
            console.log(`  ${match}`);
            
            // Check for alias that might add _value
            if (match.includes('alias=')) {
              const aliasMatch = match.match(/alias=["']([^"']+)["']/);
              if (aliasMatch) {
                console.log(`  -> Alias: ${aliasMatch[1]}`);
                if (aliasMatch[1].includes('_value')) {
                  foundPrimaryKeyAsLookup = true;
                  console.log('  ⚠️ Primary key has _value alias!');
                }
              }
            }
          });
        }
      }
      
      // Check layoutxml columns
      if (view.layoutxml) {
        const columnMatches = view.layoutxml.match(/cell[^>]*name=["']([^"']+)["']/g);
        if (columnMatches) {
          const columns = columnMatches.map(m => m.match(/name=["']([^"']+)["']/)?.[1]).filter(Boolean);
          
          console.log('\nView columns:');
          columns.forEach(col => {
            console.log(`  - ${col}`);
            if (col === 'pum_initiativeid' || col.includes('pum_initiativeid')) {
              console.log('    ^ Primary key included in view');
            }
            if (col.includes('_value')) {
              console.log('    ^ Has _value suffix');
            }
          });
          
          // Check specifically for pum_initiativeid_value
          if (columns.includes('pum_initiativeid_value')) {
            foundPrimaryKeyAsLookup = true;
            console.log('\n⚠️ WARNING: View includes pum_initiativeid_value as a column!');
          }
        }
      }
    }
    
    if (foundPrimaryKeyAsLookup) {
      console.log('\n❌ ISSUE FOUND: Some views treat the primary key as a lookup field');
    } else {
      console.log('\n✅ No views found that treat primary key as lookup');
    }
  });

  it('should analyze dataset records for phantom lookup fields', async () => {
    // This test will help us understand if the issue is in the data itself
    console.log('\n=== Analyzing for phantom _pum_initiativeid_value field ===\n');
    
    // First, let's get a dataset view result to see raw data
    const initiativeUrl = '/api/data/v9.1/pum_initiatives?$top=2&$select=pum_initiativeid,pum_name,pum_initiative';
    
    try {
      const response = await fetch(initiativeUrl);
      const data = await response.json();
      
      console.log('Raw API response for pum_initiatives:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.value && data.value.length > 0) {
        console.log('\nChecking each record for phantom fields:');
        data.value.forEach((record, index) => {
          console.log(`\nRecord ${index + 1}:`);
          Object.keys(record).forEach(key => {
            if (key.includes('pum_initiative')) {
              console.log(`  ${key}: ${record[key]}`);
              if (key === '_pum_initiativeid_value') {
                console.log('  ⚠️ FOUND PHANTOM FIELD!');
              }
            }
          });
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  });

  it('should trace where _pum_initiativeid_value relationship is created', async () => {
    console.log('\n=== Tracing _pum_initiativeid_value Origin ===\n');
    
    console.log('Hypothesis 1: Column inferrence from view metadata');
    console.log('  - Views might include pum_initiativeid as a column');
    console.log('  - Code might add _value suffix to all fields ending with "id"');
    console.log('  - This creates phantom lookup relationship\n');
    
    console.log('Hypothesis 2: Pattern matching on discovered fields');
    console.log('  - Code finds fields in dataset that end with "id"');
    console.log('  - Assumes they are lookups and adds _value');
    console.log('  - Pattern matching (confidence: low) creates wrong relationship\n');
    
    console.log('Hypothesis 3: Self-referencing data structure');
    console.log('  - PCF dataset might include primary key in a special format');
    console.log('  - Framework adds _value to certain field types\n');
    
    // Let's check what columns PCF datasets typically have
    console.log('Checking typical PCF dataset structure...');
    
    // This would need actual PCF dataset inspection
    console.log('\nRecommendation: Add logging to:');
    console.log('1. discoverRelationshipsFromRecords() when it finds _value fields');
    console.log('2. Dataset column creation to see all columns');
    console.log('3. Pattern-based relationship guessing');
  });
});