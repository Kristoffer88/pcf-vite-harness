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

const execAsync = promisify(exec)

interface CreateProjectOptions {
  namespace: string
  name: string
  template: 'field' | 'dataset'
  outputDirectory?: string
  port?: number
  hmrPort?: number
  enableDataverse?: boolean
  dataverseUrl?: string
}

class PCFViteCreator {
  async create(options: CreateProjectOptions): Promise<void> {
    const {
      namespace,
      name,
      template,
      outputDirectory = `./${name}`,
      port = 3000,
      hmrPort = 3001,
      enableDataverse = true,
      dataverseUrl
    } = options

    console.log(`🚀 Creating PCF ${template} project with Vite harness...`)
    console.log(`   Namespace: ${namespace}`)
    console.log(`   Name: ${name}`)
    console.log(`   Template: ${template}`)
    console.log(`   Output: ${outputDirectory}`)

    try {
      // Check if pac command is available
      await this.checkPacCLI()

      // Create PCF project
      await this.createPCFProject(namespace, name, template, outputDirectory)

      // Set up Vite harness
      await this.setupViteHarness(outputDirectory, port, hmrPort, enableDataverse, dataverseUrl)

      console.log(`\n🎉 PCF project created successfully!`)
      console.log(`   Project directory: ${outputDirectory}`)
      console.log(`\n📝 Next steps:`)
      console.log(`   cd ${outputDirectory}`)
      console.log(`   npm run dev:pcf`)

    } catch (error) {
      console.error('❌ Project creation failed:', error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  }

  private async checkPacCLI(): Promise<void> {
    console.log('🔍 Checking Power Platform CLI availability...')
    
    try {
      const { stdout: pacVersion } = await execAsync('pac help')
      console.log('✅ Power Platform CLI found')
      
      const versionMatch = pacVersion.match(/Version: ([^\n]+)/)
      if (versionMatch && versionMatch[1]) {
        console.log(`   Version: ${versionMatch[1].trim()}`)
      }
    } catch (error) {
      throw new Error(
        'Power Platform CLI (pac) not found. Please install it first:\n' +
        '   https://docs.microsoft.com/en-us/power-platform/developer/cli/introduction'
      )
    }
  }

  private async createPCFProject(
    namespace: string,
    name: string,
    template: 'field' | 'dataset',
    outputDirectory: string
  ): Promise<void> {
    console.log(`\n📦 Creating PCF ${template} project...`)
    
    const spinner = createSpinner('Creating PCF project').start()

    try {
      const result = await execAsync(`pac pcf init --namespace "${namespace}" --name "${name}" --template "${template}" --run-npm-install --outputDirectory "${outputDirectory}"`, {
        timeout: 120000, // 2 minute timeout
      })

      spinner.success('PCF project created')
      
      if (result.stdout) {
        console.log('\n📄 PAC CLI output:')
        console.log(result.stdout)
      }
    } catch (error) {
      spinner.error('Failed to create PCF project')
      throw error
    }
  }

  private async setupViteHarness(
    projectDir: string,
    port: number,
    hmrPort: number,
    enableDataverse: boolean,
    dataverseUrl?: string
  ): Promise<void> {
    console.log('\n🔧 Setting up Vite harness...')
    
    const spinner = createSpinner('Configuring Vite development environment').start()

    try {
      // Find the PCF component
      const components = await this.findPCFComponents(projectDir)
      if (components.length === 0) {
        throw new Error('No PCF components found in the created project')
      }

      const component = components[0] // Use the first (and likely only) component
      
      // Create dev directory
      const devDir = join(projectDir, 'dev')
      await mkdir(devDir, { recursive: true })

      // Generate development files
      await this.generateViteConfig(devDir, port, hmrPort, enableDataverse)
      await this.generateMainTs(devDir, component, projectDir)
      await this.generateIndexHtml(devDir, component)
      await this.createEnvFile(projectDir, dataverseUrl)
      await this.updatePackageJson(projectDir)

      spinner.success('Vite harness configured')
    } catch (error) {
      spinner.error('Failed to set up Vite harness')
      throw error
    }
  }

  private async findPCFComponents(projectDir: string): Promise<Array<{
    name: string
    path: string
    relativePath: string
    manifestPath: string
    constructor: string
  }>> {
    const manifestFiles = await glob('**/ControlManifest.Input.xml', {
      cwd: projectDir,
      ignore: ['node_modules/**', 'out/**', 'dist/**']
    })

    const components = []
    
    for (const manifestFile of manifestFiles) {
      const manifestPath = join(projectDir, manifestFile)
      const manifestContent = await readFile(manifestPath, 'utf-8')
      
      const namespaceMatch = manifestContent.match(/namespace="([^"]+)"/)
      const constructorMatch = manifestContent.match(/constructor="([^"]+)"/)
      
      if (namespaceMatch && constructorMatch && namespaceMatch[1] && constructorMatch[1]) {
        const componentDir = dirname(manifestFile)
        components.push({
          name: `${namespaceMatch[1]}.${constructorMatch[1]}`,
          path: componentDir,
          relativePath: componentDir,
          manifestPath: manifestFile,
          constructor: constructorMatch[1]
        })
      }
    }

    return components
  }

  private async generateViteConfig(
    devDir: string,
    port: number,
    hmrPort: number,
    enableDataverse: boolean
  ): Promise<void> {
    const content = `import { createPCFViteConfig } from 'pcf-vite-harness'

export default createPCFViteConfig({
  // Port for the dev server
  port: ${port},

  // Port for HMR WebSocket
  hmrPort: ${hmrPort},

  // Open browser automatically
  open: true,

  // Enable Dataverse integration
  enableDataverse: ${enableDataverse},

  // Additional Vite configuration
  viteConfig: {
    resolve: {
      alias: {
        '@': '../${basename(devDir).replace('dev', '')}',
      },
    },
  },
})
`

    await writeFile(join(devDir, 'vite.config.ts'), content, 'utf-8')
  }

