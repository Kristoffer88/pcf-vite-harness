/**
 * Cache Manager
 * Generic caching utility with TTL support
 * Pure utility class with no external dependencies
 */

export interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl?: number
}

export interface CacheOptions {
  defaultTTL?: number // Default time to live in milliseconds
  maxSize?: number // Maximum number of entries
  cleanupInterval?: number // How often to clean expired entries (ms)
}

export class CacheManager<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private cleanupTimer?: NodeJS.Timeout
  private options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      defaultTTL: options.defaultTTL ?? 300000, // 5 minutes
      maxSize: options.maxSize ?? 1000,
      cleanupInterval: options.cleanupInterval ?? 60000, // 1 minute
    }

    this.startCleanupTimer()
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Remove oldest entries if at max size
    if (this.cache.size >= this.options.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.defaultTTL,
    })
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return undefined
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate?: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
    }
  }

  /**
   * Get or compute a value (memoization pattern)
   */
  async getOrCompute(
    key: string,
    computeFn: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key)
    
    if (cached !== undefined) {
      return cached
    }

    const value = await computeFn()
    this.set(key, value, ttl)
    return value
  }

  /**
   * Update cache options
   */
  updateOptions(options: Partial<CacheOptions>): void {
    this.options = { ...this.options, ...options }
    
    // Restart cleanup timer if interval changed
    if (options.cleanupInterval !== undefined) {
      this.stopCleanupTimer()
      this.startCleanupTimer()
    }
  }

  /**
   * Manually trigger cleanup of expired entries
   */
  cleanup(): number {
    let removedCount = 0
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key)
        removedCount++
      }
    }

    return removedCount
  }

  /**
   * Get all keys (including expired ones)
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get all valid (non-expired) keys
   */
  validKeys(): string[] {
    const now = Date.now()
    const validKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry, now)) {
        validKeys.push(key)
      }
    }

    return validKeys
  }

  /**
   * Destroy the cache manager and cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer()
    this.clear()
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry<T>, now: number = Date.now()): boolean {
    if (!entry.ttl) return false
    return now - entry.timestamp > entry.ttl
  }

  /**
   * Remove oldest entries when at capacity
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Start the automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.options.cleanupInterval)
  }

  /**
   * Stop the automatic cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }
}

/**
 * Create cache instances for common use cases
 */
export const createMetadataCache = () => new CacheManager({
  defaultTTL: 300000, // 5 minutes
  maxSize: 500,
})

export const createQueryCache = () => new CacheManager({
  defaultTTL: 60000, // 1 minute  
  maxSize: 200,
})