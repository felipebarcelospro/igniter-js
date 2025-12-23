# @igniter-js/store

A type-safe, multi-tenant distributed store library for Igniter.js with Redis support, scoped operations, and typed pub/sub.

## Features

- 🔑 **Key-Value Storage** - Fast get/set operations with TTL support
- 🔢 **Atomic Counters** - Thread-safe increment/decrement operations
- 🔒 **Distributed Claims** - SETNX-based distributed locks
- 📦 **Batch Operations** - Multi-key get/set for efficiency
- 📡 **Typed Pub/Sub** - Full TypeScript inference for channels with event context
- 📊 **Redis Streams** - Append and consumer group reading
- 🏢 **Multi-Tenant Scoping** - Hierarchical isolation with typed scope definitions
- 👤 **Actor Identification** - Track users/systems in event context
- 🎯 **Type-Safe** - End-to-end TypeScript inference

## Installation

```bash
npm install @igniter-js/store
# or
pnpm add @igniter-js/store
# or
yarn add @igniter-js/store
# or
bun add @igniter-js/store
```

For Redis support:

```bash
npm install ioredis
```

## Quick Start

```typescript
import { IgniterStore, IgniterStoreRedisAdapter } from '@igniter-js/store'
import Redis from 'ioredis'

// Create Redis client
const redis = new Redis()

// Create the store
const store = IgniterStore.create()
  .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
  .withService('my-api')
  .build()

// Use key-value operations
await store.kv.set('user:123', { name: 'Alice' }, { ttl: 3600 })
const user = await store.kv.get('user:123')
```

## API Reference

### Builder Configuration

```typescript
const store = IgniterStore.create()
  // Required: Storage adapter
  .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
  
  // Required: Service name (used in key prefix)
  .withService('my-api')
  
  // Optional: Custom serializer (default: JSON)
  .withSerializer({
    encode: JSON.stringify,
    decode: JSON.parse,
  })
  
  // Optional: Typed scope definitions (see Typed Scopes section)
  .addScope('organization', { required: true })
  .addScope('workspace', { description: 'Project workspace' })

  // Optional: Typed events (see Typed Events section)
  .addEvents(UserEvents)
  
  // Optional: Logger
  .withLogger(logger)
  
  // Optional: Telemetry (see Observability section)
  .withTelemetry(telemetry)
  
  .build()
```

### Key-Value Operations (`store.kv`)

```typescript
// Get a value
const user = await store.kv.get<User>('user:123')

// Set a value with optional TTL
await store.kv.set('user:123', userData, { ttl: 3600 })

// Check if key exists
const exists = await store.kv.exists('user:123')

// Remove a key
await store.kv.remove('user:123')

// Set expiration
await store.kv.expire('user:123', 1800)

// Touch (refresh TTL)
await store.kv.touch('user:123', 3600)
```

### Counter Operations (`store.counter`)

```typescript
// Increment by 1 (default)
const count = await store.counter.increment('page-views')

// Decrement by 1 (default)
const views = await store.counter.decrement('credits')

// Decrement by 10
const views = await store.counter.decrement('credits')

// Set expiration on counter
await store.counter.expire('daily-limit', 86400)
```

### Claim Operations (`store.claim`)

Distributed locks using SETNX:

```typescript
// Try to claim a lock
const claimed = await store.claim.once('process:abc', 'worker-1', { ttl: 30 })

if (claimed) {
  try {
    // We have the lock, do exclusive work
    await processJob()
  } finally {
    // Release by removing or letting it expire
    await store.kv.remove('claim:process:abc')
  }
}
```

### Batch Operations (`store.batch`)

```typescript
// Get multiple values
const users = await store.batch.get<User>(['user:1', 'user:2', 'user:3'])

// Set multiple values
await store.batch.set([
  { key: 'user:1', value: user1, ttl: 3600 },
  { key: 'user:2', value: user2, ttl: 3600 },
])
```

### Pub/Sub Operations (`store.events`)

Events now include a rich context envelope with metadata:

```typescript
// Subscribe to a channel - ctx includes full context
const unsubscribe = await store.events.subscribe('user:created', (ctx) => {
  console.log('Event type:', ctx.type)        // 'user:created'
  console.log('Event data:', ctx.data)        // { userId: '123', email: '...' }
  console.log('Timestamp:', ctx.timestamp)    // ISO timestamp
  console.log('Scope:', ctx.scope)            // { key: 'org', identifier: 'org_123' } or undefined
})

// Publish to a channel
await store.events.publish('user:created', { userId: '123', email: 'test@example.com' })

// Unsubscribe
await unsubscribe()
```

#### Event Context Structure

```typescript
interface EventContext<TData> {
  type: string            // Event channel name
  data: TData             // The actual message payload
  timestamp: string       // ISO 8601 timestamp
  scope?: {
    key: string           // Scope type (e.g., 'organization')
    identifier: string    // Scope value (e.g., 'org_123')
  }
}
```

### Stream Operations (`store.streams`)

```typescript
// Append to a stream
const messageId = await store.streams.append('events', { type: 'click', x: 100, y: 200 }, {
  maxLen: 10000,
  approximate: true,
})

// Create consumer group and read
const consumer = store.streams.group('processors', 'worker-1')
await consumer.ensure('events', { startId: '0' })

const messages = await consumer.read('events', { count: 10, blockMs: 5000 })

for (const msg of messages) {
  await processMessage(msg.message)
  await consumer.ack('events', [msg.id])
}
```

### Development Tools (`store.dev`)

```typescript
// Scan for keys matching a pattern
const result = await store.dev.scan('user:*', { count: 100 })
console.log(result.keys)

// Paginate through results
if (result.cursor !== '0') {
  const more = await store.dev.scan('user:*', { cursor: result.cursor })
}
```

