import type { PCFViteOptions } from './types/index.js'

/**
 * Validates Dataverse authentication by fetching a token before server starts
 */
async function validateDataverseToken(dataverseUrl: string): Promise<void> {
  try {
    // Import getAzureToken from dataverse-utilities
    const { getAzureToken } = await import('dataverse-utilities')

    console.log('🔐 Fetching Dataverse token...')
    console.log(`   Resource URL: ${dataverseUrl}`)

    const token = await getAzureToken({
      resourceUrl: dataverseUrl,
      enableLogging: false, // We'll handle our own logging
    })

    if (!token) {
      throw new Error(
        'Failed to obtain Dataverse token. Make sure you are authenticated with Azure CLI (az login) ' +
          'or have managed identity configured.'
      )
    }

    console.log('✅ Dataverse token acquired successfully')
    console.log('   Server will start with authentication ready')
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot resolve module')) {
      throw new Error(
        '❌ dataverse-utilities package is required for Dataverse integration.\n' +
          '   Please install it: npm install dataverse-utilities'
      )
    }

    console.error('❌ Dataverse token validation failed:')
    console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.error('')
    console.error('💡 Troubleshooting steps:')
    console.error('   1. Ensure you are logged in to Azure CLI: az login')
    console.error('   2. Check that VITE_DATAVERSE_URL is correct')
    console.error('   3. Verify you have access to the Dataverse environment')

    throw error
  }
}

/**
 * Creates a Vite configuration optimized for PCF development
 */
export async function createPCFViteConfig(options: PCFViteOptions = {}) {
  const { defineConfig, loadEnv } = await import('vite')
  const react = (await import('@vitejs/plugin-react')).default
  const fs = await import('fs')
  const path = await import('path')

  return defineConfig(async ({ mode }) => {
    // Load env from project root (parent of dev directory)
    const envDir = process.cwd().endsWith('/dev') ? path.resolve(process.cwd(), '..') : process.cwd()
    const env = loadEnv(mode, envDir, '')

    const {
      dataverseUrl = env.VITE_DATAVERSE_URL,
      port = 3000,
      hmrPort = 3001,
      open = true,
      viteConfig = {},
    } = options

    let baseConfig = {
      root: './dev', // Set root to dev directory for index.html resolution
      envDir, // Tell Vite where to look for .env files
      plugins: [react()],
      optimizeDeps: {
        exclude: ['fsevents'], // Prevent ESBuild native module errors on macOS
      },
      server: {
        port,
        open,
        hmr: {
          port: hmrPort,
        },
        // Add middleware for /setup route
        configureServer(server: any) {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url === '/setup') {
              // Serve the same index.html file but for /setup route
              const indexPath = path.resolve(server.config.root, 'index.html')
              const html = fs.readFileSync(indexPath, 'utf-8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html')
              res.end(html)
            } else {
              next()
            }
          })
        },
      },
      resolve: {
        alias: {
          '@': '../../', // Default alias for PCF source
        },
      },
    }

    // Add dataverse-utilities integration (always enabled)
    if (!dataverseUrl) {
      throw new Error(
        '❌ VITE_DATAVERSE_URL environment variable is required.\n' +
          '   Please set VITE_DATAVERSE_URL in your .env file or pass dataverseUrl in the config options.\n' +
          '   Example: VITE_DATAVERSE_URL=https://yourorg.crm.dynamics.com/'
      )
    }

    // Validate Dataverse token before proceeding
    await validateDataverseToken(dataverseUrl)

    const { createDataverseConfig } = require('dataverse-utilities/vite')
    const dataverseConfig = createDataverseConfig({
      dataverseUrl,
    })

    baseConfig = {
      ...dataverseConfig,
      ...baseConfig,
      plugins: [
        ...(baseConfig.plugins || []),
        ...(Array.isArray(dataverseConfig.plugins) ? dataverseConfig.plugins : []),
      ],
      server: {
        ...baseConfig.server,
        ...(dataverseConfig.server || {}),
      },
    }

    // Merge with user-provided config
    return {
      ...baseConfig,
      ...viteConfig,
      plugins: [
        ...(baseConfig.plugins || []),
        ...(Array.isArray(viteConfig.plugins) ? viteConfig.plugins : []),
      ],
      server: {
        ...baseConfig.server,
        ...(viteConfig.server || {}),
      },
    }
  })
}
