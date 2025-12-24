# CHECKLIST - @igniter-js/connectors

> Reference: `.specs/new-packages.spec.md`, `packages/store`, `packages/mail`, `packages/agent`

## 0) Baseline audit (before changes)
- [ ] Compare current layout to standard builders/core/types/utils/adapters/telemetry structure.
- [ ] Identify all `igniter-*` filenames and legacy folder names that need renaming.

## 1) Public API + entrypoint
- [ ] Ensure `IgniterConnectors.create()` (or `IgniterConnector` builder alias) is the public entrypoint, not a `Builder`.
- [ ] Ensure the runtime class is `IgniterConnectorsManager` (or `IgniterConnectorManager`) under `src/core/manager.ts`.
- [ ] Move builder state types into `src/types/builder.ts` (no types inside class files).

## 2) File naming + architecture
- [ ] Rename `src/core/igniter-connector-manager.ts` -> `src/core/manager.ts`.
- [ ] Rename `src/core/igniter-connector-scoped.ts` -> `src/core/scoped.ts`.
- [ ] Rename `src/core/igniter-connector-oauth.ts` -> `src/core/oauth.ts`.
- [ ] Rename `src/adapters/igniter-connector.adapter.ts` -> `src/adapters/connector.adapter.ts`.
- [ ] Rename any remaining `igniter-*` files in builders/errors/utils.

## 3) Telemetry standardization
- [ ] Ensure `withTelemetry(...)` accepts `IgniterTelemetryManager` and is optional.
- [ ] Consolidate telemetry definitions into `src/telemetry/index.ts` using `IgniterTelemetryEvents` builder.
- [ ] Emit telemetry inline with `IgniterConnectorsTelemetryEvents.get.key(...)` for all operations.
- [ ] Add `telemetry/index` to `tsup` entry and export `@igniter-js/connectors/telemetry`.

## 4) Server-only shim
- [ ] Remove `server-only` dependency and add `src/shim.ts` with server-only guard.
- [ ] Register shim in `package.json` exports + `browser` map.

## 5) Adapters + mocking
- [ ] Add `MockConnectorsAdapter` (call tracking + in-memory store) with tests.
- [ ] Ensure only `@igniter-js/connectors/adapters` subpath export.

## 6) Utils + types
- [ ] Ensure all utils are static classes and fully tested.
- [ ] Move helper types out of class files into `src/types/*`.
- [ ] Normalize type prefixes and ensure `IIgniterConnectorsManager` interface.

## 7) Logging + hooks
- [ ] Ensure `.withLogger(IgniterLogger)` exists and logs start/success/error for public operations.
- [ ] Logs must match telemetry events and avoid PII.

## 8) Barrel files + exports
- [ ] Rebuild `src/index.ts`, `src/builders/index.ts`, `src/core/index.ts`, `src/adapters/index.ts`, `src/utils/index.ts`, `src/types/index.ts` with section comments.
- [ ] Prefer `export *` + `export type *` unless conflicts force named exports.

## 9) Tests + type inference
- [ ] Add `expectTypeOf` inference tests for builder and connector hooks.
- [ ] Add telemetry tests with one `it` per event (attribute assertions included).
- [ ] Ensure coverage for `/utils`, `/core`, `/builders`, `/adapters` using Zod v4.
- [ ] Run tests and report failures before changing implementation.

## 10) Docs + TSDoc
- [ ] Update all TSDoc blocks to align with new APIs.
- [ ] Refresh `README.md` + `AGENTS.md` to reflect new structure and entrypoint.

## 11) Build + exports verification
- [ ] Align `package.json` exports with mail/store (`.mjs` import, shim mapping, telemetry/adapters subpaths).
- [ ] Run `npm run build`, `npm run test`, `npm run typecheck` and confirm dist matches exports.
