import { describe, it, expect } from 'vitest';

// Import the actual functions to test them directly
import { convertEntitiesToDatasetRecords } from '../../dist/devtools-redux/index.js';

describe('Debug Name Mapping Issue', () => {
  it('should test convertEntitiesToDatasetRecords with real pum_gantttask data', async () => {
    // Fetch real pum_gantttask records
    const response = await fetch('/api/data/v9.1/pum_gantttasks?$top=2');
    const data = await response.json();
    
    if (data.value && data.value.length > 0) {
      try {
        // This should throw an error with debugging info if name mapping fails
        const records = await convertEntitiesToDatasetRecords(data.value, 'pum_gantttask');
        
        // Check the first record
        const firstRecordId = Object.keys(records)[0];
        const firstRecord = records[firstRecordId];
        
        // This should have the name
        expect(firstRecord._entityReference._name).toBeTruthy();
        expect(firstRecord._entityReference._name).not.toBe('Unnamed Record');
        
      } catch (error) {
        console.error('ERROR during conversion:', error.message);
        
        // Parse the debug info from the error
        const debugMatch = error.message.match(/Debug info: ({[\s\S]*})/);
        if (debugMatch) {
          try {
            const debugInfo = JSON.parse(debugMatch[1]);
            
            // Check if the entity has the expected field
            if (debugInfo.entity && debugInfo.nameAttribute) {
              // Value check logic
            }
          } catch (parseError) {
            console.error('Failed to parse debug info:', parseError);
          }
        }
        
        throw error;
      }
    }
  });
  
  it('should check raw entity structure from API', async () => {
    const response = await fetch('/api/data/v9.1/pum_gantttasks?$top=1&$select=pum_gantttaskid,pum_name');
    const data = await response.json();
    
    if (data.value && data.value.length > 0) {
      const entity = data.value[0];
      
      // Check if the field exists
      expect(entity).toHaveProperty('pum_name');
      expect(entity.pum_name).toBeTruthy();
    }
  });
});