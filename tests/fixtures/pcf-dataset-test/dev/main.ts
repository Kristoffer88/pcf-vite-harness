import { initializePCFHarness } from 'pcf-vite-harness'
import 'pcf-vite-harness/styles/powerapps.css'

// Import your PCF component
import { dataset } from '../dataset/index'

// Initialize the PCF harness with the standard container - this handles the PCF component
console.log('🔧 Starting PCF harness initialization...')

initializePCFHarness({
  pcfClass: dataset,
  containerId: 'pcf-container',
  showDevPanel: true, // Enable DevTools panel
  manifestInfo: {
    namespace: 'test',
    constructor: 'dataset',
    version: '1.0',
    displayName: 'dataset',
    description: 'dataset description',
  },
})

console.log('✅ PCF harness initialized with DevTools enabled')

// For additional configuration options:
/*
initializePCFHarness({
  pcfClass: dataset,
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
  },
  showDevPanel: true
})
*/
