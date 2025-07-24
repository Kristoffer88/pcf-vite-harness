/**
 * Dataset Inspector Component
 * Pure UI component for displaying dataset parameters and metadata
 * No business logic - only presentation
 */

import type React from 'react'
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme'
import { Card } from '../ui/Card'
import type { PCFDatasetMetadata } from '../../utils/dataset/types'

interface DatasetInspectorProps {
  datasets: PCFDatasetMetadata[]
  selectedDataset?: string
  onSelectDataset?: (datasetId: string) => void
  className?: string
}

export const DatasetInspector: React.FC<DatasetInspectorProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  className = '',
}) => {
  if (datasets.length === 0) {
    return (
      <Card title="Dataset Parameters" variant="info" className={className}>
        <div
          style={{
            textAlign: 'center',
            color: colors.text.muted,
            fontSize: fontSize.sm,
            padding: spacing.xl,
          }}
        >
          No dataset parameters detected in current context
        </div>
      </Card>
    )
  }

  return (
    <Card title="Dataset Parameters" className={className}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {datasets.map((dataset) => (
          <div
            key={dataset.componentId}
            style={{
              border: `1px solid ${
                selectedDataset === dataset.componentId
                  ? colors.status.accent
                  : colors.border.primary
              }`,
              borderRadius: borderRadius.sm,
              padding: spacing.md,
              cursor: onSelectDataset ? 'pointer' : 'default',
              backgroundColor:
                selectedDataset === dataset.componentId
                  ? `${colors.status.accent}10`
                  : colors.background.surface,
              transition: 'all 0.2s ease',
            }}
            onClick={() => onSelectDataset?.(dataset.componentId)}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: fontSize.md,
                  color: colors.text.primary,
                  fontWeight: 600,
                }}
              >
                {dataset.formName}
              </h4>
              <span
                style={{
                  fontSize: fontSize.xs,
                  color: colors.text.muted,
                  backgroundColor: colors.background.secondary,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  borderRadius: borderRadius.sm,
                }}
              >
                {dataset.entityName}
              </span>
            </div>

            <div style={{ marginBottom: spacing.sm }}>
              <div
                style={{
                  fontSize: fontSize.xs,
                  color: colors.text.muted,
                  marginBottom: spacing.xs,
                }}
              >
                Component ID: {dataset.componentId}
              </div>
              <div
                style={{
                  fontSize: fontSize.xs,
                  color: colors.text.muted,
                }}
              >
                Form ID: {dataset.formId}
              </div>
            </div>

            {Object.keys(dataset.datasetParameters).length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: fontSize.sm,
                    color: colors.text.secondary,
                    marginBottom: spacing.xs,
                    fontWeight: 500,
                  }}
                >
                  Datasets ({Object.keys(dataset.datasetParameters).length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  {Object.entries(dataset.datasetParameters).map(([key, param]) => (
                    <div
                      key={key}
                      style={{
                        fontSize: fontSize.xs,
                        color: colors.text.muted,
                        padding: spacing.xs,
                        backgroundColor: colors.background.secondary,
                        borderRadius: borderRadius.sm,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{key}</span>
                      <span>
                        {param.entityLogicalName} ({param.currentRecordCount} records)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dataset.subgrids.length > 0 && (
              <div style={{ marginTop: spacing.md }}>
                <div
                  style={{
                    fontSize: fontSize.sm,
                    color: colors.text.secondary,
                    marginBottom: spacing.xs,
                    fontWeight: 500,
                  }}
                >
                  Subgrids ({dataset.subgrids.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
                  {dataset.subgrids.map((subgrid) => (
                    <div
                      key={subgrid.controlId}
                      style={{
                        fontSize: fontSize.xs,
                        color: colors.text.muted,
                        padding: spacing.xs,
                        backgroundColor: colors.background.secondary,
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>{subgrid.controlId}</span>
                        <span>{subgrid.targetEntity}</span>
                      </div>
                      {subgrid.relationshipName && (
                        <div style={{ marginTop: spacing.xs, opacity: 0.8 }}>
                          Relationship: {subgrid.relationshipName}
                        </div>
                      )}
                      {subgrid.viewId && (
                        <div style={{ marginTop: spacing.xs, opacity: 0.8 }}>
                          View: {subgrid.viewId}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}