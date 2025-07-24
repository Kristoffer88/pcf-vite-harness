/**
 * Step4PCFScanning - PCF form scanning using findPCFOnForms()
 */

import {
  DefaultButton,
  Dropdown,
  type IDropdownOption,
  MessageBar,
  MessageBarType,
  PrimaryButton,
  Spinner,
  SpinnerSize,
  Stack,
  Text,
} from '@fluentui/react'
import type * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { EnvConfigGenerator } from '../devtools-redux/utils/envConfigGenerator'
import { detectManifestInfo } from '../utils/manifestReader'
import type { FormPCFMatch } from '../utils/pcfDiscovery'
import { findPCFOnForms } from '../utils/pcfDiscovery'
import type { FormOption, SetupWizardData } from './types'
import { WizardLayout } from './WizardLayout'

export interface Step4PCFScanningProps {
  data: SetupWizardData
  onUpdate: (updates: Partial<SetupWizardData>) => void
  onComplete: () => void
  onPrevious: () => void
  onCancel: () => void
  canProceed: boolean
}

// Mock PCF class for manifest detection - in real usage this would be the actual PCF class
const mockPCFClass = class MockPCF {
  static displayName = 'MockPCF'
} as any

export const Step4PCFScanning: React.FC<Step4PCFScanningProps> = ({
  data,
  onUpdate,
  onComplete,
  onPrevious,
  onCancel,
  canProceed,
}) => {
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string>()
  const [formOptions, setFormOptions] = useState<IDropdownOption[]>([])
  const [matchedForms, setMatchedForms] = useState<FormPCFMatch[]>([])
  const [manifestInfo, setManifestInfo] = useState<any>()
  const [configGenerated, setConfigGenerated] = useState<string>()
  const [isGenerating, setIsGenerating] = useState(false)

  // Auto-detect PCF manifest info
  useEffect(() => {
    try {
      const detected = detectManifestInfo(mockPCFClass)
      setManifestInfo(detected)
    } catch (error) {
      console.warn('Could not auto-detect manifest info:', error)
      // Use fallback manifest info
      setManifestInfo({
        namespace: 'default',
        constructor: 'PCFComponent',
        version: '1.0.0',
      })
    }
  }, [])

  // Scan for PCF forms
  const scanForPCFForms = useCallback(async () => {
    if (!manifestInfo || !data.targetTable) return

    setIsScanning(true)
    setScanError(undefined)

    try {
      // Try to find PCF on forms for the target entity
      const matches = await findPCFOnForms(manifestInfo, {
        entityLogicalName: data.targetTable,
      })

      setMatchedForms(matches)

      // Convert to dropdown options
      const options: IDropdownOption[] = matches.map(match => ({
        key: match.formId,
        text: `${match.formName} (${match.controls.length} PCF control${match.controls.length !== 1 ? 's' : ''})`,
        data: {
          formId: match.formId,
          formName: match.formName,
          entityTypeCode: match.entityTypeCode,
          entityLogicalName: data.targetTable,
          pcfControls: match.controls.length,
        },
      }))

      setFormOptions(options)

      if (matches.length === 0) {
        setScanError(
          `No forms with PCF controls found for the ${data.targetTable} table using manifest: ${manifestInfo.namespace}.${manifestInfo.constructor}`
        )
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan for PCF forms'
      setScanError(errorMessage)
    } finally {
      setIsScanning(false)
    }
  }, [manifestInfo, data.targetTable])

  // Auto-scan when component mounts and we have required data
  useEffect(() => {
    if (manifestInfo && data.targetTable && !isScanning && formOptions.length === 0) {
      scanForPCFForms()
    }
  }, [manifestInfo, data.targetTable, isScanning, formOptions.length, scanForPCFForms])

  const handleFormSelection = useCallback(
    (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
      if (option) {
        const formData = option.data as FormOption
        const selectedForm = matchedForms.find(f => f.formId === formData.formId)
        const pcfControl = selectedForm?.controls[0] // Take first control for now

        onUpdate({
          selectedFormId: formData.formId,
          selectedFormName: formData.formName,
          pcfControlInfo: pcfControl
            ? {
                controlId: pcfControl.controlId,
                namespace: pcfControl.namespace,
                constructor: pcfControl.constructor,
                version: pcfControl.version,
                dataSet: pcfControl.dataSet,
              }
            : undefined,
        })
      }
    },
    [matchedForms, onUpdate]
  )

  const generateConfiguration = useCallback(async () => {
    setIsGenerating(true)

    try {
      const configData = {
        pageEntity: data.pageTable || '',
        targetEntity: data.targetTable,
        parentEntityType: data.pageTable,
        parentEntityId: data.pageRecordId,
        parentEntityName: data.pageTableName,
        datasetKey: data.pcfControlInfo?.dataSet?.name,
        viewId: data.pcfControlInfo?.dataSet?.viewId,
      }

      const config = EnvConfigGenerator.generateEnvConfig(configData)
      setConfigGenerated(config)

      // Copy to clipboard
      const success = await EnvConfigGenerator.copyToClipboard(configData)
      if (success) {
        // Show success message or update UI
        console.log('Configuration copied to clipboard')
      }
    } catch (error) {
      console.error('Failed to generate configuration:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [data])

  const handleComplete = useCallback(() => {
    // Generate config if not already done
    if (!configGenerated) {
      generateConfiguration().then(() => {
        onComplete()
      })
    } else {
      onComplete()
    }
  }, [configGenerated, generateConfiguration, onComplete])

  return (
    <WizardLayout
      title="PCF Form Scanning"
      description="Scan forms to find your PCF component and generate the configuration."
      canGoNext={canProceed}
      canGoPrevious={true}
      isLoading={isScanning || isGenerating}
      error={scanError}
      onNext={handleComplete}
      onPrevious={onPrevious}
      onCancel={onCancel}
      nextLabel="Complete Setup"
    >
      <Stack tokens={{ childrenGap: 20 }}>
        {/* Manifest Info */}
        {manifestInfo && (
          <Stack tokens={{ childrenGap: 5 }}>
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              PCF Manifest Info:
            </Text>
            <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
              {manifestInfo.namespace}.{manifestInfo.constructor} (v{manifestInfo.version})
            </Text>
          </Stack>
        )}

        {/* Target Table */}
        <Stack tokens={{ childrenGap: 5 }}>
          <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
            Scanning Target Table:
          </Text>
          <Text variant="medium">{data.targetTableName || data.targetTable}</Text>
        </Stack>

        {/* Scanning Status */}
        {isScanning && (
          <Stack horizontalAlign="center" tokens={{ childrenGap: 10 }}>
            <Spinner size={SpinnerSize.medium} />
            <Text variant="medium">Scanning forms for PCF controls...</Text>
          </Stack>
        )}

        {/* Scan Results */}
        {!isScanning && formOptions.length > 0 && (
          <Stack tokens={{ childrenGap: 10 }}>
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              Found Forms with PCF Controls:
            </Text>
            <Dropdown
              placeholder="Select a form"
              options={formOptions}
              selectedKey={data.selectedFormId}
              onChange={handleFormSelection}
              styles={{ root: { maxWidth: 500 } }}
            />
          </Stack>
        )}

        {/* No Results */}
        {!isScanning && formOptions.length === 0 && !scanError && (
          <MessageBar messageBarType={MessageBarType.warning}>
            No forms found with PCF controls for this entity. You can still continue with manual
            configuration.
          </MessageBar>
        )}

        {/* Rescan Button */}
        {!isScanning && (
          <Stack horizontalAlign="start">
            <DefaultButton
              text="Rescan Forms"
              onClick={scanForPCFForms}
              disabled={!data.targetTable || !manifestInfo}
            />
          </Stack>
        )}

        {/* Selected Form Details */}
        {data.selectedFormId && data.pcfControlInfo && (
          <Stack tokens={{ childrenGap: 10 }}>
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              Selected PCF Control:
            </Text>
            <Stack tokens={{ childrenGap: 5 }} styles={{ root: { paddingLeft: 16 } }}>
              <Text variant="medium">Form: {data.selectedFormName}</Text>
              <Text variant="medium">
                Control: {data.pcfControlInfo.namespace}.{data.pcfControlInfo.constructor}
              </Text>
              {data.pcfControlInfo.dataSet && (
                <Text variant="medium">Dataset: {data.pcfControlInfo.dataSet.name}</Text>
              )}
            </Stack>
          </Stack>
        )}

        {/* Configuration Generation */}
        {canProceed && (
          <Stack tokens={{ childrenGap: 10 }}>
            <PrimaryButton
              text={configGenerated ? 'Configuration Generated' : 'Generate Configuration'}
              onClick={generateConfiguration}
              disabled={isGenerating || Boolean(configGenerated)}
            />
            {configGenerated && (
              <MessageBar messageBarType={MessageBarType.success}>
                Configuration has been generated and copied to clipboard. You can now complete the
                setup.
              </MessageBar>
            )}
          </Stack>
        )}
      </Stack>
    </WizardLayout>
  )
}
