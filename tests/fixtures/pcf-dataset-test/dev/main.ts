import { initializePCFHarness, createMockContext } from 'pcf-vite-harness'
import 'pcf-vite-harness/styles/powerapps.css'

// Import the PCF dataset component
import { dataset } from '../dataset/index'

// Create context with real dataset connection
const mockContext = createMockContext({
    displayName: 'Test User',
    userName: 'testuser@company.com',
    // Enable real Dataverse integration - this will use actual data
    // when dataverse-utilities is properly configured
    datasetOptions: {
        loading: false,
        error: false,
        // Note: In real integration, these will be populated by Dataverse API calls
        sortedRecordIds: [],
        records: {},
        columns: [],
        paging: {
            hasNextPage: false,
            hasPreviousPage: false,
            totalResultCount: 0,
            pageSize: 25,
            loadNextPage: () => {
                console.log('Loading next page - would make real API call');
            },
            loadPreviousPage: () => {
                console.log('Loading previous page - would make real API call');
            },
            reset: () => {
                console.log('Resetting pagination - would make real API call');
            },
            setPageSize: (size: number) => {
                console.log(`Setting page size to ${size} - would make real API call`);
            }
        } as any,
        linking: {
            getLinkedEntities: () => [],
            addLinkedEntity: () => {}
        } as any,
        filtering: {
            getFilter: () => undefined,
            setFilter: () => {},
            clearFilter: () => {}
        } as any,
        sorting: [],
        addColumn: () => {},
        clearSelectedRecordIds: () => {},
        getSelectedRecordIds: () => [],
        getTargetEntityType: () => 'account', // This would be dynamic in real implementation
        getTitle: () => 'Real Dataverse Dataset',
        getViewId: () => 'real-view-id',
        openDatasetItem: (ref: any) => {
            console.log('Opening dataset item', ref);
        },
        refresh: () => {
            console.log('Refreshing dataset - would make real API call');
            // In real implementation, this would:
            // 1. Make API call to Dataverse
            // 2. Update records, columns, pagination
            // 3. Call updateView on the component
        },
        setSelectedRecordIds: (ids: string[]) => {
            console.log('Setting selected record IDs', ids);
        }
    }
});

// Initialize the PCF harness with real Dataverse integration
initializePCFHarness({
    pcfClass: dataset,
    containerId: 'pcf-container',
    customContext: mockContext,
    showDevPanel: true
});

// Demo: Simulate loading real data after initialization
setTimeout(() => {
    console.log('Simulating real Dataverse data load...');
    
    // In real implementation with dataverse-utilities, this would be:
    // const response = await fetch('/api/data/v9.2/accounts?$top=5');
    // const data = await response.json();
    
    // For demo purposes, show what real integration would look like:
    const simulatedDataverseResponse = {
        value: [
            {
                accountid: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Contoso Ltd.',
                telephone1: '555-0100',
                websiteurl: 'https://contoso.com'
            },
            {
                accountid: '123e4567-e89b-12d3-a456-426614174001',
                name: 'Fabrikam Inc.',
                telephone1: '555-0101',
                websiteurl: 'https://fabrikam.com'
            }
        ]
    };
    
    console.log('Real Dataverse response would be:', simulatedDataverseResponse);
}, 2000);