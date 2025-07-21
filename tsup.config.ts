import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'bin/pcf-vite-init': 'bin/pcf-vite-init.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  tsconfig: './tsconfig.json',
  external: ['react', 'react-dom', 'vite', '@vitejs/plugin-react', 'dataverse-utilities', 'react/jsx-runtime'],
  // Copy styles and templates to dist
  onSuccess: async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')

    // Copy styles
    try {
      await fs.mkdir('dist/styles', { recursive: true })
      const stylesFiles = await fs.readdir('styles')
      for (const file of stylesFiles) {
        await fs.copyFile(path.join('styles', file), path.join('dist/styles', file))
      }
    } catch (error) {
      console.warn('No styles directory found or copying failed:', error)
    }

    // Copy templates
    try {
      await fs.mkdir('dist/templates', { recursive: true })
      const templatesFiles = await fs.readdir('templates')
      for (const file of templatesFiles) {
        await fs.copyFile(path.join('templates', file), path.join('dist/templates', file))
      }
    } catch (error) {
      console.warn('No templates directory found or copying failed:', error)
    }

    // Make CLI executable and add shebang
    try {
      const cliPath = 'dist/bin/pcf-vite-init.cjs'
      const content = await fs.readFile(cliPath, 'utf-8')
      
      // Add shebang if not present
      if (!content.startsWith('#!/usr/bin/env node')) {
        const updatedContent = '#!/usr/bin/env node\n' + content
        await fs.writeFile(cliPath, updatedContent, 'utf-8')
      }
      
      // Make executable (on Unix systems)
      if (process.platform !== 'win32') {
        await fs.chmod(cliPath, 0o755)
      }
    } catch (error) {
      console.warn('CLI post-processing failed:', error)
    }
  },
})
