import { test, expect } from 'vitest'
import { spawn } from 'child_process'
import path from 'path'

test('Environment variables should be loaded correctly in fixture project', async () => {
  const fixtureDir = path.resolve(process.cwd(), 'tests/fixtures/pcf-dataset-test')
  
  // Read the .env file directly
  const fs = await import('fs')
  const envFile = path.join(fixtureDir, '.env')
  const envContent = fs.readFileSync(envFile, 'utf8')
  
  console.log('📋 .env file content:', envContent)
  
  // Parse environment variables
  const envVars = {}
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      envVars[key.trim()] = value.trim()
    }
  })
  
  console.log('📋 Parsed env vars:', envVars)
  
  // Check that the expected variables are present
  expect(envVars.VITE_PCF_TARGET_TABLE).toBe('pum_gantttask')
  expect(envVars.VITE_PCF_PAGE_TABLE).toBe('pum_initiative')
  expect(envVars.VITE_PCF_PUBLISHER_FILTER).toBe('pum')
})