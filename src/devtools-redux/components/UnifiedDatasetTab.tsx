/**
 * Unified Dataset Tab Component
 * Combines dataset parameter inspection with refresh functionality and relationship discovery
 * Replaces both DatasetTab and DatasetRefreshTool with a single, comprehensive interface
 */

import type React from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import type { PCFDevToolsConnector } from '../PCFDevToolsConnector'
import {
  borderRadius,
  colors,
  commonStyles,
  fontSize,
  fonts,
  fontWeight,
  spacing,
} from '../styles/theme'
import {
  analyzeDatasetRefreshErrorWithDiscovery,
  buildDatasetRefreshQueryWithDiscovery,
  clearDiscoveryCache,
  type DatasetErrorAnalysis,
  type DatasetRefreshState,
  type DiscoveredRelationship,
  executeDatasetQuery,
  getDiscoveredRelationships,
  testWebAPIConnection,
} from '../utils/dataset'
import { injectDatasetRecords } from '../utils/dataset/datasetInjector'
import { detectDatasetParameters } from '../utils/datasetAnalyzer'
import { 
  findPCFOnForms, 
  type FormPCFMatch,
  ENTITY_TYPE_CODES 
} from '../../utils/pcfDiscovery'
interface UnifiedDatasetTabProps {
  connector: PCFDevToolsConnector
  currentState: any
  onUpdateView?: () => Promise<void>
}

interface ParentEntity {
  id: string
  name: string
  entityType: string
}

