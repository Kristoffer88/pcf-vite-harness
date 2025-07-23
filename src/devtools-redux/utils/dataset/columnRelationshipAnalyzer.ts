/**
 * Column Relationship Analyzer
 * Analyzes dataset columns to discover potential relationships
 * while avoiding false positives from primary keys
 */

import type { DiscoveredRelationship } from './metadataDiscovery'

export interface ColumnAnalysisResult {
  potentialLookups: Array<{
    columnName: string
    inferredFieldName: string
    isPrimaryKey: boolean
    warning?: string
  }>
  discoveredRelationships: DiscoveredRelationship[]
}

/**
 * Analyze dataset columns for potential lookup relationships
 */
export async function analyzeColumnsForRelationships(
  columns: any[],
  currentEntity: string,
  webAPI?: ComponentFramework.WebApi
): Promise<ColumnAnalysisResult> {
  console.log(`🔍 Analyzing ${columns.length} columns from ${currentEntity} for relationships...`)
  
  const result: ColumnAnalysisResult = {
    potentialLookups: [],
    discoveredRelationships: []
  }

  // Get entity metadata including primary key
  let primaryKeyAttribute: string | null = null
  try {
    const entityMetadataUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${currentEntity}')?$select=PrimaryIdAttribute,PrimaryNameAttribute`
    const entityResponse = await fetch(entityMetadataUrl)
    if (entityResponse.ok) {
      const entityData = await entityResponse.json()
      primaryKeyAttribute = entityData.PrimaryIdAttribute
      console.log(`  Entity ${currentEntity} primary key: ${primaryKeyAttribute}`)
    }
  } catch (error) {
    console.warn(`Failed to get entity metadata for ${currentEntity}:`, error)
  }

  // Analyze each column
  for (const column of columns) {
    const columnName = column.name || column.Name
    
    // Check if this looks like a lookup field pattern
    if (columnName && (columnName.endsWith('_value') || columnName.includes('_value@'))) {
      // Extract the field name
      const fieldName = columnName.replace(/_value.*$/, '').replace(/^_/, '')
      const isPrimaryKey = fieldName === primaryKeyAttribute
      
      console.log(`  Potential lookup column: ${columnName}`)
      console.log(`    Inferred field: ${fieldName}`)
      console.log(`    Is primary key: ${isPrimaryKey}`)
      
      const lookupInfo = {
        columnName,
        inferredFieldName: fieldName,
        isPrimaryKey,
        warning: isPrimaryKey ? 'This appears to be the primary key, not a lookup' : undefined
      }
      
      result.potentialLookups.push(lookupInfo)
      
      // If it's not the primary key and we have webAPI, try to get metadata
      if (!isPrimaryKey && webAPI) {
        try {
          const metadataUrl = `/api/data/v9.2/EntityDefinitions(LogicalName='${currentEntity}')/Attributes(LogicalName='${fieldName}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=LogicalName,Targets,DisplayName`
          const response = await fetch(metadataUrl)
          
          if (response.ok) {
            const metadata = await response.json()
            const targets = metadata.Targets || []
            
            if (targets.length > 0) {
              // Create relationships for each target
              targets.forEach((targetEntity: string) => {
                const relationship: DiscoveredRelationship = {
                  parentEntity: targetEntity,
                  childEntity: currentEntity,
                  lookupColumn: `_${fieldName}_value`,
                  relationshipDisplayName: metadata.DisplayName?.UserLocalizedLabel?.Label || `${targetEntity} lookup`,
                  discoveredAt: new Date(),
                  confidence: 'high',
                  source: 'column-analysis',
                }
                
                result.discoveredRelationships.push(relationship)
                console.log(`    ✅ Discovered: ${currentEntity}.${fieldName} -> ${targetEntity}`)
              })
            } else {
              console.log(`    ⚠️ No targets found for ${fieldName}`)
            }
          } else if (response.status === 404) {
            console.log(`    ℹ️ Field ${fieldName} is not a lookup attribute`)
          }
        } catch (error) {
          console.warn(`    Failed to get metadata for ${fieldName}:`, error)
        }
      }
    }
  }
  
  console.log(`\n📊 Column analysis complete:`)
  console.log(`  - Found ${result.potentialLookups.length} potential lookup columns`)
  console.log(`  - Discovered ${result.discoveredRelationships.length} relationships`)
  console.log(`  - Skipped ${result.potentialLookups.filter(l => l.isPrimaryKey).length} primary key columns`)
  
  return result
}

/**
 * Check if a column name represents a lookup field
 */
export function isLookupColumn(columnName: string): boolean {
  return columnName.endsWith('_value') || columnName.includes('_value@')
}

/**
 * Extract field name from lookup column name
 */
export function extractFieldNameFromColumn(columnName: string): string {
  return columnName.replace(/_value.*$/, '').replace(/^_/, '')
}