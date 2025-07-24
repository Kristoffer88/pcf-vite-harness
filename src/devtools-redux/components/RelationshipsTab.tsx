/**
 * Relationships Tab Component
 * Handles parent entity selection and relationship discovery
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
import {
  clearDiscoveryCache,
  type DiscoveredRelationship,
} from '../utils/dataset'
import { clearBatchMetadataCache } from '../utils/dataset/batchMetadataFetcher'

interface RelationshipsTabProps {
  connector: PCFDevToolsConnector
  currentState: any
  // Relationship discovery
  discoveredRelationships: DiscoveredRelationship[]
  onRelationshipsUpdate: (relationships: DiscoveredRelationship[]) => void
  // Current context
  currentEntity: string
  targetEntity: string
}

export interface ParentEntity {
  id: string
  name: string
  entityType: string
}

const RelationshipsTabComponent: React.FC<RelationshipsTabProps> = ({
  connector,
  currentState,
  discoveredRelationships,
  onRelationshipsUpdate,
  currentEntity,
  targetEntity,
}) => {

  const handleClearCache = useCallback(() => {
    clearDiscoveryCache()
    clearBatchMetadataCache()
    onRelationshipsUpdate([])
    console.log('🧹 Relationship discovery cache cleared')
  }, [onRelationshipsUpdate])

  const getPageEntity = () => {
    const envValue = import.meta.env.VITE_PCF_PAGE_TABLE
    if (envValue) return envValue
    return currentEntity || 'unknown'
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#e6edf3', marginBottom: '12px' }}>
          🔗 Entity Relationships
        </h2>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
          <div style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
            Page/Form Entity:{' '}
            <span style={{ color: colors.status.success, fontWeight: 'bold' }}>
              {getPageEntity()}
            </span>
            {import.meta.env.VITE_PCF_PAGE_TABLE && (
              <span style={{ color: colors.text.secondary, fontSize: '10px', marginLeft: '4px' }}>
                (env)
              </span>
            )}
          </div>
          <div style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
            Target Entity:{' '}
            <span style={{ color: colors.status.info, fontWeight: 'bold' }}>
              {targetEntity}
            </span>
          </div>
        </div>
        <button
          onClick={handleClearCache}
          style={{
            padding: '6px 12px',
            backgroundColor: '#6b7280',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          title="Clear relationship discovery cache"
        >
          🧹 Clear Cache
        </button>
      </div>

      {/* Relationships Grid */}
      {discoveredRelationships.length === 0 ? (
        <div style={{ 
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#161b22',
          borderRadius: '8px',
          border: '1px solid #21262d'
        }}>
          <div style={{ fontSize: '16px', color: '#e6edf3', marginBottom: '8px' }}>
            No relationships discovered yet
          </div>
          <div style={{ fontSize: '12px', color: '#7d8590' }}>
            Use the Data & Search tab to refresh datasets and discover relationships
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '12px'
        }}>
          {discoveredRelationships.map((rel, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                backgroundColor: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#30363d'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ 
                  padding: '4px 8px',
                  backgroundColor: '#1f6feb',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#ffffff'
                }}>
                  {rel.parentEntity}
                </div>
                <div style={{ color: '#58a6ff', fontWeight: 'bold' }}>→</div>
                <div style={{ 
                  padding: '4px 8px',
                  backgroundColor: '#2ea043',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#ffffff'
                }}>
                  {rel.childEntity}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#7d8590' }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#e6edf3' }}>Source:</span> {rel.source}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#e6edf3' }}>Field:</span> {rel.lookupColumn}
                </div>
                <div>
                  <span style={{ color: '#e6edf3' }}>Confidence:</span> {rel.confidence}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Export memoized component for performance
export const RelationshipsTab = memo(RelationshipsTabComponent)