import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, initializeIcons } from '@fluentui/react'
import { createMockContext } from './createMockContext'
import { PowerAppsContainer } from './PowerAppsContainer'
import { detectManifestInfo } from './utils/manifestReader'
import { SetupWizard } from './setup'
import type { SetupWizardData } from './setup/types'
import { isAutoRefreshEnabled, getAutoRefreshDelay, shouldShowDevTools } from './utils/envConfigGenerator'
import { redirectToSetupIfNeeded } from './utils/envValidation'

// Wrapper component to handle environment check with proper timing
function PCFHarnessWrapper<TInputs>(props: {
  context: ComponentFramework.Context<TInputs>
  pcfClass: new () => ComponentFramework.StandardControl<TInputs, any>
  className?: string
  manifestInfo: any
  componentType: 'dataset' | 'field'
}) {
  const { context, pcfClass, className, manifestInfo, componentType } = props

  React.useEffect(() => {
    // Check environment variables after component mounts to ensure import.meta.env is loaded
    redirectToSetupIfNeeded(componentType)
  }, [componentType])

  return React.createElement(PowerAppsContainer, {
    context,
    pcfClass,
    className,
    manifestInfo,
  })
}

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
  /** Custom context instead of mock */
  customContext?: ComponentFramework.Context<TInputs>
  /** PCF manifest information for devtools */
  manifestInfo?: {
    namespace: string
    constructor: string
    version: string
    displayName?: string
    description?: string
    componentType: 'dataset' | 'field'
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
    componentType: 'dataset' | 'field'
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
    customContext,
    manifestInfo,
  } = options

  // Auto-detect manifest info to get component type
  const detectedManifestInfo = detectManifestInfo(pcfClass)
  
  // Use provided manifest info or the detected info, but always use detected componentType
  // since provided manifestInfo typically doesn't include componentType
  const finalManifestInfo = manifestInfo || detectedManifestInfo
  const componentType = (manifestInfo as any)?.componentType || detectedManifestInfo.componentType
  
  // Environment check will be handled by the wrapper component

  // Check current route
  const currentPath = window.location.pathname
  const isSetupRoute = currentPath === '/setup'

  console.log('🚀 Initializing PCF harness...')
  console.log(`Current route: ${currentPath}`)

  let targetContainer: HTMLElement
  let root: any

  if (isSetupRoute) {
    // For setup wizard, use document body or create a dedicated container
    targetContainer = document.body
    
    // Clear the body and set up for full-screen wizard
    document.body.innerHTML = ''
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.height = '100vh'
    document.body.style.overflow = 'hidden'
    
    // Create a dedicated setup container
    const setupContainer = document.createElement('div')
    setupContainer.id = 'setup-wizard-container'
    setupContainer.style.width = '100vw'
    setupContainer.style.height = '100vh'
    setupContainer.style.overflow = 'hidden'
    document.body.appendChild(setupContainer)
    
    root = createRoot(setupContainer)
  } else {
    // For PCF development, use the specified container
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Container element with ID '${containerId}' not found`)
    }
    targetContainer = container
    root = createRoot(container)
  }

  if (isSetupRoute) {
    // Initialize FluentUI icons for the setup wizard
    initializeIcons()
    
    // Render Setup Wizard
    console.log('📋 Rendering Setup Wizard...')
    
    const handleSetupComplete = (data: SetupWizardData) => {
      console.log('✅ Setup completed with data:', data)
      // Redirect to main development interface
      window.location.href = '/'
    }

    const handleSetupCancel = () => {
      console.log('❌ Setup cancelled')
      // Redirect to main development interface
      window.location.href = '/'
    }

    root.render(
      React.createElement(ThemeProvider, {}, 
        React.createElement(SetupWizard, {
          onComplete: handleSetupComplete,
          onCancel: handleSetupCancel,
        })
      )
    )

    // Return minimal result for setup route
    return {
      context: {} as ComponentFramework.Context<TInputs>,
      manifestInfo: {
        namespace: 'setup',
        constructor: 'wizard',
        version: '1.0.0',
        componentType: 'dataset', // Setup is only for dataset components
      },
      container: targetContainer,
    }
  } else {
    // Render main PCF development interface
    const context = customContext || createMockContext<TInputs>({
      ...contextOptions,
      manifestInfo: finalManifestInfo,
    })

    root.render(
      React.createElement(PCFHarnessWrapper, {
        context,
        pcfClass,
        className,
        manifestInfo: finalManifestInfo,
        componentType,
      })
    )

    console.log(`PCF harness initialized with ${pcfClass.name} component`)
    console.log(`Using manifest:`, finalManifestInfo)
    console.log(`Context parameters:`, Object.keys(context.parameters || {}))

    return {
      context,
      manifestInfo: finalManifestInfo,
      container: targetContainer,
    }
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
