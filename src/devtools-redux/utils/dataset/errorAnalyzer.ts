/**
 * Dataset Error Analyzer
 * Integrated from integration tests for immediate debugging feedback
 * Enhanced with runtime relationship discovery suggestions
 * Based on simple-error-analyzer.ts discoveries
 */

import { type DiscoveredRelationship, discoverRelationshipMultiStrategy } from './metadataDiscovery'

/**
 * Generates comprehensive error context for Dataverse API responses
 * Usage: if (!response.ok) console.log(await analyzeDataverseError(response))
 */
export async function analyzeDataverseError(
  response: Response,
  relativeUrl?: string
): Promise<string> {
  const lines: string[] = []

  // Basic error info
  lines.push(`🚨 Dataverse API Error: ${response.status} ${response.statusText}`)
  if (relativeUrl) lines.push(`🌐 API: ${relativeUrl}`)

  // Get response data
  let responseData: any = null
  let rawResponse = ''

  try {
    rawResponse = await response.clone().text()
    if (rawResponse) {
      responseData = JSON.parse(rawResponse)
    }
  } catch (e) {
    if (rawResponse) {
      lines.push(`📄 Raw Response: ${rawResponse}`)
    }
  }

  // Extract key error information
  if (responseData?.error) {
    const error = responseData.error

    if (error.code) {
      lines.push(`🔢 Error Code: ${error.code}`)
    }

    if (error.message) {
      lines.push(`💬 Message: ${error.message}`)

      // Add quick context for common errors
      if (error.message.includes('Could not find a property named')) {
        const match = error.message.match(/'([^']+)'/)
        if (match)
          lines.push(`💡 Field '${match[1]}' doesn't exist - check spelling or entity metadata`)
      }

      if (error.message.includes('Resource not found for the segment')) {
        const match = error.message.match(/'([^']+)'/)
        if (match)
          lines.push(
            `💡 Entity '${match[1]}' not found - check name or use plural form (e.g., 'contacts')`
          )
      }

      if (error.message.includes('Syntax error at position')) {
        const match = error.message.match(/position (\d+)/)
        if (match) lines.push(`💡 Query syntax error at position ${match[1]} - check OData syntax`)
      }

      if (error.message.includes('Entity') && error.message.includes('Does Not Exist')) {
        lines.push(`💡 Record not found - check ID or verify record wasn't deleted`)
      }

      // Dataset-specific error patterns
      if (error.message.includes('parentcustomerid') || error.message.includes('parentaccountid')) {
        lines.push(
          `💡 Relationship field error - use '_parentcustomerid_value' for account-contact relationships`
        )
      }
    }
  }

  // Add correlation info for support
  const correlationId = response.headers.get('mise-correlation-id') || response.headers.get('ms-cv')
  const requestId =
    response.headers.get('x-ms-service-request-id') || response.headers.get('req_id')

  if (correlationId) lines.push(`🔗 Correlation ID: ${correlationId}`)
  if (requestId) lines.push(`📨 Request ID: ${requestId}`)

  // Rate limiting info
  const rateLimitRemaining = response.headers.get('x-ms-ratelimit-burst-remaining-xrm-requests')
  const rateLimitTime = response.headers.get('x-ms-ratelimit-time-remaining-xrm-requests')

  if (rateLimitRemaining || rateLimitTime) {
    lines.push(
      `⏱️  Rate Limit: ${rateLimitRemaining || 'N/A'} requests remaining, ${rateLimitTime || 'N/A'}s window`
    )
  }

  // Timestamp
  lines.push(`⏰ Time: ${new Date().toISOString()}`)

  return lines.join('\n')
}

/**
 * Creates an enhanced Error object with Dataverse context
 * Usage: if (!response.ok) throw await createDataverseError(response)
 */
export async function createDataverseError(
  response: Response,
  relativeUrl?: string
): Promise<Error> {
  const context = await analyzeDataverseError(response, relativeUrl)
  const error = new Error(`Dataverse API Error: ${response.status} ${response.statusText}`)

  // Add the full context as a property for detailed logging
  ;(error as any).dataverseContext = context
  ;(error as any).status = response.status
  ;(error as any).statusText = response.statusText

  return error
}

/**
 * Quick error analysis for dataset refresh operations
 */
export interface DatasetErrorAnalysis {
  isRelationshipError: boolean
  isFieldError: boolean
  isEntityError: boolean
  isPermissionError: boolean
  suggestions: string[]
  errorCode?: string
  correlationId?: string
}

/**
 * Analyze dataset refresh errors and provide actionable suggestions
 */
