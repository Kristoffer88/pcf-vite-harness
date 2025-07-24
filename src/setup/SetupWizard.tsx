/**
 * SetupWizard - Main wizard container with step navigation
 */

import { Stack } from '@fluentui/react'
import type * as React from 'react'
import { useCallback, useState } from 'react'
import { Step1TableSelection } from './Step1TableSelection'
import { Step2RecordIdInput } from './Step2RecordIdInput'
import { Step3TargetTableSelection } from './Step3TargetTableSelection'
import { Step4RelationshipSelection } from './Step4RelationshipSelection'
import { Step5ViewSelection } from './Step5ViewSelection'
import { SetupComplete } from './SetupComplete'
import { StepIndicator } from './StepIndicator'
import type { SetupWizardData, WizardStep } from './types'

export interface SetupWizardProps {
  onComplete: (data: SetupWizardData) => void
  onCancel?: () => void
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [isComplete, setIsComplete] = useState(false)
  const [wizardData, setWizardData] = useState<SetupWizardData>({
    targetTable: '', // Required field
  })

  // Define wizard steps
  const steps: WizardStep[] = [
    {
      id: 1,
      title: 'Page Table',
      description: 'Select the page table (optional)',
      isOptional: true,
      isComplete: currentStep > 1,
      isActive: currentStep === 1,
    },
    {
      id: 2,
      title: 'Page Record',
      description: 'Enter page record ID',
      isOptional: true,
      isComplete: currentStep > 2,
      isActive: currentStep === 2,
    },
    {
      id: 3,
      title: 'Target Table',
      description: 'Select the target/record table',
      isOptional: false,
      isComplete: currentStep > 3,
      isActive: currentStep === 3,
    },
    {
      id: 4,
      title: 'Relationships',
      description: 'Discover table relationships',
      isOptional: wizardData.pageTable ? false : true,
      isComplete: currentStep > 4,
      isActive: currentStep === 4,
    },
    {
      id: 5,
      title: 'Select View',
      description: 'Choose the view for your data',
      isOptional: false,
      isComplete: currentStep > 5,
      isActive: currentStep === 5,
    },
  ]

  // Update wizard data
  const updateWizardData = useCallback((updates: Partial<SetupWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }))
  }, [])

  // Navigation handlers
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
  }, [])

  const skipToRequiredSteps = useCallback(() => {
    // Clear optional step data and jump directly to step 3 (Target Table)
    setWizardData(prev => ({
      ...prev,
      pageTable: undefined,
      pageTableName: undefined,
      pageRecordId: undefined,
    }))
    setCurrentStep(3)
  }, [])

  const goNext = useCallback(() => {
    // Handle step navigation including the relationship step
    if (currentStep === 3) {
      // After step 3, go to step 4 if we have both page and target tables
      if (wizardData.pageTable && wizardData.targetTable) {
        setCurrentStep(4)
      } else {
        // Skip relationship step if no page table, go directly to step 5
        setCurrentStep(5)
      }
    } else if (currentStep === 4) {
      setCurrentStep(5)
    } else if (currentStep < 5) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Show completion screen
      setIsComplete(true)
    }
  }, [currentStep, wizardData.pageTable, wizardData.targetTable])

  const goPrevious = useCallback(() => {
    // Handle step navigation including the relationship step
    if (currentStep === 5) {
      // From step 5, go back to step 4 if we have relationships, otherwise to step 3
      if (wizardData.pageTable && wizardData.targetTable) {
        setCurrentStep(4)
      } else {
        setCurrentStep(3)
      }
    } else if (currentStep === 4) {
      setCurrentStep(3)
    } else if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep, wizardData.pageTable, wizardData.targetTable])

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      // Default: go back to main interface
      window.location.href = '/'
    }
  }, [onCancel])

  const handleStartDevelopment = useCallback(() => {
    onComplete(wizardData)
  }, [onComplete, wizardData])

  const handleBackToWizard = useCallback(() => {
    setIsComplete(false)
  }, [])

  // Check if current step can proceed
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        // Step 1 is optional, always can proceed
        return true
      case 2:
        // Step 2 is optional if no page table selected, or requires record ID if page table is selected
        return !wizardData.pageTable || Boolean(wizardData.pageRecordId?.trim())
      case 3:
        // Step 3 requires target table
        return Boolean(wizardData.targetTable?.trim())
      case 3.5:
        // Step 3.5 is optional if no relationships found, or requires relationship selection
        return !wizardData.availableRelationships?.length || Boolean(wizardData.selectedRelationship)
      case 4:
        // Step 4 requires view selection
        return Boolean(wizardData.selectedViewId)
      default:
        return false
    }
  }, [currentStep, wizardData])

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1TableSelection
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={goNext}
            onSkip={skipToRequiredSteps}
            onCancel={handleCancel}
          />
        )
      case 2:
        return (
          <Step2RecordIdInput
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={goNext}
            onPrevious={goPrevious}
            onCancel={handleCancel}
          />
        )
      case 3:
        return (
          <Step3TargetTableSelection
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={goNext}
            onPrevious={goPrevious}
            onCancel={handleCancel}
          />
        )
      case 4:
        return (
          <Step4RelationshipSelection
            data={wizardData}
            onNext={(data) => {
              setWizardData(data)
              goNext()
            }}
            onBack={goPrevious}
          />
        )
      case 5:
        return (
          <Step5ViewSelection
            data={wizardData}
            onUpdate={updateWizardData}
            onComplete={goNext}
            onPrevious={goPrevious}
            onCancel={handleCancel}
          />
        )
      default:
        return null
    }
  }

  // Show completion screen if setup is complete
  if (isComplete) {
    return (
      <SetupComplete
        data={wizardData}
        onStartDevelopment={handleStartDevelopment}
        onBackToWizard={handleBackToWizard}
      />
    )
  }

  return (
    <Stack styles={{ 
      root: { 
        height: '100vh',
        backgroundColor: '#faf9f8',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      } 
    }}>
      {/* Step Indicator */}
      <Stack styles={{ 
        root: { 
          backgroundColor: 'white', 
          borderBottom: '1px solid #edebe9',
          flexShrink: 0,
          padding: '16px 20px'
        } 
      }}>
        <StepIndicator steps={steps} currentStep={currentStep} />
      </Stack>

      {/* Step Content */}
      <Stack.Item grow styles={{ root: { flex: '1 1 auto', overflow: 'hidden' } }}>
        {renderStepContent()}
      </Stack.Item>
    </Stack>
  )
}
