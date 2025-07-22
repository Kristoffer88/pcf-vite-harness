/**
 * Example: Using View Record Retrieval Functions
 *
 * This example demonstrates how to use the view discovery and record retrieval
 * functions to get records from Dataverse views.
 */

import {
  analyzeFetchXml,
  getAllViewsForEntity,
  getRecordCountForView,
  getRecordsForView,
  type RecordRetrievalResult,
  type ViewInfo,
} from '../utils'

/**
 * Example: Get all contacts using the default view
 */
export async function getContactsFromDefaultView(): Promise<RecordRetrievalResult> {
  try {
    // 1. Get all views for the contact entity
    const views = await getAllViewsForEntity('contact')
    console.log(`Found ${views.length} views for contacts`)

    // 2. Find the default view
    const defaultView = views.find(v => v.isDefault)
    if (!defaultView) {
      throw new Error('No default view found for contacts')
    }

    console.log(`Using default view: "${defaultView.name}"`)

    // 3. Get records from the default view
    const result = await getRecordsForView(defaultView.id, {
      maxPageSize: 10,
      includeCount: true,
    })

    console.log(`Retrieved ${result.entities.length} contacts`)
    return result
  } catch (error) {
    console.error('Error getting contacts from default view:', error)
    throw error
  }
}

/**
 * Example: Analyze a view's FetchXML for complexity
 */
export async function analyzeViewComplexity(entityName: string, viewName: string) {
  try {
    // Get all views for the entity
    const views = await getAllViewsForEntity(entityName)

    // Find the specific view by name
    const view = views.find(v => v.name.toLowerCase().includes(viewName.toLowerCase()))
    if (!view) {
      throw new Error(`View containing "${viewName}" not found for ${entityName}`)
    }

    console.log(`Analyzing view: "${view.name}"`)

    // Analyze the FetchXML
    const analysis = analyzeFetchXml(view.fetchXml)

    console.log('View Analysis:', {
      complexity: analysis.complexity.level,
      score: analysis.complexity.score,
      factors: analysis.complexity.factors,
      attributes: analysis.attributes.length,
      filters: analysis.filters.length,
      joins: analysis.joins.length,
      warnings: analysis.performance.warnings,
      suggestions: analysis.performance.suggestions,
    })

    // Get record count for the view
    const recordCount = await getRecordCountForView(view.id)
    console.log(`View contains approximately ${recordCount} records`)

    return {
      view,
      analysis,
      recordCount,
    }
  } catch (error) {
    console.error('Error analyzing view complexity:', error)
    throw error
  }
}

/**
 * Example: Get paginated records from a specific view
 */
export async function getPaginatedAccountRecords(viewName: string = 'Active Accounts') {
  try {
    // Get all views for accounts
    const views = await getAllViewsForEntity('account')

    // Find the specific view
    const view = views.find(v => v.name === viewName)
    if (!view) {
      throw new Error(`View "${viewName}" not found for accounts`)
    }

    console.log(`Getting paginated records from: "${view.name}"`)

    const results = []
    let pageNumber = 1
    const pageSize = 25

    // Get first page
    let result = await getRecordsForView(view.id, {
      maxPageSize: pageSize,
      includeCount: true,
    })

    results.push(...result.entities)
    console.log(`Page ${pageNumber}: ${result.entities.length} records`)

    // Continue if there are more pages
    while (result.nextLink && pageNumber < 3) {
      // Limit to 3 pages for demo
      pageNumber++

      result = await getRecordsForView(view.id, {
        maxPageSize: pageSize,
        pageNumber,
      })

      results.push(...result.entities)
      console.log(`Page ${pageNumber}: ${result.entities.length} records`)
    }

    console.log(`Total retrieved: ${results.length} account records`)
    return results
  } catch (error) {
    console.error('Error getting paginated account records:', error)
    throw error
  }
}

/**
 * Example: Compare multiple views for an entity
 */
export async function compareEntityViews(entityName: string) {
  try {
    const views = await getAllViewsForEntity(entityName)
    console.log(`Comparing ${views.length} views for ${entityName}`)

    const comparisons = await Promise.all(
      views.slice(0, 5).map(async view => {
        // Limit to first 5 views
        const analysis = analyzeFetchXml(view.fetchXml)
        const recordCount = await getRecordCountForView(view.id)

        return {
          name: view.name,
          isUserView: view.isUserView,
          isDefault: view.isDefault,
          complexity: analysis.complexity.level,
          complexityScore: analysis.complexity.score,
          attributeCount: analysis.attributes.length,
          filterCount: analysis.filters.length,
          joinCount: analysis.joins.length,
          recordCount,
          warnings: analysis.performance.warnings.length,
        }
      })
    )

    // Sort by complexity score
    comparisons.sort((a, b) => a.complexityScore - b.complexityScore)

    console.log('View Comparison Results:')
    console.table(comparisons)

    return comparisons
  } catch (error) {
    console.error('Error comparing entity views:', error)
    throw error
  }
}

/**
 * Example: Usage in PCF component
 */
export class ViewExampleUsage {
  private viewCache = new Map<string, ViewInfo[]>()

  /**
   * Get records for a dataset using view discovery
   */
  async getDatasetRecords(entityName: string, preferredViewName?: string) {
    try {
      // Check cache first
      let views = this.viewCache.get(entityName)
      if (!views) {
        views = await getAllViewsForEntity(entityName)
        this.viewCache.set(entityName, views)
      }

      // Find the preferred view or use default
      let targetView = preferredViewName
        ? views.find(v => v.name === preferredViewName)
        : views.find(v => v.isDefault)

      if (!targetView) {
        targetView = views[0] // Fallback to first available view
      }

      if (!targetView) {
        throw new Error(`No views available for ${entityName}`)
      }

      // Get records with reasonable page size
      const result = await getRecordsForView(targetView.id, {
        maxPageSize: 50,
        includeCount: true,
      })

      return {
        view: targetView,
        records: result.entities,
        totalCount: result.totalCount,
        hasMore: Boolean(result.nextLink),
      }
    } catch (error) {
      console.error(`Error getting dataset records for ${entityName}:`, error)
      throw error
    }
  }

  /**
   * Clear the view cache
   */
  clearCache() {
    this.viewCache.clear()
  }
}
