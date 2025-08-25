#!/usr/bin/env node

import { type ExecOptions, exec } from 'node:child_process'
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { Command } from 'commander'
import { glob } from 'glob'
import { input, confirm, select } from '@inquirer/prompts'
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

    const answers: any = {}

    // Component selection (only if multiple components)
    if (this.components.length > 1) {
      answers.selectedComponent = await select({
        message: 'Select PCF component to setup for development:',
        choices: this.components.map(comp => ({
          name: `${comp.name} (${comp.relativePath})`,
          value: comp,
        })),
      })
    }

    // Port configuration
    answers.port = await input({
      message: 'Development server port:',
      default: '3000',
      validate: (input: string) => {
        const validation = validatePort(input)
        return validation.isValid ? true : validation.message || 'Invalid port'
      },
    })

    // HMR port configuration
    answers.hmrPort = await input({
      message: 'HMR WebSocket port:',
      default: String(Number.parseInt(answers.port) + 1),
      validate: (input: string) => {
        const validation = validatePort(input)
        return validation.isValid ? true : validation.message || 'Invalid port'
      },
    })

    // Dataverse integration
    answers.enableDataverse = await confirm({
      message: 'Enable Dataverse integration?',
      default: true,
    })

    // Dataverse URL (only if enabling Dataverse)
    if (answers.enableDataverse) {
      answers.dataverseUrl = await input({
        message: 'Dataverse URL (optional):',
        validate: (input: string) => {
          if (!input) return true
          const validation = validateDataverseUrl(input)
          return validation.isValid ? true : validation.message || 'Invalid Dataverse URL'
        },
      })
    }

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
    const filesToCreate = ['vite.config.ts', 'main.ts', 'index.html', 'vite-env.d.ts']
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
      const overwrite = await confirm({
        message: `Files already exist: ${existingFiles.join(', ')}. Overwrite?`,
        default: false,
      })

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

      // Generate vite-env.d.ts
      await this.generateViteEnvTypes(devDir)

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