const UnifiedDatasetTabComponent: React.FC<UnifiedDatasetTabProps> = ({
  connector,
  currentState,
  onUpdateView,
}) => {
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [selectedParentEntity, setSelectedParentEntity] = useState<ParentEntity | null>(null)
  const [parentEntities, setParentEntities] = useState<ParentEntity[]>([])
  const [parentEntitySearch, setParentEntitySearch] = useState('')
  const [isLoadingParentEntities, setIsLoadingParentEntities] = useState(false)
  const [detectedParentEntityType, setDetectedParentEntityType] = useState<string | null>(null)
  const [availableViews, setAvailableViews] = useState<Array<{savedqueryid: string, name: string, isdefault: boolean}>>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [refreshState, setRefreshState] = useState<DatasetRefreshState>({
    isRefreshing: false,
    refreshResults: [],
    successCount: 0,
    errorCount: 0,
    totalFormsToRefresh: 0,
    currentlyRefreshing: [],
  })
  const [discoveredRelationships, setDiscoveredRelationships] = useState<DiscoveredRelationship[]>(
    []
  )
  const [currentEntity, setCurrentEntity] = useState<string>('unknown')
  const [manualEntityOverride, setManualEntityOverride] = useState<string>('')
  const [discoveredForms, setDiscoveredForms] = useState<FormPCFMatch[]>([])
  const [isLoadingForms, setIsLoadingForms] = useState<boolean>(false)
  const [selectedForm, setSelectedForm] = useState<FormPCFMatch | null>(null)
  const [formDiscoveryError, setFormDiscoveryError] = useState<string | null>(null)

  // Analyze datasets and detect entity with improved logic
  const datasetAnalysis = currentState?.context
    ? detectDatasetParameters(currentState.context)
    : { datasets: [], totalRecords: 0, summary: 'No context available' }

  const datasets = datasetAnalysis.datasets.map(ds => ({
    key: ds.name,
    dataset: {
      ...ds,
      type: 'DataSet',
    },
  }))

  // Detect parent entity type from relationships
  useEffect(() => {
    if (datasets.length > 0 && discoveredRelationships.length > 0) {
      const targetEntity = datasets[0]?.dataset?.entityLogicalName
      if (targetEntity) {
        // Find relationships where this entity is the child
        const parentRelationship = discoveredRelationships.find(rel => 
          rel.childEntity === targetEntity && rel.parentEntity !== targetEntity
        )
        if (parentRelationship) {
          setDetectedParentEntityType(parentRelationship.parentEntity)
          console.log(`🔍 Detected parent entity type: ${parentRelationship.parentEntity} for ${targetEntity}`)
        }
      }
    }
  }, [datasets, discoveredRelationships])

  // Load parent entities when parent type is detected
  useEffect(() => {
    const loadParentEntities = async () => {
      if (!currentState?.webAPI || !detectedParentEntityType) return
      
      setIsLoadingParentEntities(true)
      try {
        // Get metadata to find primary name attribute
        const metadataUrl = `EntityDefinitions(LogicalName='${detectedParentEntityType}')?$select=PrimaryIdAttribute,PrimaryNameAttribute`
        const metadataResponse = await fetch(`/api/data/v9.2/${metadataUrl}`)
        const metadata = await metadataResponse.json()
        
        const primaryId = metadata.PrimaryIdAttribute || `${detectedParentEntityType}id`
        const primaryName = metadata.PrimaryNameAttribute || 'name'
        
        let query = `$select=${primaryId},${primaryName}&$orderby=${primaryName}`
        if (parentEntitySearch) {
          query += `&$filter=contains(${primaryName},'${parentEntitySearch}')`
        }
        
        const result = await currentState.webAPI.retrieveMultipleRecords(detectedParentEntityType, query)
        const entities = result.entities.map((entity: any) => ({
          id: entity[primaryId],
          name: entity[primaryName] || 'Unnamed',
          entityType: detectedParentEntityType
        }))
        setParentEntities(entities)
      } catch (error) {
        console.error('Failed to load parent entities:', error)
        setParentEntities([])
      } finally {
        setIsLoadingParentEntities(false)
      }
    }

    const debounceTimer = setTimeout(loadParentEntities, 300)
    return () => clearTimeout(debounceTimer)
  }, [parentEntitySearch, currentState?.webAPI, detectedParentEntityType])

  // Enhanced entity detection with better logic for form context
  const detectCurrentEntity = useCallback(() => {
    const context = currentState?.context

    if (!context) {
      setCurrentEntity('unknown')
      return 'unknown'
    }

    console.log('🔍 Analyzing context for entity detection...', {
      pageEntity: context.page?.entityTypeName,
      datasetEntities: datasetAnalysis.datasets.map(ds => ds.entityLogicalName),
      manualOverride: manualEntityOverride,
      url: window.location.href,
      isDevelopment:
        window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1'),
    })

    // Strategy -1: Check for manual entity override first (highest priority)
    if (manualEntityOverride && manualEntityOverride !== '' && manualEntityOverride !== 'auto') {
      console.log(`✅ Entity manually overridden: ${manualEntityOverride}`)
      setCurrentEntity(manualEntityOverride)
      return manualEntityOverride
    }

    // Strategy 0: Try context.page.entityTypeName first (most reliable in development and real PowerApps)
    if (context.page?.entityTypeName && context.page.entityTypeName !== 'systemuser') {
      console.log(`✅ Entity detected from context.page: ${context.page.entityTypeName}`)
      setCurrentEntity(context.page.entityTypeName)
      return context.page.entityTypeName
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
          setCurrentEntity(entity)
          return entity
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
              setCurrentEntity(potentialParent)
              return potentialParent
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
        setCurrentEntity(primaryEntity)
        return primaryEntity
      }
    }

    // Strategy 3: Try to determine from context mode or client info
    const contextInfo = (context as any)?.mode?.contextInfo
    if (contextInfo?.entityTypeName && contextInfo.entityTypeName !== 'systemuser') {
      console.log(`✅ Entity detected from context mode: ${contextInfo.entityTypeName}`)
      setCurrentEntity(contextInfo.entityTypeName)
      return contextInfo.entityTypeName
    }

    console.warn('⚠️ Could not detect entity name using any strategy, defaulting to unknown')
    console.log('🔍 Available context info:', {
      page: context.page,
      parameters: Object.keys(context.parameters || {}),
      url: window.location.href,
    })

    setCurrentEntity('unknown')
    return 'unknown'
  }, [currentState, datasetAnalysis, manualEntityOverride])

  // Run entity detection on mount and when context changes
  useEffect(() => {
    detectCurrentEntity()
  }, [detectCurrentEntity])

  // Discover forms when manifest is available
  useEffect(() => {
    const discoverForms = async () => {
      const manifest = currentState?.manifest
      const webAPI = currentState?.webAPI
      
      if (!manifest || !webAPI) {
        console.log('📋 Cannot discover forms: missing manifest or WebAPI')
        return
      }

      setIsLoadingForms(true)
      setFormDiscoveryError(null)
      
      try {
        console.log(`🔍 Discovering forms for PCF: ${manifest.namespace}.${manifest.constructor}`)
        const forms = await findPCFOnForms(manifest)
        
        console.log(`✅ Discovered ${forms.length} forms with PCF control`)
        setDiscoveredForms(forms)
        
        // If we have forms and no form is selected, auto-select the first one
        if (forms.length > 0 && !selectedForm) {
          setSelectedForm(forms[0])
          // Update entity based on the form
          updateEntityFromForm(forms[0])
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
      }
    }
    
    // Only run if we have WebAPI (indicates we might have Dataverse connection)
    if (currentState?.webAPI) {
      discoverForms()
    }
  }, [currentState?.manifest, currentState?.webAPI])

  // Helper to update entity from selected form
  const updateEntityFromForm = (form: FormPCFMatch) => {
    // Clear relationship cache when switching forms
    clearDiscoveryCache()
    setDiscoveredRelationships([])
    // Map entity type code to logical name
    let entityName: string
    
    // Check if entityTypeCode is a string (custom entity) or number (system entity)
    if (typeof form.entityTypeCode === 'string') {
      // For custom entities, the objecttypecode is the logical name
      entityName = form.entityTypeCode
    } else {
      // For system entities, map the numeric code
      const entityMap: Record<number, string> = {
        [ENTITY_TYPE_CODES.ACCOUNT]: 'account',
        [ENTITY_TYPE_CODES.CONTACT]: 'contact',
        [ENTITY_TYPE_CODES.OPPORTUNITY]: 'opportunity',
        [ENTITY_TYPE_CODES.LEAD]: 'lead',
        [ENTITY_TYPE_CODES.CASE]: 'incident',
        // Add more mappings as needed
      }
      entityName = entityMap[form.entityTypeCode] || form.entityLogicalName || 'unknown'
    }
    
    console.log(`📋 Form "${form.formName}" is for entity: ${entityName} (type code: ${form.entityTypeCode})`)
    
    setManualEntityOverride(entityName)
    setCurrentEntity(entityName)
    
    // Update dataset configuration from discovered subgrid info
    if (form.controls.length > 0 && form.controls[0].dataSet) {
      const datasetConfig = form.controls[0].dataSet
      console.log(`📊 Discovered dataset configuration:`, datasetConfig)
      
      // Update the context with the discovered dataset configuration
      if (currentState?.context?.parameters?.sampleDataSet) {
        const dataset = currentState.context.parameters.sampleDataSet
        
        // Update the target entity type
        if (datasetConfig.targetEntityType && dataset.getTargetEntityType) {
          // Override the getTargetEntityType function to return discovered entity
          Object.defineProperty(dataset, 'getTargetEntityType', {
            value: () => datasetConfig.targetEntityType,
            writable: true,
            configurable: true
          })
          
          // Add custom properties for the dataset analyzer to pick up
          ;(dataset as any)._targetEntityType = datasetConfig.targetEntityType
          ;(dataset as any)._relationshipName = datasetConfig.relationshipName
          ;(dataset as any)._viewId = datasetConfig.viewId
          
          console.log(`✅ Updated dataset entity type to: ${datasetConfig.targetEntityType}`)
          
          // Log current dataset state
          console.log('📊 Dataset state after update:', {
            getTargetEntityType: dataset.getTargetEntityType?.(),
            _targetEntityType: (dataset as any)._targetEntityType,
            name: dataset.name
          })
        }
        
        // Force a re-render by updating a state variable
        // This will cause the dataset analyzer to re-run and pick up the new entity type
        setCurrentEntity(entityName)
        
        // Also trigger a small delay to ensure the UI updates
        setTimeout(() => {
          console.log('🔄 Forcing dataset re-analysis...')
          setSelectedDataset(null)
          setTimeout(() => setSelectedDataset('sampleDataSet'), 50)
        }, 100)
      }
    }
  }

  // Auto-discover relationships when datasets are available
  useEffect(() => {
    if (datasets.length > 0 && currentEntity !== 'unknown' && currentState?.webAPI) {
      console.log(
        `🚀 Auto-discovering relationships for ${currentEntity} with ${datasets.length} datasets`
      )

      const discoverRelationships = async () => {
        const context = currentState.context
        const webAPI = currentState.webAPI

        // Try to discover relationships for each dataset
        for (const { dataset } of datasets) {
          if (dataset.entityLogicalName && dataset.entityLogicalName !== currentEntity) {
            console.log(`🔍 Attempting discovery: ${currentEntity} -> ${dataset.entityLogicalName}`)

            try {
              // Import the discovery function and try to discover the relationship
              const { discoverRelationshipMultiStrategy } = await import('../utils/dataset')

              const discoveredRelationship = await discoverRelationshipMultiStrategy(
                currentEntity,
                dataset.entityLogicalName,
                webAPI
              )

              if (discoveredRelationship) {
                console.log(
                  `✅ Auto-discovered relationship: ${discoveredRelationship.parentEntity} -> ${discoveredRelationship.childEntity} via ${discoveredRelationship.lookupColumn}`
                )
              }
            } catch (error) {
              console.log(
                `⚠️ Auto-discovery failed for ${currentEntity} -> ${dataset.entityLogicalName}:`,
                error
              )
            }
          }
        }

        // Update the UI with discovered relationships
        const timer = setTimeout(() => {
          const current = getDiscoveredRelationships()
          setDiscoveredRelationships(current)
          console.log(`🔍 Auto-discovery complete: ${current.length} relationships found`)
        }, 1000)

        return timer
      }

      const timer = setTimeout(() => {
        discoverRelationships()
      }, 800) // Give a bit more time for context to stabilize

      return () => clearTimeout(timer)
    }
  }, [datasets.length, currentEntity, currentState?.webAPI])

  const handleRefreshDatasets = useCallback(async () => {
    if (!currentState?.context || !currentState?.webAPI || datasets.length === 0) {
      console.warn('⚠️ Cannot refresh: missing context, webAPI, or datasets')
      return
    }

    console.log(`🚀 Starting dataset refresh for entity: ${currentEntity}`)

    setRefreshState({
      isRefreshing: true,
      refreshResults: [],
      successCount: 0,
      errorCount: 0,
      totalFormsToRefresh: datasets.length,
      currentlyRefreshing: datasets.map(d => d.key),
      lastRefresh: new Date(),
    })

    const context = currentState.context
    const webAPI = currentState.webAPI
    const refreshResults = []
    let successCount = 0
    let errorCount = 0

    try {
      // Test WebAPI connection first
      const connectionTest = await testWebAPIConnection(webAPI)
      if (!connectionTest.success) {
        throw new Error(`WebAPI connection failed: ${connectionTest.error}`)
      }

      // Process each dataset
      for (const { key, dataset } of datasets) {
        try {
          console.log(`🔍 Processing dataset: ${key} (${dataset.entityLogicalName})`)

          // Create SubgridInfo from dataset for query building
          const subgridInfo = {
            formId: 'current-form',
            formName: 'Current PCF Context',
            entityTypeCode: 0,
            controlId: key,
            targetEntity: dataset.entityLogicalName || 'unknown',
            viewId: dataset.viewId,
            relationshipName:
              selectedParentEntity && detectedParentEntityType
                ? dataset.relationshipName || `${detectedParentEntityType}_${dataset.entityLogicalName}s`
                : dataset.relationshipName || `${currentEntity}_${dataset.entityLogicalName}`,
            isCustomView: false,
            allowViewSelection: false,
            enableViewPicker: false,
          }

          // Build query with runtime discovery
          const queryOptions = {
            includeFormattedValues: true,
            parentEntity: selectedParentEntity
              ? selectedParentEntity.entityType
              : currentEntity,
            parentRecordId: selectedParentEntity
              ? selectedParentEntity.id
              : undefined,
            webAPI: webAPI,
          }
          
          const query = await buildDatasetRefreshQueryWithDiscovery(subgridInfo, queryOptions)

          console.log(`🏗️ Built query for ${key}:`, query.odataQuery)

          // Execute query
          const queryResult = await executeDatasetQuery(query, webAPI)

          refreshResults.push({
            subgridInfo,
            queryResult,
            query: query.odataQuery,
          })

          if (queryResult.success) {
            successCount++
            console.log(`✅ Success for ${key}: ${queryResult.entities.length} records`)
            
            // Log the dataset state before injection
            const datasetBefore = context.parameters?.[key]
            console.log(`📊 Dataset ${key} before injection:`, {
              hasRecords: !!datasetBefore?.records,
              recordCount: Object.keys(datasetBefore?.records || {}).length,
              records: datasetBefore?.records ? Object.keys(datasetBefore.records).slice(0, 5) : []
            })
            
            // Inject the retrieved records into the dataset
            const injected = await injectDatasetRecords({
              context,
              datasetName: key,
              queryResult,
              // Don't trigger updateView yet - wait until all datasets are processed
            })
            
            if (injected) {
              console.log(`💉 Successfully injected records into dataset: ${key}`)
              
              // Log the dataset state after injection
              const datasetAfter = context.parameters?.[key]
              console.log(`📊 Dataset ${key} after injection:`, {
                hasRecords: !!datasetAfter?.records,
                recordCount: Object.keys(datasetAfter?.records || {}).length,
                records: datasetAfter?.records ? Object.keys(datasetAfter.records).slice(0, 5) : []
              })
            }
          } else {
            errorCount++
            console.error(`❌ Failed for ${key}:`, queryResult.error)
          }
        } catch (error) {
          console.error(`💥 Error processing dataset ${key}:`, error)

          let errorAnalysisResult: DatasetErrorAnalysis | null = null

          if (error && typeof error === 'object' && 'status' in error) {
            try {
              errorAnalysisResult = await analyzeDatasetRefreshErrorWithDiscovery(
                error as Response,
                `${datasets.find(d => d.key === key)?.dataset?.entityLogicalName}s`,
                currentEntity,
                dataset.entityLogicalName,
                webAPI
              )
            } catch (analysisError) {
              console.warn('Error analysis failed:', analysisError)
            }
          }

          refreshResults.push({
            subgridInfo: {
              formId: 'current-form',
              formName: 'Current PCF Context',
              entityTypeCode: 0,
              controlId: key,
              targetEntity: dataset.entityLogicalName || 'unknown',
              isCustomView: false,
              allowViewSelection: false,
              enableViewPicker: false,
            },
            queryResult: {
              success: false,
              entities: [],
              error: String(error),
            },
            errorAnalysis: errorAnalysisResult,
            query: `${dataset.entityLogicalName}s?$select=*`,
          })
          errorCount++
        }
      }

      // Discover relationships for the dataset entity if not already done
      if (datasets.length > 0) {
        const targetEntity = datasets[0]?.dataset?.entityLogicalName
        if (targetEntity && targetEntity !== 'unknown') {
          try {
            // Check if we already have relationships discovered
            let currentDiscovered = getDiscoveredRelationships()
            
            // If no relationships found, try to discover them
            if (currentDiscovered.length === 0) {
              console.log(`🔍 Discovering relationships for ${targetEntity}...`)
              
              // Get entity metadata to find relationships
              const metadataUrl = `EntityDefinitions(LogicalName='${targetEntity}')/ManyToOneRelationships?$select=ReferencingAttribute,ReferencedEntity,ReferencedAttribute`
              const metadataResponse = await fetch(`/api/data/v9.2/${metadataUrl}`)
              
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json()
                const relationships: DiscoveredRelationship[] = metadata.value?.map((rel: any) => ({
                  relationshipName: `${rel.ReferencedEntity}_${targetEntity}s`,
                  parentEntity: rel.ReferencedEntity,
                  childEntity: targetEntity,
                  lookupColumn: `_${rel.ReferencingAttribute}_value`,
                  referencingAttribute: rel.ReferencingAttribute,
                  referencedEntity: rel.ReferencedEntity
                })) || []
                
                console.log(`✅ Discovered ${relationships.length} relationships for ${targetEntity}`)
                setDiscoveredRelationships(relationships)
              }
            } else {
              setDiscoveredRelationships(currentDiscovered)
            }
            
            // If we don't have a view ID from form discovery, try to get appropriate view
            if (datasets[0] && !datasets[0].dataset.viewId) {
              console.log(`🔍 Looking for appropriate view for ${targetEntity}...`)
              
              // Query for views associated with this entity
              const viewsUrl = `/api/data/v9.2/savedqueries?$filter=returnedtypecode eq '${targetEntity}'&$select=savedqueryid,name,isdefault,fetchxml&$orderby=name`
              const viewsResponse = await fetch(viewsUrl)
              
              if (viewsResponse.ok) {
                const viewsData = await viewsResponse.json()
                if (viewsData.value && viewsData.value.length > 0) {
                  console.log(`📋 Found ${viewsData.value.length} views for ${targetEntity}`)
                  
                  // Store available views
                  setAvailableViews(viewsData.value)
                  
                  // Look for views that might be appropriate for the current context
                  let selectedView = null
                  
                  // If we have a parent entity selected, look for views that filter by that parent
                  if (selectedParentEntity && detectedParentEntityType) {
                    // Look for views that might be designed for this relationship
                    for (const view of viewsData.value) {
                      // Check if the view name suggests it's for this relationship
                      const viewNameLower = view.name.toLowerCase()
                      const parentEntityLower = detectedParentEntityType.toLowerCase()
                      
                      if (viewNameLower.includes(parentEntityLower) || 
                          viewNameLower.includes('associated') ||
                          viewNameLower.includes('related')) {
                        selectedView = view
                        console.log(`✅ Found relationship-specific view: ${view.name}`)
                        break
                      }
                    }
                  }
                  
                  // If no relationship-specific view found, look for common view types
                  if (!selectedView) {
                    // Priority order: Gantt View, Active Records, Default View, First View
                    selectedView = viewsData.value.find((v: any) => v.name.toLowerCase().includes('gantt')) ||
                                  viewsData.value.find((v: any) => v.name.toLowerCase().includes('active')) ||
                                  viewsData.value.find((v: any) => v.isdefault) ||
                                  viewsData.value[0]
                  }
                  
                  if (selectedView) {
                    console.log(`✅ Selected view: ${selectedView.name} (${selectedView.savedqueryid})`)
                    setSelectedViewId(selectedView.savedqueryid)
                    
                    // Update the dataset's view ID
                    if (currentState?.context?.parameters?.sampleDataSet) {
                      const dataset = currentState.context.parameters.sampleDataSet as any
                      dataset._viewId = selectedView.savedqueryid
                      
                      // Also update getViewId to return this value
                      Object.defineProperty(dataset, 'getViewId', {
                        value: () => selectedView.savedqueryid,
                        writable: true,
                        configurable: true
                      })
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error('Failed to discover relationships:', error)
            // Still use cached relationships if discovery fails
            const currentDiscovered = getDiscoveredRelationships()
            setDiscoveredRelationships(currentDiscovered)
          }
        }
      }
    } catch (error) {
      console.error('💥 Overall refresh failed:', error)
      errorCount = datasets.length
    }

    const finalState = {
      isRefreshing: false,
      refreshResults,
      successCount,
      errorCount,
      totalFormsToRefresh: datasets.length,
      currentlyRefreshing: [],
      lastRefresh: new Date(),
    }

    setRefreshState(finalState)
    console.log(`🏁 Refresh complete: ${successCount} success, ${errorCount} errors`)
    
    // Trigger updateView if we successfully injected any records
    if (successCount > 0 && onUpdateView) {
      console.log(`🔄 Triggering PCF updateView after dataset refresh`)
      await onUpdateView()
    }
  }, [currentState, datasets, currentEntity, selectedParentEntity, onUpdateView])

  const handleSelectDataset = useCallback((key: string) => {
    setSelectedDataset(key)
  }, [])

  const handleClearCache = useCallback(() => {
    clearDiscoveryCache()
    setDiscoveredRelationships([])
    console.log('🧹 Discovery cache cleared')
  }, [])


  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* Left Panel - Dataset List & Controls */}
      <div
        style={{
          width: '350px',
          borderRight: `1px solid ${colors.border.primary}`,
          overflow: 'auto',
          backgroundColor: colors.background.primary,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with Entity Info */}
        <div
          style={{
            ...commonStyles.container.panel,
            ...commonStyles.text.label,
            borderBottom: `1px solid ${colors.border.primary}`,
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <strong>📊 Dataset Management</strong>
          </div>
          <div style={{ fontSize: fontSize.xs, color: colors.text.secondary, marginBottom: '4px' }}>
            Page/Form Entity:{' '}
            <span style={{ color: colors.status.success, fontWeight: 'bold' }}>
              {currentEntity}
            </span>
            {manualEntityOverride && manualEntityOverride !== 'auto' && !selectedForm && (
              <span style={{ color: colors.status.warning, fontSize: '10px', marginLeft: '4px' }}>
                (manual)
              </span>
            )}
          </div>
          <div style={{ fontSize: fontSize.xs, color: colors.text.secondary, marginBottom: '4px' }}>
            Target Entity:{' '}
            <span style={{ color: colors.status.info, fontWeight: 'bold' }}>
              {datasets[0]?.entityLogicalName || 'unknown'}
            </span>
          </div>
          <div style={{ fontSize: fontSize.xs, color: colors.text.secondary, marginBottom: '8px' }}>
            Datasets: {datasets.length} | Relationships: {discoveredRelationships.length}
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

            {/* Parent Entity Selection for Related Datasets */}
            {detectedParentEntityType && datasets.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <label
                  style={{
                    fontSize: '10px',
                    color: colors.text.secondary,
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Filter by {detectedParentEntityType}:
                </label>
                <input
                  type="text"
                  placeholder={`Search ${detectedParentEntityType}...`}
                  value={parentEntitySearch}
                  onChange={e => setParentEntitySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    fontSize: '11px',
                    backgroundColor: '#21262d',
                    border: '1px solid #30363d',
                    borderRadius: '3px',
                    color: '#e6edf3',
                    marginBottom: '4px',
                  }}
                />
                <select
                  value={selectedParentEntity?.id || ''}
                  onChange={e => {
                    const entity = parentEntities.find(i => i.id === e.target.value)
                    setSelectedParentEntity(entity || null)
                  }}
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    fontSize: '11px',
                    backgroundColor: '#21262d',
                    border: '1px solid #30363d',
                    borderRadius: '3px',
                    color: '#e6edf3',
                  }}
                  disabled={isLoadingParentEntities}
                >
                  <option value="">
                    {isLoadingParentEntities ? `Loading ${detectedParentEntityType}...` : `Select a ${detectedParentEntityType}...`}
                  </option>
                  {parentEntities.map(entity => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
                {selectedParentEntity && (
                  <div style={{ fontSize: '10px', color: colors.status.info, marginTop: '4px' }}>
                    Selected: {selectedParentEntity.name}
                  </div>
                )}
              </div>
            )}

            {/* View Selection for Datasets */}
            {availableViews.length > 0 && datasets.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <label
                  style={{
                    fontSize: '10px',
                    color: colors.text.secondary,
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Select View:
                </label>
                <select
                  value={selectedViewId || ''}
                  onChange={e => {
                    const viewId = e.target.value
                    setSelectedViewId(viewId)
                    
                    // Update the dataset's view ID
                    if (currentState?.context?.parameters?.sampleDataSet && viewId) {
                      const dataset = currentState.context.parameters.sampleDataSet as any
                      dataset._viewId = viewId
                      
                      // Also update getViewId to return this value
                      Object.defineProperty(dataset, 'getViewId', {
                        value: () => viewId,
                        writable: true,
                        configurable: true
                      })
                      
                      const selectedView = availableViews.find(v => v.savedqueryid === viewId)
                      console.log(`👁️ View changed to: ${selectedView?.name} (${viewId})`)
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
                  }}
                >
                  <option value="">Select a view...</option>
                  {availableViews.map(view => (
                    <option key={view.savedqueryid} value={view.savedqueryid}>
                      {view.name} {view.isdefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
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
              // No forms discovered
              <div style={{
                padding: '8px',
                fontSize: '11px',
                color: '#ff7b72',
                backgroundColor: 'rgba(251, 98, 94, 0.1)',
                border: '1px solid rgba(251, 98, 94, 0.3)',
                borderRadius: '3px',
                marginBottom: '8px',
              }}>
                <div>❌ No forms discovered</div>
                <div style={{ fontSize: '10px', marginTop: '4px', color: '#f85149' }}>
                  Check browser console for detailed error logs
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

        {/* Refresh Controls */}
        <div
          style={{
            padding: '12px',
            borderBottom: `1px solid ${colors.border.primary}`,
            backgroundColor: '#1a1f2e',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              onClick={handleRefreshDatasets}
              disabled={refreshState.isRefreshing || datasets.length === 0}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: refreshState.isRefreshing ? '#475569' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: refreshState.isRefreshing ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {refreshState.isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh All Datasets'}
            </button>

            <button
              onClick={handleClearCache}
              style={{
                padding: '8px 12px',
                backgroundColor: '#6b7280',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
              title="Clear relationship discovery cache"
            >
              🧹 Clear Cache
            </button>
          </div>

          {/* Status */}
          {refreshState.lastRefresh && (
            <div style={{ fontSize: '10px', color: colors.text.secondary }}>
              Last refresh: {refreshState.lastRefresh.toLocaleTimeString()} • ✅{' '}
              {refreshState.successCount} • ❌ {refreshState.errorCount}
            </div>
          )}
        </div>

        {/* Dataset List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {datasets.length === 0 ? (
            <div
              style={{
                padding: '16px',
                color: colors.text.secondary,
                fontSize: '12px',
                fontStyle: 'italic',
                textAlign: 'center',
              }}
            >
              {datasetAnalysis.summary}
            </div>
          ) : (
            datasets.map(({ key, dataset }) => {
              const isSelected = selectedDataset === key
              const refreshResult = refreshState.refreshResults.find(
                r => r.subgridInfo.controlId === key
              )

              return (
                <div
                  key={key}
                  onClick={() => handleSelectDataset(key)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#1f6feb' : 'transparent',
                    borderLeft: isSelected ? '3px solid #58a6ff' : '3px solid transparent',
                    borderBottom: '1px solid #21262d',
                    fontSize: '12px',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: '600',
                        color: isSelected ? '#ffffff' : '#e6edf3',
                        fontSize: '13px',
                      }}
                    >
                      {key}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        backgroundColor: refreshResult
                          ? refreshResult.queryResult.success
                            ? '#22c55e'
                            : '#ef4444'
                          : dataset.hasData
                            ? '#6b7280'
                            : '#9ca3af',
                        color: '#ffffff',
                      }}
                    >
                      {refreshResult
                        ? refreshResult.queryResult.success
                          ? `${refreshResult.queryResult.entities.length} records`
                          : 'Error'
                        : `${dataset.recordCount || 0} records`}
                    </div>
                  </div>

                  <div
                    style={{
                      color: isSelected ? '#b1bac4' : '#7d8590',
                      fontSize: '11px',
                      marginBottom: '4px',
                    }}
                  >
                    <div>Entity: {dataset.entityLogicalName || 'unknown'}</div>
                    {dataset.viewId && <div>View: {dataset.viewId.substring(0, 8)}...</div>}
                    {dataset.relationshipName && (
                      <div>Relationship: {dataset.relationshipName}</div>
                    )}
                  </div>

                  {refreshResult?.errorAnalysis && (
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#ff7b72',
                        backgroundColor: '#3a1e1e',
                        padding: '4px',
                        borderRadius: '2px',
                        marginTop: '4px',
                      }}
                    >
                      Error: {refreshResult.queryResult.error}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Panel - Details & Discovery */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#0d1117',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #21262d',
            backgroundColor: '#161b22',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#e6edf3',
            }}
          >
            {selectedDataset ? `Dataset: ${selectedDataset}` : 'Relationship Discovery'}
          </h3>
        </div>

        <div style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
          {/* Discovered Relationships Section - Always Visible */}
          <div style={{ marginBottom: '24px' }}>
            <h4
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🔍 Discovered Relationships ({discoveredRelationships.length})
            </h4>

            {discoveredRelationships.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '12px',
                }}
              >
                <div style={{ marginBottom: '8px' }}>🔍 No relationships discovered yet</div>
                <div style={{ fontSize: '11px' }}>
                  Click "🔄 Refresh All Datasets" to discover relationships automatically
                </div>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '300px',
                  overflow: 'auto',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                }}
              >
                {discoveredRelationships.map((relationship, index) => (
                  <div
                    key={`${relationship.parentEntity}-${relationship.childEntity}-${index}`}
                    style={{
                      padding: '12px',
                      borderBottom:
                        index < discoveredRelationships.length - 1 ? '1px solid #334155' : 'none',
                      backgroundColor: index % 2 === 0 ? '#1e293b' : '#0f172a',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: '600',
                          color: '#f1f5f9',
                          fontSize: '13px',
                        }}
                      >
                        {relationship.parentEntity} → {relationship.childEntity}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          backgroundColor:
                            relationship.confidence === 'high'
                              ? '#059669'
                              : relationship.confidence === 'medium'
                                ? '#d97706'
                                : '#dc2626',
                          color: '#ffffff',
                        }}
                      >
                        {relationship.confidence}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        marginBottom: '6px',
                        fontFamily: 'monospace',
                        backgroundColor: '#0f172a',
                        padding: '4px 8px',
                        borderRadius: '3px',
                      }}
                    >
                      <strong>Lookup:</strong> {relationship.lookupColumn}
                    </div>

                    <div
                      style={{
                        fontSize: '10px',
                        color: '#6b7280',
                        display: 'flex',
                        gap: '12px',
                      }}
                    >
                      <span>Source: {relationship.source}</span>
                      <span>Found: {new Date(relationship.discoveredAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Dataset Details */}
          {selectedDataset && (
            <div>
              <h4
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#f1f5f9',
                }}
              >
                📋 Dataset Details
              </h4>

              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontSize: '11px',
                  lineHeight: '1.6',
                  fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
                  color: '#e6edf3',
                  backgroundColor: '#0d1117',
                  padding: '12px',
                  border: '1px solid #21262d',
                  borderRadius: '6px',
                }}
              >
                {JSON.stringify(
                  datasets.find(d => d.key === selectedDataset)?.dataset || {},
                  null,
                  2
                )}
              </pre>

              {/* Refresh Results for Selected Dataset */}
              {refreshState.refreshResults.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#f1f5f9',
                    }}
                  >
                    🔄 Refresh Results
                  </h4>

                  {refreshState.refreshResults
                    .filter(result => result.subgridInfo.controlId === selectedDataset)
                    .map((result, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          marginBottom: '8px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          }}
                        >
                          <span style={{ fontWeight: '500', color: '#f1f5f9', fontSize: '12px' }}>
                            Query Result
                          </span>
                          <div
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              backgroundColor: result.queryResult.success ? '#22c55e' : '#ef4444',
                              color: '#ffffff',
                            }}
                          >
                            {result.queryResult.success ? 'Success' : 'Failed'}
                          </div>
                        </div>

                        {result.queryResult.success ? (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            ✅ Retrieved {result.queryResult.entities.length} records
                            {result.queryResult.nextLink && ' (more available)'}
                          </div>
                        ) : (
                          <div>
                            <div
                              style={{ fontSize: '11px', color: '#ff7b72', marginBottom: '8px' }}
                            >
                              ❌ Error: {result.queryResult.error}
                            </div>
                            {result.errorAnalysis?.suggestions && (
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                <strong>Suggestions:</strong>
                                <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                                  {result.errorAnalysis.suggestions.map((suggestion, idx) => (
                                    <li key={idx}>{suggestion}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Export memoized component for performance
export const UnifiedDatasetTab = memo(UnifiedDatasetTabComponent)