  private async generateMainTs(
    devDir: string,
    component: any,
    projectDir: string
  ): Promise<void> {
    // Read manifest to get component details and type
    const manifestPath = join(projectDir, component.manifestPath)
    const manifestContent = await readFile(manifestPath, 'utf-8')
    
    const controlMatch = manifestContent.match(/constructor="([^"]+)"/)
    const namespaceMatch = manifestContent.match(/namespace="([^"]+)"/)
    const versionMatch = manifestContent.match(/version="([^"]+)"/)
    const displayNameMatch = manifestContent.match(/display-name-key="([^"]+)"/)
    const descriptionMatch = manifestContent.match(/description-key="([^"]+)"/)

    // Detect component type
    const hasDataSet = manifestContent.includes('<data-set')
    const componentType = hasDataSet ? 'dataset' : 'field'
    
    const componentClassName = controlMatch?.[1] ?? component.constructor
    const importPath = `../${component.relativePath}/index`
    
    let manifestInfo = ''
    if (namespaceMatch?.[1] && controlMatch?.[1] && versionMatch?.[1]) {
      manifestInfo = `  // Auto-detected manifest info from ${component.manifestPath}
  manifestInfo: {
    namespace: '${namespaceMatch[1]}',
    constructor: '${controlMatch[1]}',
    version: '${versionMatch[1]}',${displayNameMatch?.[1] ? `\n    displayName: '${displayNameMatch[1]}',` : ''}${descriptionMatch?.[1] ? `\n    description: '${descriptionMatch[1]}',` : ''}
    componentType: '${componentType}',
  },`
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

  private async generateIndexHtml(devDir: string, component: any): Promise<void> {
    const content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${component.name} Development</title>
</head>
<body>
    <div id="pcf-container"></div>
    <script type="module" src="./main.ts"></script>
</body>
</html>
`

    await writeFile(join(devDir, 'index.html'), content, 'utf-8')
  }

  private async createEnvFile(projectDir: string, dataverseUrl?: string): Promise<void> {
    const envPath = join(projectDir, '.env')
    
    // Check if .env already exists
    try {
      await access(envPath)
      console.log('⚠️  .env file already exists, skipping creation')
      return
    } catch {
      // File doesn't exist, create it
    }

    const envContent = `# Dataverse Configuration${dataverseUrl ? `\nVITE_DATAVERSE_URL=${dataverseUrl}` : '\n# VITE_DATAVERSE_URL=https://your-org.crm.dynamics.com/'}

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
    console.log('✅ Created .env file in project root')
  }

  private async updatePackageJson(projectDir: string): Promise<void> {
    const packageJsonPath = join(projectDir, 'package.json')
    const spinner = createSpinner('Updating package.json').start()

    try {
      const packageContent = await readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      // Add dev:pcf script
      if (!packageJson.scripts) {
        packageJson.scripts = {}
      }
      
      if (!packageJson.scripts['dev:pcf']) {
        packageJson.scripts['dev:pcf'] = 'vite --config dev/vite.config.ts'
      }

      // Add dependencies
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

      // Ensure @types/node is compatible with Vite 7
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {}
      }
      
      const currentNodeTypes = packageJson.devDependencies['@types/node']
      if (!currentNodeTypes || currentNodeTypes.includes('^18.')) {
        packageJson.devDependencies['@types/node'] = '^20.19.0'
      }

      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8')
      spinner.success('package.json updated')
      
      // Install the new dependencies
      const installSpinner = createSpinner('Installing dependencies...').start()
      await execAsync('npm install', { cwd: projectDir, timeout: 60000 })
      installSpinner.success('Dependencies installed')
    } catch (error) {
      spinner.error('Failed to update package.json')
      throw error
    }
  }
}

// CLI Setup
const program = new Command()

program
  .name('pcf-vite-create')
  .description('Create a new PCF project with Vite harness pre-configured')
  .version(packageInfo.version)
  .requiredOption('-n, --namespace <namespace>', 'PCF component namespace')
  .requiredOption('-c, --name <name>', 'PCF component name')
  .requiredOption('-t, --template <template>', 'PCF component template (field or dataset)')
  .option('-o, --output-directory <path>', 'Output directory for the project')
  .option('-p, --port <port>', 'Development server port', '3000')
  .option('--hmr-port <port>', 'HMR WebSocket port', '3001')
  .option('--no-dataverse', 'Disable Dataverse integration')
  .option('--dataverse-url <url>', 'Dataverse URL')
  .action(async (options) => {
    // Validate template
    if (!['field', 'dataset'].includes(options.template)) {
      console.error('❌ Template must be either "field" or "dataset"')
      process.exit(1)
    }

    const creator = new PCFViteCreator()
    await creator.create({
      namespace: options.namespace,
      name: options.name,
      template: options.template as 'field' | 'dataset',
      outputDirectory: options.outputDirectory,
      port: parseInt(options.port),
      hmrPort: parseInt(options.hmrPort),
      enableDataverse: options.dataverse !== false,
      dataverseUrl: options.dataverseUrl
    })
  })

// Add help examples
program.addHelpText('after', `
Examples:
  $ pcf-vite-create -n MyCompany -c MyFieldControl -t field
  $ pcf-vite-create -n MyCompany -c MyDatasetControl -t dataset -o ./my-project
  $ pcf-vite-create -n MyCompany -c MyControl -t field --dataverse-url https://myorg.crm.dynamics.com/
`)

program.parse()