${config.dataverseUrl ? `  // Dataverse URL\n  dataverseUrl: '${config.dataverseUrl}',\n` : ''}

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

      // Parse dataset information if it's a dataset component
      let datasetsInfo = ''
      if (hasDataSet) {
        const datasetMatches = manifestContent.matchAll(/<data-set\s+name="([^"]+)"(?:\s+display-name-key="([^"]+)")?[^>]*>/g)
        const datasets = Array.from(datasetMatches).map(match => ({
          name: match[1],
          displayNameKey: match[2] || match[1]
        }))
        
        if (datasets.length > 0) {
          const datasetsArray = datasets.map(ds => 
            `{ name: '${ds.name}', displayNameKey: '${ds.displayNameKey}' }`
          ).join(', ')
          datasetsInfo = `,\n    datasets: [${datasetsArray}]`
        }
      }

      componentClassName = controlMatch?.[1] ?? component.constructor ?? basename(component.path)

      if (namespaceMatch?.[1] && controlMatch?.[1] && versionMatch?.[1]) {
        manifestInfo = `  // Auto-detected manifest info from ${component.manifestPath}
  manifestInfo: {
    namespace: '${namespaceMatch[1]}',
    constructor: '${controlMatch[1]}',
    version: '${versionMatch[1]}',${displayNameMatch?.[1] ? `\n    displayName: '${displayNameMatch[1]}',` : ''}${descriptionMatch?.[1] ? `\n    description: '${descriptionMatch[1]}',` : ''}
    componentType: '${componentType}'${datasetsInfo},
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

  private async regenerateMainFile(
    devDir: string,
    component: PCFComponent
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

      // Parse dataset information if it's a dataset component
      let datasetsInfo = ''
      if (hasDataSet) {
        const datasetMatches = manifestContent.matchAll(/<data-set\s+name="([^"]+)"(?:\s+display-name-key="([^"]+)")?[^>]*>/g)
        const datasets = Array.from(datasetMatches).map(match => ({
          name: match[1],
          displayNameKey: match[2] || match[1]
        }))
        
        if (datasets.length > 0) {
          const datasetsArray = datasets.map(ds => 
            `{ name: '${ds.name}', displayNameKey: '${ds.displayNameKey}' }`
          ).join(', ')
          datasetsInfo = `,\n    datasets: [${datasetsArray}]`
        }
      }

      componentClassName = controlMatch?.[1] ?? component.constructor ?? basename(component.path)

      if (namespaceMatch?.[1] && controlMatch?.[1] && versionMatch?.[1]) {
        manifestInfo = `  // Auto-detected manifest info from ${component.manifestPath}
  manifestInfo: {
    namespace: '${namespaceMatch[1]}',
    constructor: '${controlMatch[1]}',
    version: '${versionMatch[1]}',${displayNameMatch?.[1] ? `\n    displayName: '${displayNameMatch[1]}',` : ''}${descriptionMatch?.[1] ? `\n    description: '${descriptionMatch[1]}',` : ''}
    componentType: '${componentType}'${datasetsInfo},
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
    this.logger.info(`📝 Regenerated main.ts with manifest dataset info`)
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
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body, html {
            height: 100%;
            font-family: "Segoe UI", "Segoe UI Web (West European)", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif;
            background-color: #f3f2f1;
            overflow: hidden;
        }
        
        #pcf-container {
            width: 100vw;
            height: 100vh;
            position: relative;
        }
    </style>
</head>
<body>
    <div id="pcf-container"></div>
    <script type="module" src="./main.ts"></script>
</body>
</html>
`

    await writeFile(join(devDir, 'index.html'), content, 'utf-8')
  }

  private async generateViteEnvTypes(devDir: string): Promise<void> {
    const content = `/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Dataverse Configuration
  readonly VITE_DATAVERSE_URL?: string

  // PCF Configuration - set by setup wizard
  readonly VITE_PCF_PAGE_TABLE?: string
  readonly VITE_PCF_PAGE_TABLE_NAME?: string
  readonly VITE_PCF_PAGE_RECORD_ID?: string
  readonly VITE_PCF_TARGET_TABLE?: string
  readonly VITE_PCF_TARGET_TABLE_NAME?: string
  readonly VITE_PCF_VIEW_ID?: string
  readonly VITE_PCF_VIEW_NAME?: string
  readonly VITE_PCF_RELATIONSHIP_SCHEMA_NAME?: string
  readonly VITE_PCF_RELATIONSHIP_ATTRIBUTE?: string
  readonly VITE_PCF_RELATIONSHIP_LOOKUP_FIELD?: string
  readonly VITE_PCF_RELATIONSHIP_TYPE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
`

    await writeFile(join(devDir, 'vite-env.d.ts'), content, 'utf-8')
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

  async regenerateContext(nonInteractive = false): Promise<void> {
    try {
      // Check if dev directory exists
      const devDir = join(this.projectRoot, 'dev')
      try {
        await access(devDir)
      } catch {
        this.logger.error('No dev directory found. Run initialization first with: npx pcf-vite-harness init')
        process.exit(1)
      }

      // Check if .env file exists with required variables (skip in non-interactive mode)
      if (!nonInteractive) {
        const envPath = join(this.projectRoot, '.env')
        try {
          await access(envPath)
          this.logger.info('✅ Found .env file with environment variables')
        } catch {
          this.logger.error('No .env file found. Complete the setup wizard first by running: npm run dev:pcf')
          process.exit(1)
        }
      } else {
        this.logger.info('🤖 Non-interactive mode: Skipping .env file checks')
      }

      // Detect PCF components for context regeneration
      await this.detectPCFComponents()
      
      if (this.components.length === 0) {
        this.logger.error('No PCF components found for context regeneration')
        process.exit(1)
      }

      // Use the first component (or let user select if multiple)
      let selectedComponent = this.components[0]!
      if (this.components.length > 1 && !nonInteractive) {
        selectedComponent = await select({
          message: 'Select component for context regeneration:',
          choices: this.components.map(comp => ({
            name: `${comp.name} (${comp.relativePath})`,
            value: comp,
          })),
        })
      } else if (this.components.length > 1) {
        this.logger.info(`🤖 Non-interactive mode: Using first component: ${selectedComponent.name}`)
      }

      // Read existing vite config to get port settings
      const viteConfigPath = join(devDir, 'vite.config.ts')
      let port = 3000
      let hmrPort = 3001
      
      try {
        const viteConfigContent = await readFile(viteConfigPath, 'utf-8')
        const portMatch = viteConfigContent.match(/port:\s*(\d+)/)
        const hmrPortMatch = viteConfigContent.match(/hmrPort:\s*(\d+)/)
        
        if (portMatch && portMatch[1]) port = parseInt(portMatch[1])
        if (hmrPortMatch && hmrPortMatch[1]) hmrPort = parseInt(hmrPortMatch[1])
        
        this.logger.info(`📝 Using existing port settings: ${port} (HMR: ${hmrPort})`)
      } catch {
        this.logger.info(`📝 Using default port settings: ${port} (HMR: ${hmrPort})`)
      }

      // Regenerate main.ts with proper manifest info including datasets
      await this.regenerateMainFile(devDir, selectedComponent)

      this.logger.success('✅ Context regenerated successfully!')
      this.logger.info('The main.ts file has been updated with proper dataset information from the manifest.')
      this.logger.info('You can now restart your development server: npm run dev:pcf')
    } catch (error) {
      this.logger.error(`Context regeneration failed: ${(error as Error).message}`)
      process.exit(1)
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

// Export generate context functionality for use by unified CLI
export async function runGenerateContext(options: any = {}) {
  const logger = new SimpleLogger()
  const projectRoot = process.cwd()
  const nonInteractive = options.nonInteractive || false

  try {
    logger.info('🔄 Regenerating PCF context...')
    
    // Check if dev directory exists
    const devDir = join(projectRoot, 'dev')
    try {
      await access(devDir)
    } catch {
      logger.error('No dev directory found. Run initialization first with: npx pcf-vite-harness init')
      process.exit(1)
    }

    // Check if .env file exists (skip in non-interactive mode)
    if (!nonInteractive) {
      const envPath = join(projectRoot, '.env')
      try {
        await access(envPath)
        logger.info('✅ Found .env file with environment variables')
      } catch {
        logger.error('No .env file found. Complete the setup wizard first by running: npm run dev:pcf')
        process.exit(1)
      }
    } else {
      logger.info('🤖 Non-interactive mode: Skipping .env file checks')
    }

    // Find manifest files
    const manifestFiles = await glob('**/ControlManifest*.xml', {
      cwd: projectRoot,
      ignore: ['node_modules/**', 'dev/**', 'dist/**', 'out/**', 'bin/**', 'obj/**'],
    })

    if (manifestFiles.length === 0) {
      logger.error('No PCF components found for context regeneration')
      process.exit(1)
    }

    // Use first manifest (or could add selection logic later)
    const manifestPath = manifestFiles[0]!
    const fullPath = resolve(projectRoot, manifestPath)
    const manifestContent = await readFile(fullPath, 'utf-8')

    // Extract component details
    const namespaceMatch = manifestContent.match(/namespace="([^"]+)"/)
    const constructorMatch = manifestContent.match(/constructor="([^"]+)"/)
    const versionMatch = manifestContent.match(/version="([^"]+)"/)
    const displayNameMatch = manifestContent.match(/display-name-key="([^"]+)"/)
    const descriptionMatch = manifestContent.match(/description-key="([^"]+)"/)

    if (!namespaceMatch || !constructorMatch) {
      logger.error('Invalid manifest file - missing namespace or constructor')
      process.exit(1)
    }

    const componentName = constructorMatch[1]
    const componentDir = dirname(fullPath)
    const relativePath = relative(projectRoot, componentDir)

    // Build import path
    const importPath = relative(join(projectRoot, 'dev'), join(componentDir, 'index'))
      .split(sep)
      .join('/')

    // Detect component type and parse datasets
    const hasDataSet = manifestContent.includes('<data-set')
    const componentType = hasDataSet ? 'dataset' : 'field'

    let datasetsInfo = ''
    if (hasDataSet) {
      const datasetMatches = manifestContent.matchAll(/<data-set\s+name="([^"]+)"(?:\s+display-name-key="([^"]+)")?[^>]*>/g)
      const datasets = Array.from(datasetMatches).map(match => ({
        name: match[1],
        displayNameKey: match[2] || match[1]
      }))
      
      if (datasets.length > 0) {
        const datasetsArray = datasets.map(ds => 
          `{ name: '${ds.name}', displayNameKey: '${ds.displayNameKey}' }`
        ).join(', ')
        datasetsInfo = `,\n    datasets: [${datasetsArray}]`
        logger.info(`📋 Found ${datasets.length} dataset(s): ${datasets.map(d => d.name).join(', ')}`)
      }
    }

    // Build manifestInfo
    const manifestInfo = `  // Auto-detected manifest info from ${manifestPath}
  manifestInfo: {
    namespace: '${namespaceMatch[1]}',
    constructor: '${constructorMatch[1]}',
    version: '${versionMatch?.[1] || '1.0.0'}',${displayNameMatch?.[1] ? `\n    displayName: '${displayNameMatch[1]}',` : ''}${descriptionMatch?.[1] ? `\n    description: '${descriptionMatch[1]}',` : ''}
    componentType: '${componentType}'${datasetsInfo},
  },`

    // Generate main.ts content
    const content = `import { initializePCFHarness } from 'pcf-vite-harness'
import 'pcf-vite-harness/styles/powerapps.css'

// Import your PCF component
import { ${componentName} } from '${importPath.startsWith('.') ? importPath : './' + importPath}'

// Initialize the PCF harness with auto-detected manifest info
initializePCFHarness({
  pcfClass: ${componentName},
  containerId: 'pcf-container',
${manifestInfo}
})

// For additional configuration options:
/*
initializePCFHarness({
  pcfClass: ${componentName},
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

    // Write the file
    await writeFile(join(devDir, 'main.ts'), content, 'utf-8')
    
    logger.success('✅ Context regenerated successfully!')
    logger.info('The main.ts file has been updated with proper dataset information from the manifest.')
    logger.info('You can now restart your development server: npm run dev:pcf')

  } catch (error) {
    logger.error(`Context regeneration failed: ${(error as Error).message}`)
    process.exit(1)
  }
}

// Only parse if this file is run directly (not imported by other CLI)
if (import.meta.url === `file://${process.argv[1]}` && !process.argv[1]?.includes('pcf-vite-harness')) {
  program.parse(process.argv)
}
