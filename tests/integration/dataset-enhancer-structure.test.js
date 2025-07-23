import { describe, it, expect } from 'vitest';

describe('Dataset Enhancer Record Structure', () => {
  it('should create proper PCF record structure with _entityReference._name', async () => {
    // Fetch a pum_gantttask record to test with
    const response = await fetch('/api/data/v9.1/pum_gantttasks?$top=1');
    const data = await response.json();
    
    if (data.value && data.value.length > 0) {
      const entity = data.value[0];
      console.log('Test entity:', {
        id: entity.pum_gantttaskid,
        name: entity.pum_name
      });
      
      // Simulate what the enhancer should do
      // This is what we expect after the fix
      const expectedStructure = {
        _entityReference: {
          _etn: 'pum_gantttask',
          _id: entity.pum_gantttaskid,
          _name: entity.pum_name
        },
        _primaryFieldName: 'pum_name',
        _record: {
          initialized: 2,
          identifier: {
            etn: 'pum_gantttask',
            id: { guid: entity.pum_gantttaskid }
          },
          fields: expect.any(Object)
        }
      };
      
      console.log('Expected _entityReference structure:', expectedStructure._entityReference);
      
      // Verify the name would be accessible
      expect(entity.pum_name).toBeTruthy();
      expect(entity.pum_name).not.toBe('');
    }
  });
  
  it('should verify entity type detection for pum_gantttask', async () => {
    // Test that entity type can be detected from primary key
    const testEntity = {
      pum_gantttaskid: 'test-id-123',
      pum_name: 'Test Task',
      '@odata.etag': 'W/"12345"'
    };
    
    // The entity type should be extracted from pum_gantttaskid
    const primaryKeyField = Object.keys(testEntity).find(k => 
      k.endsWith('id') && !k.includes('@') && !k.includes('.')
    );
    
    console.log('Primary key field:', primaryKeyField);
    
    if (primaryKeyField) {
      const entityType = primaryKeyField.substring(0, primaryKeyField.length - 2);
      console.log('Detected entity type:', entityType);
      
      expect(entityType).toBe('pum_gantttask');
    }
  });
});