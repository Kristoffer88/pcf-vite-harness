import type { PCFViteOptions } from './types/index.js'

/**
 * Creates a Vite configuration optimized for PCF development
 */
export async function createPCFViteConfig(options: PCFViteOptions = {}) {
  const { defineConfig, loadEnv } = await import('vite')
  const react = (await import('@vitejs/plugin-react')).default
  
  return defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    const {
      dataverseUrl = env.VITE_DATAVERSE_URL,
      port = 3000,
      hmrPort = 3001,
      open = true,
      enableDataverse = true,
      viteConfig = {},
    } = options

    let baseConfig = {
      root: './dev', // Set root to dev directory for index.html resolution
      plugins: [react()],
      optimizeDeps: { 
        exclude: ['fsevents'] // Prevent ESBuild native module errors on macOS
      },
      server: {
        port,
        open,
        hmr: {
          port: hmrPort,
        },
      },
      resolve: {
        alias: {
          '@': '../../', // Default alias for PCF source
        },
      },
    }

    // Add dataverse-utilities integration if enabled and available
    if (enableDataverse) {
      if (!dataverseUrl) {
        throw new Error(
          '❌ Dataverse integration is enabled but VITE_DATAVERSE_URL environment variable is not set.\n' +
          '   Please set VITE_DATAVERSE_URL in your .env file or pass dataverseUrl in the config options.\n' +
          '   Example: VITE_DATAVERSE_URL=https://yourorg.crm.dynamics.com/'
        )
      } else {
        try {
          const { createDataverseConfig } = require('dataverse-utilities/vite')
          const dataverseConfig = createDataverseConfig({
            dataverseUrl,
          })

        baseConfig = {
          ...dataverseConfig,
          ...baseConfig,
          plugins: [...(baseConfig.plugins || []), ...(Array.isArray(dataverseConfig.plugins) ? dataverseConfig.plugins : [])],
          server: {
            ...baseConfig.server,
            ...(dataverseConfig.server || {}),
          },
        }
        } catch (error) {
          console.warn(
            'dataverse-utilities not found. Install it for Dataverse integration:',
            (error as Error).message
          )
        }
      }
    }

    // Merge with user-provided config
    return {
      ...baseConfig,
      ...viteConfig,
      plugins: [...(baseConfig.plugins || []), ...(Array.isArray(viteConfig.plugins) ? viteConfig.plugins : [])],
      server: {
        ...baseConfig.server,
        ...(viteConfig.server || {}),
      },
    }
  })
}
