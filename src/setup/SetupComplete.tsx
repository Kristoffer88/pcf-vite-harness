/**
 * SetupComplete - Shows generated environment variables and completion actions
 */

import {
  MessageBar,
  MessageBarType,
  Stack,
  Text,
  PrimaryButton,
  DefaultButton,
  Icon,
  TextField,
} from '@fluentui/react'
import type * as React from 'react'
import { useCallback, useState } from 'react'
import type { SetupWizardData } from './types'

export interface SetupCompleteProps {
  data: SetupWizardData
  onStartDevelopment: () => void
  onBackToWizard: () => void
}

export const SetupComplete: React.FC<SetupCompleteProps> = ({
  data,
  onStartDevelopment,
  onBackToWizard,
}) => {
  const [copied, setCopied] = useState(false)

  // Generate environment variables
  const generateEnvVars = useCallback(() => {
    const envVars: string[] = []
    
    // Page context
    if (data.pageTable) {
      envVars.push(`VITE_PCF_PAGE_TABLE=${data.pageTable}`)
      if (data.pageTableName) {
        envVars.push(`VITE_PCF_PAGE_TABLE_NAME="${data.pageTableName}"`)
      }
      if (data.pageRecordId) {
        envVars.push(`VITE_PCF_PAGE_RECORD_ID=${data.pageRecordId}`)
      }
    }
    
    // Target table (required)
    envVars.push(`VITE_PCF_TARGET_TABLE=${data.targetTable}`)
    if (data.targetTableName) {
      envVars.push(`VITE_PCF_TARGET_TABLE_NAME="${data.targetTableName}"`)
    }
    
    // View selection (required)
    if (data.selectedViewId) {
      envVars.push(`VITE_PCF_VIEW_ID=${data.selectedViewId}`)
      if (data.selectedViewName) {
        envVars.push(`VITE_PCF_VIEW_NAME="${data.selectedViewName}"`)
      }
    }

    // Relationship configuration
    if (data.selectedRelationship) {
      envVars.push('')
      envVars.push('# Relationship Configuration')
      envVars.push(`VITE_PCF_RELATIONSHIP_SCHEMA_NAME=${data.selectedRelationship.schemaName}`)
      envVars.push(`VITE_PCF_RELATIONSHIP_ATTRIBUTE=${data.selectedRelationship.referencingAttribute}`)
      envVars.push(`VITE_PCF_RELATIONSHIP_LOOKUP_FIELD=${data.selectedRelationship.lookupFieldName}`)
      envVars.push(`VITE_PCF_RELATIONSHIP_TYPE=${data.selectedRelationship.relationshipType}`)
    }
    
    return envVars.join('\n')
  }, [data])

  const envVarsText = generateEnvVars()

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(envVarsText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }, [envVarsText])

  return (
    <Stack 
      styles={{ 
        root: { 
          height: '100%', 
          backgroundColor: '#faf9f8',
          display: 'flex',
          flexDirection: 'column'
        } 
      }}
    >
      {/* Header */}
      <Stack styles={{ 
        root: { 
          backgroundColor: 'white', 
          borderBottom: '1px solid #edebe9',
          flexShrink: 0,
          padding: '16px 20px'
        } 
      }}>
        <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
          <Icon iconName="CheckMark" styles={{ root: { color: '#107c10', fontSize: 24 } }} />
          <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
            Setup Complete!
          </Text>
        </Stack>
      </Stack>

      {/* Content */}
      <Stack.Item grow styles={{ root: { flex: '1 1 auto', overflow: 'auto' } }}>
        <Stack tokens={{ childrenGap: 20 }} styles={{ root: { padding: 20 } }}>
          {/* Success Message */}
          <MessageBar messageBarType={MessageBarType.success}>
            Your PCF development environment has been configured successfully. 
            Copy the environment variables below to your project's .env file.
          </MessageBar>

          {/* Configuration Summary */}
          <Stack tokens={{ childrenGap: 15 }}>
            <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
              Configuration Summary
            </Text>
            
            <Stack tokens={{ childrenGap: 8 }}>
              {data.pageTable && (
                <Stack horizontal tokens={{ childrenGap: 10 }}>
                  <Text variant="medium" styles={{ root: { fontWeight: 600, minWidth: 120 } }}>
                    Page Table:
                  </Text>
                  <Text variant="medium">{data.pageTableName || data.pageTable}</Text>
                </Stack>
              )}
              
              {data.pageRecordId && (
                <Stack horizontal tokens={{ childrenGap: 10 }}>
                  <Text variant="medium" styles={{ root: { fontWeight: 600, minWidth: 120 } }}>
                    Page Record:
                  </Text>
                  <Text variant="medium">{data.pageRecordId.substring(0, 8)}...</Text>
                </Stack>
              )}
              
              <Stack horizontal tokens={{ childrenGap: 10 }}>
                <Text variant="medium" styles={{ root: { fontWeight: 600, minWidth: 120 } }}>
                  Target Table:
                </Text>
                <Text variant="medium">{data.targetTableName || data.targetTable}</Text>
              </Stack>
              
              {data.selectedViewName && (
                <Stack horizontal tokens={{ childrenGap: 10 }}>
                  <Text variant="medium" styles={{ root: { fontWeight: 600, minWidth: 120 } }}>
                    Selected View:
                  </Text>
                  <Text variant="medium">{data.selectedViewName}</Text>
                </Stack>
              )}
            </Stack>
          </Stack>

          {/* Environment Variables */}
          <Stack tokens={{ childrenGap: 10 }}>
            <Stack horizontal tokens={{ childrenGap: 10 }} verticalAlign="center">
              <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
                Environment Variables
              </Text>
              <DefaultButton
                text={copied ? "Copied!" : "Copy to Clipboard"}
                iconProps={{ iconName: copied ? "CheckMark" : "Copy" }}
                onClick={handleCopyToClipboard}
                styles={{ 
                  root: { 
                    backgroundColor: copied ? '#107c10' : undefined,
                    borderColor: copied ? '#107c10' : undefined,
                    color: copied ? 'white' : undefined
                  }
                }}
              />
            </Stack>
            
            <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
              Copy these variables to your project's .env file:
            </Text>
            
            <TextField
              multiline
              rows={envVarsText.split('\n').length + 1}
              value={envVarsText}
              readOnly
              styles={{
                root: { maxWidth: 600 },
                field: { 
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  fontSize: 13,
                  backgroundColor: '#f8f8f8'
                }
              }}
            />
          </Stack>

          {/* Next Steps */}
          <Stack tokens={{ childrenGap: 10 }}>
            <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
              Next Steps
            </Text>
            <Stack tokens={{ childrenGap: 5 }}>
              <Text variant="medium">1. Copy the environment variables above to your .env file</Text>
              <Text variant="medium">2. Start the development server with your PCF component</Text>
              <Text variant="medium">3. Your component will load with the configured context</Text>
            </Stack>
          </Stack>
        </Stack>
      </Stack.Item>

      {/* Actions */}
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
            padding: 20
          }
        }}
      >
        <DefaultButton text="Back to Setup" onClick={onBackToWizard} />
        <PrimaryButton text="Start Development" onClick={onStartDevelopment} />
      </Stack>
    </Stack>
  )
}