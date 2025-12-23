# AGENTS.md - @igniter-js/store

> **Last Updated:** 2025-01-22
> **Version:** 0.1.2

---

## 1. Package Overview

**Name:** `@igniter-js/store`  
**Purpose:** Type-safe, multi-tenant distributed store with Redis support, scoped operations, and typed pub/sub.  
**Status:** Active Development

### Core Responsibilities
- Key-Value storage with TTL support
- Atomic counters for thread-safe operations
- Distributed claims (locks) using SETNX
- Batch operations for efficiency
- Typed pub/sub with schema inference and event context
- Redis Streams support with consumer groups
- Multi-tenant scoping with hierarchical isolation
- Typed scope definitions with runtime validation
- Telemetry event emission for all operations

---

## 2. Architecture

### Directory Structure

```
packages/store/
├── src/
│   ├── adapters/
│   │   ├── redis.adapter.ts        # Redis implementation
│   │   └── index.ts                # Adapter exports
│   ├── builders/
│   │   ├── main.builder.ts         # Fluent builder
│   │   ├── main.builder.spec.ts    # Builder tests
│   │   ├── events.builder.ts       # Typed events builder
│   │   ├── events-group.builder.ts # Typed events group builder
│   │   ├── events-group.builder.spec.ts
│   │   ├── store-key.builder.ts    # Key builder
│   │   ├── store-key.builder.spec.ts
│   │   └── index.ts
│   ├── core/
│   │   ├── manager.ts             # Main store class
│   │   ├── manager.spec.ts        # Core tests
│   │   └── index.ts
│   ├── errors/
│   │   ├── store.error.ts         # Error definitions
│   │   ├── store.error.spec.ts
│   │   └── index.ts
│   ├── telemetry/
│   │   └── index.ts               # Telemetry event registry
│   ├── types/
│   │   ├── adapter.ts             # Adapter interface
│   │   ├── config.ts              # Configuration types
│   │   ├── events.ts              # Event context types
│   │   ├── manager.ts             # Manager interfaces
│   │   ├── schema.ts              # Schema inference types
│   │   ├── scope.ts               # Scope types
│   │   ├── serializer.ts          # Serializer interface
│   │   ├── telemetry.ts           # Telemetry types
│   │   └── index.ts
│   ├── utils/
│   │   ├── events.ts              # Namespace validation
│   │   ├── schema.ts              # Legacy schema builder
│   │   ├── schema.spec.ts
│   │   └── index.ts
│   └── index.ts                   # Main entry point
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── CHANGELOG.md
└── AGENTS.md
```

### Core Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `IgniterStore` | `builders/main.builder.ts` | Builder entry point (`IgniterStore.create()`) |
| `IgniterStoreManager` | `core/manager.ts` | Runtime store implementation |
| `IgniterStoreBuilder` | `builders/main.builder.ts` | Fluent configuration builder |
| `IgniterStoreEvents` | `builders/events.builder.ts` | Typed events builder |
| `IgniterStoreRedisAdapter` | `adapters/redis.adapter.ts` | Redis implementation |
| `IgniterStoreTelemetryEvents` | `telemetry/index.ts` | Telemetry registry |
| `IgniterStoreKeyBuilder` | `builders/store-key.builder.ts` | Consistent key generation |
| `IgniterStoreError` | `errors/store.error.ts` | Typed error handling |

---

## 3. Key Design Patterns

### 3.1 Builder API Pattern with Type Accumulation

The store uses an immutable fluent builder with TypeScript type accumulation:

```typescript
// Each method returns a new builder instance with accumulated types
const store = IgniterStore.create()
  .withAdapter(adapter)     // Returns IgniterStoreBuilder<TRegistry, TScopes, TActors>
  .withService('my-api')    
  .addScope('organization', { required: true })  // TScopes accumulates: 'organization'
  .addScope('workspace')                          // TScopes accumulates: 'organization' | 'workspace'
  .build()                  // Returns IgniterStore with typed scopes

// TypeScript enforces valid keys
store.scope('organization', 'org_123')  // ✅ Valid
store.scope('invalid', 'id')            // ❌ Type error
```

### 3.2 Key Naming Convention

Keys follow this hierarchical pattern:

```
<prefix>:<service>[:<scope>:<id>...]:<namespace>:<key>
```

