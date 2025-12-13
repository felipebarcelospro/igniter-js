# @igniter-js/caller - AI Agent Instructions

> **Package Version:** 0.1.0  
> **Last Updated:** 2025-12-13  
> **Status:** Ready for Publication

---

## Package Overview

**Name:** `@igniter-js/caller`  
**Purpose:** Type-safe HTTP client for Igniter.js with interceptors, retries, caching, and schema validation  
**Type:** Standalone Library (can be used independently or alongside Igniter.js)

### Core Features

- Fluent request builder API (`IgniterCaller.create()` + `.get()/.post()/.request()`)
- Request and response interceptors
- Retry support (linear/exponential backoff + status-based retries)
- Caching (in-memory + optional persistent store adapter)
- Global response events (observe responses across the app)
- Schema validation using `StandardSchemaV1` from `@igniter-js/core`
- Optional Zod response validation via `responseType(zodSchema)`

---

## Architecture

This package is intentionally small and split into predictable layers:

- **Core runtime**: `src/core/igniter-caller.ts`
- **Builders**: `src/builder/*`
- **Types**: `src/types/*`
- **Errors**: `src/errors/*`
- **Utilities**: `src/utils/*`

### Design Principles

1. **Fetch-first**
   - Uses the global `fetch` API.
   - Works in Node.js (18+), Bun, and modern runtimes.

2. **Typed error surface**
   - Predictable errors are `IgniterCallerError` with stable error codes.

3. **Separation of concerns**
   - `IgniterCallerRequestBuilder` focuses on request composition and execution.
   - `IgniterCallerCacheUtils` focuses on caching.
   - `IgniterCallerSchemaUtils` focuses on schema matching and validation.

4. **Stable public API**
   - Keep exports in `src/index.ts` stable and backwards-compatible.

---

## File Structure

```
packages/caller/
├── src/
│   ├── index.ts
│   ├── core/
│   ├── builder/
│   ├── errors/
│   ├── types/
│   └── utils/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── CHANGELOG.md
└── AGENTS.md
```

---

## Development Guidelines

### Adding features

- If it changes the runtime behavior of request execution, prefer implementing inside `IgniterCallerRequestBuilder`.
- If it changes caching behavior, prefer implementing in `IgniterCallerCacheUtils`.
- If it changes schema matching/validation, implement in `IgniterCallerSchemaUtils`.
- Keep new public options discoverable from the builder API.

### Error handling

- Use `IgniterCallerError` for predictable failures.
- Prefer stable `code` values over new ad-hoc error messages.

### Dependencies

- `@igniter-js/core` is a **peer dependency** (for shared types like `IgniterError` and `StandardSchemaV1`).
- `zod` is a **peer dependency** (used when consumers call `responseType(zodSchema)` and referenced in public types).

---

## Testing Strategy

- Mock `globalThis.fetch` for request execution tests.
- Prefer tests that validate:
  - Request schema validation (strict mode) blocks the network call.
  - Response schema validation returns `IgniterCallerError` on invalid payload.
  - Caching returns cached data without calling `fetch` again.
  - Event emission happens for responses.

Run tests:

```bash
npm test --filter @igniter-js/caller
```

---

## Publishing Checklist

- [ ] `npm run build --filter @igniter-js/caller`
- [ ] `npm test --filter @igniter-js/caller`
- [ ] `npm run typecheck --filter @igniter-js/caller`
- [ ] `npm run lint --filter @igniter-js/caller`
- [ ] README and CHANGELOG are up-to-date

**Version policy:** never bump versions without user approval.
