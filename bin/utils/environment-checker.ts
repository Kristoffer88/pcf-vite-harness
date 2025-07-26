/**
 * Environment checker utility for PCF Vite Harness
 * Validates Azure CLI, authentication, PAC CLI, and other required tools
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { SimpleLogger } from './logger.js'

const execAsync = promisify(exec)

export interface EnvironmentCheckResult {
  isValid: boolean
  message?: string
  version?: string
  details?: string
}

export interface EnvironmentStatus {
  nodejs: EnvironmentCheckResult
  azureCLI: EnvironmentCheckResult
  azureAuth: EnvironmentCheckResult
  pacCLI: EnvironmentCheckResult
  git?: EnvironmentCheckResult
}

export class EnvironmentChecker {
  private logger: SimpleLogger

  constructor(logger: SimpleLogger) {
    this.logger = logger
  }

  /**
   * Perform comprehensive environment checks
   */
  async checkEnvironment(options: {
    requireAuth?: boolean
    requireGit?: boolean
  } = {}): Promise<EnvironmentStatus> {
    this.logger.info('🔍 Checking development environment...')
    
    const status: EnvironmentStatus = {
      nodejs: await this.checkNodeJS(),
      azureCLI: await this.checkAzureCLI(),
      azureAuth: options.requireAuth !== false ? await this.checkAzureAuth() : { isValid: true },
      pacCLI: await this.checkPacCLI(),
      git: options.requireGit ? await this.checkGit() : undefined
    }

    // Report results
    this.reportEnvironmentStatus(status)

    return status
  }

  /**
   * Quick basic checks (Node.js, Azure CLI, PAC CLI)
   */
  async checkBasicEnvironment(): Promise<EnvironmentStatus> {
    this.logger.info('🔍 Checking basic development environment...')
    
    const status: EnvironmentStatus = {
      nodejs: await this.checkNodeJS(),
      azureCLI: await this.checkAzureCLI(),
      azureAuth: { isValid: true }, // Skip auth check for basic
      pacCLI: await this.checkPacCLI()
    }

    // Report results (skip auth in basic mode)
    this.reportEnvironmentStatus(status, { skipAuth: true })

    return status
  }

  /**
   * Check Node.js version
   */
  private async checkNodeJS(): Promise<EnvironmentCheckResult> {
    const nodeVersion = process.version
    const majorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[0] ?? '0')
    
    if (majorVersion < 18) {
      return {
        isValid: false,
        message: `Node.js 18 or higher is required. Current version: ${nodeVersion}`,
        version: nodeVersion
      }
    }

    this.logger.verbose(`Node.js version: ${nodeVersion}`)
    return { isValid: true, version: nodeVersion }
  }

  /**
   * Check Azure CLI availability
   */
  private async checkAzureCLI(): Promise<EnvironmentCheckResult> {
    try {
      const { stdout } = await execAsync('az --version')
      const versionMatch = stdout.match(/azure-cli\\s+([^\\s]+)/)
      const version = versionMatch?.[1]?.trim()
      
      this.logger.verbose(`Azure CLI version: ${version || 'unknown'}`)
      return { isValid: true, version }
    } catch (error) {
      return {
        isValid: false,
        message: 'Azure CLI not found. Please install it first: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli'
      }
    }
  }

  /**
   * Check Azure authentication status
   */
  private async checkAzureAuth(): Promise<EnvironmentCheckResult> {
    try {
      const { stdout } = await execAsync('az account show')
      const accountInfo = JSON.parse(stdout)
      
      if (accountInfo.user?.name) {
        this.logger.verbose(`Azure authentication: ${accountInfo.user.name}`)
        return { 
          isValid: true, 
          version: accountInfo.user.name,
          details: accountInfo.name // Subscription name
        }
      } else {
        return {
          isValid: false,
          message: 'Azure authentication found but user information is incomplete'
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('az login')) {
        return {
          isValid: false,
          message: 'Not logged in to Azure. Please run: az login'
        }
      }
      
      return {
        isValid: false,
        message: 'Could not verify Azure authentication. Please run: az login'
      }
    }
  }

  /**
   * Check Power Platform CLI availability
   */
  private async checkPacCLI(): Promise<EnvironmentCheckResult> {
    try {
      const { stdout } = await execAsync('pac help')
      const versionMatch = stdout.match(/Version: ([^\\n]+)/)
      const version = versionMatch?.[1]?.trim()
      
      this.logger.verbose(`PAC CLI version: ${version || 'unknown'}`)
      return { isValid: true, version }
    } catch (error) {
      return {
        isValid: false,
        message: 'Power Platform CLI (pac) not found. Please install it first: https://docs.microsoft.com/en-us/power-platform/developer/cli/introduction'
      }
    }
  }

  /**
   * Check Git availability
   */
  private async checkGit(): Promise<EnvironmentCheckResult> {
    try {
      const { stdout } = await execAsync('git --version')
      const versionMatch = stdout.match(/git version (.+)/)
      const version = versionMatch?.[1]?.trim()
      
      this.logger.verbose(`Git version: ${version || 'unknown'}`)
      return { isValid: true, version }
    } catch (error) {
      return {
        isValid: false,
        message: 'Git is not installed or not available in PATH'
      }
    }
  }

  /**
   * Report environment status with visual feedback
   */
  private reportEnvironmentStatus(status: EnvironmentStatus, options: { skipAuth?: boolean } = {}): void {
    const checks = [
      { name: 'Node.js', result: status.nodejs, required: true },
      { name: 'Azure CLI', result: status.azureCLI, required: true },
      { name: 'Azure Authentication', result: status.azureAuth, required: !options.skipAuth },
      { name: 'Power Platform CLI', result: status.pacCLI, required: true },
      { name: 'Git', result: status.git, required: false }
    ].filter(check => check.result !== undefined && (check.required || check.result))

    let allValid = true

    checks.forEach(({ name, result, required }) => {
      if (result!.isValid) {
        if (result!.version) {
          const details = result!.details ? ` (${result!.details})` : ''
          this.logger.success(`${name}: ${result!.version}${details}`)
        } else {
          this.logger.success(`${name}: Available`)
        }
      } else {
        if (required) {
          allValid = false
        }
        const hint = SimpleLogger.getActionableHint(result!.message || '')
        this.logger.error(`${name}: ${result!.message}`, hint)
      }
    })

    if (allValid) {
      this.logger.success('Environment check completed successfully!')
    } else {
      throw new Error('Environment validation failed. Please resolve the issues above.')
    }
  }

  /**
   * Legacy method for backward compatibility with create command
   */
  async checkPacCLIOnly(): Promise<void> {
    this.logger.info('🔍 Checking Power Platform CLI availability...')
    
    const result = await this.checkPacCLI()
    if (result.isValid) {
      this.logger.success('Power Platform CLI found')
      if (result.version) {
        this.logger.info(`   Version: ${result.version}`)
      }
    } else {
      throw new Error(result.message)
    }
  }
}