| Segment | Description | Example |
|---------|-------------|---------|
| prefix | Base prefix (default: `igniter:store`) | `igniter:store` |
| service | Service identifier | `my-api` |
| scope:id | Optional scope segments | `org:123:ws:456` |
| namespace | Operation namespace | `kv`, `counter`, `claim`, etc. |
| key | User-provided key | `user:123` |

### 3.3 Scope Hierarchy

Scopes enable multi-tenant isolation:

```typescript
// Root store
const store = IgniterStore.create()...build()

// Organization-scoped
const orgStore = store.scope('org', 'org_123')

// Workspace under organization
const wsStore = orgStore.scope('workspace', 'ws_456')

// All operations are isolated
await wsStore.kv.set('key', value)
// Key: igniter:store:api:org:org_123:workspace:ws_456:kv:key
```

### 3.4 Typed Pub/Sub

Schema-based type inference for pub/sub:

```typescript
const UserEvents = IgniterStoreEvents
  .create('user')
  .event('created', z.object({ id: z.string() }))
  .group('notifications', (g) =>
    g.event('email', z.object({ to: z.string() }))
  )
  .build()

// Results in types:
// 'user:created' -> { id: string }
// 'user:notifications:email' -> { to: string }
```

### 3.5 Telemetry Coverage

`IgniterStoreManager` emits telemetry events for every operation (kv, counter,
batch, claim, events, streams, dev scan). See `src/telemetry/index.ts` for the
full registry and ensure attributes never include PII.

---

## 4. API Namespaces

### 4.1 `store.kv` - Key-Value

| Method | Description |
|--------|-------------|
| `get<T>(key)` | Get value by key |
| `set(key, value, opts?)` | Set value with optional TTL |
| `exists(key)` | Check if key exists |
| `remove(key)` | Delete a key |
| `expire(key, ttl)` | Set expiration |
| `touch(key, ttl)` | Refresh TTL |

### 4.2 `store.counter` - Atomic Counters

| Method | Description |
|--------|-------------|
| `increment(key)` | Increment counter (default: 1) |
| `decrement(key)` | Decrement counter (default: 1) |
| `expire(key, ttl)` | Set counter expiration |

### 4.3 `store.claim` - Distributed Locks

| Method | Description |
|--------|-------------|
| `once(key, value, opts?)` | Try to acquire lock (SETNX) |

### 4.4 `store.batch` - Batch Operations

| Method | Description |
|--------|-------------|
| `get<T>(keys)` | Get multiple values |
| `set(entries)` | Set multiple key-value pairs |

### 4.5 `store.events` - Publish/Subscribe

Events now include a context envelope with metadata:

| Method | Description |
|--------|-------------|
| `publish(channel, message)` | Publish to channel (wraps in context envelope) |
| `subscribe(channel, callback)` | Subscribe with context handler |

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

### 4.6 `store.streams` - Redis Streams

| Method | Description |
|--------|-------------|
| `append(stream, data, opts?)` | Add to stream |
| `group(name, consumer)` | Create consumer group API |

#### Consumer Group API (`store.streams.group(...)`)

| Method | Description |
|--------|-------------|
| `ensure(stream, opts?)` | Create group if not exists |
| `read(stream, opts?)` | Read from stream |
| `ack(stream, ids)` | Acknowledge messages |

### 4.7 `store.dev` - Development Tools

| Method | Description |
|--------|-------------|
| `scan(pattern, opts?)` | Scan keys matching pattern |

### 4.8 `store.scope` - Multi-Tenant

| Method | Description |
|--------|-------------|
| `scope(type, id)` | Create scoped store instance |

---

## 5. Error Handling

### Error Codes

All errors are `IgniterStoreError` instances. The authoritative list lives in:
`src/errors/store.error.ts` (`IGNITER_STORE_ERROR_CODES`).
| `STORE_STREAM_OPERATION_FAILED` | Stream error |
| `STORE_DUPLICATE_SCOPE` | Duplicate scope key in builder |
| `STORE_INVALID_SCOPE_KEY` | Invalid scope key at runtime |
| `STORE_DUPLICATE_ACTOR` | Duplicate actor key in builder |
| `STORE_INVALID_ACTOR_KEY` | Invalid actor key at runtime |
| `STORE_ACTOR_KEY_REQUIRED` | Actor key cannot be empty |
| `STORE_ACTOR_IDENTIFIER_REQUIRED` | Actor identifier cannot be empty |
| ... | See `igniter-store.error.ts` for full list |

