/**
 * StepIndicator - Progress indicator showing current wizard step
 */

import { Icon, mergeStyles, Stack, Text } from '@fluentui/react'
import * as React from 'react'
import type { WizardStep } from './types'

export interface StepIndicatorProps {
  steps: WizardStep[]
  currentStep: number
}

const stepCircleClass = mergeStyles({
  width: 32,
  height: 32,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 600,
  border: '2px solid',
  transition: 'all 0.2s ease',
})

const stepLineClass = mergeStyles({
  height: 2,
  flex: 1,
  margin: '0 8px',
  transition: 'all 0.2s ease',
})

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  const getStepStyles = (step: WizardStep, index: number) => {
    if (step.isComplete) {
      return {
        circle: {
          backgroundColor: '#107c10',
          borderColor: '#107c10',
          color: 'white',
        },
        line: {
          backgroundColor: '#107c10',
        },
        text: {
          color: '#107c10',
          fontWeight: '600',
        },
      }
    } else if (step.isActive) {
      return {
        circle: {
          backgroundColor: '#0078d4',
          borderColor: '#0078d4',
          color: 'white',
        },
        line: {
          backgroundColor: '#c8c8c8',
        },
        text: {
          color: '#323130',
          fontWeight: '600',
        },
      }
    } else {
      return {
        circle: {
          backgroundColor: 'white',
          borderColor: '#c8c8c8',
          color: '#605e5c',
        },
        line: {
          backgroundColor: '#c8c8c8',
        },
        text: {
          color: '#605e5c',
          fontWeight: '400',
        },
      }
    }
  }

  return (
    <Stack styles={{ root: { padding: '20px 0' } }}>
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 0 }}>
        {steps.map((step, index) => {
          const styles = getStepStyles(step, index)
          const isLast = index === steps.length - 1

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <Stack verticalAlign="center" horizontalAlign="center" tokens={{ childrenGap: 8 }}>
                <div className={stepCircleClass} style={styles.circle}>
                  {step.isComplete ? (
                    <Icon iconName="CheckMark" />
                  ) : (
                    <Text styles={{ root: { color: 'inherit' } }}>{step.id}</Text>
                  )}
                </div>
                <Stack horizontalAlign="center" tokens={{ childrenGap: 2 }}>
                  <Text variant="medium" styles={{ root: styles.text }}>
                    {step.title}
                  </Text>
                  {step.isOptional && (
                    <Text
                      variant="small"
                      styles={{ root: { color: '#605e5c', fontStyle: 'italic' } }}
                    >
                      (Optional)
                    </Text>
                  )}
                </Stack>
              </Stack>

              {/* Connector Line */}
              {!isLast && <div className={stepLineClass} style={styles.line} />}
            </React.Fragment>
          )
        })}
      </Stack>
    </Stack>
  )
}
