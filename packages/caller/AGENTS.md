# AGENTS.md - @igniter-js/caller

> **Last Updated:** 2025-12-23  
> **Version:** 0.1.3  
> **Goal:** Complete operational manual for Code Agents maintaining and developing the HTTP client package.

---

## 1. Package Vision & Context

### 1.1 Purpose and Problem Statement

`@igniter-js/caller` is the type-safe HTTP client for the Igniter.js ecosystem. It solves the fundamental problem of making API calls in modern JavaScript applications with full end-to-end type safety, observability, and developer experience.

**Core Problems Solved:**

1. **Type Safety Gap:** Most HTTP libraries require manual type definitions for requests and responses, leading to drift between API contracts and implementation.

2. **Observability Silos:** HTTP requests are often "black boxes" in application monitoring, making debugging production issues difficult.

3. **Caching Complexity:** Implementing caching for HTTP responses requires significant boilerplate and careful synchronization.

4. **Retry Logic Reinvention:** Every application reimplements retry strategies for transient failures.

5. **Schema Validation Overhead:** Integrating runtime schema validation (Zod, Valibot, etc.) requires custom middleware.

### 1.2 Design Philosophy

The package follows these core principles:

- **Fetch-First:** Uses the global `fetch` API, working seamlessly in Node.js 18+, Bun, Deno, and modern browsers without polyfills.

- **Type-Safety by Default:** Leverages TypeScript's type system to infer request bodies, path parameters, and response types from schema definitions.

- **Observability Built-In:** Telemetry and logging are integrated from the ground up, not bolted on later.

- **Immutability First:** Builders use the immutable state pattern, preventing accidental mutation during request construction.

- **Schema Agnostic:** Supports any `StandardSchemaV1` implementation (Zod v4+, Valibot, ArkType, etc.).

- **Zero Runtime Dependency:** No external HTTP libraries—just `fetch` and `AbortController`.

### 1.3 Position in Igniter.js Ecosystem

`@igniter-js/caller` is a standalone library that can be used independently or alongside other Igniter.js packages. It integrates with:

- **`@igniter-js/core`:** Uses `IgniterError` base class, `IgniterLogger` interface, and `StandardSchemaV1` type.

- **`@igniter-js/telemetry`:** Emits structured telemetry events for request lifecycle monitoring.

- **`@igniter-js/store`:** (Optional) Can use Igniter Store adapters for persistent caching.

### 1.4 Client-Safe Design

Unlike most Igniter.js packages, `@igniter-js/caller` is **explicitly designed to work in both server and client environments**. It does NOT have a server-only shim because HTTP clients are a valid use case for browser applications.

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

The source code is organized into clear functional domains. This section maps every file and folder to its responsibility.

```
packages/caller/src/
├── index.ts                    # Main entry point barrel
├── builders/                   # Builder pattern implementations
│   ├── index.ts               # Builder exports barrel
│   ├── main.builder.ts         # IgniterCallerBuilder (package initializer)
│   ├── main.builder.spec.ts    # Builder type inference tests
│   ├── request.builder.ts      # IgniterCallerRequestBuilder (request lifecycle)
│   ├── schema.builder.ts       # IgniterCallerSchema (schema registry builder)
│   ├── schema.builder.spec.ts  # Schema builder tests
│   └── schema-path.builder.ts # IgniterCallerSchemaPathBuilder (path+methods)
├── core/                      # Runtime execution layer
│   ├── index.ts               # Core exports barrel
│   ├── manager.ts             # IgniterCallerManager (HTTP client runtime)
│   ├── manager.spec.ts        # Manager runtime tests
│   └── events.ts             # IgniterCallerEvents (global event emitter)
├── errors/                    # Error handling
│   ├── index.ts               # Error exports barrel
│   └── caller.error.ts        # IgniterCallerError class
├── telemetry/                 # Telemetry definitions
│   └── index.ts              # IgniterCallerTelemetryEvents registry
├── types/                     # Type definitions (pure contracts)
│   ├── index.ts               # Type exports barrel
│   ├── builder.ts             # Builder state and params types
│   ├── events.ts              # Event callback and pattern types
│   ├── http.ts               # HTTP method constants
│   ├── infer.ts              # Type inference helpers
│   ├── interceptors.ts        # Request/response interceptor types
│   ├── manager.ts            # Manager interface contract
│   ├── request.ts            # Request configuration types
│   ├── response.ts           # Response and content type types
│   ├── retry.ts             # Retry configuration types
│   ├── schema-builder.ts     # Schema builder helper types
│   ├── schemas.ts           # Schema map and endpoint types
│   └── store.ts             # Store adapter types
└── utils/                     # Utility functions
    ├── index.ts               # Utility exports barrel
    ├── body.ts               # Body normalization utilities
    ├── body.spec.ts          # Body utility tests
    ├── cache.ts              # Cache utilities (in-memory + store)
    ├── cache.spec.ts         # Cache utility tests
    ├── schema.ts             # Schema matching and validation
    ├── schema.spec.ts        # Schema utility tests
    ├── testing.ts            # Testing helpers
    ├── testing.spec.ts       # Testing utility tests
    ├── url.ts               # URL construction utilities
    └── url.spec.ts          # URL utility tests
```

#### 2.1 Builders Directory (`src/builders/`)

**Purpose:** Implements the fluent builder pattern for configuration and request construction.

| File                     | Responsibility                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `main.builder.ts`        | `IgniterCallerBuilder` class - package initialization with immutable state accumulation. Handles baseURL, headers, cookies, interceptors, store, schemas, and telemetry configuration.     |
| `request.builder.ts`     | `IgniterCallerRequestBuilder` class - per-request builder. Manages request lifecycle including URL, body, params, headers, timeout, cache, retry, fallback, and response type.             |
| `schema.builder.ts`      | `IgniterCallerSchema` class - schema registry builder with `$Infer` type helpers and `get` runtime helpers. Prevents duplicate keys and paths.                                             |
| `schema-path.builder.ts` | `IgniterCallerSchemaPathBuilder` class - path-first fluent API for defining HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD) on a path. Provides `ref()` helper for registry references. |

#### 2.2 Core Directory (`src/core/`)

**Purpose:** Runtime execution and event handling.

| File         | Responsibility                                                                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manager.ts` | `IgniterCallerManager` class - the main HTTP client runtime. Creates request builders, executes direct requests, manages global event emission, and provides static methods for cache invalidation and batch requests. |
| `events.ts`  | `IgniterCallerEvents` class - global event emitter supporting exact URL matches and RegExp patterns. Handles listener registration, cleanup, and error-safe emission.                                                  |

#### 2.3 Types Directory (`src/types/`)

**Purpose:** Pure TypeScript contracts—no implementation code.

| File                | Responsibility                                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `builder.ts`        | `IgniterCallerBuilderState` (builder state), `IgniterCallerRequestBuilderParams` (request builder constructor params), `IgniterCallerMethodRequestBuilder` (public builder type).                                                                                                                                                                                    |
| `events.ts`         | `IgniterCallerEventCallback` (listener signature), `IgniterCallerUrlPattern` (string or RegExp).                                                                                                                                                                                                                                                                     |
| `http.ts`           | `IgniterCallerHttpMethod` union type.                                                                                                                                                                                                                                                                                                                                |
| `infer.ts`          | Type inference helpers: `InferSuccessResponse`, `GetEndpoint`, `InferResponse`, `TypedRequestBuilder`.                                                                                                                                                                                                                                                               |
| `interceptors.ts`   | `IgniterCallerRequestInterceptor`, `IgniterCallerResponseInterceptor`.                                                                                                                                                                                                                                                                                               |
| `manager.ts`        | `IIgniterCallerManager` interface - public contract for the manager.                                                                                                                                                                                                                                                                                                 |
| `request.ts`        | `IgniterCallerBaseRequestOptions`, `IgniterCallerRequestOptions`, `IgniterCallerDirectRequestOptions`.                                                                                                                                                                                                                                                               |
| `response.ts`       | `IgniterCallerApiResponse<T>`, `IgniterCallerFileResponse`, `IgniterCallerResponseContentType`, `IgniterCallerValidatableContentType`, `IgniterCallerResponseMarker`.                                                                                                                                                                                                |
| `retry.ts`          | `IgniterCallerRetryOptions`.                                                                                                                                                                                                                                                                                                                                         |
| `schema-builder.ts` | Complex types for schema builder: `IgniterCallerSchemaRegistry`, `IgniterCallerSchemaEndpointConfig`, schema wrapper types (`SchemaArray`, `SchemaNullable`, `SchemaOptional`, `SchemaRecord`), inference helpers (`IgniterCallerSchemaInfer`, `IgniterCallerSchemaGetters`), build result type.                                                                     |
| `schemas.ts`        | Core schema types: `IgniterCallerSchemaMethod`, `IgniterCallerEndpointSchema`, `IgniterCallerSchemaMap`, path extraction types (`ExtractPathParams`), inference types (`InferRequestType`, `InferResponseType`, `InferSuccessResponseType`, `InferAllResponseTypes`), path filtering types (`GetPaths`, `PostPaths`, etc.), endpoint info types, validation options. |
| `store.ts`          | `IgniterCallerStoreAdapter<TClient>`, `IgniterCallerStoreOptions`.                                                                                                                                                                                                                                                                                                   |

#### 2.4 Utils Directory (`src/utils/`)

**Purpose:** Pure functions for specific operations.

| File         | Responsibility                                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `body.ts`    | `IgniterCallerBodyUtils` - detects raw body types (FormData, Blob, ArrayBuffer, etc.), normalizes headers for FormData (removes Content-Type).                                                                                |
| `cache.ts"   | `IgniterCallerCacheUtils` - in-memory Map-based cache with optional store adapter fallback. Handles get/set/clear with TTL and glob pattern invalidation.                                                                     |
| `schema.ts`  | `IgniterCallerSchemaUtils` - path matching with param extraction (`matchPath`), schema lookup (`findSchema`), StandardSchemaV1 validation (`validateWithStandardSchema`), request/response validation with strict/soft modes. |
| `testing.ts` | Testing helpers for mocking and assertions.                                                                                                                                                                                   |
| `url.ts`     | `IgniterCallerUrlUtils` - builds full URLs with base URL concatenation and query parameter encoding using `URLSearchParams`.                                                                                                  |

---

### 3. Architecture Deep-Dive

The package follows a **Builder → Manager → Request Builder → Execution** pattern with immutable state accumulation throughout.

