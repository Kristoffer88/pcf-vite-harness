/**
 * WizardLayout - FluentUI-based layout for the setup wizard
 */

import {
  DefaultButton,
  MessageBar,
  MessageBarType,
  PrimaryButton,
  Spinner,
  SpinnerSize,
  Stack,
  Text,
  type IButton,
} from '@fluentui/react'
import type * as React from 'react'
import { useRef, useImperativeHandle, forwardRef } from 'react'

export interface WizardLayoutRef {
  focusContinueButton: () => void
}

export interface WizardLayoutProps {
  title: string
  description?: string
  children: React.ReactNode

  // Navigation
  canGoNext: boolean
  canGoPrevious: boolean
  isLoading?: boolean
  error?: string

  // Actions
  onNext: () => void
  onPrevious: () => void
  onCancel?: () => void

  // Button labels
  nextLabel?: string
  previousLabel?: string
  cancelLabel?: string
}

export const WizardLayout = forwardRef<WizardLayoutRef, WizardLayoutProps>(({
  title,
  description,
  children,
  canGoNext,
  canGoPrevious,
  isLoading = false,
  error,
  onNext,
  onPrevious,
  onCancel,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  cancelLabel = 'Cancel',
}, ref) => {
  const continueButtonRef = useRef<IButton>(null)

  useImperativeHandle(ref, () => ({
    focusContinueButton: () => {
      continueButtonRef.current?.focus()
    }
  }));
  // Debug logging
  console.log('WizardLayout render:', { 
    title, 
    canGoNext, 
    canGoPrevious, 
    isLoading, 
    nextLabel, 
    hasOnCancel: !!onCancel 
  })

  const handleNext = () => {
    console.log('WizardLayout - Next button clicked:', { canGoNext, isLoading })
    if (canGoNext && !isLoading) {
      onNext()
    }
  }

  const handlePrevious = () => {
    if (canGoPrevious && !isLoading) {
      onPrevious()
    }
  }

  return (
    <Stack 
      tokens={{ childrenGap: 20 }} 
      styles={{ 
        root: { 
          padding: 20, 
          height: '100%', // Use 100% of parent container
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        } 
      }}
    >
      {/* Header */}
      <Stack tokens={{ childrenGap: 8 }}>
        <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
          {title}
        </Text>
        {description && (
          <Text variant="medium" styles={{ root: { color: '#666' } }}>
            {description}
          </Text>
        )}
      </Stack>

      {/* Error Message */}
      {error && (
        <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>
          {error}
        </MessageBar>
      )}

      {/* Content */}
      <Stack.Item 
        grow 
        styles={{ 
          root: { 
            flex: '1 1 auto',
            overflow: 'auto',
            marginBottom: 20
          } 
        }}
      >
        {isLoading ? (
          <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { height: 200 } }}>
            <Spinner size={SpinnerSize.large} label="Loading..." />
          </Stack>
        ) : (
          children
        )}
      </Stack.Item>

      {/* Navigation */}
      <Stack 
        horizontal 
        horizontalAlign="space-between" 
        tokens={{ childrenGap: 10 }}
        styles={{
          root: {
            borderTop: '1px solid #edebe9',
            paddingTop: 20,
            backgroundColor: 'white',
            flexShrink: 0,
            marginTop: 'auto'
          }
        }}
      >
        <Stack horizontal tokens={{ childrenGap: 10 }}>
          {canGoPrevious && (
            <DefaultButton text={previousLabel} onClick={handlePrevious} disabled={isLoading} />
          )}
          {onCancel && <DefaultButton text={cancelLabel} onClick={onCancel} disabled={isLoading} />}
        </Stack>

        <PrimaryButton 
          componentRef={continueButtonRef}
          text={nextLabel} 
          onClick={handleNext} 
          disabled={!canGoNext || isLoading}
          onKeyDown={(e) => {
            console.log(`PrimaryButton keydown in ${title}:`, e.key)
            // Prevent space key from activating button if it came from a search input
            if (e.key === ' ') {
              console.log('Space key prevented on PrimaryButton in', title)
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          styles={{
            root: { 
              minWidth: 100,
              visibility: 'visible',
              display: 'block',
              backgroundColor: '#0078d4',
              border: 'none',
              color: 'white'
            }
          }}
        />
      </Stack>
    </Stack>
  )
})
