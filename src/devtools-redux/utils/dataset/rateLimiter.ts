/**
 * Rate Limiter for API calls
 * Prevents excessive API calls by queuing and throttling requests
 */

interface QueuedRequest<T> {
  execute: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: any) => void
}

export class RateLimiter {
  private queue: QueuedRequest<any>[] = []
  private processing = false
  private lastCallTime = 0
  
  constructor(
    private minDelay: number = 50, // Minimum delay between calls in ms
    private maxConcurrent: number = 5 // Maximum concurrent requests
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ execute: fn, resolve, reject })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    try {
      // Process up to maxConcurrent requests
      const batch = this.queue.splice(0, this.maxConcurrent)
      
      // Ensure minimum delay between batches
      const now = Date.now()
      const timeSinceLastCall = now - this.lastCallTime
      if (timeSinceLastCall < this.minDelay) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastCall))
      }
      
      this.lastCallTime = Date.now()

      // Execute batch in parallel
      const promises = batch.map(async request => {
        try {
          const result = await request.execute()
          request.resolve(result)
        } catch (error) {
          request.reject(error)
        }
      })

      await Promise.all(promises)
    } finally {
      this.processing = false
      
      // Process next batch if queue is not empty
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), this.minDelay)
      }
    }
  }

  getQueueSize(): number {
    return this.queue.length
  }

  clearQueue(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'))
    })
    this.queue = []
  }
}

// Global rate limiter for metadata API calls
export const metadataRateLimiter = new RateLimiter(50, 3)

// Rate limiter for data API calls
export const dataRateLimiter = new RateLimiter(100, 5)