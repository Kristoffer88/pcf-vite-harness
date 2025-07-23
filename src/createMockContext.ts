/**
 * Helper function to format GUID strings properly
 */
function formatGuid(guid: string): string {
  return guid.replace(/[{}]/g, '')
}

/**
 * Helper function to get entity metadata from Dataverse
 */
async function getEntityMetadata(entityLogicalName: string): Promise<any> {
  // Validate entity name
  if (!entityLogicalName || entityLogicalName === 'unknown' || entityLogicalName.trim() === '') {
    console.warn(`⚠️ Invalid entity name for metadata fetch: "${entityLogicalName}"`)
    return null
  }

  const response = await fetch(
    `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')`
  )
  if (!response.ok) {
    throw new Error(`Failed to get metadata for ${entityLogicalName}: ${response.status}`)
  }
  return response.json()
}

/**
 * Helper function to extract view ID from query options
 */
function extractViewId(options: string): { viewId?: string; isUserView: boolean } {
  if (options.includes('savedQuery=')) {
    const match = options.match(/savedQuery=([^&]+)/)
    return { viewId: match?.[1], isUserView: false }
  }

  if (options.includes('userQuery=')) {
    const match = options.match(/userQuery=([^&]+)/)
    return { viewId: match?.[1], isUserView: true }
  }

  return { isUserView: false }
}

/**
 * Helper function to get view information for logging
 */
async function getViewInfo(
  viewId: string,
  isUserView: boolean
): Promise<{ name?: string; entityName?: string }> {
  try {
    const entitySet = isUserView ? 'userqueries' : 'savedqueries'
    const response = await fetch(
      `/api/data/v9.2/${entitySet}(${viewId})?$select=name,returnedtypecode`
    )

    if (response.ok) {
      const data = await response.json()
      return {
        name: data.name,
        entityName: data.returnedtypecode,
      }
    }
  } catch (error) {
    console.warn('Failed to get view info:', error)
  }

  return {}
}

/**
 * Default webAPI implementation with proxy support
 */
