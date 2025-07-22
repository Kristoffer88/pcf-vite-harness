/**
 * View Discovery - Find and analyze Dataverse views (saved queries and user queries)
 */

export interface SavedQuery {
  savedqueryid: string
  name: string
  returnedtypecode: string
  fetchxml: string
  layoutxml?: string
  querytype: number
  isdefault: boolean
  isprivate: boolean
  description?: string
  entityname?: string
}

export interface UserQuery {
  userqueryid: string
  name: string
  returnedtypecode: string
  fetchxml: string
  layoutxml?: string
  description?: string
  entityname?: string
}

export interface ViewInfo {
  id: string
  name: string
  entityName: string
  entityTypeCode?: string
  fetchXml: string
  layoutXml?: string
  isUserView: boolean
  isDefault: boolean
  isPrivate: boolean
  description?: string
  queryType?: number
}

/**
 * Get all saved queries (system views) for a specific entity
 */
export async function getSystemViewsForEntity(entityLogicalName: string): Promise<SavedQuery[]> {
  const url = `/api/data/v9.2/savedqueries?$filter=returnedtypecode eq '${entityLogicalName}'&$select=savedqueryid,name,returnedtypecode,fetchxml,layoutxml,querytype,isdefault,isprivate,description&$orderby=name`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch system views for ${entityLogicalName}: ${response.status}`)
  }

  const data = await response.json()
  return data.value.map((view: any) => ({
    ...view,
    entityname: entityLogicalName,
  }))
}

/**
 * Get all user queries (personal views) for a specific entity
 */
export async function getUserViewsForEntity(entityLogicalName: string): Promise<UserQuery[]> {
  const url = `/api/data/v9.2/userqueries?$filter=returnedtypecode eq '${entityLogicalName}'&$select=userqueryid,name,returnedtypecode,fetchxml,layoutxml,description&$orderby=name`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch user views for ${entityLogicalName}: ${response.status}`)
  }

  const data = await response.json()
  return data.value.map((view: any) => ({
    ...view,
    entityname: entityLogicalName,
  }))
}

/**
 * Get all views (both system and user) for a specific entity
 */
export async function getAllViewsForEntity(entityLogicalName: string): Promise<ViewInfo[]> {
  const [systemViews, userViews] = await Promise.all([
    getSystemViewsForEntity(entityLogicalName),
    getUserViewsForEntity(entityLogicalName),
  ])

  const allViews: ViewInfo[] = [
    ...systemViews.map(view => ({
      id: view.savedqueryid,
      name: view.name,
      entityName: entityLogicalName,
      fetchXml: view.fetchxml,
      layoutXml: view.layoutxml,
      isUserView: false,
      isDefault: view.isdefault,
      isPrivate: view.isprivate,
      description: view.description,
      queryType: view.querytype,
    })),
    ...userViews.map(view => ({
      id: view.userqueryid,
      name: view.name,
      entityName: entityLogicalName,
      fetchXml: view.fetchxml,
      layoutXml: view.layoutxml,
      isUserView: true,
      isDefault: false,
      isPrivate: true,
      description: view.description,
    })),
  ]

  return allViews.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get a specific saved query by ID
 */
export async function getSystemViewById(savedQueryId: string): Promise<SavedQuery | null> {
  const url = `/api/data/v9.2/savedqueries(${savedQueryId})?$select=savedqueryid,name,returnedtypecode,fetchxml,layoutxml,querytype,isdefault,isprivate,description`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch saved query ${savedQueryId}: ${response.status}`)
    }

    const data = await response.json()
    return {
      ...data,
      entityname: data.returnedtypecode,
    }
  } catch (error) {
    console.error('Error fetching saved query:', error)
    return null
  }
}

/**
 * Get a specific user query by ID
 */
export async function getUserViewById(userQueryId: string): Promise<UserQuery | null> {
  const url = `/api/data/v9.2/userqueries(${userQueryId})?$select=userqueryid,name,returnedtypecode,fetchxml,layoutxml,description`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch user query ${userQueryId}: ${response.status}`)
    }

    const data = await response.json()
    return {
      ...data,
      entityname: data.returnedtypecode,
    }
  } catch (error) {
    console.error('Error fetching user query:', error)
    return null
  }
}

