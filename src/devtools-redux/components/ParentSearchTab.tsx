/**
 * Parent Search Tab Component
 * Dedicated tab for searching and selecting parent entities
 */

import type React from 'react'
import { memo, useCallback, useEffect } from 'react'
import {
  SearchBox,
  Button,
  Text,
  Card,
  CardHeader,
  CardPreview,
  Body1,
  Body2,
  Caption1,
  Badge,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  tokens,
} from '@fluentui/react-components'
import {
  Search20Regular,
  Dismiss20Regular,
  CheckmarkCircle20Filled,
  Warning20Filled,
  Info20Filled,
} from '@fluentui/react-icons'
import type { PCFDevToolsConnector } from '../PCFDevToolsConnector'
import {
  borderRadius,
  colors,
  commonStyles,
  fontSize,
  spacing,
} from '../styles/theme'
import { useSearchStore } from '../stores'

export interface ParentEntity {
  id: string
  name: string
  entityType: string
}

interface ParentSearchTabProps {
  connector: PCFDevToolsConnector
  currentState: any
  // Parent entity state
  selectedParentEntity: ParentEntity | null
  onSelectParentEntity: (entity: ParentEntity | null) => void
  detectedParentEntityType: string | null
  // Current context
  currentEntity: string
  targetEntity: string
}

