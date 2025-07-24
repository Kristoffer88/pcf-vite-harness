/**
 * Dataverse Type Definitions
 * Core types for Dataverse metadata, entities, and WebAPI responses
 */

/**
 * Entity Metadata from Dataverse Web API
 */
export interface EntityMetadata {
  MetadataId: string
  LogicalName: string
  SchemaName: string
  EntitySetName: string
  PrimaryIdAttribute: string
  PrimaryNameAttribute: string
  PrimaryImageAttribute?: string
  LogicalCollectionName?: string
  CollectionSchemaName?: string
  EntityTypeCode?: number
  IsActivity?: boolean
  IsCustomEntity?: boolean
  IsManaged?: boolean
  IsValidForAdvancedFind?: boolean
  DisplayName?: LocalizedLabel
  DisplayCollectionName?: LocalizedLabel
  Description?: LocalizedLabel
  ObjectTypeCode?: number
  OwnershipType?: 'UserOwned' | 'OrganizationOwned' | 'BusinessOwned' | 'None'
  Attributes?: AttributeMetadata[]
}

/**
 * Attribute Metadata from Dataverse Web API
 */
export interface AttributeMetadata {
  MetadataId: string
  LogicalName: string
  SchemaName: string
  AttributeType: AttributeTypeCode
  AttributeTypeName?: AttributeTypeName
  DisplayName?: LocalizedLabel
  Description?: LocalizedLabel
  IsCustomAttribute?: boolean
  IsManaged?: boolean
  IsValidForCreate?: boolean
  IsValidForRead?: boolean
  IsValidForUpdate?: boolean
  IsPrimaryId?: boolean
  IsPrimaryName?: boolean
  RequiredLevel?: RequiredLevel
  MaxLength?: number
  MinValue?: number
  MaxValue?: number
  Precision?: number
  Format?: string
  FormatName?: string
  DateTimeBehavior?: DateTimeBehavior
  Options?: OptionMetadata[]
  Targets?: string[]
}

/**
 * Option Metadata for picklist/optionset fields
 */
export interface OptionMetadata {
  Value: number
  Label: LocalizedLabel
  Description?: LocalizedLabel
  Color?: string
  IsManaged?: boolean
  ExternalValue?: string
}

/**
 * Localized Label structure
 */
export interface LocalizedLabel {
  LocalizedLabels: Array<{
    Label: string
    LanguageCode: number
    IsManaged: boolean
    MetadataId: string
    HasChanged?: boolean | null
  }>
  UserLocalizedLabel?: {
    Label: string
    LanguageCode: number
    IsManaged: boolean
    MetadataId: string
    HasChanged?: boolean | null
  }
}

/**
 * Attribute Type Codes
 */
export type AttributeTypeCode = 
  | 'Boolean'
  | 'Customer'
  | 'DateTime'
  | 'Decimal'
  | 'Double'
  | 'Integer'
  | 'Lookup'
  | 'Money'
  | 'Owner'
  | 'PartyList'
  | 'Picklist'
  | 'State'
  | 'Status'
  | 'String'
  | 'Uniqueidentifier'
  | 'CalendarRules'
  | 'Virtual'
  | 'BigInt'
  | 'ManagedProperty'
  | 'EntityName'
  | 'MultiSelectPicklist'
  | 'Image'
  | 'File'

/**
 * Attribute Type Names (used in OData)
 */
export type AttributeTypeName = {
  Value: AttributeTypeCode
}

/**
 * Required Level for attributes
 */
export type RequiredLevel = {
  Value: 'None' | 'SystemRequired' | 'ApplicationRequired' | 'Recommended'
  CanBeChanged?: boolean
  ManagedPropertyLogicalName?: string
}

/**
 * DateTime Behavior for DateTime attributes
 */
export type DateTimeBehavior = {
  Value: 'UserLocal' | 'DateOnly' | 'TimeZoneIndependent'
}

/**
 * View Metadata
 */
export interface ViewMetadata {
  savedqueryid: string
  name: string
  querytype: number
  fetchxml: string
  layoutxml?: string
  returnedtypecode: string
  isquickfindquery?: boolean
  isdefault?: boolean
  isprivate?: boolean
  iscustomizable?: {
    Value: boolean
    CanBeChanged: boolean
  }
}

/**
 * Relationship Metadata
 */
export interface RelationshipMetadata {
  SchemaName: string
  RelationshipType: 'OneToManyRelationship' | 'ManyToManyRelationship'
  IsManaged?: boolean
  IsCustomizable?: {
    Value: boolean
    CanBeChanged: boolean
  }
  ReferencedEntity?: string
  ReferencedAttribute?: string
  ReferencingEntity?: string
  ReferencingAttribute?: string
  RelationshipBehavior?: number
  CascadeConfiguration?: CascadeConfiguration
}

/**
 * Cascade Configuration for relationships
 */
export interface CascadeConfiguration {
  Assign?: CascadeType
  Share?: CascadeType
  Unshare?: CascadeType
  Reparent?: CascadeType
  Delete?: CascadeType
  Merge?: CascadeType
}

export type CascadeType = 'NoCascade' | 'Cascade' | 'Active' | 'UserOwned' | 'RemoveLink' | 'Restrict'

/**
 * WebAPI Entity Response
 */
export interface DataverseEntity extends Record<string, any> {
  '@odata.context'?: string
  '@odata.etag'?: string
  '@odata.id'?: string
  '@odata.editLink'?: string
  '@odata.type'?: string
}

/**
 * WebAPI Response with Entities
 */
export interface DataverseEntityCollection<T extends DataverseEntity = DataverseEntity> {
  '@odata.context': string
  '@odata.count'?: number
  '@odata.nextLink'?: string
  value: T[]
}

/**
 * Formatted Value Suffix
 */
export const FORMATTED_VALUE_SUFFIX = '@OData.Community.Display.V1.FormattedValue'

/**
 * Navigation Property Suffix  
 */
export const NAVIGATION_PROPERTY_SUFFIX = '@Microsoft.Dynamics.CRM.associatednavigationproperty'

/**
 * Lookup Logical Name Suffix
 */
export const LOOKUP_LOGICALNAME_SUFFIX = '@Microsoft.Dynamics.CRM.lookuplogicalname'

/**
 * Entity Reference
 */
export interface EntityReference {
  id: string
  entityType: string
  name?: string
}

/**
 * Typed entity with formatted values
 */
export type EntityWithFormattedValues<T extends Record<string, any>> = T & {
  [K in keyof T as `${string & K}${typeof FORMATTED_VALUE_SUFFIX}`]?: string
} & {
  [K in keyof T as `${string & K}${typeof NAVIGATION_PROPERTY_SUFFIX}`]?: string
} & {
  [K in keyof T as `${string & K}${typeof LOOKUP_LOGICALNAME_SUFFIX}`]?: string
}