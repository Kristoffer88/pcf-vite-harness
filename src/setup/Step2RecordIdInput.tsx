/**
 * Step2RecordIdInput - Select page record from dropdown when page table is selected
 */

import {
  SearchBox,
  MessageBar,
  MessageBarType,
  Stack,
  Text,
  FocusZone,
  List,
  mergeStyles,
  mergeStyleSets,
} from '@fluentui/react'
import type * as React from 'react'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { searchRecordsFromTable, type RecordInfo } from '../utils/viewDiscovery'
import type { SetupWizardData } from './types'
import { WizardLayout } from './WizardLayout'

// Styles for the record list (copied from Step1)
const classNames = mergeStyleSets({
  listContainer: {
    border: '1px solid #d1d1d1',
    borderRadius: '2px',
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: 'white',
  },
  recordItem: {
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f2f1',
    ':hover': {
      backgroundColor: '#f3f2f1',
    },
    ':last-child': {
      borderBottom: 'none',
    },
  },
  selectedItem: {
    backgroundColor: '#deecf9',
    ':hover': {
      backgroundColor: '#c7e0f4',
    },
  },
  noResults: {
    padding: '12px',
    color: '#605e5c',
    fontStyle: 'italic',
    textAlign: 'center',
  },
})

export interface Step2RecordIdInputProps {
  data: SetupWizardData
  onUpdate: (updates: Partial<SetupWizardData>) => void
  onNext: () => void
  onPrevious: () => void
  onCancel: () => void
}

