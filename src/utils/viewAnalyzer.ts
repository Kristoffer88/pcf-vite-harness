/**
 * View Analyzer - Analyze FetchXML queries, view metadata, and performance characteristics
 */

export interface FetchXmlAnalysis {
  isValid: boolean
  entityName?: string
  attributes: string[]
  filters: FetchXmlFilter[]
  joins: FetchXmlJoin[]
  orderBy: FetchXmlOrderBy[]
  groupBy: string[]
  aggregates: FetchXmlAggregate[]
  pagination: {
    hasPageInfo: boolean
    page?: number
    count?: number
  }
  complexity: {
    score: number
    level: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex'
    factors: string[]
  }
  performance: {
    estimatedRows?: number
    warnings: string[]
    suggestions: string[]
  }
  errors: string[]
}

export interface FetchXmlFilter {
  attribute: string
  operator: string
  value?: string
  type: 'filter' | 'condition'
  entityAlias?: string
}

export interface FetchXmlJoin {
  entityName: string
  alias?: string
  type: 'inner' | 'left' | 'natural'
  fromAttribute: string
  toAttribute: string
}

export interface FetchXmlOrderBy {
  attribute: string
  direction: 'asc' | 'desc'
  entityAlias?: string
}

export interface FetchXmlAggregate {
  attribute: string
  function: 'count' | 'sum' | 'avg' | 'min' | 'max'
  alias: string
  entityAlias?: string
}

export interface ViewMetadata {
  columns: ViewColumn[]
  totalWidth?: number
  hasCustomWidth: boolean
  layoutType: 'grid' | 'list' | 'card' | 'unknown'
}

export interface ViewColumn {
  name: string
  width?: number
  isVisible: boolean
  displayName?: string
  dataType?: string
  isPrimaryField: boolean
  isSortable: boolean
}

/**
 * Analyze FetchXML query structure and complexity
 */
export function analyzeFetchXml(fetchXml: string): FetchXmlAnalysis {
  const analysis: FetchXmlAnalysis = {
    isValid: false,
    attributes: [],
    filters: [],
    joins: [],
    orderBy: [],
    groupBy: [],
    aggregates: [],
    pagination: { hasPageInfo: false },
    complexity: { score: 0, level: 'Simple', factors: [] },
    performance: { warnings: [], suggestions: [] },
    errors: [],
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(fetchXml, 'text/xml')

    // Check for XML parsing errors
    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      analysis.errors.push('Invalid XML structure')
      return analysis
    }

    const fetchElement = doc.querySelector('fetch')
    const entityElement = doc.querySelector('entity')

    if (!fetchElement || !entityElement) {
      analysis.errors.push('Missing fetch or entity element')
      return analysis
    }

    analysis.isValid = true
    analysis.entityName = entityElement.getAttribute('name') || undefined

    // Analyze pagination
    const page = entityElement.getAttribute('page')
    const count = entityElement.getAttribute('count')
    if (page || count) {
      analysis.pagination.hasPageInfo = true
      analysis.pagination.page = page ? Number.parseInt(page, 10) : undefined
      analysis.pagination.count = count ? Number.parseInt(count, 10) : undefined
    }

    // Analyze attributes
    analysis.attributes = extractAttributes(entityElement)

    // Analyze filters
    analysis.filters = extractFilters(entityElement)

    // Analyze joins
    analysis.joins = extractJoins(entityElement)

    // Analyze order by
    analysis.orderBy = extractOrderBy(entityElement)

    // Analyze group by and aggregates
    analysis.groupBy = extractGroupBy(entityElement)
    analysis.aggregates = extractAggregates(entityElement)

    // Calculate complexity
    analysis.complexity = calculateComplexity(analysis)

    // Analyze performance
    analysis.performance = analyzePerformance(analysis)
  } catch (error) {
    analysis.errors.push(`Analysis error: ${error}`)
  }

  return analysis
}

/**
 * Extract attribute names from FetchXML
 */
function extractAttributes(entityElement: Element): string[] {
  const attributes: string[] = []
  const attributeElements = entityElement.querySelectorAll('attribute')

  attributeElements.forEach(attr => {
    const name = attr.getAttribute('name')
    if (name) {
      attributes.push(name)
    }
  })

  return attributes
}

/**
 * Extract filter conditions from FetchXML
 */
