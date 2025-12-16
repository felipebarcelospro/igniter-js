# @igniter-js/caller

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/caller.svg)](https://www.npmjs.com/package/@igniter-js/caller)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe HTTP client for Igniter.js apps. Built on top of `fetch`, it gives you a fluent request builder, interceptors, retries, caching (memory or store), schema validation (Standard Schema V1), and global response events.

## Features

- ✅ **Fluent API** - `api.get('/users').execute()` or builder pattern
- ✅ **axios-style requests** - `api.request({ method, url, body, ... })`
- ✅ **Auto content-type detection** - JSON, XML, CSV, Blob, Stream, etc.
- ✅ **Interceptors** - modify requests and responses in one place
- ✅ **Retries** - linear or exponential backoff + status-based retry
- ✅ **Caching** - in-memory cache + optional persistent store adapter
- ✅ **Schema Validation** - validate request/response using `StandardSchemaV1`
- ✅ **Zod Support** - optional per-request `responseType(zodSchema)` validation
- ✅ **Global Events** - observe responses for logging/telemetry/cache invalidation
- ✅ **Auto query encoding** - body in GET requests converts to query params

## Installation

```bash
# npm
npm install @igniter-js/caller @igniter-js/core zod

# pnpm
pnpm add @igniter-js/caller @igniter-js/core zod

# yarn
yarn add @igniter-js/caller @igniter-js/core zod

# bun
bun add @igniter-js/caller @igniter-js/core zod
```

> `@igniter-js/core` and `zod` are peer dependencies.

## Quick Start

```ts
import { IgniterCaller } from '@igniter-js/caller'

export const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  .withHeaders({ Authorization: `Bearer ${process.env.API_TOKEN}` })
  .build()

// Simple GET request with URL directly
const result = await api.get('/users').execute()

// With query params
const result = await api.get('/users').params({ page: 1 }).execute()

// With caching
const result = await api.get('/users').stale(10_000).execute()

if (result.error) {
  throw result.error
}

console.log(result.data)
```

## HTTP Methods

All HTTP methods accept an optional URL directly:

```ts
// GET
const users = await api.get('/users').execute()

// POST with body
const created = await api.post('/users').body({ name: 'John' }).execute()

// PUT
const updated = await api.put('/users/1').body({ name: 'Jane' }).execute()

// PATCH
const patched = await api.patch('/users/1').body({ name: 'Jane' }).execute()

// DELETE
const deleted = await api.delete('/users/1').execute()

// HEAD
const head = await api.head('/users').execute()
```

You can also use the traditional builder pattern:

```ts
const result = await api.get().url('/users').params({ page: 1 }).execute()
```

## axios-style Requests

For dynamic requests or when you prefer an object-based API:

```ts
const result = await api.request({
  method: 'POST',
  url: '/users',
  body: { name: 'John' },
  headers: { 'X-Custom': 'value' },
  timeout: 5000,
})

// With caching
const result = await api.request({
  method: 'GET',
  url: '/users',
  staleTime: 30000,
})

// With retry
const result = await api.request({
  method: 'GET',
  url: '/health',
  retry: { maxAttempts: 3, backoff: 'exponential' },
})
```

## Auto Content-Type Detection

The response is automatically parsed based on the `Content-Type` header:

| Content-Type | Parsed As |
|-------------|-----------|
| `application/json` | JSON object |
| `text/xml`, `application/xml` | Text (parse with your XML library) |
| `text/csv` | Text |
| `text/html`, `text/plain` | Text |
| `image/*`, `audio/*`, `video/*` | Blob |
| `application/pdf`, `application/zip` | Blob |
| `application/octet-stream` | Blob |

```ts
// JSON response - automatically parsed
const { data } = await api.get('/users').execute()

// Blob response - automatically detected
const { data } = await api.get('/file.pdf').responseType<Blob>().execute()

// Stream response
const { data } = await api.get('/stream').responseType<ReadableStream>().execute()
```

## GET with Body → Query Params

When you pass a body to a GET request, it's automatically converted to query parameters:

```ts
// This:
await api.get('/search').body({ q: 'test', page: 1 }).execute()

// Becomes: GET /search?q=test&page=1
```

## Interceptors

Interceptors are great for cross-cutting concerns like auth headers, request ids, logging, and response normalization.

```ts
const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  .withRequestInterceptor(async (request) => {
    return {
      ...request,
      headers: {
        ...request.headers,
        'x-request-id': crypto.randomUUID(),
      },
    }
  })
  .withResponseInterceptor(async (response) => {
    // Example: normalize empty responses
    if (response.data === '') {
      return { ...response, data: null as any }
    }
    return response
  })
  .build()
```

## Retries

Configure retry behavior for transient errors:

```ts
const result = await api
  .get('/health')
  .retry(3, {
    baseDelay: 250,
    backoff: 'exponential',
    retryOnStatus: [408, 429, 500, 502, 503, 504],
  })
  .execute()
```

## Caching

### In-memory caching

Use `.stale(ms)` to enable caching. The cache key defaults to the request URL, or you can set it via `.cache(cache, key)`.

```ts
const users = await api.get('/users').stale(30_000).execute()
```

### Store-based caching

You can plug any store that matches `IgniterCallerStoreAdapter` (Redis, etc.).

```ts
import { IgniterCaller } from '@igniter-js/caller'

const store = {
  client: null,
  async get(key) { return null },
  async set(key, value) { void key; void value },
  async delete(key) { void key },
  async has(key) { void key; return false },
}

const api = IgniterCaller.create()
  .withStore(store, {
    ttl: 3600,
    keyPrefix: 'igniter:caller:',
  })
  .build()
```

## Schema Validation (StandardSchemaV1)

If you already use schemas in your Igniter.js app, you can validate requests and responses automatically.

```ts
import { IgniterCaller } from '@igniter-js/caller'
import { z } from 'zod'

const schemas = {
  '/users/:id': {
    GET: {
      responses: {
        200: z.object({ id: z.string(), name: z.string() }),
      },
    },
  },
} as const

const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  .withSchemas(schemas, { mode: 'strict' })
  .build()

const result = await api.get('/users/123').execute()
```

**Note:** Schema validation only runs for validatable content types (JSON, XML, CSV). Binary responses (Blob, Stream) are not validated.

## Generate schemas via CLI

You can bootstrap Zod schemas and a ready-to-use caller from an OpenAPI 3 spec using the Igniter CLI:

```bash
npx @igniter-js/cli generate caller --name facebook --url https://api.example.com/openapi.json
```

By default this outputs `src/callers/<hostname>/schema.ts` and `index.ts`:

```ts
import { facebookCaller } from './src/callers/api.example.com'

const result = await facebookCaller.get('/products').execute()
```

## `responseType()` for Typing and Validation

Use `responseType()` to:

1. **Type the response** - for TypeScript inference
2. **Validate the response** - if you pass a Zod/StandardSchema (only for JSON/XML/CSV)

```ts
import { z } from 'zod'

// With Zod schema - validates JSON response
const result = await api
  .get('/users')
  .responseType(z.array(z.object({ id: z.string(), name: z.string() })))
  .execute()

// With type marker - typing only, no validation
const result = await api.get('/file').responseType<Blob>().execute()
```

## Global Events

You can observe responses globally using `IgniterCaller.on()`:

```ts
import { IgniterCaller } from '@igniter-js/caller'

const unsubscribe = IgniterCaller.on(/^\/users/, (result, ctx) => {
  console.log(`[${ctx.method}] ${ctx.url}`, {
    ok: !result.error,
    status: result.status,
  })
})

// later
unsubscribe()
```

## Error Handling

All predictable failures return an `IgniterCallerError` with stable error codes.

```ts
import { IgniterCallerError } from '@igniter-js/caller'

const result = await api.get('/users').execute()

if (result.error) {
  if (IgniterCallerError.is(result.error)) {
    console.error(result.error.code, result.error.operation)
  }
  throw result.error
}

// Response includes status and headers
console.log(result.status) // 200
console.log(result.headers?.get('x-request-id'))
```

## API Reference

### `IgniterCaller.create()`

Creates a new caller builder.

### Builder Methods

| Method | Description |
|--------|-------------|
| `.withBaseUrl(url)` | Sets the base URL for all requests |
| `.withHeaders(headers)` | Sets default headers |
| `.withCookies(cookies)` | Sets default cookies |
| `.withLogger(logger)` | Attaches a logger |
| `.withRequestInterceptor(fn)` | Adds a request interceptor |
| `.withResponseInterceptor(fn)` | Adds a response interceptor |
| `.withStore(store, options)` | Configures a persistent store |
| `.withSchemas(schemas, options)` | Configures schema validation |
| `.build()` | Builds the caller instance |

### Request Methods

| Method | Description |
|--------|-------------|
| `.get(url?)` | Creates a GET request |
| `.post(url?)` | Creates a POST request |
| `.put(url?)` | Creates a PUT request |
| `.patch(url?)` | Creates a PATCH request |
| `.delete(url?)` | Creates a DELETE request |
| `.head(url?)` | Creates a HEAD request |
| `.request(options)` | Executes request directly (axios-style) |

### Request Builder Methods

| Method | Description |
|--------|-------------|
| `.url(url)` | Sets the URL |
| `.body(body)` | Sets the request body |
| `.params(params)` | Sets query parameters |
| `.headers(headers)` | Merges additional headers |
| `.timeout(ms)` | Sets request timeout |
| `.cache(cache, key?)` | Sets cache strategy |
| `.stale(ms)` | Sets cache stale time |
| `.retry(attempts, options)` | Configures retry behavior |
| `.fallback(fn)` | Provides fallback value |
| `.responseType(schema?)` | Sets expected response type |
| `.execute()` | Executes the request |

### Static Methods

| Method | Description |
|--------|-------------|
| `IgniterCaller.on(pattern, callback)` | Registers event listener |
| `IgniterCaller.off(pattern, callback?)` | Removes event listener |
| `IgniterCaller.invalidate(key)` | Invalidates cache entry |
| `IgniterCaller.invalidatePattern(pattern)` | Invalidates cache by pattern |
| `IgniterCaller.batch(requests)` | Executes requests in parallel |

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE) for details.

## Links

- **Documentation:** https://igniterjs.com/docs
- **GitHub:** https://github.com/felipebarcelospro/igniter-js
- **NPM:** https://www.npmjs.com/package/@igniter-js/caller
- **Issues:** https://github.com/felipebarcelospro/igniter-js/issues
