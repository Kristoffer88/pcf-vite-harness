/**
 * Loading Spinner Component
 * A modern loading indicator with progress tracking
 */

import type React from 'react'

interface LoadingSpinnerProps {
  message?: string
  subMessage?: string
  progress?: {
    current: number
    total: number
  }
  steps?: string[]
  currentStep?: number
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  subMessage,
  progress,
  steps,
  currentStep = 0,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        minHeight: '200px',
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '3px solid #21262d',
          borderTop: '3px solid #58a6ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px',
        }}
      />

      {/* Message */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#e6edf3',
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        {message}
      </div>

      {/* Sub-message */}
      {subMessage && (
        <div
          style={{
            fontSize: '12px',
            color: '#7d8590',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          {subMessage}
        </div>
      )}

      {/* Progress bar */}
      {progress && (
        <div
          style={{
            width: '200px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#7d8590',
              marginBottom: '4px',
            }}
          >
            <span>Progress</span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#21262d',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
                height: '100%',
                backgroundColor: '#58a6ff',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      {steps && steps.length > 0 && (
        <div
          style={{
            fontSize: '11px',
            color: '#7d8590',
            maxWidth: '300px',
          }}
        >
          {steps.map((step, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '6px',
                opacity: index === currentStep ? 1 : index < currentStep ? 0.6 : 0.4,
              }}
            >
              <span
                style={{
                  marginRight: '8px',
                  fontSize: '10px',
                }}
              >
                {index < currentStep ? '✓' : index === currentStep ? '⟳' : '○'}
              </span>
              <span
                style={{
                  color: index === currentStep ? '#58a6ff' : '#7d8590',
                  fontWeight: index === currentStep ? '500' : 'normal',
                }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}