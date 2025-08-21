/**
 * PCF Harness Type Definitions
 * Types for the PCF Vite Harness configuration and options
 */

import type { UserConfig } from 'vite'

/**
 * Options for PCF Vite configuration
 */
export interface PCFViteOptions {
  /**
   * Dataverse URL for authentication and API access
   */
  dataverseUrl?: string
  
  /**
   * Development server port
   * @default 3000
   */
  port?: number
  
  /**
   * HMR (Hot Module Replacement) port
   * @default 3001
   */
  hmrPort?: number
  
  /**
   * Whether to open browser on server start
   * @default true
   */
  open?: boolean
  
  /**
   * Additional Vite configuration to merge
   */
  viteConfig?: UserConfig
}

/**
 * PCF Component type definition
 */
export interface PCFComponent {
  init(
    context: ComponentFramework.Context<any>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void
  
  updateView(context: ComponentFramework.Context<any>): void
  
  getOutputs(): any
  
  destroy(): void
}

/**
 * Mock context options
 */
export interface MockContextOptions {
  /**
   * Component parameters from manifest
   */
  parameters?: Record<string, any>
  
  /**
   * User settings
   */
  userSettings?: Partial<ComponentFramework.UserSettings>
  
  /**
   * Client information
   */
  client?: Partial<ComponentFramework.Client>
  
  /**
   * Device information
   */
  device?: Partial<ComponentFramework.Device>
  
  /**
   * Mode information
   */
  mode?: Partial<ComponentFramework.Mode>
  
  /**
   * Navigation handler
   */
  navigation?: Partial<ComponentFramework.Navigation>
}

/**
 * PCF Harness options
 */
export interface PCFHarnessOptions {
  /**
   * Path to manifest file
   */
  manifestPath?: string
  
  /**
   * Component parameters
   */
  parameters?: Record<string, any>
  
  /**
   * Mock context options
   */
  contextOptions?: MockContextOptions
  
  /**
   * Whether to enable Redux DevTools
   * @default true
   */
  enableDevTools?: boolean
}

/**
 * Harness environment type
 */
export type HarnessEnvironment = 'development' | 'test' | 'production'

/**
 * PowerApps container props
 */
export interface PowerAppsContainerProps {
  /**
   * Component to render
   */
  component: PCFComponent
  
  /**
   * Container width
   * @default "100%"
   */
  width?: string | number
  
  /**
   * Container height
   * @default "100%"
   */
  height?: string | number
  
  /**
   * Initial context options
   */
  contextOptions?: MockContextOptions
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties
  
  /**
   * Class name
   */
  className?: string
}