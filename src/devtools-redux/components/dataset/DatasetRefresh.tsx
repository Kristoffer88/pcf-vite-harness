/**
 * Dataset Refresh Component
 * Pure UI component for dataset refresh controls and status
 * No business logic - delegates all operations to parent
 */

import type React from 'react'
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Card } from '../ui/Card'
import type { DatasetRefreshState, SubgridInfo } from '../../utils/dataset/types'

interface DatasetRefreshProps {
  refreshState: DatasetRefreshState
  subgrids: SubgridInfo[]
  onRefresh: () => void
  onRefreshWithDiscovery: () => void
  onClearCache: () => void
  onTestConnection: () => void
  maxPageSize?: number
  onMaxPageSizeChange?: (size: number) => void
  className?: string
}

export const DatasetRefresh: React.FC<DatasetRefreshProps> = ({
  refreshState,
  subgrids,
  onRefresh,
  onRefreshWithDiscovery,
  onClearCache,
  onTestConnection,
  maxPageSize = 25,
  onMaxPageSizeChange,
  className = '',
}) => {
  const isRefreshing = refreshState.isRefreshing

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Controls */}
      <Card title="Dataset Refresh Controls">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {/* Page Size Control */}
          {onMaxPageSizeChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <label
                style={{
                  fontSize: fontSize.sm,
                  color: colors.text.secondary,
                  minWidth: '100px',
                }}
              >
                Max Page Size:
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={maxPageSize}
                onChange={(e) => onMaxPageSizeChange(parseInt(e.target.value) || 25)}
                disabled={isRefreshing}
                style={{
                  padding: spacing.sm,
                  border: `1px solid ${colors.border.primary}`,
                  borderRadius: borderRadius.sm,
                  backgroundColor: colors.background.surface,
                  color: colors.text.primary,
                  fontSize: fontSize.sm,
                  width: '100px',
                }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              onClick={onRefresh}
              loading={isRefreshing}
              disabled={subgrids.length === 0}
            >
              Refresh Datasets
            </Button>
            <Button
              variant="success"
              onClick={onRefreshWithDiscovery}
              loading={isRefreshing}
              disabled={subgrids.length === 0}
            >
              🔍 Refresh with Discovery
            </Button>
            <Button variant="secondary" onClick={onClearCache} disabled={isRefreshing}>
              🧹 Clear Cache
            </Button>
            <Button variant="secondary" onClick={onTestConnection} disabled={isRefreshing}>
              🔌 Test Connection
            </Button>
          </div>

          {/* Subgrid Count */}
          <div
            style={{
              fontSize: fontSize.sm,
              color: colors.text.muted,
              padding: spacing.sm,
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.sm,
            }}
          >
            {subgrids.length === 0
              ? 'No subgrids detected'
              : `${subgrids.length} subgrid${subgrids.length === 1 ? '' : 's'} detected`}
          </div>
        </div>
      </Card>

      {/* Refresh Status */}
      {isRefreshing && (
        <Card variant="info">
          <LoadingSpinner
            message="Refreshing datasets..."
            progress={
              refreshState.totalFormsToRefresh > 0
                ? {
                    current: refreshState.successCount,
                    total: refreshState.totalFormsToRefresh,
                  }
                : undefined
            }
            size="small"
          />
        </Card>
      )}

      {/* Results Summary */}
      {!isRefreshing && refreshState.refreshResults.length > 0 && (
        <Card title="Refresh Results">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: spacing.sm,
              }}
            >
              <div
                style={{
                  padding: spacing.sm,
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.sm,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: 600,
                    color: colors.status.success,
                  }}
                >
                  {refreshState.successCount}
                </div>
                <div style={{ fontSize: fontSize.xs, color: colors.text.muted }}>
                  Successful
                </div>
              </div>
              <div
                style={{
                  padding: spacing.sm,
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.sm,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: 600,
                    color: colors.status.error,
                  }}
                >
                  {refreshState.errorCount || 0}
                </div>
                <div style={{ fontSize: fontSize.xs, color: colors.text.muted }}>
                  Errors
                </div>
              </div>
              <div
                style={{
                  padding: spacing.sm,
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.sm,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: 600,
                    color: colors.text.primary,
                  }}
                >
                  {refreshState.refreshResults.length}
                </div>
                <div style={{ fontSize: fontSize.xs, color: colors.text.muted }}>
                  Total
                </div>
              </div>
            </div>

            {refreshState.lastRefresh && (
              <div
                style={{
                  fontSize: fontSize.xs,
                  color: colors.text.muted,
                  textAlign: 'center',
                  padding: spacing.sm,
                }}
              >
                Last refresh: {refreshState.lastRefresh.toLocaleTimeString()}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}