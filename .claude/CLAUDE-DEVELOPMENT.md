# CLAUDE Development Guide

## Development Commands

### Core Commands
```bash
# Build the library (uses tsup)
npm run build

# Development build with watch mode
npm run dev

# Lint and format (uses Biome)
npm run lint
npm run lint:fix
npm run format

# Clean build artifacts
npm run clean
```

### Testing Commands
```bash
# Run integration tests
npm run test:integration
npm run test:integration:run

# Test with fixture projects
npm run dev:dataset   # PCF dataset component
npm run dev:field     # PCF field component
```

### CLI Testing
```bash
# Test the CLI initializer (run inside a PCF project directory)
cd /path/to/existing-pcf-project
npx pcf-vite-harness

# Test with fixture projects (navigate to tests/fixtures/*)
cd tests/fixtures/pcf-dataset-test && npm run dev:pcf
```

## Testing Strategy

### Integration Testing (`tests/integration/`)
- **Real PCF Components**: Tests use actual PCF fixtures in `tests/fixtures/`
- **Live Dataverse Integration**: Tests make real API calls to Dataverse environments - no mocking
- **Data Operations**: Tests create, modify, and read actual data on live Dataverse instances
- **Component Lifecycle**: Tests for PCF lifecycle events and state management
- **Environment Requirements**: Tests require valid Dataverse credentials and environment access

### Fixture Projects (`tests/fixtures/`)
- `pcf-dataset-test/` - Dataset-based PCF component with full development setup
- `pcf-field-test/` - Field-based PCF component
- Both include complete PCF project structure with manifests, TypeScript, and dev environments

## Development Workflow

### Working with DevTools Features
1. DevTools state is managed through Redux-style actions
2. Use `PCFDevToolsProvider` to wrap components requiring DevTools access
3. Dataset operations flow through `utils/dataset/` system with error analysis
4. WebAPI calls are intercepted and logged via `WebAPIMonitor.ts`

### Adding New PCF Support
1. Update manifest detection in `utils/manifestExtractor.ts`
2. Extend mock context in `createMockContext.ts` for new component types
3. Add DevTools support via new components in `devtools-redux/components/`

### CLI Development
- CLI logic in `bin/pcf-vite-init.ts`
- Templates for generated files in `templates/` directory
- Test CLI changes with fixture projects or create new PCF projects