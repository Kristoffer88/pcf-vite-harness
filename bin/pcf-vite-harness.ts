#!/usr/bin/env node

/**
 * PCF Vite Harness - Unified CLI entry point
 * Supports both init (add to existing) and create (new project) workflows
 */

import { Command } from 'commander'
import packageInfo from '../package.json' with { type: 'json' }

const program = new Command()

program
  .name('pcf-vite-harness')
  .description('Modern Vite-based development harness for PowerApps Component Framework (PCF)')
  .version(packageInfo.version)

// Init command (add harness to existing PCF project)
program
  .command('init')
  .description('Add Vite harness to an existing PCF project')
  .option('-p, --port <port>', 'Development server port', '3000')
  .option('--hmr-port <port>', 'HMR WebSocket port', '3001')
  .option('--non-interactive', 'Run in non-interactive mode')
  .option('--no-dataverse', 'Disable Dataverse integration')
  .option('--dataverse-url <url>', 'Dataverse URL')
  .action(async (options) => {
    // Import and run the init functionality
    const { runInit } = await import('./pcf-vite-init.js')
    await runInit(options)
  })

// Create command (create new PCF project with harness)
program
  .command('create')
  .description('Create a new PCF project with Vite harness pre-configured')
  .option('-n, --namespace <namespace>', 'PCF component namespace')
  .option('-c, --name <name>', 'PCF component name')
  .option('-t, --template <template>', 'PCF component template (field or dataset)')
  .option('-o, --output-directory <path>', 'Output directory for the project')
  .option('-p, --port <port>', 'Development server port', '3000')
  .option('--hmr-port <port>', 'HMR WebSocket port', '3001')
  .option('--no-dataverse', 'Disable Dataverse integration')
  .option('--dataverse-url <url>', 'Dataverse URL')
  .option('--non-interactive', 'Run in non-interactive mode (requires all options)')
  .action(async (options) => {
    // Import and run the create functionality
    const { runCreate } = await import('./pcf-vite-create.js')
    await runCreate(options)
  })

// Default to init command for backward compatibility
program
  .action(async (options) => {
    console.log('🚀 PCF Vite Harness - Adding to existing PCF project...\n')
    const { runInit } = await import('./pcf-vite-init.js')
    await runInit(options)
  })

// Add help examples
program.addHelpText('after', `
Examples:
  # Add harness to existing PCF project (default)
  $ pcf-vite-harness
  $ pcf-vite-harness init
  
  # Create new PCF project with harness
  $ pcf-vite-harness create
  $ pcf-vite-harness create -n MyCompany -c MyControl -t field
  
  # Non-interactive modes
  $ pcf-vite-harness init --non-interactive --port 4000
  $ pcf-vite-harness create --non-interactive -n MyCompany -c MyControl -t dataset
`)

program.parse()