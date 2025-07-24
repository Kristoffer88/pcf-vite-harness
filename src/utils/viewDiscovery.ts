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

export interface EntityInfo {
  logicalName: string
  displayName: string
  displayText: string // "Display Name (logical_name)"
}

export interface RecordInfo {
  id: string
  primaryName: string
  displayText: string // "Primary Name (ID)"
}

export interface RelationshipInfo {
  schemaName: string
  relationshipType: 'OneToMany' | 'ManyToOne' | 'ManyToMany'
  referencingEntity: string
  referencedEntity: string
  referencingAttribute: string
  referencedAttribute: string
  lookupFieldName: string
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
 * Discover all entities that have views with their display names
 * Uses single API call to get all entity definitions efficiently
 */
export async function discoverEntitiesWithDisplayNames(): Promise<EntityInfo[]> {
  try {
    // Get all entity definitions in one call
    const url = `/api/data/v9.2/EntityDefinitions?$select=DisplayName,LogicalName`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch entity definitions: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Get entities that have views
    const entityLogicalNames = await discoverEntitiesWithViews()
    const entityLogicalNamesSet = new Set(entityLogicalNames)
    
    // Filter and map the entities that have views
    const entityInfos: EntityInfo[] = data.value
      .filter((entity: any) => entityLogicalNamesSet.has(entity.LogicalName))
      .map((entity: any) => {
        const logicalName = entity.LogicalName
        const displayName = entity.DisplayName?.UserLocalizedLabel?.Label || logicalName
        return {
          logicalName,
          displayName,
          displayText: `${displayName} (${logicalName})`
        }
      })
    
    // Sort by display name
    return entityInfos.sort((a, b) => a.displayName.localeCompare(b.displayName))
    
  } catch (error) {
    console.warn('Error fetching entity display names:', error)
    // Fallback to just logical names
    const entityLogicalNames = await discoverEntitiesWithViews()
    return entityLogicalNames.map(logicalName => ({
      logicalName,
      displayName: logicalName,
      displayText: logicalName
    })).sort((a, b) => a.displayName.localeCompare(b.displayName))
  }
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

/**
 * Search records from a specific table
 */
export async function searchRecordsFromTable(
  entityLogicalName: string,
  searchTerm?: string,
  limit: number = 50
): Promise<RecordInfo[]> {
  try {
    // Get entity metadata to find the primary name attribute
    const entityMetadataUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=PrimaryNameAttribute`
    const metadataResponse = await fetch(entityMetadataUrl)
    
    if (!metadataResponse.ok) {
      throw new Error(`Failed to get entity metadata for ${entityLogicalName}`)
    }
    
    const metadata = await metadataResponse.json()
    const primaryNameAttribute = metadata.PrimaryNameAttribute || 'name'
    const primaryIdAttribute = `${entityLogicalName}id`
    
    // Build the records query
    let recordsUrl = `/api/data/v9.2/${entityLogicalName}s?$select=${primaryIdAttribute},${primaryNameAttribute}&$top=${limit}`
    
    // Add search filter if provided
    if (searchTerm && searchTerm.trim()) {
      const searchFilter = `contains(${primaryNameAttribute},'${searchTerm.trim()}')`
      recordsUrl += `&$filter=${encodeURIComponent(searchFilter)}`
    }
    
    // Order by primary name
    recordsUrl += `&$orderby=${primaryNameAttribute}`
    
    const recordsResponse = await fetch(recordsUrl)
    
    if (!recordsResponse.ok) {
      throw new Error(`Failed to fetch records from ${entityLogicalName}: ${recordsResponse.status}`)
    }
    
    const recordsData = await recordsResponse.json()
    
    return recordsData.value.map((record: any) => {
      const id = record[primaryIdAttribute]
      const primaryName = record[primaryNameAttribute] || `Record ${id}`
      const shortId = id ? id.substring(0, 8) + '...' : 'Unknown'
      
      return {
        id,
        primaryName,
        displayText: `${primaryName} (${shortId})`
      }
    })
    
  } catch (error) {
    console.error(`Error searching records from ${entityLogicalName}:`, error)
    return []
  }
}

/**
 * Get entities that have lookup relationships to the specified parent entity
 */
export async function getEntitiesWithLookupsToParent(parentEntityLogicalName: string): Promise<EntityInfo[]> {
  try {
    // Query relationship metadata to find all relationships where the parent is the referenced entity
    const relationshipsUrl = `/api/data/v9.2/RelationshipDefinitions/Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata?$filter=ReferencedEntity eq '${parentEntityLogicalName}'&$select=SchemaName,ReferencingEntity,ReferencedEntity`
    
    const response = await fetch(relationshipsUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch relationships for ${parentEntityLogicalName}: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Get unique referencing entities
    const relatedEntityNames = new Set<string>()
    data.value.forEach((relationship: any) => {
      if (relationship.ReferencingEntity && relationship.ReferencingEntity !== parentEntityLogicalName) {
        relatedEntityNames.add(relationship.ReferencingEntity)
      }
    })
    
    if (relatedEntityNames.size === 0) {
      return []
    }
    
    // Get entity definitions for the related entities
    const entityNamesArray = Array.from(relatedEntityNames)
    const entityFilter = entityNamesArray.map(name => `LogicalName eq '${name}'`).join(' or ')
    const entitiesUrl = `/api/data/v9.2/EntityDefinitions?$filter=${entityFilter}&$select=DisplayName,LogicalName`
    
    const entitiesResponse = await fetch(entitiesUrl)
    if (!entitiesResponse.ok) {
      throw new Error(`Failed to fetch entity definitions: ${entitiesResponse.status}`)
    }
    
    const entitiesData = await entitiesResponse.json()
    
    // Filter to only include entities that have views
    const entityLogicalNames = await discoverEntitiesWithViews()
    const entityLogicalNamesSet = new Set(entityLogicalNames)
    
    const entityInfos: EntityInfo[] = entitiesData.value
      .filter((entity: any) => entityLogicalNamesSet.has(entity.LogicalName))
      .map((entity: any) => {
        const logicalName = entity.LogicalName
        const displayName = entity.DisplayName?.UserLocalizedLabel?.Label || logicalName
        return {
          logicalName,
          displayName,
          displayText: `${displayName} (${logicalName})`
        }
      })
    
    return entityInfos.sort((a, b) => a.displayName.localeCompare(b.displayName))
    
  } catch (error) {
    console.error(`Error getting entities with lookups to ${parentEntityLogicalName}:`, error)
    return []
  }
}

/**
 * Get relationship details between two entities
 */
export async function getRelationshipBetweenEntities(
  parentEntity: string, 
  childEntity: string
): Promise<RelationshipInfo[]> {
  try {
    // Query for OneToMany relationships where parent is referenced and child is referencing
    const url = `/api/data/v9.2/RelationshipDefinitions/Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata?$filter=ReferencedEntity eq '${parentEntity}' and ReferencingEntity eq '${childEntity}'&$select=SchemaName,ReferencingEntity,ReferencedEntity,ReferencingAttribute,ReferencedAttribute`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch relationships between ${parentEntity} and ${childEntity}: ${response.status}`)
    }
    
    const data = await response.json()
    
    return data.value.map((relationship: any) => ({
      schemaName: relationship.SchemaName,
      relationshipType: 'OneToMany' as const,
      referencingEntity: relationship.ReferencingEntity,
      referencedEntity: relationship.ReferencedEntity,
      referencingAttribute: relationship.ReferencingAttribute,
      referencedAttribute: relationship.ReferencedAttribute,
      lookupFieldName: relationship.ReferencingAttribute // Use the referencing attribute as lookup field name
    }))
    
  } catch (error) {
    console.error(`Error getting relationships between ${parentEntity} and ${childEntity}:`, error)
    return []
  }
}
