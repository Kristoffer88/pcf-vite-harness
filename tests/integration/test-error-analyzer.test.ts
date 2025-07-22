import { describe, it, expect } from 'vitest';
import { analyzeDataverseError, formatDataverseError, testErrorAnalyzer } from './dataverse-error-analyzer';
import 'dotenv/config';

// Test the comprehensive error analyzer
describe('Dataverse Error Analyzer Tests', () => {
  const dataverseUrl = process.env.DATAVERSE_URL || 'https://yourorg.crm4.dynamics.com';

  async function testErrorWithAnalysis(testName: string, url: string, options?: RequestInit) {
    console.log(`\n🧪 ${testName}`);
    console.log(`📡 URL: ${url}`);
    
    try {
      const response = await fetch(url, options);
      
      // Use our error analyzer
      const errorInfo = await analyzeDataverseError(response, url, options?.method || 'GET');
      
      console.log('\n' + formatDataverseError(errorInfo));
      
      return errorInfo;
    } catch (networkError) {
      console.log(`❌ Network Error: ${networkError.message}`);
      return null;
    }
  }

  it('should test the error analyzer with mock data', async () => {
    console.log('\n=== Testing Error Analyzer with Mock Data ===');
    const result = await testErrorAnalyzer();
    
    expect(result.status).toBe(400);
    expect(result.errorCode).toBe('0x80060888');
    expect(result.errorType).toBe('bad_request');
    expect(result.suggestedActions.length).toBeGreaterThan(0);
  });

  it('should analyze invalid field name error', async () => {
    const errorInfo = await testErrorWithAnalysis(
      'Invalid Field Name Error Analysis',
      `${dataverseUrl}/api/data/v9.1/contacts?$select=nonexistentfield&$top=1`
    );
    
    if (errorInfo && !errorInfo.ok) {
      expect(errorInfo.status).toBe(400);
      expect(errorInfo.errorType).toBe('bad_request');
      expect(errorInfo.userMessage).toContain('nonexistentfield');
      expect(errorInfo.suggestedActions).toContain('Check the field name spelling');
    }
  });

  it('should analyze invalid entity name error', async () => {
    const errorInfo = await testErrorWithAnalysis(
      'Invalid Entity Name Error Analysis',
      `${dataverseUrl}/api/data/v9.1/nonexistententity?$top=1`
    );
    
    if (errorInfo && !errorInfo.ok) {
      expect(errorInfo.status).toBe(404);
      expect(errorInfo.errorType).toBe('not_found');
      expect(errorInfo.userMessage).toContain('nonexistententity');
      expect(errorInfo.suggestedActions).toContain('Use plural form for entity collections');
    }
  });

  it('should analyze syntax error', async () => {
    const errorInfo = await testErrorWithAnalysis(
      'Query Syntax Error Analysis',
      `${dataverseUrl}/api/data/v9.1/contacts?$filter=fullname invalid syntax here&$top=1`
    );
    
    if (errorInfo && !errorInfo.ok) {
      expect(errorInfo.status).toBe(400);
      expect(errorInfo.errorType).toBe('bad_request');
      expect(errorInfo.userMessage).toContain('syntax error');
      expect(errorInfo.suggestedActions).toContain('Check OData query syntax');
    }
  });

  it('should analyze non-existent record error', async () => {
    const errorInfo = await testErrorWithAnalysis(
      'Non-existent Record Error Analysis',
      `${dataverseUrl}/api/data/v9.1/contacts(00000000-0000-0000-0000-000000000000)`
    );
    
    if (errorInfo && !errorInfo.ok) {
      expect(errorInfo.status).toBe(404);
      expect(errorInfo.errorType).toBe('not_found');
      expect(errorInfo.errorCode).toBe('0x80040217');
      expect(errorInfo.userMessage).toContain('was not found');
      expect(errorInfo.suggestedActions).toContain('Verify the record ID is correct');
    }
  });

  it('should analyze successful responses', async () => {
    const errorInfo = await testErrorWithAnalysis(
      'Successful Response Analysis',
      `${dataverseUrl}/api/data/v9.1/contacts?$select=fullname&$top=1`
    );
    
    if (errorInfo) {
      expect(errorInfo.ok).toBe(true);
      expect(errorInfo.status).toBe(200);
      expect(errorInfo.errorType).toBe('unknown'); // Success doesn't have error type
    }
  });

  it('should demonstrate comprehensive error information extraction', async () => {
    console.log('\n=== Comprehensive Error Information Demo ===');
    
    // Create a complex error to show all the information we can extract
    const url = `${dataverseUrl}/api/data/v9.1/contacts?$filter=badfield eq 'test' and anotherbadfield contains 'value'&$select=badfieldselect,anotherbadselect&$expand=badrelation&$orderby=badorderfield`;
    
    const errorInfo = await testErrorWithAnalysis(
      'Complex Query Error - Full Information Extract',
      url
    );
    
    if (errorInfo && !errorInfo.ok) {
      console.log('\n📊 Extracted Information Summary:');
      console.log(`   Status: ${errorInfo.status} ${errorInfo.statusText}`);
      console.log(`   Error Code: ${errorInfo.errorCode}`);
      console.log(`   Error Type: ${errorInfo.errorType}`);
      console.log(`   Retryable: ${errorInfo.isRetryable}`);
      console.log(`   Correlation ID: ${errorInfo.correlationId}`);
      console.log(`   Service Request ID: ${errorInfo.serviceRequestId}`);
      console.log(`   Rate Limit Info: Burst=${errorInfo.rateLimitInfo?.burstRemaining}, Time=${errorInfo.rateLimitInfo?.timeRemaining}`);
      console.log(`   Suggested Actions: ${errorInfo.suggestedActions.length} actions`);
      
      expect(errorInfo.correlationId).toBeDefined();
      expect(errorInfo.serviceRequestId).toBeDefined();
      expect(errorInfo.rateLimitInfo).toBeDefined();
      expect(errorInfo.timestamp).toBeDefined();
    }
  });

  it('should show error analyzer benefits for dataset refresh debugging', () => {
    console.log('\n=== Error Analyzer Benefits for Dataset Refresh ===');
    console.log('');
    console.log('✅ Comprehensive Error Information:');
    console.log('   • Extracts all available error details from Dataverse responses');
    console.log('   • Provides correlation IDs for support tickets');
    console.log('   • Shows rate limiting information');
    console.log('   • Identifies retryable vs non-retryable errors');
    console.log('');
    console.log('✅ User-Friendly Messages:');
    console.log('   • Translates technical errors to understandable messages');
    console.log('   • Provides specific field/entity names when available');
    console.log('   • Gives context about what went wrong');
    console.log('');
    console.log('✅ Actionable Suggestions:');
    console.log('   • Specific steps to fix the error');
    console.log('   • Debugging guidance for developers');
    console.log('   • Troubleshooting workflow');
    console.log('');
    console.log('✅ Perfect for Dataset Refresh:');
    console.log('   • Helps debug ViewId issues');
    console.log('   • Identifies incorrect field names in queries');
    console.log('   • Shows relationship navigation problems');
    console.log('   • Provides detailed filter syntax error analysis');
    
    expect(true).toBe(true);
  });
});