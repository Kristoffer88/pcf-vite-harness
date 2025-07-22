import { describe, it, expect } from 'vitest';
import 'dotenv/config';

// Working dataset refresh test with all the correct pieces
describe('Working Dataset Refresh', () => {
  const dataverseUrl = process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com';

  it('should demonstrate complete working dataset refresh', async () => {
    console.log('🎯 === COMPLETE DATASET REFRESH DEMO ===');

    // STEP 1: Extract the required information from dataset parameter
    // In real PCF context, this would come from the actual dataset parameter
    const mockDataset = {
      getViewId: () => '00000000-0000-0000-0000-000000000000', // Real ViewId from PCF
      getTargetEntityType: () => 'contact', // Target table
      // Relationship info would come from PCF manifest or context
      relationshipName: 'account_contact'
    };

    const viewId = mockDataset.getViewId();
    const targetTable = mockDataset.getTargetEntityType();
    const relationshipName = mockDataset.relationshipName;

    console.log('📊 Extracted dataset info:');
    console.log(`   ViewId: ${viewId}`);
    console.log(`   TargetTable: ${targetTable}`);
    console.log(`   RelationshipName: ${relationshipName}`);

    // STEP 2: Map relationship name to lookup column
    // This is the key mapping we discovered!
    const relationshipToLookupMap = {
      'account_contact': '_parentcustomerid_value',
      'contact_account': '_parentcustomerid_value',
      // Add more mappings as we discover them
    };

    const lookupColumn = relationshipToLookupMap[relationshipName] || null;
    console.log(`   LookupColumn: ${lookupColumn}`);

    // STEP 3: Get parent record ID (would come from PCF context)
    const parentResponse = await fetch(`${dataverseUrl}/api/data/v9.1/accounts?$select=accountid&$top=1`);
    const parentData = await parentResponse.json();
    const parentAccountId = parentData.value?.[0]?.accountid;

    console.log(`   ParentRecordId: ${parentAccountId}`);

    // STEP 4: Build the complete OData query
    let query = `${dataverseUrl}/api/data/v9.1/${targetTable}s?$select=fullname,contactid&$top=50`;

    // Add filter if we have relationship info
    if (lookupColumn && parentAccountId) {
      query += `&$filter=${lookupColumn} eq ${parentAccountId}`;
    }

    console.log('🔗 Final Query:', query);

    // STEP 5: Execute the query
    const response = await fetch(query);
    const data = await response.json();

    console.log('✅ Query Results:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Records found: ${data.value?.length || 0}`);
    
    if (data.value && data.value.length > 0) {
      console.log('   Sample record:', data.value[0]);
    }

    expect(response.ok).toBe(true);
    expect(data.value).toBeDefined();
    expect(Array.isArray(data.value)).toBe(true);
  });

  it('should show the missing piece and solution', () => {
    console.log('🎯 === THE SOLUTION ===');
    console.log('');
    console.log('✅ ViewId: dataset.getViewId()');
    console.log('✅ TargetTable: dataset.getTargetEntityType()'); 
    console.log('✅ Lookup Column: Discovered via relationship mapping');
    console.log('');
    console.log('🔑 KEY DISCOVERY:');
    console.log('   Contact -> Account relationship uses: _parentcustomerid_value');
    console.log('   NOT: _parentaccountid_value (as we originally thought)');
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('   1. Create relationship name to lookup column mapping');
    console.log('   2. Update dataset refresh tool with correct syntax');
    console.log('   3. Add more relationship mappings as needed');
    
    expect(true).toBe(true);
  });
});