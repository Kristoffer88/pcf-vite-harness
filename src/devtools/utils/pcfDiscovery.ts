/**
 * PCF Discovery Tool
 *
 * Functions to discover and analyze PCF controls on Dataverse forms,
 * including subgrid views, target entities, and relationship information.
 */

export interface PCFManifest {
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
}

export interface PCFControlInfo {
  controlId: string
  namespace: string
  constructor: string
  version: string
  formFactor: string
  // Subgrid/Dataset information
  dataSet?: {
    name: string
    viewId?: string
    isUserView?: boolean
    targetEntityType?: string
    relationshipName?: string
    enableViewPicker?: boolean
    filteredViewIds?: string[]
  }
  // Other parameters
  parameters?: Record<string, unknown>
}

export interface FormPCFMatch {
  formId: string
  formName: string
  entityTypeCode: number
  entityLogicalName?: string
  controls: PCFControlInfo[]
}

/**
 * Parse PCF manifest XML to extract control information
 */
export function parsePCFManifest(manifestXml: string): PCFManifest {
  const parser = new DOMParser()
  const doc = parser.parseFromString(manifestXml, 'text/xml')

  const controlElement = doc.querySelector('control')
  if (!controlElement) {
    throw new Error('Invalid PCF manifest: control element not found')
  }

  return {
    namespace: controlElement.getAttribute('namespace') || '',
    constructor: controlElement.getAttribute('constructor') || '',
    version: controlElement.getAttribute('version') || '',
    displayName: controlElement.getAttribute('display-name-key') || '',
    description: controlElement.getAttribute('description-key') || '',
  }
}

/**
 * Parse FormXml to extract detailed PCF control information including subgrid data
 */
export function parseFormXmlForPCF(formXml: string): PCFControlInfo[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(formXml, 'text/xml')

  // Look for both patterns: <customcontrol> and <customControl>
  const customControlsLower = doc.querySelectorAll('customcontrol')
  const customControlsUpper = doc.querySelectorAll('customControl')
  const results: PCFControlInfo[] = []

  // Handle legacy format: <customcontrol namespace="..." constructor="...">
  customControlsLower.forEach(control => {
    const controlElement = control.closest('control')
    const controlId = controlElement?.getAttribute('id') || ''

    const pcfInfo: PCFControlInfo = {
      controlId,
      namespace: control.getAttribute('namespace') || '',
      constructor: control.getAttribute('constructor') || '',
      version: control.getAttribute('version') || '',
      formFactor: '0',
    }

    results.push(pcfInfo)
  })

  // Handle new format: <customControl name="namespace.constructor">
  customControlsUpper.forEach(control => {
    const controlElement = control.closest('control')
    const controlId = controlElement?.getAttribute('id') || ''
    const nameAttr = control.getAttribute('name') || ''
    const formFactor = control.getAttribute('formFactor') || '0'

    // Parse namespace.constructor format (e.g., "MyNamespace.MyControl")
    let namespace = ''
    let constructor = ''

    if (nameAttr.includes('.')) {
      const parts = nameAttr.split('.')
      // Handle various namespace patterns - remove common prefixes if present
      const rawNamespace = parts[0] || ''
      // Remove common prefixes like publisher prefixes (e.g., "pub_", "new_", etc.)
      namespace = rawNamespace.replace(/^[a-z]+_/, '') || rawNamespace
      constructor = parts[1] || ''
    } else if (nameAttr) {
      constructor = nameAttr
    }

    if (namespace || constructor) {
      const pcfInfo: PCFControlInfo = {
        controlId,
        namespace,
        constructor,
        version: control.getAttribute('version') || '',
        formFactor,
      }

      // Extract subgrid/dataset information
      const parametersElement = control.querySelector('parameters')
      if (parametersElement) {
        const dataSetElement = parametersElement.querySelector('data-set')
        if (dataSetElement) {
          pcfInfo.dataSet = {
            name: dataSetElement.getAttribute('name') || '',
            viewId: getElementText(dataSetElement, 'ViewId'),
            isUserView: getElementText(dataSetElement, 'IsUserView') === 'true',
            targetEntityType: getElementText(dataSetElement, 'TargetEntityType'),
            relationshipName: getElementText(dataSetElement, 'RelationshipName'),
            enableViewPicker: getElementText(dataSetElement, 'EnableViewPicker') === 'true',
            filteredViewIds:
              getElementText(dataSetElement, 'FilteredViewIds')
                ?.split(',')
                .filter(id => id.trim()) || [],
          }
        }

        // Extract other parameters
        pcfInfo.parameters = extractParameters(parametersElement)
      }

      results.push(pcfInfo)
    }
  })

  return results
}

/**
 * Helper function to get text content from XML element
 */
function getElementText(parent: Element, tagName: string): string | undefined {
  const element = parent.querySelector(tagName)
  return element?.textContent?.trim() || undefined
}

