import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./setup.ts'],
    environment: 'node',
  },
})
