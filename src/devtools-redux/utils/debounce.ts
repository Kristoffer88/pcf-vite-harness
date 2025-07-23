/**
 * Debounce utility for reducing function call frequency
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function debounced(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
      timeout = null
    }, wait)
  }
}

/**
 * Create a debounced callback hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): (...args: Parameters<T>) => void {
  const callbackRef = React.useRef(callback)
  
  // Update callback ref when it changes
  React.useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  // Create stable debounced function
  const debouncedCallback = React.useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
    [delay]
  )
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Cancel any pending calls
      (debouncedCallback as any).cancel?.()
    }
  }, [debouncedCallback])
  
  return debouncedCallback
}

// Add React import for the hook
import * as React from 'react'