#### 3.1 Architectural Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Surface                              │
│  IgniterCaller.create().withX().build()                         │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Builder Layer                                 │
│  IgniterCallerBuilder (Immutable State Accumulation)               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ State:                                                   │   │
│  │  - baseURL, headers, cookies                              │   │
│  │  - requestInterceptors, responseInterceptors                 │   │
│  │  - store, storeOptions                                     │   │
│  │  - schemas, schemaValidation                               │   │
│  │  - logger, telemetry                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────────────┘
                         │ .build()
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Manager Layer                                  │
│  IgniterCallerManager (Runtime)                                │
│  - get/post/put/patch/delete/head() methods                   │
│  - request() method (axios-style)                              │
│  - Static methods: batch(), on(), off(), invalidate()          │
│  - Global event emission via IgniterCallerEvents                │
└────────────────────────┬────────────────────────────────────────────────┘
                         │ Creates
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Request Builder Layer                               │
│  IgniterCallerRequestBuilder (Per-Request Configuration)         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Configuration:                                           │   │
│  │  - url, method, body, params                           │   │
│  │  - headers (merged with defaults)                         │   │
│  │  - timeout, cache, staleTime                             │   │
│  │  - retry options                                         │   │
│  │  - fallback function                                     │   │
│  │  - responseType (schema or type marker)                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────────────┘
                         │ .execute()
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Execution Layer (Internal)                           │
│  1. Cache Check (if staleTime set)                            │
│  2. Request Interceptor Chain                                 │
│  3. Request Body Validation (if schema configured)               │
│  4. Fetch with Retry Logic                                    │
│  5. Response Parsing (Content-Type auto-detect)                │
│  6. Response Validation (if schema configured)                 │
│  7. Response Interceptor Chain                                 │
│  8. Cache Store (if successful)                               │
│  9. Fallback (if failed and fallback set)                     │
│  10. Telemetry Emission                                      │
│  11. Global Event Emission                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.2 Immutable State Pattern

The `IgniterCallerBuilder` implements strict immutability:

```typescript
// ✅ CORRECT: Each with* method returns new instance
.withBaseUrl(url)         // returns new IgniterCallerBuilder<TSchemas>
.withHeaders(headers)      // returns new IgniterCallerBuilder<TSchemas>
.withSchemas(schemas)    // returns new IgniterCallerBuilder<TNewSchemas>

// ❌ INCORRECT: Mutating state is impossible
// The constructor is private, and all methods return new instances.
```

This ensures that builder instances can be reused safely and that configuration changes don't affect previously built managers.

#### 3.3 Schema Builder Architecture

The schema builder uses a **two-phase registry system**:

1. **Registry Phase:** Reusable schemas are registered via `.schema(key, schema)`. This allows referencing schemas multiple times across endpoints.

2. **Path Phase:** Endpoints are defined via `.path(path, builder)` with method-specific configurations.

The `.ref(key)` helper provides:

- `schema` - direct reference to registered schema
- `array()` - wraps in Zod array
- `nullable()` - wraps in Zod nullable
- `optional()` - wraps in Zod optional
- `record()` - wraps in Zod record

After `.build()`, the result includes:

- `$Infer` - Type-level inference helpers (Path, Endpoint, Request, Response, Responses, Schema)
- `get` - Runtime helpers (path, endpoint, request, response, schema)

#### 3.4 Event System Architecture

The `IgniterCallerEvents` class manages a dual-listener system:

- **Exact Match Listeners:** Stored in `Map<string, Set<Callback>>` for URL string patterns.
- **Pattern Listeners:** Stored in `Map<RegExp, Set<Callback>>` for RegExp patterns.

Emission flow:

1. Emit event with URL and result
2. Check all exact match listeners for the URL
3. Check all pattern listeners - execute if RegExp matches
4. All listeners are called with the result and a context object (url, method, timestamp)

The event system is static on `IgniterCallerManager`, enabling global observation across all manager instances.

---

### 4. Operational Flow Mapping (Pipelines)

This section provides step-by-step flow documentation for every public method.

#### 4.1 Method: `IgniterCallerBuilder.withBaseUrl(url)`

**Purpose:** Sets the base URL prefix for all requests.

**Flow:**

1. **Input Validation:** None (string is accepted directly).
2. **State Copy:** Creates new `IgniterCallerBuilder` instance with `...this.state, baseURL: url`.
3. **Return:** Returns the new builder instance.

