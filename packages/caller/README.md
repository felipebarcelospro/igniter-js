# @igniter-js/caller

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/caller)](https://www.npmjs.com/package/@igniter-js/caller)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange)](https://bun.sh)

**End-to-end type-safe HTTP client**  
Built on `fetch` with interceptors, retries, caching, schema validation, and full observability.

[Quick Start](#-quick-start) • [Documentation](https://igniterjs.com/docs/caller) • [Examples](#-real-world-examples) • [API Reference](#-api-reference)

</div>

---

## ✨ Why @igniter-js/caller?

Making API calls shouldn't require choosing between developer experience and runtime safety. Whether you're building a SaaS platform, a mobile backend, or a microservices architecture, you need:

- ✅ **End-to-end type safety** — Catch API mismatches at build time, not in production
- ✅ **Zero configuration** — Works anywhere `fetch` works (Node 18+, Bun, Deno, browsers)
- ✅ **Production resilience** — Retries, timeouts, fallbacks, and caching built-in
- ✅ **Full observability** — Telemetry, logging, and global events for every request
- ✅ **Schema validation** — Runtime type checking with Zod, Valibot, or any StandardSchemaV1 library
- ✅ **Developer experience** — Fluent API, autocomplete everywhere, zero boilerplate

---

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install @igniter-js/caller

# Using pnpm
pnpm add @igniter-js/caller

# Using yarn
yarn add @igniter-js/caller

# Using bun
bun add @igniter-js/caller
```

**Optional dependencies:**

```bash
# For schema validation (any StandardSchemaV1 library)
npm install zod

# For telemetry features
npm install @igniter-js/telemetry
```

> **Note:** `@igniter-js/common` is installed automatically. `zod` is optional for schema validation. Install `@igniter-js/telemetry` if you plan to use `withTelemetry()` or `@igniter-js/caller/telemetry`.

### Your First API Call (60 seconds)

```typescript
import { IgniterCaller } from '@igniter-js/caller';

// 1️⃣ Create the client
const api = IgniterCaller.create()
  .withBaseUrl('https://api.github.com')
  .withHeaders({ 
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  })
  .build();

// 2️⃣ Make a request
const result = await api.get('/users/octocat').execute();

// 3️⃣ Handle the response
if (result.error) {
  console.error('Request failed:', result.error.message);
} else {
  console.log('User:', result.data);
}
```

**✅ Success!** You just made a type-safe HTTP request with zero configuration.

---

## 🎯 Core Concepts

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      Your Application                             │
├──────────────────────────────────────────────────────────────────┤
│  api.get('/users').params({ page: 1 }).execute()                │
└────────────┬─────────────────────────────────────────────────────┘
             │ Type-safe fluent API
             ▼
┌──────────────────────────────────────────────────────────────────┐
│              IgniterCallerBuilder (Immutable)                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Configuration:                                             │ │
│  │  - baseURL, headers, cookies                               │ │
│  │  - requestInterceptors, responseInterceptors                │ │
│  │  - store, schemas, telemetry, logger                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────┬─────────────────────────────────────────────────────┘
             │ .build()
             ▼
┌──────────────────────────────────────────────────────────────────┐
│              IgniterCallerManager (Runtime)                       │
│  - get/post/put/patch/delete/head() → RequestBuilder           │
│  - request() → axios-style direct execution                    │
│  - Static: batch(), on(), invalidate()                         │
└────────────┬─────────────────────────────────────────────────────┘
             │ Creates
             ▼
┌──────────────────────────────────────────────────────────────────┐
│          IgniterCallerRequestBuilder (Per-Request)                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Configuration:                                             │ │
│  │  - url, method, body, params, headers                      │ │
│  │  - timeout, cache, staleTime, retry                        │ │
│  │  - fallback, responseType (schema or type marker)          │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────┬─────────────────────────────────────────────────────┘
             │ .execute()
             ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Execution Pipeline                                │
│  1. Cache Check (if staleTime set)                              │
│  2. Request Interceptors                                         │
│  3. Request Validation (if schema defined)                       │
│  4. Fetch with Retry Logic                                       │
│  5. Response Parsing (Content-Type auto-detect)                  │
│  6. Response Validation (if schema defined)                      │
│  7. Response Interceptors                                        │
│  8. Cache Store (if successful)                                  │
│  9. Fallback (if failed and fallback set)                        │
│  10. Telemetry Emission                                         │
│  11. Global Event Emission                                       │
└──────────────────────────────────────────────────────────────────┘
```

### Key Abstractions

- **Builder** → Immutable configuration (`.withHeaders()`, `.withSchemas()`)
- **Manager** → Operational HTTP client instance (`.get()`, `.post()`)
- **RequestBuilder** → Per-request fluent API (`.body()`, `.retry()`, `.execute()`)
- **Interceptors** → Request/Response transformation pipeline
- **Schemas** → Type inference + runtime validation (StandardSchemaV1)
- **Cache** → In-memory or store-based (Redis, etc.)
- **Events** → Global observation for logging/telemetry

---

## 📖 Usage Examples

### Basic Usage

```typescript
import { IgniterCaller } from '@igniter-js/caller';

const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  .withHeaders({ Authorization: `Bearer ${process.env.API_TOKEN}` })
  .build();

// GET request
const users = await api.get('/users').execute();

// POST request with body
const newUser = await api
  .post('/users')
  .body({ name: 'John Doe', email: 'john@example.com' })
  .execute();

// PUT request with params
const updated = await api
  .put('/users/:id')
  .params({ id: '123' })
  .body({ name: 'Jane Doe' })
  .execute();

// DELETE request
const deleted = await api.delete('/users/123').execute();

// Check for errors
if (users.error) {
  console.error('Request failed:', users.error.message);
  throw users.error;
}

console.log('Users:', users.data);
```

### Query Parameters

```typescript
// Using .params()
const result = await api
  .get('/search')
  .params({ q: 'typescript', page: 1, limit: 10 })
  .execute();

// GET with body (auto-converted to query params)
const result = await api
  .get('/search')
  .body({ q: 'typescript', page: 1 })
  .execute();
// Becomes: GET /search?q=typescript&page=1
```

### Request Headers

```typescript
// Per-request headers (merged with defaults)
const result = await api
  .get('/users')
  .headers({ 'X-Custom-Header': 'value' })
  .execute();

// Override default headers
const result = await api
  .get('/public/data')
  .headers({ Authorization: '' }) // Remove auth for this request
  .execute();
```

### Timeout & Retry

```typescript
// Set timeout
const result = await api
  .get('/slow-endpoint')
  .timeout(5000) // 5 seconds
  .execute();

// Retry with exponential backoff
const result = await api
  .get('/unreliable-endpoint')
  .retry(3, {
    baseDelay: 500,
    backoff: 'exponential',
    retryOnStatus: [408, 429, 500, 502, 503, 504],
  })
  .execute();
```

### Caching

```typescript
// In-memory cache
const result = await api
  .get('/users')
  .stale(60_000) // Cache for 60 seconds
  .execute();

// Custom cache key
const result = await api
  .get('/users')
  .cache('default', 'custom-cache-key')
  .stale(60_000)
  .execute();

// Store-based caching (Redis, etc.)
const api = IgniterCaller.create()
  .withStore(redisAdapter, {
    ttl: 3600,
    keyPrefix: 'api:',
  })
  .build();

const result = await api
  .get('/users')
  .stale(300_000) // 5 minutes
  .execute();
```

### Fallback Values

```typescript
// Provide fallback if request fails
const result = await api
  .get('/optional-data')
  .fallback(() => ({ default: 'value' }))
  .execute();

// result.data will be fallback value if request fails
// result.error will still contain the original error
```

### axios-Style Direct Requests

```typescript
// Using .request() method
const result = await api.request({
  method: 'POST',
  url: '/users',
  body: { name: 'John' },
  headers: { 'X-Custom': 'value' },
  timeout: 5000,
  retry: { maxAttempts: 3, backoff: 'exponential' },
  staleTime: 30_000,
});
```

### Interceptors

```typescript
const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  
  // Request interceptor (modify before sending)
  .withRequestInterceptor(async (request) => {
    return {
      ...request,
      headers: {
        ...request.headers,
        'X-Request-ID': crypto.randomUUID(),
        'X-Timestamp': new Date().toISOString(),
      },
    };
  })
  
  // Response interceptor (transform after receiving)
  .withResponseInterceptor(async (response) => {
    // Normalize empty responses
    if (response.data === '') {
      return { ...response, data: null as any };
    }
    
    // Add custom metadata
    return {
      ...response,
      metadata: {
        cached: response.headers?.get('X-Cache') === 'HIT',
        duration: parseInt(response.headers?.get('X-Duration') || '0'),
      },
    };
  })
  
  .build();
```

### Schema Validation (Type-Safe)

```typescript
import { IgniterCaller, IgniterCallerSchema } from '@igniter-js/caller';
import { z } from 'zod';

// Define schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const ErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
});

// Build schema registry
const apiSchemas = IgniterCallerSchema.create()
  .schema('User', UserSchema)
  .schema('Error', ErrorSchema)
  
  .path('/users/:id', (path) =>
    path.get({
      responses: {
        200: path.ref('User').schema,
        404: path.ref('Error').schema,
      },
    })
  )
  
  .path('/users', (path) =>
    path.get({
      responses: {
        200: path.ref('User').array(),
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
  
  .build();

// Create typed client
const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  .withSchemas(apiSchemas, { mode: 'strict' })
  .build();

// Full type inference!
const result = await api.get('/users/:id')
  .params({ id: '123' }) // ✅ params typed from path pattern
  .execute();

// ✅ result.data is User | undefined (typed from schema)
console.log(result.data?.name);

// POST with typed body
const created = await api.post('/users')
  .body({ name: 'John', email: 'john@example.com' }) // ✅ body is typed
  .execute();

// ✅ created.data is User | undefined
```

### Global Events

```typescript
import { IgniterCallerManager } from '@igniter-js/caller';

// Listen to all requests
const unsubscribe = IgniterCallerManager.on(/.*/, (result, ctx) => {
  console.log(`[${ctx.method}] ${ctx.url}`, {
    status: result.status,
    success: !result.error,
    duration: Date.now() - ctx.timestamp,
  });
});

// Listen to specific paths
IgniterCallerManager.on(/^\/users/, (result, ctx) => {
  if (result.error) {
    console.error('User API failed:', result.error.message);
  }
});

// Listen to exact URL
IgniterCallerManager.on('/auth/login', (result, ctx) => {
  if (!result.error) {
    console.log('User logged in successfully');
  }
});

// Cleanup listener
unsubscribe();
```

### Typed Mocking

```typescript
import { IgniterCaller, IgniterCallerMock } from '@igniter-js/caller';
import { z } from 'zod';

const schemas = {
  '/users/:id': {
    GET: {
      responses: {
        200: z.object({ id: z.string(), name: z.string() }),
      },
    },
  },
  '/users': {
    POST: {
      request: z.object({ name: z.string() }),
      responses: {
        201: z.object({ id: z.string(), name: z.string() }),
      },
    },
  },
};

// Create mock
const mock = IgniterCallerMock.create()
  .withSchemas(schemas)
  
  // Static response
  .mock('/users/:id', {
    GET: {
      response: { id: 'user_123', name: 'John Doe' },
      status: 200,
    },
  })
  
  // Dynamic response
  .mock('/users', {
    POST: (request) => ({
      response: {
        id: crypto.randomUUID(),
        name: request.body.name,
      },
      status: 201,
      delayMs: 150, // Simulate network delay
    }),
  })
  
  .build();

// Create API with mock
const api = IgniterCaller.create()
  .withSchemas(schemas)
  .withMock({ enabled: true, mock })
  .build();

// All requests use mock
const user = await api.get('/users/:id').params({ id: '123' }).execute();
console.log(user.data); // { id: 'user_123', name: 'John Doe' }
```

---

## 🌍 Real-World Examples

### Example 1: E-Commerce Product Catalog

```typescript
import { IgniterCaller } from '@igniter-js/caller';
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  inStock: z.boolean(),
  images: z.array(z.string().url()),
});

const api = IgniterCaller.create()
  .withBaseUrl('https://shop-api.example.com')
  .withHeaders({ 'X-API-Key': process.env.SHOP_API_KEY! })
  .build();

// Fetch products with caching
async function getProducts(category?: string) {
  const result = await api
    .get('/products')
    .params(category ? { category } : {})
    .responseType(z.object({
      products: z.array(ProductSchema),
      total: z.number(),
    }))
    .stale(300_000) // 5 minutes
    .execute();

  if (result.error) {
    throw new Error(`Failed to fetch products: ${result.error.message}`);
  }

  return result.data;
}

// Search with debouncing
let searchAbortController: AbortController | null = null;

async function searchProducts(query: string) {
  // Cancel previous search
  searchAbortController?.abort();
  searchAbortController = new AbortController();

  const result = await api
    .get('/products/search')
    .params({ q: query })
    .timeout(3000)
    .execute();

  return result.data?.products || [];
}

// Usage
const products = await getProducts('electronics');
console.log(`Found ${products.total} products`);
```

### Example 2: Payment Processing with Retries

```typescript
import { IgniterCaller } from '@igniter-js/caller';

const api = IgniterCaller.create()
  .withBaseUrl('https://payments-api.example.com')
  .withHeaders({
    'X-API-Key': process.env.PAYMENT_API_KEY!,
    'Content-Type': 'application/json',
  })
  .build();

async function processPayment(payment: {
  amount: number;
  currency: string;
  recipient: { accountNumber: string };
}) {
  const result = await api
    .post('/payments')
    .body(payment)
    .timeout(10_000) // 10 seconds
    .retry(3, {
      baseDelay: 500,
      backoff: 'exponential',
      retryOnStatus: [503, 504], // Only retry on server errors
    })
    .fallback(() => ({
      id: 'fallback',
      status: 'pending',
      message: 'Payment queued for retry',
    }))
    .execute();

  if (result.error) {
    console.error('Payment failed:', result.error.message);
    // Log to monitoring service
    throw result.error;
  }

  return result.data;
}
```

### Example 3: Real-Time Analytics Dashboard

```typescript
import { IgniterCaller, IgniterCallerManager } from '@igniter-js/caller';

const api = IgniterCaller.create()
  .withBaseUrl('https://analytics-api.example.com')
  .build();

// Global event listener for monitoring
IgniterCallerManager.on(/^\/metrics/, (result, ctx) => {
  if (!result.error) {
    console.log(`Metrics fetched in ${Date.now() - ctx.timestamp}ms`);
  }
});

// Polling with cache
async function startMetricsPolling(intervalMs: number) {
  const poll = async () => {
    const result = await api
      .get('/metrics')
      .params({
        start: new Date(Date.now() - 300_000).toISOString(),
        end: new Date().toISOString(),
      })
      .stale(30_000) // 30 seconds
      .execute();

    if (!result.error) {
      updateDashboard(result.data);
    }
  };

  poll(); // Initial fetch
  return setInterval(poll, intervalMs);
}

const pollInterval = await startMetricsPolling(30_000);
```

### Example 4: Multi-Tenant SaaS API Client

```typescript
import { IgniterCaller } from '@igniter-js/caller';

function createTenantAPI(tenantId: string, apiKey: string) {
  return IgniterCaller.create()
    .withBaseUrl('https://saas-api.example.com')
    .withHeaders({
      'X-Tenant-ID': tenantId,
      'Authorization': `Bearer ${apiKey}`,
    })
    .build();
}

const tenant1API = createTenantAPI('tenant_1', process.env.TENANT_1_KEY!);
const tenant2API = createTenantAPI('tenant_2', process.env.TENANT_2_KEY!);

// Isolated requests per tenant
const tenant1Users = await tenant1API.get('/users').execute();
const tenant2Users = await tenant2API.get('/users').execute();
```

### Example 5: GraphQL-Style Batch Requests

```typescript
import { IgniterCallerManager } from '@igniter-js/caller';

async function fetchDashboardData() {
  const [users, posts, comments] = await IgniterCallerManager.batch([
    api.get('/users').params({ limit: 10 }).execute(),
    api.get('/posts').params({ limit: 20 }).execute(),
    api.get('/comments').params({ limit: 50 }).execute(),
  ]);

  return {
    users: users.data,
    posts: posts.data,
    comments: comments.data,
  };
}
```

---

## 📚 API Reference

### IgniterCaller (Main Builder)

The main entry point for creating an HTTP client.

```typescript
class IgniterCallerBuilder<TSchemas> {
  static create(): IgniterCallerBuilder<{}>
  
  withBaseUrl(url: string): this
  withHeaders(headers: Record<string, string>): this
  withCookies(cookies: Record<string, string>): this
  withLogger(logger: IgniterLogger): this
  withRequestInterceptor(interceptor: RequestInterceptor): this
  withResponseInterceptor(interceptor: ResponseInterceptor): this
  withStore(store: StoreAdapter, options?: StoreOptions): this
  withSchemas<T>(schemas: T, validation?: ValidationOptions): Builder<T>
  withTelemetry(telemetry: TelemetryManager): this
  withMock(config: MockConfig): this
  
  build(): IgniterCallerManager<TSchemas>
}
```

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `create()` | None | `Builder<{}>` | Static factory for new builder |
| `withBaseUrl()` | `url: string` | `this` | Set base URL prefix for all requests |
| `withHeaders()` | `headers: Record<string, string>` | `this` | Merge default headers into every request |
| `withCookies()` | `cookies: Record<string, string>` | `this` | Set default cookies (sent as `Cookie` header) |
| `withLogger()` | `logger: IgniterLogger` | `this` | Attach logger for request lifecycle logging |
| `withRequestInterceptor()` | `interceptor: Function` | `this` | Add request modifier (runs before fetch) |
| `withResponseInterceptor()` | `interceptor: Function` | `this` | Add response transformer (runs after fetch) |
| `withStore()` | `store: Adapter, options?` | `this` | Configure persistent cache (Redis, etc.) |
| `withSchemas()` | `schemas: Map, validation?` | `Builder<T>` | Enable type inference + validation |
| `withTelemetry()` | `telemetry: Manager` | `this` | Connect to telemetry system |
| `withMock()` | `config: MockConfig` | `this` | Enable mock mode for testing |
| `build()` | None | `Manager` | Build the operational client instance |

**Example:**

```typescript
const api = IgniterCaller.create()
  .withBaseUrl('https://api.example.com')
  .withHeaders({ Authorization: 'Bearer token' })
  .withStore(redisAdapter)
  .withSchemas(schemas)
  .build();
```

---

### IgniterCallerManager (HTTP Client)

The operational HTTP client instance for making requests.

```typescript
class IgniterCallerManager<TSchemas> {
  // HTTP Methods
  get<T>(url?: string): RequestBuilder<T>
  post<T>(url?: string): RequestBuilder<T>
  put<T>(url?: string): RequestBuilder<T>
  patch<T>(url?: string): RequestBuilder<T>
  delete<T>(url?: string): RequestBuilder<T>
  head<T>(url?: string): RequestBuilder<T>
  
  // Direct execution (axios-style)
  request<T>(options: DirectRequestOptions): Promise<ApiResponse<T>>
  
  // Static methods
  static on(pattern: string | RegExp, callback: EventCallback): () => void
  static off(pattern: string | RegExp, callback?: EventCallback): void
  static invalidate(key: string): Promise<void>
  static invalidatePattern(pattern: string): Promise<void>
  static batch<T extends Promise<any>[]>(requests: T): Promise<AwaitedArray<T>>
}
```

**Methods:**

| Method | Arguments | Returns | Description |
|--------|-----------|---------|-------------|
| `get()` | `url?: string` | `RequestBuilder` | Create GET request |
| `post()` | `url?: string` | `RequestBuilder` | Create POST request |
| `put()` | `url?: string` | `RequestBuilder` | Create PUT request |
| `patch()` | `url?: string` | `RequestBuilder` | Create PATCH request |
| `delete()` | `url?: string` | `RequestBuilder` | Create DELETE request |
| `head()` | `url?: string` | `RequestBuilder` | Create HEAD request |
| `request()` | `options: DirectRequestOptions` | `Promise<ApiResponse>` | Execute request directly |
| `on()` | `pattern, callback` | `unsubscribe: Function` | Register global event listener |
| `off()` | `pattern, callback?` | `void` | Remove event listener(s) |
| `invalidate()` | `key: string` | `Promise<void>` | Invalidate specific cache entry |
| `invalidatePattern()` | `pattern: string` | `Promise<void>` | Invalidate cache by pattern |
| `batch()` | `requests: Promise[]` | `Promise<Results[]>` | Execute requests in parallel |

---

### RequestBuilder (Fluent Request API)

Per-request configuration builder.

```typescript
class IgniterCallerRequestBuilder<TResponse> {
  withLogger(logger: IgniterLogger): this
  url(url: string): this
  body<T>(body: T): this
  params<T>(params: T): this
  headers(headers: Record<string, string>): this
  timeout(ms: number): this
  cache(cache: RequestCache, key?: string): this
  stale(ms: number): this
  retry(attempts: number, options?: RetryOptions): this
  fallback<T>(fn: () => T): this
  responseType<T>(schema?: StandardSchemaV1<T>): RequestBuilder<T>
  getFile(url: string): { execute(): Promise<IgniterCallerFileResponse> }
  
  execute(): Promise<ApiResponse<TResponse>>
}
```

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `withLogger()` | `logger: IgniterLogger` | `this` | Override logger for this request |
| `url()` | `url: string` | `this` | Set request URL |
| `body()` | `body: any` | `this` | Set request body (JSON, FormData, Blob) |
| `params()` | `params: Record<string, string \| number \| boolean>` | `this` | Set query parameters |
| `headers()` | `headers: Record<string, string>` | `this` | Merge additional headers |
| `timeout()` | `ms: number` | `this` | Set request timeout |
| `cache()` | `cache: RequestCache, key?: string` | `this` | Set fetch cache mode + optional cache key |
| `stale()` | `ms: number` | `this` | Set cache stale time |
| `retry()` | `attempts: number, options?` | `this` | Configure retry behavior |
| `fallback()` | `fn: () => T` | `this` | Provide fallback value on error |
| `responseType()` | `schema?: StandardSchemaV1` | `RequestBuilder<T>` | Set expected response type (validates JSON/XML/CSV) |
| `getFile()` | `url: string` | `{ execute(): Promise<IgniterCallerFileResponse> }` | **Deprecated**. Use `responseType<File>().execute()` instead |
| `execute()` | None | `Promise<ApiResponse>` | Execute the request |

---

### Types

#### ApiResponse

```typescript
interface IgniterCallerApiResponse<TData> {
  data?: TData;
  error?: IgniterCallerError;
  status?: number;
  headers?: Headers;
}
```

#### RetryOptions

```typescript
interface IgniterCallerRetryOptions {
  maxAttempts: number;
  baseDelay?: number;
  backoff?: 'linear' | 'exponential';
  retryOnStatus?: number[];
}
```

#### ValidationOptions

```typescript
interface IgniterCallerSchemaValidationOptions {
  mode?: 'strict' | 'soft' | 'off';
  onValidationError?: (error: ValidationError) => void;
}
```

---

## 🔧 Configuration

### Store Adapter

Configure persistent caching with Redis or other stores:

```typescript
interface IgniterCallerStoreAdapter<TClient = any> {
  client: TClient | null;
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { ttl?: number; [key: string]: any },
  ): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

interface IgniterCallerStoreOptions {
  ttl?: number;
  keyPrefix?: string;
  fallbackToFetch?: boolean;
}
```

**Example:**

```typescript
import { IgniterCaller } from '@igniter-js/caller';

const redisAdapter: IgniterCallerStoreAdapter = {
  client: redis,
  async get(key) { return await redis.get(key); },
  async set(key, value, options) {
    const ttl = options?.ttl ?? 3600;
    await redis.setex(key, ttl, value);
  },
  async delete(key) { await redis.del(key); },
  async has(key) { return (await redis.exists(key)) === 1; },
};

const api = IgniterCaller.create()
  .withStore(redisAdapter, {
    ttl: 3600,
    keyPrefix: 'api:',
  })
  .build();
```

### Schema Validation

Enable runtime validation with any StandardSchemaV1 library:

```typescript
import { z } from 'zod';

const api = IgniterCaller.create()
  .withSchemas(schemas, {
    mode: 'strict', // 'strict' | 'soft' | 'off'
    onValidationError: (error) => {
      console.error('Validation failed:', error);
    },
  })
  .build();
```

**Modes:**
- `strict`: Throw on validation failure (default)
- `soft`: Log error and continue
- `off`: Skip validation

---

## 🧪 Testing

### Unit Testing with Mock Adapter

```typescript
import { describe, it, expect } from 'vitest';
import { IgniterCaller, IgniterCallerMock } from '@igniter-js/caller';
import { MockCallerStoreAdapter } from '@igniter-js/caller/adapters';

describe('API Client', () => {
  const mock = IgniterCallerMock.create()
    .mock('/users/:id', {
      GET: (request) => ({
        response: { id: request.params.id, name: 'Test User' },
        status: 200,
      }),
    })
    .build();

  const api = IgniterCaller.create()
    .withMock({ enabled: true, mock })
    .build();

  it('should fetch user', async () => {
    const result = await api.get('/users/:id').params({ id: '123' }).execute();
    
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ id: '123', name: 'Test User' });
  });

  it('should handle errors', async () => {
    const mock = IgniterCallerMock.create()
      .mock('/error', {
        GET: { response: null, status: 500 },
      })
      .build();

    const api = IgniterCaller.create()
      .withMock({ enabled: true, mock })
      .build();

    const result = await api.get('/error').execute();
    
    expect(result.error).toBeDefined();
  });
});
```

### Integration Testing

```typescript
import { IgniterCaller } from '@igniter-js/caller';

describe('Integration: Real API', () => {
  const api = IgniterCaller.create()
    .withBaseUrl(process.env.TEST_API_URL!)
    .build();

  it('should fetch users from real API', async () => {
    const result = await api.get('/users').execute();
    
    expect(result.error).toBeUndefined();
    expect(Array.isArray(result.data)).toBe(true);
  });
});
```

---

## 🎨 Best Practices

### ✅ Do

```typescript
// ✅ Use immutable builders
const api = IgniterCaller.create()
  .withBaseUrl('...')
  .withHeaders({ ... })
  .build();

// ✅ Handle errors explicitly
const result = await api.get('/users').execute();
if (result.error) {
  console.error(result.error);
  throw result.error;
}

// ✅ Use schema validation for type safety
const api = IgniterCaller.create()
  .withSchemas(schemas, { mode: 'strict' })
  .build();

// ✅ Cache expensive requests
const result = await api
  .get('/expensive')
  .stale(300_000) // 5 minutes
  .execute();

// ✅ Use retry for transient failures
const result = await api
  .get('/unreliable')
  .retry(3, { backoff: 'exponential' })
  .execute();

// ✅ Provide fallbacks for optional data
const result = await api
  .get('/optional')
  .fallback(() => defaultValue)
  .execute();
```

### ❌ Don't

```typescript
// ❌ Don't mutate builder state
const builder = IgniterCaller.create();
builder.state.baseURL = 'https://api.example.com'; // ❌ Won't work

// ❌ Don't ignore errors
const result = await api.get('/users').execute();
console.log(result.data); // ❌ Might be undefined

// ❌ Don't skip validation in production
const api = IgniterCaller.create()
  .withSchemas(schemas, { mode: 'off' }) // ❌ Risky
  .build();

// ❌ Don't cache mutations
const result = await api
  .post('/users')
  .stale(60_000) // ❌ Don't cache POST/PUT/PATCH/DELETE
  .execute();

// ❌ Don't retry non-idempotent operations
const result = await api
  .post('/payments')
  .retry(3) // ❌ Might duplicate payment
  .execute();
```

---

## 🚨 Troubleshooting

### Error: Request timeout

**Cause:** Request took longer than configured timeout

**Solution:**

```typescript
// Increase timeout
const result = await api
  .get('/slow-endpoint')
  .timeout(30_000) // 30 seconds
  .execute();
```

---

### Error: Validation failed

**Cause:** Response doesn't match schema

**Solution:**

```typescript
// Check schema definition
const UserSchema = z.object({
  id: z.string(),
  name: z.string(), // ❌ API returns `username`
});

// Fix schema
const UserSchema = z.object({
  id: z.string(),
  username: z.string(), // ✅ Matches API
});

// Or use soft mode
const api = IgniterCaller.create()
  .withSchemas(schemas, { mode: 'soft' })
  .build();
```

---

### Error: Cache not invalidating

**Cause:** Cache key doesn't match

**Solution:**

```typescript
// Ensure consistent cache keys
const result1 = await api.get('/users').cache('default', 'users-list').execute();

// Later, invalidate with same key
await IgniterCallerManager.invalidate('users-list');
```

---

### Performance: Slow requests

**Diagnosis:** No caching or retries

**Solution:**

```typescript
// Enable caching for read-heavy endpoints
const result = await api
  .get('/heavy-computation')
  .stale(600_000) // 10 minutes
  .execute();

// Use store-based cache for persistence
const api = IgniterCaller.create()
  .withStore(redisAdapter)
  .build();
```

---

### Type Inference: Not working

**Cause:** Schema path doesn't match request URL

**Solution:**

```typescript
// ❌ Schema path doesn't match
const schemas = {
  '/users': { GET: { responses: { 200: UserSchema } } }
};

const result = await api.get('/users/list').execute(); // ❌ No match

// ✅ Fix schema or URL
const schemas = {
  '/users/list': { GET: { responses: { 200: UserSchema } } }
};

const result = await api.get('/users/list').execute(); // ✅ Typed
```

---

## 🔗 Framework Integration

### Next.js (App Router)

```typescript
// lib/api.ts
import { IgniterCaller } from '@igniter-js/caller';

export const api = IgniterCaller.create()
  .withBaseUrl(process.env.NEXT_PUBLIC_API_URL!)
  .build();

// app/users/page.tsx
import { api } from '@/lib/api';

export default async function UsersPage() {
  const result = await api.get('/users').execute();
  
  if (result.error) {
    throw new Error('Failed to fetch users');
  }
  
  return (
    <div>
      {result.data.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

### React with TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const result = await api.get('/users').execute();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

function Users() {
  const { data, isLoading, error } = useUsers();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <ul>{data.map(...)}</ul>;
}
```

### Express.js

```typescript
import express from 'express';
import { IgniterCaller } from '@igniter-js/caller';

const app = express();
const api = IgniterCaller.create()
  .withBaseUrl('https://external-api.example.com')
  .build();

app.get('/proxy/users', async (req, res) => {
  const result = await api.get('/users').execute();
  
  if (result.error) {
    return res.status(result.status || 500).json({
      error: result.error.message,
    });
  }
  
  res.json(result.data);
});
```

---

## 📊 Performance Tips

1. **Use caching aggressively** for read-heavy endpoints
2. **Enable store-based caching** (Redis) for distributed systems
3. **Batch parallel requests** with `IgniterCallerManager.batch()`
4. **Set appropriate timeouts** to fail fast
5. **Use retry with exponential backoff** for transient failures
6. **Minimize interceptor overhead** (avoid heavy computation)
7. **Enable compression** via headers (`Accept-Encoding: gzip`)

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
git clone https://github.com/felipebarcelospro/igniter-js.git
cd igniter-js/packages/caller
npm install
npm run build
npm test
```

---

## 📄 License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro)

---

## 🔗 Related Packages

- [@igniter-js/core](../core) — HTTP framework core
- [@igniter-js/telemetry](../telemetry) — Observability system
- [@igniter-js/store](../store) — State management
- [Igniter.js Documentation](https://igniterjs.com)

---

## 💬 Community & Support

- 📚 [Documentation](https://igniterjs.com/docs/caller)
- 💬 [Discord Community](https://discord.gg/igniterjs)
- 🐛 [Report Issues](https://github.com/felipebarcelospro/igniter-js/issues)
- 🔒 [Security Policy](https://github.com/felipebarcelospro/igniter-js/security/policy)

---

**Built with ❤️ by the Igniter.js team**
