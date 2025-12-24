# CHECKLIST - @igniter-js/telemetry

> Reference: `.specs/new-packages.spec.md`, `packages/store`, `packages/mail`, `packages/agent`

## 0) Baseline audit (before changes)
- [ ] Compare current layout to the standardized builders/core/types/utils/adapters structure.
- [ ] Identify all `igniter-*` filenames that need renaming.

## 1) Public API + entrypoint
- [ ] Ensure `IgniterTelemetry.create()` is the official entrypoint (builder alias).
- [ ] Rename runtime to `IgniterTelemetryManager` in `src/core/manager.ts`.
- [ ] Move builder state types into `src/types/builder.ts` (no types inside class files).

## 2) File naming + architecture
- [ ] Rename `src/builders/igniter-telemetry.builder.ts` -> `src/builders/main.builder.ts`.
- [ ] Rename `src/core/igniter-telemetry.ts` -> `src/core/manager.ts`.
- [ ] Rename `src/errors/igniter-telemetry.error.ts` -> `src/errors/telemetry.error.ts`.
- [ ] Rename any `igniter-*` utils to standard filenames.

## 3) Server-only shim
- [ ] Add `src/shim.ts` and register it in `package.json` exports + `browser` map.

## 4) Adapters + exports
- [ ] Keep `@igniter-js/telemetry/adapters` subpath only (no `adapters/*`).
- [ ] Add `MockTelemetryAdapter` if needed for tests and spec compliance.

## 5) Utils + types
- [ ] Ensure all utils are static classes (e.g., `IgniterTelemetryId`, `IgniterTelemetryRedaction`, `IgniterTelemetrySampling`).
- [ ] Move helper types out of class files into `src/types/*`.
- [ ] Normalize type prefixes (`IgniterTelemetry*`) and add/confirm `IIgniterTelemetryManager` interface.

## 6) Logging + telemetry parity
- [ ] Ensure `.withLogger(IgniterLogger)` exists and logs all public operations in parity with telemetry.

## 7) Barrel files + exports
- [ ] Rebuild barrels with section comments (`core`, `builders`, `adapters`, `errors`, `types`, `utils`).
- [ ] Prefer `export *` + `export type *` unless conflicts force named exports.

## 8) Tests + type inference
- [ ] Add `expectTypeOf` inference tests for builder chain.
- [ ] Add/refresh tests for `/utils`, `/core`, `/builders`, `/adapters` with Zod v4 where needed.
- [ ] Ensure session/scoping/transport edge cases are covered.
- [ ] Run tests and report failures before changing implementation.

## 9) Docs + TSDoc
- [ ] Update all TSDoc blocks to match the final API and behavior.
- [ ] Refresh `README.md` and `AGENTS.md` to reflect new file names and entrypoint.

## 10) Build + exports verification
- [ ] Align `package.json` exports with store/mail (`.mjs` import, shim mapping).
- [ ] Run `npm run build`, `npm run test`, `npm run typecheck` and confirm dist matches exports.
