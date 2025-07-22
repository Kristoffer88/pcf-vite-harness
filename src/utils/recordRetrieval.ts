/**
 * Record Retrieval - Get records using Dataverse views and FetchXML
 */

import type { ViewInfo } from './viewDiscovery'
import { getViewById } from './viewDiscovery'

export interface RecordRetrievalOptions {
  maxPageSize?: number
  pageNumber?: number
  includeCount?: boolean
  additionalFilters?: string
  orderBy?: string
}

export interface RecordRetrievalResult {
  entities: ComponentFramework.WebApi.Entity[]
  totalCount?: number
  nextLink?: string
  previousLink?: string
  success: boolean
  error?: string
  fetchXml?: string
  viewInfo?: ViewInfo
}

export interface PaginatedRecordResult {
  entities: ComponentFramework.WebApi.Entity[]
  totalCount?: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  pageInfo: {
    currentPage: number
    pageSize: number
    totalPages?: number
  }
  success: boolean
  error?: string
}

/**
 * Get records using a saved query (system view)
 */
export async function getRecordsForSystemView(
  savedQueryId: string,
  options: RecordRetrievalOptions = {}
): Promise<RecordRetrievalResult> {
  try {
    const viewInfo = await getViewById(savedQueryId)
    if (!viewInfo || viewInfo.isUserView) {
      return {
        entities: [],
        success: false,
        error: `System view not found: ${savedQueryId}`,
      }
    }

    return await executeViewQuery(viewInfo, options)
  } catch (error) {
    return {
      entities: [],
      success: false,
      error: `Failed to get records for system view ${savedQueryId}: ${error}`,
    }
  }
}

/**
 * Get records using a user query (personal view)
 */
export async function getRecordsForUserView(
  userQueryId: string,
  options: RecordRetrievalOptions = {}
): Promise<RecordRetrievalResult> {
  try {
    const viewInfo = await getViewById(userQueryId)
    if (!viewInfo || !viewInfo.isUserView) {
      return {
        entities: [],
        success: false,
        error: `User view not found: ${userQueryId}`,
      }
    }

    return await executeViewQuery(viewInfo, options)
  } catch (error) {
    return {
      entities: [],
      success: false,
      error: `Failed to get records for user view ${userQueryId}: ${error}`,
    }
  }
}

/**
 * Get records for any view (detects if it's system or user view)
 */
export async function getRecordsForView(
  viewId: string,
  options: RecordRetrievalOptions = {}
): Promise<RecordRetrievalResult> {
  try {
    const viewInfo = await getViewById(viewId)
    if (!viewInfo) {
      return {
        entities: [],
        success: false,
        error: `View not found: ${viewId}`,
      }
    }

    return await executeViewQuery(viewInfo, options)
  } catch (error) {
    return {
      entities: [],
      success: false,
      error: `Failed to get records for view ${viewId}: ${error}`,
    }
  }
}

/**
 * Execute a view query and return records
 */
export async function executeViewQuery(
  viewInfo: ViewInfo,
  options: RecordRetrievalOptions = {}
): Promise<RecordRetrievalResult> {
  try {
    // Use the WebAPI with savedQuery parameter for better performance
    const queryParam = viewInfo.isUserView ? 'userQuery' : 'savedQuery'
    const collectionName = await getCollectionNameForEntity(viewInfo.entityName)

    let url = `/api/data/v9.2/${collectionName}?${queryParam}=${viewInfo.id}`

    // Add optional parameters
    if (options.maxPageSize) {
      url += `&$top=${options.maxPageSize}`
    }

    if (options.includeCount) {
      url += `&$count=true`
    }

    // Add additional filters if provided
    if (options.additionalFilters) {
      url += `&$filter=${encodeURIComponent(options.additionalFilters)}`
    }

    // Add custom ordering if provided
    if (options.orderBy) {
      url += `&$orderby=${encodeURIComponent(options.orderBy)}`
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      entities: data.value || [],
      totalCount: data['@odata.count'],
      nextLink: data['@odata.nextLink'],
      success: true,
      viewInfo,
      fetchXml: viewInfo.fetchXml,
    }
  } catch (error) {
    return {
      entities: [],
      success: false,
      error: String(error),
      viewInfo,
      fetchXml: viewInfo.fetchXml,
    }
  }
}

