# CLAUDE Architecture Guide

## Architecture & Code Organization

### Core Library Structure
- `src/index.ts` - Main library exports, provides all public APIs
- `src/initializePCFHarness.tsx` - Primary initialization functions (`initPCF`, `initializePCFHarness`)
- `src/PowerAppsContainer.tsx` - Main React component that simulates PowerApps environment
- `src/createMockContext.ts` - Generates realistic PCF context objects
- `src/createViteConfig.ts` - Vite configuration factory with PCF optimizations

### DevTools Redux System (`src/devtools-redux/`)
Advanced debugging system with multiple specialized components:

- **Core Integration**:
  - `PCFDevToolsProvider.tsx` - Context provider for DevTools state
  - `PCFDevToolsConnector.ts` - Connects to Redux DevTools browser extension
  - `EmbeddedDevToolsUI.tsx` - Embedded DevTools panel interface

- **Lifecycle Management**:
  - `contexts/PCFLifecycleContext.tsx` - Tracks component lifecycle events
  - `hooks/LifecycleHooks.ts` - Hooks for lifecycle monitoring

- **Dataset Tools** (`components/` and `utils/dataset/`):
  - `DatasetTab.tsx` - Dataset inspector interface
  - `DatasetRefreshTool.tsx` - Manual dataset refresh utilities
  - `utils/dataset/queryBuilder.ts` - OData query construction
  - `utils/dataset/errorAnalyzer.ts` - Dataset error analysis

### Utility Systems (`src/utils/`)
- `manifestExtractor.ts` - PCF manifest parsing and component detection
- `pcfDiscovery.ts` - Auto-discovery of PCF projects in filesystem
- `viewDiscovery.ts` - Dataverse view analysis and relationship mapping

### CLI System (`bin/pcf-vite-init.ts`)
Interactive CLI that auto-detects PCF components and generates development setup.

## Build System & Configuration

### TSup Configuration (`tsup.config.ts`)
- **Multiple Entry Points**: Main library, DevTools, and CLI
- **Dual Format**: CommonJS and ESM builds
- **Post-Build Steps**: Copies styles/templates, makes CLI executable
- **External Dependencies**: React, Vite, and optional dataverse-utilities

### Code Quality (Biome)
- **Strict TypeScript Rules**: No explicit `any`, unused variables, etc.
- **Import Organization**: Auto-sorts and cleans imports
- **Test Overrides**: Relaxed rules for test files

## Common Patterns

### PCF Component Integration
```typescript
// Standard initialization
import { initPCF } from 'pcf-vite-harness'
import { YourPCFComponent } from './YourComponent'

initPCF(YourPCFComponent)

// Advanced with DevTools
import { initializePCFHarness } from 'pcf-vite-harness'

initializePCFHarness({
  pcfClass: YourPCFComponent,
  showDevPanel: true,
  contextOptions: { /* custom context */ }
})
```

### Dataset Error Handling
Dataset operations include comprehensive error analysis through the `utils/dataset/errorAnalyzer.ts` system which categorizes and provides solutions for common Dataverse/OData errors.

### Mock Context Customization
The `createMockContext` function accepts extensive options to simulate different PowerApps environments, user contexts, and dataset states for comprehensive testing.