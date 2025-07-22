/**
 * Dataset Query Executor
 * Functions for executing OData queries against the Dataverse WebAPI
 */

import { validateQuery } from './queryBuilder'
import type { DatasetQuery, QueryResult } from './types'

/**
 * Execute a dataset query using the WebAPI
 */
export async function executeDatasetQuery(
  query: DatasetQuery,
  webAPI?: ComponentFramework.WebApi
): Promise<QueryResult> {
  // Validate query first
  const validation = validateQuery(query)
  if (!validation.isValid) {
    return {
      entities: [],
      success: false,
      error: `Query validation failed: ${validation.errors.join(', ')}`,
    }
  }

  try {
    if (!webAPI) {
      return {
        entities: [],
        success: false,
        error: 'WebAPI is not available',
      }
    }

    console.log(`🔍 Executing query for ${query.entityLogicalName}:`, query.odataQuery)

    // Execute the query
    const result = await webAPI.retrieveMultipleRecords(
      query.entityLogicalName,
      query.odataQuery.split('?')[1] // Remove entity name from query string
    )

    console.log(`✅ Query successful: ${result.entities.length} records retrieved`)

    return {
      entities: result.entities,
      totalCount: result.entities.length,
      nextLink: result.nextLink,
      success: true,
    }
  } catch (error) {
    console.error(`❌ Query failed for ${query.entityLogicalName}:`, error)

    return {
      entities: [],
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Execute multiple queries in parallel
 */
export async function executeBatchQueries(
  queries: DatasetQuery[],
  webAPI?: ComponentFramework.WebApi,
  options: { maxConcurrency?: number } = {}
): Promise<QueryResult[]> {
  const { maxConcurrency = 5 } = options

  // Split queries into batches to avoid overwhelming the API
  const batches: DatasetQuery[][] = []
  for (let i = 0; i < queries.length; i += maxConcurrency) {
    batches.push(queries.slice(i, i + maxConcurrency))
  }

  const results: QueryResult[] = []

  for (const batch of batches) {
    const batchPromises = batch.map(query => executeDatasetQuery(query, webAPI))
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  return results
}

/**
 * Test WebAPI connectivity
 */
export async function testWebAPIConnection(
  webAPI?: ComponentFramework.WebApi
): Promise<{ success: boolean; error?: string }> {
  if (!webAPI) {
    return { success: false, error: 'WebAPI is not available' }
  }

  try {
    // Simple query to test connectivity
    await webAPI.retrieveMultipleRecords('systemuser', '$select=systemuserid&$top=1')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('WebAPI connectivity test failed:', errorMessage)
    return { success: false, error: errorMessage }
  }
}
