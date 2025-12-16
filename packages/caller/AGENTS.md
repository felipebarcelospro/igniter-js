# @igniter-js/caller - AI Agent Instructions

> **Package Version:** 0.1.0  
> **Last Updated:** 2025-12-14  
> **Status:** Ready for Publication

---

## Package Overview

**Name:** `@igniter-js/caller`  
**Purpose:** Type-safe HTTP client for Igniter.js with interceptors, retries, caching, and schema validation  
**Type:** Standalone Library (can be used independently or alongside Igniter.js)

### Core Features

- Fluent request builder API (`api.get('/users').execute()`)
- axios-style requests (`api.request({ method, url, body })`)
- Auto content-type detection (JSON, XML, Blob, Stream, etc.)
- Request and response interceptors
- Retry support (linear/exponential backoff + status-based retries)
- Caching (in-memory + optional persistent store adapter)
- Global response events (observe responses across the app)
- Schema validation using `StandardSchemaV1` from `@igniter-js/core`
- Optional Zod response validation via `responseType(zodSchema)`
- Auto-conversion of GET body to query params

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
   - Works in Node.js (18+), Bun, Deno, and modern browsers.

2. **Auto content-type detection**
   - Response parsing is automatic based on `Content-Type` header.
   - JSON, XML, CSV → parsed and validated if schema provided.
   - Blob, Stream, ArrayBuffer → returned as-is, no validation.

3. **Typed error surface**
   - Predictable errors are `IgniterCallerError` with stable error codes.

4. **Separation of concerns**
   - `IgniterCallerRequestBuilder` focuses on request composition and execution.
   - `IgniterCallerCacheUtils` focuses on caching.
   - `IgniterCallerSchemaUtils` focuses on schema matching and validation.

5. **Stable public API**
   - Keep exports in `src/index.ts` stable and backwards-compatible.

---

## API Design

### HTTP Methods

HTTP methods accept an optional URL directly and return a builder **without** the `.method()` function (since method is already set):

```typescript
// These are equivalent:
api.get('/users').execute()
api.get().url('/users').execute()

// POST, PUT, PATCH, DELETE, HEAD work the same way:
api.post('/users').body({ name: 'John' }).execute()
api.delete('/users/1').execute()
```

### axios-style Requests

The `.request()` method executes immediately with all options:

```typescript
const result = await api.request({
  method: 'POST',
  url: '/users',
  body: { name: 'John' },
  headers: { 'X-Custom': 'value' },
  timeout: 5000,
  staleTime: 30000,
  retry: { maxAttempts: 3 },
})
```

### Response Type Detection

Response is parsed automatically based on `Content-Type` header:

| Content-Type | Parsed As |
|-------------|-----------|
| `application/json` | JSON object |
| `text/xml`, `application/xml` | Text |
| `text/csv` | Text |
| `text/html`, `text/plain` | Text |
| `image/*`, `audio/*`, `video/*` | Blob |
| `application/octet-stream` | Blob |

### GET Body → Query Params

Body in GET/HEAD requests is automatically converted to query params:

```typescript
api.get('/search').body({ q: 'test', page: 1 }).execute()
// → GET /search?q=test&page=1
```

---

## CLI Integration

- The Igniter CLI provides `igniter generate caller` to ingest an OpenAPI 3 spec (URL or file) and emit `schema.ts` + `index.ts` under `src/callers/<hostname>` by default.
- Generated schemas must follow `IgniterCallerSchemaMap` (`{ [path]: { METHOD: { request?: ..., responses: { <status>: zod } } } }`) to work with `.withSchemas()`.
- The CLI prefixes schemas and the exported caller with `--name` (e.g., `facebookCaller`, `FacebookSchema`).
- If runtime schema expectations change, update both the CLI generator and this documentation so consumers stay aligned.

---

## File Structure

```
packages/caller/
├── src/
│   ├── index.ts                           # Public exports
│   ├── igniter-caller.spec.ts             # Tests
│   ├── core/
│   │   ├── igniter-caller.ts              # Main IgniterCaller class
│   │   └── igniter-caller-events.ts       # Event emitter
│   ├── builder/
│   │   ├── igniter-caller.builder.ts      # Builder for configuration
│   │   └── igniter-caller-request.builder.ts  # Request builder
│   ├── errors/
│   │   └── igniter-caller.error.ts        # Error class
│   ├── types/
│   │   ├── events.ts
│   │   ├── http.ts
│   │   ├── interceptors.ts
│   │   ├── request.ts
│   │   ├── response.ts
│   │   ├── retry.ts
│   │   ├── schemas.ts
│   │   └── store.ts
│   └── utils/
│       ├── body.ts
│       ├── cache.ts
│       ├── schema.ts
│       ├── testing.ts
│       └── url.ts
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

### Error Codes

| Code | Description |
|------|-------------|
| `IGNITER_CALLER_HTTP_ERROR` | HTTP response with non-2xx status |
| `IGNITER_CALLER_TIMEOUT` | Request timeout |
| `IGNITER_CALLER_REQUEST_VALIDATION_FAILED` | Request body schema validation failed |
| `IGNITER_CALLER_RESPONSE_VALIDATION_FAILED` | Response schema validation failed |
| `IGNITER_CALLER_UNKNOWN_ERROR` | Unexpected error |

### Dependencies

- `@igniter-js/core` is a **peer dependency** (for shared types like `IgniterLogger` and `StandardSchemaV1`).
- `zod` is a **peer dependency** (used when consumers call `responseType(zodSchema)`).

---

## Testing Strategy

- Mock `globalThis.fetch` for request execution tests.
- Prefer tests that validate:
  - Request schema validation (strict mode) blocks the network call.
  - Response schema validation returns `IgniterCallerError` on invalid payload.
  - Caching returns cached data without calling `fetch` again.
  - Event emission happens for responses.
  - URL is passed correctly to HTTP methods.
  - Body is converted to query params for GET requests.
  - Content-type detection works correctly.

Run tests:

```bash
npm test --filter @igniter-js/caller
```

---

## Key Implementation Details

### IgniterCallerMethodRequestBuilder

When using specific HTTP methods (get, post, etc.), the builder returns a type that omits internal methods:

```typescript
export type IgniterCallerMethodRequestBuilder<TResponse = unknown> = Omit<
  IgniterCallerRequestBuilder<TResponse>,
  '_setMethod' | '_setUrl'
>
```

This prevents calling `.method()` on a request that already has a method set.

### Content-Type Detection

The `detectContentType` function maps headers to response types:

```typescript
function detectContentType(contentType: string | null): IgniterCallerResponseContentType
```

Returns one of: `'json' | 'xml' | 'csv' | 'text' | 'html' | 'blob' | 'stream' | 'arraybuffer' | 'formdata'`

### Schema Validation

Schema validation only runs for validatable content types:

```typescript
const VALIDATABLE_CONTENT_TYPES = ['json', 'xml', 'csv']
```

Binary responses (Blob, Stream, ArrayBuffer) are never validated.

---

## Publishing Checklist

- [ ] `npm run build --filter @igniter-js/caller`
- [ ] `npm test --filter @igniter-js/caller`
- [ ] `npm run typecheck --filter @igniter-js/caller`
- [ ] `npm run lint --filter @igniter-js/caller`
- [ ] README and CHANGELOG are up-to-date

**Version policy:** never bump versions without user approval.
