# PCF Vite Harness

> **⚠️ DISCLAIMER: PROOF OF CONCEPT**
> 
> This project is a **proof of concept** and should not be used in production environments. It is intended for experimentation and demonstration purposes only. The code has not been thoroughly tested or validated for production use cases.

> **⚠️ CAUTION: AI-Generated Code**
> 
> This project was developed using AI assistance (Claude Code). Users should evaluate the code thoroughly before production use.

> **⚠️ IMPORTANT: Bundler Compatibility Limitations**
> 
> This tool uses **Vite bundler** for development while PCF uses **webpack** for production builds. These have fundamental compatibility differences that may cause issues. Code that works in this harness may fail when built with PCF's webpack bundler.
> 
> **📖 [Read the full technical details in BUNDLER-COMPATIBILITY.md](./BUNDLER-COMPATIBILITY.md)**

A modern Vite-based development harness for PowerApps Component Framework (PCF) components with hot module replacement and PowerApps-like environment simulation.

## ✨ Features

- 🚀 **Fast Development**: Vite-powered with instant hot module replacement (HMR)
- 🎯 **PowerApps Environment**: Accurate replication of PowerApps container structure and styling
- 🔗 **Dataverse Integration**: Optional integration with `dataverse-utilities` for real data testing
- 📱 **Responsive**: Works across different screen sizes like PowerApps
- 🛠️ **TypeScript Support**: Full TypeScript support with type definitions
- ⚡ **Modern Tooling**: Built on modern web technologies (Vite, React, TypeScript)

## 📦 Installation

### Quick Start (Recommended)

1. **Navigate to your PCF project directory**
   ```bash
   cd your-pcf-project
   ```

2. **Run the initializer**
   ```bash
   npx pcf-vite-init
   ```
   
   The CLI will:
   - 🔍 Auto-detect your PCF components
   - ⚙️ Guide you through interactive configuration
   - 📝 Generate all necessary development files
   - 📦 Update your package.json with dev script
   - ✅ All dependencies included - no manual installation needed!

3. **Start development**
   ```bash
   npm run dev:pcf
   ```

Your PCF component will open at `http://localhost:3000` with full HMR support!

### Manual Setup (Full Control)

If you prefer manual setup or need explicit dependency control:

```bash
# Install the harness locally
npm install pcf-vite-harness --save-dev
```

Then create the development files in a `dev/` directory. See the [templates directory](./templates/) for examples.

## 🛠️ CLI Features

The `pcf-vite-init` command provides:

- **🔍 Auto-detection**: Automatically finds PCF components by scanning for `ControlManifest.xml` files
- **📝 Smart Configuration**: Generates configuration files with correct paths and component imports
- **⚙️ Interactive Setup**: Guided prompts for port configuration, Dataverse integration, etc.
- **🔒 Safe Operation**: Asks before overwriting existing files
- **📦 Package Integration**: Automatically adds npm scripts to your package.json

### CLI Options

```bash
# Run in current directory
pcf-vite-init

# The CLI will prompt for:
# - Component selection (if multiple found)
# - Development server port (default: 3000)
# - HMR WebSocket port (default: 3001)
# - Browser auto-open preference
# - Dataverse integration setup
```

## 🔧 Advanced Configuration

### Custom Context Options

```typescript
import { initializePCFHarness } from 'pcf-vite-harness';
import { YourPCFComponent } from '../YourComponent/index';

initializePCFHarness({
    pcfClass: YourPCFComponent,
    contextOptions: {
        displayName: 'John Doe',
        userName: 'john.doe@company.com',
        controlId: 'custom-control-id',
        viewId: 'custom-view-id'
    },
    showDevPanel: true,
    className: 'custom-container-class'
});
```

### Dataverse Integration

1. Install `dataverse-utilities`:
   ```bash
   npm install dataverse-utilities --save-dev
   ```

2. Set your Dataverse URL in `.env`:
   ```
   VITE_DATAVERSE_URL=https://yourorg.crm.dynamics.com/
   ```

3. Enable in config:
   ```typescript
   export default createPCFViteConfig({
       enableDataverse: true,
       dataverseUrl: process.env.VITE_DATAVERSE_URL
   });
   ```

4. Use Dataverse Web API in your component:
   ```typescript
   // Your component can now make calls to /api/data/v9.2/...
   const response = await fetch('/api/data/v9.2/accounts?$top=10');
   const data = await response.json();
   ```

### Custom Mock Context

```typescript
import { createMockContext, initializePCFHarness } from 'pcf-vite-harness';

const customContext = createMockContext({
    displayName: 'Custom User',
    datasetOptions: {
        loading: false,
        // Add custom dataset properties
    }
});

initializePCFHarness({
    pcfClass: YourPCFComponent,
    customContext
});
```

## 🆚 Comparison with PCF Test Harness

| Feature | PCF Test Harness | PCF Vite Harness |
|---------|------------------|-------------------|
| Hot Reload | ❌ No | ✅ Instant HMR |
| Modern Tooling | ❌ Webpack 4 | ✅ Vite |
| PowerApps Environment | ✅ Basic | ✅ Accurate Replica |
| Dataverse Integration | ❌ No | ✅ Optional |
| TypeScript Support | ✅ Basic | ✅ Full |
| Setup Complexity | 🟡 Medium | 🟢 Simple |
| Build Speed | 🔴 Slow | 🟢 Fast |

## 📋 API Reference

### Functions

#### `initPCF(pcfClass, options?)`

Simple initialization function for quick setup.

**Parameters:**
- `pcfClass`: Your PCF component class
- `options?`: Optional configuration object

#### `initializePCFHarness(options)`

Advanced initialization with full configuration options.

**Parameters:**
- `options.pcfClass`: Your PCF component class
- `options.contextOptions?`: Mock context configuration
- `options.containerId?`: Custom container element ID
- `options.className?`: Additional CSS class
- `options.showDevPanel?`: Show development panel
- `options.customContext?`: Use custom context instead of mock

#### `createMockContext(options?)`

Creates a realistic mock PCF context.

**Parameters:**
- `options.controlId?`: Custom control ID
- `options.viewId?`: Custom view ID
- `options.displayName?`: User display name
- `options.userName?`: Username
- `options.userId?`: User ID
- `options.datasetOptions?`: Dataset configuration

#### `createPCFViteConfig(options?)`

Creates optimized Vite configuration for PCF development.

**Parameters:**
- `options.port?`: Development server port
- `options.enableDataverse?`: Enable Dataverse integration
- `options.dataverseUrl?`: Dataverse URL for proxy
- `options.viteConfig?`: Additional Vite configuration

### Types

The library includes comprehensive TypeScript definitions for all interfaces and types.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details.

## 🐛 Issues

Found a bug or have a feature request? Please create an issue on GitHub.

## Known Issues

### Why Vite 6 instead of Vite 7?

PCF Vite Harness currently uses Vite 6 instead of the latest Vite 7 due to compatibility issues we encountered with Vite 7.0.5 during development. These issues caused import resolution failures in browser bundles.

We will upgrade to Vite 7 once these compatibility issues are resolved in our implementation.

### Dependency Requirements

- **Node.js**: 18 or higher
- **@types/node**: 18.19.0 or higher (automatically handled by the CLI)

If you encounter peer dependency conflicts during installation, they are usually resolved automatically during the setup process.