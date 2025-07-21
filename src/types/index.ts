/**
 * Type definitions for PCF Vite Harness
 */

// Extend PCF types with missing runtime properties
declare global {
  namespace ComponentFramework {
    interface Context<TInputs> {
      accessibility?: {
        _customControlProperties?: {
          descriptor?: {
            DomId?: string
          }
        }
      }
    }
  }
}

export interface MockContextOptions {
  /** Unique control ID (auto-generated if not provided) */
  controlId?: string
  /** View ID for dataset (auto-generated if not provided) */
  viewId?: string
  /** Display name for the user */
  displayName?: string
  /** Username for the user */
  userName?: string
  /** User ID */
  userId?: string
  /** Custom dataset options */
  datasetOptions?: Partial<ComponentFramework.PropertyTypes.DataSet>
  /** Override webAPI methods with custom implementations */
  webAPI?: Partial<ComponentFramework.WebApi>
}

export interface PCFViteOptions {
  /** Dataverse URL for proxy integration */
  dataverseUrl?: string
  /** Port for the dev server */
  port?: number
  /** Port for HMR WebSocket */
  hmrPort?: number
  /** Open browser automatically */
  open?: boolean
  /** Additional Vite configuration to merge */
  viteConfig?: Record<string, unknown>
  /** Enable dataverse-utilities integration */
  enableDataverse?: boolean
}

export interface PCFHarnessOptions<TInputs, TOutputs> {
  /** The PCF component class to render */
  pcfClass: new () => ComponentFramework.StandardControl<TInputs, TOutputs>
  /** Container element ID (defaults to 'pcf-container') */
  containerId?: string
  /** Mock context options */
  contextOptions?: MockContextOptions
  /** Additional CSS class for the container */
  className?: string
  /** Show the dev panel with context info */
  showDevPanel?: boolean
  /** Custom context instead of mock */
  customContext?: ComponentFramework.Context<TInputs>
}

export interface PowerAppsContainerProps {
  /** PCF context */
  context: ComponentFramework.Context<unknown>
  /** PCF component class */
  pcfClass: new () => ComponentFramework.StandardControl<unknown, unknown>
  /** Additional CSS class */
  className?: string
  /** Show dev panel */
  showDevPanel?: boolean
}

/**
 * PCF Component interface - extends the standard PCF interface
 */
export interface PCFComponent<TInputs, TOutputs>
  extends ComponentFramework.StandardControl<TInputs, TOutputs> {
  init(
    context: ComponentFramework.Context<TInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void
  updateView(context: ComponentFramework.Context<TInputs>): void
  getOutputs?(): TOutputs
  destroy(): void
}

/**
 * Environment configuration for the harness
 */
export interface HarnessEnvironment {
  /** Current working directory */
  cwd?: string
  /** Environment variables */
  env?: Record<string, string>
  /** Is this a development environment */
  isDevelopment?: boolean
}