export async function analyzeDatasetRefreshError(
  response: Response,
  query?: string
): Promise<DatasetErrorAnalysis> {
  const analysis: DatasetErrorAnalysis = {
    isRelationshipError: false,
    isFieldError: false,
    isEntityError: false,
    isPermissionError: false,
    suggestions: [],
  }

  let responseData: any = null

  try {
    const rawResponse = await response.clone().text()
    if (rawResponse) {
      responseData = JSON.parse(rawResponse)
    }
  } catch (e) {
    // Ignore parse errors
  }

  if (responseData?.error) {
    const error = responseData.error
    analysis.errorCode = error.code

    const message = error.message || ''

    // Check for relationship errors
    if (
      message.includes('parentcustomerid') ||
      message.includes('parentaccountid') ||
      message.includes('could not find a property named') ||
      message.includes('Invalid column name')
    ) {
      analysis.isRelationshipError = true

      // Extract field name from error
      const fieldMatch = message.match(/'([^']+)'/) || message.match(/named\s+([^\s,]+)/)
      const fieldName = fieldMatch ? fieldMatch[1] : null

      if (fieldName && fieldName.includes('_value')) {
        analysis.suggestions.push(`❌ Invalid lookup field: "${fieldName}"`)
        analysis.suggestions.push(
          `💡 Try runtime relationship discovery to find correct lookup column`
        )
        analysis.suggestions.push(`🔍 Use "Discover Relationships" button in Dataset Refresh Tool`)
      } else {
        analysis.suggestions.push(
          'Use correct relationship field: "_parentcustomerid_value" for account-contact relationships'
        )
        analysis.suggestions.push(
          '💡 Enable runtime relationship discovery to automatically find correct lookup columns'
        )
      }
    }

    // Check for field errors
    if (message.includes('Could not find a property named')) {
      analysis.isFieldError = true
      const match = message.match(/'([^']+)'/)
      if (match) {
        analysis.suggestions.push(
          `Field '${match[1]}' doesn't exist. Check entity metadata or field spelling.`
        )
      }
    }

    // Check for entity errors
    if (message.includes('Resource not found for the segment')) {
      analysis.isEntityError = true
      analysis.suggestions.push(
        'Check entity name and use plural form (e.g., "contacts" not "contact")'
      )
    }

    // Check for permission errors
    if (response.status === 401 || response.status === 403) {
      analysis.isPermissionError = true
      analysis.suggestions.push('Check user permissions for the target entity and related records')
    }

    // Get correlation ID for support
    analysis.correlationId =
      response.headers.get('mise-correlation-id') || response.headers.get('ms-cv') || undefined
  }

  return analysis
}

/**
 * Analyze dataset refresh errors with runtime discovery suggestions
 */
export async function analyzeDatasetRefreshErrorWithDiscovery(
  response: Response,
  relativeUrl?: string,
  parentEntity?: string,
  childEntity?: string,
  webAPI?: ComponentFramework.WebApi
): Promise<DatasetErrorAnalysis> {
  // Get base analysis
  const analysis = await analyzeDatasetRefreshError(response, relativeUrl)

  // If it's a relationship error and we have entity information, try discovery
  if (analysis.isRelationshipError && parentEntity && childEntity && webAPI) {
    try {
      console.log(
        `🔍 Attempting runtime discovery for error analysis: ${parentEntity} -> ${childEntity}`
      )

      const discoveredRelationship = await discoverRelationshipMultiStrategy(
        parentEntity,
        childEntity,
        webAPI
      )

      if (discoveredRelationship) {
        analysis.suggestions.unshift(
          `✅ Discovery found relationship: "${discoveredRelationship.lookupColumn}"`,
          `🎯 Confidence: ${discoveredRelationship.confidence} (${discoveredRelationship.source})`,
          `📝 Use this lookup column in your queries: ${discoveredRelationship.lookupColumn} eq [parent-id]`
        )
      } else {
        analysis.suggestions.unshift(
          `❌ Runtime discovery failed for ${parentEntity} -> ${childEntity}`,
          `🔍 Possible reasons: No relationship exists, incorrect entity names, or permission issues`,
          `💡 Check entity metadata manually or verify relationship configuration`
        )
      }
    } catch (error) {
      console.warn('Runtime discovery failed during error analysis:', error)
      analysis.suggestions.unshift(
        `⚠️ Runtime discovery unavailable: ${String(error)}`,
        `🔧 Check WebAPI access and entity permissions`
      )
    }
  }

  return analysis
}
