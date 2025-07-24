#!/usr/bin/env node

import { execa } from 'execa'
import { writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PROJECTS = [
  {
    dir: 'tests/cli/temp-field-project',
    type: 'Field'
  },
  {
    dir: 'tests/cli/temp-dataset-project',
    type: 'Dataset'
  }
]

async function installInTestProjects() {
  console.log('🔧 Installing pcf-vite-harness in test projects...')

  const cliPath = 'dist/bin/pcf-vite-init.cjs'

  for (const project of PROJECTS) {
    console.log(`\n📦 Installing in ${project.type} project (${project.dir})...`)

    try {
      // Update package.json to use local dependency
      const packageJsonPath = join(project.dir, 'package.json')
      const packageContent = await readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      // Add local dependency
      if (!packageJson.dependencies) {
        packageJson.dependencies = {}
      }
      packageJson.dependencies['pcf-vite-harness'] = 'file:../../../'

      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8')
      console.log('✅ Updated package.json with local dependency')

      // Run npm install to link the local package
      console.log('📥 Running npm install...')
      await execa('npm', ['install'], {
        cwd: project.dir,
        timeout: 60000,
        stdio: 'pipe'
      })
      console.log('✅ Dependencies installed')

      // Run the CLI tool
      console.log('🤖 Running pcf-vite-init...')
      const result = await execa('node', [`../../../${cliPath}`, '--non-interactive'], {
        cwd: project.dir,
        timeout: 60000,
        stdio: 'pipe',
        reject: false
      })

      if (result.exitCode === 0) {
        console.log('✅ pcf-vite-harness installed successfully')
      } else {
        console.error('❌ CLI installation failed:')
        console.error('Exit code:', result.exitCode)
        if (result.stdout) console.error('Stdout:', result.stdout)
        if (result.stderr) console.error('Stderr:', result.stderr)
      }

    } catch (error) {
      console.error(`❌ Failed to install in ${project.type} project`)
      console.error('Error message:', error.message)
      if (error.stdout) console.error('Stdout:', error.stdout)
      if (error.stderr) console.error('Stderr:', error.stderr)
    }
  }

  console.log('\n🎉 Installation complete!')
}

installInTestProjects()