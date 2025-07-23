/**
 * DatasetListItem Component
 * Displays individual dataset information in the left panel list
 */

import type React from 'react'
import { memo } from 'react'

interface DatasetListItemProps {
  datasetKey: string
  dataset: any
  isSelected: boolean
  refreshResult?: any
  onClick: (key: string) => void
}

const DatasetListItemComponent: React.FC<DatasetListItemProps> = ({ 
  datasetKey, 
  dataset, 
  isSelected, 
  refreshResult, 
  onClick 
}) => {
  return (
    <div
      onClick={() => onClick(datasetKey)}
      style={{
        padding: '12px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#1f6feb' : 'transparent',
        borderLeft: isSelected ? '3px solid #58a6ff' : '3px solid transparent',
        borderBottom: '1px solid #21262d',
        fontSize: '12px',
        transition: 'all 0.1s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            fontWeight: '600',
            color: isSelected ? '#ffffff' : '#e6edf3',
            fontSize: '13px',
          }}
        >
          {datasetKey}
        </div>
        <div
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '3px',
            backgroundColor: refreshResult
              ? refreshResult.queryResult.success
                ? '#22c55e'
                : '#ef4444'
              : dataset.hasData
                ? '#6b7280'
                : '#9ca3af',
            color: '#ffffff',
          }}
        >
          {refreshResult
            ? refreshResult.queryResult.success
              ? `${refreshResult.queryResult.entities.length} records`
              : 'Error'
            : `${dataset.recordCount || 0} records`}
        </div>
      </div>

      <div
        style={{
          color: isSelected ? '#b1bac4' : '#7d8590',
          fontSize: '11px',
          marginBottom: '4px',
        }}
      >
        <div>Entity: {dataset.entityLogicalName || 'unknown'}</div>
        {dataset.viewId && <div>View: {dataset.viewId.substring(0, 8)}...</div>}
        {dataset.relationshipName && (
          <div>Relationship: {dataset.relationshipName}</div>
        )}
      </div>

      {refreshResult?.errorAnalysis && (
        <div
          style={{
            fontSize: '10px',
            color: '#ff7b72',
            backgroundColor: '#3a1e1e',
            padding: '4px',
            borderRadius: '2px',
            marginTop: '4px',
          }}
        >
          Error: {refreshResult.queryResult.error}
        </div>
      )}
    </div>
  )
}

export const DatasetListItem = memo(DatasetListItemComponent)