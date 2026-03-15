# TXAI Support - Test Suite

A comprehensive test suite with **beautiful Jest output** for the TXAI Support backend.

## 📊 Test Categories

| Category | Description | Command |
|----------|-------------|---------|
| 🧪 Unit | Repository logic, validation, utilities | `npm run test:unit` |
| 🔗 Functional | API endpoint integration | `npm run test:functional` |
| 🌐 E2E | Full user journey tests | `npm run test:e2e` |
| 🏗️ Infrastructure | Service availability checks | `npm run test:infra` |

## 🚀 Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (development)
npm run test:watch
```

## 🎯 Environment Configuration

### Local Development (Default)
```bash
# Uses local Docker containers
npm run test:local
```

### Cloud Environment
```bash
# Set API_URL to your Cloud Run URL
API_URL=https://your-backend.run.app/api npm test
```

### Test Environment Variables

Create `tests/test.env` or set these environment variables:

```env
# Target API
API_URL=http://localhost:3001/api

# Firebase Emulator
FIRESTORE_EMULATOR_HOST=localhost:8082
GCP_PROJECT_ID=local-dev

# Test Credentials
TEST_ADMIN_EMAIL=admin@txai.com
TEST_ADMIN_PASSWORD=admin123

# Storage
STORAGE_EMULATOR_HOST=http://localhost:4443
GCS_BUCKET=txai-uploads

# Frontend (for E2E)
FRONTEND_URL=http://localhost:8081
```

## 🧪 Test Structure

```
tests/
├── unit/                    # Pure logic tests (no network)
│   ├── repositories/        # Data access logic
│   ├── middleware/          # Auth, validation
│   └── storage/             # Storage providers
├── functional/              # API integration tests
│   └── api/
│       ├── health.test.ts   # Health check
│       ├── auth.test.ts     # Login/Register
│       ├── users.test.ts    # User CRUD
│       └── calls.test.ts    # Call CRUD
├── e2e/                     # End-to-end journeys
│   ├── user-journey.test.ts # Complete workflows
│   ├── file-upload.test.ts  # File handling
│   └── browser.test.ts      # Playwright MCP tests
├── infra/                   # Infrastructure checks
│   └── services.test.ts     # Service availability
├── fixtures/                # Test data
│   └── index.ts
├── utils/                   # Test utilities
│   └── api-client.ts
├── setup.ts                 # Jest setup
├── global-setup.ts          # Pre-test initialization
├── global-teardown.ts       # Post-test cleanup
└── test.env                 # Environment config
```

## 🎨 Beautiful Output

The test suite produces beautiful console output:

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🚀 TXAI Support - Test Suite                                ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║   📍 Target: 🏠 LOCAL                                          ║
║   🔗 API: http://localhost:3001/api                            ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

PASS tests/unit/middleware/auth.test.ts
  🧪 Auth Middleware
    Token Generation
      ✓ should generate valid JWT token
      ✓ should include user data in token
      ...
```

## 🌐 E2E with Playwright MCP

For browser-based E2E tests, use Playwright MCP commands:

```typescript
// 1. Navigate to frontend
mcp_playwright_browser_navigate({ url: 'http://localhost:8081' })

// 2. Take accessibility snapshot
mcp_playwright_browser_snapshot({})

// 3. Fill login form
mcp_playwright_browser_fill_form({
  fields: [
    { name: 'email', type: 'textbox', ref: 'S1', value: 'admin@txai.com' },
    { name: 'password', type: 'textbox', ref: 'S2', value: 'admin123' }
  ]
})

// 4. Click login
mcp_playwright_browser_click({ element: 'Login button', ref: 'S3' })

// 5. Verify dashboard
mcp_playwright_browser_snapshot({})
```

## 📈 Coverage Goals

| Metric | Target | Current |
|--------|--------|---------|
| Statements | 80% | - |
| Branches | 70% | - |
| Functions | 70% | - |
| Lines | 70% | - |

Run `npm run test:coverage` to generate coverage reports.

## 🔧 CI/CD Integration

```bash
# For CI pipelines
npm run test:ci
```

This runs tests with:
- `--ci` flag for CI mode
- `--coverage` for coverage reports
- `--runInBand` for sequential execution


