/**
 * Comprehensive Dataverse Error Analysis Function
 * Extracts all possible information from Dataverse API responses for debugging
 */

export interface DataverseErrorInfo {
  // Basic Response Info
  status: number
  statusText: string
  ok: boolean

  // Dataverse-specific Error Details
  errorCode?: string
  errorMessage?: string
  innerException?: string

  // HTTP Headers (Dataverse-specific)
  correlationId?: string
  serviceRequestId?: string
  activityId?: string
  rateLimitInfo?: {
    burstRemaining?: string
    timeRemaining?: string
  }

  // Raw Data
  rawResponse?: string
  parsedError?: any
  headers?: Record<string, string>

  // Context Info
  url?: string
  method?: string
  timestamp: string

  // Enhanced Error Classification
  errorType:
    | 'network'
    | 'auth'
    | 'not_found'
    | 'bad_request'
    | 'server_error'
    | 'rate_limit'
    | 'unknown'
  isRetryable: boolean

  // User-friendly information
  userMessage: string
  developerMessage: string
  suggestedActions: string[]
}

/**
 * Analyzes a Dataverse API response and extracts all possible error information
 */
export async function analyzeDataverseError(
  response: Response,
  url?: string,
  method?: string
): Promise<DataverseErrorInfo> {
  const timestamp = new Date().toISOString()

  // Extract all headers
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  // Get response text
  let rawResponse = ''
  let parsedError: any = null

  try {
    rawResponse = await response.text()
    if (rawResponse) {
      parsedError = JSON.parse(rawResponse)
    }
  } catch (e) {
    // Response might not be JSON or might be empty
  }

  // Extract Dataverse-specific information
  const errorCode = parsedError?.error?.code || ''
  const errorMessage = parsedError?.error?.message || response.statusText || ''
  const innerException = extractInnerException(parsedError?.error?.message || '')

  // Extract correlation and tracking IDs
  const correlationId = headers['mise-correlation-id'] || headers['ms-cv'] || ''
  const serviceRequestId = headers['x-ms-service-request-id'] || headers['req_id'] || ''
  const activityId = headers['authactivityid'] || ''

  // Extract rate limiting info
  const rateLimitInfo = {
    burstRemaining: headers['x-ms-ratelimit-burst-remaining-xrm-requests'],
    timeRemaining: headers['x-ms-ratelimit-time-remaining-xrm-requests'],
  }

  // Classify error type
  const errorType = classifyError(response.status, errorCode, errorMessage)
  const isRetryable = isErrorRetryable(errorType, response.status)

  // Generate user-friendly messages
  const { userMessage, developerMessage, suggestedActions } = generateErrorMessages(
    response.status,
    errorCode,
    errorMessage,
    innerException,
    url || 'unknown'
  )

  return {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    errorCode,
    errorMessage,
    innerException,
    correlationId,
    serviceRequestId,
    activityId,
    rateLimitInfo,
    rawResponse,
    parsedError,
    headers,
    url,
    method,
    timestamp,
    errorType,
    isRetryable,
    userMessage,
    developerMessage,
    suggestedActions,
  }
}

/**
 * Extracts inner exception details from error messages
 */
