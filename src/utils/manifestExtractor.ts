/**
 * Utility functions for extracting PCF manifest information from various sources
 */

/**
 * Extract manifest information from ControlManifest.Input.xml content
 */
export function extractManifestFromXml(xmlContent: string): {
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
} | null {
  try {
    // Parse basic manifest attributes from XML
    const namespaceMatch = xmlContent.match(/namespace=["']([^"']+)["']/)
    const constructorMatch = xmlContent.match(/constructor=["']([^"']+)["']/)
    const versionMatch = xmlContent.match(/version=["']([^"']+)["']/)
    const displayNameMatch = xmlContent.match(/display-name-key=["']([^"']+)["']/)
    const descriptionMatch = xmlContent.match(/description-key=["']([^"']+)["']/)

    if (!namespaceMatch || !constructorMatch || !versionMatch) {
      return null
    }

    return {
      namespace: namespaceMatch[1]!,
      constructor: constructorMatch[1]!,
      version: versionMatch[1]!,
      displayName: displayNameMatch?.[1],
      description: descriptionMatch?.[1],
    }
  } catch (error) {
    console.error('Error parsing manifest XML:', error)
    return null
  }
}

/**
 * Extract manifest information from the built ControlManifest.xml content
 */
export function extractManifestFromBuiltXml(xmlContent: string): {
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
} | null {
  try {
    // Parse manifest attributes from built XML (slightly different format)
    const namespaceMatch = xmlContent.match(/namespace=["']([^"']+)["']/)
    const constructorMatch = xmlContent.match(/constructor=["']([^"']+)["']/)
    const versionMatch = xmlContent.match(/version=["']([^"']+)["']/)
    const displayNameMatch = xmlContent.match(/display-name-key=["']([^"']+)["']/)
    const descriptionMatch = xmlContent.match(/description-key=["']([^"']+)["']/)

    if (!namespaceMatch || !constructorMatch || !versionMatch) {
      return null
    }

    return {
      namespace: namespaceMatch[1]!,
      constructor: constructorMatch[1]!,
      version: versionMatch[1]!,
      displayName: displayNameMatch?.[1],
      description: descriptionMatch?.[1],
    }
  } catch (error) {
    console.error('Error parsing built manifest XML:', error)
    return null
  }
}

/**
 * Auto-detect manifest information from the current project
 * This function attempts to find and parse ControlManifest.Input.xml files
 */
export async function autoDetectManifest(): Promise<{
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
} | null> {
  try {
    // Common locations where ControlManifest.Input.xml might be found
    const possiblePaths = [
      './ControlManifest.Input.xml',
      './src/ControlManifest.Input.xml',
      './*/ControlManifest.Input.xml',
      './out/controls/*/ControlManifest.xml',
    ]

    // In a browser environment, we can't directly read files
    // This function would need to be adapted based on the environment
    if (typeof window !== 'undefined') {
      console.warn('Auto-detection not supported in browser environment. Please provide manifestInfo manually.')
      return null
    }

    // In Node.js environments (like during build), we could read files
    // But for now, return null to indicate manual configuration is needed
    return null
  } catch (error) {
    console.warn('Error auto-detecting manifest:', error)
    return null
  }
}

/**
 * Extract manifest info from PCF component class name
 * This is a heuristic approach that tries to infer namespace/constructor from the class
 */
export function extractManifestFromComponentClass(
  pcfClass: new () => ComponentFramework.StandardControl<any, any>,
  fallbackNamespace = 'default'
): {
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
} {
  const className = pcfClass.name
  
  // Try to split className if it follows patterns like "NamespaceControlName"
  // This is heuristic and may not always work
  return {
    namespace: fallbackNamespace,
    constructor: className,
    version: '1.0.0',
    displayName: className,
    description: `${className} PCF Control`,
  }
}

/**
 * Create manifest info from the actual test project values
 */
export function createTestProjectManifest(): {
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
} {
  return {
    namespace: 'test',
    constructor: 'dataset',
    version: '0.0.1',
    displayName: 'dataset',
    description: 'dataset description',
  }
}