function extractFilters(entityElement: Element): FetchXmlFilter[] {
  const filters: FetchXmlFilter[] = []

  // Extract conditions
  const conditions = entityElement.querySelectorAll('condition')
  conditions.forEach(condition => {
    const attribute = condition.getAttribute('attribute')
    const operator = condition.getAttribute('operator')
    const value = condition.getAttribute('value')

    if (attribute && operator) {
      filters.push({
        attribute,
        operator,
        value: value || undefined,
        type: 'condition',
      })
    }
  })

  return filters
}

/**
 * Extract join information from FetchXML
 */
function extractJoins(entityElement: Element): FetchXmlJoin[] {
  const joins: FetchXmlJoin[] = []

  const linkEntities = entityElement.querySelectorAll('link-entity')
  linkEntities.forEach(linkEntity => {
    const entityName = linkEntity.getAttribute('name')
    const alias = linkEntity.getAttribute('alias')
    const linkType = linkEntity.getAttribute('link-type') || 'inner'
    const from = linkEntity.getAttribute('from')
    const to = linkEntity.getAttribute('to')

    if (entityName && from && to) {
      joins.push({
        entityName,
        alias: alias || undefined,
        type: linkType as 'inner' | 'left' | 'natural',
        fromAttribute: from,
        toAttribute: to,
      })
    }
  })

  return joins
}

/**
 * Extract order by clauses from FetchXML
 */
function extractOrderBy(entityElement: Element): FetchXmlOrderBy[] {
  const orderBy: FetchXmlOrderBy[] = []

  const orderElements = entityElement.querySelectorAll('order')
  orderElements.forEach(order => {
    const attribute = order.getAttribute('attribute')
    const descending = order.getAttribute('descending')
    const entityName = order.getAttribute('entityname')

    if (attribute) {
      orderBy.push({
        attribute,
        direction: descending === 'true' ? 'desc' : 'asc',
        entityAlias: entityName || undefined,
      })
    }
  })

  return orderBy
}

/**
 * Extract group by attributes from FetchXML
 */
function extractGroupBy(entityElement: Element): string[] {
  const groupBy: string[] = []

  const attributeElements = entityElement.querySelectorAll('attribute')
  attributeElements.forEach(attr => {
    const groupByAttr = attr.getAttribute('groupby')
    const name = attr.getAttribute('name')

    if (groupByAttr === 'true' && name) {
      groupBy.push(name)
    }
  })

  return groupBy
}

/**
 * Extract aggregate functions from FetchXML
 */
function extractAggregates(entityElement: Element): FetchXmlAggregate[] {
  const aggregates: FetchXmlAggregate[] = []

  const attributeElements = entityElement.querySelectorAll('attribute')
  attributeElements.forEach(attr => {
    const aggregate = attr.getAttribute('aggregate')
    const name = attr.getAttribute('name')
    const alias = attr.getAttribute('alias')

    if (aggregate && name && alias) {
      aggregates.push({
        attribute: name,
        function: aggregate as FetchXmlAggregate['function'],
        alias,
        entityAlias: attr.getAttribute('entityname') || undefined,
      })
    }
  })

  return aggregates
}

/**
 * Calculate query complexity score and level
 */
function calculateComplexity(analysis: FetchXmlAnalysis): FetchXmlAnalysis['complexity'] {
  let score = 0
  const factors: string[] = []

  // Base complexity factors
  if (analysis.attributes.length > 10) {
    score += 2
    factors.push(`Many attributes (${analysis.attributes.length})`)
  }

  if (analysis.filters.length > 5) {
    score += 2
    factors.push(`Many filters (${analysis.filters.length})`)
  }

  if (analysis.joins.length > 0) {
    score += analysis.joins.length * 2
    factors.push(`${analysis.joins.length} join(s)`)
  }

  if (analysis.aggregates.length > 0) {
    score += analysis.aggregates.length
    factors.push(`${analysis.aggregates.length} aggregate(s)`)
  }

  if (analysis.groupBy.length > 0) {
    score += 2
    factors.push('Grouping operations')
  }

  // Determine complexity level
  let level: FetchXmlAnalysis['complexity']['level']
  if (score <= 2) {
    level = 'Simple'
  } else if (score <= 5) {
    level = 'Moderate'
  } else if (score <= 10) {
    level = 'Complex'
  } else {
    level = 'Very Complex'
  }

  return { score, level, factors }
}

/**
 * Analyze performance characteristics and provide suggestions
 */
