/**
 * Step4RelationshipSelection - Relationship discovery and selection step
 */

import {
  Stack,
  Text,
  Spinner,
  SpinnerSize,
  MessageBar,
  MessageBarType,
  DefaultButton,
  PrimaryButton,
  ChoiceGroup,
  IChoiceGroupOption,
  Icon,
  type IButton,
} from '@fluentui/react'
import * as React from 'react'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { SetupWizardData, RelationshipOption } from './types'

export interface Step4RelationshipSelectionProps {
  data: SetupWizardData
  onNext: (data: SetupWizardData) => void
  onBack: () => void
}

export const Step4RelationshipSelection: React.FC<Step4RelationshipSelectionProps> = ({
  data,
  onNext,
  onBack,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [relationships, setRelationships] = useState<RelationshipOption[]>([])
  const [selectedRelationshipKey, setSelectedRelationshipKey] = useState<string | undefined>(
    data.selectedRelationship?.schemaName
  )
  const continueButtonRef = useRef<IButton>(null)

  const discoverRelationships = useCallback(async () => {
    if (!data.pageTable || !data.targetTable) {
      setError('Both page table and target table must be selected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`🔍 Discovering relationships between ${data.pageTable} and ${data.targetTable}`)

      // Check OneToMany relationships from page table to target table
      const oneToManyResponse = await fetch(
        `/api/data/v9.2/EntityDefinitions(LogicalName='${data.pageTable}')/OneToManyRelationships?$select=ReferencingEntity,ReferencingAttribute,ReferencedEntity,SchemaName,ReferencedAttribute&$filter=ReferencingEntity eq '${data.targetTable}'`
      )

      // Check ManyToOne relationships from target table to page table  
      const manyToOneResponse = await fetch(
        `/api/data/v9.2/EntityDefinitions(LogicalName='${data.targetTable}')/ManyToOneRelationships?$select=ReferencingEntity,ReferencingAttribute,ReferencedEntity,SchemaName,ReferencedAttribute&$filter=ReferencedEntity eq '${data.pageTable}'`
      )

      const oneToManyRels = oneToManyResponse.ok ? (await oneToManyResponse.json()).value || [] : []
      const manyToOneRels = manyToOneResponse.ok ? (await manyToOneResponse.json()).value || [] : []

      console.log('🔗 Found OneToMany relationships:', oneToManyRels)
      console.log('🔗 Found ManyToOne relationships:', manyToOneRels)

      const discoveredRelationships: RelationshipOption[] = []

      // Process OneToMany relationships
      oneToManyRels.forEach((rel: any) => {
        discoveredRelationships.push({
          schemaName: rel.SchemaName,
          displayName: `${data.pageTableName || data.pageTable} → ${data.targetTableName || data.targetTable}`,
          referencingEntity: rel.ReferencingEntity,
          referencedEntity: rel.ReferencedEntity,
          referencingAttribute: rel.ReferencingAttribute,
          lookupFieldName: `_${rel.ReferencingAttribute}_value`,
          relationshipType: 'OneToMany',
          description: `One ${data.pageTableName || data.pageTable} can have many ${data.targetTableName || data.targetTable} records`
        })
      })

      // Process ManyToOne relationships
      manyToOneRels.forEach((rel: any) => {
        // Avoid duplicates (same relationship can appear in both queries)
        if (!discoveredRelationships.find(r => r.schemaName === rel.SchemaName)) {
          discoveredRelationships.push({
            schemaName: rel.SchemaName,
            displayName: `${data.targetTableName || data.targetTable} → ${data.pageTableName || data.pageTable}`,
            referencingEntity: rel.ReferencingEntity,
            referencedEntity: rel.ReferencedEntity,
            referencingAttribute: rel.ReferencingAttribute,
            lookupFieldName: `_${rel.ReferencingAttribute}_value`,
            relationshipType: 'ManyToOne',
            description: `Many ${data.targetTableName || data.targetTable} records can reference one ${data.pageTableName || data.pageTable}`
          })
        }
      })

      setRelationships(discoveredRelationships)

      // Auto-select if only one relationship found
      if (discoveredRelationships.length === 1) {
        const autoSelected = discoveredRelationships[0]!
        setSelectedRelationshipKey(autoSelected.schemaName)
        console.log('✅ Auto-selected single relationship:', autoSelected.schemaName)
      } else if (discoveredRelationships.length === 0) {
        setError(`No relationships found between ${data.pageTableName || data.pageTable} and ${data.targetTableName || data.targetTable}`)
      }

    } catch (err) {
      console.error('❌ Error discovering relationships:', err)
      setError('Failed to discover relationships. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [data.pageTable, data.targetTable, data.pageTableName, data.targetTableName])

  useEffect(() => {
    discoverRelationships()
  }, [discoverRelationships])

  // Auto-focus Continue button when loading completes and a relationship is selected
  useEffect(() => {
    if (!loading && selectedRelationshipKey) {
      setTimeout(() => {
        continueButtonRef.current?.focus()
      }, 100)
    }
  }, [loading, selectedRelationshipKey])

  const choiceGroupOptions: IChoiceGroupOption[] = relationships.map(rel => ({
    key: rel.schemaName,
    text: rel.displayName,
    secondaryText: rel.description,
    iconProps: {
      iconName: rel.relationshipType === 'OneToMany' ? 'BranchMerge' : 'Merge'
    }
  }))

  const handleNext = useCallback(() => {
    const selectedRelationship = relationships.find(r => r.schemaName === selectedRelationshipKey)
    
    if (!selectedRelationship) {
      setError('Please select a relationship')
      return
    }

    onNext({
      ...data,
      selectedRelationship,
      availableRelationships: relationships
    })
  }, [data, relationships, selectedRelationshipKey, onNext])

  const canProceed = selectedRelationshipKey && relationships.length > 0

  return (
    <Stack tokens={{ childrenGap: 24 }} styles={{ root: { padding: '0 40px', maxWidth: 800 } }}>
      {/* Header */}
      <Stack tokens={{ childrenGap: 8 }}>
        <Text variant="xxLarge" styles={{ root: { fontWeight: 600 } }}>
          Relationship Discovery
        </Text>
        <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
          Finding relationships between {data.pageTableName || data.pageTable} and {data.targetTableName || data.targetTable}
        </Text>
      </Stack>

      {/* Loading State */}
      {loading && (
        <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="center">
          <Spinner size={SpinnerSize.medium} />
          <Text>Discovering relationships...</Text>
        </Stack>
      )}

      {/* Error State */}
      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(null)}>
          {error}
        </MessageBar>
      )}

      {/* Results */}
      {!loading && relationships.length > 0 && (
        <Stack tokens={{ childrenGap: 16 }}>
          {/* Success Message */}
          <MessageBar messageBarType={MessageBarType.success}>
            {relationships.length === 1 
              ? `✅ Found 1 relationship (auto-selected)`
              : `Found ${relationships.length} relationships. Please select one:`
            }
          </MessageBar>

          {/* Relationship Selection */}
          <ChoiceGroup
            options={choiceGroupOptions}
            selectedKey={selectedRelationshipKey}
            onChange={(_, option) => setSelectedRelationshipKey(option?.key)}
            label="Available Relationships"
          />

          {/* Selected Relationship Details */}
          {selectedRelationshipKey && (
            <Stack 
              tokens={{ childrenGap: 12 }} 
              styles={{ 
                root: { 
                  padding: 16, 
                  border: '1px solid #d1d1d1', 
                  borderRadius: 4,
                  backgroundColor: '#f9f9f9'
                } 
              }}
            >
              <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                <Icon iconName="Info" styles={{ root: { color: '#0078d4' } }} />
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                  Relationship Details
                </Text>
              </Stack>
              
              {(() => {
                const selected = relationships.find(r => r.schemaName === selectedRelationshipKey)
                if (!selected) return null
                
                return (
                  <Stack tokens={{ childrenGap: 8 }}>
                    <Stack horizontal tokens={{ childrenGap: 16 }}>
                      <Text><strong>Schema Name:</strong> {selected.schemaName}</Text>
                      <Text><strong>Type:</strong> {selected.relationshipType}</Text>
                    </Stack>
                    <Text><strong>Lookup Field:</strong> {selected.lookupFieldName}</Text>
                    <Text><strong>Direction:</strong> {selected.referencedEntity} → {selected.referencingEntity}</Text>
                  </Stack>
                )
              })()}
            </Stack>
          )}
        </Stack>
      )}

      {/* No Relationships Found */}
      {!loading && relationships.length === 0 && !error && (
        <Stack tokens={{ childrenGap: 16 }}>
          <MessageBar messageBarType={MessageBarType.warning}>
            No direct relationships found between these tables. You may need to configure the relationship manually.
          </MessageBar>
          
          <Stack tokens={{ childrenGap: 8 }}>
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              Next Steps:
            </Text>
            <Text>• Check if there are indirect relationships through other tables</Text>
            <Text>• Verify that the relationship exists in your Dataverse environment</Text>
            <Text>• You can proceed without a relationship for testing purposes</Text>
          </Stack>
        </Stack>
      )}

      {/* Navigation */}
      <Stack horizontal tokens={{ childrenGap: 12 }} horizontalAlign="end">
        <DefaultButton text="Back" onClick={onBack} />
        <PrimaryButton 
          componentRef={continueButtonRef}
          text="Continue" 
          onClick={handleNext}
          disabled={!canProceed && relationships.length > 0}
        />
        {relationships.length === 0 && !loading && (
          <DefaultButton 
            text="Skip & Continue" 
            onClick={() => onNext(data)}
          />
        )}
      </Stack>
    </Stack>
  )
}