// WebAPI Monitor Wrapper - Provides monitoring capabilities to PCF context
// This component wraps the context to inject WebAPI monitoring

import React, { useMemo } from 'react'
import { usePCFDevtools } from '../contexts/PCFDevtoolsContext'
import { WebApiMonitor } from '../utils/webApiMonitor'

interface WebApiMonitorWrapperProps {
  children: (monitoredContext: ComponentFramework.Context<any>) => React.ReactNode
  context: ComponentFramework.Context<any>
}

export const WebApiMonitorWrapper: React.FC<WebApiMonitorWrapperProps> = ({ 
  children, 
  context 
}) => {
  const { addWebApiRequest, updateWebApiRequest } = usePCFDevtools()
  
  const monitoredContext = useMemo(() => {
    if (!context?.webAPI) return context
    
    const monitor = new WebApiMonitor({
      onRequest: (request) => {
        addWebApiRequest(request)
      },
      onResponse: (requestId, response, duration) => {
        updateWebApiRequest(requestId, {
          status: 'success',
          duration,
          response,
        })
      },
      onError: (requestId, error, duration) => {
        updateWebApiRequest(requestId, {
          status: 'error',
          duration,
          error,
        })
      },
    })
    
    return {
      ...context,
      webAPI: monitor.wrapWebApi(context.webAPI),
    }
  }, [context, addWebApiRequest, updateWebApiRequest])
  
  return <>{children(monitoredContext)}</>
}