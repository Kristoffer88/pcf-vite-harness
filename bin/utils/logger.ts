/**
 * Simple logger utility with progress bars and actionable error hints
 * Extracted from advanced CLI patterns for PCF Vite Harness
 */

export interface LoggerOptions {
  quiet?: boolean
  verbose?: boolean
}

export class SimpleLogger {
  private quiet: boolean
  private verboseMode: boolean

  constructor(options: LoggerOptions = {}) {
    this.quiet = options.quiet || false
    this.verboseMode = options.verbose || false
  }

  info(message: string): void {
    if (this.quiet) return
    console.log(`ℹ️  ${message}`)
  }

  success(message: string): void {
    if (this.quiet) return
    console.log(`✅ ${message}`)
  }

  warning(message: string): void {
    console.log(`⚠️  ${message}`)
  }

  error(message: string, actionableHint?: string): void {
    const fullMessage = actionableHint ? `${message}\n💡 Suggestion: ${actionableHint}` : message
    console.error(`❌ ${fullMessage}`)
  }

  verbose(message: string): void {
    if (this.verboseMode) {
      console.log(`🔍 [VERBOSE] ${message}`)
    }
  }

  progress(current: number, total: number, item?: string): void {
    if (this.quiet) return
    
    const percentage = Math.round((current / total) * 100)
    const itemText = item ? ` - ${item}` : ''
    const progressBar = this.createProgressBar(percentage)
    
    console.log(`📝 ${progressBar} ${current}/${total} (${percentage}%)${itemText}`)
  }
  
  private createProgressBar(percentage: number): string {
    const width = 20
    const filled = Math.round((percentage / 100) * width)
    const empty = width - filled
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`
  }

  /**
   * Display formatted statistics at the end of operations
   */
  stats(title: string, stats: Record<string, string | number>): void {
    if (this.quiet) return
    
    console.log(`📊 ${title}:`)
    const entries = Object.entries(stats)
    
    entries.forEach(([key, value], index) => {
      const isLast = index === entries.length - 1
      const prefix = isLast ? '   └─' : '   ├─'
      console.log(`${prefix} ${key}: ${value}`)
    })
  }

  /**
   * Get actionable hint for common error patterns
   */
  static getActionableHint(errorMessage: string): string | undefined {
    if (errorMessage.includes('ENOENT')) {
      return 'Check that the specified paths exist'
    } else if (errorMessage.includes('EACCES') || errorMessage.includes('not writable')) {
      return 'Check directory permissions or run with appropriate privileges'
    } else if (errorMessage.includes('Invalid entity name')) {
      return 'Use valid entity logical names (lowercase, underscore separated)'
    } else if (errorMessage.includes('Connection failed')) {
      return 'Verify your URL and authentication settings'
    } else if (errorMessage.includes('EADDRINUSE')) {
      return 'Port is already in use, try a different port number'
    } else if (errorMessage.includes('command not found')) {
      return 'Make sure the required CLI tools are installed and in your PATH'
    }
    
    return undefined
  }
}