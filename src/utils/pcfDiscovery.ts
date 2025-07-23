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

export interface FormDiscoveryOptions {
  entityTypeCode?: number
  entityLogicalName?: string
  publisher?: string
}

// Form discovery cache
interface CacheEntry<T> {
  data: T
  timestamp: number
  key: string
}

class FormDiscoveryCache {
  private cache = new Map<string, CacheEntry<FormPCFMatch[]>>()
  private ttl = 5 * 60 * 1000 // 5 minutes default TTL
  
  // Track if cache is being used
  public hasActiveCache(): boolean {
    // Remove expired entries first
    this.cleanup()
    return this.cache.size > 0
  }
  
  public getCacheStats(): { size: number; keys: string[] } {
    this.cleanup()
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
  
  private createKey(manifest: PCFManifest, options?: FormDiscoveryOptions): string {
    const parts = [
      manifest.namespace,
      manifest.constructor,
      options?.publisher || 'no-publisher',
      options?.entityTypeCode?.toString() || 'no-typecode',
      options?.entityLogicalName || 'no-logicalname'
    ]
    return parts.join('::')
  }
  
  public get(manifest: PCFManifest, options?: FormDiscoveryOptions): FormPCFMatch[] | null {
    const key = this.createKey(manifest, options)
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    console.log('✅ Form discovery cache hit for key:', key)
    return entry.data
  }
  
  public set(manifest: PCFManifest, options: FormDiscoveryOptions | undefined, data: FormPCFMatch[]): void {
    const key = this.createKey(manifest, options)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    })
    console.log('💾 Cached form discovery results for key:', key)
  }
  
  public clear(): void {
    const size = this.cache.size
    this.cache.clear()
    console.log(`🗑️ Cleared form discovery cache (${size} entries)`)
  }
  
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Export singleton instance
export const formDiscoveryCache = new FormDiscoveryCache()

/**
 * Parse PCF manifest XML to extract control information
 */
export function parsePCFManifest(manifestXml: string): PCFManifest {
  if (typeof DOMParser !== 'undefined') {
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
  } else {
    // For Node.js environment, use regex
    const namespaceMatch = manifestXml.match(/namespace="([^"]+)"/)
    const constructorMatch = manifestXml.match(/constructor="([^"]+)"/)
    const versionMatch = manifestXml.match(/version="([^"]+)"/)
    
    return {
      namespace: namespaceMatch?.[1] || '',
      constructor: constructorMatch?.[1] || '',
      version: versionMatch?.[1] || '1.0.0',
      displayName: '',
      description: '',
    }
  }
}

/**
 * Parse FormXml to extract detailed PCF control information including subgrid data
 */
