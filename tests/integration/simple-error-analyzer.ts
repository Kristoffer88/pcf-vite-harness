/**
 * Simple Dataverse Error Context Generator
 * One-liner for debugging Dataverse API responses
 */

/**
 * Generates comprehensive error context for Dataverse API responses
 * Usage: if (!response.ok) console.log(generateErrorContext(response))
 */
export async function generateErrorContext(response: Response, relativeUrl?: string): Promise<string> {
  const lines: string[] = [];
  
  // Basic error info
  lines.push(`🚨 Dataverse API Error: ${response.status} ${response.statusText}`);
  if (relativeUrl) lines.push(`🌐 API: ${relativeUrl}`);
  
  // Get response data
  let responseData: any = null;
  let rawResponse = '';
  
  try {
    rawResponse = await response.clone().text();
    if (rawResponse) {
      responseData = JSON.parse(rawResponse);
    }
  } catch (e) {
    if (rawResponse) {
      lines.push(`📄 Raw Response: ${rawResponse}`);
    }
  }
  
  // Extract key error information
  if (responseData?.error) {
    const error = responseData.error;
    
    if (error.code) {
      lines.push(`🔢 Error Code: ${error.code}`);
    }
    
    if (error.message) {
      lines.push(`💬 Message: ${error.message}`);
      
      // Add quick context for common errors
      if (error.message.includes("Could not find a property named")) {
        const match = error.message.match(/'([^']+)'/);
        if (match) lines.push(`💡 Field '${match[1]}' doesn't exist - check spelling or entity metadata`);
      }
      
      if (error.message.includes("Resource not found for the segment")) {
        const match = error.message.match(/'([^']+)'/);
        if (match) lines.push(`💡 Entity '${match[1]}' not found - check name or use plural form (e.g., 'contacts')`);
      }
      
      if (error.message.includes("Syntax error at position")) {
        const match = error.message.match(/position (\d+)/);
        if (match) lines.push(`💡 Query syntax error at position ${match[1]} - check OData syntax`);
      }
      
      if (error.message.includes("Entity") && error.message.includes("Does Not Exist")) {
        lines.push(`💡 Record not found - check ID or verify record wasn't deleted`);
      }
    }
  }
  
  // Add correlation info for support
  const correlationId = response.headers.get('mise-correlation-id') || response.headers.get('ms-cv');
  const requestId = response.headers.get('x-ms-service-request-id') || response.headers.get('req_id');
  
  if (correlationId) lines.push(`🔗 Correlation ID: ${correlationId}`);
  if (requestId) lines.push(`📨 Request ID: ${requestId}`);
  
  // Rate limiting info
  const rateLimitRemaining = response.headers.get('x-ms-ratelimit-burst-remaining-xrm-requests');
  const rateLimitTime = response.headers.get('x-ms-ratelimit-time-remaining-xrm-requests');
  
  if (rateLimitRemaining || rateLimitTime) {
    lines.push(`⏱️  Rate Limit: ${rateLimitRemaining || 'N/A'} requests remaining, ${rateLimitTime || 'N/A'}s window`);
  }
  
  // Timestamp
  lines.push(`⏰ Time: ${new Date().toISOString()}`);
  
  return lines.join('\n');
}

/**
 * Creates an enhanced Error object with Dataverse context
 * Usage: if (!response.ok) throw createDataverseError(response)
 */
export async function createDataverseError(response: Response, relativeUrl?: string): Promise<Error> {
  const context = await generateErrorContext(response, relativeUrl);
  const error = new Error(`Dataverse API Error: ${response.status} ${response.statusText}`);
  
  // Add the full context as a property for detailed logging
  (error as any).dataverseContext = context;
  (error as any).status = response.status;
  (error as any).statusText = response.statusText;
  
  return error;
}