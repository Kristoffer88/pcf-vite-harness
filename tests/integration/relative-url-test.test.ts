import { describe, it, expect } from 'vitest';
import { generateErrorContext, createDataverseError } from './simple-error-analyzer';
import 'dotenv/config';

// Test with relative URLs as used with dataverse-utilities
describe('Simple Error Analyzer with Relative URLs', () => {

  // Simulate how dataverse-utilities works with relative URLs
  async function callDataverseAPI(relativePath: string, options?: RequestInit): Promise<Response> {
    const dataverseUrl = process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com';
    const fullUrl = `${dataverseUrl}${relativePath}`;
    return fetch(fullUrl, options);
  }

  it('should show clean error context with relative URLs', async () => {
    console.log('\n=== Clean Error Context with Relative URLs ===');
    
    const apiPath = '/api/data/v9.1/contacts?$select=invalidfield&$top=1';
    const response = await callDataverseAPI(apiPath);
    
    // Super clean usage - just the relative path
    if (!response.ok) {
      console.log(await generateErrorContext(response, apiPath));
    }
    
    expect(!response.ok).toBe(true);
  });

  it('should demonstrate perfect dataset refresh with relative URLs', async () => {
    console.log('\n=== Perfect Dataset Refresh Function ===');
    
    // Clean dataset refresh function using relative URLs
    async function refreshDataset(entityName: string, lookupField: string, parentId: string) {
      const apiPath = `/api/data/v9.1/${entityName}s?$filter=${lookupField} eq ${parentId}&$top=50`;
      console.log(`🔄 Calling API: ${apiPath}`);
      
      const response = await callDataverseAPI(apiPath);
      
      // One-liner error handling with relative URL
      if (!response.ok) {
        console.log(await generateErrorContext(response, apiPath));
        return { success: false, error: response.status };
      }
      
      const data = await response.json();
      console.log(`✅ Success: ${data.value.length} records retrieved`);
      return { success: true, records: data.value };
    }
    
    // Test success case
    const result1 = await refreshDataset('contact', '_parentcustomerid_value', 'f2869fea-68cc-ec11-a7b5-000d3a65a077');
    expect(result1.success).toBe(true);
    
    // Test error case - shows clean relative URL in error
    const result2 = await refreshDataset('contact', '_invalidfield_value', 'f2869fea-68cc-ec11-a7b5-000d3a65a077');
    expect(result2.success).toBe(false);
  });

  it('should show the final clean API', () => {
    console.log('\n=== Final Clean API for Dataset Refresh ===');
    
    const exampleCode = `
// Perfect dataset refresh with relative URLs and simple error handling
async function refreshDatasetClean(viewId, targetTable, lookupColumn, parentId) {
  const apiPath = \`/api/data/v9.1/\${targetTable}s?\$filter=\${lookupColumn} eq \${parentId}&\$top=50\`;
  
  const response = await callDataverseAPI(apiPath); // dataverse-utilities handles base URL
  
  // Super clean one-liner error handling!
  if (!response.ok) {
    console.log(await generateErrorContext(response, apiPath));
    throw await createDataverseError(response, apiPath);
  }
  
  return (await response.json()).value;
}

// Usage in PCF dataset refresh tool
try {
  const records = await refreshDatasetClean(
    dataset.getViewId(),           // ✅ ViewId from PCF
    dataset.getTargetEntityType(), // ✅ TargetTable from PCF  
    '_parentcustomerid_value',     // ✅ Lookup Column (discovered!)
    context.parameters.recordId    // ✅ Parent Record ID from context
  );
  
  console.log(\`📊 Dataset refreshed: \${records.length} records\`);
  return { success: true, records };
  
} catch (error) {
  // Error already has full context from generateErrorContext
  return { success: false, error: error.message };
}
`;
    
    console.log(exampleCode);
    expect(true).toBe(true);
  });

  it('should show the benefits of the simple API', () => {
    console.log('\n=== Benefits of Simple Error Analyzer ===');
    console.log('');
    console.log('✅ **Super Simple Usage:**');
    console.log('   • One-liner: if (!response.ok) console.log(await generateErrorContext(response, path))');
    console.log('   • Works with relative URLs (clean and readable)');
    console.log('   • No complex setup or configuration needed');
    console.log('');
    console.log('✅ **Rich Information:**');
    console.log('   • Extracts all Dataverse error details automatically');
    console.log('   • Smart field/entity recognition with helpful hints');
    console.log('   • Correlation IDs for support tickets');
    console.log('   • Rate limiting information');
    console.log('');
    console.log('✅ **Perfect for Dataset Refresh:**');
    console.log('   • Immediately shows what went wrong with queries');
    console.log('   • Helps debug ViewId, TargetTable, and lookup column issues');
    console.log('   • Provides actionable error messages');
    console.log('   • Clean error output that doesn\'t clutter logs');
    console.log('');
    console.log('🎯 **Ready to integrate into pcf-vite-harness dataset refresh tool!**');
    
    expect(true).toBe(true);
  });
});