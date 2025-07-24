/**
 * Dataset Error Component
 * Pure UI component for displaying dataset errors and suggestions
 * No business logic - only presentation
 */

import type React from 'react'
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import type { DatasetErrorAnalysis } from '../../services/error-service'

interface DatasetErrorProps {
  errors: Array<{
    subgridId: string
    subgridName: string
    error: string
    analysis?: DatasetErrorAnalysis
    query?: string
  }>
  onRetry?: (subgridId: string) => void
  onCopyError?: (error: string) => void
  onAnalyzeError?: (subgridId: string) => void
  className?: string
}

export const DatasetError: React.FC<DatasetErrorProps> = ({
  errors,
  onRetry,
  onCopyError,
  onAnalyzeError,
  className = '',
}) => {
  if (errors.length === 0) {
    return null
  }

  return (
    <Card title="Dataset Errors" variant="error" className={className}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {errors.map((errorInfo, index) => (
          <div
            key={`${errorInfo.subgridId}-${index}`}
            style={{
              border: `1px solid ${colors.status.error}`,
              borderRadius: borderRadius.sm,
              backgroundColor: `${colors.status.error}10`,
              padding: spacing.md,
            }}
          >
            {/* Error Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: fontSize.md,
                    color: colors.status.error,
                    fontWeight: 600,
                  }}
                >
                  {errorInfo.subgridName}
                </h4>
                <div
                  style={{
                    fontSize: fontSize.xs,
                    color: colors.text.muted,
                    marginTop: spacing.xs,
                  }}
                >
                  ID: {errorInfo.subgridId}
                </div>
              </div>
              <div style={{ display: 'flex', gap: spacing.xs }}>
                {onRetry && (
                  <Button size="small" onClick={() => onRetry(errorInfo.subgridId)}>
                    🔄 Retry
                  </Button>
                )}
                {onAnalyzeError && (
                  <Button size="small" onClick={() => onAnalyzeError(errorInfo.subgridId)}>
                    🔍 Analyze
                  </Button>
                )}
                {onCopyError && (
                  <Button size="small" onClick={() => onCopyError(errorInfo.error)}>
                    📋 Copy
                  </Button>
                )}
              </div>
            </div>

            {/* Error Message */}
            <div
              style={{
                padding: spacing.sm,
                backgroundColor: colors.background.secondary,
                borderRadius: borderRadius.sm,
                marginBottom: spacing.sm,
              }}
            >
              <div
                style={{
                  fontSize: fontSize.sm,
                  color: colors.text.primary,
                  fontFamily: 'monospace',
                  wordBreak: 'break-word',
                }}
              >
                {errorInfo.error}
              </div>
            </div>

            {/* Query Information */}
            {errorInfo.query && (
              <div style={{ marginBottom: spacing.sm }}>
                <div
                  style={{
                    fontSize: fontSize.xs,
                    color: colors.text.muted,
                    marginBottom: spacing.xs,
                    fontWeight: 500,
                  }}
                >
                  Query:
                </div>
                <div
                  style={{
                    padding: spacing.sm,
                    backgroundColor: colors.background.secondary,
                    borderRadius: borderRadius.sm,
                    fontSize: fontSize.xs,
                    color: colors.text.secondary,
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {errorInfo.query}
                </div>
              </div>
            )}

            {/* Error Analysis */}
            {errorInfo.analysis && (
              <div>
                {/* Error Type Indicators */}
                <div style={{ display: 'flex', gap: spacing.xs, marginBottom: spacing.sm }}>
                  {errorInfo.analysis.isRelationshipError && (
                    <span
                      style={{
                        fontSize: fontSize.xs,
                        color: colors.status.warning,
                        backgroundColor: `${colors.status.warning}20`,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      🔗 Relationship Error
                    </span>
                  )}
                  {errorInfo.analysis.isFieldError && (
                    <span
                      style={{
                        fontSize: fontSize.xs,
                        color: colors.status.error,
                        backgroundColor: `${colors.status.error}20`,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      📋 Field Error
                    </span>
                  )}
                  {errorInfo.analysis.isEntityError && (
                    <span
                      style={{
                        fontSize: fontSize.xs,
                        color: colors.status.warning,
                        backgroundColor: `${colors.status.warning}20`,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      🏢 Entity Error
                    </span>
                  )}
                  {errorInfo.analysis.isPermissionError && (
                    <span
                      style={{
                        fontSize: fontSize.xs,
                        color: colors.status.error,
                        backgroundColor: `${colors.status.error}20`,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      🔒 Permission Error
                    </span>
                  )}
                </div>

                {/* Suggestions */}
                {errorInfo.analysis.suggestions.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: fontSize.sm,
                        color: colors.text.secondary,
                        marginBottom: spacing.xs,
                        fontWeight: 500,
                      }}
                    >
                      Suggestions:
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: spacing.lg,
                        fontSize: fontSize.sm,
                        color: colors.text.secondary,
                      }}
                    >
                      {errorInfo.analysis.suggestions.map((suggestion, idx) => (
                        <li key={idx} style={{ marginBottom: spacing.xs }}>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Technical Details */}
                {(errorInfo.analysis.errorCode || errorInfo.analysis.correlationId) && (
                  <div
                    style={{
                      marginTop: spacing.sm,
                      padding: spacing.sm,
                      backgroundColor: colors.background.secondary,
                      borderRadius: borderRadius.sm,
                      fontSize: fontSize.xs,
                      color: colors.text.muted,
                    }}
                  >
                    {errorInfo.analysis.errorCode && (
                      <div>Error Code: {errorInfo.analysis.errorCode}</div>
                    )}
                    {errorInfo.analysis.correlationId && (
                      <div>Correlation ID: {errorInfo.analysis.correlationId}</div>
                    )}
                    {errorInfo.analysis.requestId && (
                      <div>Request ID: {errorInfo.analysis.requestId}</div>
                    )}
                    <div>Timestamp: {errorInfo.analysis.timestamp.toLocaleString()}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}