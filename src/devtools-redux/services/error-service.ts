/**
 * Error Service
 * Centralized error analysis and handling for DevTools
 * Consolidates error analysis logic from errorAnalyzer and provides consistent error handling
 */

export interface DatasetErrorAnalysis {
  isRelationshipError: boolean
  isFieldError: boolean
  isEntityError: boolean
  isPermissionError: boolean
  suggestions: string[]
  errorCode?: string
  correlationId?: string
  requestId?: string
  timestamp: Date
}

export interface ErrorContext {
  operation: string
  entityName?: string
  query?: string
  parentEntity?: string
  childEntity?: string
  additional?: Record<string, any>
}

export interface EnhancedError extends Error {
  dataverseContext?: string
  status?: number
  statusText?: string
  analysis?: DatasetErrorAnalysis
  context?: ErrorContext
}

export interface ErrorServiceOptions {
  webAPI?: ComponentFramework.WebApi
  enableRuntimeDiscovery?: boolean
}

export class ErrorService {
  private webAPI?: ComponentFramework.WebApi
  private enableRuntimeDiscovery: boolean
  private errorLog: Array<{ error: EnhancedError; timestamp: Date }> = []

  constructor(options: ErrorServiceOptions = {}) {
    this.webAPI = options.webAPI
    this.enableRuntimeDiscovery = options.enableRuntimeDiscovery ?? true
  }

  /**
   * Update WebAPI reference
   */
  updateWebAPI(webAPI?: ComponentFramework.WebApi): void {
    this.webAPI = webAPI
  }

