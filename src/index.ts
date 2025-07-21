/**
 * PCF Vite Harness - Modern development environment for PowerApps Component Framework
 *
 * This library provides a Vite-based development harness that replicates the PowerApps
 * environment for PCF components, enabling hot module replacement and modern tooling.
 */

export { createMockContext } from './createMockContext.js'
export { createPCFViteConfig } from './createViteConfig.js'
export { initializePCFHarness, initPCF } from './initializePCFHarness.js'
// Core components
export { PowerAppsContainer } from './PowerAppsContainer.js'

// Devtools
export {
  PCFDevtools,
  PCFDevtoolsPanel_Embedded,
  PCFDevtoolsProvider,
  usePCFDevtools,
  tokens as devtoolsTokens,
  getThemeColors,
} from './devtools/index.js'

// Type definitions
export type {
  HarnessEnvironment,
  MockContextOptions,
  PCFComponent,
  PCFHarnessOptions,
  PCFViteOptions,
  PowerAppsContainerProps,
} from './types/index.js'

// CSS import for convenience
export const PCF_STYLES = '../styles/powerapps.css'

/**
 * Version of the PCF Vite Harness
 */
export const VERSION = '1.1.0-beta.3'
