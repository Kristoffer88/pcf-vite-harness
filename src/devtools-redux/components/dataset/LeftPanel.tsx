/**
 * LeftPanel Component
 * Left panel containing dataset list, controls, and entity information
 */

import type React from 'react'
import { memo } from 'react'
import { DatasetListItem } from './DatasetListItem'
import type { DatasetRefreshState } from '../../utils/dataset'
import type { ParentEntity } from '../UnifiedDatasetTab'
import {
  borderRadius,
  colors,
  commonStyles,
  fontSize,
  spacing,
} from '../../styles/theme'
import { EnvConfigGenerator } from '../../utils/envConfigGenerator'

interface LeftPanelProps {
  datasets: Array<{ key: string; dataset: any }>
  selectedDataset: string | null
  refreshState: DatasetRefreshState
  datasetAnalysis: any
  currentEntity: string
  detectedParentEntityType: string | null
  selectedParentEntity: ParentEntity | null
  availableViews: any[]
  selectedViewId: string | null
  currentState: any
  discoveredRelationships?: any[]
  targetEntity?: string
  onSelectDataset: (key: string) => void
  onRefreshDatasets: () => void
  onSelectView: (viewId: string) => void
}

const LeftPanelComponent: React.FC<LeftPanelProps> = ({
  datasets,
  selectedDataset,
  refreshState,
  datasetAnalysis,
  currentEntity,
  detectedParentEntityType,
  selectedParentEntity,
  availableViews,
  selectedViewId,
  currentState,
  discoveredRelationships = [],
  targetEntity,
  onSelectDataset,
  onRefreshDatasets,
  onSelectView,
}) => {
  const getPageEntity = () => {
    const envValue = import.meta.env.VITE_PCF_PAGE_TABLE
    if (envValue) return envValue
    return currentEntity || 'unknown'
  }

  return (
    <div
      style={{
        width: '350px',
        borderRight: `1px solid ${colors.border.primary}`,
        overflow: 'auto',
        backgroundColor: colors.background.primary,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with Entity Info */}
      <div
        style={{
          ...commonStyles.container.panel,
          ...commonStyles.text.label,
          borderBottom: `1px solid ${colors.border.primary}`,
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          <strong>🔍 Data Search & Refresh</strong>
        </div>
        <div style={{ fontSize: fontSize.xs, color: colors.text.secondary, marginBottom: '4px' }}>
          Page/Form Entity:{' '}
          <span style={{ color: colors.status.success, fontWeight: 'bold' }}>
            {getPageEntity()}
          </span>
          {import.meta.env.VITE_PCF_PAGE_TABLE && (
            <span style={{ color: colors.text.secondary, fontSize: '10px', marginLeft: '4px' }}>
              (from env)
            </span>
          )}
        </div>
        <div style={{ fontSize: fontSize.xs, color: colors.text.secondary, marginBottom: '4px' }}>
          Target Entity:{' '}
          <span style={{ color: colors.status.info, fontWeight: 'bold' }}>
            {currentEntity}
          </span>
        </div>

        {/* Parent Entity Selection */}
        <div style={{ marginTop: '12px' }}>
          {selectedParentEntity ? (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#1a3d1a',
              border: '1px solid #2ea043',
              borderRadius: '4px',
              fontSize: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#5ea85e', marginBottom: '2px' }}>
                    Parent Filter Active
                  </div>
                  <div style={{ color: '#7ee787', fontWeight: '500' }}>
                    {selectedParentEntity.name}
                  </div>
                  <div style={{ color: '#5ea85e', fontSize: '10px' }}>
                    {selectedParentEntity.entityType} • {selectedParentEntity.id}
                  </div>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    // Switch to parent search tab
                    const buttons = Array.from(document.querySelectorAll('button'))
                    const parentSearchButton = buttons.find(btn => btn.textContent?.includes('🔍 Parent Search'))
                    if (parentSearchButton) {
                      parentSearchButton.click()
                    }
                  }}
                  style={{
                    color: '#58a6ff',
                    fontSize: '11px',
                    textDecoration: 'none',
                  }}
                  title="Go to Parent Search tab to change selection"
                >
                  Change →
                </a>
              </div>
            </div>
          ) : !detectedParentEntityType ? (
            <div style={{ 
              padding: '8px', 
              backgroundColor: '#1a3d1a', 
              border: '1px solid #2ea043',
              borderRadius: '4px',
              fontSize: '11px',
              marginBottom: '8px'
            }}>
              <div style={{ color: '#7ee787', marginBottom: '4px' }}>
                💡 No parent entity detected. Click "Refresh All Datasets" to discover relationships from metadata.
              </div>
              <div style={{ fontSize: '10px', color: '#7ee787' }}>
                Or add VITE_PCF_PAGE_TABLE=your_parent_entity to .env file
              </div>
            </div>
          ) : detectedParentEntityType ? (
            <div style={{ 
              padding: '8px', 
              backgroundColor: '#161b22', 
              border: '1px solid #30363d',
              borderRadius: '4px',
              fontSize: '11px',
            }}>
              <div style={{ color: '#7d8590', marginBottom: '4px' }}>
                No parent filter active
              </div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  // Switch to parent search tab
                  const buttons = Array.from(document.querySelectorAll('button'))
                  const parentSearchButton = buttons.find(btn => btn.textContent?.includes('🔍 Parent Search'))
                  if (parentSearchButton) {
                    parentSearchButton.click()
                  }
                }}
                style={{
                  color: '#58a6ff',
                  fontSize: '11px',
                  textDecoration: 'none',
                }}
              >
                Select parent {detectedParentEntityType} →
              </a>
            </div>
          ) : (
            <div style={{ 
              padding: '8px', 
              backgroundColor: '#1a3d1a', 
              border: '1px solid #2ea043',
              borderRadius: '4px',
              fontSize: '11px',
              marginBottom: '8px'
            }}>
              <div style={{ color: '#7ee787', marginBottom: '4px' }}>
                💡 No parent entity detected. Click "Refresh All Datasets" to discover relationships.
              </div>
              <div style={{ fontSize: '10px', color: '#7ee787' }}>
                Or add VITE_PCF_PAGE_TABLE=your_parent_entity to .env file
              </div>
            </div>
          )}

        {/* View Selection */}
        {availableViews.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <label
              style={{
                fontSize: '11px',
                color: colors.text.secondary,
                marginBottom: '4px',
                display: 'block',
              }}
            >
              Select View:
            </label>
            <select
              value={selectedViewId || ''}
              onChange={e => onSelectView(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                fontSize: '11px',
                backgroundColor: '#21262d',
                border: '1px solid #30363d',
                borderRadius: '3px',
                color: '#e6edf3',
              }}
            >
              <option value="">Select a view...</option>
              {availableViews.map(view => (
                <option key={view.savedqueryid} value={view.savedqueryid}>
                  {view.name} {view.isdefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        </div>
      </div>

      {/* Refresh Controls */}
      <div
        style={{
          padding: '12px',
          borderBottom: `1px solid ${colors.border.primary}`,
          backgroundColor: '#1a1f2e',
        }}
      >
        <button
          onClick={onRefreshDatasets}
          disabled={refreshState.isRefreshing || datasets.length === 0}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: refreshState.isRefreshing ? '#475569' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: refreshState.isRefreshing ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '8px',
          }}
        >
          {refreshState.isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh All Datasets'}
        </button>

        {/* Configuration Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '8px' 
        }}>
          <button
            onClick={async () => {
              // Generate env config from current state
              const envData = {
                pageEntity: getPageEntity(),
                targetEntity: targetEntity || currentEntity,
                parentEntityType: detectedParentEntityType || undefined,
                parentEntityId: selectedParentEntity?.id,
                parentEntityName: selectedParentEntity?.name,
                viewId: selectedViewId || undefined,
                datasetKey: selectedDataset || undefined,
                relationships: discoveredRelationships
              }
              
              const success = await EnvConfigGenerator.copyToClipboard(envData)
              if (success) {
                alert('Environment configuration copied to clipboard!\n\nPaste it into your .env file and restart the development server.')
              } else {
                alert('Failed to copy to clipboard. Check console for details.')
              }
            }}
            disabled={!refreshState.lastRefresh}
            style={{
              width: '100%',
              padding: '6px 12px',
              backgroundColor: refreshState.lastRefresh ? '#059669' : '#374151',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: refreshState.lastRefresh ? 'pointer' : 'not-allowed',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            title="Copy environment configuration to clipboard"
          >
            📋 Copy Config to Clipboard
          </button>
        </div>

        {/* Status */}
        {refreshState.lastRefresh && (
          <div style={{ fontSize: '10px', color: colors.text.secondary }}>
            Last refresh: {refreshState.lastRefresh.toLocaleTimeString()} • ✅{' '}
            {refreshState.successCount} • ❌ {refreshState.errorCount}
          </div>
        )}
        {!refreshState.lastRefresh && !refreshState.isRefreshing && datasets.length > 0 && (
          <div style={{ fontSize: '10px', color: colors.status.info, fontStyle: 'italic' }}>
            Auto-refresh will start in a moment...
          </div>
        )}
      </div>

      {/* Dataset List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {datasets.length === 0 ? (
          <div
            style={{
              padding: '16px',
              color: colors.text.secondary,
              fontSize: '12px',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            {datasetAnalysis.summary}
          </div>
        ) : (
          datasets.map(({ key, dataset }) => {
            const isSelected = selectedDataset === key
            const refreshResult = refreshState.refreshResults.find(
              r => r.subgridInfo.controlId === key
            )

            return (
              <DatasetListItem
                key={key}
                datasetKey={key}
                dataset={dataset}
                isSelected={isSelected}
                refreshResult={refreshResult}
                onClick={onSelectDataset}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

export const LeftPanel = memo(LeftPanelComponent)