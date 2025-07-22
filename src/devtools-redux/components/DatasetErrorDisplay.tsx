/**
 * Dataset Error Display Component
 * Shows detailed error analysis with actionable suggestions
 * Based on error analyzer discoveries from integration tests
 */

import type React from 'react'
import type { DatasetErrorAnalysis } from '../utils/dataset'

export interface DatasetErrorDisplayProps {
  error: string
  analysis?: DatasetErrorAnalysis
  query?: string
  className?: string
}

export const DatasetErrorDisplay: React.FC<DatasetErrorDisplayProps> = ({
  error,
  analysis,
  query,
  className = '',
}) => {
  return (
    <div
      className={`dataset-error-display ${className}`}
      style={{
        backgroundColor: '#7f1d1d',
        border: '1px solid #dc2626',
        borderRadius: '6px',
        padding: '12px',
        fontSize: '11px',
        fontFamily: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',
      }}
    >
      {/* Error Message */}
      <div
        style={{
          color: '#fca5a5',
          fontWeight: '600',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>🚨</span>
        <span>Dataset Refresh Error</span>
      </div>

      <div
        style={{
          color: '#fed7aa',
          marginBottom: '8px',
          wordBreak: 'break-word',
        }}
      >
        {error}
      </div>

      {/* Error Analysis */}
      {analysis && (
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              color: '#fca5a5',
              fontWeight: '500',
              marginBottom: '6px',
              fontSize: '10px',
            }}
          >
            Error Analysis:
          </div>

          <div style={{ marginLeft: '8px' }}>
            {analysis.isRelationshipError && (
              <div
                style={{
                  color: '#fed7aa',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🔗</span>
                <span>Relationship configuration issue detected</span>
              </div>
            )}

            {analysis.isFieldError && (
              <div
                style={{
                  color: '#fed7aa',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>📝</span>
                <span>Field naming issue detected</span>
              </div>
            )}

            {analysis.isEntityError && (
              <div
                style={{
                  color: '#fed7aa',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>📦</span>
                <span>Entity name issue detected</span>
              </div>
            )}

            {analysis.isPermissionError && (
              <div
                style={{
                  color: '#fed7aa',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🔒</span>
                <span>Permission issue detected</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {analysis?.suggestions && analysis.suggestions.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              color: '#a7f3d0',
              fontWeight: '500',
              marginBottom: '6px',
              fontSize: '10px',
            }}
          >
            💡 Suggestions:
          </div>

          <div style={{ marginLeft: '8px' }}>
            {analysis.suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                style={{
                  color: '#a7f3d0',
                  marginBottom: '3px',
                  fontSize: '10px',
                }}
              >
                • {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Context */}
      {query && (
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              color: '#94a3b8',
              fontWeight: '500',
              marginBottom: '4px',
              fontSize: '10px',
            }}
          >
            Query:
          </div>
          <div
            style={{
              color: '#cbd5e1',
              fontSize: '9px',
              backgroundColor: '#374151',
              padding: '4px 6px',
              borderRadius: '3px',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}
          >
            {query}
          </div>
        </div>
      )}

      {/* Debug Info */}
      {analysis && (
        <div
          style={{
            borderTop: '1px solid #991b1b',
            paddingTop: '8px',
            display: 'flex',
            gap: '12px',
            fontSize: '9px',
            color: '#94a3b8',
          }}
        >
          {analysis.errorCode && (
            <div>
              <span style={{ color: '#64748b' }}>Code:</span> {analysis.errorCode}
            </div>
          )}
          {analysis.correlationId && (
            <div>
              <span style={{ color: '#64748b' }}>ID:</span> {analysis.correlationId}
            </div>
          )}
          <div>
            <span style={{ color: '#64748b' }}>Time:</span> {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  )
}
