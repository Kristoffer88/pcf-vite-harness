/**
 * Step3TargetTableSelection - Select target/record table (required)
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
  Toggle,
  type ISearchBox,
} from '@fluentui/react'
import type * as React from 'react'
import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { discoverEntitiesWithDisplayNames, getEntitiesWithLookupsToParent, type EntityInfo } from '../utils/viewDiscovery'
import type { SetupWizardData } from './types'
import { WizardLayout, type WizardLayoutRef } from './WizardLayout'

export interface Step3TargetTableSelectionProps {
  data: SetupWizardData
  onUpdate: (updates: Partial<SetupWizardData>) => void
  onNext: () => void
  onPrevious: () => void
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

export const Step3TargetTableSelection: React.FC<Step3TargetTableSelectionProps> = ({
  data,
  onUpdate,
  onNext,
  onPrevious,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [entities, setEntities] = useState<EntityInfo[]>([])
  const [relatedEntities, setRelatedEntities] = useState<EntityInfo[]>([])
  const [useRelationshipFilter, setUseRelationshipFilter] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [relationshipWarning, setRelationshipWarning] = useState<string>()
  const wizardLayoutRef = useRef<WizardLayoutRef>(null)
  const searchBoxRef = useRef<ISearchBox>(null)

  // Load entities with views
  const loadEntities = useCallback(async () => {
    setIsLoading(true)
    setError(undefined)

    try {
      // Always load all entities
      const entityList = await discoverEntitiesWithDisplayNames()
      setEntities(entityList)
      
      // If we have a parent table, also load related entities
      if (data.pageTable) {
        const relatedEntityList = await getEntitiesWithLookupsToParent(data.pageTable)
        setRelatedEntities(relatedEntityList)
        console.log(`🔗 Found ${relatedEntityList.length} entities with lookups to ${data.pageTable}:`, 
                   relatedEntityList.map(e => e.logicalName))
      } else {
        setRelatedEntities([])
        setUseRelationshipFilter(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load entities'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [data.pageTable])

  // Load entities on mount
  useEffect(() => {
    loadEntities()
  }, [loadEntities])

  // Initialize search value with existing selection
  useEffect(() => {
    if (data.targetTable && !searchValue) {
      setSearchValue(data.targetTable)
    }
  }, [data.targetTable, searchValue])

  // Auto-focus SearchBox when loading completes
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        searchBoxRef.current?.focus()
      }, 100)
    }
  }, [isLoading])

  // Get base entities list (either all entities or filtered by relationships)
  const baseEntities = useMemo(() => {
    if (useRelationshipFilter && relatedEntities.length > 0) {
      // Include both the parent table itself and related entities
      const allRelevantEntities = [...relatedEntities]
      
      // Add the parent table if it's not already in the list
      if (data.pageTable) {
        const parentInRelated = relatedEntities.find(e => e.logicalName === data.pageTable)
        if (!parentInRelated) {
          const parentEntity = entities.find(e => e.logicalName === data.pageTable)
          if (parentEntity) {
            allRelevantEntities.unshift(parentEntity) // Add at beginning
          }
        }
      }
      
      return allRelevantEntities.sort((a, b) => a.displayName.localeCompare(b.displayName))
    }
    return entities
  }, [entities, relatedEntities, useRelationshipFilter, data.pageTable])

  // Filter entities based on search value
  const filteredEntities = useMemo(() => {
    if (!searchValue.trim()) return baseEntities
    const search = searchValue.toLowerCase()
    return baseEntities.filter(entity => 
      entity.displayText.toLowerCase().includes(search) ||
      entity.logicalName.toLowerCase().includes(search) ||
      entity.displayName.toLowerCase().includes(search)
    )
  }, [baseEntities, searchValue])

  // Check relationship between page table and target table
  const checkRelationship = useCallback(
    (targetTable: string) => {
      if (data.pageTable && data.pageTable === targetTable) {
        setRelationshipWarning(
          'The target table is the same as the page table. This is valid for field-based PCF components.'
        )
      } else if (data.pageTable && data.pageTable !== targetTable) {
        // Check if there's a relationship between the tables
        const hasRelationship = relatedEntities.some(entity => entity.logicalName === targetTable)
        
        if (hasRelationship) {
          setRelationshipWarning(
            `✅ Relationship confirmed between ${data.pageTable} and ${targetTable}.`
          )
        } else {
          setRelationshipWarning(
            `The target table (${targetTable}) is different from the page table (${data.pageTable}). ` +
              'Make sure there is a relationship between these tables for dataset-based PCF components.'
          )
        }
      } else {
        setRelationshipWarning(undefined)
      }
    },
    [data.pageTable, relatedEntities]
  )

  // Handle search input changes
  const handleSearchChange = useCallback((event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    const value = newValue || ''
    setSearchValue(value)
    setShowResults(value.length > 0)
  }, [])

  // Handle entity selection
  const handleEntitySelect = useCallback((entity: EntityInfo) => {
    onUpdate({
      targetTable: entity.logicalName,
      targetTableName: entity.displayName,
    })
    setSearchValue(entity.displayText)
    setShowResults(false)
    
    // Check relationship with page table
    checkRelationship(entity.logicalName)
    
    // Auto-focus the Continue button after selection
    setTimeout(() => {
      wizardLayoutRef.current?.focusContinueButton()
    }, 100)
  }, [onUpdate, checkRelationship])

  // Handle clearing the selection
  const handleClear = useCallback(() => {
    setSearchValue('')
    setShowResults(false)
    setRelationshipWarning(undefined)
    onUpdate({
      targetTable: '',
      targetTableName: undefined,
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
    
    const isSelected = item.logicalName === data.targetTable
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
  }, [data.targetTable, handleEntitySelect, classNames])

  const canProceed = Boolean(data.targetTable?.trim())

  return (
    <WizardLayout
      ref={wizardLayoutRef}
      title="Select Target Table"
      description="Choose the target/record table that your PCF component will work with. This is required."
      canGoNext={canProceed}
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
          Select the table that your PCF component will display or interact with. This could be the
          same as your page table (for field components) or a different table (for dataset
          components).
        </MessageBar>

        {/* Page Table Context */}
        {data.pageTable && (
          <Stack tokens={{ childrenGap: 5 }}>
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              Page Table Context:
            </Text>
            <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
              {data.pageTableName || data.pageTable}
              {data.pageRecordId && ` (Record: ${data.pageRecordId})`}
            </Text>
          </Stack>
        )}

        {/* Relationship Filter Toggle */}
        {data.pageTable && relatedEntities.length > 0 && (
          <Stack tokens={{ childrenGap: 10 }}>
            <Toggle
              label="Show only tables with lookups to page table"
              checked={useRelationshipFilter}
              onChange={(_, checked) => setUseRelationshipFilter(checked || false)}
              onText={`Showing ${relatedEntities.length + 1} related tables`}
              offText={`Showing all ${entities.length} tables`}
            />
            <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
              {useRelationshipFilter
                ? `Tables that have lookup relationships to ${data.pageTableName || data.pageTable}`
                : 'All available tables in the system'
              }
            </Text>
          </Stack>
        )}

        {/* No Related Tables Warning */}
        {data.pageTable && relatedEntities.length === 0 && !isLoading && (
          <MessageBar messageBarType={MessageBarType.warning}>
            No tables found with lookup relationships to {data.pageTableName || data.pageTable}. 
            Showing all available tables instead.
          </MessageBar>
        )}

        {/* Entity Selection */}
        <Stack tokens={{ childrenGap: 10 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            Target Table *
          </Text>
          <div style={{ position: 'relative', maxWidth: 400 }} data-search-container>
            <SearchBox
              componentRef={searchBoxRef}
              placeholder="Search for the target table"
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
            Start typing to search for the table that your PCF component will display records from or interact with.
          </Text>
        </Stack>

        {/* Relationship Warning */}
        {relationshipWarning && (
          <MessageBar
            messageBarType={
              data.pageTable === data.targetTable || relationshipWarning.startsWith('✅') 
                ? MessageBarType.success 
                : MessageBarType.warning
            }
          >
            {relationshipWarning}
          </MessageBar>
        )}

        {/* Current Selection */}
        {data.targetTable && (
          <Stack tokens={{ childrenGap: 5 }}>
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              Selected Target Table:
            </Text>
            <Text variant="medium">{data.targetTableName || data.targetTable}</Text>
          </Stack>
        )}

        {/* Validation Message */}
        {!canProceed && (
          <MessageBar messageBarType={MessageBarType.error}>
            Please select a target table to continue.
          </MessageBar>
        )}
      </Stack>
    </WizardLayout>
  )
}
