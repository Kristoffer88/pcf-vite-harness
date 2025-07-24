/**
 * useErrorHandling Hook
 * Custom hook for error handling and analysis
 * Encapsulates error service interactions and state management
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { ErrorService, getErrorService } from '../services/error-service'
import type {
  DatasetErrorAnalysis,
  ErrorContext,
  EnhancedError,
} from '../services/error-service'

export interface ErrorState {
  errors: EnhancedError[]
  analyses: Map<string, DatasetErrorAnalysis>
  isAnalyzing: boolean
  lastError?: EnhancedError
  errorCount: number
}

export interface UseErrorHandlingOptions {
  webAPI?: ComponentFramework.WebApi
  maxErrors?: number
  autoAnalyze?: boolean
  enableDiscovery?: boolean
}

export function useErrorHandling(options: UseErrorHandlingOptions = {}) {
  const {
    webAPI,
    maxErrors = 50,
    autoAnalyze = true,
    enableDiscovery = true,
  } = options

  // Error service
  const errorService = useRef<ErrorService>(getErrorService())

  // State
  const [state, setState] = useState<ErrorState>({
    errors: [],
    analyses: new Map(),
    isAnalyzing: false,
    errorCount: 0,
  })

  // Update service when webAPI changes
  useEffect(() => {
    errorService.current.updateWebAPI(webAPI)
  }, [webAPI])

  // Handle and analyze an error
  const handleError = useCallback(async (
    error: Error | Response,
    context?: ErrorContext
  ): Promise<EnhancedError> => {
    let enhancedError: EnhancedError

    if (error instanceof Response) {
      // Handle Response errors (from fetch/WebAPI)
      enhancedError = await errorService.current.createDataverseError(error, context)
    } else {
      // Handle regular errors
      enhancedError = error as EnhancedError
      enhancedError.context = context

      // Try to get common error handling suggestions
      const commonHandling = errorService.current.handleCommonErrors(error, context)
      if (commonHandling.handled && commonHandling.suggestion) {
        enhancedError.analysis = {
          isRelationshipError: false,
          isFieldError: false,
          isEntityError: false,
          isPermissionError: false,
          suggestions: [commonHandling.suggestion],
          timestamp: new Date(),
        }
      }
    }

    setState(prev => {
      const newErrors = [...prev.errors, enhancedError].slice(-maxErrors)
      const newAnalyses = new Map(prev.analyses)
      
      if (enhancedError.analysis) {
        newAnalyses.set(enhancedError.message, enhancedError.analysis)
      }

      return {
        ...prev,
        errors: newErrors,
        analyses: newAnalyses,
        lastError: enhancedError,
        errorCount: prev.errorCount + 1,
      }
    })

    // Auto-analyze if enabled and this is a Response error
    if (autoAnalyze && error instanceof Response && !enhancedError.analysis) {
      await analyzeError(enhancedError, context)
    }

    return enhancedError
  }, [maxErrors, autoAnalyze])

  // Analyze a specific error
  const analyzeError = useCallback(async (
    error: EnhancedError,
    context?: ErrorContext
  ): Promise<DatasetErrorAnalysis | null> => {
    if (!error.status) {
      console.warn('Cannot analyze error without HTTP status')
      return null
    }

    setState(prev => ({ ...prev, isAnalyzing: true }))

    try {
      // Create a mock Response for analysis
      const mockResponse = new Response(JSON.stringify({ error: { message: error.message } }), {
        status: error.status,
        statusText: error.statusText || 'Error',
      })

      const analysis = await errorService.current.analyzeDatasetRefreshError(
        mockResponse,
        context || error.context
      )

      setState(prev => {
        const newAnalyses = new Map(prev.analyses)
        newAnalyses.set(error.message, analysis)

        // Update the error with analysis
        const updatedErrors = prev.errors.map(e => 
          e.message === error.message ? { ...e, analysis } : e
        )

        return {
          ...prev,
          errors: updatedErrors,
          analyses: newAnalyses,
          isAnalyzing: false,
        }
      })

      return analysis
    } catch (analysisError) {
      console.error('Error analysis failed:', analysisError)
      setState(prev => ({ ...prev, isAnalyzing: false }))
      return null
    }
  }, [])

  // Retry an operation that previously failed
  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    retryOptions: {
      maxRetries?: number
      baseDelay?: number
      backoffMultiplier?: number
    } = {}
  ): Promise<T> => {
    const { maxRetries = 3, baseDelay = 1000, backoffMultiplier = 2 } = retryOptions

    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Handle and analyze the error
        await handleError(lastError, {
          ...context,
          operation: `${context?.operation || 'Unknown'} (attempt ${attempt}/${maxRetries})`,
        })

        // Don't delay on the last attempt
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }, [handleError])

  // Get error suggestions
  const getErrorSuggestions = useCallback((error: EnhancedError): string[] => {
    const analysis = state.analyses.get(error.message)
    if (analysis) {
      return analysis.suggestions
    }

    // Try common error patterns
    const commonHandling = errorService.current.handleCommonErrors(error, error.context)
    if (commonHandling.handled && commonHandling.suggestion) {
      return [commonHandling.suggestion]
    }

    return []
  }, [state.analyses])

  // Filter errors by type
  const getErrorsByType = useCallback((type: 'relationship' | 'field' | 'entity' | 'permission') => {
    return state.errors.filter(error => {
      const analysis = state.analyses.get(error.message)
      if (!analysis) return false

      switch (type) {
        case 'relationship':
          return analysis.isRelationshipError
        case 'field':
          return analysis.isFieldError
        case 'entity':
          return analysis.isEntityError
        case 'permission':
          return analysis.isPermissionError
        default:
          return false
      }
    })
  }, [state.errors, state.analyses])

  // Get recent errors
  const getRecentErrors = useCallback((limit = 10) => {
    return state.errors.slice(-limit)
  }, [state.errors])

  // Clear errors
  const clearErrors = useCallback(() => {
    setState({
      errors: [],
      analyses: new Map(),
      isAnalyzing: false,
      errorCount: 0,
    })
    errorService.current.clearErrorHistory()
  }, [])

  // Copy error details to clipboard
  const copyErrorDetails = useCallback(async (error: EnhancedError): Promise<boolean> => {
    try {
      const details = [
        `Error: ${error.message}`,
        error.dataverseContext ? `Context: ${error.dataverseContext}` : '',
        error.context?.operation ? `Operation: ${error.context.operation}` : '',
        error.context?.entityName ? `Entity: ${error.context.entityName}` : '',
        error.context?.query ? `Query: ${error.context.query}` : '',
        `Timestamp: ${new Date().toISOString()}`,
      ].filter(Boolean).join('\n')

      await navigator.clipboard.writeText(details)
      return true
    } catch (clipboardError) {
      console.warn('Failed to copy to clipboard:', clipboardError)
      return false
    }
  }, [])

  // Export error history
  const exportErrorHistory = useCallback(() => {
    const history = errorService.current.getErrorHistory()
    return {
      errors: state.errors,
      analyses: Object.fromEntries(state.analyses),
      serviceHistory: history,
      exportedAt: new Date().toISOString(),
    }
  }, [state.errors, state.analyses])

  // Handle specific error context
  const handleDatasetError = useCallback(async (
    error: Error | Response,
    subgridId: string,
    query?: string,
    parentEntity?: string,
    childEntity?: string
  ) => {
    return handleError(error, {
      operation: 'dataset_refresh',
      additional: { subgridId },
      query,
      parentEntity,
      childEntity,
    })
  }, [handleError])

  const handleLifecycleError = useCallback(async (
    error: Error,
    phase: 'init' | 'updateView' | 'destroy',
    componentId?: string
  ) => {
    return handleError(error, {
      operation: `lifecycle_${phase}`,
      additional: { componentId, phase },
    })
  }, [handleError])

  return {
    // State
    ...state,

    // Error handling
    handleError,
    handleDatasetError,
    handleLifecycleError,

    // Analysis
    analyzeError,
    getErrorSuggestions,

    // Retry logic
    retryOperation,

    // Filtering and queries
    getErrorsByType,
    getRecentErrors,

    // Management
    clearErrors,
    copyErrorDetails,
    exportErrorHistory,

    // Computed
    hasErrors: state.errors.length > 0,
    hasRecentErrors: state.errors.some(e => 
      Date.now() - (e.analysis?.timestamp.getTime() || 0) < 300000 // 5 minutes
    ),
    relationshipErrorCount: getErrorsByType('relationship').length,
    fieldErrorCount: getErrorsByType('field').length,
    entityErrorCount: getErrorsByType('entity').length,
    permissionErrorCount: getErrorsByType('permission').length,
  }
}