### Error Checking

```typescript
import { IgniterStoreError } from '@igniter-js/store'

try {
  await store.kv.get('key')
} catch (error) {
  if (IgniterStoreError.is(error)) {
    console.error(`Store error: ${error.code}`, error.details)
  }
}
```

---

## 6. Adapter Implementation

### Required Methods

Any custom adapter must implement `IgniterStoreAdapter<TClient>`:

```typescript
interface IgniterStoreAdapter<TClient = unknown> {
  readonly client: TClient

  // Key-Value
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, options?: { ttl?: number }): Promise<void>
  remove(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  expire(key: string, seconds: number): Promise<boolean>

  // Batch
  mget<T>(keys: string[]): Promise<(T | null)[]>
  mset(entries: Array<{ key: string; value: unknown; ttl?: number }>): Promise<void>

  // Counter
  incrby(key: string, increment: number): Promise<number>

  // Pub/Sub
  publish(channel: string, message: string): Promise<number>
  subscribe(channel: string, callback: (message: string) => void): Promise<void>
  unsubscribe(channel: string, callback?: (message: string) => void): Promise<void>

  // Scan
  scan(cursor: string, options: { match: string; count?: number }): Promise<{ cursor: string; keys: string[] }>

  // Streams (optional but recommended)
  xadd(key: string, id: string, fields: Record<string, string>, options?: { maxLen?: number; approximate?: boolean }): Promise<string>
  xgroupCreate(key: string, groupName: string, id: string, options?: { mkstream?: boolean }): Promise<void>
  xreadgroup(groupName: string, consumer: string, streams: Array<{ key: string; id: string }>, options?: { count?: number; blockMs?: number }): Promise<...>
  xack(key: string, groupName: string, ids: string[]): Promise<number>
}
```

---

## 7. Development Guidelines

### Adding New Features

1. **Types First** - Define types in `src/types/`
2. **Adapter Interface** - Extend `IgniterStoreAdapter` if needed
3. **Core Implementation** - Add to `IgniterStore` class
4. **Tests** - Add tests in `.spec.ts` files
5. **Documentation** - Update README and this file

### Testing Strategy

- **Unit Tests** - Test individual methods with mocked adapter
- **Integration Tests** - Test with real Redis (optional)
- **Type Tests** - Verify TypeScript inference

### Running Tests

```bash
# From package directory
cd packages/store

# Run all tests
bun test

# Run specific test file
bun test src/core/manager.spec.ts

# Watch mode
bun test --watch
```

---

## 8. Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2025-01-14 | Initial release |

---

## 9. Dependencies

### Peer Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@igniter-js/core` | `>=0.2.0` | Base error class, utilities |
| `ioredis` | `>=5.0.0` | Redis client (optional) |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `vitest` | Testing framework |
| `tsup` | Build tool |
| `typescript` | Type checking |

---

## 10. Related Packages

| Package | Relationship |
|---------|--------------|
| `@igniter-js/core` | Base utilities and errors |
| `@igniter-js/adapter-redis` | **Deprecated** - adapter moved here |
| `@igniter-js/connectors` | Similar builder pattern reference |
| `@igniter-js/caller` | Similar builder pattern reference |

---

## 11. Common Tasks

### Adding a New Adapter

1. Create file in `src/adapters/`
2. Implement `IgniterStoreAdapter` interface
3. Export from `src/adapters/index.ts`
4. Add to main `src/index.ts`
5. Write tests
6. Document in README

### Adding New Store Operation

1. Define types if needed in `src/types/`
2. Add method to adapter interface if adapter-level
3. Implement in `IgniterStore` class
4. Add to appropriate namespace (`kv`, `batch`, etc.)
5. Write tests
6. Update documentation

### Adding New Error Code

1. Add to `IGNITER_STORE_ERROR_CODES` in `errors/store.error.ts`
2. Use in appropriate error throws
3. Document in this file's error codes section

---

**Remember:** Always follow existing patterns. Read similar code before implementing new features. Test thoroughly. Update documentation.
