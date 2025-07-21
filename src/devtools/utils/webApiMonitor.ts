// WebAPI Monitor - Wraps WebAPI calls to capture requests for devtools
// This allows monitoring of PCF WebAPI operations in real-time

import type { WebApiRequest } from '../utils'

interface WebApiMonitorCallbacks {
  onRequest?: (request: WebApiRequest) => void
  onResponse?: (requestId: string, response: any, duration: number) => void
  onError?: (requestId: string, error: string, duration: number) => void
}

export class WebApiMonitor {
  private callbacks: WebApiMonitorCallbacks = {}

  constructor(callbacks: WebApiMonitorCallbacks) {
    this.callbacks = callbacks
  }

  wrapWebApi(webApi: ComponentFramework.WebApi): ComponentFramework.WebApi {
    return {
      ...webApi,
      retrieveMultipleRecords: this.wrapMethod(
        webApi.retrieveMultipleRecords.bind(webApi),
        'GET',
        (entityLogicalName, options) =>
          this.buildUrl('retrieveMultiple', entityLogicalName, options)
      ),
      retrieveRecord: this.wrapMethod(
        webApi.retrieveRecord.bind(webApi),
        'GET',
        (entityLogicalName, id, options) =>
          this.buildUrl('retrieve', entityLogicalName, options, id)
      ),
      createRecord: this.wrapMethod(webApi.createRecord.bind(webApi), 'POST', entityLogicalName =>
        this.buildUrl('create', entityLogicalName)
      ),
      updateRecord: this.wrapMethod(
        webApi.updateRecord.bind(webApi),
        'PATCH',
        (entityLogicalName, id) => this.buildUrl('update', entityLogicalName, undefined, id)
      ),
      deleteRecord: this.wrapMethod(
        webApi.deleteRecord.bind(webApi),
        'DELETE',
        (entityLogicalName, id) => this.buildUrl('delete', entityLogicalName, undefined, id)
      ),
    }
  }

  private wrapMethod<T extends (...args: any[]) => Promise<any>>(
    method: T,
    httpMethod: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    urlBuilder: (...args: Parameters<T>) => string
  ): T {
    return (async (...args: Parameters<T>) => {
      const requestId = crypto.randomUUID()
      const startTime = Date.now()
      const url = urlBuilder(...args)
      const entityLogicalName = args[0] as string

      const request: WebApiRequest = {
        id: requestId,
        method: httpMethod,
        url,
        timestamp: startTime,
        status: 'pending',
        entityLogicalName,
      }

      this.callbacks.onRequest?.(request)

      try {
        const result = await method(...args)
        const endTime = Date.now()
        const duration = endTime - startTime

        this.callbacks.onResponse?.(requestId, result, duration)

        return result
      } catch (error) {
        const endTime = Date.now()
        const duration = endTime - startTime
        const errorMessage = error instanceof Error ? error.message : String(error)

        this.callbacks.onError?.(requestId, errorMessage, duration)

        throw error
      }
    }) as T
  }

  private buildUrl(
    operation: string,
    entityLogicalName: string,
    options?: string,
    id?: string
  ): string {
    let url = `/api/data/v9.2/${entityLogicalName}`

    if (id) {
      url += `(${id})`
    }

    if (operation === 'retrieveMultiple') {
      url += 's' // pluralize for collection
    }

    if (options) {
      url += options.startsWith('?') ? options : `?${options}`
    }

    return url
  }
}

// Hook to create a monitored WebAPI instance
export const useMonitoredWebApi = (
  webApi: ComponentFramework.WebApi,
  callbacks: WebApiMonitorCallbacks
): ComponentFramework.WebApi => {
  const monitor = React.useMemo(() => new WebApiMonitor(callbacks), [callbacks])

  return React.useMemo(() => monitor.wrapWebApi(webApi), [monitor, webApi])
}

// React import for the hook
import React from 'react'
