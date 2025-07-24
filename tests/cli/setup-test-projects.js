#!/usr/bin/env node

import { execa } from 'execa'
import { rm } from 'node:fs/promises'

const PROJECTS = [
  {
    dir: 'tests/cli/temp-field-project',
    name: 'fieldcomponent',
    template: 'field',
    type: 'Field'
  },
  {
    dir: 'tests/cli/temp-dataset-project', 
    name: 'datasetcomponent',
    template: 'dataset',
    type: 'Dataset'
  }
]

async function setupTestProjects() {
  console.log('🏗️  Setting up PCF test projects...')

  // Check if pac command is available
  console.log('🔍 Checking pac command availability...')
  try {
    const { stdout: pacVersion } = await execa('pac', ['help'])
    console.log('✅ pac CLI found')
    const versionMatch = pacVersion.match(/Version: ([^\n]+)/)
    if (versionMatch) {
      console.log('Version:', versionMatch[1].trim())
    }
  } catch (error) {
    console.error('❌ pac CLI not found. Please install Power Platform CLI first.')
    process.exit(1)
  }

  // Process each project
  for (const project of PROJECTS) {
    console.log(`\n🏗️  Creating ${project.type} PCF project...`)

    try {
      // Clean up existing project
      console.log(`🧹 Cleaning up existing ${project.dir}...`)
      await rm(project.dir, { recursive: true, force: true })

      // Create new PCF project
      console.log(`📦 Creating PCF ${project.template} project...`)
      const result = await execa('pac', [
        'pcf', 'init',
        '--namespace', 'testcompany',
        '--name', project.name,
        '--template', project.template,
        '--run-npm-install',
        '--outputDirectory', project.dir
      ], {
        timeout: 120000, // 2 minute timeout
        stdio: 'pipe'
      })

      console.log(`✅ ${project.type} PCF project created at ${project.dir}`)

    } catch (error) {
      console.error(`❌ Failed to create ${project.type} project`)
      console.error('Error message:', error.message)
      if (error.stdout) console.error('Stdout:', error.stdout)
      if (error.stderr) console.error('Stderr:', error.stderr)
      if (error.exitCode) console.error('Exit code:', error.exitCode)
      process.exit(1)
    }
  }

  console.log('\n🎉 All test projects created successfully!')
}

setupTestProjects()