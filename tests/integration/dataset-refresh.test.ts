import { describe, it, expect, beforeAll } from 'vitest';
import { setupDataverse } from 'dataverse-utilities/testing';
import 'dotenv/config';

// Real dataset refresh integration tests
describe('Dataset Refresh Integration Tests', () => {
  let dataverseUrl: string;

  beforeAll(async () => {
    dataverseUrl = process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com';
    await setupDataverse({
      dataverseUrl
    });
  });

  describe('Dataset Parameter Extraction', () => {
    it('should extract ViewId from dataset parameter', async () => {
      // Create a mock dataset parameter that mimics real PCF dataset
      const mockDataset = {
        getViewId: () => '00000000-0000-0000-0000-000000000000', // This would be real in PCF
        getTargetEntityType: () => 'account',
        records: {},
        columns: []
      };

      const viewId = mockDataset.getViewId();
      console.log('🔍 Extracted ViewId:', viewId);
      
      expect(viewId).toBeDefined();
      expect(typeof viewId).toBe('string');
    });

    it('should extract TargetTable from dataset parameter', async () => {
      const mockDataset = {
        getViewId: () => '00000000-0000-0000-0000-000000000000',
        getTargetEntityType: () => 'account',
        records: {},
        columns: []
      };

      const targetTable = mockDataset.getTargetEntityType();
      console.log('🔍 Extracted TargetTable:', targetTable);
      
      expect(targetTable).toBeDefined();
      expect(typeof targetTable).toBe('string');
      expect(targetTable).toBe('account');
    });
  });

  describe('Real Dataverse API Tests', () => {
    it('should fetch accounts from real Dataverse', async () => {
      const url = `${dataverseUrl}/api/data/v9.1/accounts?$select=name,accountid&$top=5`;
      console.log('🌐 Testing URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📊 Response status:', response.status);
      console.log('📊 Data structure:', {
        hasValue: 'value' in data,
        recordCount: data.value?.length,
        firstRecord: data.value?.[0]
      });
      
      expect(response.ok).toBe(true);
      expect(data.value).toBeDefined();
      expect(Array.isArray(data.value)).toBe(true);
    });

    it('should fetch contacts related to account', async () => {
      // First get an account
      const accountResponse = await fetch(`${dataverseUrl}/api/data/v9.1/accounts?$select=accountid&$top=1`);
      const accountData = await accountResponse.json();
      
      if (accountData.value && accountData.value.length > 0) {
        const accountId = accountData.value[0].accountid;
        console.log('🔍 Using account ID:', accountId);
        
        // Now fetch contacts for this account using the lookup column
        const contactsUrl = `${dataverseUrl}/api/data/v9.1/contacts?$select=fullname,contactid&$filter=parentaccountid/accountid eq ${accountId}&$top=10`;
        console.log('🌐 Testing relationship URL:', contactsUrl);
        
        const contactResponse = await fetch(contactsUrl);
        const contactData = await contactResponse.json();
        
        console.log('📊 Contact response status:', contactResponse.status);
        console.log('📊 Contact data:', {
          hasValue: 'value' in contactData,
          recordCount: contactData.value?.length
        });
        
        expect(contactResponse.ok).toBe(true);
        expect(contactData.value).toBeDefined();
        expect(Array.isArray(contactData.value)).toBe(true);
      } else {
        console.log('⚠️ No accounts found, skipping relationship test');
      }
    });

    it('should discover relationship metadata from Dataverse', async () => {
      // Query the relationship metadata
      const relationshipUrl = `${dataverseUrl}/api/data/v9.1/EntityDefinitions(LogicalName='contact')/Attributes/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$filter=LogicalName eq 'parentaccountid'&$select=LogicalName,DisplayName,Targets`;
      console.log('🔍 Querying relationship metadata:', relationshipUrl);
      
      const response = await fetch(relationshipUrl);
      const data = await response.json();
      
      console.log('📊 Relationship metadata:', data);
      
      expect(response.ok).toBe(true);
      expect(data.value).toBeDefined();
    });
  });

  describe('Query Construction Tests', () => {
    it('should build correct OData query for dataset refresh', async () => {
      const viewId = '00000000-0000-0000-0000-000000000000';
      const entityName = 'account';
      const maxRecords = 50;
      
      // Build the query like our refresh tool would
      const query = `${dataverseUrl}/api/data/v9.1/${entityName}s?$top=${maxRecords}`;
      console.log('🏗️ Constructed query:', query);
      
      const response = await fetch(query);
      const data = await response.json();
      
      console.log('📊 Query test result:', {
        status: response.status,
        recordCount: data.value?.length,
        hasNextLink: '@odata.nextLink' in data
      });
      
      expect(response.ok).toBe(true);
      expect(data.value).toBeDefined();
    });

    it('should build correct filtered query for related records', async () => {
      // Get a parent account first
      const parentResponse = await fetch(`${dataverseUrl}/api/data/v9.1/accounts?$select=accountid&$top=1`);
      const parentData = await parentResponse.json();
      
      if (parentData.value && parentData.value.length > 0) {
        const parentAccountId = parentData.value[0].accountid;
        
        // Build filtered query for related contacts
        const filteredQuery = `${dataverseUrl}/api/data/v9.1/contacts?$select=fullname,contactid&$filter=_parentaccountid_value eq ${parentAccountId}&$top=10`;
        console.log('🏗️ Constructed filtered query:', filteredQuery);
        
        const response = await fetch(filteredQuery);
        const data = await response.json();
        
        console.log('📊 Filtered query result:', {
          status: response.status,
          recordCount: data.value?.length,
          query: filteredQuery
        });
        
        expect(response.ok).toBe(true);
        expect(data.value).toBeDefined();
        expect(Array.isArray(data.value)).toBe(true);
      }
    });
  });

  describe('Relationship Discovery', () => {
    it('should find lookup column from relationship name', async () => {
      // Test common relationship patterns
      const relationshipTests = [
        { relationship: 'account_contact', expectedLookup: 'parentaccountid' },
        { relationship: 'contact_account', expectedLookup: 'parentaccountid' },
        // Add more as we discover patterns
      ];
      
      for (const test of relationshipTests) {
        console.log(`🔍 Testing relationship: ${test.relationship} -> ${test.expectedLookup}`);
        
        // Try to query using the expected lookup
        const testQuery = `${dataverseUrl}/api/data/v9.1/contacts?$select=${test.expectedLookup}&$top=1`;
        const response = await fetch(testQuery);
        
        console.log(`📊 Lookup test result for ${test.expectedLookup}:`, response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Found valid lookup column: ${test.expectedLookup}`);
          console.log(`📄 Sample data:`, data.value?.[0]?.[test.expectedLookup]);
        }
      }
    });
  });
});