function extractInnerException(message: string): string | undefined {
  // Look for common inner exception patterns
  const patterns = [
    /---->.*?InnerException\s*:\s*(.*?)(?:\r\n|\n|$)/i,
    /Inner\s*Exception\s*:\s*(.*?)(?:\r\n|\n|\s*at\s)/i,
    /Exception\s*:\s*(.*?)(?:\r\n|\n|$)/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return undefined
}

/**
 * Classifies the error type based on status code and error details
 */
function classifyError(
  status: number,
  errorCode: string,
  errorMessage: string
): DataverseErrorInfo['errorType'] {
  if (status === 0) return 'network'
  if (status === 401 || status === 403) return 'auth'
  if (status === 404) return 'not_found'
  if (status === 429) return 'rate_limit'
  if (status >= 500) return 'server_error'
  if (status >= 400 && status < 500) return 'bad_request'

  // Check specific error codes
  if (errorCode) {
    if (errorCode === '0x80040217') return 'not_found' // Entity does not exist
    if (errorCode === '0x80060888') return 'bad_request' // Invalid query/property
  }

  return 'unknown'
}

/**
 * Determines if an error is retryable
 */
function isErrorRetryable(errorType: DataverseErrorInfo['errorType'], status: number): boolean {
  switch (errorType) {
    case 'network':
    case 'server_error':
    case 'rate_limit':
      return true
    case 'auth':
      return status === 401 // 401 might be retryable with new token, 403 is not
    case 'not_found':
    case 'bad_request':
    default:
      return false
  }
}

/**
 * Generates user-friendly error messages and suggested actions
 */
function generateErrorMessages(
  status: number,
  errorCode: string,
  errorMessage: string,
  innerException?: string,
  url?: string
): {
  userMessage: string
  developerMessage: string
  suggestedActions: string[]
} {
  let userMessage = 'An error occurred while accessing Dataverse.'
  let developerMessage = errorMessage
  const suggestedActions: string[] = []

  // Customize messages based on error patterns
  switch (status) {
    case 400:
      userMessage = 'The request was invalid.'

      if (errorMessage.includes('Could not find a property')) {
        const propertyMatch = errorMessage.match(/'([^']+)'/)
        const property = propertyMatch ? propertyMatch[1] : 'unknown'
        userMessage = `The field '${property}' does not exist.`
        suggestedActions.push('Check the field name spelling')
        suggestedActions.push('Verify the field exists on this entity')
        suggestedActions.push('Check entity metadata for available fields')
      }

      if (errorMessage.includes('Syntax error at position')) {
        const positionMatch = errorMessage.match(/position (\d+)/)
        const position = positionMatch ? positionMatch[1] : 'unknown'
        userMessage = `Query syntax error at position ${position}.`
        suggestedActions.push('Check OData query syntax')
        suggestedActions.push('Verify filter expressions')
        suggestedActions.push('Validate GUID format if using IDs')
      }

      if (errorMessage.includes('query parameter') && errorMessage.includes('not supported')) {
        userMessage = 'An invalid query parameter was used.'
        suggestedActions.push('Check OData query parameter names')
        suggestedActions.push('Remove unsupported parameters')
      }

      break

    case 401:
      userMessage = 'Authentication failed.'
      suggestedActions.push('Check if access token is valid')
      suggestedActions.push('Refresh authentication token')
      suggestedActions.push('Verify API permissions')
      break

    case 403:
      userMessage = 'Access denied to this resource.'
      suggestedActions.push('Check user permissions')
      suggestedActions.push('Verify security role assignments')
      suggestedActions.push('Contact system administrator')
      break

    case 404:
      if (errorCode === '0x80040217') {
        const entityMatch = errorMessage.match(/Entity '([^']+)'.*?Id = ([a-f0-9-]+)/)
        if (entityMatch) {
          userMessage = `${entityMatch[1]} record with ID ${entityMatch[2]} was not found.`
          suggestedActions.push('Verify the record ID is correct')
          suggestedActions.push('Check if the record was deleted')
          suggestedActions.push('Verify access permissions to the record')
        }
      } else if (errorMessage.includes('Resource not found for the segment')) {
        const segmentMatch = errorMessage.match(/'([^']+)'/)
        const segment = segmentMatch ? segmentMatch[1] : 'unknown'
        userMessage = `The entity '${segment}' was not found.`
        suggestedActions.push('Check entity name spelling')
        suggestedActions.push('Verify entity exists in this environment')
        suggestedActions.push(
          'Use plural form for entity collections (e.g., "contacts" not "contact")'
        )
      }
      break

    case 405:
      userMessage = 'HTTP method not allowed for this resource.'
      suggestedActions.push('Check if using correct HTTP method (GET, POST, PATCH, DELETE)')
      suggestedActions.push('Verify endpoint supports the requested operation')
      break

    case 429:
      userMessage = 'Too many requests. Rate limit exceeded.'
      suggestedActions.push('Reduce request frequency')
      suggestedActions.push('Implement exponential backoff retry logic')
      suggestedActions.push('Check rate limiting thresholds')
      break

    case 500:
    case 502:
    case 503:
      userMessage = 'A server error occurred.'
      suggestedActions.push('Retry the request after a short delay')
      suggestedActions.push('Check Dataverse service health')
      suggestedActions.push('Contact support if error persists')
      break
  }

  // Add inner exception info to developer message
  if (innerException) {
    developerMessage += `\n\nInner Exception: ${innerException}`
  }

  // Always add generic troubleshooting actions
  suggestedActions.push('Check the full error details for more information')
  suggestedActions.push(`Reference correlation ID: ${errorCode || 'N/A'}`)

  return { userMessage, developerMessage, suggestedActions }
}

/**
 * Helper function to format error information for logging/display
 */
export function formatDataverseError(errorInfo: DataverseErrorInfo): string {
  const lines: string[] = []

  lines.push(`🚨 Dataverse API Error [${errorInfo.status} ${errorInfo.statusText}]`)
  lines.push(`⏰ Time: ${errorInfo.timestamp}`)

  if (errorInfo.url) {
    lines.push(`🌐 URL: ${errorInfo.url}`)
  }

  if (errorInfo.errorCode) {
    lines.push(`🔢 Error Code: ${errorInfo.errorCode}`)
  }

  lines.push(`💬 Message: ${errorInfo.errorMessage}`)

  if (errorInfo.innerException) {
    lines.push(`🔍 Inner Exception: ${errorInfo.innerException}`)
  }

  if (errorInfo.correlationId) {
    lines.push(`🔗 Correlation ID: ${errorInfo.correlationId}`)
  }

  if (errorInfo.serviceRequestId) {
    lines.push(`📨 Service Request ID: ${errorInfo.serviceRequestId}`)
  }

  lines.push(`🔄 Retryable: ${errorInfo.isRetryable ? 'Yes' : 'No'}`)
  lines.push(`📋 Type: ${errorInfo.errorType}`)

  if (errorInfo.suggestedActions.length > 0) {
    lines.push(`💡 Suggested Actions:`)
    errorInfo.suggestedActions.forEach((action, index) => {
      lines.push(`   ${index + 1}. ${action}`)
    })
  }

  return lines.join('\n')
}

/**
 * Test the error analyzer with a sample error
 */
export async function testErrorAnalyzer() {
  console.log('🧪 Testing Dataverse Error Analyzer...')

  // Create a sample error response (for testing)
  const mockResponse = new Response(
    JSON.stringify({
      error: {
        code: '0x80060888',
        message:
          "Could not find a property named 'invalidfield' on type 'Microsoft.Dynamics.CRM.contact'.",
      },
    }),
    {
      status: 400,
      statusText: 'Bad Request',
      headers: {
        'mise-correlation-id': '12345-67890',
        'x-ms-service-request-id': 'abcdef-123456',
      },
    }
  )

  const errorInfo = await analyzeDataverseError(
    mockResponse,
    'https://example.crm4.dynamics.com/api/data/v9.1/contacts?$select=invalidfield',
    'GET'
  )

  console.log(formatDataverseError(errorInfo))

  return errorInfo
}