### Scoped Operations (`store.scope`)

Multi-tenant isolation with hierarchical scopes:

```typescript
// Single scope
const orgStore = store.scope('organization', 'org_123')
await orgStore.kv.set('settings', { theme: 'dark' })
// Key: igniter:store:my-api:organization:org_123:kv:settings

// Chained scopes
const wsStore = orgStore.scope('workspace', 'ws_456')
await wsStore.kv.set('config', { ... })
// Key: igniter:store:my-api:organization:org_123:workspace:ws_456:kv:config

// Each scoped store has all the same APIs
await wsStore.counter.increment('api-calls')
await wsStore.events.publish('event', data)
```

### Typed Scopes with `addScope()`

Define allowed scopes at build time for type safety and runtime validation:

```typescript
const store = IgniterStore.create()
  .withAdapter(adapter)
  .withService('my-api')
  .addScope('organization', { required: true })  // Required scope
  .addScope('workspace')                         // Optional scope
  .build()

// TypeScript enforces valid scope keys
store.scope('organization', 'org_123')  // ✅ Valid
store.scope('workspace', 'ws_456')      // ✅ Valid
store.scope('invalid', 'id')            // ❌ TypeScript error + Runtime error

// With required scopes, runtime validation ensures proper usage
```

## Typed Events

Define schemas for compile-time type safety on pub/sub channels:

```typescript
import { z } from 'zod'
import { IgniterStore, IgniterStoreEvents, IgniterStoreRedisAdapter } from '@igniter-js/store'

// Define events per feature
const UserEvents = IgniterStoreEvents
  .create('user')
  .event('created', z.object({
    userId: z.string(),
    email: z.string().email(),
  }))
  .event('deleted', z.object({
    userId: z.string(),
  }))
  .group('notifications', (group) =>
    group
      .event('email', z.object({ to: z.string(), subject: z.string() }))
      .event('push', z.object({ token: z.string(), title: z.string() }))
  )
  .build()

// Create store with typed events
const store = IgniterStore.create()
  .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
  .withService('igniter-app')
  .addEvents(UserEvents)
  .build()

// Now publish/subscribe are fully typed!
await store.events.publish('user:created', {
  userId: '123',
  email: 'alice@example.com', // TypeScript enforces this shape
})

// Subscribe with full event context
await store.events.subscribe('user:created', (ctx) => {
  // ctx.type is typed as 'user:created'
  // ctx.data is typed as { userId: string, email: string }
  // ctx.timestamp is always available
  console.log(`User ${ctx.data.userId} created at ${ctx.timestamp}`)

  // Scope is available if set
  if (ctx.scope) console.log(`In scope: ${ctx.scope.key}:${ctx.scope.identifier}`)
})

// Group channels use colon prefix
await store.events.publish('user:notifications:email', {
  to: 'user@example.com',
  subject: 'Welcome!',
})
```

Schemas must implement the `StandardSchemaV1` interface (Zod is supported).
Only events registered with `addEvents()` are validated.

## Observability (Telemetry)

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { IgniterStore } from '@igniter-js/store'
import { IgniterStoreTelemetryEvents } from '@igniter-js/store/telemetry'

const telemetry = IgniterTelemetry.create()
  .withService('my-api')
  .addEvents(IgniterStoreTelemetryEvents)
  .build()

const store = IgniterStore.create()
  .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
  .withService('my-api')
  .withTelemetry(telemetry)
  .build()
```

## Key Naming Convention

Keys are automatically namespaced with this pattern:

```
<prefix>:<service>[:<scope>:<id>...]:<namespace>:<key>
```

Examples:

| Operation | Generated Key |
|-----------|---------------|
| `store.kv.get('user:123')` | `igniter:store:api:kv:user:123` |
| `store.counter.increment('views')` | `igniter:store:api:counter:views` |
| `store.claim.once('lock:x', ...)` | `igniter:store:api:claim:lock:x` |
| `store.events.publish('event', ...)` | `igniter:store:api:events:event` |
| `store.streams.append('events', ...)` | `igniter:store:api:streams:events` |
| `orgStore.kv.get('settings')` | `igniter:store:api:org:123:kv:settings` |

## Error Handling

All operations throw `IgniterStoreError` with typed error codes:

```typescript
import { IgniterStoreError, IGNITER_STORE_ERROR_CODES } from '@igniter-js/store'

try {
  await store.kv.get('key')
} catch (error) {
  if (IgniterStoreError.is(error)) {
    switch (error.code) {
      case 'STORE_CONNECTION_FAILED':
        // Handle connection error
        break
      case 'STORE_OPERATION_FAILED':
        // Handle operation error
        break
    }
  }
}
```

## Creating Custom Adapters

Implement the `IgniterStoreAdapter` interface:

```typescript
import type { IgniterStoreAdapter } from '@igniter-js/store'

class MemoryStoreAdapter implements IgniterStoreAdapter<Map<string, any>> {
  readonly client = new Map<string, any>()

  async get<T>(key: string): Promise<T | null> {
    return this.client.get(key) ?? null
  }

  async set(key: string, value: any, options?: { ttl?: number }): Promise<void> {
    this.client.set(key, value)
    if (options?.ttl) {
      setTimeout(() => this.client.delete(key), options.ttl * 1000)
    }
  }

  // ... implement other methods
}
```

## Migration from @igniter-js/adapter-redis

The Redis adapter has been moved into this package. Update your imports:

```typescript
// Before (deprecated)
import { createIgniterStoreRedisAdapter } from '@igniter-js/adapter-redis'

// After
import { IgniterStoreRedisAdapter } from '@igniter-js/store/adapters'

// Usage
const adapter = IgniterStoreRedisAdapter.create({ redis })
```

## License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro/igniter-js)