**Telemetry Emitted:** None (builder methods don't emit telemetry).

**Logging:** None (builder methods don't log).

---

#### 4.2 Method: `IgniterCallerBuilder.withHeaders(headers)`

**Purpose:** Merges default headers into every request.

**Flow:**

1. **Input Validation:** None (Record<string, string> accepted).
2. **State Merge:** Creates new builder with merged headers (shallow merge).
3. **Return:** Returns new builder instance.

**Note:** Headers are merged shallow—nested objects are not deeply merged.

---

#### 4.3 Method: `IgniterCallerBuilder.withCookies(cookies)`

**Purpose:** Sets default cookies sent as the `Cookie` header.

**Flow:**

1. **Input Validation:** None.
2. **State Copy:** Creates new builder with `cookies` property.
3. **Return:** Returns new builder instance.

**Runtime Behavior:** During request construction, cookies are serialized to `key=value; key2=value2` format and set in the `Cookie` header.

---

#### 4.4 Method: `IgniterCallerBuilder.withLogger(logger)`

**Purpose:** Attaches an `IgniterLogger` instance for request lifecycle logging.

**Flow:**

1. **Input Validation:** None (must implement `IgniterLogger` interface).
2. **State Copy:** Creates new builder with `logger` property.
3. **Return:** Returns new builder instance.

**Logging Behavior:**

- Request started: `debug` with method, url, baseURL
- Request success: `info` with method, url, durationMs, status
- Request failed: `error` with method, url, durationMs, error

---

#### 4.5 Method: `IgniterCallerBuilder.withRequestInterceptor(interceptor)`

**Purpose:** Adds a function that modifies request options before execution.

**Flow:**

1. **Input Validation:** None (must be callable with correct signature).
2. **Array Accumulation:** Appends to existing `requestInterceptors` array.
3. **State Copy:** Creates new builder with updated array.
4. **Return:** Returns new builder instance.

**Execution Order:** Interceptors run in the order they were registered (FIFO).

---

#### 4.6 Method: `IgniterCallerBuilder.withResponseInterceptor(interceptor)`

**Purpose:** Adds a function that transforms responses after execution.

**Flow:**

1. **Input Validation:** None.
2. **Array Accumulation:** Appends to existing `responseInterceptors` array.
3. **State Copy:** Creates new builder with updated array.
4. **Return:** Returns new builder instance.

**Execution Order:** Interceptors run in the order they were registered (FIFO).

---

#### 4.7 Method: `IgniterCallerBuilder.withStore(store, options)`

**Purpose:** Configures a persistent store adapter for caching (e.g., Redis).

**Flow:**

1. **Input Validation:** None.
2. **State Copy:** Creates new builder with `store` and `storeOptions` properties.
3. **Return:** Returns new builder instance.

**Runtime Behavior:**

- On `build()`: Calls `IgniterCallerCacheUtils.setStore(store, options)`
- Store operations fallback to in-memory cache on failure

---

#### 4.8 Method: `IgniterCallerBuilder.withSchemas(schemas, validation)`

**Purpose:** Configures schema-based type safety and runtime validation.

**Flow:**

1. **Input Validation:** Type-level validation ensures schemas conform to `IgniterCallerSchemaInput`.
2. **State Copy:** Creates new builder with `schemas` and `schemaValidation` properties.
3. **Type Narrowing:** Returns builder narrowed to new schema map type `IgniterCallerSchemaMapFrom<TNewSchemas>`.
4. **Return:** Returns typed builder instance.

**Validation Options:**

- `mode`: `'strict'` (throw on failure), `'soft'` (log and continue), `'off'` (skip)
- `onValidationError`: Custom error handler callback

---

#### 4.9 Method: `IgniterCallerBuilder.withTelemetry(telemetry)`

**Purpose:** Attaches `IgniterTelemetryManager` for request observability.

**Flow:**

1. **Input Validation:** None.
2. **State Copy:** Creates new builder with `telemetry` property.
3. **Return:** Returns new builder instance.

**Telemetry Emitted:**

- `request.execute.started`
- `request.execute.success`
- `request.execute.error`
- `request.timeout.error`
- `cache.read.hit`
- `retry.attempt.started`
- `validation.request.error`
- `validation.response.error`

---

#### 4.10 Method: `IgniterCallerBuilder.build()`

**Purpose:** Creates the `IgniterCallerManager` instance.

**Flow:**

1. **Store Configuration:** If `this.state.store` is set, calls `IgniterCallerCacheUtils.setStore()`.
2. **Manager Instantiation:** Creates `new IgniterCallerManager(this.state.baseURL, { ...config })`.
3. **Initialization Logging:** Logs manager creation with metadata (baseURL, hasTelemetry, hasStore, hasSchemas).
4. **Return:** Returns manager instance.

---

#### 4.11 Method: `IgniterCallerManager.get(url)` and similar HTTP methods

**Purpose:** Creates a typed request builder for a specific HTTP method.

**Flow:**

1. **Builder Params Creation:** Calls `createBuilderParams()` to extract shared configuration (baseURL, headers, cookies, logger, telemetry, interceptors, eventEmitter, schemas, validation).
2. **Request Builder Instantiation:** Creates `new IgniterCallerRequestBuilder(params)`.
3. **Method Assignment:** Calls `_setMethod('GET')` (internal method).
4. **URL Assignment:** If URL is provided, calls `_setUrl(url)`.
5. **Type Narrowing:**
   - If URL matches a schema path, returns `TypedRequestBuilder` with inferred types
   - Otherwise, returns `IgniterCallerTypedRequestBuilder` with generic response type
6. **Return:** Returns typed request builder.

**Type Inference:**

- When URL matches a schema path, `TypedRequestBuilder` provides typed `body()` and `params()` methods.
- Response type is inferred from the schema's success status (200 or 201).

---

#### 4.12 Method: `IgniterCallerManager.request(options)`

**Purpose:** Executes a request directly with all options in one object (axios-style).

**Flow:**

1. **Builder Instantiation:** Creates `new IgniterCallerRequestBuilder(params)` with merged headers.
2. **Method Assignment:** Calls `_setMethod(options.method)`.
3. **URL Assignment:** Calls `_setUrl(options.url)`.
4. **Body Assignment:** If `options.body` is provided, calls `body(options.body)`.
5. **Params Assignment:** If `options.params` is provided, calls `params(options.params)`.
6. **Timeout Assignment:** If `options.timeout` is provided, calls `timeout(options.timeout)`.
7. **Cache Assignment:** If `options.cache` is provided, calls `cache(options.cache, options.cacheKey)`.
8. **Stale Time Assignment:** If `options.staleTime` is provided, calls `stale(options.staleTime)`.
9. **Retry Assignment:** If `options.retry` is provided, calls `retry(options.retry.maxAttempts, options.retry)`.
10. **Fallback Assignment:** If `options.fallback` is provided, calls `fallback(options.fallback)`.
11. **Response Schema Assignment:** If `options.responseSchema` is provided, calls `responseType(options.responseSchema)`.
12. **Execution:** Calls `execute()`.
13. **Return:** Returns `Promise<IgniterCallerApiResponse<T>>`.

---

#### 4.13 Method: `IgniterCallerRequestBuilder.execute()`

**Purpose:** Executes the HTTP request with full lifecycle management.

**Flow:**

1. **Telemetry (Started):** Emits `request.execute.started` with method, url, baseURL, timeoutMs.
2. **Logging (Started):** Logs request started at debug level.
3. **Cache Check:**
   - Determines effective cache key (provided key or URL).
   - If `staleTime` is set, calls `IgniterCallerCacheUtils.get()`.
   - If cache hit: emits `cache.read.hit`, returns cached result immediately with success telemetry.
4. **Retry Loop:**
   - For attempt = 0 to maxAttempts-1:
     - If attempt > 0: calculate delay (linear or exponential), emit `retry.attempt.started`, wait for delay.
     - Call `executeSingleRequest()`.
     - If success: return result.
     - If error is retryable (status code in `retryOnStatus`): continue loop.
     - Otherwise: break and return error result.
5. **Fallback:**
   - If request failed and `fallbackFn` is set:
     - Return result with fallback value as data.
     - Emit success telemetry with `ctx.request.fallback: true`.
6. **Cache Store:**
   - If request succeeded and `effectiveCacheKey` is set:
     - Call `IgniterCallerCacheUtils.set()` with data and staleTime.
7. **Telemetry (Result):**
   - If error: emit `request.execute.error` with error details.
   - If success: emit `request.execute.success` with duration, status, contentType, cache hit flag.
8. **Logging (Result):**
   - If error: log error with duration and error details.
   - If success: log success with duration and status.
9. **Global Event Emission:** Calls `eventEmitter(url, method, result)`.
10. **Return:** Returns `IgniterCallerApiResponse<TResponse>`.

---

#### 4.14 Method: `IgniterCallerRequestBuilder.executeSingleRequest()`

**Purpose:** Executes a single HTTP request attempt.

**Flow:**

1. **Request Building:** Calls `buildRequest()` to construct fetch options, AbortController, and timeout.
2. **URL Resolution:** Calls `resolveUrl()` to build final URL with query params and handle GET body → params conversion.
3. **Request Interceptors:**
   - If interceptors are configured, chain them in order.
   - Each interceptor receives and returns `IgniterCallerRequestOptions`.
   - Rebuilds request after interceptor chain.
4. **Request Validation:**
   - If schemas are configured and endpoint has request schema:
     - Call `IgniterCallerSchemaUtils.validateRequest()`.
     - If validation fails (strict mode): emit `validation.request.error`, return error result immediately.
5. **Fetch Execution:**
   - Call `fetch(url, { ...requestInit, signal: controller.signal })`.
6. **Timeout Handling:**
   - Clear timeout on response.
   - If `AbortError`: emit `request.timeout.error`, return timeout error result.
7. **HTTP Error Handling:**
   - If `!response.ok`: read error text, return HTTP error result with status.
8. **Content Type Detection:**
   - Call `detectContentType(response.headers.get('content-type'))`.
9. **Response Parsing:**
   - Call `parseResponseByContentType()` based on detected type (json, xml, csv, text, blob, stream, arraybuffer, formdata).
10. **Response Validation (Schema Map):**
    - If schemas are configured and endpoint has response schema for status code:
      - Call `IgniterCallerSchemaUtils.validateResponse()`.
      - If validation fails (strict mode): emit `validation.response.error`, return error result.
11. **Response Validation (responseType):**
    - If `responseTypeSchema` is set (Zod or StandardSchema):
      - Validate parsed response data.
      - If validation fails: emit `validation.response.error`, return error result.
12. **Response Interceptors:**
    - If interceptors are configured, chain them in order.
    - Each interceptor receives and returns `IgniterCallerApiResponse`.
13. **Return:** Returns `IgniterCallerApiResponse` with data, status, headers.

---

#### 4.15 Method: `IgniterCallerRequestBuilder.buildRequest()`

**Purpose:** Constructs fetch options, AbortController, and timeout.

**Flow:**

1. **URL Resolution:** Calls `resolveUrl()` to get final URL.
2. **Body Handling:**
   - For GET/HEAD: body is converted to query params in `resolveUrl()`, so body is excluded from fetch.
   - For other methods: body is included.
   - Check if body is raw (FormData, Blob, ArrayBuffer, etc.).
   - Normalize headers (remove Content-Type for FormData).
3. **Request Init Construction:**
   ```typescript
   const requestInit: RequestInit = {
     method,
     headers: finalHeaders,
     cache,
     ...(shouldIncludeBody
       ? { body: rawBody ? body : JSON.stringify(body) }
       : {}),
   };
   ```
4. **AbortController:** Create new `AbortController`.
5. **Timeout Setup:** Set `setTimeout(() => controller.abort(), timeout || 30000)`.
6. **Return:** Return `{ url, requestInit, controller, timeoutId }`.

---

#### 4.16 Method: `IgniterCallerRequestBuilder.resolveUrl()`

**Purpose:** Builds final URL with base URL and query parameters.

**Flow:**

1. **GET Body Conversion:**
   - If method is GET or HEAD and body is an object:
     - Convert body properties to query params.
     - Merge with existing params.
2. **Base URL Concatenation:**
   - If URL is not absolute (doesn't start with `http://` or `https://`) and baseURL is set:
     - Full URL = baseURL + url
   - Otherwise: Full URL = url
3. **Query Parameter Encoding:**
   - Use `URLSearchParams` to encode params.
   - Append to URL with `?` or `&` separator.
4. **Return:** Return `{ url: fullUrl, safeUrl: fullUrl.split('?')[0] }`.

---

#### 4.17 Method: `IgniterCallerManager.on(pattern, callback)`

**Purpose:** Registers a global event listener for API responses.

**Flow:**

1. **Listener Registration:**
   - If pattern is string: add to `listeners` Map under exact URL key.
   - If pattern is RegExp: add to `patternListeners` Map under RegExp key.
2. **Cleanup Function:**
   - Return a function that removes the specific callback from the listener set.
   - If no callbacks remain for the pattern, remove the pattern entry.
3. **Return:** Return cleanup function.

---

#### 4.18 Method: `IgniterCallerManager.invalidate(key)`

**Purpose:** Invalidates a specific cache entry.

**Flow:**

1. **Cache Clear:** Call `IgniterCallerCacheUtils.clear(key)`.
2. **Return:** Await cache clear completion.

---

#### 4.19 Method: `IgniterCallerManager.batch(requests)`

**Purpose:** Executes multiple requests in parallel.

**Flow:**

1. **Promise All:** Return `Promise.all(requests)`.
2. **Type Preservation:** Return typed array preserving individual result types.
3. **Return:** `Promise<{ [K in keyof T]: T[K] extends Promise<infer R> ? R : never }>`

---

### 5. Dependency & Type Graph

#### 5.1 External Dependencies

| Package                 | Purpose                                             | Peer Dependency                          |
| ----------------------- | --------------------------------------------------- | ---------------------------------------- |
| `@igniter-js/core`      | `IgniterError`, `IgniterLogger`, `StandardSchemaV1` | ✅ Required                              |
| `@igniter-js/telemetry` | `IgniterTelemetryManager`, `IgniterTelemetryEvents` | ⚙️ Optional                              |
| `zod`                   | Schema validation (v4+)                             | ⚙️ Optional (any StandardSchemaV1 works) |

#### 5.2 Internal Type Flow

```
IgniterCallerBuilderState<TSchemas>
         │
         ├─→ IgniterCallerBuilder<TSchemas>
         │         │
         │         └─→ build()
         │                  │
         │                  ▼
         │         IgniterCallerManager<TSchemas>
         │                  │
         │                  ├─→ createBuilderParams()
         │                  │        │
         │                  │        ▼
         │                  │   IgniterCallerRequestBuilderParams
         │                  │
         │                  ├─→ get/post/put/patch/delete/head()
         │                  │        │
         │                  │        ▼
         │                  │   TypedRequestBuilder<TSchemas, TPath, TMethod>
         │                  │        │
         │                  │        ├─→ body() / params() (typed from schema)
         │                  │        └─→ execute()
         │                  │                 │
         │                  │                 ▼
         │                  │         IgniterCallerApiResponse<TResponse>

IgniterCallerSchema<TSchemas, TRegistry>
         │
         ├─→ schema() → Registry accumulation
         │
         ├─→ path() → Path + methods accumulation
         │
         └─→ build() → IgniterCallerSchemaBuildResult
                   │
                   ├─→ $Infer (type helpers)
                   │        ├─→ Path
                   │        ├─→ Endpoint
                   │        ├─→ Request
                   │        ├─→ Response
                   │        ├─→ Responses
                   │        └─→ Schema
                   │
                   └─→ get (runtime helpers)
                            ├─→ path()
                            ├─→ endpoint()
                            ├─→ request()
                            ├─→ response()
                            └─→ schema()
```

#### 5.3 Schema Type Resolution Flow

```
IgniterCallerSchemaMap
         │
         ├─→ SchemaMapPaths<TSchemas> = keyof TSchemas
         │
         ├─→ GetPaths<TSchemas> = PathsForMethod<TSchemas, 'GET'>
         ├─→ PostPaths<TSchemas> = PathsForMethod<TSchemas, 'POST'>
         ├─→ PutPaths<TSchemas> = PathsForMethod<TSchemas, 'PUT'>
         ├─→ PatchPaths<TSchemas> = PathsForMethod<TSchemas, 'PATCH'>
         ├─→ DeletePaths<TSchemas> = PathsForMethod<TSchemas, 'DELETE'>
         ├─→ HeadPaths<TSchemas> = PathsForMethod<TSchemas, 'HEAD'>
         │
         ├─→ SchemaMapEndpoint<TSchemas, TPath, TMethod> = TSchemas[TPath][TMethod]
         │
         ├─→ SchemaMapRequestType<TSchemas, TPath, TMethod>
         │        (Infers from TSchemas[TPath][TMethod].request)
         │
         └─→ SchemaMapResponseType<TSchemas, TPath, TMethod, TStatus>
                  (Infers from TSchemas[TPath][TMethod].responses[TStatus])
```

---

### 6. Contribution Checklist

This section provides a step-by-step guide for making changes to the package.

#### 6.1 Adding a New Builder Configuration Option

1. **Define Type:** Add the new property to `IgniterCallerBuilderState` in `src/types/builder.ts`.
2. **Add Builder Method:** Implement `withNewOption(value)` in `src/builders/main.builder.ts` that returns a new builder instance.
3. **Update Constructor Params:** Add to `IgniterCallerRequestBuilderParams` in `src/types/builder.ts`.
4. **Update Manager:** Pass the new option to request builder params in `createBuilderParams()`.
5. **Write Tests:** Add type inference tests in `src/builders/main.builder.spec.ts`.
6. **Update Docs:** Add to this AGENTS.md and README.md.

#### 6.2 Adding a New HTTP Method

1. **Add to Type Union:** Add the method string to `IgniterCallerHttpMethod` in `src/types/http.ts`.
2. **Add to Schema Types:** Add to `IgniterCallerSchemaMethod` union and corresponding `XPaths` type in `src/types/schemas.ts`.
3. **Implement Manager Method:** Add method in `src/core/manager.ts` (e.g., `options(url)`).
4. **Update Schema Path Builder:** Add method in `src/builders/schema-path.builder.ts`.
5. **Update Interface:** Add method signature to `IIgniterCallerManager` in `src/types/manager.ts`.
6. **Write Tests:** Add tests in `src/core/manager.spec.ts`.
7. **Update Docs:** Add to API reference.

#### 6.3 Adding a New Telemetry Event

1. **Define Schema:** Add schema definition in `src/telemetry/index.ts` following naming conventions:
   - Attributes use `ctx.<domain>.<attribute>` format
   - Namespace is `igniter.caller.<group>.<event>`
2. **Add to Group:** Register event in the appropriate group (request, cache, retry, validation).
3. **Emit in Code:** Call `this.telemetry?.emit(IgniterCallerTelemetryEvents.get.key('group.event'), { ...attributes })`.
4. **Write Tests:** Add telemetry test in `src/core/manager.spec.ts` with attribute assertions.
5. **Update AGENTS.md:** Add to telemetry registry section.

#### 6.4 Adding a New Error Code

1. **Add to Union:** Add the error code string to `IgniterCallerErrorCode` in `src/errors/caller.error.ts`.
2. **Add to Operation Type:** If new operation, add to `IgniterCallerOperation` type.
3. **Throw Error:** Use `new IgniterCallerError({ code, operation, message, ... })`.
4. **Update AGENTS.md:** Add to error code library with context, cause, mitigation, solution.

#### 6.5 Adding a New Utility Function

1. **Implement Function:** Add to appropriate utility file in `src/utils/`.
2. **Export:** Add to `src/utils/index.ts` barrel.
3. **Write Tests:** Create `<utility>.spec.ts` in same directory with comprehensive coverage.
4. **Type Check:** Run `npm run typecheck`.
5. **Lint:** Run `npm run lint`.

---

### 7. Maintainer Troubleshooting

This section helps maintainers debug issues in the package code.

#### 7.1 Type Inference Not Working

**Symptoms:** Response type is `unknown` instead of inferred schema type.

**Causes:**

- Schema path uses full URL instead of relative path
- Schema map type is not properly const assertion
- Generic type parameters not propagating

**Debugging Steps:**

1. **Check Schema Path:** Ensure schema keys are relative paths (e.g., `'/users'`) not full URLs.
2. **Verify Const Assertion:** Ensure schema object has `as const` assertion.
3. **Check Generic Chain:** Verify `TSchemas` type parameter propagates through builder → manager → request builder.

**Example Fix:**

```typescript
// ❌ WRONG: Full URL in schema key
const schemas = {
  'https://api.test/users': { GET: { ... } }
} as const

// ✅ CORRECT: Relative path
const schemas = {
  '/users': { GET: { ... } }
} as const
```

---

#### 7.2 Cache Not Invalidating

**Symptoms:** Stale data returned after mutation.

**Causes:**

- Cache key doesn't match request URL
- Store adapter not configured correctly
- Pattern invalidation not supported by store

**Debugging Steps:**

1. **Check Cache Key:** Verify `effectiveCacheKey` in `execute()` method.
2. **Verify Store Configuration:** Ensure `withStore()` is called before `build()`.
3. **Check Pattern:** Pattern-based invalidation only works for in-memory cache.

---

#### 7.3 Telemetry Not Emitting

**Symptoms:** No telemetry events observed.

**Causes:**

- Telemetry manager not passed to builder
- Event key mismatch
- Telemetry not built into IgniterTelemetry

**Debugging Steps:**

1. **Verify Configuration:** Check `this.state.telemetry` in manager constructor.
2. **Check Event Key:** Verify `IgniterCallerTelemetryEvents.get.key('group.event')` matches defined event.
3. **Add Debug Log:** Add `console.log` before `this.telemetry?.emit()` to verify execution.

---

#### 7.4 Request Interceptors Not Running

**Symptoms:** Headers not being modified by interceptor.

**Causes:**

- Interceptor not added to builder
- Interceptor signature incorrect
- Interceptor chain not awaited

**Debugging Steps:**

1. **Check Builder State:** Verify `requestInterceptors` array in builder state.
2. **Verify Signature:** Ensure interceptor accepts and returns `IgniterCallerRequestOptions`.
3. **Check Async Handling:** Ensure interceptor chain uses `await`.

---

## II. CONSUMER GUIDE (Developer Manual)

### 8. Distribution Anatomy (Consumption)

The package is distributed as a standard npm package with multiple entry points.

#### 8.1 Package Structure

```
@igniter-js/caller/
├── dist/
│   ├── index.js              # CommonJS main entry
│   ├── index.mjs            # ESM main entry
│   ├── index.d.ts           # TypeScript definitions
│   ├── telemetry/
│   │   ├── index.js         # Telemetry definitions (CJS)
│   │   ├── index.mjs       # Telemetry definitions (ESM)
│   │   └── index.d.ts      # Telemetry type definitions
│   └── adapters/
│       ├── index.js         # Mock adapter (CJS)
│       ├── index.mjs       # Mock adapter (ESM)
│       └── index.d.ts      # Adapter type definitions
└── package.json
```

#### 8.2 Imports

```typescript
// Main entry - creates caller instances
import { IgniterCaller, IgniterCallerManager } from "@igniter-js/caller";

// Telemetry definitions - for observability setup
import { IgniterCallerTelemetryEvents } from "@igniter-js/caller/telemetry";

// Mock adapter - for testing
import { MockCallerStoreAdapter } from "@igniter-js/caller/adapters";

// Types - for extending or advanced usage
import type {
  IgniterCallerApiResponse,
  IgniterCallerRequestInterceptor,
  IgniterCallerRetryOptions,
} from "@igniter-js/caller";
```

#### 8.3 Runtime Support

| Runtime  | Version Required | Notes                                         |
| -------- | ---------------- | --------------------------------------------- |
| Node.js  | 18+              | Uses native `fetch` (undici)                  |
| Bun      | 1.0+             | Native `fetch` support                        |
| Deno     | 1.30+            | Native `fetch` support                        |
| Browsers | Modern (ES2020+) | Native `fetch` and `AbortController` required |

---

### 9. Quick Start & Common Patterns

#### 9.1 Basic Usage

```typescript
import { IgniterCaller } from "@igniter-js/caller";

const api = IgniterCaller.create()
  .withBaseUrl("https://api.example.com")
  .withHeaders({ Authorization: `Bearer ${token}` })
  .build();

const result = await api.get("/users").execute();

if (result.error) {
  console.error(result.error);
  throw result.error;
}

console.log(result.data);
```

#### 9.2 With Query Parameters

```typescript
const result = await api.get("/users").params({ page: 1, limit: 10 }).execute();
```

#### 9.3 With POST Body

```typescript
const result = await api
  .post("/users")
  .body({ name: "John Doe", email: "john@example.com" })
  .execute();
```

#### 9.4 With Caching

```typescript
const result = await api
  .get("/users")
  .stale(30_000) // Cache for 30 seconds
  .execute();
```

#### 9.5 With Retry

```typescript
const result = await api
  .get("/health")
  .retry(3, {
    baseDelay: 250,
    backoff: "exponential",
    retryOnStatus: [408, 429, 500, 502, 503, 504],
  })
  .execute();
```

---

### 10. Real-World Use Case Library

#### Case A: E-Commerce Product Catalog

**Scenario:** An e-commerce platform needs to fetch product listings with caching, type safety, and error handling.

```typescript
import { IgniterCaller } from "@igniter-js/caller";
import { z } from "zod";

// Define schemas
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  inStock: z.boolean(),
});

const ProductsResponseSchema = z.object({
  products: z.array(ProductSchema),
  total: z.number(),
});

const api = IgniterCaller.create()
  .withBaseUrl("https://shop-api.example.com")
  .build();

// Fetch products with caching (5 minutes)
async function getProducts(category?: string) {
  const result = await api
    .get("/products")
    .params(category ? { category } : {})
    .responseType(ProductsResponseSchema)
    .stale(300_000) // 5 minutes
    .execute();

  if (result.error) {
    throw new Error(`Failed to fetch products: ${result.error.message}`);
  }

  return result.data;
}

// Usage
const products = await getProducts("electronics");
console.log(`Found ${products.total} products`);
```

**Best Practices Applied:**

- Caching for high-traffic endpoints
- Schema validation for response integrity
- Type-safe product objects
- Centralized error handling

---

#### Case B: Fintech Payment Processing

**Scenario:** A fintech application needs to process payments with retry logic, timeout handling, and secure headers.

```typescript
import { IgniterCaller } from "@igniter-js/caller";
import { z } from "zod";

// Payment request schema
const PaymentRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["USD", "EUR", "GBP"]),
  recipient: z.object({
    accountNumber: z.string().length(10),
    routingNumber: z.string().length(9),
  }),
  reference: z.string(),
});

// Payment response schema
const PaymentResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "completed", "failed"]),
  transactionId: z.string(),
});

const api = IgniterCaller.create()
  .withBaseUrl("https://payments-api.example.com")
  .withHeaders({
    "X-API-Key": process.env.PAYMENT_API_KEY!,
    "Content-Type": "application/json",
  })
  .build();

// Process payment with retry and timeout
async function processPayment(payment: z.infer<typeof PaymentRequestSchema>) {
  const result = await api
    .post("/payments")
    .body(payment)
    .responseType(PaymentResponseSchema)
    .timeout(10_000) // 10 second timeout
    .retry(3, {
      baseDelay: 500,
      backoff: "exponential",
      retryOnStatus: [503, 504], // Only retry on server errors
    })
    .execute();

  if (result.error) {
    // Log payment failure
    console.error(`Payment failed: ${result.error.message}`);

    // Re-throw for upstream handling
    throw result.error;
  }

  return result.data;
}

// Usage
try {
  const payment = await processPayment({
    amount: 100.0,
    currency: "USD",
    recipient: {
      accountNumber: "1234567890",
      routingNumber: "987654321",
    },
    reference: `ORDER-${Date.now()}`,
  });

  console.log(`Payment initiated: ${payment.id}`);
} catch (error) {
  console.error("Payment processing failed");
}
```

**Best Practices Applied:**

- Strict timeout for financial operations
- Exponential backoff for transient failures
- Schema validation for request/response
- Secure API key management via headers
- Only retry on server-side errors

---

#### Case C: Social Media Feed with Real-Time Updates

**Scenario:** A social media app needs to fetch feed posts, cache aggressively, and invalidate cache on new posts.

```typescript
import { IgniterCaller, IgniterCallerManager } from "@igniter-js/caller";
import { z } from "zod";

const PostSchema = z.object({
  id: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().url(),
  }),
  content: z.string(),
  createdAt: z.string(),
  likes: z.number(),
});

const FeedResponseSchema = z.object({
  posts: z.array(PostSchema),
  nextCursor: z.string().nullable(),
});

// Set up global event listener for cache invalidation
IgniterCallerManager.on(/^\/feed/, async (result, ctx) => {
  if (!result.error) {
    console.log(`Feed fetched: ${ctx.method} ${ctx.url}`);
  }
});

const api = IgniterCaller.create()
  .withBaseUrl("https://social-api.example.com")
  .withHeaders({
    Authorization: `Bearer ${authToken}`,
  })
  .build();

// Fetch feed with aggressive caching (2 minutes)
async function getFeed(cursor?: string) {
  const result = await api
    .get("/feed")
    .params(cursor ? { cursor } : {})
    .responseType(FeedResponseSchema)
    .stale(120_000) // 2 minutes
    .execute();

  if (result.error) {
    throw new Error(`Failed to fetch feed: ${result.error.message}`);
  }

  return result.data;
}

// Create new post and invalidate feed cache
async function createPost(content: string) {
  const result = await api
    .post("/posts")
    .body({ content })
    .responseType(PostSchema)
    .execute();

  if (result.error) {
    throw new Error(`Failed to create post: ${result.error.message}`);
  }

  // Invalidate feed cache after creating post
  await IgniterCallerManager.invalidate("/feed");

  return result.data;
}

// Usage
const feed = await getFeed();
console.log(`Feed has ${feed.posts.length} posts`);

await createPost("Hello, world!");
const freshFeed = await getFeed(); // This will fetch fresh data
```

**Best Practices Applied:**

- Aggressive caching for read-heavy feeds
- Global event listener for observability
- Manual cache invalidation after mutations
- Cursor-based pagination support

---

#### Case D: IoT Device Management

**Scenario:** An IoT platform needs to manage devices with high concurrency, retry logic, and efficient JSON parsing.

```typescript
import { IgniterCaller, IgniterCallerManager } from "@igniter-js/caller";
import { z } from "zod";

const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["sensor", "actuator", "controller"]),
  status: z.enum(["online", "offline", "error"]),
  lastSeen: z.string(),
  metadata: z.record(z.unknown()),
});

const api = IgniterCaller.create()
  .withBaseUrl("https://iot-api.example.com")
  .withHeaders({
    "X-Platform-Key": process.env.IOT_PLATFORM_KEY!,
  })
  .build();

// Fetch all devices with batch parallelization
async function getAllDevices() {
  // Split into multiple requests for pagination
  const page1 = api.get("/devices").params({ page: 1, limit: 50 }).execute();
  const page2 = api.get("/devices").params({ page: 2, limit: 50 }).execute();
  const page3 = api.get("/devices").params({ page: 3, limit: 50 }).execute();

  // Execute all requests in parallel
  const [result1, result2, result3] = await IgniterCallerManager.batch([
    page1,
    page2,
    page3,
  ]);

  if (result1.error || result2.error || result3.error) {
    throw new Error("Failed to fetch all devices");
  }

  return [...result1.data, ...result2.data, ...result3.data];
}

// Update device status with retry
async function updateDeviceStatus(
  deviceId: string,
  status: "online" | "offline",
) {
  const result = await api
    .put(`/devices/${deviceId}`)
    .body({ status })
    .responseType(DeviceSchema)
    .retry(5, {
      baseDelay: 1000,
      backoff: "linear",
      retryOnStatus: [408, 429, 500, 502, 503, 504],
    })
    .execute();

  if (result.error) {
    throw new Error(`Failed to update device: ${result.error.message}`);
  }

  return result.data;
}

// Usage
const devices = await getAllDevices();
console.log(`Managing ${devices.length} devices`);

await updateDeviceStatus(devices[0].id, "online");
```

**Best Practices Applied:**

- Parallel batch requests for efficiency
- Retry with linear backoff for IoT network conditions
- Type-safe device objects
- Efficient JSON parsing (automatic)

---

#### Case E: Healthcare Patient Records

**Scenario:** A healthcare application needs to fetch patient records with strict validation, HIPAA-compliant logging, and fallback handling.

```typescript
import { IgniterCaller } from "@igniter-js/caller";
import { z } from "zod";

// Patient schema with validation
const PatientSchema = z.object({
  id: z.string(),
  name: z.object({
    first: z.string().min(1),
    last: z.string().min(1),
  }),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
    }),
  ),
});

// Error schema
const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

const api = IgniterCaller.create()
  .withBaseUrl("https://healthcare-api.example.com")
  .withHeaders({
    Authorization: `Bearer ${process.env.HEALTHCARE_API_KEY!}`,
    "X-Request-Id": crypto.randomUUID(),
  })
  .build();

// Fetch patient with strict validation and fallback
async function getPatient(patientId: string) {
  const result = await api
    .get(`/patients/${patientId}`)
    .responseType(PatientSchema)
    .fallback(() => {
      // Return default patient structure if API is unavailable
      return {
        id: patientId,
        name: { first: "Unknown", last: "Patient" },
        dateOfBirth: "1900-01-01",
        medications: [],
      };
    })
    .execute();

  return result.data;
}

// Create medication record with request validation
async function addMedication(
  patientId: string,
  medication: { name: string; dosage: string; frequency: string },
) {
  const MedicationSchema = z.object({
    patientId: z.string(),
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.string().min(1),
  });

  const result = await api
    .post(`/patients/${patientId}/medications`)
    .body(medication)
    .responseType(z.object({ id: z.string() }))
    .execute();

  if (result.error) {
    // Log error for compliance audit
    console.error(`Medication add failed: ${result.error.message}`);
    throw result.error;
  }

  return result.data;
}

// Usage
try {
  const patient = await getPatient("PAT-12345");
  console.log(`Patient: ${patient.name.first} ${patient.name.last}`);

  await addMedication("PAT-12345", {
    name: "Aspirin",
    dosage: "81mg",
    frequency: "Daily",
  });
} catch (error) {
  console.error("Healthcare operation failed");
}
```

**Best Practices Applied:**

- Strict schema validation for sensitive data
- Fallback values for API unavailability
- Request ID tracking for audit trails
- Centralized error logging for compliance

---

#### Case F: Content Management System (CMS)

**Scenario:** A CMS needs to fetch content, handle file uploads, and cache aggressively.

```typescript
import { IgniterCaller } from "@igniter-js/caller";
import { z } from "zod";

const ContentSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  publishedAt: z.string().nullable(),
  author: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const ContentListSchema = z.object({
  items: z.array(ContentSchema),
  total: z.number(),
});

const api = IgniterCaller.create()
  .withBaseUrl("https://cms-api.example.com")
  .withHeaders({
    "X-CMS-API-Key": process.env.CMS_API_KEY!,
  })
  .build();

// Fetch published articles with caching (10 minutes)
async function getArticles(params: { page?: number; category?: string }) {
  const result = await api
    .get("/articles")
    .params(params)
    .responseType(ContentListSchema)
    .stale(600_000) // 10 minutes
    .execute();

  if (result.error) {
    throw new Error(`Failed to fetch articles: ${result.error.message}`);
  }

  return result.data;
}

// Upload image file
async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const result = await api
    .post("/images")
    .body(formData)
    .headers({ "Content-Type": "multipart/form-data" }) // Let fetch set boundary
    .execute();

  if (result.error) {
    throw new Error(`Failed to upload image: ${result.error.message}`);
  }

  return result.data;
}

// Create article and invalidate cache
async function createArticle(article: { title: string; body: string }) {
  const result = await api
    .post("/articles")
    .body(article)
    .responseType(ContentSchema)
    .execute();

  if (result.error) {
    throw new Error(`Failed to create article: ${result.error.message}`);
  }

  // Invalidate article list cache
  await IgniterCallerManager.invalidate("/articles");

  return result.data;
}

// Usage
const articles = await getArticles({ page: 1, category: "news" });
console.log(`Found ${articles.total} articles`);

const imageUpload = await uploadImage(fileInput.files[0]);
console.log(`Image uploaded: ${imageUpload.id}`);
```

**Best Practices Applied:**

- FormData handling for file uploads
- Aggressive caching for content
- Cache invalidation after mutations
- Type-safe content objects

---

#### Case G: Analytics Dashboard

**Scenario:** An analytics dashboard needs to fetch metrics with long polling, caching, and error recovery.

```typescript
import { IgniterCaller } from "@igniter-js/caller";
import { z } from "zod";

const MetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  timestamp: z.string(),
});

const MetricsResponseSchema = z.object({
  metrics: z.array(MetricSchema),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

const api = IgniterCaller.create()
  .withBaseUrl("https://analytics-api.example.com")
  .withHeaders({
    "X-Analytics-Key": process.env.ANALYTICS_API_KEY!,
  })
  .build();

// Fetch metrics with short-term caching (30 seconds)
async function getMetrics(period: { start: string; end: string }) {
  const result = await api
    .get("/metrics")
    .params(period)
    .responseType(MetricsResponseSchema)
    .stale(30_000) // 30 seconds
    .execute();

  if (result.error) {
    // Return empty metrics on error (graceful degradation)
    return {
      metrics: [],
      period: {
        start: period.start,
        end: period.end,
      },
    };
  }

  return result.data;
}

// Start polling for real-time updates
function startPolling(intervalMs: number) {
  const poll = async () => {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 300_000).toISOString(); // Last 5 minutes

    const metrics = await getMetrics({ start, end });

    // Update UI with new metrics
    updateDashboard(metrics);
  };

  poll(); // Initial fetch
  return setInterval(poll, intervalMs);
}

// Usage
const pollInterval = startPolling(30_000); // Poll every 30 seconds

// Later: stop polling
clearInterval(pollInterval);
```

**Best Practices Applied:**

- Short-term caching for polling
- Graceful degradation on errors
- Interval-based polling for real-time updates
- Type-safe metric objects

---

#### Case H: Travel Booking System

**Scenario:** A travel booking system needs to search flights, handle rate limiting, and cache search results.

```typescript
import { IgniterCaller } from "@igniter-js/caller";
import { z } from "zod";

const FlightSchema = z.object({
  id: z.string(),
  airline: z.string(),
  flightNumber: z.string(),
  departure: z.object({
    airport: z.string(),
    time: z.string(),
  }),
  arrival: z.object({
    airport: z.string(),
    time: z.string(),
  }),
  price: z.object({
    amount: z.number(),
    currency: z.string(),
  }),
  seatsAvailable: z.number(),
});

const FlightSearchResponseSchema = z.object({
  flights: z.array(FlightSchema),
  searchId: z.string(),
  expiresAt: z.string(),
});

const api = IgniterCaller.create()
  .withBaseUrl("https://flights-api.example.com")
  .withHeaders({
    "X-Travel-API-Key": process.env.TRAVEL_API_KEY!,
  })
  .build();

// Search flights with rate-limit-aware retry
async function searchFlights(search: {
  origin: string;
  destination: string;
  date: string;
}) {
  const result = await api
    .get("/flights/search")
    .params(search)
    .responseType(FlightSearchResponseSchema)
    .retry(5, {
      baseDelay: 2000,
      backoff: "exponential",
      retryOnStatus: [429, 500, 502, 503, 504], // Include rate limit (429)
    })
    .stale(60_000) // Cache for 1 minute
    .execute();

  if (result.error) {
    // Check if rate limited
    if ((result.error as any).statusCode === 429) {
      throw new Error("Rate limited. Please try again later.");
    }
    throw new Error(`Search failed: ${result.error.message}`);
  }

  return result.data;
}

// Book flight with validation
async function bookFlight(
  flightId: string,
  passenger: { name: string; email: string },
) {
  const BookingRequestSchema = z.object({
    flightId: z.string(),
    passenger: z.object({
      name: z.string().min(2),
      email: z.string().email(),
    }),
  });

  const result = await api
    .post("/flights/book")
    .body({ flightId, passenger })
    .responseType(
      z.object({
        bookingId: z.string(),
        confirmationCode: z.string(),
      }),
    )
    .timeout(15_000) // 15 second timeout for booking
    .execute();

  if (result.error) {
    throw new Error(`Booking failed: ${result.error.message}`);
  }

  return result.data;
}

// Usage
const search = await searchFlights({
  origin: "JFK",
  destination: "LAX",
  date: "2024-03-15",
});

console.log(`Found ${search.flights.length} flights`);

const booking = await bookFlight(search.flights[0].id, {
  name: "John Doe",
  email: "john@example.com",
});

console.log(`Booked! Confirmation: ${booking.confirmationCode}`);
```

**Best Practices Applied:**

- Rate limit aware retry with exponential backoff
- Aggressive caching for expensive search operations
- Extended timeout for booking operations
- Request validation

---

### 11. Domain-Specific Guidance

#### 11.1 High-Performance Caching

For high-traffic APIs, use aggressive caching and store-based persistence:

```typescript
import { IgniterCaller } from "@igniter-js/caller";
import { MockCallerStoreAdapter } from "@igniter-js/caller/adapters";

// Use mock store for development, switch to Redis in production
const store =
  process.env.NODE_ENV === "production"
    ? createRedisStore()
    : MockCallerStoreAdapter.create();

const api = IgniterCaller.create()
  .withBaseUrl("https://high-traffic-api.example.com")
  .withStore(store, {
    ttl: 3600, // 1 hour
    keyPrefix: "api-cache:",
  })
  .build();

// Cache for 10 minutes (shorter than TTL for fresh data)
const result = await api.get("/popular-items").stale(600_000).execute();
```

**Recommendations:**

- Set stale time < store TTL for cache revalidation
- Use Redis for production (shared cache across instances)
- Use pattern-based invalidation for batch updates

---

#### 11.2 Schema-First Development

For type-safe API clients, define schemas first, then generate callers:

```typescript
import { IgniterCaller, IgniterCallerSchema } from '@igniter-js/caller'
import { z } from 'zod'

// Define reusable schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
})

const ErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
})

// Build schema registry with path-first API
const apiSchemas = IgniterCallerSchema.create()
  .schema('User', UserSchema)
  .schema('Error', ErrorSchema)
  .path('/users', (path) =>
    path.get({
      responses: {
        200: path.ref('User').array(),
        401: path.ref('Error').schema,
      },
    })
    .post({
      request: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      responses: {
        201: path.ref('User').schema,
        400: path.ref('Error').schema,
      },
    })
  )
  .path('/users/:id', (path) =>
    path.get({
      responses: {
        200: path.ref('User').schema,
        404: path.ref('Error').schema,
      },
    })
    .delete({
      responses: {
        204: z.void(),
        404: path.ref('Error').schema,
      },
    })
  )
  .build()

// Create typed API client
const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  .withSchemas(apiSchemas, { mode: 'strict' })
  .build()

// Type inference works automatically
type UsersResponse = Awaited<ReturnType<typeof api.get('/users').execute>>

async function main() {
  // All calls are fully typed
  const usersResult = await api.get('/users').execute()
  const users = usersResult.data  // User[] | undefined

  const userResult = await api.get('/users/123')
    .params({ id: '123' })  // params are typed from path pattern
    .execute()
  const user = userResult.data  // User | undefined

  const createResult = await api.post('/users')
    .body({ name: 'John', email: 'john@example.com' })  // body is typed
    .execute()
  const created = createResult.data  // User | undefined
}
```

---

#### 11.3 Error Boundary Integration

Integrate with React error boundaries:

```typescript
import { useQuery } from "@tanstack/react-query";
import { IgniterCaller } from "@igniter-js/caller";

const api = IgniterCaller.create()
  .withBaseUrl("https://api.example.com")
  .build();

function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const result = await api.get("/users").execute();
      if (result.error) throw result.error;
      return result.data;
    },
    retry: (failureCount, error) => {
      // Only retry on transient errors
      const isTransient =
        error instanceof IgniterCallerError &&
        [408, 429, 500, 502, 503, 504].includes(error.statusCode || 0);

      return isTransient && failureCount < 3;
    },
  });
}
```

---

### 12. Best Practices & Anti-Patterns

#### 12.1 Builder Configuration

| Practice                               | Why                                                 | Example                                              |
| -------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| ✅ Chain builder methods               | Fluent API improves readability                     | `IgniterCaller.create().withBaseUrl('...').build()`  |
| ✅ Use immutable builder pattern       | Prevents accidental mutation                        | Each `with*` returns new instance                    |
| ✅ Configure logging early             | Captures all initialization errors                  | `.withLogger(logger)` before `.build()`              |
| ❌ Don't reuse builder instances       | Builder state persists, causing unexpected behavior | Create new builder or manager for each configuration |
| ❌ Don't call `build()` multiple times | Each call creates a new manager instance            | Store manager in a variable                          |

#### 12.2 Request Execution

| Practice                                           | Why                              | Example                                     |
| -------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| ✅ Check `result.error`                            | Result is always returned        | `if (result.error) throw result.error`      |
| ✅ Use `stale()` for caching                       | Simple cache strategy            | `.stale(60_000)` for 1-minute cache         |
| ✅ Set reasonable timeouts                         | Prevents hanging requests        | `.timeout(30_000)` for 30-second limit      |
| ❌ Don't ignore errors                             | Errors indicate problems         | Always handle or re-throw                   |
| ❌ Don't use short stale times with network errors | Causes repeated failed requests  | Increase stale time or fix underlying error |
| ❌ Don't retry on client errors (4xx)              | Only server errors are transient | Exclude 4xx from `retryOnStatus`            |

#### 12.3 Schema Validation

| Practice                         | Why                                | Example                                   |
| -------------------------------- | ---------------------------------- | ----------------------------------------- |
| ✅ Define schemas first          | Enables full type inference        | Use `IgniterCallerSchema.create()`        |
| ✅ Use relative paths in schemas | Allows base URL configuration      | `'/users'` not `'https://api.test/users'` |
| ✅ Use `as const` assertion      | Enables literal type inference     | `schemas as const`                        |
| ❌ Don't mix Zod versions        | Incompatible APIs can cause issues | Use Zod v4+ only                          |
| ❌ Don't use loose validation    | Type safety is lost                | Use `mode: 'strict'` for production       |

#### 12.4 Cache Management

| Practice                                | Why                                | Example                                     |
| --------------------------------------- | ---------------------------------- | ------------------------------------------- |
| ✅ Invalidate after mutations           | Ensures fresh data                 | `IgniterCallerManager.invalidate('/users')` |
| ✅ Use appropriate stale times          | Balances freshness and performance | `.stale(300_000)` for rarely-changing data  |
| ❌ Don't cache sensitive data           | Security risk                      | Avoid caching personal information          |
| ❌ Don't rely solely on in-memory cache | Lost on restart                    | Use store adapter for persistence           |

---

### 13. Exhaustive Error & Troubleshooting Library

This section provides detailed information for every error code emitted by `@igniter-js/caller`.

#### IGNITER_CALLER_HTTP_ERROR

- **Context:** Returned when the HTTP response status indicates an error (4xx or 5xx).
- **Cause:** The server returned an error status code. This can be due to invalid request data, authentication issues, or server errors.
- **Mitigation:**
  - Check the request body and parameters for correctness.
  - Verify authentication credentials.
  - Review the server's API documentation.
- **Solution:**

```typescript
const result = await api.get("/users").execute();

if (result.error) {
  if (
    IgniterCallerError.is(result.error) &&
    result.error.code === "IGNITER_CALLER_HTTP_ERROR"
  ) {
    console.error(
      `HTTP ${result.error.statusCode}: ${result.error.statusText}`,
    );
    // Handle specific status codes
    if (result.error.statusCode === 401) {
      // Redirect to login
    } else if (result.error.statusCode === 404) {
      // Show not found message
    }
  }
  throw result.error;
}
```

---

#### IGNITER_CALLER_TIMEOUT

- **Context:** Returned when the request exceeds the configured timeout duration.
- **Cause:** The server did not respond within the timeout period. This can be due to network issues, slow server response, or a hung request.
- **Mitigation:**
  - Increase the timeout for long-running operations.
  - Check network connectivity.
  - Monitor server performance.
- **Solution:**

```typescript
const result = await api
  .get("/slow-endpoint")
  .timeout(60_000) // Increase timeout to 60 seconds
  .execute();

if (result.error?.code === "IGNITER_CALLER_TIMEOUT") {
  console.error("Request timed out. Please try again.");
  // Implement retry logic or user notification
}
```

---

#### IGNITER_CALLER_REQUEST_VALIDATION_FAILED

- **Context:** Returned when the request body fails schema validation in strict mode.
- **Cause:** The request body does not match the defined schema. This can be due to missing fields, incorrect types, or validation constraint violations.
- **Mitigation:**
  - Review the request body against the schema.
  - Ensure all required fields are present.
  - Check field types and formats.
- **Solution:**

```typescript
const result = await api
  .post("/users")
  .body({ name: "John" }) // Missing email field
  .execute();

if (result.error?.code === "IGNITER_CALLER_REQUEST_VALIDATION_FAILED") {
  console.error("Request validation failed:", result.error.details);
  // Show validation errors to user
  if (result.error.details) {
    for (const issue of result.error.details as any[]) {
      console.error("- " + issue.message);
    }
  }
}
```

---

#### IGNITER_CALLER_RESPONSE_VALIDATION_FAILED

- **Context:** Returned when the response data fails schema validation in strict mode.
- **Cause:** The server response does not match the defined schema. This can be due to API contract changes, missing fields, or incorrect types.
- **Mitigation:**
  - Review the API documentation.
  - Update the schema to match the current API response.
  - Contact API provider if the contract has changed.
- **Solution:**

```typescript
const result = await api.get("/users").execute();

if (result.error?.code === "IGNITER_CALLER_RESPONSE_VALIDATION_FAILED") {
  console.error("Response validation failed:", result.error.details);
  // Log unexpected response for debugging
  console.error("Unexpected response:", JSON.stringify(result.error.cause));
  // Consider updating schema or using mode: 'soft' for migration
}
```

---

#### IGNITER_CALLER_SCHEMA_DUPLICATE

- **Context:** Thrown when trying to register a duplicate schema key or duplicate method on a path.
- **Cause:** Attempted to register the same registry key twice or define the same method on a path twice.
- **Mitigation:**
  - Use unique keys for schema registry.
  - Ensure each method is only defined once per path.
- **Solution:**

```typescript
try {
  const schemas = IgniterCallerSchema.create()
    .schema("User", UserSchema)
    .schema("User", UserSchema) // Duplicate key!
    .build();
} catch (error) {
  if (
    IgniterCallerError.is(error) &&
    error.code === "IGNITER_CALLER_SCHEMA_DUPLICATE"
  ) {
    console.error("Schema key already exists:", error.metadata?.key);
    // Use a different key or remove duplicate registration
  }
}
```

---

#### IGNITER_CALLER_SCHEMA_INVALID

- **Context:** Thrown when schema path or key is invalid.
- **Cause:**
  - Schema path is empty.
  - Schema path does not start with `/`.
  - Schema registry key is empty.
- **Mitigation:**
  - Ensure paths start with `/`.
  - Ensure registry keys are non-empty strings.
- **Solution:**

```typescript
try {
  const schemas = IgniterCallerSchema.create()
    .path(
      "users",
      (
        path, // Missing leading slash!
      ) => path.get({ responses: { 200: UserSchema } }),
    )
    .build();
} catch (error) {
  if (
    IgniterCallerError.is(error) &&
    error.code === "IGNITER_CALLER_SCHEMA_INVALID"
  ) {
    console.error("Invalid schema path:", error.message);
    // Fix path to '/users'
  }
}
```

---

#### IGNITER_CALLER_UNKNOWN_ERROR

- **Context:** Returned when an unexpected error occurs during request execution.
- **Cause:**
  - Network failure (DNS resolution, connection refused).
  - Runtime error in request builder.
  - AbortController cancellation without timeout.
- **Mitigation:**
  - Check network connectivity.
  - Verify the URL is correct.
  - Review error stack trace for debugging.
- **Solution:**

```typescript
const result = await api.get("/users").execute();

if (result.error?.code === "IGNITER_CALLER_UNKNOWN_ERROR") {
  console.error("Unexpected error:", result.error.message);
  console.error("Cause:", result.error.cause);

  // Handle network errors
  if (result.error.cause instanceof TypeError) {
    console.error("Network error. Check your connection.");
  }

  // Throw for upstream error handling
  throw result.error;
}
```

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 14. Exhaustive API Reference

#### 14.1 Classes

| Class                                                 | Purpose                             | Location                              |
| ----------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| `IgniterCallerBuilder<TSchemas>`                      | Package initializer with fluent API | `src/builders/main.builder.ts`        |
| `IgniterCallerManager<TSchemas>`                      | HTTP client runtime                 | `src/core/manager.ts`                 |
| `IgniterCallerRequestBuilder<TResponse>`              | Per-request configuration           | `src/builders/request.builder.ts`     |
| `IgniterCallerSchema<TSchemas, TRegistry>`            | Schema registry builder             | `src/builders/schema.builder.ts`      |
| `IgniterCallerSchemaPathBuilder<TMethods, TRegistry>` | Path + methods builder              | `src/builders/schema-path.builder.ts` |
| `IgniterCallerEvents`                                 | Global event emitter                | `src/core/events.ts`                  |
| `IgniterCallerError`                                  | Typed error class                   | `src/errors/caller.error.ts`          |
| `IgniterCallerCacheUtils`                             | Cache utilities                     | `src/utils/cache.ts`                  |
| `IgniterCallerBodyUtils`                              | Body normalization                  | `src/utils/body.ts`                   |
| `IgniterCallerSchemaUtils`                            | Schema validation                   | `src/utils/schema.ts`                 |
| `IgniterCallerUrlUtils`                               | URL construction                    | `src/utils/url.ts`                    |
| `MockCallerStoreAdapter`                              | Mock store for testing              | `src/adapters/mock.adapter.ts`        |

---

#### 14.2 IgniterCallerBuilder Methods

| Method                    | Signature                                                                                                                                                          | Description                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `create`                  | `static create(): IgniterCallerBuilder<{}>`                                                                                                                        | Creates a new builder instance |
| `withBaseUrl`             | `withBaseUrl(baseURL: string): IgniterCallerBuilder<TSchemas>`                                                                                                     | Sets base URL for all requests |
| `withHeaders`             | `withHeaders(headers: Record<string, string>): IgniterCallerBuilder<TSchemas>`                                                                                     | Sets default headers           |
| `withCookies"             | `withCookies(cookies: Record<string, string>): IgniterCallerBuilder<TSchemas>`                                                                                     | Sets default cookies           |
| `withLogger`              | `withLogger(logger: IgniterLogger): IgniterCallerBuilder<TSchemas>`                                                                                                | Attaches logger instance       |
| `withRequestInterceptor`  | `withRequestInterceptor(interceptor: IgniterCallerRequestInterceptor): IgniterCallerBuilder<TSchemas>`                                                             | Adds request interceptor       |
| `withResponseInterceptor` | `withResponseInterceptor(interceptor: IgniterCallerResponseInterceptor): IgniterCallerBuilder<TSchemas>`                                                           | Adds response interceptor      |
| `withStore`               | `withStore(store: IgniterCallerStoreAdapter, options?: IgniterCallerStoreOptions): IgniterCallerBuilder<TSchemas>`                                                 | Configures persistent store    |
| `withSchemas`             | `withSchemas<TNewSchemas>(schemas: TNewSchemas, validation?: IgniterCallerSchemaValidationOptions): IgniterCallerBuilder<IgniterCallerSchemaMapFrom<TNewSchemas>>` | Configures schema validation   |
| `withTelemetry`           | `withTelemetry(telemetry: IgniterTelemetryManager): IgniterCallerBuilder<TSchemas>`                                                                                | Attaches telemetry manager     |
| `build`                   | `build(): IgniterCallerManager<TSchemas>`                                                                                                                          | Builds the manager instance    |

---

#### 14.3 IgniterCallerManager Methods

| Method              | Signature                                                                                                                                                                   | Description                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `get`               | `get<TPath extends GetPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'GET'>`                                                                            | Creates a GET request                   |
| `post`              | `post<TPath extends PostPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'POST'>`                                                                         | Creates a POST request                  |
| `put`               | `put<TPath extends PutPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'PUT'>`                                                                            | Creates a PUT request                   |
| `patch`             | `patch<TPath extends PatchPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'PATCH'>`                                                                      | Creates a PATCH request                 |
| `delete`            | `delete<TPath extends DeletePaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'DELETE'>`                                                                   | Creates a DELETE request                |
| `head`              | `head<TPath extends HeadPaths<TSchemas>>(url: TPath): TypedRequestBuilder<TSchemas, TPath, 'HEAD'>`                                                                         | Creates a HEAD request                  |
| `request`           | `async request<T = unknown>(options: IgniterCallerDirectRequestOptions): Promise<IgniterCallerApiResponse<T>>`                                                              | Executes request directly (axios-style) |
| `batch`             | `static async batch<T extends readonly Promise<IgniterCallerApiResponse<any>>[]>(requests: [...T]): Promise<{ [K in keyof T]: T[K] extends Promise<infer R> ? R : never }>` | Executes requests in parallel           |
| `on`                | `static on(pattern: IgniterCallerUrlPattern, callback: IgniterCallerEventCallback): () => void`                                                                             | Registers global event listener         |
| `off`               | `static off(pattern: IgniterCallerUrlPattern, callback?: IgniterCallerEventCallback): void`                                                                                 | Removes event listener                  |
| `invalidate`        | `static async invalidate(key: string): Promise<void>`                                                                                                                       | Invalidates specific cache entry        |
| `invalidatePattern` | `static async invalidatePattern(pattern: string): Promise<void>`                                                                                                            | Invalidates cache by pattern            |

---

#### 14.4 IgniterCallerRequestBuilder Methods

| Method         | Signature                                                                                      | Description                                           |
| -------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `url`          | `url(url: string): this`                                                                       | Sets the request URL                                  |
| `body`         | `body<TBody>(body: TBody): this`                                                               | Sets the request body                                 |
| `params`       | `params(params: Record<string, string \| number \| boolean>): this`                            | Sets query parameters                                 |
| `headers`      | `headers(headers: Record<string, string>): this`                                               | Merges additional headers                             |
| `timeout`      | `timeout(timeout: number): this`                                                               | Sets request timeout in milliseconds                  |
| `cache`        | `cache(cache: RequestCache, key?: string): this`                                               | Sets cache strategy and optional key                  |
| `retry`        | `retry(maxAttempts: number, options?: Omit<IgniterCallerRetryOptions, 'maxAttempts'>): this`   | Configures retry behavior                             |
| `fallback`     | `fallback<T>(fn: () => T): this`                                                               | Provides fallback value on failure                    |
| `stale`        | `stale(milliseconds: number): this`                                                            | Sets cache stale time in milliseconds                 |
| `responseType` | `responseType<T>(schema?: z.ZodSchema<T> \| StandardSchemaV1): IgniterCallerRequestBuilder<T>` | Sets expected response type for typing and validation |
| `execute`      | `async execute(): Promise<IgniterCallerApiResponse<TResponse>>`                                | Executes the HTTP request                             |
| `getFile`      | `getFile(url: string): { execute: () => Promise<IgniterCallerFileResponse> }`                  | Downloads a file (deprecated)                         |

---

#### 14.5 IgniterCallerSchema Methods

| Method   | Signature                                                                                                                                                                                                                                                                                                                                          | Description                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `create` | `static create(): IgniterCallerSchema<{}, {}>`                                                                                                                                                                                                                                                                                                     | Creates a new empty schema builder     |
| `schema` | `schema<TKey extends string, TSchema extends StandardSchemaV1>(key: TKey, schema: TSchema): IgniterCallerSchema<TSchemas, TRegistry & { [K in TKey]: TSchema }>`                                                                                                                                                                                   | Registers a reusable schema            |
| `path`   | `path<TPath extends string, TMethods extends Partial<Record<IgniterCallerSchemaMethod, IgniterCallerEndpointSchema<any, any>>>>(path: TPath, builder: (pathBuilder: IgniterCallerSchemaPathBuilder<{}, TRegistry>) => IgniterCallerSchemaPathBuilder<TMethods, TRegistry>): IgniterCallerSchema<TSchemas & { [K in TPath]: TMethods }, TRegistry>` | Defines a path with methods            |
| `build`  | `build(): IgniterCallerSchemaBuildResult<TSchemas, TRegistry>`                                                                                                                                                                                                                                                                                     | Builds schema map and attaches helpers |

---

#### 14.6 IgniterCallerSchemaPathBuilder Methods

| Method   | Signature                                                                                                                                                                                                                                                                       | Description                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `create` | `static create<TRegistry extends IgniterCallerSchemaRegistry>(registry: TRegistry): IgniterCallerSchemaPathBuilder<{}, TRegistry>`                                                                                                                                              | Creates a new path builder         |
| `ref`    | `ref<TKey extends keyof TRegistry>(key: TKey): { schema: TRegistry[TKey]; array(): SchemaArray<TRegistry[TKey]>; nullable(): SchemaNullable<TRegistry[TKey]>; optional(): SchemaOptional<TRegistry[TKey]>; record(keyType?: StandardSchemaV1): SchemaRecord<TRegistry[TKey]> }` | Returns registry reference helper  |
| `get`    | `get<TRequest, TResponses>(config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>): IgniterCallerSchemaPathBuilder<TMethods & { GET: IgniterCallerEndpointSchema<TRequest, TResponses> }, TRegistry>`                                                                  | Defines a GET endpoint             |
| `post`   | `post<TRequest, TResponses>(config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>): IgniterCallerSchemaPathBuilder<TMethods & { POST: IgniterCallerEndpointSchema<TRequest, TResponses> }, TRegistry>`                                                                | Defines a POST endpoint            |
| `put`    | `put<TRequest, TResponses>(config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>): IgniterCallerSchemaPathBuilder<TMethods & { PUT: IgniterCallerEndpointSchema<TRequest, TResponses> }, TRegistry>`                                                                  | Defines a PUT endpoint             |
| `patch`  | `patch<TRequest, TResponses>(config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>): IgniterCallerSchemaPathBuilder<TMethods & { PATCH: IgniterCallerEndpointSchema<TRequest, TResponses> }, TRegistry>`                                                              | Defines a PATCH endpoint           |
| `delete` | `delete<TRequest, TResponses>(config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>): IgniterCallerSchemaPathBuilder<TMethods & { DELETE: IgniterCallerEndpointSchema<TRequest, TResponses> }, TRegistry>`                                                            | Defines a DELETE endpoint          |
| `head`   | `head<TRequest, TResponses>(config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>): IgniterCallerSchemaPathBuilder<TMethods & { HEAD: IgniterCallerEndpointSchema<TRequest, TResponses> }, TRegistry>`                                                                | Defines a HEAD endpoint            |
| `build`  | `build(): TMethods`                                                                                                                                                                                                                                                             | Builds the method map for the path |

---

#### 14.7 IgniterCallerCacheUtils Static Methods

| Method         | Signature                                                                                      | Description                         |
| -------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------- |
| `setStore`     | `static setStore(store: IgniterCallerStoreAdapter, options?: IgniterCallerStoreOptions): void` | Configures persistent store adapter |
| `getStore`     | `static getStore(): IgniterCallerStoreAdapter \| null`                                         | Gets configured store adapter       |
| `get`          | `static async get<T>(key: string, staleTime?: number): Promise<T \| undefined>`                | Gets cached data if not stale       |
| `set`          | `static async set(key: string, data: unknown, ttl?: number): Promise<void>`                    | Stores data in cache                |
| `clear`        | `static async clear(key: string): Promise<void>`                                               | Clears specific cache entry         |
| `clearPattern` | `static async clearPattern(pattern: string): Promise<void>`                                    | Clears entries matching pattern     |
| `clearAll`     | `static async clearAll(): Promise<void>`                                                       | Clears all in-memory cache          |

---

### 15. Telemetry & Observability Registry

#### 15.1 Telemetry Events

All telemetry events use the namespace `igniter.caller` and follow the `igniter.caller.<group>.<event>` naming convention.

| Event Key                   | Group      | Description                            | Attributes                                                                                                                                                    |
| --------------------------- | ---------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request.execute.started`   | request    | Emitted when a request starts          | `ctx.request.method`, `ctx.request.url`, `ctx.request.baseUrl`, `ctx.request.timeoutMs`                                                                       |
| `request.execute.success`   | request    | Emitted when a request succeeds        | `ctx.request.method`, `ctx.request.url`, `ctx.request.durationMs`, `ctx.response.status`, `ctx.response.contentType`, `ctx.cache.hit`, `ctx.request.fallback` |
| `request.execute.error`     | request    | Emitted when a request fails           | `ctx.request.method`, `ctx.request.url`, `ctx.request.durationMs`, `ctx.response.status`, `ctx.error.code`, `ctx.error.message`                               |
| `request.timeout.error`     | request    | Emitted when a request times out       | `ctx.request.method`, `ctx.request.url`, `ctx.request.timeoutMs`                                                                                              |
| `cache.read.hit`            | cache      | Emitted when cache hit occurs          | `ctx.request.method`, `ctx.request.url`, `ctx.cache.key`, `ctx.cache.staleTime`                                                                               |
| `retry.attempt.started`     | retry      | Emitted before each retry attempt      | `ctx.request.method`, `ctx.request.url`, `ctx.retry.attempt`, `ctx.retry.maxAttempts`, `ctx.retry.delayMs`                                                    |
| `validation.request.error`  | validation | Emitted when request validation fails  | `ctx.request.method`, `ctx.request.url`, `ctx.validation.type`, `ctx.validation.error`                                                                        |
| `validation.response.error` | validation | Emitted when response validation fails | `ctx.request.method`, `ctx.request.url`, `ctx.validation.type`, `ctx.validation.error`, `ctx.response.status`                                                 |

#### 15.2 Attribute Naming Convention

All telemetry attributes follow the pattern `ctx.<domain>.<attribute>`:

- `ctx.request.*` - Request-related attributes (method, url, timeout)
- `ctx.response.*` - Response-related attributes (status, contentType)
- `ctx.cache.*` - Cache-related attributes (key, hit, staleTime)
- `ctx.retry.*` - Retry-related attributes (attempt, maxAttempts, delayMs)
- `ctx.validation.*` - Validation-related attributes (type, error)
- `ctx.error.*` - Error-related attributes (code, message)

---

### 16. Type Reference Summary

#### 16.1 Core Types

| Type                          | Description                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `IgniterCallerApiResponse<T>` | Response envelope with `data?`, `error?`, `status?`, `headers?`                                         |
| `IgniterCallerFileResponse`   | File download response with `file: File \| null`, `error: Error \| null`                                |
| `IgniterCallerHttpMethod`     | Union: `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE' \| 'HEAD'`                                      |
| `IgniterCallerUrlPattern`     | Union: `string \| RegExp`                                                                               |
| `IgniterCallerEventCallback`  | Signature: `(result: IgniterApiResponse, context: { url, method, timestamp }) => void \| Promise<void>` |

#### 16.2 Builder Types

| Type                                           | Description                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `IgniterCallerBuilderState<TSchemas>`          | Builder state with baseURL, headers, cookies, interceptors, store, schemas, telemetry |
| `IgniterCallerRequestBuilderParams`            | Constructor params for request builder                                                |
| `IgniterCallerMethodRequestBuilder<TResponse>` | Request builder without internal `_setMethod` and `_setUrl`                           |
| `IgniterCallerTypedRequestBuilder<TResponse>`  | Typed request builder for HTTP methods                                                |

#### 16.3 Schema Types

| Type                                                  | Description                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `IgniterCallerSchemaMap`                              | Record of path → method → endpoint schema                          |
| `IgniterCallerSchemaMethod`                           | Union: `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE' \| 'HEAD'` |
| `IgniterCallerEndpointSchema<TRequest, TResponses>`   | Endpoint with optional request schema and response schemas         |
| `IgniterCallerSchemaValidationOptions`                | `{ mode?: 'strict' \| 'soft' \| 'off', onValidationError?: ... }`  |
| `IgniterCallerSchemaRegistry`                         | Record of reusable schema names to schemas                         |
| `IgniterCallerSchemaBuildResult<TSchemas, TRegistry>` | Built schema map with `$Infer` and `get` helpers                   |
| `IgniterCallerSchemaInfer<TSchemas, TRegistry>`       | Type helpers: Path, Endpoint, Request, Response, Responses, Schema |
| `IgniterCallerSchemaGetters<TSchemas, TRegistry>`     | Runtime helpers: path, endpoint, request, response, schema         |

#### 16.4 Configuration Types

| Type                                       | Description                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `IgniterCallerRequestOptions<TBody>`       | Request configuration with method, url, body, params, headers, timeout, cache                                                  |
| `IgniterCallerDirectRequestOptions<TBody>` | Axios-style options with all configurations in one object                                                                      |
| `IgniterCallerRetryOptions`                | `{ maxAttempts: number, backoff?: 'linear' \| 'exponential', baseDelay?: number, retryOnStatus?: number[] }`                   |
| `IgniterCallerStoreAdapter<TClient>`       | Store adapter interface with `client`, `get`, `set`, `delete`, `has` methods                                                   |
| `IgniterCallerStoreOptions`                | `{ ttl?: number, keyPrefix?: string, fallbackToFetch?: boolean }`                                                              |
| `IgniterCallerRequestInterceptor`          | Signature: `(config: IgniterCallerRequestOptions) => Promise<IgniterCallerRequestOptions> \| IgniterCallerRequestOptions`      |
| `IgniterCallerResponseInterceptor`         | Signature: `<T>(response: IgniterCallerApiResponse<T>) => Promise<IgniterCallerApiResponse<T>> \| IgniterCallerApiResponse<T>` |

#### 16.5 Content Type Types

| Type                                  | Description                                                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `IgniterCallerResponseContentType`    | `'json' \| 'xml' \| 'csv' \| 'text' \| 'html' \| 'blob' \| 'stream' \| 'arraybuffer' \| 'formdata'` |
| `IgniterCallerValidatableContentType` | `'json' \| 'xml' \| 'csv'`                                                                          |
| `IgniterCallerResponseMarker`         | `File \| Blob \| ReadableStream \| ArrayBuffer \| FormData`                                         |

---

## End of Document

This AGENTS.md document provides a complete reference for maintaining and using the `@igniter-js/caller` package. For updates or questions, refer to the package repository and contribution guidelines.
