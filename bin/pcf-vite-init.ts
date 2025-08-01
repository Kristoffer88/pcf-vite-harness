#!/usr/bin/env node

import { type ExecOptions, exec } from 'node:child_process'
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { Command } from 'commander'
import { glob } from 'glob'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'
import packageInfo from '../package.json' with { type: 'json' }
import { SimpleLogger, type LoggerOptions } from './utils/logger.js'
import { validateDataverseUrl, validatePort } from './utils/validation.js'
import { EnvironmentChecker } from './utils/environment-checker.js'

const execAsync = promisify(exec)

interface PCFComponent {
  name: string
  path: string
  relativePath: string
  manifestPath: string
  constructor: string
}

interface CLIConfig {
  selectedComponent: PCFComponent
  port: number
  hmrPort: number
  enableDataverse: boolean
  dataverseUrl?: string
}

interface CLIOptions {
  nonInteractive?: boolean
  port?: string
  hmrPort?: string
  dataverse?: boolean
  dataverseUrl?: string
}

class PCFViteInitializer {
  private projectRoot: string
  private components: PCFComponent[] = []
  private options: CLIOptions
  private logger: SimpleLogger
  private environmentChecker: EnvironmentChecker

  constructor(options: LoggerOptions = {}) {
    this.projectRoot = process.cwd()
    this.options = {}
    this.logger = new SimpleLogger(options)
    this.environmentChecker = new EnvironmentChecker(this.logger)
  }

  async init(options: CLIOptions = {}): Promise<void> {
    this.options = options
    this.logger.info('🚀 PCF Vite Harness Initializer')

    try {
      // Step 1: Check basic environment (Node.js, Azure CLI, PAC CLI)
      await this.environmentChecker.checkBasicEnvironment()

      // Step 2: Validate project environment
      await this.validateProjectEnvironment()

      // Step 3: Detect PCF components
      await this.detectPCFComponents()

      if (this.components.length === 0) {
        this.logger.error(
          'No PCF components found in current directory.',
          "Make sure you're in a PCF project root directory with ControlManifest*.xml files"
        )
        process.exit(1)
      }

      this.logger.success(`Found ${this.components.length} PCF component(s):`)
      this.components.forEach(comp => {
        this.logger.info(`   • ${comp.name} (${comp.relativePath})`)
      })

      // Step 4: Interactive configuration
      const config = await this.promptConfiguration()

      // Step 5: Generate development files
      await this.generateFiles(config)

      // Step 6: Update package.json
      await this.updatePackageJson()

      // Step 7: Install dependencies
      await this.installDependencies()

      this.logger.success('PCF Vite Harness initialized successfully!')
      this.logger.info('Next steps:')
      this.logger.info('   1. Start development server: npm run dev:pcf')
      this.logger.info(`   2. Open http://localhost:${config.port} in your browser`)
      this.logger.info('   3. Start developing with instant hot reload! 🚀')
    } catch (error) {
      if ((error as any).isTtyError) {
        this.logger.error(
          'This command requires an interactive terminal.',
          'Please run this command in a proper terminal environment.'
        )
      } else {
        const errorMessage = (error as Error).message
        const hint = SimpleLogger.getActionableHint(errorMessage)
        this.logger.error(`Initialization failed: ${errorMessage}`, hint)
        if (process.env.DEBUG) {
          console.error((error as Error).stack)
        }
      }
      process.exit(1)
    }
  }

  private async validateProjectEnvironment(): Promise<void> {
    // Check if we're in a directory that looks like a PCF project
    try {
      const packageJsonPath = join(this.projectRoot, 'package.json')
      await access(packageJsonPath)
    } catch {
      this.logger.warning('No package.json found - this may not be a Node.js project.')
      this.logger.info('   The CLI will create a basic package.json if needed.')
    }
  }

  private async detectPCFComponents(): Promise<void> {
    const spinner = createSpinner('🔍 Scanning for PCF components...').start()

    try {
      const manifestFiles = await glob('**/ControlManifest*.xml', {
        cwd: this.projectRoot,
        ignore: ['node_modules/**', 'dev/**', 'dist/**', 'out/**', 'bin/**', 'obj/**'],
      })

      for (const manifestPath of manifestFiles) {
        const fullPath = resolve(this.projectRoot, manifestPath)
        const manifestContent = await readFile(fullPath, 'utf-8')

        // Extract component name from manifest - handle different attribute orders
        const namespaceMatch = manifestContent.match(/namespace="([^"]+)"/)
        const constructorMatch = manifestContent.match(/constructor="([^"]+)"/)

        if (namespaceMatch && constructorMatch && namespaceMatch[1] && constructorMatch[1]) {
          const namespace = namespaceMatch[1]
          const constructorName = constructorMatch[1]
          const componentDir = dirname(fullPath)
          const componentName = `${namespace}.${constructorName}`

          this.components.push({
            name: componentName,
            path: componentDir,
            relativePath: relative(this.projectRoot, componentDir),
            manifestPath: manifestPath,
            constructor: constructorName,
          })
        }
      }

