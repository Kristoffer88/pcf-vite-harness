import { initPCF } from 'pcf-vite-harness'
import 'pcf-vite-harness/styles/powerapps.css'

// Import your PCF component
import { field } from '../field/index'

// Initialize the PCF harness
initPCF(field)

// Or use the advanced initialization for more control:
/*
import { initializePCFHarness } from 'pcf-vite-harness';

initializePCFHarness({
    pcfClass: field,
    containerId: 'pcf-container',
    contextOptions: {
        displayName: 'Your Name',
        userName: 'you@company.com',
        // Override webAPI methods for custom testing
        webAPI: {
            // Example: Mock retrieveMultipleRecords with test data
            retrieveMultipleRecords: async (entityLogicalName, options) => {
                console.log(`Mock retrieveMultipleRecords for ${entityLogicalName}`)
                return {
                    entities: [
                        { id: '123', name: 'Test Record 1' },
                        { id: '456', name: 'Test Record 2' }
                    ]
                }
            },
            // The default implementations will handle other methods
            // unless you override them here
        }
    },
    showDevPanel: true
});
*/
