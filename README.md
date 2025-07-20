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

### 1. Install Package

```bash
npm install pcf-vite-harness --save-dev
```

### 2. Create Development Files

Create a `dev/` directory in your PCF project and copy these files:

**dev/vite.config.ts:**
```typescript
import { createPCFViteConfig } from 'pcf-vite-harness';

export default createPCFViteConfig({
    port: 3000,
    enableDataverse: true, // Optional: for Dataverse integration
    viteConfig: {
        resolve: {
            alias: {
                '@': '../YourComponent' // Path to your PCF component
            }
        }
    }
});
```

**dev/main.ts:**
```typescript
import { initPCF } from 'pcf-vite-harness';
import 'pcf-vite-harness/styles/powerapps.css';
import { YourPCFComponent } from '../YourComponent/index';

// Simple initialization
initPCF(YourPCFComponent);
```

**dev/index.html:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PCF Development</title>
</head>
<body>
    <div id="pcf-container"></div>
    <script type="module" src="./main.ts"></script>
</body>
</html>
```

### 3. Add NPM Script

Add to your `package.json`:

```json
{
  "scripts": {
    "dev:pcf": "vite --config dev/vite.config.ts"
  }
}
```

### 4. Start Development

```bash
npm run dev:pcf
```

Your PCF component will open at `http://localhost:3000` with full HMR support!

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