# CHECKLIST - @igniter-js/jobs

> Reference: `.specs/new-packages.spec.md`, `packages/store`, `packages/mail`, `packages/agent`

## 0) Baseline audit (before changes)
- [ ] Compare current layout and naming to the standard builders/core/types/utils/adapters/telemetry structure.
- [ ] Identify all `igniter-*` filenames and legacy folder names that must be renamed.

## 1) Public API + entrypoint
- [ ] Ensure `IgniterJobs.create()` is the official entrypoint (builder alias), not `IgniterJobsBuilder`.
- [ ] Ensure queue/worker builders follow the same alias pattern as store/mail (`IgniterQueue`, `IgniterWorker`).
- [ ] Move builder state types into `src/types/builder.ts` (no types inside class files).

## 2) File naming + architecture
- [ ] Rename `src/core/igniter-jobs.ts` -> `src/core/manager.ts` and class to `IgniterJobsManager`.
- [ ] Rename `src/core/igniter-queue.ts` -> `src/core/queue.ts` (or `queue.manager.ts` if needed).
- [ ] Rename `src/builders/*` to `main.builder.ts`, `queue.builder.ts`, `worker.builder.ts` with no `igniter-` prefix.
- [ ] Update all imports/exports after renames.

## 3) Telemetry standardization
- [ ] Ensure `withTelemetry(...)` accepts `IgniterTelemetryManager` and is optional.
- [ ] Consolidate telemetry definitions into `src/telemetry/index.ts` (remove `jobs.telemetry.ts` if redundant).
- [ ] Emit telemetry inline in core methods using `IgniterJobsTelemetryEvents.get.key('group.event.status')`.
- [ ] Add `telemetry/index` to `tsup` entry and export `@igniter-js/jobs/telemetry`.

## 4) Server-only shim
- [ ] Add `src/shim.ts` (server-only error) and register it in `package.json` exports + `browser` map.

## 5) Adapters + mocking
- [ ] Ensure `@igniter-js/jobs/adapters` subpath export only (no `adapters/*`).
- [ ] Add `MockJobsAdapter` (or `MockJobsQueueAdapter`) with call tracking + tests.
- [ ] Keep memory adapter but make mock adapter explicit per spec.

## 6) Utils + types
- [ ] Ensure all utils are static classes (rename if needed) and fully tested.
- [ ] Move helper types out of class files into `src/types/*`.
- [ ] Normalize types with `IgniterJobs*` prefixes and `IIgniterJobsManager` interface.

## 7) Logging + hooks
- [ ] Ensure `.withLogger(IgniterLogger)` exists and logs start/success/failure for public ops.
- [ ] Make logs match telemetry names and avoid PII.

## 8) Barrel files + exports
- [ ] Rebuild `src/index.ts`, `src/builders/index.ts`, `src/core/index.ts`, `src/adapters/index.ts`, `src/utils/index.ts`, `src/types/index.ts` with section comments.
- [ ] Prefer `export *` + `export type *` unless conflicts require named exports.

## 9) Tests + type inference
- [ ] Add `expectTypeOf` chain tests for builder context inference.
- [ ] Add telemetry tests with `describe('telemetry.<group>')` + one `it` per event.
- [ ] Ensure coverage for `/utils`, `/core`, `/builders`, `/adapters` using Zod v4 schemas.
- [ ] Run tests and report failures before changing implementation.

## 10) Docs + TSDoc
- [ ] Update all TSDoc blocks to match new APIs and behavior.
- [ ] Refresh `README.md` and `AGENTS.md` with the final structure and usage patterns.

## 11) Build + exports verification
- [ ] Align `package.json` exports with store/mail (`.mjs` import, shim mapping for browser).
- [ ] Run `npm run build`, `npm run test`, `npm run typecheck` and confirm dist matches exports.