/**
 * Extract all parameters from parameters element
 */
function extractParameters(parametersElement: Element): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  parametersElement.childNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName

      if (tagName !== 'data-set') {
        // Skip data-set as it's handled separately
        params[tagName] = element.textContent?.trim() || element.outerHTML
      }
    }
  })

  return params
}

/**
 * Find all forms containing the specified PCF control
 */
export async function findPCFOnForms(
  manifest: PCFManifest,
  entityTypeCode?: number
): Promise<FormPCFMatch[]> {
  console.log('🔎 Starting PCF discovery with manifest:', manifest, 'entityTypeCode:', entityTypeCode)
  let url = `/api/data/v9.2/systemforms?$select=formid,name,objecttypecode,formxml&$filter=contains(formxml,'customControl') or contains(formxml,'customcontroldefinition')`

  if (entityTypeCode) {
    url += ` and objecttypecode eq ${entityTypeCode}`
  }

  console.log('🌐 Fetching forms with URL:', url)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch forms: ${response.status}`)
  }

  const data = await response.json()
  console.log(`📊 Found ${data.value?.length || 0} forms with custom controls`)
  const matches: FormPCFMatch[] = []

  for (const form of data.value) {
    console.log(`🔍 Analyzing form: ${form.name} (${form.formid})`)
    const pcfControls = parseFormXmlForPCF(form.formxml)
    console.log(`   Found ${pcfControls.length} PCF controls:`, pcfControls.map(c => `${c.namespace}.${c.constructor}`))

    const matchingControls = pcfControls.filter(
      control =>
        control.namespace === manifest.namespace && control.constructor === manifest.constructor
    )
    
    if (pcfControls.length > 0 && matchingControls.length === 0) {
      console.log(`   ❌ No matches for ${manifest.namespace}.${manifest.constructor}`)
    }

    if (matchingControls.length > 0) {
      console.log(`   ✅ Found ${matchingControls.length} matching controls!`)
      matches.push({
        formId: form.formid,
        formName: form.name,
        entityTypeCode: form.objecttypecode,
        controls: matchingControls,
      })
    }
  }

  return matches
}

/**
 * Find all PCF controls on a specific form
 */
export async function getPCFControlsOnForm(formId: string): Promise<PCFControlInfo[]> {
  const response = await fetch(`/api/data/v9.2/systemforms(${formId})?$select=formxml`)

  if (!response.ok) {
    throw new Error(`Failed to fetch form ${formId}: ${response.status}`)
  }

  const data = await response.json()
  return parseFormXmlForPCF(data.formxml)
}

/**
 * Get all forms for a specific entity that contain PCF controls
 */
export async function getPCFFormsForEntity(entityTypeCode: number): Promise<FormPCFMatch[]> {
  const url = `/api/data/v9.2/systemforms?$select=formid,name,objecttypecode,formxml&$filter=objecttypecode eq ${entityTypeCode} and (contains(formxml,'customControl') or contains(formxml,'customcontroldefinition'))`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch forms for entity ${entityTypeCode}: ${response.status}`)
  }

  const data = await response.json()
  const results: FormPCFMatch[] = []

  for (const form of data.value) {
    const pcfControls = parseFormXmlForPCF(form.formxml)

    if (pcfControls.length > 0) {
      results.push({
        formId: form.formid,
        formName: form.name,
        entityTypeCode: form.objecttypecode,
        controls: pcfControls,
      })
    }
  }

  return results
}

/**
 * Analyze a PCF control's subgrid configuration
 */
export function analyzePCFSubgridConfig(control: PCFControlInfo): {
  hasSubgrid: boolean
  targetEntity?: string
  isRelated: boolean
  relationshipName?: string
  viewId?: string
  isCustomView: boolean
  allowViewSelection: boolean
} {
  if (!control.dataSet) {
    return {
      hasSubgrid: false,
      isRelated: false,
      isCustomView: false,
      allowViewSelection: false,
    }
  }

  const dataset = control.dataSet

  return {
    hasSubgrid: true,
    targetEntity: dataset.targetEntityType,
    isRelated: Boolean(dataset.relationshipName?.trim()),
    relationshipName: dataset.relationshipName,
    viewId: dataset.viewId,
    isCustomView: dataset.isUserView || false,
    allowViewSelection: dataset.enableViewPicker || false,
  }
}

/**
 * Get entity type code mapping (common entities)
 */
export const ENTITY_TYPE_CODES = {
  ACCOUNT: 1,
  CONTACT: 2,
  OPPORTUNITY: 3,
  LEAD: 4,
  CASE: 112,
  USER: 8,
  TEAM: 9,
} as const

export type EntityTypeCode = (typeof ENTITY_TYPE_CODES)[keyof typeof ENTITY_TYPE_CODES]
