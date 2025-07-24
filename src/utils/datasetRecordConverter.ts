/**
 * Dataset Record Converter
 * Converts WebAPI entities to proper PCF dataset records
 */

interface DataverseEntity {
  [key: string]: any
}

interface EntityMetadataInfo {
  LogicalName: string
  PrimaryIdAttribute: string
  PrimaryNameAttribute: string
}

interface DatasetRecord {
  _record: {
    initialized: number
    identifier: {
      etn: string
      id: {
        guid: string
      }
    }
    fields: Record<string, any>
  }
  _columnAliasNameMap: Record<string, string>
  _primaryFieldName: string
  _isDirty: boolean
  _entityReference: {
    _etn: string
    _id: string
    _name: string
  }
  [key: string]: any
}

interface DatasetFieldValue {
  value: any
  timestamp: string
  validationResult: {
    errorId: null
    errorMessage: null
    isValueValid: boolean
    userInput: null
    isOfflineSyncError: boolean
  }
}

const FORMATTED_VALUE_SUFFIX = '@OData.Community.Display.V1.FormattedValue'

/**
 * Fetch entity metadata using direct API call
 */
async function fetchEntityMetadata(entityLogicalName: string): Promise<EntityMetadataInfo> {
  try {
    const url = `/api/data/v9.1/EntityDefinitions(LogicalName='${entityLogicalName}')?$select=LogicalName,PrimaryIdAttribute,PrimaryNameAttribute`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data as EntityMetadataInfo
  } catch (error) {
    throw new Error(`Failed to fetch metadata for entity ${entityLogicalName}: ${error}`)
  }
}

/**
 * Get primary key value from entity
 */
function getEntityPrimaryKey(entity: DataverseEntity, metadata: EntityMetadataInfo): string | null {
  return entity[metadata.PrimaryIdAttribute] || null
}

/**
 * Get primary name value from entity
 */
function getEntityPrimaryName(entity: DataverseEntity, metadata: EntityMetadataInfo): string {
  const primaryName = entity[metadata.PrimaryNameAttribute]
  if (primaryName) return primaryName

  // Fallback to common name fields
  return entity.name || entity.fullname || entity.title || `Record ${entity[metadata.PrimaryIdAttribute] || 'Unknown'}`
}

/**
 * Convert single entity to PCF dataset record
 */
async function convertEntityToRecord(
  entity: DataverseEntity,
  metadata: EntityMetadataInfo,
  webAPI?: ComponentFramework.WebApi
): Promise<DatasetRecord> {
  // Get primary key and name from metadata
  const recordId = getEntityPrimaryKey(entity, metadata)
  const primaryName = getEntityPrimaryName(entity, metadata)
  const entityType = metadata.LogicalName
  
  // Create PCF-compatible record structure
  const record: DatasetRecord = {
    _record: {
      initialized: 2,
      identifier: {
        etn: entityType,
        id: {
          guid: recordId || ''
        }
      },
      fields: {} as any
    },
    _columnAliasNameMap: {},
    _primaryFieldName: metadata.PrimaryNameAttribute,
    _isDirty: false,
    _entityReference: {
      _etn: entityType,
      _id: recordId || '',
      _name: primaryName
    }
  }

  // Process fields into the _record.fields structure
  Object.entries(entity).forEach(([key, value]) => {
    // Skip system attributes
    if (key.startsWith('@')) {
      return
    }

    // Create field object
    const field: DatasetFieldValue = {
      value: value,
      timestamp: new Date().toISOString(),
      validationResult: {
        errorId: null,
        errorMessage: null,
        isValueValid: true,
        userInput: null,
        isOfflineSyncError: false
      }
    } as DatasetFieldValue

    // Handle formatted values
    const formattedKey = `${key}${FORMATTED_VALUE_SUFFIX}`
    if (entity[formattedKey]) {
      (field as any).formatted = entity[formattedKey]
    }

    record._record.fields[key] = field
  })

  // Also set fields directly on record for backward compatibility
  record[metadata.PrimaryNameAttribute] = primaryName
  // Only set 'name' field if it's different from the primary name attribute
  if (metadata.PrimaryNameAttribute !== 'name') {
    record.name = primaryName
  }

  return record
}

/**
 * Convert WebAPI entities to dataset records format
 */
export async function convertEntitiesToDatasetRecords(
  entities: DataverseEntity[],
  entityLogicalName: string,
  webAPI?: ComponentFramework.WebApi
): Promise<Record<string, DatasetRecord>> {
  const records: Record<string, DatasetRecord> = {}
  console.log(`🔄 Converting ${entities.length} entities to dataset records`)

  const recordIds = new Set<string>()
  let duplicateCount = 0

  // Get entity metadata
  const entityMetadata = await fetchEntityMetadata(entityLogicalName)

  for (const [index, entity] of entities.entries()) {
    const recordId = getEntityPrimaryKey(entity, entityMetadata)
    
    if (recordId) {
      // Check for duplicates
      if (recordIds.has(recordId)) {
        duplicateCount++
        console.warn(`⚠️ Duplicate record ID found: ${recordId} (entity ${index + 1})`)
      }
      recordIds.add(recordId)
      
      records[recordId] = await convertEntityToRecord(entity, entityMetadata, webAPI)
      if (index < 5) {
        console.log(`✅ Converted entity ${index + 1}: ${entityMetadata.PrimaryIdAttribute} = ${recordId}`)
      }
    } else {
      console.warn(`⚠️ Could not find primary key for entity ${index + 1}:`, Object.keys(entity).slice(0, 10))
    }
  }
  
  // Log primary ID field for debugging
  console.log(`🔑 Using primary ID field: ${entityMetadata.PrimaryIdAttribute} for entity ${entityLogicalName}`)
  
  if (duplicateCount > 0) {
    console.warn(`⚠️ Found ${duplicateCount} duplicate record IDs!`)
  }

  console.log(`✅ Converted ${Object.keys(records).length} records successfully`)
  return records
}