      if (this.components.length > 0) {
        spinner.success(`Found ${this.components.length} PCF component(s)`)
      } else {
        spinner.warn('No PCF components detected')
      }
    } catch (error) {
      spinner.error('Failed to scan for components')
      throw new Error(`Component detection failed: ${(error as Error).message}`)
    }
  }

  private async promptConfiguration(): Promise<CLIConfig> {
    // Check for non-interactive mode via CLI arguments
    if (this.options.nonInteractive) {
      const config: CLIConfig = {
        selectedComponent: this.components[0]!, // Default to first component
        port: Number.parseInt(this.options.port || '3000'),
        hmrPort: Number.parseInt(this.options.hmrPort || '3001'),
        enableDataverse: this.options.dataverse !== false,
        dataverseUrl: this.options.dataverseUrl
      }
      
      this.logger.info('🤖 Running in non-interactive mode with defaults:')
      this.logger.info(`   Component: ${config.selectedComponent.name}`)
      this.logger.info(`   Port: ${config.port}`)
      this.logger.info(`   HMR Port: ${config.hmrPort}`)
      this.logger.info(`   Dataverse: ${config.enableDataverse}`)
      if (config.dataverseUrl) this.logger.info(`   Dataverse URL: ${config.dataverseUrl}`)
      
      return config
    }

    const questions = [
      {
        type: 'list',
        name: 'selectedComponent',
        message: 'Select PCF component to setup for development:',
        choices: this.components.map(comp => ({
          name: `${comp.name} (${comp.relativePath})`,
          value: comp,
        })),
        when: () => this.components.length > 1,
      },
      {
        type: 'input',
        name: 'port',
        message: 'Development server port:',
        default: 3000,
        validate: (input: string) => {
          const validation = validatePort(input)
          return validation.isValid ? true : validation.message || 'Invalid port'
        },
      },
      {
        type: 'input',
        name: 'hmrPort',
        message: 'HMR WebSocket port:',
        default: (answers: any) => Number.parseInt(answers.port as string) + 1,
        validate: (input: string) => {
          const validation = validatePort(input)
          return validation.isValid ? true : validation.message || 'Invalid port'
        },
      },
      {
        type: 'confirm',
        name: 'enableDataverse',
        message: 'Enable Dataverse integration?',
        default: true,
      },
      {
        type: 'input',
        name: 'dataverseUrl',
        message: 'Dataverse URL (optional):',
        when: (answers: any) => answers.enableDataverse,
        validate: (input: string) => {
          if (!input) return true
          const validation = validateDataverseUrl(input)
          return validation.isValid ? true : validation.message || 'Invalid Dataverse URL'
        },
      },
    ]

    const answers = await inquirer.prompt(questions as any)

    // If only one component, select it automatically
    if (this.components.length === 1) {
      answers.selectedComponent = this.components[0]
    }

    return answers as CLIConfig
  }

  private async generateFiles(config: CLIConfig): Promise<void> {
    const devDir = join(this.projectRoot, 'dev')

    // Ensure dev directory exists
    try {
      await access(devDir)
    } catch {
      await mkdir(devDir, { recursive: true })
    }

    const component = config.selectedComponent

    // Check for existing files and prompt for overwrite
    const filesToCreate = ['vite.config.ts', 'main.ts', 'index.html']
    const existingFiles: string[] = []

    for (const file of filesToCreate) {
      try {
        await access(join(devDir, file))
        existingFiles.push(file)
      } catch {
        // File doesn't exist, continue
      }
    }

    if (existingFiles.length > 0) {
      const { overwrite } = (await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Files already exist: ${existingFiles.join(', ')}. Overwrite?`,
          default: false,
        },
      ])) as { overwrite: boolean }

      if (!overwrite) {
        this.logger.warning('Setup cancelled by user')
        process.exit(0)
      }
    }

    const spinner = createSpinner('📝 Generating development files...').start()

    try {
      // Generate vite.config.ts
      await this.generateViteConfig(devDir, component, config)

      // Generate main.ts
      await this.generateMainFile(devDir, component, config)

      // Generate index.html
      await this.generateIndexHtml(devDir, component, config)

      // Create .env.example in project root
      await this.createEnvExample()

      spinner.success('Development files generated')
    } catch (error) {
      spinner.error('Failed to generate files')
      throw error
    }
  }

  private async generateViteConfig(
    devDir: string,
    component: PCFComponent,
    config: CLIConfig
  ): Promise<void> {
    const componentPath = relative(this.projectRoot, component.path)

    const content = `import { createPCFViteConfig } from 'pcf-vite-harness'

export default createPCFViteConfig({
  // Port for the dev server
  port: ${config.port},

  // Port for HMR WebSocket
  hmrPort: ${config.hmrPort},

  // Open browser automatically
  open: true,

  // Enable Dataverse integration
  enableDataverse: ${config.enableDataverse},${config.dataverseUrl ? `\n\n  // Dataverse URL\n  dataverseUrl: '${config.dataverseUrl}',` : ''}

  // Additional Vite configuration
  viteConfig: {
    resolve: {
      alias: {
        '@': '../${componentPath}',
      },
    },
  },
})
`

    await writeFile(join(devDir, 'vite.config.ts'), content, 'utf-8')
  }

  private async generateMainFile(
    devDir: string,
    component: PCFComponent,
    config: CLIConfig
  ): Promise<void> {
    const importPath = relative(join(this.projectRoot, 'dev'), join(component.path, 'index'))
      .split(sep)
      .join('/')

    // Extract manifest information for auto-injection
    let componentClassName: string
    let manifestInfo: string = ''

    try {
      const manifestPath = resolve(this.projectRoot, component.manifestPath)
      const manifestContent = await readFile(manifestPath, 'utf-8')

      // Extract component details
      const controlMatch = manifestContent.match(/constructor="([^"]+)"/)
      const namespaceMatch = manifestContent.match(/namespace="([^"]+)"/)
      const versionMatch = manifestContent.match(/version="([^"]+)"/)
      const displayNameMatch = manifestContent.match(/display-name-key="([^"]+)"/)
      const descriptionMatch = manifestContent.match(/description-key="([^"]+)"/)

      // Detect component type from manifest content
      const hasDataSet = manifestContent.includes('<data-set')
      const componentType = hasDataSet ? 'dataset' : 'field'

      componentClassName = controlMatch?.[1] ?? component.constructor ?? basename(component.path)

      if (namespaceMatch?.[1] && controlMatch?.[1] && versionMatch?.[1]) {
        manifestInfo = `  // Auto-detected manifest info from ${component.manifestPath}
  manifestInfo: {
    namespace: '${namespaceMatch[1]}',
    constructor: '${controlMatch[1]}',
    version: '${versionMatch[1]}',${displayNameMatch?.[1] ? `\n    displayName: '${displayNameMatch[1]}',` : ''}${descriptionMatch?.[1] ? `\n    description: '${descriptionMatch[1]}',` : ''}
    componentType: '${componentType}',
  },`
      }
    } catch {
      componentClassName = component.constructor ?? basename(component.path)
    }

    const content = `import { initializePCFHarness } from 'pcf-vite-harness'
import 'pcf-vite-harness/styles/powerapps.css'

// Import your PCF component
import { ${componentClassName} } from '${importPath.startsWith('.') ? importPath : './' + importPath}'

// Initialize the PCF harness with auto-detected manifest info
initializePCFHarness({
  pcfClass: ${componentClassName},
  containerId: 'pcf-container'${manifestInfo ? `,\n${manifestInfo}` : ''}
})

// For additional configuration options:
/*
initializePCFHarness({
  pcfClass: ${componentClassName},
  containerId: 'pcf-container',
  contextOptions: {
    displayName: 'Your Name',
    userName: 'you@company.com',
    // Override webAPI methods for custom testing
    webAPI: {
      retrieveMultipleRecords: async (entityLogicalName, options) => {
        console.log(\`Mock data for \${entityLogicalName}\`)
        return { entities: [] }
      }
    }
  }
})
*/
`

    await writeFile(join(devDir, 'main.ts'), content, 'utf-8')
  }

  private async generateIndexHtml(
    devDir: string,
    component: PCFComponent,
    config: CLIConfig
  ): Promise<void> {
    const projectName = basename(this.projectRoot)

    const content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${component.name} - ${projectName} Development</title>
</head>
<body>
    <div id="pcf-container"></div>
    <script type="module" src="./main.ts"></script>
</body>
</html>
`

    await writeFile(join(devDir, 'index.html'), content, 'utf-8')
  }

  private async createEnvExample(): Promise<void> {
    const envPath = join(this.projectRoot, '.env')
    
    // Check if .env already exists
    try {
      await access(envPath)
      this.logger.warning('.env file already exists, skipping creation')
      return
    } catch {
      // File doesn't exist, create it
    }

    const envContent = `# Dataverse Configuration (uncomment and set your environment URL)
# VITE_DATAVERSE_URL=https://your-org.crm.dynamics.com/

# PCF Configuration (Set by setup wizard - paste values when prompted)
# VITE_PCF_PAGE_TABLE=
# VITE_PCF_PAGE_TABLE_NAME=
# VITE_PCF_PAGE_RECORD_ID=
# VITE_PCF_TARGET_TABLE=
# VITE_PCF_TARGET_TABLE_NAME=
# VITE_PCF_VIEW_ID=
# VITE_PCF_VIEW_NAME=
# VITE_PCF_RELATIONSHIP_SCHEMA_NAME=
# VITE_PCF_RELATIONSHIP_ATTRIBUTE=
# VITE_PCF_RELATIONSHIP_LOOKUP_FIELD=
# VITE_PCF_RELATIONSHIP_TYPE=
`

    await writeFile(envPath, envContent, 'utf-8')
    this.logger.success('Created .env file in project root')
  }

  private async updatePackageJson(): Promise<void> {
    const spinner = createSpinner('📦 Updating package.json...').start()

    try {
      const packageJsonPath = join(this.projectRoot, 'package.json')
      let packageJson: any

      try {
        const content = await readFile(packageJsonPath, 'utf-8')
        packageJson = JSON.parse(content)
      } catch {
        packageJson = {
          name: basename(this.projectRoot),
          version: '1.0.0',
          scripts: {},
        }
      }

      // Add dev script if it doesn't exist
      if (!packageJson.scripts) {
        packageJson.scripts = {}
      }

      if (!packageJson.scripts['dev:pcf']) {
        packageJson.scripts['dev:pcf'] = 'vite --config dev/vite.config.ts'
      }

      // Add pcf-vite-harness dependency if it doesn't exist
      if (!packageJson.dependencies) {
        packageJson.dependencies = {}
      }

      if (!packageJson.dependencies['pcf-vite-harness']) {
        packageJson.dependencies['pcf-vite-harness'] = `^${packageInfo.version}`
      }

      // Add vite dependency for CLI access
      if (!packageJson.dependencies['vite']) {
        packageJson.dependencies['vite'] = '^7.0.5'
      }

      // Ensure @types/node is compatible with Vite 7 (requires ^20.19.0 || >=22.12.0)
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {}
      }
      
      const currentNodeTypes = packageJson.devDependencies['@types/node']
      if (!currentNodeTypes || currentNodeTypes.includes('^18.')) {
        packageJson.devDependencies['@types/node'] = '^20.19.0'
      }

      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8')
      spinner.success('package.json updated')
    } catch (error) {
      spinner.error('Failed to update package.json')
      throw error
    }
  }

  private async installDependencies(): Promise<void> {
    const spinner = createSpinner('📦 Installing dependencies...').start()

    try {
      // Check if using non-npm package managers and warn user
      const isYarn = await this.fileExists(join(this.projectRoot, 'yarn.lock'))
      const isPnpm = await this.fileExists(join(this.projectRoot, 'pnpm-lock.yaml'))

      if (isYarn || isPnpm) {
        spinner.warn('Non-npm package manager detected')
        this.logger.warning(`Detected ${isYarn ? 'Yarn' : 'pnpm'} - manual installation required:`)
        this.logger.info(`   Please run: ${isYarn ? 'yarn install' : 'pnpm install'}`)
        return
      }

      // Run npm install to install all dependencies (including pcf-vite-harness which brings vite)
      const execOptions: ExecOptions = {
        cwd: this.projectRoot,
        timeout: 120000, // 2 minute timeout
      }
      await execAsync('npm install', execOptions)

      spinner.success('Dependencies installed successfully')
    } catch (error) {
      spinner.error('Failed to install dependencies')
      this.logger.warning('Manual installation required:')
      this.logger.info('   Please run: npm install')
      // Don't throw error, let the process continue
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath)
      return true
    } catch {
      return false
    }
  }
}

// Setup CLI with Commander.js
const program = new Command()

program
  .name('pcf-vite-init')
  .description('Initialize PCF Vite Harness for PowerApps Component Framework development')
  .version('1.0.0')
  .option('--non-interactive', 'Run in non-interactive mode with defaults')
  .option('--port <port>', 'Development server port', '3000')
  .option('--hmr-port <port>', 'HMR WebSocket port', '3001')
  .option('--no-dataverse', 'Disable Dataverse integration')
  .option('--dataverse-url <url>', 'Dataverse URL')
  .action(runInit)

// Add help examples
program.on('--help', () => {
  console.log('')
  console.log('Examples:')
  console.log('  $ npx pcf-vite-init                 Initialize in current directory')
  console.log('  $ pcf-vite-init --help             Show this help message')
  console.log('  $ pcf-vite-init --version          Show version number')
  console.log('')
  console.log('The CLI will automatically detect PCF components and guide you through setup.')
})

// Export the main functionality for use by unified CLI
export async function runInit(options: any = {}) {
  const loggerOptions = {
    quiet: options.quiet,
    verbose: options.verbose
  }
  const initializer = new PCFViteInitializer(loggerOptions)
  await initializer.init(options)
}

// Only parse if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse(process.argv)
}
