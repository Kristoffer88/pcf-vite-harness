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
  const response = await fetch(
    `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')`
  )
  if (!response.ok) {
    throw new Error(`Failed to get metadata for ${entityLogicalName}: ${response.status}`)
  }
  return response.json()
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


        const response = await fetch(url)
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API Error Response:`, errorText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log(`✅ Retrieved ${result.value?.length || 0} records for ${entityLogicalName}`)

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
 * Creates a mock PCF context with realistic PowerApps data
 */
export function createMockContext<TInputs>(options?: {
  controlId?: string
  viewId?: string
  displayName?: string
  userName?: string
  userId?: string
  datasetOptions?: Partial<ComponentFramework.PropertyTypes.DataSet>
  webAPI?: Partial<ComponentFramework.WebApi>
}): ComponentFramework.Context<TInputs> {
  const {
    controlId = `id-${crypto.randomUUID()}`,
    viewId = crypto.randomUUID(),
    displayName = 'Dev User',
    userName = 'devuser@contoso.com',
    userId = 'dev-user-id',
    datasetOptions = {},
    webAPI: customWebAPI = {},
  } = options || {}

  const mockDataSet = {
    getViewId: () => viewId,
    loading: false,
    paging: {
      totalResultCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    sorting: [],
    columns: [],
    records: {},
    clearSelectedRecordIds: () => {},
    getSelectedRecordIds: () => [],
    setSelectedRecordIds: () => {},
    refresh: () => Promise.resolve(),
    openDatasetItem: () => {},
    ...datasetOptions,
  } as ComponentFramework.PropertyTypes.DataSet

  return {
    accessibility: {
      _customControlProperties: {
        descriptor: {
          DomId: controlId,
          UniqueId: controlId + '_unique',
        },
      },
    },
    parameters: {
      data: mockDataSet,
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
