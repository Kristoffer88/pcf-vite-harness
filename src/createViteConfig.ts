import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type UserConfig } from 'vite'
import type { PCFViteOptions } from './types/index.js'

/**
 * Creates a Vite configuration optimized for PCF development
 */
export function createPCFViteConfig(options: PCFViteOptions = {}) {
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

    let baseConfig: UserConfig = {
      plugins: [react()],
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
    if (enableDataverse && dataverseUrl) {
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
