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
  type ISearchBox,
} from '@fluentui/react'
import type * as React from 'react'
import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { searchRecordsFromTable, type RecordInfo } from '../utils/viewDiscovery'
import type { SetupWizardData } from './types'
import { WizardLayout, type WizardLayoutRef } from './WizardLayout'

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
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const wizardLayoutRef = useRef<WizardLayoutRef>(null)
  const searchBoxRef = useRef<ISearchBox>(null)

  // Debug state changes
  useEffect(() => {
    console.log('📊 Step2 State Change - isLoading:', isLoading)
  }, [isLoading])
  
  useEffect(() => {
    console.log('📊 Step2 State Change - records:', records.length, 'items')
  }, [records])
  
  useEffect(() => {
    console.log('📊 Step2 State Change - searchValue:', `"${searchValue}"`)
  }, [searchValue])
  
  useEffect(() => {
    console.log('📊 Step2 State Change - showResults:', showResults)
  }, [showResults])

  // Check if page table was selected
  const hasPageTable = Boolean(data.pageTable)

  // Auto-focus SearchBox when loading completes
  useEffect(() => {
    if (!isLoading && hasPageTable) {
      setTimeout(() => {
        searchBoxRef.current?.focus()
      }, 100)
    }
  }, [isLoading, hasPageTable])

  // Load records from the page table
  const loadRecords = useCallback(async (searchTerm?: string) => {
    console.log('📦 Step2 loadRecords called:', { pageTable: data.pageTable, searchTerm })
    console.trace('📦 Step2 loadRecords call stack')
    
    if (!data.pageTable) return

    setIsLoading(true)
    setError(undefined)

    try {
      console.log('🌐 About to call searchRecordsFromTable...')
      const recordList = await searchRecordsFromTable(data.pageTable, searchTerm)
      console.log('✅ Step2 loadRecords success:', recordList.length, 'records')
      setRecords(recordList)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load records'
      console.error('❌ Step2 loadRecords error:', err)
      console.error('❌ Error details:', { 
        message: errorMessage, 
        stack: err instanceof Error ? err.stack : 'No stack',
        name: err instanceof Error ? err.name : 'Unknown error type'
      })
      setError(errorMessage)
      
      // Prevent any potential page refresh from uncaught errors
      if (err instanceof Error && err.message.includes('redirect')) {
        console.error('🚨 Detected redirect error - preventing page refresh')
      }
    } finally {
      console.log('🏁 Step2 loadRecords finally block - setting loading to false')
      setIsLoading(false)
    }
  }, [data.pageTable])

  // Load initial records on mount
  useEffect(() => {
    console.log('🔄 Step2 useEffect[hasPageTable, loadRecords] triggered:', { hasPageTable })
    if (hasPageTable) {
      console.log('📦 Step2 calling loadRecords from initial mount effect')
      loadRecords()
    }
  }, [hasPageTable, loadRecords])

  // Initialize search value with existing selection
  useEffect(() => {
    console.log('🔄 Step2 useEffect[pageRecordId, searchValue, records] triggered:', { 
      pageRecordId: data.pageRecordId, 
      searchValue, 
      recordsLength: records.length 
    })
    if (data.pageRecordId && !searchValue) {
      // Find the record display text if we have the ID
      const selectedRecord = records.find(r => r.id === data.pageRecordId)
      if (selectedRecord) {
        console.log('🔤 Step2 setting searchValue from selected record:', selectedRecord.displayText)
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
    console.log('🔍 Step2 handleSearchChange called:', { 
      eventType: event?.type, 
      oldValue: searchValue, 
      newValue: value,
      valueLength: value.length,
      willLoadRecords: value.length > 2
    })
    setSearchValue(value)
    setShowResults(value.length > 0)
    setHighlightedIndex(0) // Reset highlight when search changes
    
    // Load records with search term
    if (value.length > 2) {
      console.log('🚀 Step2 calling loadRecords with:', value)
      loadRecords(value)
    }
  }, [loadRecords]) // ❌ REMOVED searchValue from dependencies - this was causing re-renders!

  // Handle record selection
  const handleRecordSelect = useCallback((record: RecordInfo) => {
    console.log('🎯 Step2: handleRecordSelect called with:', record)
    onUpdate({
      pageRecordId: record.id,
    })
    setSearchValue(record.displayText)
    setShowResults(false)
    setHighlightedIndex(0)
    console.log('✅ Step2: Record selection completed')
    
    // Auto-focus the Continue button after selection
    setTimeout(() => {
      wizardLayoutRef.current?.focusContinueButton()
    }, 100)
  }, [onUpdate])

  // Handle clearing the selection
  const handleClear = useCallback(() => {
    setSearchValue('')
    setShowResults(false)
    setHighlightedIndex(0)
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

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || filteredRecords.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredRecords.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredRecords[highlightedIndex]) {
          handleRecordSelect(filteredRecords[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowResults(false)
        setHighlightedIndex(0)
        break
      case ' ':
        e.stopPropagation()
        break
    }
  }, [showResults, filteredRecords, highlightedIndex, handleRecordSelect])

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
    const isHighlighted = index === highlightedIndex && showResults
    
    let itemClassName = classNames.recordItem
    if (isSelected) {
      itemClassName = mergeStyles(classNames.recordItem, classNames.selectedItem)
    } else if (isHighlighted) {
      // Highlight the keyboard-navigated item
      itemClassName = mergeStyles(classNames.recordItem, {
        backgroundColor: '#f8f9fa',
        borderLeft: '3px solid #0078d4'
      })
    }

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
        <Text variant="medium">
          {item.displayText}
          {isHighlighted && (
            <Text variant="small" styles={{ root: { color: '#0078d4', marginLeft: 8 } }}>
              ↵ Press Enter
            </Text>
          )}
        </Text>
      </div>
    )
  }, [data.pageRecordId, handleRecordSelect, classNames, showResults, highlightedIndex])

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
        ref={wizardLayoutRef}
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
      ref={wizardLayoutRef}
      title="Select Page Record"
      description={`Choose the specific ${data.pageTableName || data.pageTable} record where your PCF component will be displayed (optional).`}
      canGoNext={true} // Always can proceed (optional step)
      canGoPrevious={true}
      isLoading={false} // ❌ FIXED: Never hide the entire UI for search loading
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
              componentRef={searchBoxRef}
              placeholder={`Search for a ${data.pageTableName || data.pageTable} record (optional)`}
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onClear={handleClear}
              onSearch={() => {
                // Select the highlighted result when Enter is pressed
                if (showResults && filteredRecords.length > 0 && filteredRecords[highlightedIndex]) {
                  handleRecordSelect(filteredRecords[highlightedIndex])
                }
              }}
              disabled={false}
              autoComplete="off"
              // ✅ FIXED: Use built-in SearchBox loading state
              iconProps={isLoading ? { iconName: 'Loading' } : undefined}
              styles={{ 
                root: { width: '100%' },
                // Make loading icon spin
                icon: isLoading ? {
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                } : undefined
              }}
              onKeyDown={handleKeyDown}
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
