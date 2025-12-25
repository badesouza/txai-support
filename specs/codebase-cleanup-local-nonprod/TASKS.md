# Tasks — codebase-cleanup-local-nonprod

Scope: local environment and non-prod testing only. Focus on simplifying the codebase around the primary flow (Direct QR in UI), deleting dead/duplicate code paths, reducing log noise, and fixing the most obvious correctness/perf footguns that impact local dev/testing.

Non-goals: production hardening, new infra, major feature work, data migrations beyond local/dev.

## 0) Repo hygiene (delete tracked artifacts + local state)

- [ ] Verify which generated/state files are currently tracked by git (even if ignored).
- [ ] Remove tracked build/test artifacts from repo history/index (keep generation via scripts):
  - [ ] `backend/dist/`
  - [ ] `backend/coverage/`
  - [ ] Any other generated output committed under `frontend/` (if present)
- [ ] Remove tracked Terraform local files:
  - [ ] `infra/terraform/**/terraform.tfstate*`
  - [ ] `infra/terraform/**/tfplan`
  - [ ] Any `.terraform/` folders if tracked
- [ ] Add/adjust guardrails to prevent reintroducing these:
  - [ ] Tighten `.gitignore` if needed (but prefer untracking first)
  - [ ] Add a lightweight check script (or CI step) that fails if forbidden paths are tracked

## 1) Choose the single WhatsApp path: Direct QR in UI

- [ ] Confirm Direct QR in UI is the only supported WhatsApp integration path for local/non-prod.
- [ ] Document the supported flow (short, high-signal):
  - [ ] Backend starts / can initialize WPPConnect
  - [ ] Frontend polls `/api/whatsapp/status` and `/api/whatsapp/qrcode`
  - [ ] Incoming WhatsApp messages create/update calls + message history

## 2) Delete duplicate WhatsApp stacks (dead code removal)

Goal: keep one implementation and delete the rest.

- [ ] Remove docker prototype WhatsApp stack (not used by the Direct QR flow):
  - [ ] Delete `docker/wppconnect/` directory contents
  - [ ] Ensure `docker-compose.yml` does not reference these (it currently doesn’t)
- [ ] Remove webhook-based processing path (redundant with direct service):
  - [ ] Delete `backend/src/services/whatsapp-message.service.ts`
  - [ ] Remove `WhatsAppController.webhook()` endpoint and route wiring in `backend/src/routes/whatsapp.routes.ts`
  - [ ] Remove any docs referencing webhook mode (or mark explicitly “deprecated/not used”)
- [ ] Remove any unused dependencies introduced only for the deleted stacks (if any)

## 3) Make Direct QR APIs boring and consistent

Goal: avoid frontend heuristics and magic placeholder strings; centralize state handling.

- [ ] Define a single response contract for WhatsApp status and QR endpoints:
  - [ ] `connected: boolean`
  - [ ] `qrCode: string | null` (data URL when available)
  - [ ] Optional: `state` enum (e.g. `CONNECTED | DISCONNECTED | GENERATING_QR | ERROR`)
  - [ ] Optional: `nextPollMs` hint
- [ ] Update backend controller/service to adhere strictly to the contract:
  - [ ] Remove multiple layers of caching/debounce that disagree (controller vs service)
  - [ ] Ensure QR code freshness rules live in one place (prefer service)
  - [ ] Ensure `/qrcode` never returns ambiguous sentinel text unless it’s part of the contract
- [ ] Update frontend `frontend/src/components/WhatsAppConnection.tsx`:
  - [ ] Remove placeholder detection by substring matching
  - [ ] Remove excessive state debug logs
  - [ ] Base UI transitions only on the response contract

## 4) Gate WhatsApp initialization for local DX (without “prod overstep”)

Goal: make local dev predictable and avoid doing heavy work on every API process start.

- [ ] Decide a local-only flag behavior:
  - [ ] Option A: start WPPConnect lazily on first `/whatsapp/*` call
  - [ ] Option B: start on boot only when `WHATSAPP_ENABLED=true`
- [ ] Update `backend/src/server.ts` accordingly:
  - [ ] Remove unconditional startup side-effects if not necessary
  - [ ] Keep failure handling non-fatal for local runs (WhatsApp can fail without killing API)

## 5) Logging cleanup (reduce noise, avoid leaking secrets)

Goal: local logs should be readable; never print tokens/passwords/headers verbatim.

- [ ] Replace noisy `console.log` blocks with structured, level-based logging (minimal wrapper is fine).
- [ ] Remove sensitive logs:
  - [ ] `backend/src/middleware/auth.middleware.ts` should not log auth header, token parts, or decoded payload
  - [ ] `backend/src/controllers/user.controller.ts` should not log raw request bodies containing passwords
- [ ] Reduce upload spam:
  - [ ] Remove the large directory/file stat logging in `backend/src/server.ts` and `backend/src/middleware/upload.middleware.ts`
  - [ ] Keep a single concise line per upload (filename, size, mimetype) under debug level
- [ ] Remove frontend console noise in `WhatsAppConnection.tsx` (keep optional debug toggles if needed)

## 6) Fix the worst local Firestore correctness/perf footguns

Goal: make behavior correct and stable for local testing; avoid expensive patterns even in emulator.

- [ ] Replace `offset()` pagination with cursor-based pagination:
  - [ ] `backend/src/repositories/call.repository.ts`
  - [ ] `backend/src/repositories/user.repository.ts`
- [ ] Fix `CallRepository.findMany()` search + totals:
  - [ ] Do not apply `search` filtering client-side after pagination (makes totals wrong)
  - [ ] Either remove search for now, or implement a constrained Firestore-supported search strategy
- [ ] Remove Firestore startup write:
  - [ ] In `backend/src/server.ts`, stop writing to `_health/check` on boot

## 7) Stop appending WhatsApp messages into `Call.description`

Goal: prevent unbounded document growth and duplicated “message history”.

- [ ] In `backend/src/services/wppconnect-direct.service.ts`:
  - [ ] Stop concatenating user messages into `Call.description`
  - [ ] Persist messages only in `whatsappMessages`
- [ ] Ensure UI uses message history endpoint to display the thread for a call
- [ ] (Optional local-only) add a one-time cleanup script for dev data if needed

## 8) Upload handling sanity (local/non-prod safe defaults)

Goal: avoid OOM/GC stalls; keep local workflow intact.

- [ ] Reduce `multer` limits to sane local defaults (e.g. 10–20MB) unless there’s a real need
- [ ] Avoid `memoryStorage()` for large files; prefer disk storage locally
- [ ] Ensure stored paths are consistent across local and emulator-backed GCS modes

## 9) Docs update (keep only what matches local/non-prod reality)

- [ ] Update `docs/architecture/LOCAL_VS_CLOUD.md` to match actual code behavior (or update code to match docs, but pick one)
- [ ] Update `docs/STORAGE_AND_REDIS_SETUP.md` to reflect the supported Direct QR flow (and remove webhook references)
- [ ] Add a short “Local testing checklist”:
  - [ ] `docker-compose up -d`
  - [ ] login, open WhatsApp page, scan QR
  - [ ] send a WhatsApp message; verify call created/updated + message history visible

## 10) Validation checklist (local)

- [ ] `docker-compose up -d` succeeds
- [ ] Frontend loads and can login
- [ ] WhatsApp QR renders reliably (no infinite “initializing” state)
- [ ] Incoming WhatsApp text creates/updates calls as expected
- [ ] Image upload works for calls
- [ ] No secrets printed in logs during normal use