/**
 * Execute FetchXML directly
 */
export async function executeFetchXml(
  fetchXml: string,
  entityLogicalName: string,
  options: RecordRetrievalOptions = {}
): Promise<RecordRetrievalResult> {
  try {
    const collectionName = await getCollectionNameForEntity(entityLogicalName)

    // Add pagination to FetchXML if specified
    let modifiedFetchXml = fetchXml
    if (options.maxPageSize || options.pageNumber) {
      modifiedFetchXml = addPaginationToFetchXml(fetchXml, {
        pageSize: options.maxPageSize || 50,
        pageNumber: options.pageNumber || 1,
      })
    }

    const url = `/api/data/v9.2/${collectionName}?fetchXml=${encodeURIComponent(modifiedFetchXml)}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      entities: data.value || [],
      totalCount: data['@odata.count'],
      nextLink: data['@odata.nextLink'],
      success: true,
      fetchXml: modifiedFetchXml,
    }
  } catch (error) {
    return {
      entities: [],
      success: false,
      error: String(error),
      fetchXml,
    }
  }
}

/**
 * Get paginated records from a view
 */
export async function getPaginatedRecordsForView(
  viewId: string,
  pageNumber: number = 1,
  pageSize: number = 50
): Promise<PaginatedRecordResult> {
  const options: RecordRetrievalOptions = {
    maxPageSize: pageSize,
    pageNumber,
    includeCount: true,
  }

  const result = await getRecordsForView(viewId, options)

  if (!result.success) {
    return {
      entities: [],
      hasNextPage: false,
      hasPreviousPage: false,
      pageInfo: {
        currentPage: pageNumber,
        pageSize,
      },
      success: false,
      error: result.error,
    }
  }

  const totalPages = result.totalCount ? Math.ceil(result.totalCount / pageSize) : undefined

  return {
    entities: result.entities,
    totalCount: result.totalCount,
    hasNextPage: Boolean(result.nextLink) || (totalPages ? pageNumber < totalPages : false),
    hasPreviousPage: pageNumber > 1,
    pageInfo: {
      currentPage: pageNumber,
      pageSize,
      totalPages,
    },
    success: true,
  }
}

/**
 * Get record count for a view
 */
export async function getRecordCountForView(viewId: string): Promise<number | null> {
  try {
    const viewInfo = await getViewById(viewId)
    if (!viewInfo) {
      return null
    }

    const queryParam = viewInfo.isUserView ? 'userQuery' : 'savedQuery'
    const collectionName = await getCollectionNameForEntity(viewInfo.entityName)

    const countUrl = `/api/data/v9.2/${collectionName}/$count?${queryParam}=${viewId}`

    const response = await fetch(countUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const count = await response.text()
    return Number.parseInt(count, 10)
  } catch (error) {
    console.error(`Failed to get record count for view ${viewId}:`, error)
    return null
  }
}

/**
 * Helper: Get collection name for entity logical name
 */
async function getCollectionNameForEntity(entityLogicalName: string): Promise<string> {
  try {
    const response = await fetch(
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalCollectionName`
    )
    if (!response.ok) {
      throw new Error(`Failed to get metadata for ${entityLogicalName}`)
    }

    const data = await response.json()
    return data.LogicalCollectionName || entityLogicalName
  } catch (error) {
    console.warn(
      `Failed to get collection name for ${entityLogicalName}, using logical name as fallback`
    )
    return entityLogicalName
  }
}

/**
 * Helper: Add pagination attributes to FetchXML
 */
function addPaginationToFetchXml(
  fetchXml: string,
  pagination: { pageSize: number; pageNumber: number }
): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(fetchXml, 'text/xml')

  const entityElement = doc.querySelector('entity')
  if (entityElement) {
    entityElement.setAttribute('page', pagination.pageNumber.toString())
    entityElement.setAttribute('count', pagination.pageSize.toString())
  }

  return new XMLSerializer().serializeToString(doc)
}

/**
 * Helper: Extract entity name from FetchXML
 */
export function extractEntityNameFromFetchXml(fetchXml: string): string | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(fetchXml, 'text/xml')
    const entityElement = doc.querySelector('entity')
    return entityElement?.getAttribute('name') || null
  } catch (error) {
    console.error('Failed to extract entity name from FetchXML:', error)
    return null
  }
}
