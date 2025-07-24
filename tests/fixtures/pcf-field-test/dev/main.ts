import { initializePCFHarness } from 'pcf-vite-harness'
import 'pcf-vite-harness/styles/powerapps.css'

// Import your PCF component
import { field } from '../field/index'

// Initialize the PCF harness with auto-detected manifest info
initializePCFHarness({
  pcfClass: field,
  containerId: 'pcf-container',
  // Auto-detected manifest info from field/ControlManifest.Input.xml
  manifestInfo: {
    namespace: 'test',
    constructor: 'field',
    version: '1.0',
    displayName: 'field',
    description: 'field description',
  },
})

// For additional configuration options:
/*
initializePCFHarness({
  pcfClass: field,
  containerId: 'pcf-container',
  contextOptions: {
    displayName: 'Your Name',
    userName: 'you@company.com',
    // Override webAPI methods for custom testing
    webAPI: {
      retrieveMultipleRecords: async (entityLogicalName, options) => {
        console.log(`Mock data for ${entityLogicalName}`)
        return { entities: [] }
      }
    }
  }
})
*/
