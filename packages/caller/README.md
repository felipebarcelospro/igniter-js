# @igniter-js/caller

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/caller.svg)](https://www.npmjs.com/package/@igniter-js/caller)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe HTTP client for Igniter.js apps. Built on top of `fetch`, it gives you a fluent request builder, interceptors, retries, caching (memory or store), schema validation (Standard Schema V1), and global response events.

## Features

- ✅ **Fluent API** - `IgniterCaller.create().withBaseUrl(...).build()`
- ✅ **Interceptors** - modify requests and responses in one place
- ✅ **Retries** - linear or exponential backoff + status-based retry
- ✅ **Caching** - in-memory cache + optional persistent store adapter
- ✅ **Schema Validation** - validate request/response using `StandardSchemaV1`
- ✅ **Zod Support** - optional per-request `responseType(zodSchema)` validation
- ✅ **Global Events** - observe responses for logging/telemetry/cache invalidation

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

const result = await api
  .get()
  .url('/users')
  .params({ page: 1 })
  .stale(10_000) // cache for 10s
  .execute<{ id: string; name: string }[]>()

if (result.error) {
  throw result.error
}

console.log(result.data)
```

## Interceptors

Interceptors are great for cross-cutting concerns like auth headers, request ids, logging, and response normalization.

```ts
import { IgniterCaller } from '@igniter-js/caller'

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
  .get()
  .url('/health')
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
const users = await api.get().url('/users').stale(30_000).execute()
```

### Store-based caching

You can plug any store that matches `IgniterCallerStoreAdapter` (Redis, etc.).

```ts
import { IgniterCaller } from '@igniter-js/caller'

const store = {
  client: null,
  async get(key) {
    return null
  },
  async set(key, value) {
    void key
    void value
  },
  async delete(key) {
    void key
  },
  async has(key) {
    void key
    return false
  },
}

const api = IgniterCaller.create().withStore(store, {
  ttl: 3600,
  keyPrefix: 'igniter:caller:',
}).build()
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

const result = await api.get().url('/users/123').execute()
```

## Zod `responseType()`

For one-off validation, you can attach a Zod schema to a request:

```ts
import { z } from 'zod'

const result = await api
  .get()
  .url('/users')
  .responseType(z.array(z.object({ id: z.string(), name: z.string() })))
  .execute()
```

## Global Events

You can observe responses globally using `IgniterCaller.on()`:

```ts
import { IgniterCaller } from '@igniter-js/caller'

const unsubscribe = IgniterCaller.on(/^\/users/, (result, ctx) => {
  console.log(`[${ctx.method}] ${ctx.url}`, {
    ok: !result.error,
  })
})

// later
unsubscribe()
```

## Error Handling

All predictable failures return an `IgniterCallerError` with stable error codes.

```ts
import { IgniterCallerError } from '@igniter-js/caller'

const result = await api.get().url('/users').execute()

if (result.error) {
  if (IgniterCallerError.is(result.error)) {
    console.error(result.error.code, result.error.operation)
  }
  throw result.error
}
```

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE) for details.

## Links

- **Documentation:** https://igniterjs.com/docs
- **GitHub:** https://github.com/felipebarcelospro/igniter-js
- **NPM:** https://www.npmjs.com/package/@igniter-js/caller
- **Issues:** https://github.com/felipebarcelospro/igniter-js/issues
