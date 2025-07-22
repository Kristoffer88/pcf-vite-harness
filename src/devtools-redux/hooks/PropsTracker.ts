/**
 * PCF Props Tracker
 * Tracks property changes and provides insights into component behavior
 */

export interface PropChange {
  id: string
  propName: string
  oldValue: any
  newValue: any
  timestamp: number
  changeType: 'added' | 'modified' | 'removed'
  componentId?: string
}

export interface PropSnapshot {
  id: string
  componentId: string
  timestamp: number
  props: Record<string, any>
  context?: any
}

export interface PropAnalysis {
  propName: string
  changeCount: number
  firstSeen: number
  lastSeen: number
  uniqueValues: Set<any>
  changeFrequency: number // changes per minute
  hasPattern: boolean
  patternDescription?: string
}

export class PropsTrackerManager {
  private propChanges: PropChange[] = []
  private propSnapshots: PropSnapshot[] = []
  private propAnalytics: Map<string, PropAnalysis> = new Map()
  private componentSubscriptions: Map<string, Set<(changes: PropChange[]) => void>> = new Map()

  /**
   * Track a property change
   */
  trackPropChange(
    componentId: string,
    propName: string,
    oldValue: any,
    newValue: any,
    changeType: PropChange['changeType'] = 'modified'
  ): PropChange {
    const change: PropChange = {
      id: this.generateChangeId(),
      propName,
      oldValue,
      newValue,
      timestamp: Date.now(),
      changeType,
      componentId
    }

    this.propChanges.push(change)
    this.updateAnalytics(propName, change)
    this.notifySubscribers(componentId, [change])
    this.trimChanges()

    return change
  }

  /**
   * Take a snapshot of all component props
   */
  takeSnapshot(componentId: string, props: Record<string, any>, context?: any): PropSnapshot {
    const snapshot: PropSnapshot = {
      id: this.generateSnapshotId(),
      componentId,
      timestamp: Date.now(),
      props: this.deepClone(props),
      context: context ? this.serializeContext(context) : undefined
    }

    this.propSnapshots.push(snapshot)
    this.trimSnapshots()

    return snapshot
  }

  /**
   * Compare two snapshots and generate prop changes
   */
  compareSnapshots(oldSnapshot: PropSnapshot, newSnapshot: PropSnapshot): PropChange[] {
    if (oldSnapshot.componentId !== newSnapshot.componentId) {
      throw new Error('Cannot compare snapshots from different components')
    }

    const changes: PropChange[] = []
    const oldProps = oldSnapshot.props
    const newProps = newSnapshot.props

    // Check for added and modified props
    for (const [propName, newValue] of Object.entries(newProps)) {
      if (!(propName in oldProps)) {
        changes.push(this.trackPropChange(
          newSnapshot.componentId,
          propName,
          undefined,
          newValue,
          'added'
        ))
      } else if (!this.deepEqual(oldProps[propName], newValue)) {
        changes.push(this.trackPropChange(
          newSnapshot.componentId,
          propName,
          oldProps[propName],
          newValue,
          'modified'
        ))
      }
    }

    // Check for removed props
    for (const [propName, oldValue] of Object.entries(oldProps)) {
      if (!(propName in newProps)) {
        changes.push(this.trackPropChange(
          newSnapshot.componentId,
          propName,
          oldValue,
          undefined,
          'removed'
        ))
      }
    }

    return changes
  }

  /**
   * Subscribe to prop changes for a specific component
   */
  subscribe(componentId: string, callback: (changes: PropChange[]) => void): () => void {
    if (!this.componentSubscriptions.has(componentId)) {
      this.componentSubscriptions.set(componentId, new Set())
    }
    
    this.componentSubscriptions.get(componentId)!.add(callback)

    return () => {
      this.componentSubscriptions.get(componentId)?.delete(callback)
    }
  }

  /**
   * Get prop changes for a component
   */
  getChangesForComponent(componentId: string, limit?: number): PropChange[] {
    const changes = this.propChanges.filter(change => change.componentId === componentId)
    return limit ? changes.slice(-limit) : changes
  }

  /**
   * Get all changes for a specific prop
   */
  getChangesForProp(propName: string, limit?: number): PropChange[] {
    const changes = this.propChanges.filter(change => change.propName === propName)
    return limit ? changes.slice(-limit) : changes
  }

