import { describe, it, expect, beforeAll } from 'vitest';
import 'dotenv/config';

// Test to discover the correct relationship syntax
describe('Relationship Discovery Tests', () => {
  let dataverseUrl: string;
  let testAccountId: string;

  beforeAll(async () => {
    dataverseUrl = process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com';

    // Get a test account ID
    const accountResponse = await fetch(`${dataverseUrl}/api/data/v9.1/accounts?$select=accountid&$top=1`);
    const accountData = await accountResponse.json();
    if (accountData.value && accountData.value.length > 0) {
      testAccountId = accountData.value[0].accountid;
      console.log('🎯 Using test account ID:', testAccountId);
    }
  });

  describe('Find Correct Lookup Syntax', () => {
    it('should test different lookup column syntaxes', async () => {
      if (!testAccountId) {
        console.log('⚠️ No test account available, skipping syntax tests');
        return;
      }

      // Test different possible syntaxes for the lookup
      const syntaxTests = [
        // Standard lookup field name
        `_parentaccountid_value eq ${testAccountId}`,
        // Without underscores
        `parentaccountid eq ${testAccountId}`,
        // With parentheses (navigation property)
        `parentaccountid/accountid eq ${testAccountId}`,
        // GUID with quotes
        `_parentaccountid_value eq '${testAccountId}'`,
        // GUID with parentheses
        `_parentaccountid_value eq (${testAccountId})`,
        // Different field name pattern
        `parentcustomerid eq ${testAccountId}`,
        `_parentcustomerid_value eq ${testAccountId}`,
        // Account lookup might be different
        `accountid eq ${testAccountId}`,
      ];

      for (const syntax of syntaxTests) {
        console.log(`🧪 Testing syntax: $filter=${syntax}`);
        
        const testUrl = `${dataverseUrl}/api/data/v9.1/contacts?$select=fullname,contactid&$filter=${syntax}&$top=5`;
        
        try {
          const response = await fetch(testUrl);
          const data = await response.json();
          
          console.log(`📊 Status: ${response.status}, Records: ${data.value?.length || 0}`);
          
          if (response.ok) {
            console.log(`✅ WORKING SYNTAX: $filter=${syntax}`);
            console.log(`📄 Sample record:`, data.value?.[0]);
            
            // This syntax works! Let's save it
            expect(response.ok).toBe(true);
            return; // Found working syntax
          } else if (data.error) {
            console.log(`❌ Error: ${data.error.message}`);
          }
        } catch (error) {
          console.log(`❌ Exception:`, error.message);
        }
      }
    });

    it('should explore contact entity metadata', async () => {
      // Get the actual field names available on contact entity
      const metadataUrl = `${dataverseUrl}/api/data/v9.1/contacts?$select=*&$top=1`;
      console.log('🔍 Getting contact field metadata...');
      
      const response = await fetch(metadataUrl);
      const data = await response.json();
      
      if (response.ok && data.value && data.value[0]) {
        const sampleContact = data.value[0];
        console.log('📄 Available fields on contact:');
        
        // Look for fields that might be related to account
        Object.keys(sampleContact).forEach(key => {
          if (key.toLowerCase().includes('account') || key.toLowerCase().includes('parent') || key.toLowerCase().includes('customer')) {
            console.log(`🔗 Potential account field: ${key} = ${sampleContact[key]}`);
          }
        });
      }
      
      expect(response.ok).toBe(true);
    });

    it('should get entity definition for contact', async () => {
      // Query the actual entity definition to see available relationships
      const entityUrl = `${dataverseUrl}/api/data/v9.1/EntityDefinitions(LogicalName='contact')/Attributes?$filter=AttributeType eq Microsoft.Dynamics.CRM.AttributeTypeCode'Lookup'&$select=LogicalName,DisplayName`;
      console.log('🔍 Getting contact lookup attributes...');
      
      const response = await fetch(entityUrl);
      const data = await response.json();
      
      console.log('📊 Lookup attributes response:', {
        status: response.status,
        attributes: data.value?.map(attr => ({ name: attr.LogicalName, display: attr.DisplayName?.UserLocalizedLabel?.Label }))
      });
      
      if (response.ok) {
        expect(data.value).toBeDefined();
      }
    });

    it('should try to create a test contact with account relationship', async () => {
      if (!testAccountId) {
        console.log('⚠️ No test account available, skipping contact creation');
        return;
      }

      // Try to create a test contact related to our test account
      const newContact = {
        firstname: 'Test',
        lastname: 'Contact-' + Date.now(),
        // Try different ways to set the parent account
        '_parentaccountid_value': testAccountId
      };

      console.log('🏗️ Creating test contact with parent account:', testAccountId);
      
      const createResponse = await fetch(`${dataverseUrl}/api/data/v9.1/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(newContact)
      });

      console.log('📊 Create contact response:', createResponse.status);
      
      if (createResponse.ok) {
        const locationHeader = createResponse.headers.get('OData-EntityId');
        console.log('✅ Contact created:', locationHeader);
        
        // Now try to query this contact back using the relationship
        const contactId = locationHeader?.match(/contacts\(([^)]+)\)/)?.[1];
        if (contactId) {
          const queryUrl = `${dataverseUrl}/api/data/v9.1/contacts(${contactId})?$select=fullname,_parentaccountid_value`;
          const queryResponse = await fetch(queryUrl);
          const queryData = await queryResponse.json();
          
          console.log('📄 Created contact data:', queryData);
          
          // Clean up - delete the test contact
          await fetch(`${dataverseUrl}/api/data/v9.1/contacts(${contactId})`, { method: 'DELETE' });
          console.log('🧹 Test contact cleaned up');
        }
      } else {
        const errorData = await createResponse.json();
        console.log('❌ Create contact error:', errorData);
      }
      
      // Don't fail the test if creation doesn't work, we're just exploring
      expect(true).toBe(true);
    });
  });
});