function createDefaultWebAPI(): ComponentFramework.WebApi {
  return {
    retrieveMultipleRecords: async (
      entityLogicalName: string,
      options?: string
    ): Promise<ComponentFramework.WebApi.RetrieveMultipleResponse> => {
      try {
        console.log(`🔄 retrieveMultipleRecords called for ${entityLogicalName}`, {
          options,
        })

        // Get metadata to find collection name
        const metadata = await getEntityMetadata(entityLogicalName)
        const collectionName = metadata.LogicalCollectionName
        let url = `/api/data/v9.2/${collectionName}`

        if (options) {
          url += options.startsWith('?') ? options : `?${options}`
        }

        // Check if this is a view-based query and extract view information
        const isViewQuery =
          options &&
          (options.includes('savedQuery=') ||
            options.includes('userQuery=') ||
            options.includes('fetchXml='))
        let viewInfo: { name?: string; entityName?: string } = {}

        if (isViewQuery && options) {
          const { viewId, isUserView } = extractViewId(options)
          if (viewId) {
            viewInfo = await getViewInfo(viewId, isUserView)
            console.log(
              `🔍 ${isUserView ? 'User' : 'System'} view query detected for ${entityLogicalName}`,
              {
                viewId,
                viewName: viewInfo.name || 'Unknown View',
              }
            )
          } else if (options.includes('fetchXml=')) {
            console.log(`🔍 FetchXML query detected for ${entityLogicalName}`)
          }
        }

        const response = await fetch(url)
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API Error Response:`, errorText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        const recordCount = result.value?.length || 0

        if (isViewQuery) {
          const viewDescription = viewInfo.name ? ` via "${viewInfo.name}"` : ' via view'
          console.log(
            `✅ Retrieved ${recordCount} records for ${entityLogicalName}${viewDescription}`
          )
        } else {
          console.log(`✅ Retrieved ${recordCount} records for ${entityLogicalName}`)
        }

        // Transform OData response to PCF WebAPI format
        if (result.value && !result.entities) {
          return {
            entities: result.value,
            nextLink: result['@odata.nextLink'],
          }
        }

        return result
      } catch (error) {
        console.error(`Error retrieving multiple records for ${entityLogicalName}:`, error)
        throw error
      }
    },

    retrieveRecord: async (
      entityLogicalName: string,
      id: string,
      options?: string
    ): Promise<ComponentFramework.WebApi.Entity> => {
      try {
        // Get metadata to find collection name
        const metadata = await getEntityMetadata(entityLogicalName)
        const collectionName = metadata.LogicalCollectionName
        let url = `/api/data/v9.2/${collectionName}(${id})`

        if (options) {
          url += options.startsWith('?') ? options : `?${options}`
        }

        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log(`✅ Retrieved record ${id} for ${entityLogicalName}`)
        return result
      } catch (error) {
        console.error(`Error retrieving record ${id} for ${entityLogicalName}:`, error)
        throw error
      }
    },

    createRecord: async (
      entityLogicalName: string,
      data: ComponentFramework.WebApi.Entity
    ): Promise<ComponentFramework.LookupValue> => {
      try {
        // Get metadata to find collection name and primary attributes
        const metadata = await getEntityMetadata(entityLogicalName)
        const collectionName = metadata.LogicalCollectionName
        const url = `/api/data/v9.2/${collectionName}`

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Create Error Response:`, errorText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        const primaryIdAttribute =
          metadata.PrimaryIdAttribute || `${entityLogicalName.toLowerCase()}id`

        console.log(`✅ Created record for ${entityLogicalName}`)
        return {
          id: formatGuid(result[primaryIdAttribute]),
          name: result[metadata.PrimaryNameAttribute] || '',
          entityType: entityLogicalName,
        }
      } catch (error) {
        console.error(`Error creating record for ${entityLogicalName}:`, error)
        throw error
      }
    },

    updateRecord: async (
      entityLogicalName: string,
      id: string,
      data: ComponentFramework.WebApi.Entity
    ): Promise<ComponentFramework.LookupValue> => {
      try {
        // Get metadata to find collection name
        const metadata = await getEntityMetadata(entityLogicalName)
        const collectionName = metadata.LogicalCollectionName
        const url = `/api/data/v9.2/${collectionName}(${id})`

        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Update Error Response:`, errorText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        console.log(`✅ Updated record ${id} for ${entityLogicalName}`)
        return {
          id: formatGuid(id),
          name: '', // For updates, we don't have the name without additional fetch
          entityType: entityLogicalName,
        }
      } catch (error) {
        console.error(`Error updating record ${id} for ${entityLogicalName}:`, error)
        throw error
      }
    },

    deleteRecord: async (
      entityLogicalName: string,
      id: string
    ): Promise<ComponentFramework.LookupValue> => {
      try {
        // Get metadata to find collection name
        const metadata = await getEntityMetadata(entityLogicalName)
        const collectionName = metadata.LogicalCollectionName
        const url = `/api/data/v9.2/${collectionName}(${id})`

        const response = await fetch(url, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Delete Error Response:`, errorText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        console.log(`✅ Deleted record ${id} for ${entityLogicalName}`)
        return {
          id: formatGuid(id),
          name: '', // For deletes, we don't have the name without additional fetch
          entityType: entityLogicalName,
        }
      } catch (error) {
        console.error(`Error deleting record ${id} for ${entityLogicalName}:`, error)
        throw error
      }
    },
  }
}

/**
 * Helper function to create a mock dataset with proper structure
 */