  /**
   * Get snapshots for a component
   */
  getSnapshotsForComponent(componentId: string, limit?: number): PropSnapshot[] {
    const snapshots = this.propSnapshots.filter(snapshot => snapshot.componentId === componentId)
    return limit ? snapshots.slice(-limit) : snapshots
  }

  /**
   * Get analytics for a specific prop
   */
  getPropAnalysis(propName: string): PropAnalysis | undefined {
    return this.propAnalytics.get(propName)
  }

  /**
   * Get analytics for all tracked props
   */
  getAllPropAnalytics(): Map<string, PropAnalysis> {
    return new Map(this.propAnalytics)
  }

  /**
   * Get frequently changing props
   */
  getFrequentlyChangingProps(threshold: number = 5): PropAnalysis[] {
    return Array.from(this.propAnalytics.values())
      .filter(analysis => analysis.changeFrequency > threshold)
      .sort((a, b) => b.changeFrequency - a.changeFrequency)
  }

  /**
   * Get props with unusual patterns
   */
  getPropsWithPatterns(): PropAnalysis[] {
    return Array.from(this.propAnalytics.values())
      .filter(analysis => analysis.hasPattern)
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.propChanges = []
    this.propSnapshots = []
    this.propAnalytics.clear()
  }

  /**
   * Clear data for specific component
   */
  clearComponent(componentId: string): void {
    this.propChanges = this.propChanges.filter(change => change.componentId !== componentId)
    this.propSnapshots = this.propSnapshots.filter(snapshot => snapshot.componentId !== componentId)
    this.componentSubscriptions.delete(componentId)
  }

  /**
   * Get summary statistics
   */
  getSummaryStats() {
    const componentIds = new Set(this.propChanges.map(c => c.componentId).filter(Boolean))
    const propNames = new Set(this.propChanges.map(c => c.propName))
    
    return {
      totalChanges: this.propChanges.length,
      totalComponents: componentIds.size,
      totalProps: propNames.size,
      totalSnapshots: this.propSnapshots.length,
      mostActiveComponent: this.getMostActiveComponent(),
      mostChangedProp: this.getMostChangedProp()
    }
  }

  private updateAnalytics(propName: string, change: PropChange): void {
    let analysis = this.propAnalytics.get(propName)
    
    if (!analysis) {
      analysis = {
        propName,
        changeCount: 0,
        firstSeen: change.timestamp,
        lastSeen: change.timestamp,
        uniqueValues: new Set(),
        changeFrequency: 0,
        hasPattern: false
      }
      this.propAnalytics.set(propName, analysis)
    }

    // Update basic stats
    analysis.changeCount++
    analysis.lastSeen = change.timestamp
    analysis.uniqueValues.add(this.serializeValue(change.newValue))

    // Calculate frequency (changes per minute)
    const durationMinutes = (analysis.lastSeen - analysis.firstSeen) / (1000 * 60)
    analysis.changeFrequency = durationMinutes > 0 ? analysis.changeCount / durationMinutes : 0

    // Detect patterns
    this.detectPatterns(analysis, propName)
  }

  private detectPatterns(analysis: PropAnalysis, propName: string): void {
    const recentChanges = this.getChangesForProp(propName, 10)
    
    if (recentChanges.length < 3) return

    // Check for rapid toggling between two values
    const values = recentChanges.map(c => this.serializeValue(c.newValue))
    const uniqueRecentValues = new Set(values)
    
    if (uniqueRecentValues.size === 2 && analysis.changeCount > 5) {
      analysis.hasPattern = true
      analysis.patternDescription = 'Rapid toggling between two values'
      return
    }

    // Check for incremental changes (numbers)
    if (this.isNumericProgression(recentChanges)) {
      analysis.hasPattern = true
      analysis.patternDescription = 'Incremental numeric progression'
      return
    }

    // Check for cyclic changes
    if (this.isCyclicPattern(values)) {
      analysis.hasPattern = true
      analysis.patternDescription = 'Cyclic pattern detected'
      return
    }

    // Reset pattern if none detected
    analysis.hasPattern = false
    analysis.patternDescription = undefined
  }