const ParentSearchTabComponent: React.FC<ParentSearchTabProps> = ({
  connector,
  currentState,
  selectedParentEntity,
  onSelectParentEntity,
  detectedParentEntityType,
  currentEntity,
  targetEntity,
}) => {
  // Zustand stores
  // Use individual selectors to avoid reference equality issues
  const parentEntities = useSearchStore((state) => state.parentEntities)
  const parentEntitySearch = useSearchStore((state) => state.parentEntitySearch)
  const isLoadingParentEntities = useSearchStore((state) => state.isLoadingParentEntities)
  const searchError = useSearchStore((state) => state.searchError)
  
  // Actions (these are stable functions)
  const setParentEntities = useSearchStore((state) => state.setParentEntities)
  const setParentEntitySearch = useSearchStore((state) => state.setParentEntitySearch)
  const setIsLoadingParentEntities = useSearchStore((state) => state.setIsLoadingParentEntities)
  const setSearchError = useSearchStore((state) => state.setSearchError)

  // Load parent entities when search changes
  useEffect(() => {
    const loadParentEntities = async () => {
      if (!currentState?.webAPI || !detectedParentEntityType) {
        setParentEntities([])
        return
      }
      
      setIsLoadingParentEntities(true)
      setSearchError(null)
      
      try {
        // Get metadata to find primary name attribute
        const metadataUrl = `EntityDefinitions(LogicalName='${detectedParentEntityType}')?$select=PrimaryIdAttribute,PrimaryNameAttribute,DisplayName,LogicalCollectionName`
        const metadataResponse = await fetch(`/api/data/v9.2/${metadataUrl}`)
        
        if (!metadataResponse.ok) {
          throw new Error(`Failed to fetch metadata: ${metadataResponse.status} ${metadataResponse.statusText}`)
        }
        
        const metadata = await metadataResponse.json()
        
        const primaryId = metadata.PrimaryIdAttribute || `${detectedParentEntityType}id`
        const primaryName = metadata.PrimaryNameAttribute || `${detectedParentEntityType}name`
        
        let query = `$select=${primaryId},${primaryName}&$orderby=${primaryName}`
        
        // Add filter if searching
        if (parentEntitySearch && parentEntitySearch.trim().length > 0) {
          query += `&$filter=contains(${primaryName},'${parentEntitySearch.trim()}')`
        }
        
        // Limit results for performance
        query += '&$top=50'
        
        const result = await currentState.webAPI.retrieveMultipleRecords(detectedParentEntityType, query)
        const entities = result.entities.map((entity: any) => ({
          id: entity[primaryId],
          name: entity[primaryName] || 'Unnamed',
          entityType: detectedParentEntityType
        }))
        
        setParentEntities(entities)
        
        if (entities.length === 0 && parentEntitySearch) {
          setSearchError('No matching records found')
        }
      } catch (error) {
        console.error('Failed to load parent entities:', error)
        setSearchError('Failed to search records. Please check your connection.')
        setParentEntities([])
      } finally {
        setIsLoadingParentEntities(false)
      }
    }

    const debounceTimer = setTimeout(loadParentEntities, 300)
    return () => clearTimeout(debounceTimer)
  }, [parentEntitySearch, currentState?.webAPI, detectedParentEntityType])

  const handleClearSelection = useCallback(() => {
    onSelectParentEntity(null)
    setParentEntitySearch('')
  }, [onSelectParentEntity])

  const getPageEntity = () => {
    const envValue = import.meta.env.VITE_PCF_PAGE_TABLE
    if (envValue) return envValue
    return currentEntity || 'unknown'
  }

  return (
    <div style={{ 
      flex: 1, 
      overflow: 'auto', 
      padding: tokens.spacingVerticalXL,
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacingVerticalL,
    }}>
      {/* Header */}
      <div style={{ marginBottom: tokens.spacingVerticalL }}>
        <Text as="h2" size={600} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM }}>
          🔍 Parent Entity Search
        </Text>
        
        {/* Entity Context Cards */}
        <div style={{ 
          display: 'flex', 
          gap: tokens.spacingHorizontalL, 
          marginBottom: tokens.spacingVerticalL,
          flexWrap: 'wrap',
        }}>
          <Card style={{ minWidth: '200px' }}>
            <CardHeader
              header={<Body2>Page/Form Entity</Body2>}
              description={
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS }}>
                  <Badge appearance="filled" color="success">{getPageEntity()}</Badge>
                  {import.meta.env.VITE_PCF_PAGE_TABLE && (
                    <Caption1>(from .env)</Caption1>
                  )}
                </div>
              }
            />
          </Card>
          
          <Card style={{ minWidth: '200px' }}>
            <CardHeader
              header={<Body2>Target Entity</Body2>}
              description={<Badge appearance="filled" color="informative">{targetEntity}</Badge>}
            />
          </Card>
        </div>

        {/* Info Message if no parent type detected */}
        {!detectedParentEntityType && (
          <MessageBar intent="info" style={{ marginBottom: tokens.spacingVerticalL }}>
            <MessageBarBody>
              <MessageBarTitle>No parent entity type detected</MessageBarTitle>
              To enable parent entity search:
              <ol style={{ margin: tokens.spacingVerticalXS, paddingLeft: tokens.spacingHorizontalL }}>
                <li>Add VITE_PCF_PAGE_TABLE=your_parent_entity to your .env file</li>
                <li>Or refresh datasets in the Data & Search tab to discover relationships</li>
              </ol>
            </MessageBarBody>
          </MessageBar>
        )}
      </div>

      {/* Search Section */}
      {detectedParentEntityType && (
        <div>
          {/* Search Input - Moved to TOP as requested */}
          <div style={{ marginBottom: tokens.spacingVerticalL }}>
            <SearchBox
              placeholder={`Search ${detectedParentEntityType} records...`}
              value={parentEntitySearch}
              onChange={(_, data) => setParentEntitySearch(data.value)}
              contentBefore={<Search20Regular />}
              contentAfter={
                isLoadingParentEntities ? (
                  <Spinner size="extra-small" />
                ) : parentEntitySearch ? (
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<Dismiss20Regular />}
                    onClick={() => setParentEntitySearch('')}
                    title="Clear search"
                  />
                ) : null
              }
              style={{ width: '100%' }}
            />
            
            {/* Search Results Count */}
            {parentEntities.length > 0 && (
              <Caption1 style={{ marginTop: tokens.spacingVerticalXS }}>
                {parentEntities.length} records found
              </Caption1>
            )}
          </div>

          {/* Currently Selected */}
          {selectedParentEntity && (
            <Card 
              appearance="filled-alternative"
              style={{ 
                marginBottom: tokens.spacingVerticalL,
                border: `2px solid ${tokens.colorBrandBackground}`,
              }}
            >
              <CardHeader
                image={<CheckmarkCircle20Filled color={tokens.colorPaletteGreenForeground1} />}
                header={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <Body1 weight="semibold">{selectedParentEntity.name}</Body1>
                      <Caption1>{selectedParentEntity.entityType} • {selectedParentEntity.id}</Caption1>
                    </div>
                    <Button
                      appearance="subtle"
                      size="small"
                      onClick={handleClearSelection}
                    >
                      Clear Selection
                    </Button>
                  </div>
                }
              />
            </Card>
          )}

          {/* Search Results */}
          {searchError ? (
            <MessageBar intent="error">
              <MessageBarBody>
                <MessageBarTitle>Search Error</MessageBarTitle>
                {searchError}
              </MessageBarBody>
            </MessageBar>
          ) : parentEntities.length > 0 ? (
            <div>
              <div style={{
                display: 'grid',
                gap: tokens.spacingVerticalS,
                maxHeight: '400px',
                overflowY: 'auto',
                borderRadius: '8px',
                border: '1px solid #21262d',
              }}>
                {parentEntities.map(entity => (
                  <Card
                    key={entity.id}
                    appearance="outline"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      onSelectParentEntity(entity)
                      setParentEntitySearch('')
                    }}
                  >
                    <CardHeader
                      header={<Body1 weight="semibold">{entity.name}</Body1>}
                      description={<Caption1 style={{ fontFamily: 'monospace' }}>{entity.id}</Caption1>}
                    />
                  </Card>
                ))}
              </div>
            </div>
          ) : parentEntitySearch && !isLoadingParentEntities ? (
            <MessageBar intent="info">
              <MessageBarBody>
                No results found for "{parentEntitySearch}"
              </MessageBarBody>
            </MessageBar>
          ) : !parentEntitySearch && !isLoadingParentEntities ? (
            <div style={{
              textAlign: 'center',
              padding: tokens.spacingVerticalXXL,
              color: tokens.colorNeutralForeground3,
            }}>
              <Text>Start typing to search for {detectedParentEntityType} records</Text>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// Export memoized component for performance
export const ParentSearchTab = memo(ParentSearchTabComponent)