export const Step2RecordIdInput: React.FC<Step2RecordIdInputProps> = ({
  data,
  onUpdate,
  onNext,
  onPrevious,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [records, setRecords] = useState<RecordInfo[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [showResults, setShowResults] = useState(false)

  // Check if page table was selected
  const hasPageTable = Boolean(data.pageTable)

  // Load records from the page table
  const loadRecords = useCallback(async (searchTerm?: string) => {
    if (!data.pageTable) return

    setIsLoading(true)
    setError(undefined)

    try {
      const recordList = await searchRecordsFromTable(data.pageTable, searchTerm)
      setRecords(recordList)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load records'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [data.pageTable])

  // Load initial records on mount
  useEffect(() => {
    if (hasPageTable) {
      loadRecords()
    }
  }, [hasPageTable, loadRecords])

  // Initialize search value with existing selection
  useEffect(() => {
    if (data.pageRecordId && !searchValue) {
      // Find the record display text if we have the ID
      const selectedRecord = records.find(r => r.id === data.pageRecordId)
      if (selectedRecord) {
        setSearchValue(selectedRecord.displayText)
      }
    }
  }, [data.pageRecordId, searchValue, records])

  // Filter records based on search value
  const filteredRecords = useMemo(() => {
    if (!searchValue.trim()) return records
    const search = searchValue.toLowerCase()
    return records.filter(record => 
      record.displayText.toLowerCase().includes(search) ||
      record.id.toLowerCase().includes(search) ||
      record.primaryName.toLowerCase().includes(search)
    )
  }, [records, searchValue])

  // Handle search input changes
  const handleSearchChange = useCallback((event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    const value = newValue || ''
    setSearchValue(value)
    setShowResults(value.length > 0)
    
    // Load records with search term
    if (value.length > 2) {
      loadRecords(value)
    }
  }, [loadRecords])

  // Handle record selection
  const handleRecordSelect = useCallback((record: RecordInfo) => {
    onUpdate({
      pageRecordId: record.id,
    })
    setSearchValue(record.displayText)
    setShowResults(false)
  }, [onUpdate])

  // Handle clearing the selection
  const handleClear = useCallback(() => {
    setSearchValue('')
    setShowResults(false)
    onUpdate({
      pageRecordId: undefined,
    })
  }, [onUpdate])

  // Handle search box focus
  const handleSearchFocus = useCallback(() => {
    if (searchValue.length > 0) {
      setShowResults(true)
    }
  }, [searchValue])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-search-container]')) {
        setShowResults(false)
      }
    }

    if (showResults) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
    
    return undefined
  }, [showResults])

  // Render record item in the list
  const renderRecordItem = useCallback((item?: RecordInfo, index?: number) => {
    if (!item) return null
    
    const isSelected = item.id === data.pageRecordId
    const itemClassName = isSelected 
      ? mergeStyles(classNames.recordItem, classNames.selectedItem)
      : classNames.recordItem

    return (
      <div
        key={item.id}
        className={itemClassName}
        onClick={() => handleRecordSelect(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleRecordSelect(item)
          }
        }}
      >
        <Text variant="medium">{item.displayText}</Text>
      </div>
    )
  }, [data.pageRecordId, handleRecordSelect, classNames])

  const handleSkip = useCallback(() => {
    // Clear record ID and proceed
    onUpdate({ pageRecordId: undefined })
    onNext()
  }, [onUpdate, onNext])

  const canProceed = useMemo(() => {
    if (!hasPageTable) {
      // No page table selected, can always proceed
      return true
    }

    // Can proceed if we have a record selected OR if we skip
    return Boolean(data.pageRecordId)
  }, [hasPageTable, data.pageRecordId])

  // If no page table was selected, auto-proceed
  if (!hasPageTable) {
    return (
      <WizardLayout
        title="Page Record ID"
        description="No page table was selected, so this step is automatically skipped."
        canGoNext={true}
        canGoPrevious={true}
        onNext={onNext}
        onPrevious={onPrevious}
        onCancel={onCancel}
        nextLabel="Continue"
      >
        <Stack tokens={{ childrenGap: 20 }}>
          <MessageBar messageBarType={MessageBarType.info}>
            Since you didn't select a page table in the previous step, you don't need to provide a
            page record ID. Click Continue to proceed to the next step.
          </MessageBar>
        </Stack>
      </WizardLayout>
    )
  }

  return (
    <WizardLayout
      title="Select Page Record"
      description={`Choose the specific ${data.pageTableName || data.pageTable} record where your PCF component will be displayed (optional).`}
      canGoNext={true} // Always can proceed (optional step)
      canGoPrevious={true}
      isLoading={isLoading}
      error={error}
      onNext={onNext}
      onPrevious={onPrevious}
      onCancel={onCancel}
      nextLabel="Continue"
    >
      <Stack tokens={{ childrenGap: 20 }}>
        {/* Information */}
        <MessageBar messageBarType={MessageBarType.info}>
          Search and select a specific {data.pageTableName || data.pageTable} record to provide
          context for your PCF component testing. This step is optional.
        </MessageBar>

        {/* Current Page Table */}
        <Stack tokens={{ childrenGap: 5 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            Page Table:
          </Text>
          <Text variant="medium">{data.pageTableName || data.pageTable}</Text>
        </Stack>

        {/* Record Selection */}
        <Stack tokens={{ childrenGap: 10 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            Page Record
          </Text>
          <div style={{ position: 'relative', maxWidth: 400 }} data-search-container>
            <SearchBox
              placeholder={`Search for a ${data.pageTableName || data.pageTable} record (optional)`}
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onClear={handleClear}
              disabled={isLoading}
              styles={{ root: { width: '100%' } }}
            />
            
            {/* Search Results */}
            {showResults && filteredRecords.length > 0 && (
              <div className={classNames.listContainer} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }}>
                <FocusZone>
                  <List
                    items={filteredRecords.slice(0, 50)} // Limit to first 50 results
                    onRenderCell={renderRecordItem}
                  />
                </FocusZone>
              </div>
            )}
            
            {/* No Results Message */}
            {showResults && filteredRecords.length === 0 && searchValue.trim() && (
              <div className={classNames.listContainer} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }}>
                <div className={classNames.noResults}>
                  No records found matching "{searchValue}"
                </div>
              </div>
            )}
          </div>
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            Start typing to search for a specific record, or skip this step to continue without record context.
          </Text>
        </Stack>

        {/* Current Selection */}
        {data.pageRecordId && (
          <Stack tokens={{ childrenGap: 5 }}>
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              Selected Record:
            </Text>
            <Text variant="medium">{searchValue || data.pageRecordId}</Text>
          </Stack>
        )}

        {/* Skip Option */}
        <Stack horizontalAlign="start">
          <Text
            variant="medium"
            styles={{
              root: {
                color: '#0078d4',
                cursor: 'pointer',
                textDecoration: 'underline',
              },
            }}
            onClick={handleSkip}
          >
            Skip this step and continue without specific record context
          </Text>
        </Stack>
      </Stack>
    </WizardLayout>
  )
}