  private isNumericProgression(changes: PropChange[]): boolean {
    const numericValues = changes
      .map(c => c.newValue)
      .filter(v => typeof v === 'number')
      .slice(-5) // Check last 5 numeric values
    
    if (numericValues.length < 3) return false
    
    const differences: number[] = []
    for (let i = 1; i < numericValues.length; i++) {
      const current = numericValues[i]
      const previous = numericValues[i - 1]
      if (current !== undefined && previous !== undefined) {
        differences.push(current - previous)
      }
    }
    
    if (differences.length === 0) return false
    
    // Check if differences are consistent (arithmetic progression)
    const firstDiff = differences[0]
    if (firstDiff === undefined) return false
    
    return differences.every(diff => Math.abs(diff - firstDiff) < 0.001)
  }

  private isCyclicPattern(values: any[]): boolean {
    if (values.length < 6) return false
    
    // Check for patterns of length 2, 3, or 4
    for (let patternLength = 2; patternLength <= 4; patternLength++) {
      if (this.hasRepeatingPattern(values, patternLength)) {
        return true
      }
    }
    
    return false
  }

  private hasRepeatingPattern(values: any[], patternLength: number): boolean {
    if (values.length < patternLength * 2) return false
    
    const pattern = values.slice(-patternLength * 2, -patternLength)
    const recent = values.slice(-patternLength)
    
    return JSON.stringify(pattern) === JSON.stringify(recent)
  }

  private getMostActiveComponent(): string | undefined {
    const componentCounts = new Map<string, number>()
    
    this.propChanges.forEach(change => {
      if (change.componentId) {
        componentCounts.set(
          change.componentId,
          (componentCounts.get(change.componentId) || 0) + 1
        )
      }
    })
    
    let maxCount = 0
    let mostActive: string | undefined
    
    componentCounts.forEach((count, componentId) => {
      if (count > maxCount) {
        maxCount = count
        mostActive = componentId
      }
    })
    
    return mostActive
  }

  private getMostChangedProp(): string | undefined {
    let maxCount = 0
    let mostChanged: string | undefined
    
    this.propAnalytics.forEach((analysis, propName) => {
      if (analysis.changeCount > maxCount) {
        maxCount = analysis.changeCount
        mostChanged = propName
      }
    })
    
    return mostChanged
  }

  private notifySubscribers(componentId: string, changes: PropChange[]): void {
    const subscribers = this.componentSubscriptions.get(componentId)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(changes)
        } catch (error) {
          console.warn('Props tracker subscriber error:', error)
        }
      })
    }
  }

  private deepClone(obj: any): any {
    try {
      return JSON.parse(JSON.stringify(obj))
    } catch {
      return obj // Return original if not serializable
    }
  }

  private deepEqual(a: any, b: any): boolean {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return a === b // Fallback to reference equality
    }
  }

  private serializeValue(value: any): string {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  private serializeContext(context: any): any {
    // Simplified context serialization
    try {
      return {
        mode: context.mode,
        hasParameters: !!context.parameters,
        parameterCount: context.parameters ? Object.keys(context.parameters).length : 0
      }
    } catch {
      return { error: 'Failed to serialize context' }
    }
  }

  private trimChanges(): void {
    if (this.propChanges.length > 1000) {
      this.propChanges = this.propChanges.slice(-1000)
    }
  }

  private trimSnapshots(): void {
    if (this.propSnapshots.length > 100) {
      this.propSnapshots = this.propSnapshots.slice(-100)
    }
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Global instance
export const propsTracker = new PropsTrackerManager()

// React hook for props tracking
export const usePropsTracker = (componentId: string) => {
  return {
    trackChange: (propName: string, oldValue: any, newValue: any, changeType?: PropChange['changeType']) => {
      return propsTracker.trackPropChange(componentId, propName, oldValue, newValue, changeType)
    },
    
    takeSnapshot: (props: Record<string, any>, context?: any) => {
      return propsTracker.takeSnapshot(componentId, props, context)
    },
    
    subscribe: (callback: (changes: PropChange[]) => void) => {
      return propsTracker.subscribe(componentId, callback)
    },
    
    getChanges: (limit?: number) => {
      return propsTracker.getChangesForComponent(componentId, limit)
    },
    
    getSnapshots: (limit?: number) => {
      return propsTracker.getSnapshotsForComponent(componentId, limit)
    },
    
    clear: () => {
      propsTracker.clearComponent(componentId)
    }
  }
}