  /**
   * Analyze a Dataverse API error response
   */
  async analyzeDataverseError(
    response: Response,
    context?: ErrorContext
  ): Promise<string> {
    const lines: string[] = []

    // Basic error info
    lines.push(`🚨 Dataverse API Error: ${response.status} ${response.statusText}`)
    if (context?.operation) lines.push(`🔧 Operation: ${context.operation}`)
    if (context?.entityName) lines.push(`📋 Entity: ${context.entityName}`)
    if (context?.query) lines.push(`🔍 Query: ${context.query}`)

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
        lines.push(...this.generateErrorSuggestions(error.message, context))
      }
    }

    // Add correlation info for support
    const correlationId = response.headers.get('mise-correlation-id') || response.headers.get('ms-cv')
    const requestId = response.headers.get('x-ms-service-request-id') || response.headers.get('req_id')

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
   * Create an enhanced error object with Dataverse context
   */
  async createDataverseError(
    response: Response,
    context?: ErrorContext
  ): Promise<EnhancedError> {
    const contextString = await this.analyzeDataverseError(response, context)
    const error = new Error(`Dataverse API Error: ${response.status} ${response.statusText}`) as EnhancedError

    // Add enhanced properties
    error.dataverseContext = contextString
    error.status = response.status
    error.statusText = response.statusText
    error.context = context
    error.analysis = await this.analyzeDatasetRefreshError(response, context)

    // Log the error
    this.logError(error)

    return error
  }

  /**
   * Analyze dataset refresh errors and provide actionable suggestions
   */
  async analyzeDatasetRefreshError(
    response: Response,
    context?: ErrorContext
  ): Promise<DatasetErrorAnalysis> {
    const analysis: DatasetErrorAnalysis = {
      isRelationshipError: false,
      isFieldError: false,
      isEntityError: false,
      isPermissionError: false,
      suggestions: [],
      timestamp: new Date(),
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

      // Analyze error types and generate suggestions
      this.analyzeErrorTypes(message, response.status, analysis)

      // Get correlation ID for support
      analysis.correlationId =
        response.headers.get('mise-correlation-id') || response.headers.get('ms-cv') || undefined
      analysis.requestId =
        response.headers.get('x-ms-service-request-id') || response.headers.get('req_id') || undefined

      // Try runtime discovery if enabled and we have the necessary info
      if (
        this.enableRuntimeDiscovery &&
        analysis.isRelationshipError &&
        context?.parentEntity &&
        context?.childEntity &&
        this.webAPI
      ) {
        await this.addDiscoverySuggestions(analysis, context)
      }
    }

    return analysis
  }

  /**
   * Get error history
   */
  getErrorHistory(limit = 50): Array<{ error: EnhancedError; timestamp: Date }> {
    return this.errorLog.slice(-limit)
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorLog = []
  }

  /**
   * Handle common error scenarios
   */
  handleCommonErrors(error: Error, context?: ErrorContext): {
    handled: boolean
    suggestion?: string
    action?: () => void
  } {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return {
        handled: true,
        suggestion: 'Check network connection and Dataverse service availability',
      }
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('403')) {
      return {
        handled: true,
        suggestion: 'Check user permissions and authentication status',
      }
    }

    // Context not available
    if (message.includes('context') && message.includes('not available')) {
      return {
        handled: true,
        suggestion: 'PCF context is not initialized. Try refreshing the component.',
      }
    }

    return { handled: false }
  }

  /**
   * Generate error suggestions based on message content
   */
  private generateErrorSuggestions(message: string, context?: ErrorContext): string[] {
    const suggestions: string[] = []

    // Field errors
    if (message.includes('Could not find a property named')) {
      const match = message.match(/'([^']+)'/)
      if (match) {
        suggestions.push(`💡 Field '${match[1]}' doesn't exist - check spelling or entity metadata`)
      }
    }

    // Entity errors
    if (message.includes('Resource not found for the segment')) {
      const match = message.match(/'([^']+)'/)
      if (match) {
        suggestions.push(
          `💡 Entity '${match[1]}' not found - check name or use plural form (e.g., 'contacts')`
        )
      }
    }

    // Query syntax errors
    if (message.includes('Syntax error at position')) {
      const match = message.match(/position (\d+)/)
      if (match) {
        suggestions.push(`💡 Query syntax error at position ${match[1]} - check OData syntax`)
      }
    }

    // Record not found
    if (message.includes('Entity') && message.includes('Does Not Exist')) {
      suggestions.push(`💡 Record not found - check ID or verify record wasn't deleted`)
    }

    // Relationship field errors
    if (message.includes('parentcustomerid') || message.includes('parentaccountid')) {
      suggestions.push(
        `💡 Relationship field error - use '_parentcustomerid_value' for account-contact relationships`
      )
    }

    return suggestions
  }

  /**
   * Analyze error types and populate analysis object
   */
  private analyzeErrorTypes(
    message: string,
    status: number,
    analysis: DatasetErrorAnalysis
  ): void {
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
    if (status === 401 || status === 403) {
      analysis.isPermissionError = true
      analysis.suggestions.push('Check user permissions for the target entity and related records')
    }
  }

  /**
   * Add runtime discovery suggestions to error analysis
   */
  private async addDiscoverySuggestions(
    analysis: DatasetErrorAnalysis,
    context: ErrorContext
  ): Promise<void> {
    try {
      console.log(
        `🔍 Attempting runtime discovery for error analysis: ${context.parentEntity} -> ${context.childEntity}`
      )

      // Import discovery function dynamically to avoid circular dependencies
      const { discoverRelationshipMultiStrategy } = await import('../utils/dataset/metadataDiscovery')
      
      const discoveredRelationship = await discoverRelationshipMultiStrategy(
        context.parentEntity!,
        context.childEntity!,
        this.webAPI!
      )

      if (discoveredRelationship) {
        analysis.suggestions.unshift(
          `✅ Discovery found relationship: "${discoveredRelationship.lookupColumn}"`,
          `🎯 Confidence: ${discoveredRelationship.confidence} (${discoveredRelationship.source})`,
          `📝 Use this lookup column in your queries: ${discoveredRelationship.lookupColumn} eq [parent-id]`
        )
      } else {
        analysis.suggestions.unshift(
          `❌ Runtime discovery failed for ${context.parentEntity} -> ${context.childEntity}`,
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

  /**
   * Log error to internal history
   */
  private logError(error: EnhancedError): void {
    this.errorLog.push({
      error,
      timestamp: new Date(),
    })

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100)
    }
  }
}

// Singleton instance for global use
let errorServiceInstance: ErrorService | null = null

/**
 * Get the global error service instance
 */
export function getErrorService(): ErrorService {
  if (!errorServiceInstance) {
    errorServiceInstance = new ErrorService()
  }
  return errorServiceInstance
}

/**
 * Initialize the global error service
 */
export function initializeErrorService(options: ErrorServiceOptions): ErrorService {
  errorServiceInstance = new ErrorService(options)
  return errorServiceInstance
}