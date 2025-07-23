/**
 * Parent Search Tab Component
 * Dedicated tab for searching and selecting parent entities
 */

import type React from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import type { PCFDevToolsConnector } from '../PCFDevToolsConnector'
import {
  borderRadius,
  colors,
  commonStyles,
  fontSize,
  spacing,
} from '../styles/theme'

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
  const [parentEntities, setParentEntities] = useState<ParentEntity[]>([])
  const [parentEntitySearch, setParentEntitySearch] = useState('')
  const [isLoadingParentEntities, setIsLoadingParentEntities] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

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
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#e6edf3', 
          marginBottom: '16px' 
        }}>
          🔍 Parent Entity Search
        </h2>
        
        {/* Entity Context */}
        <div style={{ 
          display: 'flex', 
          gap: '32px', 
          marginBottom: '24px',
          fontSize: fontSize.md,
          color: colors.text.secondary
        }}>
          <div>
            Page/Form Entity:{' '}
            <span style={{ color: colors.status.success, fontWeight: 'bold' }}>
              {getPageEntity()}
            </span>
            {import.meta.env.VITE_PCF_PAGE_TABLE && (
              <span style={{ fontSize: '11px', marginLeft: '4px' }}>
                (from .env)
              </span>
            )}
          </div>
          <div>
            Target Entity:{' '}
            <span style={{ color: colors.status.info, fontWeight: 'bold' }}>
              {targetEntity}
            </span>
          </div>
        </div>

        {/* Info Banner if no parent type detected */}
        {!detectedParentEntityType && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#1a3d1a', 
            border: '1px solid #2ea043',
            borderRadius: '6px',
            marginBottom: '24px'
          }}>
            <div style={{ color: '#7ee787', fontSize: '14px', marginBottom: '8px' }}>
              💡 No parent entity type detected
            </div>
            <div style={{ fontSize: '13px', color: '#7ee787' }}>
              To enable parent entity search:
              <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Add VITE_PCF_PAGE_TABLE=your_parent_entity to your .env file</li>
                <li>Or refresh datasets in the Data & Search tab to discover relationships</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Search Section */}
      {detectedParentEntityType && (
        <div style={{ marginBottom: '32px' }}>
          {/* Currently Selected */}
          {selectedParentEntity && (
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              backgroundColor: '#1a3d1a',
              border: '2px solid #2ea043',
              borderRadius: '8px',
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'start' 
              }}>
                <div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#5ea85e', 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Currently Selected
                  </div>
                  <div style={{ 
                    color: '#7ee787', 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    marginBottom: '8px' 
                  }}>
                    {selectedParentEntity.name}
                  </div>
                  <div style={{ color: '#5ea85e', fontSize: '13px' }}>
                    <span>{selectedParentEntity.entityType}</span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {selectedParentEntity.id}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleClearSelection}
                  style={{
                    background: 'none',
                    border: '1px solid #7ee787',
                    color: '#7ee787',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: '13px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#7ee787'
                    e.currentTarget.style.color = '#1a3d1a'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#7ee787'
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              fontSize: '14px',
              color: colors.text.secondary,
              marginBottom: '8px',
              display: 'block',
            }}>
              Search {detectedParentEntityType} Records:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={parentEntitySearch}
                onChange={e => setParentEntitySearch(e.target.value)}
                placeholder={`Type to search ${detectedParentEntityType} records...`}
                style={{
                  width: '100%',
                  padding: '16px 48px 16px 20px',
                  fontSize: '16px',
                  backgroundColor: '#21262d',
                  border: '2px solid #30363d',
                  borderRadius: '8px',
                  color: '#e6edf3',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#58a6ff'}
                onBlur={e => e.target.style.borderColor = '#30363d'}
              />
              {isLoadingParentEntities && (
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px',
                  color: colors.text.secondary,
                }}>
                  Loading...
                </div>
              )}
              {!isLoadingParentEntities && parentEntitySearch && (
                <button
                  onClick={() => setParentEntitySearch('')}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#7d8590',
                    cursor: 'pointer',
                    padding: '0 8px',
                    fontSize: '20px',
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchError ? (
            <div style={{
              padding: '16px',
              backgroundColor: '#3a1e1e',
              border: '1px solid #ff7b72',
              borderRadius: '6px',
              color: '#ff7b72',
              fontSize: '14px',
            }}>
              {searchError}
            </div>
          ) : parentEntities.length > 0 ? (
            <div>
              <div style={{
                fontSize: '13px',
                color: colors.text.secondary,
                marginBottom: '12px',
              }}>
                {parentEntities.length} records found
                {parentEntities.length === 50 && ' (showing first 50)'}
              </div>
              <div style={{
                display: 'grid',
                gap: '8px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '4px',
                backgroundColor: '#0d1117',
                borderRadius: '8px',
                border: '1px solid #21262d',
              }}>
                {parentEntities.map(entity => (
                  <div
                    key={entity.id}
                    onClick={() => {
                      onSelectParentEntity(entity)
                      setParentEntitySearch('')
                    }}
                    style={{
                      padding: '16px',
                      backgroundColor: '#161b22',
                      border: '1px solid #30363d',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#21262d'
                      e.currentTarget.style.borderColor = '#58a6ff'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = '#161b22'
                      e.currentTarget.style.borderColor = '#30363d'
                    }}
                  >
                    <div>
                      <div style={{ 
                        color: '#e6edf3', 
                        fontSize: '15px', 
                        fontWeight: '500', 
                        marginBottom: '4px' 
                      }}>
                        {entity.name}
                      </div>
                      <div style={{ 
                        color: '#7d8590', 
                        fontSize: '12px',
                        fontFamily: 'monospace' 
                      }}>
                        {entity.id}
                      </div>
                    </div>
                    <div style={{ 
                      color: '#58a6ff', 
                      fontSize: '20px',
                      opacity: 0.6,
                    }}>
                      →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : parentEntitySearch && !isLoadingParentEntities ? (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: colors.text.secondary,
              fontSize: '14px',
            }}>
              No results found for "{parentEntitySearch}"
            </div>
          ) : !parentEntitySearch && !isLoadingParentEntities ? (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: colors.text.secondary,
              fontSize: '14px',
            }}>
              Start typing to search for {detectedParentEntityType} records
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// Export memoized component for performance
export const ParentSearchTab = memo(ParentSearchTabComponent)