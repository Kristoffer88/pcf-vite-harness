import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { createMockContext } from './createMockContext'
import { PowerAppsContainer } from './PowerAppsContainer'
import { detectManifestInfo } from './utils/manifestReader'

export interface PCFHarnessOptions<TInputs, TOutputs> {
  /** The PCF component class to render */
  pcfClass: new () => ComponentFramework.StandardControl<TInputs, TOutputs>
  /** Container element ID (defaults to 'pcf-container') */
  containerId?: string
  /** Mock context options */
  contextOptions?: {
    controlId?: string
    viewId?: string
    displayName?: string
    userName?: string
    userId?: string
    datasetOptions?: Partial<ComponentFramework.PropertyTypes.DataSet>
    entityType?: string
    mockScenario?: 'account' | 'contact' | 'initiative' | 'custom'
  }
  /** Additional CSS class for the container */
  className?: string
  /** Show the dev panel with context info */
  showDevPanel?: boolean
  /** Custom context instead of mock */
  customContext?: ComponentFramework.Context<TInputs>
  /** PCF manifest information for devtools */
  manifestInfo?: {
    namespace: string
    constructor: string
    version: string
    displayName?: string
    description?: string
  }
}

export interface PCFHarnessResult<TInputs> {
  context: ComponentFramework.Context<TInputs>
  manifestInfo: {
    namespace: string
    constructor: string
    version: string
    displayName?: string
    description?: string
  }
  container: HTMLElement
}

/**
 * Initializes the PCF harness with PowerApps-like environment
 */
export function initializePCFHarness<TInputs, TOutputs>(
  options: PCFHarnessOptions<TInputs, TOutputs>
): PCFHarnessResult<TInputs> {
  const {
    pcfClass,
    containerId = 'pcf-container',
    contextOptions,
    className,
    showDevPanel = true,
    customContext,
    manifestInfo,
  } = options

  const container = document.getElementById(containerId)
  if (!container) {
    throw new Error(`Container element with ID '${containerId}' not found`)
  }

  console.log('🚀 Initializing PCF harness...')
  const context = customContext || createMockContext<TInputs>(contextOptions)
  const root = createRoot(container)

  // Auto-detect manifest info if not provided using file system detection
  const finalManifestInfo = manifestInfo || detectManifestInfo(pcfClass)

  root.render(
    React.createElement(PowerAppsContainer, {
      context,
      pcfClass,
      className,
      showDevPanel,
      manifestInfo: finalManifestInfo,
    })
  )

  console.log(`PCF harness initialized with ${pcfClass.name} component`)
  console.log(`Using manifest:`, finalManifestInfo)
  console.log(`Context parameters:`, Object.keys(context.parameters || {}))

  return {
    context,
    manifestInfo: finalManifestInfo,
    container,
  }
}

/**
 * Simple initialization function for quick setup
 */
export function initPCF<TInputs, TOutputs>(
  pcfClass: new () => ComponentFramework.StandardControl<TInputs, TOutputs>,
  containerId?: string
): PCFHarnessResult<TInputs> {
  return initializePCFHarness({
    pcfClass,
    containerId,
  })
}