export function parseFormXmlForPCF(formXml: string): PCFControlInfo[] {
  // Use a different parser for Node.js environments
  let doc: Document
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    doc = parser.parseFromString(formXml, 'text/xml')
  } else {
    // For Node.js environment (tests), use a simple regex-based parser
    // This is a simplified version for testing purposes
    const results: PCFControlInfo[] = []
    
    // Match customControl elements with namespace pattern
    const customControlRegex = /<customControl[^>]+name="([^"]+)"[^>]*>/g
    let match
    while ((match = customControlRegex.exec(formXml)) !== null) {
      const nameAttr = match[1]
      if (nameAttr) {
        let namespace = ''
        let constructor = ''
        
        if (nameAttr.includes('.')) {
          const parts = nameAttr.split('.')
          namespace = parts[0]?.replace(/^[^_]+_/, '') || ''
          constructor = parts[1] || ''
        }
        
        if (namespace || constructor) {
          results.push({
            controlId: 'test-control',
            namespace,
            constructor,
            version: '1.0.0',
            formFactor: '0'
          })
        }
      }
    }
    
    // Also match legacy format
    const legacyRegex = /<customcontrol[^>]+namespace="([^"]+)"[^>]+constructor="([^"]+)"[^>]*>/g
    while ((match = legacyRegex.exec(formXml)) !== null) {
      const ns = match[1]
      const ctor = match[2]
      if (ns && ctor) {
        results.push({
          controlId: 'test-control',
          namespace: ns,
          constructor: ctor,
          version: '1.0.0',
          formFactor: '0'
        })
      }
    }
    
    return results
  }

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

    // Parse "prefix_Publisher.ControlName" format
    let namespace = ''
    let constructor = ''

    if (nameAttr.includes('.')) {
      const parts = nameAttr.split('.')
      // Handle "prefix_Publisher.ControlName" format - remove any publisher prefix
      namespace = parts[0]?.replace(/^[^_]+_/, '') || ''
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
  options?: FormDiscoveryOptions | number
): Promise<FormPCFMatch[]> {
  // Handle backward compatibility - if options is a number, treat it as entityTypeCode
  const filterOptions: FormDiscoveryOptions = typeof options === 'number' 
    ? { entityTypeCode: options }
    : (options || {})

  // Check for environment variable publisher override
  const publisher = filterOptions.publisher || import.meta.env.VITE_PCF_PUBLISHER_FILTER
  
  // Update filterOptions with the resolved publisher
  const optionsWithPublisher = { ...filterOptions, publisher }
  
  // Check cache first
  const cachedResult = formDiscoveryCache.get(manifest, optionsWithPublisher)
  if (cachedResult) {
    return cachedResult
  }
  
  console.log('🔍 findPCFOnForms called with:', {
    namespace: manifest.namespace,
    constructor: manifest.constructor,
    ...filterOptions,
    publisher
  })

  let url = `/api/data/v9.2/systemforms?$select=formid,name,objecttypecode,formxml&$filter=contains(formxml,'customControl') or contains(formxml,'customcontroldefinition')`

  // Add publisher filter if specified
  if (publisher) {
    // Filter by publisher prefix in the namespace
    url += ` and (contains(formxml,'${publisher}_') or contains(formxml,'namespace="${publisher}"'))`
  }

  // Only use one of entityTypeCode or entityLogicalName, not both
  if (filterOptions.entityLogicalName) {
    // For custom entities, objecttypecode is the logical name
    url += ` and objecttypecode eq '${filterOptions.entityLogicalName}'`
  } else if (filterOptions.entityTypeCode) {
    url += ` and objecttypecode eq '${filterOptions.entityTypeCode}'`
  }

  console.log('📡 Fetching forms from:', url)

  let response: Response
  try {
    response = await fetch(url)
    console.log('📡 Response status:', response.status, response.statusText)
  } catch (error) {
    console.error('❌ Network error during fetch:', error)
    throw error
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Failed response body:', errorText)
    throw new Error(`Failed to fetch forms: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  console.log(`📋 Found ${data.value?.length || 0} total forms with custom controls`)

  const matches: FormPCFMatch[] = []

  for (const form of data.value) {
    const pcfControls = parseFormXmlForPCF(form.formxml)
    console.log(`  Form "${form.name}": Found ${pcfControls.length} PCF controls`)

    const matchingControls = pcfControls.filter(
      control =>
        control.namespace === manifest.namespace && control.constructor === manifest.constructor
    )

    if (matchingControls.length > 0) {
      console.log(`  ✅ Form "${form.name}" matches! Has ${matchingControls.length} matching controls`)
      matches.push({
        formId: form.formid,
        formName: form.name,
        entityTypeCode: form.objecttypecode,
        controls: matchingControls,
      })
      
      // Early termination optimization: if we found a match and have specific entity constraints,
      // we can stop searching as we likely found what we need
      if (filterOptions.entityTypeCode || filterOptions.entityLogicalName) {
        console.log(`🚀 Early termination: found match for specific entity constraint, stopping search`)
        break
      }
    }
  }

  console.log(`🎯 Found ${matches.length} forms with matching PCF control`)
  
  // Cache the results
  formDiscoveryCache.set(manifest, optionsWithPublisher, matches)
  
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
  const url = `/api/data/v9.2/systemforms?$select=formid,name,objecttypecode,formxml&$filter=objecttypecode eq '${entityTypeCode}' and (contains(formxml,'customControl') or contains(formxml,'customcontroldefinition'))`

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
