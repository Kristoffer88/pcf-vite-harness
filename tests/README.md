# PCF Vite Harness - Test Suite

This directory contains the complete test suite for the PCF Vite Harness project, including fixtures for testing and automated end-to-end validation.

## Structure

```
tests/
├── fixtures/           # Test fixtures for different PCF component types
│   ├── pcf-dataset-test/   # Dataset PCF component with real Dataverse integration
│   └── pcf-field-test/     # Field PCF component with real Dataverse integration
├── e2e/                # End-to-end tests (CLI workflow automation)
├── integration/        # Integration tests (Dataverse connectivity)
└── utils/             # Test utilities and helpers
```

## Test Fixtures

### PCF Dataset Test (`fixtures/pcf-dataset-test/`)
- **Purpose**: Tests dataset PCF components with real Dataverse data
- **Integration**: Uses dataverse-utilities for real API calls
- **Features**: Grid display, pagination, record selection
- **Usage**: `cd fixtures/pcf-dataset-test && npm install && npm run dev`

### PCF Field Test (`fixtures/pcf-field-test/`)
- **Purpose**: Tests field PCF components with real Dataverse binding
- **Integration**: Real-time save/load from Dataverse
- **Features**: Input validation, real-time sync, WebAPI integration
- **Usage**: `cd fixtures/pcf-field-test && npm install && npm run dev`

## Real Dataverse Integration

Both fixtures are configured for **real Dataverse integration**:

1. **Authentication**: Uses Azure CLI authentication via dataverse-utilities
2. **Environment**: Copy `.env.example` to `.env` and set your Dataverse URL
3. **API Calls**: Makes actual calls to `/api/data/v9.2/` endpoints
4. **No Mocks**: All data comes from live Dataverse environment

## Setup for Real Integration

1. **Install Azure CLI** and login:
   ```bash
   az login
   ```

2. **Set Dataverse URL** in each fixture:
   ```bash
   cp .env.example .env
   # Edit .env and set VITE_DATAVERSE_URL
   ```

3. **Install dependencies**:
   ```bash
   cd fixtures/pcf-dataset-test && npm install
   cd ../pcf-field-test && npm install
   ```

4. **Run fixtures**:
   ```bash
   # Dataset test (port 3000)
   cd fixtures/pcf-dataset-test && npm run dev
   
   # Field test (port 3001)
   cd fixtures/pcf-field-test && npm run dev
   ```

## Automated Testing (Coming Soon)

- **E2E Tests**: Automated CLI workflow validation
- **Playwright Tests**: Browser automation and UI testing  
- **Build Validation**: Automated build process testing
- **Migration Tests**: Version upgrade testing

## Usage in CI/CD

These fixtures serve as:
- **Regression tests** for harness changes
- **Integration validation** with real Dataverse
- **Example projects** for documentation
- **Template projects** for E2E test automation