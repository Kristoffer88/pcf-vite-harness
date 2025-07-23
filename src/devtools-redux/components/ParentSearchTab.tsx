/**
 * Parent Search Tab Component
 * Dedicated tab for searching and selecting parent entities
 */

import type React from 'react'
import { memo, useCallback, useEffect } from 'react'
import type { PCFDevToolsConnector } from '../PCFDevToolsConnector'
import {
  borderRadius,
  colors,
  commonStyles,
  fontSize,
  fonts,
  fontWeight,
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
      overflow: 'hidden', 
      padding: spacing.xl,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.lg,
    }}>
      {/* Info Message if no parent type detected */}
      {!detectedParentEntityType && (
        <div style={{ 
          marginBottom: spacing.lg,
          padding: spacing.md,
          backgroundColor: colors.background.secondary,
          border: `1px solid ${colors.border.secondary}`,
          borderRadius: borderRadius.md,
          color: colors.text.primary
        }}>
          <div style={{ fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>
            ℹ️ No parent entity type detected
          </div>
          <div>To enable parent entity search:</div>
          <ol style={{ margin: spacing.xs, paddingLeft: spacing.lg }}>
            <li>Add VITE_PCF_PAGE_TABLE=your_parent_entity to your .env file</li>
            <li>Or refresh datasets in the Data & Search tab to discover relationships</li>
          </ol>
        </div>
      )}

      {/* Search Section */}
      {detectedParentEntityType && (
        <div>
          {/* Search Input */}
          <div style={{ marginBottom: spacing.lg }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder={`Search ${detectedParentEntityType} records...`}
                value={parentEntitySearch}
                onChange={(e) => setParentEntitySearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: `${spacing.sm} ${spacing.md}`,
                  paddingLeft: spacing.xl,
                  paddingRight: spacing.xl,
                  backgroundColor: colors.background.secondary,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: borderRadius.md,
                  color: colors.text.primary,
                  fontSize: fontSize.md,
                  fontFamily: fonts.system,
                  outline: 'none',
                }}
              />
              <div style={{
                position: 'absolute',
                left: spacing.sm,
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.text.secondary,
                pointerEvents: 'none'
              }}>
                🔍
              </div>
              {isLoadingParentEntities ? (
                <div style={{
                  position: 'absolute',
                  right: spacing.sm,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.text.secondary
                }}>
                  ⏳
                </div>
              ) : parentEntitySearch ? (
                <button
                  type="button"
                  onClick={() => setParentEntitySearch('')}
                  title="Clear search"
                  style={{
                    position: 'absolute',
                    right: spacing.sm,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: colors.text.secondary,
                    cursor: 'pointer',
                    fontSize: fontSize.sm,
                    padding: spacing.xs
                  }}
                >
                  ✕
                </button>
              ) : null}
            </div>
            
            {/* Search Results Count */}
            {parentEntities.length > 0 && (
              <div style={{ 
                marginTop: spacing.xs, 
                fontSize: fontSize.sm, 
                color: colors.text.secondary 
              }}>
                {parentEntities.length} records found
              </div>
            )}
          </div>

          {/* Currently Selected */}
          {selectedParentEntity && (
            <div style={{ 
              marginBottom: spacing.lg,
              padding: spacing.md,
              backgroundColor: colors.background.secondary,
              border: `2px solid ${colors.status.accent}`,
              borderRadius: borderRadius.md,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <div style={{ color: colors.status.success, fontSize: fontSize.lg }}>
                  ✓
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: fontWeight.semibold, 
                    fontSize: fontSize.md,
                    color: colors.text.primary,
                    marginBottom: spacing.xs
                  }}>
                    {selectedParentEntity.name}
                  </div>
                  <div style={{ 
                    fontSize: fontSize.sm, 
                    color: colors.text.secondary 
                  }}>
                    {selectedParentEntity.entityType} • {selectedParentEntity.id}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  style={{
                    ...commonStyles.button,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    fontSize: fontSize.sm
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchError ? (
            <div style={{ 
              padding: spacing.md,
              backgroundColor: colors.background.secondary,
              border: `1px solid ${colors.status.error}`,
              borderRadius: borderRadius.md,
              color: colors.status.error
            }}>
              <div style={{ fontWeight: fontWeight.semibold, marginBottom: spacing.xs }}>
                ⚠️ Search Error
              </div>
              <div>{searchError}</div>
            </div>
          ) : parentEntities.length > 0 ? (
            <div>
              <div style={{
                display: 'grid',
                gap: spacing.sm,
                borderRadius: borderRadius.md,
                border: `1px solid ${colors.border.primary}`,
                padding: spacing.xs
              }}>
                {parentEntities.map(entity => (
                  <div
                    key={entity.id}
                    style={{ 
                      padding: spacing.md,
                      backgroundColor: colors.background.secondary,
                      border: `1px solid ${colors.border.secondary}`,
                      borderRadius: borderRadius.sm,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onClick={() => {
                      onSelectParentEntity(entity)
                      setParentEntitySearch('')
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.background.surface
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colors.background.secondary
                    }}
                  >
                    <div style={{ 
                      fontWeight: fontWeight.semibold, 
                      fontSize: fontSize.md,
                      color: colors.text.primary,
                      marginBottom: spacing.xs
                    }}>
                      {entity.name}
                    </div>
                    <div style={{ 
                      fontFamily: fonts.mono, 
                      fontSize: fontSize.sm, 
                      color: colors.text.secondary 
                    }}>
                      {entity.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : parentEntitySearch && !isLoadingParentEntities ? (
            <div style={{ 
              padding: spacing.md,
              backgroundColor: colors.background.secondary,
              border: `1px solid ${colors.border.secondary}`,
              borderRadius: borderRadius.md,
              color: colors.text.primary
            }}>
              <div>No results found for "{parentEntitySearch}"</div>
            </div>
          ) : !parentEntitySearch && !isLoadingParentEntities ? (
            <div style={{
              textAlign: 'center',
              padding: spacing.xxl,
              color: colors.text.secondary,
            }}>
              <div>Start typing to search for {detectedParentEntityType} records</div>
            </div>
          ) : null}
        </div>
      )}

      {/* Parent Entity Search Header - Moved to Bottom */}
      <div style={{ marginTop: spacing.lg }}>
        <h2 style={{ 
          fontSize: fontSize.xl, 
          fontWeight: fontWeight.semibold, 
          color: colors.text.primary,
          marginBottom: spacing.md,
          margin: 0
        }}>
          🔍 Parent Entity Search
        </h2>
        
        {/* Entity Context Cards */}
        <div style={{ 
          display: 'flex', 
          gap: spacing.lg, 
          marginBottom: spacing.lg,
          flexWrap: 'wrap',
        }}>
          <div style={{ 
            minWidth: '200px',
            padding: spacing.md,
            backgroundColor: colors.background.secondary,
            border: `1px solid ${colors.border.secondary}`,
            borderRadius: borderRadius.md,
          }}>
            <div style={{ 
              fontSize: fontSize.md, 
              fontWeight: fontWeight.medium,
              color: colors.text.primary,
              marginBottom: spacing.xs
            }}>
              Page/Form Entity
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
              <span style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                backgroundColor: colors.status.success,
                color: colors.text.primary,
                borderRadius: borderRadius.sm,
                fontSize: fontSize.sm,
              }}>
                {getPageEntity()}
              </span>
              {import.meta.env.VITE_PCF_PAGE_TABLE && (
                <span style={{ 
                  fontSize: fontSize.sm, 
                  color: colors.text.secondary 
                }}>
                  (from .env)
                </span>
              )}
            </div>
          </div>
          
          <div style={{ 
            minWidth: '200px',
            padding: spacing.md,
            backgroundColor: colors.background.secondary,
            border: `1px solid ${colors.border.secondary}`,
            borderRadius: borderRadius.md,
          }}>
            <div style={{ 
              fontSize: fontSize.md, 
              fontWeight: fontWeight.medium,
              color: colors.text.primary,
              marginBottom: spacing.xs
            }}>
              Target Entity
            </div>
            <span style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              backgroundColor: colors.status.info,
              color: colors.text.primary,
              borderRadius: borderRadius.sm,
              fontSize: fontSize.sm,
            }}>
              {targetEntity}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export memoized component for performance
export const ParentSearchTab = memo(ParentSearchTabComponent)