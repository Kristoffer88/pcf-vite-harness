/**
 * Types for the PCF Setup Wizard
 */

export interface SetupWizardData {
  // Step 1: Page table selection (optional)
  pageTable?: string
  pageTableName?: string

  // Step 2: Page record ID (when page table is selected)
  pageRecordId?: string

  // Step 3: Target/record table (required)
  targetTable: string
  targetTableName?: string

  // Step 3.5: Relationship selection
  selectedRelationship?: RelationshipOption
  availableRelationships?: RelationshipOption[]

  // Step 4: View selection
  selectedViewId?: string
  selectedViewName?: string
}

export interface WizardStep {
  id: number
  title: string
  description: string
  isOptional?: boolean
  isComplete: boolean
  isActive: boolean
}

export interface EntityOption {
  logicalName: string
  displayName?: string
  entitySetName?: string
}

export interface FormOption {
  formId: string
  formName: string
  entityTypeCode: number
  entityLogicalName?: string
  pcfControls: number
}

export interface RelationshipOption {
  schemaName: string
  displayName: string
  referencingEntity: string
  referencedEntity: string
  referencingAttribute: string
  lookupFieldName: string
  relationshipType: 'OneToMany' | 'ManyToOne'
  description?: string
}
