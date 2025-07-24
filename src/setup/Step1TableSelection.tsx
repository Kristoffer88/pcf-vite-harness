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
  type ISearchBox,
} from '@fluentui/react'
import type * as React from 'react'
import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { discoverEntitiesWithDisplayNames, type EntityInfo } from '../utils/viewDiscovery'
import type { SetupWizardData } from './types'
import { WizardLayout, type WizardLayoutRef } from './WizardLayout'

export interface Step1TableSelectionProps {
  data: SetupWizardData
  onUpdate: (updates: Partial<SetupWizardData>) => void
  onNext: () => void
  onSkip: () => void
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
  onSkip,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [entities, setEntities] = useState<EntityInfo[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [showResults, setShowResults] = useState(false)
  const wizardLayoutRef = useRef<WizardLayoutRef>(null)
  const searchBoxRef = useRef<ISearchBox>(null)

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

  // Auto-focus SearchBox when loading completes
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        searchBoxRef.current?.focus()
      }, 100)
    }
  }, [isLoading])

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
    console.log('🔍 Step1 handleSearchChange called:', { 
      eventType: event?.type, 
      oldValue: searchValue, 
      newValue: value,
      valueLength: value.length
    })
    setSearchValue(value)
    setShowResults(value.length > 0)
  }, [searchValue])

  // Handle entity selection
  const handleEntitySelect = useCallback((entity: EntityInfo) => {
    console.log('🎯 Step1: handleEntitySelect called with:', entity)
    onUpdate({
      pageTable: entity.logicalName,
      pageTableName: entity.displayName,
      // Clear page record ID when table changes
      pageRecordId: undefined,
    })
    setSearchValue(entity.displayText)
    setShowResults(false)
    console.log('✅ Step1: Entity selection completed')
    
    // Auto-focus the Continue button after selection
    setTimeout(() => {
      wizardLayoutRef.current?.focusContinueButton()
    }, 100)
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
    const isTopResult = index === 0 && showResults && filteredEntities.length > 0
    
    let itemClassName = classNames.entityItem
    if (isSelected) {
      itemClassName = mergeStyles(classNames.entityItem, classNames.selectedItem)
    } else if (isTopResult) {
      // Highlight top result to show it would be selected by Enter
      itemClassName = mergeStyles(classNames.entityItem, {
        backgroundColor: '#f8f9fa',
        borderLeft: '3px solid #0078d4'
      })
    }

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
        <Text variant="medium">
          {item.displayText}
          {isTopResult && (
            <Text variant="small" styles={{ root: { color: '#0078d4', marginLeft: 8 } }}>
              ↵ Press Enter
            </Text>
          )}
        </Text>
      </div>
    )
  }, [data.pageTable, handleEntitySelect, classNames, showResults, filteredEntities.length])

  const handleSkip = useCallback(() => {
    // Use the skip handler to jump directly to step 3
    onSkip()
  }, [onSkip])

  const handlePrevious = useCallback(() => {
    // This is the first step, so no previous action
  }, [])

  return (
    <WizardLayout
      ref={wizardLayoutRef}
      title="Select Page Table"
      description="Choose the page table where your PCF component will be displayed (optional). If you skip this step, the PCF will work without a specific page context."
      canGoNext={true} // Always can proceed (optional step)
      canGoPrevious={false}
      isLoading={isLoading}
      error={error}
      onNext={onNext}
      onPrevious={handlePrevious}
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
              componentRef={searchBoxRef}
              placeholder="Search for a table (optional)"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onClear={handleClear}
              onSearch={() => {
                // Select the top result when Enter is pressed
                if (showResults && filteredEntities.length > 0 && filteredEntities[0]) {
                  handleEntitySelect(filteredEntities[0])
                }
              }}
              disabled={isLoading}
              autoComplete="off"
              styles={{ root: { width: '100%' } }}
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  e.stopPropagation()
                }
              }}
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