function analyzePerformance(analysis: FetchXmlAnalysis): FetchXmlAnalysis['performance'] {
  const warnings: string[] = []
  const suggestions: string[] = []

  // Check for performance issues
  if (analysis.attributes.length > 20) {
    warnings.push('Query selects many attributes which may impact performance')
    suggestions.push('Consider selecting only needed attributes')
  }

  if (analysis.joins.length > 3) {
    warnings.push('Multiple joins may slow down the query')
    suggestions.push('Review if all joins are necessary')
  }

  if (analysis.filters.length === 0 && analysis.joins.length === 0) {
    warnings.push('Query has no filters and may return large result set')
    suggestions.push('Add appropriate filters to limit results')
  }

  // Check for missing pagination
  if (!analysis.pagination.hasPageInfo && analysis.joins.length > 0) {
    suggestions.push('Consider adding pagination for queries with joins')
  }

  // Check filter efficiency
  const inefficientOperators = analysis.filters.filter(
    f => f.operator === 'like' || f.operator === 'begins-with' || f.operator === 'ends-with'
  )
  if (inefficientOperators.length > 0) {
    warnings.push('Query contains potentially slow text search operators')
    suggestions.push('Consider using exact matches where possible')
  }

  return { warnings, suggestions }
}

/**
 * Analyze view layout XML to extract column information
 */
export function analyzeViewLayout(layoutXml?: string): ViewMetadata {
  const metadata: ViewMetadata = {
    columns: [],
    hasCustomWidth: false,
    layoutType: 'unknown',
  }

  if (!layoutXml) {
    return metadata
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(layoutXml, 'text/xml')

    // Determine layout type
    if (doc.querySelector('grid')) {
      metadata.layoutType = 'grid'
    } else if (doc.querySelector('list')) {
      metadata.layoutType = 'list'
    }

    // Extract column information
    const cellElements = doc.querySelectorAll('cell')
    let totalWidth = 0

    cellElements.forEach(cell => {
      const name = cell.getAttribute('name')
      const width = cell.getAttribute('width')
      const isVisible = cell.getAttribute('ishidden') !== 'true'
      const isPrimary = cell.getAttribute('isprimary') === 'true'

      if (name) {
        const column: ViewColumn = {
          name,
          width: width ? Number.parseInt(width, 10) : undefined,
          isVisible,
          isPrimaryField: isPrimary,
          isSortable: cell.getAttribute('disableSorting') !== 'true',
        }

        if (column.width) {
          totalWidth += column.width
          metadata.hasCustomWidth = true
        }

        metadata.columns.push(column)
      }
    })

    if (totalWidth > 0) {
      metadata.totalWidth = totalWidth
    }
  } catch (error) {
    console.error('Failed to analyze view layout:', error)
  }

  return metadata
}

/**
 * Validate FetchXML syntax and structure
 */
export function validateFetchXml(fetchXml: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(fetchXml, 'text/xml')

    // Check for parser errors
    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      errors.push('Invalid XML syntax')
      return { isValid: false, errors }
    }

    // Check required elements
    const fetchElement = doc.querySelector('fetch')
    if (!fetchElement) {
      errors.push('Missing <fetch> element')
    }

    const entityElement = doc.querySelector('entity')
    if (!entityElement) {
      errors.push('Missing <entity> element')
    } else {
      const entityName = entityElement.getAttribute('name')
      if (!entityName) {
        errors.push('Entity element missing name attribute')
      }
    }

    // Validate attributes
    const attributeElements = entityElement?.querySelectorAll('attribute') || []
    attributeElements.forEach((attr, index) => {
      const name = attr.getAttribute('name')
      if (!name) {
        errors.push(`Attribute ${index + 1} missing name attribute`)
      }
    })

    // Validate conditions
    const conditionElements = entityElement?.querySelectorAll('condition') || []
    conditionElements.forEach((condition, index) => {
      const attribute = condition.getAttribute('attribute')
      const operator = condition.getAttribute('operator')

      if (!attribute) {
        errors.push(`Condition ${index + 1} missing attribute`)
      }
      if (!operator) {
        errors.push(`Condition ${index + 1} missing operator`)
      }
    })
  } catch (error) {
    errors.push(`Validation error: ${error}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Extract all entity names referenced in a FetchXML query
 */
export function extractReferencedEntities(fetchXml: string): string[] {
  const entities = new Set<string>()

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(fetchXml, 'text/xml')

    // Main entity
    const entityElement = doc.querySelector('entity')
    if (entityElement) {
      const name = entityElement.getAttribute('name')
      if (name) entities.add(name)
    }

    // Linked entities
    const linkElements = doc.querySelectorAll('link-entity')
    linkElements.forEach(link => {
      const name = link.getAttribute('name')
      if (name) entities.add(name)
    })
  } catch (error) {
    console.error('Failed to extract referenced entities:', error)
  }

  return Array.from(entities)
}
