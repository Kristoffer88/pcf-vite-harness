/**
 * useStableEntityDetection Hook
 * Prevents excessive entity detection calls and provides stable entity state
 */

import { useCallback, useRef, useState, useEffect } from 'react'

interface EntityDetectionOptions {
  debounceMs?: number
  logChanges?: boolean
}

export function useStableEntityDetection(
  detectEntity: () => string,
  dependencies: React.DependencyList = [],
  options: EntityDetectionOptions = {}
): [string, () => void] {
  const { debounceMs = 300, logChanges = true } = options
  
  const [entity, setEntity] = useState<string>('unknown')
  const lastDetectedEntity = useRef<string>('unknown')
  const detectionTimer = useRef<NodeJS.Timeout | null>(null)
  const detectionCount = useRef(0)
  
  // Stable detection function that only updates when entity actually changes
  const performDetection = useCallback(() => {
    detectionCount.current++
    
    const newEntity = detectEntity()
    
    // Only update if entity actually changed
    if (newEntity !== lastDetectedEntity.current) {
      if (logChanges) {
        console.log(`🔄 Entity changed: ${lastDetectedEntity.current} → ${newEntity} (detection #${detectionCount.current})`)
      }
      lastDetectedEntity.current = newEntity
      setEntity(newEntity)
    } else if (detectionCount.current > 10 && logChanges) {
      // Warn about excessive detections
      console.warn(`⚠️ Excessive entity detections (${detectionCount.current}) without changes. Consider optimizing.`)
      detectionCount.current = 0 // Reset counter
    }
  }, [detectEntity, logChanges])
  
  // Debounced detection trigger
  const triggerDetection = useCallback(() => {
    if (detectionTimer.current) {
      clearTimeout(detectionTimer.current)
    }
    
    detectionTimer.current = setTimeout(() => {
      performDetection()
      detectionTimer.current = null
    }, debounceMs)
  }, [performDetection, debounceMs])
  
  // Run detection when dependencies change
  useEffect(() => {
    triggerDetection()
    
    return () => {
      if (detectionTimer.current) {
        clearTimeout(detectionTimer.current)
      }
    }
  }, [...dependencies, triggerDetection])
  
  // Reset detection count periodically
  useEffect(() => {
    const resetInterval = setInterval(() => {
      detectionCount.current = 0
    }, 60000) // Reset every minute
    
    return () => clearInterval(resetInterval)
  }, [])
  
  return [entity, triggerDetection]
}

/**
 * Hook to track and warn about excessive re-renders
 */
export function useRenderTracker(componentName: string, threshold = 10) {
  const renderCount = useRef(0)
  const lastResetTime = useRef(Date.now())
  
  useEffect(() => {
    renderCount.current++
    
    const timeSinceReset = Date.now() - lastResetTime.current
    const rendersPerSecond = (renderCount.current / timeSinceReset) * 1000
    
    if (rendersPerSecond > threshold) {
      console.warn(
        `⚠️ High render rate in ${componentName}: ${rendersPerSecond.toFixed(1)} renders/sec ` +
        `(${renderCount.current} renders in ${(timeSinceReset / 1000).toFixed(1)}s)`
      )
      
      // Reset counter
      renderCount.current = 0
      lastResetTime.current = Date.now()
    }
  })
}