# PCF Vite Harness

> **⚠️ DISCLAIMER: FOR INSPIRATION ONLY**  
>  
> This project is provided **for educational and inspirational purposes only**. It is **not intended for production use**.  
> It serves as a **proof of concept** and should be treated as a **reference or learning example**, not a production-ready implementation.  
> The code has not been thoroughly tested or validated for production use cases.  
>  
> **⚠️ CAUTION: AI-Generated Code**  
> Portions of this project were developed using AI assistance (Claude Code). Always review and validate the code before adapting it for your own use.  
>  
> **⚠️ IMPORTANT: Bundler Compatibility Limitations**  
> This tool uses **Vite bundler** for development while PCF uses **webpack** for production builds. These have fundamental compatibility differences that may cause issues.  
> Code that works in this harness may fail when built with PCF's webpack bundler.  
>  
> **📖 [Read the full technical details in BUNDLER-COMPATIBILITY.md](./BUNDLER-COMPATIBILITY.md)**

A modern Vite-based development harness for PowerApps Component Framework (PCF) components with hot module replacement and PowerApps-like environment simulation.

## ✨ Features

- 🚀 **Fast Development**: Vite-powered with instant hot module replacement (HMR)
- 🎯 **PowerApps Environment**: Accurate replication of PowerApps container structure and styling
- 🔗 **Dataverse Integration**: Built-in integration with `dataverse-utilities` for real data testing
- 📱 **Responsive**: Works across different screen sizes like PowerApps
- 🛠️ **TypeScript Support**: Full TypeScript support with type definitions
- ⚡ **Modern Tooling**: Built on modern web technologies (Vite, React, TypeScript)

## 📦 Installation

### Quick Start - Add to Existing PCF Project (Recommended)

1. **Navigate to your PCF project directory**
   ```bash
   cd your-pcf-project
   ```

2. **Run the initializer**
   ```bash
   npx pcf-vite-harness
   # or explicitly:
   npx pcf-vite-harness init
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

### Create New PCF Project with Harness

Create a complete new PCF project with Vite harness pre-configured:

```bash
npx pcf-vite-harness create
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

### `pcf-vite-harness` - Unified CLI Tool

The main command with subcommands for different workflows:

### `pcf-vite-harness init` - Add Harness to Existing Project

- **🔍 Auto-detection**: Automatically finds PCF components by scanning for `ControlManifest.xml` files
- **📝 Smart Configuration**: Generates configuration files with correct paths and component imports
- **⚙️ Interactive Setup**: Guided prompts for port configuration, Dataverse integration, etc.
- **🔒 Safe Operation**: Asks before overwriting existing files
- **📦 Package Integration**: Automatically adds npm scripts to your package.json

```bash
npx pcf-vite-harness init
```

The CLI will guide you through:
- Component selection (if multiple found)
- Development server configuration  
- Dataverse integration setup

### `pcf-vite-harness create` - Create New PCF Project

Creates a complete PCF project using Power Platform CLI (`pac`) with Vite harness pre-configured:

- **🚀 Full Project Setup**: Creates PCF project structure using `pac pcf init`
- **🎯 Template Support**: Supports both `field` and `dataset` component types
- **⚙️ Interactive Setup**: Guided prompts for easy configuration
- **📊 Manifest Parsing**: Extracts component info from `ControlManifest.Input.xml`
- **📦 Dependency Management**: Updates package.json and installs dependencies

```bash
npx pcf-vite-harness create
```

The CLI will guide you through:
- PCF component namespace and name
- Component type (field or dataset)  
- Project directory setup
- Dataverse integration (optional)

### `pcf-vite-harness generate-context` - Regenerate Context

Regenerates the context configuration after completing the setup wizard:

- **🔄 Context Regeneration**: Updates main.ts with proper dataset information from manifest
- **📋 Dataset Detection**: Automatically detects dataset configurations from ControlManifest.xml
- **⚙️ Environment Integration**: Works with .env variables set by the setup wizard

```bash
npx pcf-vite-harness generate-context
```

Use this command after completing the browser-based setup wizard to ensure your development context includes all the dataset configurations discovered during setup.

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
    className: 'custom-container-class'
});
```

### Dataverse Integration

The `dataverse-utilities` package is automatically included and configured. To enable Dataverse integration:

1. Set your Dataverse URL in `.env`:
   ```
   VITE_DATAVERSE_URL=https://yourorg.crm.dynamics.com/
   ```

2. Configure Dataverse URL:
   ```typescript
   export default createPCFViteConfig({
       dataverseUrl: process.env.VITE_DATAVERSE_URL
   });
   ```

3. Use Dataverse Web API in your component:
   ```typescript
   // Your component can now make calls to /api/data/v9.2/...
   const response = await fetch('/api/data/v9.2/accounts?$top=10');
   const data = await response.json();
   ```

## 🔧 Dataset Setup Wizard

For **dataset components only**, the harness includes a setup wizard accessible at `/setup` when running the development server. This wizard helps configure your dataset component with real Dataverse data:

### Features
- **📊 Dataset-Only**: Designed specifically for PCF dataset components (not available for field components)
- **🔗 Table Relationships**: Automatically discovers and configures table relationships
- **👁️ View Selection**: Choose from available system or custom views for your dataset
- **🎯 PCF Component Detection**: Scans forms to find PCF controls and their dataset configurations
- **⚙️ Interactive Configuration**: Step-by-step wizard for complex dataset setup

### Setup Steps
1. **Page Context** (Optional): Select the parent table/record for context
2. **Record Selection**: Choose a specific record for testing
3. **Target Table**: Select the main table for your dataset component
4. **Relationship Discovery**: Automatically finds relationships between tables
5. **View Selection**: Choose the view that defines your dataset structure
6. **Component Scanning**: Locates PCF controls on forms and extracts dataset names

### Usage
```bash
# Start your development server
npm run dev:pcf

# Navigate to the setup wizard
# http://localhost:3000/setup
```

> **Note**: The setup wizard is only available for dataset components because they require complex configuration involving table relationships, views, and dataset properties. Field components have simpler requirements and don't need this multi-step setup process.

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
- `options.dataverseUrl?`: Dataverse URL (enables integration when provided)
- `options.hmrPort?`: HMR WebSocket port
- `options.open?`: Whether to open browser on server start
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

### Built-in Workarounds

The harness includes several built-in workarounds for common compatibility issues:

#### ESBuild Native Module Fix (macOS)
```typescript
optimizeDeps: { 
  exclude: ['fsevents'] // Already included in base config
}
```

**Issue**: On macOS, `fsevents` (file system watching) contains native `.node` files that ESBuild cannot process, causing build errors.

**Solution**: The harness automatically excludes `fsevents` from Vite's dependency optimization. You can use the same pattern for other native modules:

```typescript
// In your vite.config.ts if you encounter similar issues
viteConfig: {
  optimizeDeps: { 
    exclude: ['another-native-module', 'problematic-package'] 
  }
}
```

### Dependency Requirements

- **Node.js**: 18 or higher
- **@types/node**: 20.19.0 or higher (automatically handled by the CLI)

If you encounter peer dependency conflicts during installation, they are usually resolved automatically during the setup process.
