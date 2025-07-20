import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { createMockContext } from './createMockContext'
import { PowerAppsContainer } from './PowerAppsContainer'

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
  }
  /** Additional CSS class for the container */
  className?: string
  /** Show the dev panel with context info */
  showDevPanel?: boolean
  /** Custom context instead of mock */
  customContext?: ComponentFramework.Context<TInputs>
}

/**
 * Initializes the PCF harness with PowerApps-like environment
 */
export function initializePCFHarness<TInputs, TOutputs>(
  options: PCFHarnessOptions<TInputs, TOutputs>
): void {
  const {
    pcfClass,
    containerId = 'pcf-container',
    contextOptions,
    className,
    showDevPanel = true,
    customContext,
  } = options

  const container = document.getElementById(containerId)
  if (!container) {
    throw new Error(`Container element with ID '${containerId}' not found`)
  }

  const context = customContext || createMockContext<TInputs>(contextOptions)
  const root = createRoot(container)

  root.render(
    React.createElement(PowerAppsContainer, {
      context,
      pcfClass,
      className,
      showDevPanel,
    })
  )

  console.log(`PCF harness initialized with ${pcfClass.name} component`)
}

/**
 * Simple initialization function for quick setup
 */
export function initPCF<TInputs, TOutputs>(
  pcfClass: new () => ComponentFramework.StandardControl<TInputs, TOutputs>,
  containerId?: string
): void {
  initializePCFHarness({
    pcfClass,
    containerId,
  })
}
