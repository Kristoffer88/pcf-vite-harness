/**
 * Background Data Loader
 * Loads and refreshes dataset data without requiring the devtools UI to be open
 */

import { EnvConfigGenerator } from './envConfigGenerator'
import { detectDatasetParameters } from '../utils/datasetAnalyzer'
import {
  buildDatasetRefreshQueryWithDiscovery,
  executeDatasetQuery,
  testWebAPIConnection,
  type DiscoveredRelationship,
} from './dataset'
import { injectDatasetRecords } from './dataset/datasetInjector'
import { generateDatasetFromView } from './dataset/datasetGenerator'

export class BackgroundDataLoader {
  private static isInitialized = false
  private static isLoading = false
  
  /**
   * Initialize background data loading
   */
  static async initialize(
    context: ComponentFramework.Context<any>,
    onUpdateView?: () => Promise<void>
  ): Promise<void> {
    console.log('🔍 BackgroundDataLoader.initialize called', {
      isInitialized: this.isInitialized,
      isLoading: this.isLoading,
      hasContext: !!context,
      hasWebAPI: !!context?.webAPI,
      hasUpdateView: !!onUpdateView,
      env: {
        AUTO_REFRESH: import.meta.env.VITE_PCF_AUTO_REFRESH,
        AUTO_REFRESH_DELAY: import.meta.env.VITE_PCF_AUTO_REFRESH_DELAY,
        PAGE_TABLE: import.meta.env.VITE_PCF_PAGE_TABLE,
        TARGET_TABLE: import.meta.env.VITE_PCF_TARGET_TABLE,
        PARENT_ENTITY_TYPE: import.meta.env.VITE_PCF_PARENT_ENTITY_TYPE,
        PARENT_ENTITY_ID: import.meta.env.VITE_PCF_PARENT_ENTITY_ID,
        DEFAULT_VIEW_ID: import.meta.env.VITE_PCF_DEFAULT_VIEW_ID,
      }
    })
    
    if (this.isInitialized || this.isLoading) {
      console.log('📊 Background data loader already initialized or loading')
      return
    }

    // Check if auto-refresh is enabled
    const autoRefreshEnabled = EnvConfigGenerator.isAutoRefreshEnabled()
    console.log('📊 Auto-refresh enabled check:', { 
      autoRefreshEnabled,
      envValue: import.meta.env.VITE_PCF_AUTO_REFRESH,
      type: typeof import.meta.env.VITE_PCF_AUTO_REFRESH,
      allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_PCF_')).reduce((acc, key) => {
        acc[key] = import.meta.env[key]
        return acc
      }, {} as Record<string, any>)
    })
    
    if (!autoRefreshEnabled) {
      console.log('📊 Auto-refresh disabled in environment')
      return
    }

    this.isLoading = true
    console.log('🚀 Starting background data loading...')

    try {
      const webAPI = context.webAPI
      if (!webAPI) {
        console.warn('❌ No WebAPI available for background loading')
        return
      }

      // Test WebAPI connection
      console.log('🔌 Testing WebAPI connection...')
      const connectionTest = await testWebAPIConnection(webAPI)
      console.log('🔌 WebAPI connection test result:', connectionTest)
      
      if (!connectionTest.success) {
        console.error('❌ WebAPI connection failed:', connectionTest.error)
        return
      }

      // Detect datasets
      console.log('🔍 Detecting datasets from context...')
      const datasetAnalysis = detectDatasetParameters(context)
      console.log('🔍 Dataset analysis result:', {
        datasetCount: datasetAnalysis.datasets.length,
        datasets: datasetAnalysis.datasets.map(d => ({
          name: d.name,
          entityLogicalName: d.entityLogicalName,
          recordCount: d.recordCount,
          hasData: d.hasData,
          viewId: d.viewId,
          relationshipName: d.relationshipName
        })),
        totalRecords: datasetAnalysis.totalRecords,
        summary: datasetAnalysis.summary
      })
      
      if (datasetAnalysis.datasets.length === 0) {
        console.log('📊 No datasets detected for background loading')
        return
      }

      console.log(`📊 Found ${datasetAnalysis.datasets.length} datasets to load in background`)

      // Load parent entity from environment
      const parentEntity = EnvConfigGenerator.loadParentEntityFromEnv()
      const parentEntityType = import.meta.env.VITE_PCF_PARENT_ENTITY_TYPE
      const defaultViewId = import.meta.env.VITE_PCF_DEFAULT_VIEW_ID
      
      console.log('📂 Environment configuration loaded:', {
        parentEntity,
        parentEntityType,
        defaultViewId
      })

      // Wait for the configured delay
      const delay = EnvConfigGenerator.getAutoRefreshDelay()
      console.log(`⏱️ Waiting ${delay}ms before loading data...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      console.log('⏱️ Delay complete, starting data load...')

      // Load data for each dataset
      let successCount = 0
      for (const dataset of datasetAnalysis.datasets) {
        try {
          console.log(`📊 Loading data for dataset: ${dataset.name}`)
          
          // If we have a view ID, use the dataset generator
          if ((dataset.viewId && dataset.viewId !== '') || defaultViewId) {
            const viewId = dataset.viewId || defaultViewId
            console.log(`📊 Using view-based loading for ${dataset.name} with view ${viewId}`)
            
            const generatedDataset = await generateDatasetFromView({
              viewId: viewId,
              pageSize: 5000,
              includeRecords: true,
              recordLimit: 5000,
            })
            
            if (!generatedDataset.error) {
              // Convert generated dataset to query result format
              const entities = Object.keys(generatedDataset.records).map(recordId => {
                const record = generatedDataset.records[recordId]
                const entity: any = { [dataset.entityLogicalName + 'id']: recordId }
                
                if (record._record && record._record.fields) {
                  Object.entries(record._record.fields).forEach(([fieldName, fieldData]: [string, any]) => {
                    if (fieldData.value !== undefined) {
                      entity[fieldName] = fieldData.value
                    } else if (fieldData.reference) {
                      entity[fieldName] = fieldData.reference.id.guid
                      entity[`_${fieldName}_value`] = fieldData.reference.id.guid
                      entity[`_${fieldName}_value@OData.Community.Display.V1.FormattedValue`] = fieldData.reference.name
                    }
                  })
                }
                
                return entity
              })
              
              const queryResult = {
                success: true,
                entities,
                entityLogicalName: dataset.entityLogicalName || 'unknown',
                columns: generatedDataset.columns,
                viewId: viewId,
              }
              
              // Inject records into the dataset
              const injectionResult = await injectDatasetRecords({
                context,
                datasetName: dataset.name,
                queryResult,
                onUpdateView
              })
              
              console.log(`💉 Injection result for ${dataset.name}:`, injectionResult)
              
              if (injectionResult) {
                successCount++
                console.log(`✅ Successfully loaded ${entities.length} records for ${dataset.name}`)
              } else {
                console.error(`❌ Failed to inject records for ${dataset.name}`)
              }
            }
          } else {
            // Fallback to query-based loading
            console.log(`📊 Using query-based loading for ${dataset.name}`)
            
            const subgridInfo = {
              formId: 'background-loader',
              formName: 'Background Loader',
              entityTypeCode: 0,
              controlId: dataset.name,
              targetEntity: dataset.entityLogicalName || 'unknown',
              viewId: dataset.viewId,
              relationshipName: dataset.relationshipName,
              isCustomView: false,
              allowViewSelection: false,
              enableViewPicker: false,
            }
            
            const query = await buildDatasetRefreshQueryWithDiscovery(subgridInfo, {
              maxPageSize: 5000,
              includeFormattedValues: true,
              parentRecordId: parentEntity?.id,
              parentEntity: parentEntityType,
              webAPI: webAPI,
            })
            
            const queryResult = await executeDatasetQuery(query, webAPI)
            
            if (queryResult.success) {
              const injectionResult = await injectDatasetRecords({
                context,
                datasetName: dataset.name,
                queryResult,
                onUpdateView
              })
              
              console.log(`💉 Injection result for ${dataset.name}:`, injectionResult)
              
              if (injectionResult) {
                successCount++
                console.log(`✅ Successfully loaded ${queryResult.entities.length} records for ${dataset.name}`)
              } else {
                console.error(`❌ Failed to inject records for ${dataset.name}`)
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to load data for dataset ${dataset.name}:`, error)
        }
      }

      this.isInitialized = true
      console.log(`🎉 Background data loading complete: ${successCount}/${datasetAnalysis.datasets.length} datasets loaded`)

      // Trigger update view if any data was loaded
      if (successCount > 0) {
        if (onUpdateView) {
          console.log('🔄 Triggering updateView after background data load')
          try {
            await onUpdateView()
            console.log('✅ UpdateView completed successfully')
          } catch (error) {
            console.error('❌ UpdateView failed:', error)
          }
        } else {
          console.warn('⚠️ No updateView callback provided, skipping view update')
        }
      } else {
        console.log('⚠️ No data was loaded, skipping updateView')
      }
    } catch (error) {
      console.error('❌ Background data loading failed:', error)
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Reset the loader state (useful for testing)
   */
  static reset(): void {
    this.isInitialized = false
    this.isLoading = false
  }
}