import { initializePCFHarness, createMockContext } from 'pcf-vite-harness'
import 'pcf-vite-harness/styles/powerapps.css'

// Import the PCF field component
import { field } from '../field/index'

// Create context with real field integration
const mockContext = createMockContext({
    displayName: 'Test User',
    userName: 'testuser@company.com',
    // In real integration, field properties would be bound to actual Dataverse fields
});

// Initialize the PCF harness with real Dataverse integration
initializePCFHarness({
    pcfClass: field,
    containerId: 'pcf-container',
    customContext: mockContext,
    contextOptions: {
        // Override with field-specific context
        displayName: 'Integration Test User',
        userName: 'integration@test.com'
    },
    showDevPanel: true
});

// Demo: Simulate real field data loading
setTimeout(() => {
    console.log('Simulating real field data integration...');
    
    // In real implementation with dataverse-utilities, this would be:
    // const response = await fetch('/api/data/v9.2/accounts(record-id)?$select=name');
    // const data = await response.json();
    
    // Example of what real integration would look like:
    const simulatedFieldData = {
        recordId: '123e4567-e89b-12d3-a456-426614174000',
        entityName: 'account',
        fieldName: 'name',
        fieldValue: 'Contoso Corporation',
        fieldMetadata: {
            logicalName: 'name',
            displayName: 'Account Name',
            dataType: 'SingleLine.Text',
            maxLength: 160,
            requiredLevel: 'ApplicationRequired'
        }
    };
    
    console.log('Real field data would be:', simulatedFieldData);
    
    // In real implementation, you would update the component's context here
    // and call updateView to reflect the new data
    
}, 2000);

// Demo: WebAPI integration simulation
console.log('WebAPI integration points:');
console.log('- GET /api/data/v9.2/accounts(id)?$select=fieldname');
console.log('- PATCH /api/data/v9.2/accounts(id) { "fieldname": "new value" }');
console.log('- Azure CLI authentication handled by dataverse-utilities');