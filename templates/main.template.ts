import { initPCF } from 'pcf-vite-harness'
import 'pcf-vite-harness/styles/powerapps.css'

// Import your PCF component
import { YourPCFComponent } from '../path/to/your/component/index'

// Initialize the PCF harness
initPCF(YourPCFComponent)

// Or use the advanced initialization for more control:
/*
import { initializePCFHarness } from 'pcf-vite-harness';

initializePCFHarness({
    pcfClass: YourPCFComponent,
    containerId: 'pcf-container',
    contextOptions: {
        displayName: 'Your Name',
        userName: 'you@company.com'
    },
    showDevPanel: true
});
*/
