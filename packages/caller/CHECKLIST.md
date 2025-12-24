# CHECKLIST - @igniter-js/caller

> Reference: `.specs/new-packages.spec.md`, `packages/store`, `packages/mail`, `packages/agent`

## 0) Baseline audit (before changes)
- [x] Compare current file structure to the standard layout (builders/core/types/utils/adapters/telemetry + barrels).
- [x] List all files that violate the "no igniter- prefix" naming rule.
- [x] Map all public exports and compare with store/mail/agents barrel patterns.

## 1) Public API + entrypoint
- [x] Introduce `src/builders/main.builder.ts` with `IgniterCallerBuilder` and `export const IgniterCaller = IgniterCallerBuilder`.
- [x] Rename runtime to `IgniterCallerManager` in `src/core/manager.ts` and make `IgniterCaller` the public builder alias.
- [x] Ensure `.create()` lives on the main entrypoint (`IgniterCaller.create()`), not in the core class.
- [x] Move builder state types to `src/types/builder.ts` (no types inside class files).

## 2) File naming + architecture
- [x] Rename `src/core/igniter-caller.ts` -> `src/core/manager.ts`.
- [x] Rename `src/core/igniter-caller-events.ts` -> `src/core/events.ts`.
- [x] Rename `src/builder/*` -> `src/builders/*` and align filenames with spec.
- [x] Remove any `igniter-` prefixes from filenames and update imports.

## 3) Telemetry standardization
- [x] Replace `src/types/telemetry.ts` with `IgniterTelemetryManager` from `@igniter-js/telemetry`.
- [x] Rebuild `src/telemetry/index.ts` using `IgniterTelemetryEvents` builder and `get.key(...)` helpers.
- [x] Ensure all emissions use `IgniterCallerTelemetryEvents.get.key('request.execute.started')` pattern.
- [x] Remove/merge `telemetry/server.ts` and `telemetry/browser.ts` if not needed after manager integration.
- [x] Add telemetry subpath export `@igniter-js/caller/telemetry` and add `telemetry/index` to `tsup` entry.

## 4) Adapters + mocking
- [x] Decide if cache store adapter qualifies as "adapter" per spec.
- [x] If yes: add `src/adapters/` with `mock.adapter.ts` and export `@igniter-js/caller/adapters`.
- [x] Add adapter tests for mock behavior (call tracking, state).

## 5) Utils + types
- [x] Ensure all utilities are static classes (`IgniterCallerX`) with tests.
- [x] Move type helpers (e.g., `InferResponse`, `GetEndpoint`) out of core into `src/types/`.
- [x] Ensure `src/types/index.ts` is the single types barrel with sections + comments.

## 6) Logging + hooks
- [x] Ensure `withLogger(IgniterLogger)` exists in builder.
- [x] Add consistent debug/info/error logs for each public operation (matching telemetry events).

## 7) Barrel files + exports
- [x] Update `src/index.ts`, `src/builders/index.ts`, `src/core/index.ts`, `src/utils/index.ts`, `src/adapters/index.ts` with section comments.
- [x] Prefer `export *` + `export type *` unless a conflict requires named exports.

## 8) Tests + type inference
- [x] Add/adjust builder type inference tests with `expectTypeOf`.
- [x] Add telemetry coverage tests: `describe('telemetry.request')` with one `it` per event + attribute assertions.
- [x] Ensure utils/core/builders/adapters tests exist and use Zod v4.
- [ ] Run tests after changes; if failures arise, report before changing implementation.

## 9) Docs + TSDoc
- [x] Update TSDoc for all public classes/methods to include params/returns/throws/examples.
- [x] Refresh `README.md` + `AGENTS.md` to match the final API and new entrypoint.

## 10) Build + exports verification
- [ ] Align `package.json` exports to the mail/store pattern (`.mjs` for import, shim only if needed).
- [ ] Run `npm run build`, `npm run test`, `npm run typecheck` and verify generated `dist/` matches exports.
