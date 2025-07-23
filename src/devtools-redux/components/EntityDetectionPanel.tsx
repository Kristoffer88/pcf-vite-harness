/**
 * Entity Detection Panel Component
 * Handles entity detection, form discovery, and manual entity override functionality
 * Extracted from UnifiedDatasetTab for better separation of concerns
 */

import type React from 'react'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { colors, fontSize } from '../styles/theme'
import { 
  findPCFOnForms, 
  formDiscoveryCache,
  type FormPCFMatch,
  ENTITY_TYPE_CODES 
} from '../../utils/pcfDiscovery'
import { clearDiscoveryCache } from '../utils/dataset'

interface EntityDetectionPanelProps {
  currentState: {
    context?: any
    webAPI?: any
    manifest?: any
  }
  datasetAnalysis: {
    datasets: any[]
    totalRecords: number
    summary: string
  }
  // Callbacks to parent
  onEntityChange: (entity: string) => void
  onFormSelect: (form: FormPCFMatch | null) => void
  onDatasetAnalysisTrigger: () => void
  // Current values from parent
  currentEntity: string
}

export const EntityDetectionPanel: React.FC<EntityDetectionPanelProps> = ({
  currentState,
  datasetAnalysis,
  onEntityChange,
  onFormSelect,
  onDatasetAnalysisTrigger,
  currentEntity
}) => {
  // Internal state
  const [manualEntityOverride, setManualEntityOverride] = useState<string>('')
  const [discoveredForms, setDiscoveredForms] = useState<FormPCFMatch[]>([])
  const [isLoadingForms, setIsLoadingForms] = useState<boolean>(false)
  const [selectedForm, setSelectedForm] = useState<FormPCFMatch | null>(null)
  const [formDiscoveryError, setFormDiscoveryError] = useState<string | null>(null)
  const [cacheStats, setCacheStats] = useState<{ active: boolean; size: number }>({ active: false, size: 0 })

  // Refs for preventing duplicate operations
  const formDiscoveryInProgress = useRef<boolean>(false)

  // Cache for entity detection results
  const entityDetectionCache = useRef<Map<string, { result: string; timestamp: number }>>(new Map())
  const ENTITY_DETECTION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  // Memoized entity detection to prevent repeated calculations
  const detectedEntity = useMemo(() => {
    const context = currentState?.context

    if (!context) {
      return 'unknown'
    }

    // Create cache key from relevant context properties
    const cacheKey = JSON.stringify({
      pageEntity: context.page?.entityTypeName,
      manualOverride: manualEntityOverride,
      url: window.location.href,
      datasetCount: datasetAnalysis.datasets.length
    })

    // Check cache first
    const cached = entityDetectionCache.current.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < ENTITY_DETECTION_CACHE_TTL) {
      console.log('✅ Using cached entity detection result:', cached.result)
      return cached.result
    }

    console.log('🔍 Analyzing context for entity detection...', {
      pageEntity: context.page?.entityTypeName,
      datasetEntities: datasetAnalysis.datasets.map(ds => ds.entityLogicalName),
      manualOverride: manualEntityOverride,
      envPageTable: import.meta.env.VITE_PCF_PAGE_TABLE,
      url: window.location.href,
      isDevelopment:
        window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1'),
    })

    // Helper function to cache and return result
    const cacheAndReturn = (result: string) => {
      entityDetectionCache.current.set(cacheKey, {
        result,
        timestamp: Date.now()
      })
      return result
    }

    // Strategy 1: Use page table as currentEntity (for relationship discovery)  
    // The page entity is the parent in parent->child relationships
    const envPageTable = import.meta.env.VITE_PCF_PAGE_TABLE
    if (envPageTable && envPageTable.trim() !== '') {
      console.log(`📋 Using VITE_PCF_PAGE_TABLE for currentEntity: ${envPageTable}`)
      return cacheAndReturn(envPageTable)
    }

    // Strategy 2: If no page table, use target table as currentEntity
    const envTargetTable = import.meta.env.VITE_PCF_TARGET_TABLE  
    if (envTargetTable && envTargetTable.trim() !== '') {
      console.log(`📋 Using VITE_PCF_TARGET_TABLE for currentEntity: ${envTargetTable}`)
      return cacheAndReturn(envTargetTable)
    }

    // Strategy -1: Check for manual entity override (second highest priority)
    if (manualEntityOverride && manualEntityOverride !== '' && manualEntityOverride !== 'auto') {
      console.log(`✅ Entity manually overridden: ${manualEntityOverride}`)
      return cacheAndReturn(manualEntityOverride)
    }

    // Strategy 0: Try context.page.entityTypeName first (most reliable in development and real PowerApps)
    const contextPage = (context as any).page
    if (contextPage?.entityTypeName && contextPage.entityTypeName !== 'systemuser') {
      console.log(`✅ Entity detected from context.page: ${contextPage.entityTypeName}`)
      return cacheAndReturn(contextPage.entityTypeName)
    }

    // Strategy 1: Try to extract from URL first (most reliable for form context in real PowerApps)
    try {
      const url = window.location.href

      // Look for various URL patterns
      const urlPatterns = [
        /\/main\.aspx.*[?&]etn=([^&]+)/, // Classic Dynamics URL
        /\/main\.aspx.*[?&]etc=(\d+)/, // Entity type code
        /entity=([a-z_]+)/, // Modern URL pattern
        /\/([a-z_]+)\/.*\/form/, // Form URL pattern
        /pagetype=entityrecord.*etn=([^&]+)/, // Entity record page
      ]

      for (const pattern of urlPatterns) {
        const match = url.match(pattern)
        if (match && match[1] && match[1] !== 'systemuser' && match[1] !== 'systemusers') {
          let entity = match[1]

          // If it's a numeric entity type code, we'll need to skip this pattern
          if (/^\d+$/.test(entity)) continue

          // Convert common plural forms back to singular
          if (entity.endsWith('s') && entity !== 'systemusers') {
            entity = entity.slice(0, -1)
          }

          console.log(`✅ Entity detected from URL pattern: ${entity}`)
          return cacheAndReturn(entity)
        }
      }
    } catch (error) {
      console.warn('Could not extract entity from URL:', error)
    }

    // Strategy 2: Analyze dataset relationships to infer parent entity
    const datasetEntities = datasetAnalysis.datasets
      .map((ds: any) => ds.entityLogicalName)
      .filter((entity: string) => entity && entity !== 'unknown' && entity !== 'systemuser')

    if (datasetEntities.length > 0) {
      console.log('📊 Available dataset entities:', datasetEntities)

      // Strategy 2a: Look for common parent entity patterns
      // If we have relationships like "account_contacts", the parent is likely "account"
      const relationshipPatterns = datasetAnalysis.datasets
        .filter(ds => ds.relationshipName)
        .map(ds => ds.relationshipName)

      console.log('🔗 Relationship patterns found:', relationshipPatterns)

      // Try to extract parent entity from relationship names
      for (const relationship of relationshipPatterns) {
        if (relationship && relationship.includes('_')) {
          const parts = relationship.split('_')
          if (parts.length >= 2) {
            // Try the first part as potential parent entity
            const potentialParent = parts.slice(0, Math.ceil(parts.length / 2)).join('_')
            if (potentialParent !== 'systemuser' && potentialParent.length > 3) {
              console.log(`✅ Parent entity inferred from relationship: ${potentialParent}`)
              return cacheAndReturn(potentialParent)
            }
          }
        }
      }

      // Strategy 2b: Find the most likely parent entity (prefer custom entities)
      const primaryEntity =
        datasetEntities.find((entity: string) => {
          // Prefer custom entities (usually have underscores) over system entities
          return entity.includes('_') && !entity.includes('systemuser') && entity.length > 5
        }) ||
        datasetEntities.find(
          (entity: string) =>
            // Look for entities that seem like primary entities
            !entity.includes('systemuser') && entity.length > 3
        ) ||
        datasetEntities[0]

      if (primaryEntity) {
        console.log(`✅ Entity inferred from dataset analysis: ${primaryEntity}`)
        console.log(`📋 All available entities:`, datasetEntities)
        return cacheAndReturn(primaryEntity)
      }
    }

    // Strategy 3: Try to determine from context mode or client info
    const contextInfo = (context as any)?.mode?.contextInfo
    if (contextInfo?.entityTypeName && contextInfo.entityTypeName !== 'systemuser') {
      console.log(`✅ Entity detected from context mode: ${contextInfo.entityTypeName}`)
      return cacheAndReturn(contextInfo.entityTypeName)
    }

    console.warn('⚠️ Could not detect entity name using any strategy, defaulting to unknown')
    console.log('🔍 Available context info:', {
      page: context.page,
      parameters: Object.keys(context.parameters || {}),
      url: window.location.href,
    })

    return cacheAndReturn('unknown')
  }, [currentState, datasetAnalysis, manualEntityOverride])

  // Separate function for form discovery calls
  const detectCurrentEntity = useCallback(() => detectedEntity, [detectedEntity])

  // Update parent when detection result changes
  useEffect(() => {
    onEntityChange(detectedEntity)
  }, [detectedEntity, onEntityChange])

  // Discover forms when manifest is available
  useEffect(() => {
    const discoverForms = async () => {
      const manifest = currentState?.manifest
      const webAPI = currentState?.webAPI
      
      if (!manifest || !webAPI) {
        console.log('📋 Cannot discover forms: missing manifest or WebAPI')
        return
      }
      
      // Skip form discovery entirely if we have target table configured
      const envTargetTable = import.meta.env.VITE_PCF_TARGET_TABLE
      const envPageTable = import.meta.env.VITE_PCF_PAGE_TABLE
      if (envTargetTable && envPageTable) {
        console.log('🚀 Skipping form discovery - using environment configuration')
        console.log(`📋 Target table: ${envTargetTable}, Page table: ${envPageTable}`)
        return
      }

      // Prevent duplicate discovery operations
      if (formDiscoveryInProgress.current) {
        console.log('⏳ Form discovery already in progress, skipping...')
        return
      }

      formDiscoveryInProgress.current = true
      setIsLoadingForms(true)
      setFormDiscoveryError(null)
      
      try {
        console.log(`🔍 Discovering forms for PCF: ${manifest.namespace}.${manifest.constructor}`)
        
        // Extract publisher from namespace if possible (e.g., "test" from "test.dataset")
        const publisher = manifest.namespace?.split('.')[0]
        
        // Get the page entity to enable early termination in form discovery
        const pageEntity = import.meta.env.VITE_PCF_PAGE_TABLE || detectCurrentEntity()
        
        const forms = await findPCFOnForms(manifest, {
          publisher: publisher || undefined,
          // Add entity constraint to enable early termination optimization
          entityLogicalName: pageEntity !== 'unknown' ? pageEntity : undefined,
        })
        
        console.log(`✅ Discovered ${forms.length} forms with PCF control`)
        setDiscoveredForms(forms)
        
        // If we have forms and no form is selected, auto-select the first one
        if (forms.length > 0 && !selectedForm) {
          const firstForm = forms[0]
          setSelectedForm(firstForm)
          onFormSelect(firstForm)
          // Update entity based on the form
          updateEntityFromForm(firstForm)
        }
      } catch (error) {
        console.error('❌ Form discovery failed:', error)
        
        // Log detailed error information
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name
          })
        }
        
        // Check specific error types
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('Network error: Unable to fetch forms. Check if proxy is running.')
          setFormDiscoveryError('Network error: Unable to connect to Dataverse. Check proxy configuration.')
        } else if (error instanceof Response) {
          console.error(`HTTP error: ${error.status} ${error.statusText}`)
          setFormDiscoveryError(`HTTP error ${error.status}: Unable to fetch forms.`)
        } else {
          setFormDiscoveryError(`Form discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } finally {
        setIsLoadingForms(false)
        formDiscoveryInProgress.current = false
      }
    }
    
    // Only run if we have WebAPI (indicates we might have Dataverse connection)
    if (currentState?.webAPI) {
      discoverForms()
    }
  }, [currentState?.manifest, currentState?.webAPI, detectCurrentEntity, onFormSelect, selectedForm])

  // Helper to update entity from selected form
  const updateEntityFromForm = (form: FormPCFMatch) => {
    // Clear relationship cache when switching forms
    clearDiscoveryCache()
    onDatasetAnalysisTrigger()
    
    // Map entity type code to logical name
    let entityName: string
    
    // Check if entityTypeCode is a string (custom entity) or number (system entity)
    if (typeof form.entityTypeCode === 'string') {
      // For custom entities, the objecttypecode is the logical name
      entityName = form.entityTypeCode
    } else {
      // For system entities, map from the ENTITY_TYPE_CODES lookup
      const foundEntry = Object.entries(ENTITY_TYPE_CODES).find(
        ([_, code]) => code === form.entityTypeCode
      )
      entityName = foundEntry ? foundEntry[0] : `entity_${form.entityTypeCode}`
    }
    
    console.log(`🔄 Entity updated from form selection: ${entityName}`)
    
    // Update the manual override to match the form's entity
    setManualEntityOverride(entityName)
    onEntityChange(entityName)
  }

  // Cache management
  const handleClearFormCache = () => {
    const size = formDiscoveryCache.size
    formDiscoveryCache.clear()
    console.log(`🗑️ Cleared ${size} cached form discovery results`)
    setCacheStats({ active: false, size: 0 })
  }

  // Update cache stats
  useEffect(() => {
    const updateCacheStats = () => {
      setCacheStats({
        active: formDiscoveryCache.size > 0,
        size: formDiscoveryCache.size
      })
    }
    
    const interval = setInterval(updateCacheStats, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <div style={{ fontSize: fontSize.xs, color: colors.text.secondary, marginBottom: '8px' }}>
        Current Entity: <strong style={{ color: colors.text.primary }}>{currentEntity}</strong>
        {detectedEntity !== 'unknown' && detectedEntity === currentEntity && (
          <span style={{ color: colors.text.secondary, fontSize: fontSize.xs, marginLeft: '4px' }}>
            (discovered)
          </span>
        )}
      </div>

      {/* Manual Entity Override Control */}
      <div style={{ marginTop: '8px' }}>
        <label
          style={{
            fontSize: '10px',
            color: colors.text.secondary,
            display: 'block',
            marginBottom: '4px',
          }}
        >
          Override Entity Type:
        </label>
        <input
          type="text"
          placeholder="Auto-detect or enter entity logical name"
          value={manualEntityOverride || ''}
          onChange={e => setManualEntityOverride(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 6px',
            fontSize: '11px',
            backgroundColor: '#21262d',
            border: '1px solid #30363d',
            borderRadius: '3px',
            color: '#e6edf3',
            marginBottom: '8px',
          }}
        />

        {/* Cache Status and Clear Button */}
        {cacheStats.active && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px',
            marginBottom: '12px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '3px',
            fontSize: '11px',
            color: '#22c55e',
          }}>
            <span>✅ Cache active ({cacheStats.size} entries)</span>
            <button
              onClick={handleClearFormCache}
              style={{
                padding: '2px 8px',
                fontSize: '10px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                borderRadius: '3px',
                color: '#22c55e',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              Clear Cache
            </button>
          </div>
        )}
        
        {/* Form Selection */}
        <label
          style={{
            fontSize: '10px',
            color: colors.text.secondary,
            display: 'block',
            marginBottom: '4px',
          }}
        >
          Select Form:
        </label>
        
        {isLoadingForms ? (
          <div style={{
            padding: '8px',
            fontSize: '11px',
            color: '#94a3b8',
            textAlign: 'center',
            backgroundColor: '#21262d',
            border: '1px solid #30363d',
            borderRadius: '3px',
            marginBottom: '8px',
          }}>
            🔍 Discovering forms...
          </div>
        ) : discoveredForms.length > 0 ? (
          // Show real discovered forms
          <select
            value={selectedForm?.formId || ''}
            onChange={e => {
              const form = discoveredForms.find(f => f.formId === e.target.value)
              if (form) {
                setSelectedForm(form)
                onFormSelect(form)
                updateEntityFromForm(form)
              }
            }}
            style={{
              width: '100%',
              padding: '4px 6px',
              fontSize: '11px',
              backgroundColor: '#21262d',
              border: '1px solid #30363d',
              borderRadius: '3px',
              color: '#e6edf3',
              marginBottom: '8px',
            }}
          >
            {discoveredForms.map(form => (
              <option key={form.formId} value={form.formId}>
                📋 {form.formName} ({form.entityLogicalName || `Type ${form.entityTypeCode}`})
              </option>
            ))}
          </select>
        ) : (
          // Form discovery disabled due to environment configuration
          <div style={{
            padding: '8px',
            fontSize: '11px',
            color: '#7c8db5',
            backgroundColor: 'rgba(124, 141, 181, 0.1)',
            border: '1px solid rgba(124, 141, 181, 0.3)',
            borderRadius: '3px',
            marginBottom: '8px',
          }}>
            <div>ℹ️ Form discovery disabled</div>
            <div style={{ fontSize: '10px', marginTop: '4px', color: '#7c8db5' }}>
              Using environment variables instead (VITE_PCF_PAGE_TABLE, VITE_PCF_TARGET_TABLE)
            </div>
          </div>
        )}

        {/* Show form discovery error if present */}
        {formDiscoveryError && (
          <div style={{
            fontSize: '10px',
            color: colors.status.warning,
            padding: '4px',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            borderRadius: '2px',
            marginBottom: '6px',
          }}>
            ⚠️ {formDiscoveryError}
          </div>
        )}

        {/* Show form details if selected */}
        {selectedForm && (
          <div style={{
            fontSize: '10px',
            color: '#94a3b8',
            padding: '6px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '3px',
            marginBottom: '8px',
          }}>
            <div><strong>Form:</strong> {selectedForm.formName}</div>
            <div><strong>Entity:</strong> {selectedForm.entityLogicalName || 'Type ' + selectedForm.entityTypeCode}</div>
            <div><strong>PCF Controls:</strong> {selectedForm.controls.length}</div>
          </div>
        )}
      </div>
    </div>
  )
}