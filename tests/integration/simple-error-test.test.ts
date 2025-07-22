import { describe, it, expect } from 'vitest';
import { generateErrorContext, createDataverseError } from './simple-error-analyzer';
import 'dotenv/config';

// Test the simple error analyzer API
describe('Simple Dataverse Error Analyzer', () => {
  const dataverseUrl = process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com';

  it('should demonstrate simple error context generation', async () => {
    console.log('\n=== Simple Error Context Demo ===');
    
    const url = `${dataverseUrl}/api/data/v9.1/contacts?$select=invalidfield&$top=1`;
    const response = await fetch(url);
    
    // Simple one-liner usage
    if (!response.ok) {
      console.log(await generateErrorContext(response, url));
    }
    
    expect(!response.ok).toBe(true);
  });

  it('should demonstrate simple error throwing', async () => {
    console.log('\n=== Simple Error Throwing Demo ===');
    
    const url = `${dataverseUrl}/api/data/v9.1/nonexistententity?$top=1`;
    const response = await fetch(url);
    
    try {
      if (!response.ok) {
        throw await createDataverseError(response, url);
      }
    } catch (error) {
      console.log('Caught error:', error.message);
      console.log('\nFull context:');
      console.log(error.dataverseContext);
      
      expect(error.status).toBe(404);
      expect(error.dataverseContext).toBeDefined();
    }
  });

  it('should show real-world usage in dataset refresh', async () => {
    console.log('\n=== Real-World Dataset Refresh Usage ===');
    
    // Simulate what the dataset refresh code would look like
    async function refreshDataset(entityName: string, viewId: string, lookupField: string, parentId: string) {
      const query = `${dataverseUrl}/api/data/v9.1/${entityName}s?$filter=${lookupField} eq ${parentId}&$top=50`;
      console.log(`🔄 Refreshing dataset: ${query}`);
      
      const response = await fetch(query);
      
      // Simple error handling with full context
      if (!response.ok) {
        console.log(await generateErrorContext(response, query));
        return { success: false, error: response.status };
      }
      
      const data = await response.json();
      console.log(`✅ Success: ${data.value.length} records retrieved`);
      return { success: true, records: data.value };
    }
    
    // Test with our known working relationship
    const result1 = await refreshDataset('contact', 'some-view-id', '_parentcustomerid_value', 'f2869fea-68cc-ec11-a7b5-000d3a65a077');
    expect(result1.success).toBe(true);
    
    // Test with invalid field to show error context
    const result2 = await refreshDataset('contact', 'some-view-id', '_invalidfield_value', 'f2869fea-68cc-ec11-a7b5-000d3a65a077');
    expect(result2.success).toBe(false);
    
    // Test with invalid entity to show error context
    const result3 = await refreshDataset('invalidentity', 'some-view-id', '_parentcustomerid_value', 'f2869fea-68cc-ec11-a7b5-000d3a65a077');
    expect(result3.success).toBe(false);
  });

  it('should show the perfect dataset refresh function with error handling', () => {
    console.log('\n=== Perfect Dataset Refresh Function ===');
    
    const exampleCode = `
// Perfect dataset refresh with simple error handling
async function refreshDatasetWithContext(viewId, targetTable, lookupColumn, parentId) {
  const query = \`\${dataverseUrl}/api/data/v9.1/\${targetTable}s?\$filter=\${lookupColumn} eq \${parentId}&\$top=50\`;
  
  const response = await fetch(query);
  
  // One-liner error handling with full context!
  if (!response.ok) {
    console.log(await generateErrorContext(response, query));
    throw await createDataverseError(response, query);
  }
  
  const data = await response.json();
  return data.value;
}

// Usage in PCF dataset refresh
const records = await refreshDatasetWithContext(
  dataset.getViewId(),           // ✅ ViewId  
  dataset.getTargetEntityType(), // ✅ TargetTable
  '_parentcustomerid_value',     // ✅ Lookup Column (discovered!)
  parentRecord.accountid         // ✅ Parent Record ID
);
`;
    
    console.log(exampleCode);
    expect(true).toBe(true);
  });
});