function createMockDataSet(
  options?: {
    name?: string
    displayName?: string
    entityLogicalName?: string
    columns?: any[]
  } & Partial<ComponentFramework.PropertyTypes.DataSet>
): ComponentFramework.PropertyTypes.DataSet {
  const viewId = crypto.randomUUID()

  const defaultColumns = [
    {
      name: 'name',
      displayName: 'Name',
      dataType: 'SingleLine.Text',
      alias: 'name',
      order: 1,
      visualSizeFactor: 1,
    },
  ]

  return {
    getViewId: () => viewId,
    getTargetEntityType: () => options?.entityLogicalName || 'account',
    isUserView: () => false,
    loading: false,
    paging: {
      totalResultCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    sorting: [],
    columns: (options?.columns ||
      defaultColumns) as ComponentFramework.PropertyHelper.DataSetApi.Column[],
    records: {},
    clearSelectedRecordIds: () => {},
    getSelectedRecordIds: () => [],
    setSelectedRecordIds: () => {},
    refresh: () => Promise.resolve(),
    openDatasetItem: () => {},
    ...options,
  } as ComponentFramework.PropertyTypes.DataSet
}

// Removed getMockDatasetConfig - datasets are now configured dynamically based on discovered form data

/**
 * Creates a mock PCF context with realistic PowerApps data
 * For datasets, we'll create a minimal dataset that can be configured dynamically
 */
export function createMockContext<TInputs>(options?: {
  controlId?: string
  viewId?: string
  displayName?: string
  userName?: string
  userId?: string
  datasetOptions?: Partial<ComponentFramework.PropertyTypes.DataSet>
  webAPI?: Partial<ComponentFramework.WebApi>
  entityType?: string
}): ComponentFramework.Context<TInputs> {
  const {
    controlId = `id-${crypto.randomUUID()}`,
    viewId = crypto.randomUUID(),
    displayName = 'Dev User',
    userName = 'devuser@contoso.com',
    userId = 'dev-user-id',
    datasetOptions = {},
    webAPI: customWebAPI = {},
    entityType = 'unknown',
  } = options || {}

  console.log('🔧 Creating mock context...', { entityType })

  // Check for environment variable overrides
  const envTargetTable = (import.meta.env.VITE_PCF_TARGET_TABLE as string) || entityType
  const envPageTable = (import.meta.env.VITE_PCF_PAGE_TABLE as string) || entityType
  
  if (envTargetTable !== entityType) {
    console.log(`📋 Using VITE_PCF_TARGET_TABLE environment variable: ${envTargetTable}`)
  }

  // Create sampleDataSet with minimal configuration
  // Use environment variable if available, otherwise will be updated when form is discovered
  const sampleDataSet = createMockDataSet({
    name: 'sampleDataSet',
    displayName: 'Dataset_Display_Key',
    entityLogicalName: envTargetTable !== 'unknown' ? envTargetTable : 'unknown',
    columns: [], // Will be populated based on discovered entity
    ...datasetOptions,
  })
  
  // Set the initial _targetEntityType
  ;(sampleDataSet as any)._targetEntityType = envTargetTable !== 'unknown' ? envTargetTable : undefined
  
  // Make getTargetEntityType configurable
  Object.defineProperty(sampleDataSet, 'getTargetEntityType', {
    value: function() {
      const envValue = import.meta.env.VITE_PCF_TARGET_TABLE as string
      if (envValue && envValue !== 'unknown') {
        return envValue
      }
      return (this as any)._targetEntityType || (this as any).entityLogicalName || 'unknown'
    },
    writable: true,
    configurable: true
  })

  console.log('🔧 Created sampleDataSet with structure:', {
    entityType: entityType,
    hasRecords: 'records' in sampleDataSet,
    hasColumns: 'columns' in sampleDataSet,
    recordCount: Object.keys(sampleDataSet.records || {}).length,
    columnCount: sampleDataSet.columns?.length || 0,
  })

  return {
    accessibility: {
      _customControlProperties: {
        descriptor: {
          DomId: controlId,
          UniqueId: controlId + '_unique',
        },
      },
    },
    page: {
      entityTypeName: envPageTable,
      entityId: crypto.randomUUID(),
      isVisible: true,
    } as any,
    parameters: {
      sampleDataSet,
    } as any,
    factory: {
      requestRender: () => {},
      getPopupService: () => ({}) as any,
    } as any,
    events: {} as any,
    copilot: {} as any,
    mode: {
      trackContainerResize: () => {},
      isControlDisabled: false,
      isVisible: true,
    },
    client: {
      getClient: () => 'Web',
      disableScroll: () => {},
      getFormFactor: () => 0,
      isOffline: false,
      isNetworkAvailable: true,
    },
    device: {
      captureAudio: () => Promise.resolve(),
      captureImage: () => Promise.resolve(),
      captureVideo: () => Promise.resolve(),
      getBarcodeValue: () => Promise.resolve(),
      getCurrentPosition: () => Promise.resolve(),
      pickFile: () => Promise.resolve(),
    },
    formatting: {
      formatCurrency: (value: number) => `$${value}`,
      formatDateLong: (value: Date) => value.toLocaleDateString(),
      formatDateShort: (value: Date) => value.toLocaleDateString(),
      formatDateYearMonth: (value: Date) => value.toLocaleDateString(),
      formatDecimal: (value: number) => value.toString(),
      formatInteger: (value: number) => Math.round(value).toString(),
      formatLanguage: (value: number) => value.toString(),
      formatTime: (value: Date) => value.toLocaleTimeString(),
      getWeekOfYear: (value: Date) => 1,
    },
    navigation: {
      openAlertDialog: () => Promise.resolve(),
      openConfirmDialog: () => Promise.resolve(),
      openErrorDialog: () => Promise.resolve(),
      openFile: () => Promise.resolve(),
      openForm: () => Promise.resolve(),
      openUrl: () => {},
      openWebResource: () => {},
    },
    resources: {
      getString: (id: string) => id,
      getResource: (id: string) => '',
    },
    updatedProperties: [],
    userSettings: {
      dateFormattingInfo: {
        abbreviatedDayNames: [],
        abbreviatedMonthNames: [],
        amDesignator: 'AM',
        calendar: {},
        calendarWeekRule: 0,
        dayNames: [],
        firstDayOfWeek: 0,
        fullDateTimePattern: '',
        longDatePattern: '',
        longTimePattern: '',
        monthDayPattern: '',
        monthNames: [],
        pmDesignator: 'PM',
        shortDatePattern: '',
        shortTimePattern: '',
        shortestDayNames: [],
        sortableDateTimePattern: '',
        timeSeparator: ':',
        universalSortableDateTimePattern: '',
        yearMonthPattern: '',
      },
      displayName,
      isRTL: false,
      languageId: 1033,
      numberFormattingInfo: {
        currencyDecimalDigits: 2,
        currencyDecimalSeparator: '.',
        currencyGroupSeparator: ',',
        currencyGroupSizes: [3],
        currencyNegativePattern: 0,
        currencyPositivePattern: 0,
        currencySymbol: '$',
        naNSymbol: 'NaN',
        nativeDigits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        negativeInfinitySymbol: '-∞',
        negativeSign: '-',
        numberDecimalDigits: 2,
        numberDecimalSeparator: '.',
        numberGroupSeparator: ',',
        numberGroupSizes: [3],
        numberNegativePattern: 1,
        percentDecimalDigits: 2,
        percentDecimalSeparator: '.',
        percentGroupSeparator: ',',
        percentGroupSizes: [3],
        percentNegativePattern: 0,
        percentPositivePattern: 0,
        percentSymbol: '%',
        perMilleSymbol: '‰',
        positiveInfinitySymbol: '∞',
        positiveSign: '+',
      },
      securityRoles: [],
      userId,
      userName,
    },
    utils: {
      getEntityMetadata: () => Promise.resolve({} as any),
      hasEntityPrivilege: () => false,
      lookupObjects: () => Promise.resolve([]),
    },
    webAPI: {
      ...createDefaultWebAPI(),
      ...customWebAPI,
    },
  } as any as ComponentFramework.Context<TInputs>
}
