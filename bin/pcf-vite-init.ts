#!/usr/bin/env node

import { Command } from 'commander';
import { dirname, join, resolve, relative, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises';
import { exec, ExecOptions } from 'node:child_process';
import { promisify } from 'node:util';
import { glob } from 'glob';
import inquirer from 'inquirer';
import { createSpinner } from 'nanospinner';

const execAsync = promisify(exec);

interface PCFComponent {
  name: string;
  path: string;
  relativePath: string;
  manifestPath: string;
  constructor: string;
}

interface CLIConfig {
  selectedComponent: PCFComponent;
  port: number;
  hmrPort: number;
  enableDataverse: boolean;
  dataverseUrl?: string;
}

class PCFViteInitializer {
  private projectRoot: string;
  private components: PCFComponent[] = [];

  constructor() {
    this.projectRoot = process.cwd();
  }

  async init(): Promise<void> {
    console.log('🚀 PCF Vite Harness Initializer\n');
    
    try {
      // Step 1: Validate environment
      await this.validateEnvironment();
      
      // Step 2: Detect PCF components
      await this.detectPCFComponents();
      
      if (this.components.length === 0) {
        console.log('❌ No PCF components found in current directory.');
        console.log('   Make sure you\'re in a PCF project root directory.');
        console.log('   Looking for files named "ControlManifest*.xml"');
        process.exit(1);
      }

      console.log(`✅ Found ${this.components.length} PCF component(s):`);
      this.components.forEach(comp => {
        console.log(`   • ${comp.name} (${comp.relativePath})`);
      });
      console.log('');

      // Step 3: Interactive configuration
      const config = await this.promptConfiguration();

      // Step 4: Generate development files
      await this.generateFiles(config);

      // Step 5: Update package.json
      await this.updatePackageJson();

      // Step 6: Install Vite dependency
      await this.installViteDependency();

      console.log('\n✅ PCF Vite Harness initialized successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Start development server: npm run dev:pcf');
      console.log(`   2. Open http://localhost:${config.port} in your browser`);
      console.log('   3. Start developing with instant hot reload! 🚀');

    } catch (error) {
      if ((error as any).isTtyError) {
        console.error('\n❌ This command requires an interactive terminal.');
        console.error('   Please run this command in a proper terminal environment.');
      } else {
        console.error('\n❌ Initialization failed:', (error as Error).message);
        if (process.env.DEBUG) {
          console.error((error as Error).stack);
        }
      }
      process.exit(1);
    }
  }

  private async validateEnvironment(): Promise<void> {
    // Check if we're in a directory that looks like a PCF project
    try {
      const packageJsonPath = join(this.projectRoot, 'package.json');
      await access(packageJsonPath);
    } catch {
      console.log('⚠️  No package.json found - this may not be a Node.js project.');
      console.log('   The CLI will create a basic package.json if needed.\n');
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[0] ?? '0');
    if (majorVersion < 18) {
      throw new Error(`Node.js 18 or higher is required. Current version: ${nodeVersion}`);
    }
  }

  private async detectPCFComponents(): Promise<void> {
    const spinner = createSpinner('🔍 Scanning for PCF components...').start();
    
    try {
      const manifestFiles = await glob('**/ControlManifest*.xml', {
        cwd: this.projectRoot,
        ignore: ['node_modules/**', 'dev/**', 'dist/**', 'out/**', 'bin/**', 'obj/**']
      });

      for (const manifestPath of manifestFiles) {
        const fullPath = resolve(this.projectRoot, manifestPath);
        const manifestContent = await readFile(fullPath, 'utf-8');
        
        // Extract component name from manifest - handle different attribute orders
        const namespaceMatch = manifestContent.match(/namespace="([^"]+)"/); 
        const constructorMatch = manifestContent.match(/constructor="([^"]+)"/); 
        
        if (namespaceMatch && constructorMatch && namespaceMatch[1] && constructorMatch[1]) {
          const namespace = namespaceMatch[1];
          const constructorName = constructorMatch[1];
          const componentDir = dirname(fullPath);
          const componentName = `${namespace}.${constructorName}`;
          
          this.components.push({
            name: componentName,
            path: componentDir,
            relativePath: relative(this.projectRoot, componentDir),
            manifestPath: manifestPath,
            constructor: constructorName
          });
        }
      }

      if (this.components.length > 0) {
        spinner.success(`Found ${this.components.length} PCF component(s)`);
      } else {
        spinner.warn('No PCF components detected');
      }
    } catch (error) {
      spinner.error('Failed to scan for components');
      throw new Error(`Component detection failed: ${(error as Error).message}`);
    }
  }

  private async promptConfiguration(): Promise<CLIConfig> {
    const questions = [
      {
        type: 'list',
        name: 'selectedComponent',
        message: 'Select PCF component to setup for development:',
        choices: this.components.map(comp => ({
          name: `${comp.name} (${comp.relativePath})`,
          value: comp
        })),
        when: () => this.components.length > 1
      },
      {
        type: 'input',
        name: 'port',
        message: 'Development server port:',
        default: 3000,
        validate: (input: string) => {
          const port = Number.parseInt(input);
          return port > 0 && port < 65536 ? true : 'Please enter a valid port number';
        }
      },
      {
        type: 'input',
        name: 'hmrPort',
        message: 'HMR WebSocket port:',
        default: (answers: any) => Number.parseInt(answers.port as string) + 1,
        validate: (input: string) => {
          const port = Number.parseInt(input);
          return port > 0 && port < 65536 ? true : 'Please enter a valid port number';
        }
      },
      {
        type: 'confirm',
        name: 'enableDataverse',
        message: 'Enable Dataverse integration?',
        default: true
      },
      {
        type: 'input',
        name: 'dataverseUrl',
        message: 'Dataverse URL (optional):',
        when: (answers: any) => answers.enableDataverse,
        validate: (input: string) => {
          if (!input) return true;
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        }
      }
    ];

    const answers = await inquirer.prompt(questions as any);
    
    // If only one component, select it automatically
    if (this.components.length === 1) {
      answers.selectedComponent = this.components[0];
    }

    return answers as CLIConfig;
  }

  private async generateFiles(config: CLIConfig): Promise<void> {
    const devDir = join(this.projectRoot, 'dev');
    
    // Ensure dev directory exists
    try {
      await access(devDir);
    } catch {
      await mkdir(devDir, { recursive: true });
    }

    const component = config.selectedComponent;

    // Check for existing files and prompt for overwrite
    const filesToCreate = ['vite.config.ts', 'main.ts', 'index.html'];
    const existingFiles: string[] = [];
    
    for (const file of filesToCreate) {
      try {
        await access(join(devDir, file));
        existingFiles.push(file);
      } catch {
        // File doesn't exist, continue
      }
    }

    if (existingFiles.length > 0) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: `Files already exist: ${existingFiles.join(', ')}. Overwrite?`,
        default: false
      }]) as { overwrite: boolean };
      
      if (!overwrite) {
        console.log('❌ Setup cancelled');
        process.exit(0);
      }
    }

    const spinner = createSpinner('📝 Generating development files...').start();

    try {
      // Generate vite.config.ts
      await this.generateViteConfig(devDir, component, config);
      
      // Generate main.ts
      await this.generateMainFile(devDir, component, config);
      
      // Generate index.html
      await this.generateIndexHtml(devDir, component, config);
      
      // Copy .env.example
      await this.copyEnvExample(devDir);

      spinner.success('Development files generated');
    } catch (error) {
      spinner.error('Failed to generate files');
      throw error;
    }
  }

  private async generateViteConfig(devDir: string, component: PCFComponent, config: CLIConfig): Promise<void> {
    const componentPath = relative(this.projectRoot, component.path);
    
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
`;

    await writeFile(join(devDir, 'vite.config.ts'), content, 'utf-8');
  }

  private async generateMainFile(devDir: string, component: PCFComponent, config: CLIConfig): Promise<void> {
    const importPath = relative(join(this.projectRoot, 'dev'), join(component.path, 'index')).split(sep).join('/');
    
    // Try to detect the actual component class name from the manifest
    let componentClassName: string;
    try {
      const manifestPath = resolve(this.projectRoot, component.manifestPath);
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const controlMatch = manifestContent.match(/constructor="([^"]+)"/); 
      componentClassName = controlMatch?.[1] ?? component.constructor ?? basename(component.path);
    } catch {
      componentClassName = component.constructor ?? basename(component.path);
    }

    const content = `import { initPCF } from 'pcf-vite-harness'
import 'pcf-vite-harness/styles/powerapps.css'

// Import your PCF component
import { ${componentClassName} } from '${importPath.startsWith('.') ? importPath : './' + importPath}'

// Initialize the PCF harness
initPCF(${componentClassName})

// For advanced configuration, use:
/*
import { initializePCFHarness } from 'pcf-vite-harness';

initializePCFHarness({
    pcfClass: ${componentClassName},
    containerId: 'pcf-container',
    contextOptions: {
        displayName: 'Your Name',
        userName: 'you@company.com'
    },
    showDevPanel: true
});
*/
`;

    await writeFile(join(devDir, 'main.ts'), content, 'utf-8');
  }

  private async generateIndexHtml(devDir: string, component: PCFComponent, config: CLIConfig): Promise<void> {
    const projectName = basename(this.projectRoot);
    
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
`;

    await writeFile(join(devDir, 'index.html'), content, 'utf-8');
  }

  private async copyEnvExample(devDir: string): Promise<void> {
    const templatePath = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', '.env.example');
    const targetPath = join(devDir, '.env.example');
    await copyFile(templatePath, targetPath);
  }

  private async updatePackageJson(): Promise<void> {
    const spinner = createSpinner('📦 Updating package.json...').start();
    
    try {
      const packageJsonPath = join(this.projectRoot, 'package.json');
      let packageJson: any;
      
      try {
        const content = await readFile(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(content);
      } catch {
        packageJson = {
          name: basename(this.projectRoot),
          version: "1.0.0",
          scripts: {}
        };
      }

      // Add dev script if it doesn't exist
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      if (!packageJson.scripts['dev:pcf']) {
        packageJson.scripts['dev:pcf'] = 'vite --config dev/vite.config.ts';
      }

      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
      spinner.success('package.json updated');
    } catch (error) {
      spinner.error('Failed to update package.json');
      throw error;
    }
  }

  private async installViteDependency(): Promise<void> {
    const spinner = createSpinner('📦 Installing dependencies...').start();
    
    try {
      // Check if using non-npm package managers and warn user
      const isYarn = await this.fileExists(join(this.projectRoot, 'yarn.lock'));
      const isPnpm = await this.fileExists(join(this.projectRoot, 'pnpm-lock.yaml'));
      
      if (isYarn || isPnpm) {
        spinner.warn('Non-npm package manager detected');
        console.log(`\n⚠️  Detected ${isYarn ? 'Yarn' : 'pnpm'} - manual installation required:`);
        console.log(`   Please run: ${isYarn ? 'yarn add -D' : 'pnpm add -D'} vite pcf-vite-harness\n`);
        return;
      }
      
      // Use npm for PCF projects (most common)
      const execOptions: ExecOptions = { 
        cwd: this.projectRoot,
        timeout: 120000 // 2 minute timeout
        // shell is automatically handled by exec()
      };
      await execAsync('npm install --save-dev vite pcf-vite-harness', execOptions);
      
      spinner.success('Dependencies installed (Vite + pcf-vite-harness)');
    } catch (error) {
      spinner.error('Failed to install dependencies');
      console.log('\n⚠️  Manual installation required:');
      console.log('   Please run: npm install --save-dev vite pcf-vite-harness\n');
      // Don't throw error, let the process continue
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Setup CLI with Commander.js
const program = new Command();

program
  .name('pcf-vite-init')
  .description('Initialize PCF Vite Harness for PowerApps Component Framework development')
  .version('1.0.0')
  .action(async () => {
    const initializer = new PCFViteInitializer();
    await initializer.init();
  });

// Add help examples
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ npx pcf-vite-init                 Initialize in current directory');
  console.log('  $ pcf-vite-init --help             Show this help message');
  console.log('  $ pcf-vite-init --version          Show version number');
  console.log('');
  console.log('The CLI will automatically detect PCF components and guide you through setup.');
});

program.parse(process.argv);