/**
 * Step4ViewSelection - Select a view for the target table
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
import { getAllViewsForEntity, type ViewInfo } from '../utils/viewDiscovery'
import type { SetupWizardData } from './types'
import { WizardLayout } from './WizardLayout'

// Styles for the view list
const classNames = mergeStyleSets({
  listContainer: {
    border: '1px solid #d1d1d1',
    borderRadius: '2px',
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: 'white',
  },
  viewItem: {
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

export interface Step4ViewSelectionProps {
  data: SetupWizardData
  onUpdate: (updates: Partial<SetupWizardData>) => void
  onComplete: () => void
  onPrevious: () => void
  onCancel: () => void
}

export const Step4ViewSelection: React.FC<Step4ViewSelectionProps> = ({
  data,
  onUpdate,
  onComplete,
  onPrevious,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [views, setViews] = useState<ViewInfo[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [showResults, setShowResults] = useState(false)

  // Load views for the target table
  const loadViews = useCallback(async () => {
    if (!data.targetTable) return

    setIsLoading(true)
    setError(undefined)

    try {
      const viewList = await getAllViewsForEntity(data.targetTable)
      setViews(viewList)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load views'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [data.targetTable])

  // Load views on mount
  useEffect(() => {
    loadViews()
  }, [loadViews])

  // Initialize search value with existing selection
  useEffect(() => {
    if (data.selectedViewId && !searchValue) {
      // Find the view display text if we have the ID
      const selectedView = views.find(v => v.id === data.selectedViewId)
      if (selectedView) {
        setSearchValue(selectedView.name)
      }
    }
  }, [data.selectedViewId, searchValue, views])

  // Filter views based on search value
  const filteredViews = useMemo(() => {
    if (!searchValue.trim()) return views
    const search = searchValue.toLowerCase()
    return views.filter(view => 
      view.name.toLowerCase().includes(search) ||
      view.description?.toLowerCase().includes(search)
    )
  }, [views, searchValue])

  // Handle search input changes
  const handleSearchChange = useCallback((event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    const value = newValue || ''
    setSearchValue(value)
    setShowResults(value.length > 0)
  }, [])

  // Handle view selection
  const handleViewSelect = useCallback((view: ViewInfo) => {
    onUpdate({
      selectedViewId: view.id,
      selectedViewName: view.name,
    })
    setSearchValue(view.name)
    setShowResults(false)
  }, [onUpdate])

  // Handle clearing the selection
  const handleClear = useCallback(() => {
    setSearchValue('')
    setShowResults(false)
    onUpdate({
      selectedViewId: undefined,
      selectedViewName: undefined,
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

  // Render view item in the list
  const renderViewItem = useCallback((item?: ViewInfo, index?: number) => {
    if (!item) return null
    
    const isSelected = item.id === data.selectedViewId
    const itemClassName = isSelected 
      ? mergeStyles(classNames.viewItem, classNames.selectedItem)
      : classNames.viewItem

    return (
      <div
        key={item.id}
        className={itemClassName}
        onClick={() => handleViewSelect(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleViewSelect(item)
          }
        }}
      >
        <Stack tokens={{ childrenGap: 4 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>{item.name}</Text>
          {item.description && (
            <Text variant="small" styles={{ root: { color: '#605e5c' } }}>{item.description}</Text>
          )}
          <Text variant="small" styles={{ root: { color: '#0078d4' } }}>
            {item.isUserView ? 'Personal View' : 'System View'} {item.isDefault && '(Default)'}
          </Text>
        </Stack>
      </div>
    )
  }, [data.selectedViewId, handleViewSelect, classNames])

  const canProceed = Boolean(data.selectedViewId)

  return (
    <WizardLayout
      title="Select View"
      description={`Choose a view for the ${data.targetTableName || data.targetTable} table to define which columns and data will be displayed.`}
      canGoNext={canProceed}
      canGoPrevious={true}
      isLoading={isLoading}
      error={error}
      onNext={onComplete}
      onPrevious={onPrevious}
      onCancel={onCancel}
      nextLabel="Complete Setup"
    >
      <Stack tokens={{ childrenGap: 20 }}>
        {/* Information */}
        <MessageBar messageBarType={MessageBarType.info}>
          Select a view that defines the columns and filters for your PCF component. 
          This will determine what data is displayed and how it's organized.
        </MessageBar>

        {/* Target Table Context */}
        <Stack tokens={{ childrenGap: 5 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            Target Table:
          </Text>
          <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
            {data.targetTableName || data.targetTable}
          </Text>
        </Stack>

        {/* View Selection */}
        <Stack tokens={{ childrenGap: 10 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            Select View *
          </Text>
          <div style={{ position: 'relative', maxWidth: 400 }} data-search-container>
            <SearchBox
              placeholder="Search for a view"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onClear={handleClear}
              disabled={isLoading}
              styles={{ root: { width: '100%' } }}
            />
            
            {/* Search Results */}
            {showResults && filteredViews.length > 0 && (
              <div className={classNames.listContainer} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }}>
                <FocusZone>
                  <List
                    items={filteredViews.slice(0, 50)} // Limit to first 50 results
                    onRenderCell={renderViewItem}
                  />
                </FocusZone>
              </div>
            )}
            
            {/* No Results Message */}
            {showResults && filteredViews.length === 0 && searchValue.trim() && (
              <div className={classNames.listContainer} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }}>
                <div className={classNames.noResults}>
                  No views found matching "{searchValue}"
                </div>
              </div>
            )}
          </div>
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            Start typing to search for system or personal views for this table.
          </Text>
        </Stack>

        {/* Current Selection */}
        {data.selectedViewId && (
          <Stack tokens={{ childrenGap: 5 }}>
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              Selected View:
            </Text>
            <Text variant="medium">{data.selectedViewName}</Text>
          </Stack>
        )}

        {/* Validation Message */}
        {!canProceed && (
          <MessageBar messageBarType={MessageBarType.error}>
            Please select a view to complete the setup.
          </MessageBar>
        )}
      </Stack>
    </WizardLayout>
  )
}