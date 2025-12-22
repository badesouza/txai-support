# Dead Code Analysis Report

Generated: 2024-12-21

## Summary

This report identifies unused code across the TXAI Support codebase that can be safely removed.

## Backend Dead Code

### 1. Model Files (Unused Prisma Wrappers)

All files in `backend/src/models/` (except WhatsAppMessage.ts) are unused wrappers around Prisma Client.

**Status**: ❌ UNUSED - Safe to delete

#### Files to Remove:
- `backend/src/models/User.ts` (133 lines)
  - Contains: UserModel with CRUD methods
  - Imports found: **0 production imports**
  - Reason: Controllers use Prisma directly via `prisma.user.*`

- `backend/src/models/Call.ts` (133 lines)
  - Contains: CallModel with CRUD methods  
  - Imports found: **0 production imports**
  - Reason: Controllers use Prisma directly via `prisma.call.*`

- `backend/src/models/CallImage.ts`
  - Contains: CallImage model wrapper
  - Imports found: **0 production imports**
  - Reason: Not used anywhere

- `backend/src/models/UserToken.ts`
  - Contains: UserToken model wrapper
  - Imports found: **0 production imports**
  - Reason: Not used anywhere

- `backend/src/models/index.ts`
  - Contains: Barrel export file
  - Imports found: **0 production imports**
  - Reason: Parent directory unused

**Keep**:
- `backend/src/models/WhatsAppMessage.ts`
  - Contains: WhatsAppMessageModel
  - Imports found: **2 imports** in:
    - `backend/src/services/wppconnect-direct.service.ts`
    - `backend/src/services/whatsapp-message.service.ts`
  - Reason: Actively used in production code

### 2. Service Files (Replaced/Unused)

#### backend/src/services/whatsapp.service.ts
**Status**: ❌ UNUSED IN PRODUCTION - Has test dependencies

- Size: 190 lines
- Contains: HTTP-based WPPConnect client (WppconnectHttpService)
- Replaced by: `backend/src/services/wppconnect-direct.service.ts` (direct WPPConnect integration)
- Production imports: **0**
- Test imports: **5 test files**
  - `backend/tests/unit/services/whatsapp.service.test.ts`
  - `backend/tests/unit/services/WhatsAppService.test.ts`
  - `backend/tests/unit/services/WhatsAppMessageService.test.ts`
  - `backend/tests/unit/controllers/whatsapp.controller.test.ts`
  - `backend/tests/integration/controllers/whatsapp.controller.test.ts`

**Recommendation**: Delete the service AND its related test files since the service is no longer used in production.

#### backend/src/services/CallService.ts
**Status**: ❌ UNUSED - Safe to delete

- Size: 146 lines
- Contains: CallService class with CRUD operations
- Imports found: **0 imports** (only referenced in its own file)
- Reason: Controllers use Prisma directly, not this service layer

#### backend/src/services/UserService.ts  
**Status**: ❌ UNUSED - Safe to delete

- Size: 110 lines
- Contains: UserService class with CRUD operations
- Imports found: **0 imports** (only referenced in its own file)
- Reason: Controllers use Prisma directly, not this service layer

### 3. Compiled JavaScript (/dist directory)

**Status**: ❌ COMMITTED TO GIT - Should not be in version control

The `backend/dist/` directory contains compiled JavaScript:
- Already listed in `.gitignore`
- Contains out-of-sync compiled files from older TypeScript source
- Files:
  - `dist/config/jwt.js`
  - `dist/controllers/*.js`
  - `dist/middleware/*.js`
  - `dist/models/*.js`
  - `dist/routes/*.js`
  - `dist/server.js`
  - `dist/services/*.js`
  - `dist/types/*.js`

**Recommendation**: Remove from git history with `git rm -r backend/dist/` and commit.

### 4. Duplicate/Old Files

#### backend/src/app.ts vs backend/src/server.ts

Both files exist but serve different purposes:

- **server.ts** (126 lines) - Production entry point
  - Connects to database
  - Starts HTTP server
  - Initializes WPPConnect
  - ✅ KEEP (production entry)

- **app.ts** (47 lines) - Test-only Express app
  - Exports Express app without server.listen()
  - Used by: `backend/tests/integration/controllers/*.test.ts`
  - ✅ KEEP (proper separation for testing)

**Recommendation**: Keep both - this is correct separation of concerns.

## Frontend Dead Code

### Package Dependencies

**Status**: ✅ ALREADY CLEANED

Previously unused dependencies (now removed):
- `@mui/material`
- `@mui/icons-material`
- `@emotion/react`
- `@emotion/styled`
- `@heroicons/react`
- `react-icons`
- `@tanstack/react-table`
- `@tanstack/react-table-devtools`

All have been removed from `frontend/package.json`.

## Summary of Actions

### Safe to Delete (Backend):

1. **Models directory (except WhatsAppMessage.ts)**:
   - Delete: `backend/src/models/User.ts`
   - Delete: `backend/src/models/Call.ts`
   - Delete: `backend/src/models/CallImage.ts`
   - Delete: `backend/src/models/UserToken.ts`
   - Delete: `backend/src/models/index.ts`
   - Keep: `backend/src/models/WhatsAppMessage.ts`

2. **Services**:
   - Delete: `backend/src/services/whatsapp.service.ts`
   - Delete: `backend/src/services/CallService.ts`
   - Delete: `backend/src/services/UserService.ts`

3. **Test files for deleted services**:
   - Delete: `backend/tests/unit/services/whatsapp.service.test.ts`
   - Delete: `backend/tests/unit/services/WhatsAppService.test.ts`
   - Delete: `backend/tests/unit/services/WhatsAppMessageService.test.ts`
   - Delete: `backend/tests/unit/controllers/whatsapp.controller.test.ts` (if it only tests whatsapp.service)
   - Delete: `backend/tests/integration/controllers/whatsapp.controller.test.ts` (if it only tests whatsapp.service)

4. **Compiled files**:
   - Run: `git rm -r backend/dist/`

### Total Lines Removed:
- Models: ~532 lines
- Services: ~446 lines  
- Dist files: All compiled JS
- **Total: ~978+ lines of dead code**

## Risk Assessment

### Low Risk:
- Model files (zero production imports confirmed)
- Service files (zero production imports confirmed)
- Dist directory (build artifacts only)

### Medium Risk:
- whatsapp.service.ts has test dependencies
  - Mitigation: Delete associated test files
  - Tests should use wppconnect-direct.service instead

### No Risk:
- app.ts and server.ts should both be kept (correct pattern)
- WhatsAppMessage.ts model should be kept (actively used)

## Verification Steps

After deletion:
1. Run: `cd backend && npm run build` - Should succeed
2. Run: `cd backend && npm test` - Should pass (after removing old service tests)
3. Check: No import errors in production code
4. Check: Docker build succeeds

## Notes

- All controllers now use Prisma client directly via `backend/src/lib/prisma.ts`
- The model wrappers were likely from an earlier architecture that has been refactored
- WhatsApp integration was migrated from HTTP-based to direct WPPConnect library

