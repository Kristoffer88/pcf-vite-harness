/**
 * Dataset Injection Integration Test
 * Tests the ability to inject retrieved records into PCF datasets
 */

import { describe, it, expect } from 'vitest'
import { injectDatasetRecords } from '../../src/devtools-redux/utils/dataset/datasetInjector'
import type { QueryResult } from '../../src/devtools-redux/utils/dataset/types'

describe('Dataset Injection', () => {
  it('should inject records into a dataset', async () => {
    // Create a mock context with a dataset
    const mockDataset = {
      records: {},
      columns: [],
      paging: {
        totalResultCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      loading: true,
    }

    const mockContext = {
      parameters: {
        sampleDataSet: mockDataset,
      },
    }

    // Create a query result with sample records
    const queryResult: QueryResult = {
      success: true,
      entityLogicalName: 'task',
      entities: [
        {
          activityid: '123e4567-e89b-12d3-a456-426614174000',
          subject: 'Task 1',
          scheduledstart: '2024-01-01T00:00:00Z',
          'subject@OData.Community.Display.V1.FormattedValue': 'Task 1',
        },
        {
          activityid: '223e4567-e89b-12d3-a456-426614174001',
          subject: 'Task 2',
          scheduledstart: '2024-01-02T00:00:00Z',
          'subject@OData.Community.Display.V1.FormattedValue': 'Task 2',
        },
      ],
    }

    // Inject the records
    const result = await injectDatasetRecords({
      context: mockContext as any,
      datasetName: 'sampleDataSet',
      queryResult,
    })

    // Verify injection was successful
    expect(result).toBe(true)
    
    // Check that records were added
    expect(Object.keys(mockDataset.records).length).toBe(2)
    expect(mockDataset.records['123e4567-e89b-12d3-a456-426614174000']).toBeDefined()
    expect(mockDataset.records['223e4567-e89b-12d3-a456-426614174001']).toBeDefined()
    
    // Check that columns were created
    expect(mockDataset.columns.length).toBeGreaterThan(0)
    
    // Check that paging was updated
    expect(mockDataset.paging.totalResultCount).toBe(2)
    
    // Check that loading state was updated
    expect(mockDataset.loading).toBe(false)
  })

  it('should handle empty query results gracefully', async () => {
    const mockContext = {
      parameters: {
        sampleDataSet: {
          records: {},
        },
      },
    }

    const emptyResult: QueryResult = {
      success: true,
      entityLogicalName: 'task',
      entities: [],
    }

    const result = await injectDatasetRecords({
      context: mockContext as any,
      datasetName: 'sampleDataSet',
      queryResult: emptyResult,
    })

    expect(result).toBe(true) // Function processes empty results and clears existing records
  })

  it('should detect entity type from records', async () => {
    const mockDataset = {
      records: {},
      getTargetEntityType: () => 'unknown',
    }

    const mockContext = {
      parameters: {
        sampleDataSet: mockDataset,
      },
    }

    const queryResult: QueryResult = {
      success: true,
      entityLogicalName: 'account',
      entities: [
        {
          accountid: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Account',
        },
      ],
    }

    await injectDatasetRecords({
      context: mockContext as any,
      datasetName: 'sampleDataSet',
      queryResult,
    })

    // The getTargetEntityType should now return 'account'
    expect(mockDataset.getTargetEntityType()).toBe('account')
  })
})