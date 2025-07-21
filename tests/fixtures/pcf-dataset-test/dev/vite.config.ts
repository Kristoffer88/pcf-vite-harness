import { createPCFViteConfig } from 'pcf-vite-harness'

export default createPCFViteConfig({
  // Port for the dev server
  port: 3000,

  // Port for HMR WebSocket
  hmrPort: 3001,

  // Open browser automatically
  open: true,

  // Enable Dataverse integration (requires dataverse-utilities)
  enableDataverse: true,

  // Dataverse URL (can also be set via VITE_DATAVERSE_URL env var)
  // dataverseUrl: 'https://yourorg.crm.dynamics.com/',

  // Additional Vite configuration
  viteConfig: {
    // Add any additional Vite configuration here
    resolve: {
      alias: {
        '@': '../dataset', // Adjust path to your PCF component
      },
    },
  },
})