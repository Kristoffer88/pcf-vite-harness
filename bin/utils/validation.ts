/**
 * Validation utilities for PCF Vite Harness
 * Includes URL validation and other common validation patterns
 */

export interface ValidationResult {
  isValid: boolean
  message?: string
}

/**
 * Validate Dataverse URL format
 */
export function validateDataverseUrl(url: string): ValidationResult {
  if (!url) {
    return { isValid: false, message: 'URL cannot be empty' }
  }

  try {
    const parsedUrl = new URL(url)
    
    // Must be HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return { isValid: false, message: 'URL must use HTTPS protocol' }
    }

    // Must be a Dataverse domain pattern
    const hostname = parsedUrl.hostname.toLowerCase()
    const validPatterns = [
      /\.crm\d*\.dynamics\.com$/,
      /\.crm\d*\.microsoftdynamics\.com$/,
      /\.crm\d*\.dynamics\.cn$/,
      /\.crm\d*\.microsoftdynamics\.de$/,
      /\.crm\d*\.microsoftdynamics\.us$/
    ]

    const isValidDomain = validPatterns.some(pattern => pattern.test(hostname))
    if (!isValidDomain) {
      return { 
        isValid: false, 
        message: 'URL must be a valid Dataverse instance (e.g., https://yourorg.crm.dynamics.com)' 
      }
    }

    return { isValid: true }
  } catch {
    return { isValid: false, message: 'Invalid URL format' }
  }
}

/**
 * Validate port number range
 */
export function validatePort(port: string | number): ValidationResult {
  const portNum = typeof port === 'string' ? Number.parseInt(port) : port
  
  if (isNaN(portNum) || portNum <= 0 || portNum >= 65536) {
    return { isValid: false, message: 'Port must be between 1 and 65535' }
  }
  
  return { isValid: true }
}

/**
 * Validate PCF component name
 */
export function validateComponentName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: false, message: 'Component name cannot be empty' }
  }
  
  // PCF component names should be valid identifiers
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name.trim())) {
    return { 
      isValid: false, 
      message: 'Component name must start with a letter and contain only letters and numbers' 
    }
  }
  
  return { isValid: true }
}

/**
 * Validate PCF namespace
 */
export function validateNamespace(namespace: string): ValidationResult {
  if (!namespace || !namespace.trim()) {
    return { isValid: false, message: 'Namespace cannot be empty' }
  }
  
  // Namespace should be valid identifier
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(namespace.trim())) {
    return { 
      isValid: false, 
      message: 'Namespace must start with a letter and contain only letters and numbers' 
    }
  }
  
  return { isValid: true }
}