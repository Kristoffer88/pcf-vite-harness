/**
 * Dataset Metadata Fetcher
 * Utilities for fetching view and column metadata from Dataverse
 */

import { XMLParser } from 'fast-xml-parser'

export interface ViewColumn {
  name: string
  displayName: string
  width: number
  order: number
}

export interface ViewMetadata {
  viewId: string
  viewName: string
  entityName: string
  columns: ViewColumn[]
  fetchXml: string
  layoutXml: string
}

export interface SubgridMetadata {
  controlId: string
  viewId: string
  entityName: string
  viewSelector?: boolean
  defaultView?: string
}

export interface AttributeMetadata {
  logicalName: string
  displayName: string
  attributeType: string
  isPrimaryId: boolean
  isPrimaryName: boolean
  dataType?: string
  targets?: string[] // For lookups
}

/**
 * Fetch subgrid metadata from form definition
 */
export async function fetchSubgridMetadata(
  formId: string,
  entityName: string
): Promise<SubgridMetadata[]> {
  const url = `/api/data/v9.1/systemforms(${formId})?$select=formxml`
  const response = await fetch(url)
  const data = await response.json()

  if (!data.formxml) {
    throw new Error('No form XML found')
  }

  // Parse formxml to extract subgrid controls
  const subgrids: SubgridMetadata[] = []
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })
  const parsedForm = parser.parse(data.formxml)

  // Navigate through the parsed XML structure to find subgrid controls
  // This is a simplified version - real implementation would need to handle the full form structure
  const findControls = (obj: any): void => {
    if (obj.control && obj.control['@_classid'] === '{E7A81278-8635-4D9E-8D4D-59480B391C5B}') {
      const controlId = obj.control['@_id'] || ''
      const parameters = obj.control.parameters || {}
      
      subgrids.push({
        controlId,
        viewId: parameters.ViewId || parameters.DefaultViewId || '',
        entityName: parameters.TargetEntity || '',
        viewSelector: parameters.ViewSelector === 'true',
        defaultView: parameters.DefaultViewId || '',
      })
    }
    
    // Recursively search for controls
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        findControls(obj[key])
      }
    }
  }
  
  findControls(parsedForm)

  return subgrids
}

/**
 * Fetch view metadata including columns
 */
export async function fetchViewMetadata(viewId: string): Promise<ViewMetadata> {
  // Try savedquery first (system view)
  let url = `/api/data/v9.1/savedqueries(${viewId})?$select=savedqueryid,name,returnedtypecode,fetchxml,layoutxml`
  let response = await fetch(url)
  
  if (!response.ok) {
    // Try userquery (personal view)
    url = `/api/data/v9.1/userqueries(${viewId})?$select=userqueryid,name,returnedtypecode,fetchxml,layoutxml`
    response = await fetch(url)
  }

  if (!response.ok) {
    throw new Error(`View ${viewId} not found`)
  }

  const view = await response.json()
  const columns = parseLayoutXml(view.layoutxml)

  return {
    viewId: view.savedqueryid || view.userqueryid,
    viewName: view.name,
    entityName: view.returnedtypecode,
    columns,
    fetchXml: view.fetchxml,
    layoutXml: view.layoutxml,
  }
}

/**
 * Parse layoutxml to extract column information
 */
function parseLayoutXml(layoutXml: string): ViewColumn[] {
  const columns: ViewColumn[] = []
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })
  
  const parsed = parser.parse(layoutXml)
  
  // Navigate to the cells in the layout
  const cells = parsed?.grid?.row?.cell || []
  const cellArray = Array.isArray(cells) ? cells : [cells]
  
  cellArray.forEach((cell: any, index: number) => {
    if (cell && cell['@_name']) {
      const name = cell['@_name']
      const width = parseInt(cell['@_width'] || '100')
      
      // Get display name from label if available
      const displayName = cell.label?.['@_description'] || formatDisplayName(name)
      
      columns.push({
        name,
        displayName,
        width,
        order: index,
      })
    }
  })
  
  return columns
}

/**
 * Fetch entity attribute metadata
 */