/**
 * Get view by ID (tries both system and user views)
 */
export async function getViewById(viewId: string): Promise<ViewInfo | null> {
  // Try system view first
  const systemView = await getSystemViewById(viewId)
  if (systemView) {
    return {
      id: systemView.savedqueryid,
      name: systemView.name,
      entityName: systemView.returnedtypecode,
      fetchXml: systemView.fetchxml,
      layoutXml: systemView.layoutxml,
      isUserView: false,
      isDefault: systemView.isdefault,
      isPrivate: systemView.isprivate,
      description: systemView.description,
      queryType: systemView.querytype,
    }
  }

  // Try user view
  const userView = await getUserViewById(viewId)
  if (userView) {
    return {
      id: userView.userqueryid,
      name: userView.name,
      entityName: userView.returnedtypecode,
      fetchXml: userView.fetchxml,
      layoutXml: userView.layoutxml,
      isUserView: true,
      isDefault: false,
      isPrivate: true,
      description: userView.description,
    }
  }

  return null
}

/**
 * Get default view for an entity
 */
export async function getDefaultViewForEntity(entityLogicalName: string): Promise<ViewInfo | null> {
  const systemViews = await getSystemViewsForEntity(entityLogicalName)
  const defaultView = systemViews.find(view => view.isdefault)

  if (defaultView) {
    return {
      id: defaultView.savedqueryid,
      name: defaultView.name,
      entityName: entityLogicalName,
      fetchXml: defaultView.fetchxml,
      layoutXml: defaultView.layoutxml,
      isUserView: false,
      isDefault: true,
      isPrivate: defaultView.isprivate,
      description: defaultView.description,
      queryType: defaultView.querytype,
    }
  }

  return null
}

/**
 * Discover all entities that have views
 */
export async function discoverEntitiesWithViews(): Promise<string[]> {
  const url = `/api/data/v9.2/savedqueries?$select=returnedtypecode&$filter=querytype eq 0`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to discover entities with views: ${response.status}`)
  }

  const data = await response.json()
  const entityNames = new Set<string>()

  data.value.forEach((view: any) => {
    if (view.returnedtypecode) {
      entityNames.add(view.returnedtypecode)
    }
  })

  return Array.from(entityNames).sort()
}

/**
 * Search views by name across all entities
 */
export async function searchViewsByName(
  searchTerm: string,
  entityLogicalName?: string
): Promise<ViewInfo[]> {
  let systemUrl = `/api/data/v9.2/savedqueries?$filter=contains(name,'${searchTerm}')&$select=savedqueryid,name,returnedtypecode,fetchxml,layoutxml,querytype,isdefault,isprivate,description&$orderby=name`
  let userUrl = `/api/data/v9.2/userqueries?$filter=contains(name,'${searchTerm}')&$select=userqueryid,name,returnedtypecode,fetchxml,layoutxml,description&$orderby=name`

  if (entityLogicalName) {
    systemUrl += ` and returnedtypecode eq '${entityLogicalName}'`
    userUrl += ` and returnedtypecode eq '${entityLogicalName}'`
  }

  const [systemResponse, userResponse] = await Promise.all([fetch(systemUrl), fetch(userUrl)])

  if (!systemResponse.ok || !userResponse.ok) {
    throw new Error('Failed to search views')
  }

  const [systemData, userData] = await Promise.all([systemResponse.json(), userResponse.json()])

  const results: ViewInfo[] = [
    ...systemData.value.map((view: any) => ({
      id: view.savedqueryid,
      name: view.name,
      entityName: view.returnedtypecode,
      fetchXml: view.fetchxml,
      layoutXml: view.layoutxml,
      isUserView: false,
      isDefault: view.isdefault,
      isPrivate: view.isprivate,
      description: view.description,
      queryType: view.querytype,
    })),
    ...userData.value.map((view: any) => ({
      id: view.userqueryid,
      name: view.name,
      entityName: view.returnedtypecode,
      fetchXml: view.fetchxml,
      layoutXml: view.layoutxml,
      isUserView: true,
      isDefault: false,
      isPrivate: true,
      description: view.description,
    })),
  ]

  return results.sort((a, b) => a.name.localeCompare(b.name))
}
