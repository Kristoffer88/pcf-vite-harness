/**
 * Simple manifest reader that works at build/initialization time
 * No runtime fetch needed - reads directly from file system during setup
 */

/**
 * Read manifest from file system (Node.js environment only)
 * This is called during initialization when the environment supports file system access
 */
export function readManifestFromFileSystem(): {
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
} | null {
  // This function only works in Node.js environments (build time, server-side)
  if (typeof window !== 'undefined') {
    console.log('🌐 Browser environment detected - cannot read manifest from filesystem directly')
    return null
  }

  try {
    const fs = require('fs')
    const path = require('path')

    // Common paths where ControlManifest.Input.xml might be located
    const possiblePaths = [
      path.resolve(process.cwd(), 'ControlManifest.Input.xml'),
      path.resolve(process.cwd(), 'dataset/ControlManifest.Input.xml'),
      path.resolve(process.cwd(), '../dataset/ControlManifest.Input.xml'),
      path.resolve(process.cwd(), 'src/ControlManifest.Input.xml'),
      path.resolve(process.cwd(), 'control/ControlManifest.Input.xml'),
    ]

    // Try built output locations as well
    const builtPaths = [
      path.resolve(process.cwd(), 'out/controls/dataset/ControlManifest.xml'),
      path.resolve(process.cwd(), 'out/controls/control/ControlManifest.xml'),
      path.resolve(process.cwd(), '../out/controls/dataset/ControlManifest.xml'),
    ]

    const allPaths = [...possiblePaths, ...builtPaths]

    for (const filePath of allPaths) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8')
          console.log(`📄 Found manifest file at ${filePath}`)
          console.log(`📄 File content preview:`, content.substring(0, 200) + '...')
          const manifest = parseManifestXml(content)
          if (manifest) {
            console.log(`✅ Successfully parsed manifest from ${filePath}:`, manifest)
            return manifest
          } else {
            console.log(`❌ Failed to parse manifest from ${filePath}`)
          }
        }
      } catch (error) {
        continue
      }
    }

    console.log('📝 No manifest file found in any of the searched paths:', allPaths)
    return null
  } catch (error) {
    console.warn('Error reading manifest from file system:', error)
    return null
  }
}

/**
 * Parse manifest XML content to extract key information
 */
function parseManifestXml(xmlContent: string): {
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
} | null {
  try {
    // Extract control element attributes
    const controlMatch = xmlContent.match(/<control[^>]*>/i)
    if (!controlMatch) return null

    const controlElement = controlMatch[0]

    // Extract attributes using regex
    const namespaceMatch = controlElement.match(/namespace=["']([^"']+)["']/i)
    const constructorMatch = controlElement.match(/constructor=["']([^"']+)["']/i)
    const versionMatch = controlElement.match(/version=["']([^"']+)["']/i)
    const displayNameMatch = controlElement.match(/display-name-key=["']([^"']+)["']/i)
    const descriptionMatch = controlElement.match(/description-key=["']([^"']+)["']/i)

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
 * Enhanced detection that tries file system first, then falls back to class name
 */
export function detectManifestInfo(
  pcfClass: new () => ComponentFramework.StandardControl<any, any>
): {
  namespace: string
  constructor: string
  version: string
  displayName?: string
  description?: string
} {
  // Try file system first (works in Node.js environments)
  const fileSystemManifest = readManifestFromFileSystem()
  if (fileSystemManifest) {
    return fileSystemManifest
  }

  // Fall back to class name detection
  const className = pcfClass.name
  console.log(`📝 No manifest file found, falling back to class name detection: ${className}`)

  // Try to intelligently parse the class name
  let namespace = 'default'
  let constructor = className.toLowerCase()

  // Check for underscore pattern (e.g., "test_dataset") 
  if (className.includes('_')) {
    const parts = className.split('_')
    namespace = parts[0] || 'default'
    constructor = parts.slice(1).join('_') || className
  }
  // Check for camelCase pattern (e.g., "TestDataset")
  else if (/^[A-Z][a-z]+[A-Z]/.test(className)) {
    // Split on capital letters, keeping the first part as namespace
    const matches = className.match(/^([A-Z][a-z]+)(.+)$/)
    if (matches) {
      namespace = matches[1]!.toLowerCase()
      constructor = matches[2]!.toLowerCase()
    }
  }

  return {
    namespace,
    constructor,
    version: '1.0.0',
    displayName: constructor,
    description: `${constructor} PCF Control`,
  }
}