export async function fetchAttributeMetadata(
  entityName: string,
  attributeNames: string[]
): Promise<Map<string, AttributeMetadata>> {
  const attributeMap = new Map<string, AttributeMetadata>()

  // Fetch all attributes for the entity
  const url = `/api/data/v9.1/EntityDefinitions(LogicalName='${entityName}')/Attributes?$select=LogicalName,DisplayName,AttributeType,IsPrimaryId,IsPrimaryName`
  const response = await fetch(url)
  const data = await response.json()

  if (data.value) {
    for (const attr of data.value) {
      if (attributeNames.includes(attr.LogicalName)) {
        attributeMap.set(attr.LogicalName, {
          logicalName: attr.LogicalName,
          displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
          attributeType: attr.AttributeType,
          isPrimaryId: attr.IsPrimaryId || false,
          isPrimaryName: attr.IsPrimaryName || false,
          dataType: mapAttributeTypeToPCFDataType(attr.AttributeType, attr),
        })
      }
    }
  }

  // Fetch additional metadata for specific attribute types
  for (const attrName of attributeNames) {
    const attr = attributeMap.get(attrName)
    if (attr && (attr.attributeType === 'Lookup' || attr.attributeType === 'Customer' || attr.attributeType === 'Owner')) {
      // Fetch lookup targets
      const lookupUrl = `/api/data/v9.1/EntityDefinitions(LogicalName='${entityName}')/Attributes(LogicalName='${attrName}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets`
      try {
        const lookupResponse = await fetch(lookupUrl)
        if (lookupResponse.ok) {
          const lookupData = await lookupResponse.json()
          attr.targets = lookupData.Targets
        }
      } catch (e) {
        console.warn(`Failed to fetch lookup metadata for ${attrName}`)
      }
    }
  }

  return attributeMap
}

/**
 * Map Dataverse attribute type to PCF data type
 */
function mapAttributeTypeToPCFDataType(attributeType: string, metadata: any): string {
  const typeMap: Record<string, string> = {
    String: 'SingleLine.Text',
    Memo: 'Multiple',
    Integer: 'Whole.None',
    BigInt: 'Whole.None',
    Double: 'Decimal',
    Decimal: 'Decimal',
    Money: 'Currency',
    Boolean: 'TwoOptions',
    DateTime: 'DateAndTime.DateAndTime',
    Picklist: 'OptionSet',
    State: 'OptionSet',
    Status: 'OptionSet',
    Lookup: 'Lookup.Simple',
    Customer: 'Lookup.Customer',
    Owner: 'Lookup.Owner',
    Uniqueidentifier: 'SingleLine.Text',
    Virtual: 'SingleLine.Text',
    MultiSelectPicklist: 'MultiSelectPicklist',
  }

  // Special handling for duration fields
  if (attributeType === 'Integer' && metadata.LogicalName?.includes('duration')) {
    return 'Whole.Duration'
  }

  // Special handling for multiselect fields that might be virtual
  if (attributeType === 'Virtual' && metadata.LogicalName?.includes('multiselect')) {
    return 'MultiSelectPicklist'
  }

  return typeMap[attributeType] || 'SingleLine.Text'
}

/**
 * Format attribute name to display name
 */
function formatDisplayName(attributeName: string): string {
  return attributeName
    .replace(/^[a-z]+_/, '') // Remove prefix
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}

/**
 * Build complete column metadata by combining view columns with attribute metadata
 */
export async function buildDatasetColumns(
  viewMetadata: ViewMetadata,
  attributeMetadata: Map<string, AttributeMetadata>
): Promise<any[]> {
  const columns: any[] = []

  for (const viewColumn of viewMetadata.columns) {
    const attrMeta = attributeMetadata.get(viewColumn.name)
    
    const column = {
      name: viewColumn.name,
      displayName: viewColumn.displayName,
      dataType: attrMeta?.dataType || 'SingleLine.Text',
      alias: viewColumn.name,
      order: viewColumn.order,
      visualSizeFactor: Math.round(viewColumn.width / 100) * 100 || 100,
      isHidden: false,
      imageProviderWebresource: '',
      imageProviderFunctionName: '',
      isPrimary: attrMeta?.isPrimaryName || false,
      cellType: '',
      disableSorting: false,
      type: mapPCFDataTypeToSimpleType(attrMeta?.dataType || 'SingleLine.Text', viewColumn.name),
    }

    columns.push(column)
  }

  return columns
}

/**
 * Map PCF data type to simple type used in records
 */
function mapPCFDataTypeToSimpleType(pcfDataType: string, attributeName?: string): string {
  const typeMap: Record<string, string> = {
    'SingleLine.Text': 'string',
    'Multiple': 'string',
    'Whole.None': 'integer',
    'Whole.Duration': 'integer',
    'Decimal': 'decimal',
    'Currency': 'money',
    'TwoOptions': 'boolean',
    'DateAndTime.DateAndTime': 'datetime',
    'OptionSet': 'picklist',
    'Lookup.Simple': 'lookup',
    'Lookup.Customer': 'customer',
    'Lookup.Owner': 'owner',
    'MultiSelectPicklist': 'multiselectpicklist',
  }

  // Special handling for state fields
  if (attributeName === 'statecode') {
    return 'state'
  }

  return typeMap[pcfDataType] || 'string'
}