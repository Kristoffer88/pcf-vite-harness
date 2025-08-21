/**
 * Environment Variable Validation
 * Checks for required PCF environment variables and redirects to setup if missing
 */

export interface RequiredEnvVars {
  VITE_PCF_PAGE_TABLE?: string
  VITE_PCF_TARGET_TABLE?: string
}

/**
 * Check if required environment variables are present
 */
export function checkRequiredEnvVars(): { isValid: boolean; missing: string[] } {
  const required = ['VITE_PCF_TARGET_TABLE']
  const missing: string[] = []

  for (const varName of required) {
    const value = import.meta.env[varName]
    if (!value || value.trim() === '') {
      missing.push(varName)
    }
  }

  const isValid = missing.length === 0

  console.log('🔍 Environment variable validation:', {
    required,
    missing,
    isValid,
    currentValues: {
      VITE_PCF_PAGE_TABLE: import.meta.env.VITE_PCF_PAGE_TABLE,
      VITE_PCF_TARGET_TABLE: import.meta.env.VITE_PCF_TARGET_TABLE
    }
  })

  return { isValid, missing }
}

/**
 * Redirect to setup if required environment variables are missing
 * Only applies to dataset components - field components don't need setup
 */
export function redirectToSetupIfNeeded(componentType: 'dataset' | 'field' = 'field'): boolean {
  // Don't redirect if already on setup route
  if (window.location.pathname === '/setup') {
    return false
  }

  // Field components don't need setup - only dataset components do
  if (componentType === 'field') {
    console.log('🔧 Field component detected - skipping setup wizard')
    return false
  }

  const { isValid, missing } = checkRequiredEnvVars()
  
  if (!isValid) {
    console.log(`⚠️ Missing required environment variables: ${missing.join(', ')}`)
    console.log('🔄 Redirecting to setup wizard...')
    
    // Use replace to avoid back button issues, then reload
    window.history.replaceState(null, '', '/setup')
    window.location.reload()
    return true
  }

  return false
}