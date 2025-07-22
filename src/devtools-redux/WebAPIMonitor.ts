/**
 * WebAPI Monitor for PCF DevTools
 * Automatically intercepts and logs WebAPI calls to Redux DevTools
 */

import { pcfDevTools } from './PCFDevToolsConnector'

interface WebAPICall {
  id: string
  method: string
  url: string
  timestamp: number
  status: 'pending' | 'success' | 'error'
  duration?: number
  response?: any
  error?: string
  entityLogicalName?: string
}

class WebAPIMonitor {
  private originalFetch: typeof fetch = fetch // Default to global fetch
  private activeRequests = new Map<string, WebAPICall>()

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined' && window.fetch) {
      this.originalFetch = window.fetch.bind(window)
      this.interceptFetch()
    }
  }

  private interceptFetch() {
    if (typeof window === 'undefined' || !window.fetch) {
      return
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method || 'GET'

      // Only monitor API calls (skip static resources)
      if (!this.shouldMonitor(url)) {
        return this.originalFetch(input, init)
      }

      const requestId = this.generateRequestId()
      const startTime = Date.now()

      const requestCall: WebAPICall = {
        id: requestId,
        method: method.toUpperCase(),
        url,
        timestamp: startTime,
        status: 'pending',
        entityLogicalName: this.extractEntityName(url),
      }

      // Log request start
      this.activeRequests.set(requestId, requestCall)
      pcfDevTools.logWebApiRequest(requestCall)

      try {
        const response = await this.originalFetch(input, init)
        const endTime = Date.now()
        const duration = endTime - startTime

        // Clone response to read body without consuming original
        const responseClone = response.clone()
        let responseData: any = null

        try {
          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            responseData = await responseClone.json()
          } else {
            responseData = await responseClone.text()
          }
        } catch (parseError) {
          // If we can't parse the response, that's ok
          responseData = `[Could not parse response: ${parseError}]`
        }

        // Update request with success info
        const successCall: WebAPICall = {
          ...requestCall,
          status: response.ok ? 'success' : 'error',
          duration,
          response: this.sanitizeResponse(responseData),
          error: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : undefined,
        }

        this.activeRequests.set(requestId, successCall)
        pcfDevTools.logWebApiRequest(successCall)

        return response
      } catch (error) {
        const endTime = Date.now()
        const duration = endTime - startTime

        // Update request with error info
        const errorCall: WebAPICall = {
          ...requestCall,
          status: 'error',
          duration,
          error: error instanceof Error ? error.message : String(error),
        }

        this.activeRequests.set(requestId, errorCall)
        pcfDevTools.logWebApiRequest(errorCall)

        throw error
      }
    }
  }

  private shouldMonitor(url: string): boolean {
    // Only monitor Dataverse API calls and other relevant APIs
    const apiPatterns = [
      /\/api\/data\/v[\d.]+\//, // Dataverse Web API
      /\/XRMServices\//, // Legacy XRM Services
      /\/api\//, // Generic API calls
      /powerapps\.com/, // PowerApps APIs
      /dynamics\.com/, // Dynamics APIs
      /crm\d*\.dynamics\.com/, // CRM APIs
    ]

    return apiPatterns.some(pattern => pattern.test(url))
  }

  private extractEntityName(url: string): string | undefined {
    // Extract entity logical name from Dataverse API URLs
    const match = url.match(/\/api\/data\/v[\d.]+\/(\w+)/)
    if (match && match[1]) {
      return match[1].replace(/s$/, '') // Remove plural 's' for entity name
    }

    // Extract from OData URLs
    const odataMatch = url.match(/\/(\w+)\?/)
    if (odataMatch && odataMatch[1]) {
      return odataMatch[1].replace(/s$/, '')
    }

    return undefined
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private sanitizeResponse(response: any): any {
    if (!response) return response

    try {
      // For large responses, summarize to avoid memory issues
      if (typeof response === 'object') {
        if (Array.isArray(response)) {
          return response.length > 10
            ? [...response.slice(0, 5), `... and ${response.length - 5} more items`]
            : response
        }

        // For Dataverse API responses
        if (response.value && Array.isArray(response.value)) {
          return {
            ...response,
            value:
              response.value.length > 10
                ? [
                    ...response.value.slice(0, 5),
                    `... and ${response.value.length - 5} more records`,
                  ]
                : response.value,
          }
        }

        // Limit object depth to avoid circular references
        return this.limitObjectDepth(response, 3)
      }

      // For text responses, limit length
      if (typeof response === 'string' && response.length > 1000) {
        return response.substring(0, 1000) + '... [truncated]'
      }

      return response
    } catch (error) {
      return `[Sanitization error: ${error}]`
    }
  }

  private limitObjectDepth(obj: any, maxDepth: number): any {
    if (maxDepth <= 0 || typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, 10).map(item => this.limitObjectDepth(item, maxDepth - 1))
    }

    const result: any = {}
    let count = 0
    for (const [key, value] of Object.entries(obj)) {
      if (count >= 20) {
        // Limit number of properties
        result['...'] = `${Object.keys(obj).length - count} more properties`
        break
      }
      result[key] = this.limitObjectDepth(value, maxDepth - 1)
      count++
    }
    return result
  }

  // Get active requests for fallback UI
  getActiveRequests(): WebAPICall[] {
    return Array.from(this.activeRequests.values())
  }

  // Cleanup method
  destroy() {
    if (this.originalFetch) {
      window.fetch = this.originalFetch
    }
    this.activeRequests.clear()
  }
}

// Create global instance
export const webAPIMonitor = new WebAPIMonitor()

// Export types
export type { WebAPICall }
