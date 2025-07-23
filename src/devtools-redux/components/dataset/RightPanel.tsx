/**
 * RightPanel Component
 * Right panel displaying dataset details and discovery information
 */

import type React from 'react'
import { memo } from 'react'
import type { FormPCFMatch } from '../../../utils/pcfDiscovery'
import type { DiscoveredRelationship } from '../../utils/dataset'
import type { ParentEntity } from '../UnifiedDatasetTab'

interface RightPanelProps {
  currentState: any
  selectedDataset: string | null
  datasets: Array<{ key: string; dataset: any }>
  currentEntity: string
  selectedForm: FormPCFMatch | null
  selectedParentEntity: ParentEntity | null
  discoveredRelationships: DiscoveredRelationship[]
  onEntityChange: (entity: string) => void
  onFormSelect: (form: FormPCFMatch | null) => void
}

const RightPanelComponent: React.FC<RightPanelProps> = ({
  currentState,
  selectedDataset,
  datasets,
  currentEntity,
  selectedForm,
  selectedParentEntity,
  discoveredRelationships,
  onEntityChange,
  onFormSelect,
}) => {
  const selectedDatasetObj = datasets.find(d => d.key === selectedDataset)
  const selectedDatasetDetails = selectedDatasetObj?.dataset

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #21262d',
          backgroundColor: '#161b22',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: '#e6edf3',
          }}
        >
          {selectedDataset ? `Dataset: ${selectedDataset}` : 'Dataset Discovery & Details'}
        </h3>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
        {!selectedDataset ? (
          <div
            style={{
              color: '#7d8590',
              fontSize: '12px',
              textAlign: 'center',
              marginTop: '24px',
            }}
          >
            {datasets.length === 0 ? (
              <>
                <div style={{ marginBottom: '16px', fontSize: '14px', color: '#e6edf3' }}>
                  📊 No datasets detected on this form
                </div>
                <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
                  <h4 style={{ color: '#e6edf3', marginBottom: '8px' }}>Getting Started:</h4>
                  <ol style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                    <li>Add dataset parameters to your PCF component</li>
                    <li>Configure them in the control manifest</li>
                    <li>Bind them to Dataverse entities in the app designer</li>
                    <li>Refresh this page to see the datasets</li>
                  </ol>
                </div>
              </>
            ) : (
              'Select a dataset from the list to view details'
            )}
          </div>
        ) : selectedDatasetDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Dataset Info */}
            <div
              style={{
                backgroundColor: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                padding: '12px',
              }}
            >
              <h4
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#e6edf3',
                }}
              >
                Dataset Information
              </h4>
              <div style={{ fontSize: '11px', color: '#7d8590' }}>
                <div>Entity: {selectedDatasetDetails.entityLogicalName || 'unknown'}</div>
                <div>Records: {selectedDatasetDetails.recordCount || 0}</div>
                {selectedDatasetDetails.viewId && (
                  <div>View ID: {selectedDatasetDetails.viewId}</div>
                )}
                {selectedDatasetDetails.relationshipName && (
                  <div>Relationship: {selectedDatasetDetails.relationshipName}</div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export const RightPanel = memo(RightPanelComponent)