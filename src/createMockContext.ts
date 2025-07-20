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
}): ComponentFramework.Context<TInputs> {
  const {
    controlId = `id-${crypto.randomUUID()}`,
    viewId = crypto.randomUUID(),
    displayName = 'Dev User',
    userName = 'devuser@contoso.com',
    userId = 'dev-user-id',
    datasetOptions = {},
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
      createRecord: () => Promise.resolve({} as any),
      deleteRecord: () => Promise.resolve({} as any),
      retrieveMultipleRecords: () => Promise.resolve({} as any),
      retrieveRecord: () => Promise.resolve({} as any),
      updateRecord: () => Promise.resolve({} as any),
    },
  } as any as ComponentFramework.Context<TInputs>
}
