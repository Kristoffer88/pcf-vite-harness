import { initializePCFHarness } from 'pcf-vite-harness'
import { PCFDevToolsProvider } from 'pcf-vite-harness/devtools-redux'
import 'pcf-vite-harness/styles/powerapps.css'
import React from 'react'
import { createRoot } from 'react-dom/client'

// Import your PCF component
import { dataset } from '../dataset/index'

// Initialize the PCF harness with the standard container - this handles the PCF component
console.log('🔧 Starting PCF harness initialization...')

const harness = initializePCFHarness({
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

console.log('✅ PCF harness initialized, adding DevTools...')

// Add the DevTools Provider to the page as an overlay
const devToolsRoot = document.createElement('div')
devToolsRoot.id = 'pcf-devtools-root'
document.body.appendChild(devToolsRoot)

const devToolsReactRoot = createRoot(devToolsRoot)
devToolsReactRoot.render(
  React.createElement(PCFDevToolsProvider, {
    context: harness.context,
    manifestInfo: harness.manifestInfo,
    children: null // No children needed, just the devtools overlay
  })
)

console.log('✅ DevTools added to page')

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
