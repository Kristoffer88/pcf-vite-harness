/**
 * Step1TableSelection - Select page table (optional)
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
import { discoverEntitiesWithDisplayNames, type EntityInfo } from '../utils/viewDiscovery'
import type { SetupWizardData } from './types'
import { WizardLayout } from './WizardLayout'

export interface Step1TableSelectionProps {
  data: SetupWizardData
  onUpdate: (updates: Partial<SetupWizardData>) => void
  onNext: () => void
  onCancel: () => void
}

// Styles for the entity list
const classNames = mergeStyleSets({
  listContainer: {
    border: '1px solid #d1d1d1',
    borderRadius: '2px',
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: 'white',
  },
  entityItem: {
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

export const Step1TableSelection: React.FC<Step1TableSelectionProps> = ({
  data,
  onUpdate,
  onNext,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [entities, setEntities] = useState<EntityInfo[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [showResults, setShowResults] = useState(false)

  // Load entities with views
  const loadEntities = useCallback(async () => {
    setIsLoading(true)
    setError(undefined)

    try {
      const entityList = await discoverEntitiesWithDisplayNames()
      setEntities(entityList) // Already sorted by display name
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load entities'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load entities on mount
  useEffect(() => {
    loadEntities()
  }, [loadEntities])

  // Initialize search value with existing selection
  useEffect(() => {
    if (data.pageTable && !searchValue) {
      setSearchValue(data.pageTable)
    }
  }, [data.pageTable, searchValue])

  // Filter entities based on search value
  const filteredEntities = useMemo(() => {
    if (!searchValue.trim()) return entities
    const search = searchValue.toLowerCase()
    return entities.filter(entity => 
      entity.displayText.toLowerCase().includes(search) ||
      entity.logicalName.toLowerCase().includes(search) ||
      entity.displayName.toLowerCase().includes(search)
    )
  }, [entities, searchValue])

  // Handle search input changes
  const handleSearchChange = useCallback((event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    const value = newValue || ''
    setSearchValue(value)
    setShowResults(value.length > 0)
  }, [])

  // Handle entity selection
  const handleEntitySelect = useCallback((entity: EntityInfo) => {
    onUpdate({
      pageTable: entity.logicalName,
      pageTableName: entity.displayName,
      // Clear page record ID when table changes
      pageRecordId: undefined,
    })
    setSearchValue(entity.displayText)
    setShowResults(false)
  }, [onUpdate])

  // Handle clearing the selection
  const handleClear = useCallback(() => {
    setSearchValue('')
    setShowResults(false)
    onUpdate({
      pageTable: undefined,
      pageTableName: undefined,
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

  // Render entity item in the list
  const renderEntityItem = useCallback((item?: EntityInfo, index?: number) => {
    if (!item) return null
    
    const isSelected = item.logicalName === data.pageTable
    const itemClassName = isSelected 
      ? mergeStyles(classNames.entityItem, classNames.selectedItem)
      : classNames.entityItem

    return (
      <div
        key={item.logicalName}
        className={itemClassName}
        onClick={() => handleEntitySelect(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleEntitySelect(item)
          }
        }}
      >
        <Text variant="medium">{item.displayText}</Text>
      </div>
    )
  }, [data.pageTable, handleEntitySelect, classNames])

  const handleSkip = useCallback(() => {
    // Clear page table data and proceed
    onUpdate({
      pageTable: undefined,
      pageTableName: undefined,
      pageRecordId: undefined,
    })
    onNext()
  }, [onUpdate, onNext])

  const handlePrevious = useCallback(() => {
    // This is the first step, so no previous action
  }, [])

  return (
    <WizardLayout
      title="Select Page Table"
      description="Choose the page table where your PCF component will be displayed (optional). If you skip this step, the PCF will work without a specific page context."
      canGoNext={true} // Always can proceed (optional step)
      canGoPrevious={false}
      isLoading={isLoading}
      error={error}
      onNext={onNext}
      onPrevious={handlePrevious}
      onCancel={onCancel}
      nextLabel="Continue"
    >
      <Stack tokens={{ childrenGap: 20 }}>
        {/* Information */}
        <MessageBar messageBarType={MessageBarType.info}>
          This step is optional. If you select a page table, you'll be able to test your PCF
          component with real page context and records. If you skip this step, the PCF will work in
          a standalone mode.
        </MessageBar>

        {/* Entity Selection */}
        <Stack tokens={{ childrenGap: 10 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            Page Table
          </Text>
          <div style={{ position: 'relative', maxWidth: 400 }} data-search-container>
            <SearchBox
              placeholder="Search for a table (optional)"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onClear={handleClear}
              disabled={isLoading}
              styles={{ root: { width: '100%' } }}
            />
            
            {/* Search Results */}
            {showResults && filteredEntities.length > 0 && (
              <div className={classNames.listContainer} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }}>
                <FocusZone>
                  <List
                    items={filteredEntities.slice(0, 50)} // Limit to first 50 results
                    onRenderCell={renderEntityItem}
                  />
                </FocusZone>
              </div>
            )}
            
            {/* No Results Message */}
            {showResults && filteredEntities.length === 0 && searchValue.trim() && (
              <div className={classNames.listContainer} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }}>
                <div className={classNames.noResults}>
                  No tables found matching "{searchValue}"
                </div>
              </div>
            )}
          </div>
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            Start typing to search for the table that contains the record where your PCF component will be displayed.
          </Text>
        </Stack>

        {/* Current Selection */}
        {data.pageTable && (
          <Stack tokens={{ childrenGap: 5 }}>
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              Selected Page Table:
            </Text>
            <Text variant="medium">{data.pageTableName || data.pageTable}</Text>
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
            Skip this step and continue without page context
          </Text>
        </Stack>
      </Stack>
    </WizardLayout>
  )
}
