import { createPCFViteConfig } from 'pcf-vite-harness'

export default createPCFViteConfig({
  // Port for the dev server
  port: 3000,

  // Port for HMR WebSocket
  hmrPort: 3001,

  // Open browser automatically
  open: true,

  // Enable Dataverse integration
  enableDataverse: true,

  // Additional Vite configuration
  viteConfig: {
    resolve: {
      alias: {
        '@': '../field',
      },
    },
  },
})
