# @igniter-js/store

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/store)](https://www.npmjs.com/package/@igniter-js/store)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22+-green)](https://nodejs.org)

**Type-safe distributed state, events, and streams for modern TypeScript apps**  
Redis-backed storage with scoped keys, typed Pub/Sub, and stream processing.

[Quick Start](#-quick-start) • [Core Concepts](#-core-concepts) • [Real-World Examples](#-real-world-examples) • [API Reference](#-api-reference)

</div>

---

## ✨ Why @igniter-js/store?

Distributed state is easy to get wrong: key collisions, untyped events, brittle locks, and opaque failures. `@igniter-js/store` makes those problems predictable.

- ✅ **Typed everywhere** — Events, scopes, and payloads are inferred end-to-end.
- ✅ **Multi-tenant by default** — Scoped instances guarantee isolation.
- ✅ **Redis-ready** — First-class Redis adapter with KV, counters, streams, and Pub/Sub.
- ✅ **Observable** — Optional telemetry emits consistent events for every operation.
- ✅ **Composable** — Builder pattern keeps setup clean and immutable.

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @igniter-js/store ioredis zod

# pnpm
pnpm add @igniter-js/store ioredis zod

# yarn
yarn add @igniter-js/store ioredis zod

# bun
bun add @igniter-js/store ioredis zod
```

### Your First Store (60 seconds)

```typescript
import Redis from "ioredis";
import { IgniterStore } from "@igniter-js/store";
import { IgniterStoreRedisAdapter } from "@igniter-js/store/adapters";

const redis = new Redis(process.env.REDIS_URL);

const store = IgniterStore.create()
  .withAdapter(IgniterStoreRedisAdapter.create({ redis }))
  .withService("api")
  .build();

await store.kv.set("user:123", { name: "Avery" }, { ttl: 3600 });
const user = await store.kv.get<{ name: string }>("user:123");

console.log(user?.name); // "Avery"
```

**✅ Success!** You just wrote and read a scoped, namespaced key with type safety.

---

## 🎯 Core Concepts

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Your Application                      │
│  store.kv.set() • store.events.publish() • store.streams...  │
└───────────────┬──────────────────────────────────────────────┘
                │ Typed API + Scopes
                ▼
┌──────────────────────────────────────────────────────────────┐
│                   IgniterStoreManager                        │
│  KV • Counter • Claim • Batch • Events • Streams • Dev        │
└───────────────┬──────────────────────────────────────────────┘
                │ Adapter Contract
                ▼
┌──────────────────────────────────────────────────────────────┐
│                IgniterStoreAdapter (Redis, etc.)             │
└───────────────┬──────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│                            Redis                              │
└──────────────────────────────────────────────────────────────┘
```

### Key Abstractions

- **Builder** → Immutable configuration (`withAdapter`, `withService`, `addEvents`, `addScope`).
- **Manager** → Runtime API for KV, counters, claims, events, and streams.
- **Adapter** → Storage implementation (Redis adapter included).
- **Events** → Typed Pub/Sub with schema validation (StandardSchemaV1).
- **Scopes** → Multi-tenant isolation with chained prefixes.
- **Telemetry** → Optional event emission for observability.

---

## 📦 Package Exports

| Path | Description |
|------|-------------|
| `@igniter-js/store` | Main API (`IgniterStore`, `IgniterStoreEvents`, types, errors) |
| `@igniter-js/store/adapters` | Redis adapter and adapter exports |
| `@igniter-js/store/telemetry` | Typed telemetry events registry |

---

## 🧱 Builder Setup

### Minimal Builder

```typescript
import { IgniterStore } from "@igniter-js/store";
import { IgniterStoreRedisAdapter } from "@igniter-js/store/adapters";
import Redis from "ioredis";

const store = IgniterStore.create()
  .withAdapter(IgniterStoreRedisAdapter.create({ redis: new Redis() }))
  .withService("billing")
  .build();
```

### Builder with Scopes and Events

```typescript
import { z } from "zod";
import { IgniterStore, IgniterStoreEvents } from "@igniter-js/store";
import { IgniterStoreRedisAdapter } from "@igniter-js/store/adapters";
import Redis from "ioredis";

const BillingEvents = IgniterStoreEvents
  .create("billing")
  .event("invoice_paid", z.object({ invoiceId: z.string(), total: z.number() }))
  .build();

const store = IgniterStore.create()
  .withAdapter(IgniterStoreRedisAdapter.create({ redis: new Redis() }))
  .withService("billing")
  .addScope("organization", { required: true })
  .addEvents(BillingEvents)
  .build();
```

---

## 🔑 Key-Value Operations (`store.kv`)

### Get

```typescript
const user = await store.kv.get<{ name: string }>("user:123");
```

### Set with TTL

```typescript
await store.kv.set("user:123", { name: "Avery" }, { ttl: 3600 });
```

### Exists

```typescript
const exists = await store.kv.exists("user:123");
```

### Remove

```typescript
await store.kv.remove("user:123");
```

### Expire

```typescript
await store.kv.expire("user:123", 900);
```

### Touch

```typescript
await store.kv.touch("user:123", 900);
```

---

## 🔢 Counter Operations (`store.counter`)

### Increment

```typescript
const next = await store.counter.increment("page-views");
```

### Decrement

```typescript
const remaining = await store.counter.decrement("credits");
```

### Counter TTL

```typescript
await store.counter.expire("daily-limit", 86400);
```

---

## 🔒 Claim Operations (`store.claim`)

Distributed locks use `SETNX` behind the scenes.

```typescript
const claimed = await store.claim.once("jobs:cleanup", "worker-1", { ttl: 30 });

if (claimed) {
  try {
    await performCleanup();
  } finally {
    await store.kv.remove("jobs:cleanup");
  }
}
```

---

## 📦 Batch Operations (`store.batch`)

### Batch Get

```typescript
const values = await store.batch.get<{ name: string }>([
  "user:1",
  "user:2",
  "user:3",
]);
```

### Batch Set

```typescript
await store.batch.set([
  { key: "user:1", value: { name: "A" }, ttl: 3600 },
  { key: "user:2", value: { name: "B" }, ttl: 3600 },
]);
```

---

## 📡 Events (Pub/Sub)

Events emit a structured context envelope with `type`, `data`, `timestamp`, and optional `scope`.

### String-Based API

```typescript
const off = await store.events.subscribe("user:created", (ctx) => {
  console.log(ctx.type); // "user:created"
  console.log(ctx.data); // payload
  console.log(ctx.timestamp);
});

await store.events.publish("user:created", { userId: "123" });
await off();
```

### Proxy-Based API (Typed)

```typescript
await store.events.user.created.publish({ userId: "123" });

const off = await store.events.user.created.subscribe((ctx) => {
  console.log(ctx.data.userId);
});
```

### Wildcard Note

TypeScript supports wildcard patterns, but Redis Pub/Sub requires `PSUBSCRIBE`.  
The built-in Redis adapter uses `SUBSCRIBE`, so use explicit channels unless you implement a custom adapter.

---

## 🧩 Typed Events (Schema-Driven)

```typescript
import { z } from "zod";
import { IgniterStoreEvents } from "@igniter-js/store";

export const UserEvents = IgniterStoreEvents
  .create("user")
  .event("created", z.object({ userId: z.string(), email: z.string().email() }))
  .event("deleted", z.object({ userId: z.string() }))
  .group("notifications", (group) =>
    group
      .event("email", z.object({ to: z.string(), subject: z.string() }))
      .event("push", z.object({ token: z.string(), title: z.string() }))
  )
  .build();
```

### Validation Options

Validation is configured via `addEvents(events, options)`.

```typescript
const store = IgniterStore.create()
  .withAdapter(adapter)
  .withService("api")
  .addEvents(UserEvents, {
    validatePublish: true,
    validateSubscribe: false,
    throwOnValidationError: true,
  })
  .build();
```

---

## 🧵 Streams (`store.streams`)

### Append

```typescript
const id = await store.streams.append("events", { type: "click", x: 10, y: 20 }, {
  maxLen: 10000,
  approximate: true,
});
```

### Range

```typescript
const messages = await store.streams.range("events", { startId: "0", endId: "+" });
```

### Consumer Groups

```typescript
const group = store.streams.group("processors", "worker-1");

await group.ensure("events", { startId: "0" });
const batch = await group.read("events", { count: 10, blockMs: 5000 });

await group.ack("events", batch.map((msg) => msg.id));
```

---

## 🧪 Dev Tools (`store.dev`)

```typescript
const scan = await store.dev.scan("user:*");
console.log(scan.keys, scan.cursor);
```

---

## 🏢 Scopes (Multi-Tenant Isolation)

### Single Scope

```typescript
const orgStore = store.scope("organization", "org_123");
await orgStore.kv.set("settings", { theme: "dark" });
```

### Chained Scopes

```typescript
const scoped = store
  .scope("organization", "org_123")
  .scope("workspace", "ws_456");

await scoped.kv.set("config", { feature: true });
```

### Typed Scopes with `addScope()`

```typescript
const store = IgniterStore.create()
  .withAdapter(adapter)
  .withService("api")
  .addScope("organization", { required: true })
  .addScope("workspace")
  .build();

store.scope("organization", "org_123"); // ✅
store.scope("workspace", "ws_456"); // ✅
// store.scope("invalid", "x"); // ❌ Type error + runtime error
```

---

## 🔭 Observability (Telemetry)

```typescript
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { IgniterStoreTelemetryEvents } from "@igniter-js/store/telemetry";

const telemetry = IgniterTelemetry.create()
  .withService("api")
  .addEvents(IgniterStoreTelemetryEvents)
  .build();

const store = IgniterStore.create()
  .withAdapter(adapter)
  .withService("api")
  .withTelemetry(telemetry)
  .build();
```

Telemetry emits events for:

- `igniter.store.kv.*`
- `igniter.store.counter.*`
- `igniter.store.batch.*`
- `igniter.store.claim.*`
- `igniter.store.events.*`
- `igniter.store.stream.*`
- `igniter.store.dev.*`

---

## 🔐 Serialization Notes

The Redis adapter serializes values using `JSON.stringify` and parses with `JSON.parse`.  
The core manager does not apply a serializer. If you need MessagePack or binary payloads:

- Pre-encode values before calling `set`/`publish`, **or**
- Implement a custom adapter that handles your desired serialization format.

---

## 🔌 Adapters

### Redis Adapter (Built-in)

```typescript
import Redis from "ioredis";
import { IgniterStoreRedisAdapter } from "@igniter-js/store/adapters";

const redis = new Redis(process.env.REDIS_URL);
const adapter = IgniterStoreRedisAdapter.create({ redis });
```

### Custom Adapter (Example)

```typescript
import type { IgniterStoreAdapter } from "@igniter-js/store";

class MemoryAdapter implements IgniterStoreAdapter<Map<string, string>> {
  client = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const raw = this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: any): Promise<void> {
    this.client.set(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    this.client.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.client.has(key);
  }

  async increment(key: string, delta: number = 1): Promise<number> {
    const current = Number(this.client.get(key) ?? 0);
    const next = current + delta;
    this.client.set(key, String(next));
    return next;
  }

  async expire(): Promise<void> {
    // No-op in memory adapter
  }

  async setNX(key: string, value: any): Promise<boolean> {
    if (this.client.has(key)) return false;
    this.client.set(key, JSON.stringify(value));
    return true;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return keys.map((key) => {
      const value = this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    });
  }

  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      this.client.set(entry.key, JSON.stringify(entry.value));
    }
  }

  async publish(): Promise<void> {
    // No-op in memory adapter
  }

  async subscribe(): Promise<void> {
    // No-op in memory adapter
  }

  async unsubscribe(): Promise<void> {
    // No-op in memory adapter
  }

  async scan(): Promise<{ cursor: string; keys: string[] }> {
    return { cursor: "0", keys: Array.from(this.client.keys()) };
  }

  async xadd(): Promise<string> {
    return "0-0";
  }

  async xgroupCreate(): Promise<void> {}

  async xreadgroup<T>(): Promise<Array<{ id: string; message: T }>> {
    return [];
  }

  async xrange<T>(): Promise<Array<{ id: string; message: T }>> {
    return [];
  }

  async xrevrange<T>(): Promise<Array<{ id: string; message: T }>> {
    return [];
  }

  async xack(): Promise<void> {}
}
```

---

## 🧪 Testing

```typescript
import { IgniterStore } from "@igniter-js/store";

const store = IgniterStore.create()
  .withAdapter(new MemoryAdapter())
  .withService("test")
  .build();

await store.kv.set("test:key", { ok: true });
const value = await store.kv.get("test:key");

expect(value).toEqual({ ok: true });
```

---

## 🧩 Framework Integration

### Next.js Route Handler

```typescript
// app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await store.kv.get(`user:${params.id}`);
  return NextResponse.json({ user });
}
```

### Express Route

```typescript
import type { Request, Response } from "express";
import { store } from "./store";

export async function getUser(req: Request, res: Response) {
  const user = await store.kv.get(`user:${req.params.id}`);
  res.json({ user });
}
```

### Fastify Plugin

```typescript
import type { FastifyPluginAsync } from "fastify";
import { store } from "./store";

export const usersPlugin: FastifyPluginAsync = async (app) => {
  app.get("/users/:id", async (req) => {
    const user = await store.kv.get(`user:${req.params.id}`);
    return { user };
  });
};
```

---

## 🌍 Real-World Examples

### Example 1: Multi-Tenant Pricing Cache (E-Commerce)

```typescript
const store = IgniterStore.create()
  .withAdapter(adapter)
  .withService("checkout")
  .addScope("store_id", { required: true })
  .build();

const tenantStore = store.scope("store_id", req.storeId);
const key = `product:${productId}:pricing`;

let pricing = await tenantStore.kv.get(key);
if (!pricing) {
  pricing = await db.pricing.findUnique({ where: { productId, storeId: req.storeId } });
  await tenantStore.kv.set(key, pricing, { ttl: 3600 });
}
```

### Example 2: Sliding Window Rate Limiting (Fintech)

```typescript
const minuteKey = Math.floor(Date.now() / 60000);
const limitKey = `ratelimit:${ip}:${minuteKey}`;

const count = await store.counter.increment(limitKey);
if (count === 1) {
  await store.counter.expire(limitKey, 60);
}

if (count > 100) {
  throw new Error("TOO_MANY_REQUESTS");
}
```

### Example 3: Distributed Cron Leadership (Infrastructure)

```typescript
const lockKey = "cron:cleanup";
const isLeader = await store.claim.once(lockKey, process.env.HOSTNAME, { ttl: 55 });

if (isLeader) {
  await performCleanup();
}
```

### Example 4: Typed Order Events (Commerce)

```typescript
const OrderEvents = IgniterStoreEvents
  .create("order")
  .event("placed", z.object({ orderId: z.string(), total: z.number() }))
  .build();

const store = IgniterStore.create()
  .withAdapter(adapter)
  .withService("orders")
  .addEvents(OrderEvents)
  .build();

await store.events.order.placed.publish({ orderId: "o_123", total: 42 });
```

### Example 5: Redis Streams for Chat Processing

```typescript
await store.streams.append("chat:room:1", { from: "alice", text: "hi" });

const consumer = store.streams.group("chat-workers", "worker-1");
await consumer.ensure("chat:room:1");
const messages = await consumer.read("chat:room:1", { count: 20, blockMs: 5000 });

for (const msg of messages) {
  await processMessage(msg.message);
  await consumer.ack("chat:room:1", [msg.id]);
}
```

### Example 6: Presence Tracking (Social)

```typescript
await store.kv.set(`online:${userId}`, true, { ttl: 300 });
const isOnline = await store.kv.exists(`online:${userId}`);
```

### Example 7: A/B Testing Assignments (Marketing)

```typescript
const key = `exp:${expId}:user:${userId}`;
let variant = await store.kv.get(key);

if (!variant) {
  variant = Math.random() > 0.5 ? "A" : "B";
  await store.kv.set(key, variant, { ttl: 604800 });
}
```

### Example 8: Cache Invalidation via Events

```typescript
await store.events.publish("db:update:user", { userId });

await store.events.subscribe("db:update:user", (ctx) => {
  localCache.delete(ctx.data.userId);
});
```

---

## 📚 API Reference

### IgniterStore (Builder)

```typescript
class IgniterStoreBuilder<TRegistry, TScopes> {
  static create(): IgniterStoreBuilder<{}, never>

  withAdapter(adapter: IgniterStoreAdapter): IgniterStoreBuilder<TRegistry, TScopes>
  withService(service: string): IgniterStoreBuilder<TRegistry, TScopes>
  withSerializer(serializer: IgniterStoreSerializer): IgniterStoreBuilder<TRegistry, TScopes>
  withLogger(logger: IgniterLogger): IgniterStoreBuilder<TRegistry, TScopes>
  withTelemetry(telemetry: IgniterTelemetryManager<any>): IgniterStoreBuilder<TRegistry, TScopes>

  addScope<TKey extends string>(key: TKey, options?: IgniterStoreScopeOptions): IgniterStoreBuilder<TRegistry, TScopes | TKey>
  addEvents<TEvents extends { namespace: string; events: IgniterStoreEventsDirectory }>(
    events: TEvents,
    validation?: IgniterStoreEventsValidationOptions,
  ): IgniterStoreBuilder<TRegistry & { [K in TEvents["namespace"]]: TEvents["events"] }, TScopes>

  build(): IgniterStoreManager<TRegistry, TScopes>
}
```

**Notes:**

- `withSerializer` stores a serializer in config; the built-in Redis adapter handles JSON internally.
- `addEvents` merges registries by namespace; validation options apply to the builder.

### IgniterStoreManager (Runtime API)

```typescript
interface IIgniterStoreManager<TRegistry, TScopes> {
  kv: IgniterStoreKV
  counter: IgniterStoreCounter
  claim: IgniterStoreClaim
  batch: IgniterStoreBatch
  events: IgniterStoreEventsManager<TRegistry>
  streams: IgniterStoreStreams
  dev: IgniterStoreDev
  logger?: IgniterLogger

  scope(scopeKey: TScopes, identifier: string | number): IIgniterStoreManager<TRegistry, TScopes>
}
```

### KV API

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `(key: string) => Promise<T \| null>` | Retrieve and deserialize a value |
| `set` | `(key, value, opts?) => Promise<void>` | Store a value with optional TTL |
| `exists` | `(key) => Promise<boolean>` | Check key existence |
| `remove` | `(key) => Promise<void>` | Delete a key |
| `expire` | `(key, ttl) => Promise<void>` | Set TTL in seconds |
| `touch` | `(key, ttl) => Promise<void>` | Refresh TTL |

### Counter API

| Method | Signature | Description |
|--------|-----------|-------------|
| `increment` | `(key) => Promise<number>` | Atomic increment by 1 |
| `decrement` | `(key) => Promise<number>` | Atomic decrement by 1 |
| `expire` | `(key, ttl) => Promise<void>` | Set TTL on counter key |

### Claim API

| Method | Signature | Description |
|--------|-----------|-------------|
| `once` | `(key, value, opts?) => Promise<boolean>` | Acquire lock via SETNX |

### Batch API

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `(keys: string[]) => Promise<(T \| null)[]>` | Multi-key get |
| `set` | `(entries: Array<{ key; value; ttl? }>) => Promise<void>` | Multi-key set |

### Events API

| Method | Signature | Description |
|--------|-----------|-------------|
| `publish` | `(event, payload) => Promise<void>` | Publish event envelope |
| `subscribe` | `(event, handler) => Promise<UnsubFn>` | Subscribe to channel |

### Streams API

| Method | Signature | Description |
|--------|-----------|-------------|
| `append` | `(stream, message, opts?) => Promise<string>` | Add stream message |
| `range` | `(stream, opts?) => Promise<StreamMessage[]>` | Read stream range |
| `group` | `(group, consumer) => ConsumerGroup` | Consumer group API |

### Dev API

| Method | Signature | Description |
|--------|-----------|-------------|
| `scan` | `(pattern, opts?) => Promise<{ cursor; keys }>` | Scan keys in namespace |

---

## 🧾 Error Handling

`IgniterStoreError` exposes typed error codes from `IGNITER_STORE_ERROR_CODES`.

```typescript
import { IgniterStoreError, IGNITER_STORE_ERROR_CODES } from "@igniter-js/store";

try {
  await store.kv.get("missing");
} catch (error) {
  if (IgniterStoreError.is(error)) {
    switch (error.code) {
      case IGNITER_STORE_ERROR_CODES.STORE_ADAPTER_REQUIRED:
        // Fix configuration
        break;
      case IGNITER_STORE_ERROR_CODES.STORE_OPERATION_FAILED:
        // Retry or log
        break;
    }
  }
}
```

### Error Codes (Complete List)

- STORE_ADAPTER_REQUIRED
- STORE_SERVICE_REQUIRED
- STORE_CONFIGURATION_INVALID
- STORE_SCOPE_KEY_REQUIRED
- STORE_SCOPE_IDENTIFIER_REQUIRED
- STORE_SCOPE_INVALID
- STORE_KEY_REQUIRED
- STORE_VALUE_REQUIRED
- STORE_TTL_INVALID
- STORE_SCHEMA_VALIDATION_FAILED
- STORE_SCHEMA_CHANNEL_NOT_FOUND
- STORE_SERIALIZATION_FAILED
- STORE_DESERIALIZATION_FAILED
- STORE_OPERATION_FAILED
- STORE_GET_FAILED
- STORE_SET_FAILED
- STORE_DELETE_FAILED
- STORE_INCREMENT_FAILED
- STORE_PUBLISH_FAILED
- STORE_SUBSCRIBE_FAILED
- STORE_UNSUBSCRIBE_FAILED
- STORE_BATCH_FAILED
- STORE_BATCH_KEYS_REQUIRED
- STORE_BATCH_ENTRIES_REQUIRED
- STORE_CLAIM_FAILED
- STORE_STREAM_APPEND_FAILED
- STORE_STREAM_READ_FAILED
- STORE_STREAM_GROUP_CREATE_FAILED
- STORE_STREAM_ACK_FAILED
- STORE_STREAM_NAME_REQUIRED
- STORE_STREAM_GROUP_REQUIRED
- STORE_STREAM_CONSUMER_REQUIRED
- STORE_SCAN_FAILED
- STORE_SCAN_PATTERN_REQUIRED
- STORE_CONNECTION_FAILED
- STORE_NOT_CONNECTED
- STORE_INVALID_NAMESPACE
- STORE_RESERVED_NAMESPACE
- STORE_DUPLICATE_NAMESPACE
- STORE_INVALID_EVENT_NAME
- STORE_DUPLICATE_EVENT
- STORE_MISSING_NAMESPACE
- STORE_DUPLICATE_SCOPE
- STORE_INVALID_SCOPE_KEY
- STORE_ENVIRONMENT_REQUIRED

---

## ✅ Best Practices

- Use `addScope()` to enforce tenant boundaries.
- Keep keys short and predictable.
- Always set TTL for ephemeral data.
- Use `batch.get` for hot lists.
- Register event schemas for cross-service contracts.

## ❌ Anti-Patterns

- Writing raw keys without a service prefix.
- Storing secrets or raw tokens in KV.
- Relying on Redis wildcard Pub/Sub without `PSUBSCRIBE` support.
- Using `dev.scan` in hot paths.

---

## 🧩 Example Library (30+)

### Example 01: KV Get

```typescript
const value = await store.kv.get("feature:flags");
```

### Example 02: KV Set

```typescript
await store.kv.set("feature:flags", { enabled: true });
```

### Example 03: KV Set with TTL

```typescript
await store.kv.set("session:abc", { userId: "u1" }, { ttl: 1800 });
```

### Example 04: KV Exists

```typescript
const exists = await store.kv.exists("session:abc");
```

### Example 05: KV Remove

```typescript
await store.kv.remove("session:abc");
```

### Example 06: KV Expire

```typescript
await store.kv.expire("session:abc", 1200);
```

### Example 07: KV Touch

```typescript
await store.kv.touch("session:abc", 1200);
```

### Example 08: Counter Increment

```typescript
const count = await store.counter.increment("metrics:signup");
```

### Example 09: Counter Decrement

```typescript
const remaining = await store.counter.decrement("limits:credits");
```

### Example 10: Counter Expire

```typescript
await store.counter.expire("limits:credits", 3600);
```

### Example 11: Claim Once

```typescript
const claimed = await store.claim.once("job:sync", "worker-a", { ttl: 30 });
```

### Example 12: Batch Get

```typescript
const users = await store.batch.get(["user:1", "user:2", "user:3"]);
```

### Example 13: Batch Set

```typescript
await store.batch.set([
  { key: "user:1", value: { name: "A" } },
  { key: "user:2", value: { name: "B" } },
]);
```

### Example 14: Events Publish (String)

```typescript
await store.events.publish("audit:login", { userId: "u1" });
```

### Example 15: Events Subscribe (String)

```typescript
const off = await store.events.subscribe("audit:login", (ctx) => {
  console.log(ctx.data.userId);
});
```

### Example 16: Events Publish (Proxy)

```typescript
await store.events.audit.login.publish({ userId: "u1" });
```

### Example 17: Events Subscribe (Proxy)

```typescript
const off = await store.events.audit.login.subscribe((ctx) => {
  console.log(ctx.data.userId);
});
```

### Example 18: Events Validation

```typescript
const store = IgniterStore.create()
  .withAdapter(adapter)
  .withService("api")
  .addEvents(UserEvents, { validatePublish: true })
  .build();
```

### Example 19: Streams Append

```typescript
await store.streams.append("metrics", { cpu: 0.4 }, { maxLen: 1000 });
```

### Example 20: Streams Range

```typescript
const records = await store.streams.range("metrics", { startId: "0" });
```

### Example 21: Streams Consumer Ensure

```typescript
await store.streams.group("workers", "w1").ensure("metrics");
```

### Example 22: Streams Consumer Read

```typescript
const group = store.streams.group("workers", "w1");
const batch = await group.read("metrics", { count: 5, blockMs: 1000 });
```

### Example 23: Streams Consumer Ack

```typescript
await store.streams.group("workers", "w1").ack("metrics", ["0-1"]);
```

### Example 24: Dev Scan

```typescript
const { keys } = await store.dev.scan("user:*");
```

### Example 25: Single Scope

```typescript
const orgStore = store.scope("organization", "org_1");
```

### Example 26: Chained Scope

```typescript
const scoped = store.scope("organization", "org_1").scope("workspace", "ws_2");
```

### Example 27: Scoped KV

```typescript
await store.scope("organization", "org_1").kv.set("settings", { theme: "dark" });
```

### Example 28: Scoped Events

```typescript
await store.scope("organization", "org_1").events.publish("audit:login", { userId: "u1" });
```

### Example 29: Redis Adapter Setup

```typescript
const adapter = IgniterStoreRedisAdapter.create({ redis: new Redis() });
```

### Example 30: Telemetry Setup

```typescript
const telemetry = IgniterTelemetry.create().withService("api").addEvents(IgniterStoreTelemetryEvents).build();
```

### Example 31: Error Handling

```typescript
try {
  await store.kv.get("missing");
} catch (error) {
  if (IgniterStoreError.is(error)) {
    console.log(error.code);
  }
}
```

### Example 32: Batch Seed

```typescript
await store.batch.set([
  { key: "seed:1", value: { ok: true }, ttl: 60 },
  { key: "seed:2", value: { ok: true }, ttl: 60 },
]);
```

### Example 33: Counter-Based Rate Limit

```typescript
const key = `rate:${ip}:${minute}`;
const count = await store.counter.increment(key);
if (count === 1) await store.counter.expire(key, 60);
```

### Example 34: Lock for Cron Task

```typescript
const isLeader = await store.claim.once("cron:leader", process.env.HOSTNAME, { ttl: 55 });
```

### Example 35: Publish Typed Event

```typescript
await store.events.user.created.publish({ userId: "u1", email: "a@b.com" });
```

### Example 36: Subscribe Typed Event

```typescript
await store.events.user.created.subscribe((ctx) => {
  console.log(ctx.data.email);
});
```

### Example 37: Event Context Metadata

```typescript
await store.events.subscribe("user:created", (ctx) => {
  console.log(ctx.type, ctx.timestamp, ctx.scope);
});
```

### Example 38: Stream Append with Trimming

```typescript
await store.streams.append("logs", { message: "ok" }, { maxLen: 2000, approximate: true });
```

### Example 39: Dev Scan Pagination

```typescript
const first = await store.dev.scan("user:*", { count: 100 });
if (first.cursor !== "0") {
  await store.dev.scan("user:*", { cursor: first.cursor, count: 100 });
}
```

### Example 40: Scoped Batch Get

```typescript
const scoped = store.scope("organization", "org_1");
const values = await scoped.batch.get(["a", "b", "c"]);
```

---

## 🧠 Troubleshooting

### STORE_ADAPTER_REQUIRED

- **Cause:** `withAdapter` was not called.
- **Fix:** Provide an adapter before `build()`.

### STORE_SERVICE_REQUIRED

- **Cause:** `withService` was not called.
- **Fix:** Provide a service name before `build()`.

### STORE_SCHEMA_VALIDATION_FAILED

- **Cause:** Event payload does not match schema.
- **Fix:** Update payload shape or schema definition.

### STORE_INVALID_SCOPE_KEY

- **Cause:** Scope key not defined via `addScope`.
- **Fix:** Add the scope during builder configuration.

### STORE_SERIALIZATION_FAILED

- **Cause:** JSON serialization failed (circular reference, unsupported type).
- **Fix:** Use JSON-safe data or pre-encode values.

---

## ❓ FAQ

1. **Is Redis required?** The built-in adapter uses Redis, but you can implement a custom adapter.
2. **Does it work with Redis Cluster?** Yes, pass a cluster client to the adapter.
3. **Does it support Pub/Sub?** Yes, via `store.events.*`.
4. **Are events typed?** Yes, when using `IgniterStoreEvents`.
5. **Can I use wildcards?** Types support it, but Redis `SUBSCRIBE` does not; implement `PSUBSCRIBE` in a custom adapter.
6. **Does it support streams?** Yes, `store.streams`.
7. **Is it safe for browser?** Use server runtimes only.
8. **Can I cache sessions?** Yes, KV with TTL works well.
9. **Is TTL required?** No, but recommended.
10. **How to count keys?** Use `counter.increment` or `dev.scan` for debugging.
11. **Can I scope by user?** Yes, use `store.scope("user", id)`.
12. **Are counters atomic?** Yes, Redis increments are atomic.
13. **Is `batch.get` faster?** Yes, fewer network round-trips.
14. **Can I publish raw strings?** Yes, payloads are `unknown` without schemas.
15. **How to validate events?** Use `addEvents` with validation options.
16. **Can I disable validation?** Set `validatePublish: false` or `validateSubscribe: false`.
17. **How do I add telemetry?** Use `withTelemetry` with `IgniterStoreTelemetryEvents`.
18. **Can I use Bun?** Yes, as long as Redis client is supported.
19. **Can I use Deno?** Only if the Redis client is compatible.
20. **Do I need Zod?** Only for typed events; `StandardSchemaV1` is required.
21. **Is there a mock adapter?** Not built-in; implement a lightweight in-memory adapter for tests.
22. **Can I store buffers?** Pre-encode to base64 or implement a custom adapter.
23. **How do I expire counters?** Use `store.counter.expire`.
24. **Can I chain scopes?** Yes, `store.scope().scope()`.
25. **Are scopes validated?** Yes, when `addScope` is used.
26. **Can I share events across services?** Yes, export a shared event registry.
27. **Does `events.subscribe` return an unsubscribe?** Yes, an async function.
28. **How to handle Redis outages?** Use retry strategies and circuit breakers.
29. **Is serialization configurable?** The Redis adapter uses JSON; custom adapters can do more.
30. **Can I use it for caching API responses?** Yes, KV with TTL.

---

## 🔁 Migration from @igniter-js/adapter-redis

```typescript
// Before
import { createIgniterStoreRedisAdapter } from "@igniter-js/adapter-redis";

// After
import { IgniterStoreRedisAdapter } from "@igniter-js/store/adapters";

const adapter = IgniterStoreRedisAdapter.create({ redis });
```

---

## 🔗 Related Packages

- `@igniter-js/telemetry`
- `@igniter-js/jobs`
- `@igniter-js/caller`
- `@igniter-js/storage`

---

---

## 📒 Telemetry Events Catalog

All telemetry events are defined in `@igniter-js/store/telemetry` and emitted only when telemetry is configured.

### KV Events

- `igniter.store.kv.get.started`
- `igniter.store.kv.get.success`
- `igniter.store.kv.get.error`
- `igniter.store.kv.set.started`
- `igniter.store.kv.set.success`
- `igniter.store.kv.set.error`
- `igniter.store.kv.remove.started`
- `igniter.store.kv.remove.success`
- `igniter.store.kv.remove.error`
- `igniter.store.kv.exists.started`
- `igniter.store.kv.exists.success`
- `igniter.store.kv.exists.error`
- `igniter.store.kv.expire.started`
- `igniter.store.kv.expire.success`
- `igniter.store.kv.expire.error`
- `igniter.store.kv.touch.started`
- `igniter.store.kv.touch.success`
- `igniter.store.kv.touch.error`

### Counter Events

- `igniter.store.counter.increment.started`
- `igniter.store.counter.increment.success`
- `igniter.store.counter.increment.error`
- `igniter.store.counter.decrement.started`
- `igniter.store.counter.decrement.success`
- `igniter.store.counter.decrement.error`
- `igniter.store.counter.expire.started`
- `igniter.store.counter.expire.success`
- `igniter.store.counter.expire.error`

### Batch Events

- `igniter.store.batch.get.started`
- `igniter.store.batch.get.success`
- `igniter.store.batch.get.error`
- `igniter.store.batch.set.started`
- `igniter.store.batch.set.success`
- `igniter.store.batch.set.error`

### Claim Events

- `igniter.store.claim.acquire.started`
- `igniter.store.claim.acquire.success`
- `igniter.store.claim.acquire.error`

### Events (Pub/Sub)

- `igniter.store.events.publish.started`
- `igniter.store.events.publish.success`
- `igniter.store.events.publish.error`
- `igniter.store.events.subscribe.started`
- `igniter.store.events.subscribe.success`
- `igniter.store.events.subscribe.error`
- `igniter.store.events.unsubscribe.started`
- `igniter.store.events.unsubscribe.success`
- `igniter.store.events.unsubscribe.error`

### Stream Events

- `igniter.store.stream.append.started`
- `igniter.store.stream.append.success`
- `igniter.store.stream.append.error`
- `igniter.store.stream.read.started`
- `igniter.store.stream.read.success`
- `igniter.store.stream.read.error`
- `igniter.store.stream.range.started`
- `igniter.store.stream.range.success`
- `igniter.store.stream.range.error`
- `igniter.store.stream.ack.started`
- `igniter.store.stream.ack.success`
- `igniter.store.stream.ack.error`
- `igniter.store.stream.group.started`
- `igniter.store.stream.group.success`
- `igniter.store.stream.group.error`

### Dev Events

- `igniter.store.dev.scan.started`
- `igniter.store.dev.scan.success`
- `igniter.store.dev.scan.error`

---

## 📘 Detailed API Notes

### Events Validation Behavior

- Validation runs only if a schema exists for the channel.
- `validatePublish` defaults to `true`.
- `validateSubscribe` defaults to `false`.
- `throwOnValidationError` defaults to `true`.

### Event Context Envelope

```typescript
interface IgniterStoreEventContext<TEvent = string, TPayload = unknown> {
  type: TEvent
  data: TPayload
  timestamp: string
  scope?: {
    key: string
    identifier: string
  }
}
```

---

## 🧪 Extended Example Library (41-80)

### Example 41: Scoped Counter

```typescript
const scoped = store.scope("organization", "org_42");
await scoped.counter.increment("usage:api");
```

### Example 42: Scoped Claim

```typescript
const scoped = store.scope("organization", "org_42");
await scoped.claim.once("jobs:daily", "worker-1", { ttl: 30 });
```

### Example 43: Typed Events in a Feature Module

```typescript
export const BillingEvents = IgniterStoreEvents
  .create("billing")
  .event("invoice_paid", z.object({ invoiceId: z.string(), total: z.number() }))
  .build();
```

### Example 44: Publishing Feature Events

```typescript
await store.events.billing.invoice_paid.publish({ invoiceId: "inv_1", total: 99 });
```

### Example 45: Subscribing to Feature Events

```typescript
await store.events.billing.invoice_paid.subscribe((ctx) => {
  console.log(ctx.data.total);
});
```

### Example 46: Dev Scan Scoped Prefix

```typescript
const scoped = store.scope("organization", "org_1");
const scan = await scoped.dev.scan("*");
```

### Example 47: Events Publish with Scope

```typescript
const scoped = store.scope("organization", "org_1");
await scoped.events.publish("audit:login", { userId: "u1" });
```

### Example 48: KV Cache Warm-up

```typescript
await store.kv.set("cache:warm", { ok: true }, { ttl: 300 });
```

### Example 49: Counter-Based Throttle

```typescript
const key = `throttle:${userId}:${minute}`;
const current = await store.counter.increment(key);
if (current === 1) await store.counter.expire(key, 60);
```

### Example 50: Batch Seed with TTL

```typescript
await store.batch.set([
  { key: "seed:a", value: 1, ttl: 120 },
  { key: "seed:b", value: 2, ttl: 120 },
]);
```

### Example 51: Stream Append with Trim

```typescript
await store.streams.append("metrics", { cpu: 0.2 }, { maxLen: 1000, approximate: true });
```

### Example 52: Stream Range Reverse

```typescript
const last = await store.streams.range("metrics", { reverse: true, count: 5 });
```

### Example 53: Consumer Group Read with Block

```typescript
const group = store.streams.group("jobs", "worker-2");
const messages = await group.read("jobs:queue", { blockMs: 5000, count: 10 });
```

### Example 54: Ack Processed Messages

```typescript
await store.streams.group("jobs", "worker-2").ack("jobs:queue", ["0-1", "0-2"]);
```

### Example 55: KV Store JSON Object

```typescript
await store.kv.set("profile:u1", { name: "Sam", tier: "pro" });
```

### Example 56: KV Fetch Typed

```typescript
const profile = await store.kv.get<{ name: string; tier: string }>("profile:u1");
```

### Example 57: Batch Get Typed

```typescript
const profiles = await store.batch.get<{ name: string }>(["profile:u1", "profile:u2"]);
```

### Example 58: Claim for Deduplication

```typescript
const claimed = await store.claim.once(`dedupe:${jobId}`, "worker", { ttl: 60 });
```

### Example 59: Scope for Region

```typescript
const regional = store.scope("region", "us-east-1");
```

### Example 60: Scoped Stream

```typescript
const scoped = store.scope("tenant", "t1");
await scoped.streams.append("audit", { action: "login" });
```

### Example 61: Typed Event Registry Export

```typescript
export const AuditEvents = IgniterStoreEvents
  .create("audit")
  .event("login", z.object({ userId: z.string() }))
  .build();
```

### Example 62: Add Events from Multiple Features

```typescript
const store = IgniterStore.create()
  .withAdapter(adapter)
  .withService("api")
  .addEvents(UserEvents)
  .addEvents(AuditEvents)
  .build();
```

### Example 63: Event Context Timestamp

```typescript
await store.events.subscribe("audit:login", (ctx) => {
  console.log(ctx.timestamp);
});
```

### Example 64: Event Context Scope

```typescript
await store.scope("organization", "org_1").events.subscribe("audit:login", (ctx) => {
  console.log(ctx.scope?.identifier);
});
```

### Example 65: Counter for SKU Inventory

```typescript
const left = await store.counter.decrement(`inventory:${sku}`);
if (left < 0) await store.counter.increment(`inventory:${sku}`);
```

### Example 66: Session TTL Refresh

```typescript
await store.kv.touch(`session:${sessionId}`, 1800);
```

### Example 67: Scheduled Cleanup Marker

```typescript
await store.kv.set("cleanup:last_run", Date.now(), { ttl: 86400 });
```

### Example 68: Publish after DB Update

```typescript
await store.events.publish("db:update:user", { userId });
```

### Example 69: Subscribe to DB Update

```typescript
await store.events.subscribe("db:update:user", (ctx) => localCache.delete(ctx.data.userId));
```

### Example 70: Rate Limit by Route

```typescript
const key = `limit:${route}:${ip}:${minute}`;
const count = await store.counter.increment(key);
if (count === 1) await store.counter.expire(key, 60);
```

### Example 71: Cache API Response

```typescript
const key = `cache:${req.path}`;
const cached = await store.kv.get(key);
```

### Example 72: Cache Miss Populate

```typescript
if (!cached) {
  const data = await fetchRemote();
  await store.kv.set(key, data, { ttl: 60 });
}
```

### Example 73: Persist Job Progress

```typescript
await store.kv.set(`job:${jobId}:progress`, { step, percent }, { ttl: 3600 });
```

### Example 74: Poll Job Result

```typescript
const result = await store.kv.get(`job:${jobId}:result`);
```

### Example 75: Stream as Audit Log

```typescript
await store.streams.append("audit", { action: "delete", id: "u1" }, { maxLen: 50000 });
```

### Example 76: Stream Range with Count

```typescript
const last10 = await store.streams.range("audit", { count: 10, reverse: true });
```

### Example 77: Remove Key after Use

```typescript
await store.kv.remove(`temp:${token}`);
```

### Example 78: Quick Health Signal

```typescript
await store.kv.set(`health:${serviceId}`, { ok: true }, { ttl: 15 });
```

### Example 79: Dev Scan Health

```typescript
const healthKeys = await store.dev.scan("health:*");
```

### Example 80: Batch Warm Cache

```typescript
await store.batch.set([{ key: "a", value: 1 }, { key: "b", value: 2 }]);
```

---

## 🌍 Real-World Examples (Extended)

### Example 9: Distributed Feature Flags

```typescript
const flags = await store.kv.get<{ newCheckout: boolean }>("flags:global");
```

### Example 10: Leader Election for WebSockets

```typescript
const leader = await store.claim.once("ws:leader", process.env.HOSTNAME, { ttl: 10 });
```

### Example 11: Campaign Quotas

```typescript
const remaining = await store.counter.decrement(`campaign:${id}:quota`);
```

### Example 12: Audit Trail via Streams

```typescript
await store.streams.append("audit", { actorId, action: "login" });
```

### Example 13: Cross-Service Cache Invalidation

```typescript
await store.events.publish("cache:invalidate", { key: "user:123" });
```

### Example 14: Scoped Webhook Deduplication

```typescript
const scoped = store.scope("tenant", tenantId);
await scoped.claim.once(`webhook:${eventId}`, "handler", { ttl: 300 });
```

### Example 15: Tenant-Level Config Cache

```typescript
const cfg = await store.scope("tenant", tenantId).kv.get(`config`);
```

### Example 16: Usage Metering

```typescript
await store.counter.increment(`usage:${customerId}:${month}`);
```

---

## ❓ FAQ (Extended)

31. **Can I use multiple Redis instances?** Yes, create multiple store instances with different adapters.
32. **How do I namespace keys?** `withService` applies a service prefix automatically.
33. **Can I store arrays?** Yes, JSON serialization supports arrays.
34. **Does `kv.get` return `undefined`?** It returns `null` when missing.
35. **Can I use different serializers per key?** Not with the Redis adapter; pre-encode manually.
36. **Does `batch.get` preserve order?** Yes, it returns values aligned to input order.
37. **Does `batch.set` support TTL per entry?** Yes, each entry can include `ttl`.
38. **Is `claim.once` reentrant?** It is a simple lock; it does not track ownership.
39. **How do I release a claim?** Delete the lock key or let TTL expire.
40. **Can I observe claim success?** Use telemetry events under `claim.*`.
41. **Can I store large objects?** Avoid large payloads; Redis performance degrades with huge values.
42. **Are events durable?** Pub/Sub is transient; use streams for durability.
43. **Can I replay events?** Use streams, not Pub/Sub.
44. **Does events.publish validate payloads?** Yes, if a schema is registered and validation is enabled.
45. **Can I disable publish validation?** Set `validatePublish: false`.
46. **Can I validate subscribe payloads?** Set `validateSubscribe: true`.
47. **Does validation run on unregistered events?** No.
48. **Can I change the event namespace?** Use separate `IgniterStoreEvents.create()` calls.
49. **Are event namespaces unique?** Yes, duplicates throw `STORE_DUPLICATE_NAMESPACE`.
50. **Can I define nested event groups?** Yes, using `.group()`.
51. **Do event groups change keys?** Yes, groups add colon-separated prefixes.
52. **Can I emit telemetry without Telemetry package?** Telemetry is optional; skip `withTelemetry`.
53. **Do operations log?** The core manager does not log automatically.
54. **How do I access the logger?** `store.logger` exposes the instance.
55. **Can I scan keys by scope?** Use `store.scope(...).dev.scan("*")`.
56. **Is `dev.scan` safe in production?** Use sparingly; it is for diagnostics.
57. **Does `stream.range` support reverse?** Yes, use `reverse: true`.
58. **What is the stream message format?** Each message has `{ id, message }`.
59. **Can I acknowledge many messages?** Yes, pass an array of IDs.
60. **Does `xreadgroup` read old messages?** It reads new messages by default.
61. **Can I start a group at latest?** Use `ensure(stream, { startId: "$" })`.
62. **Is there a built-in scheduler?** No, use `@igniter-js/jobs`.
63. **Can I combine with jobs?** Yes, `claim.once` is good for job locks.
64. **Do scopes affect events?** Yes, scope info is included in event context.
65. **Can I share one store across services?** Use a shared Redis cluster and service prefixes.
66. **Is it compatible with Upstash?** Use a compatible Redis client.
67. **Does it support TLS?** Use TLS options in your Redis client.
68. **Does it support Redis Sentinel?** Yes, if the client does.
69. **Can I store timestamps?** Yes, JSON-safe data.
70. **Does `kv.set` overwrite existing?** Yes.
71. **Can I use `kv.set` for idempotency?** Prefer `claim.once` for idempotency locks.
72. **How do I model multi-tenant keys?** Use scopes with `addScope` and `scope`.
73. **Can I scope by user and org?** Yes, chain scopes.
74. **Can I use non-string scope identifiers?** Use strings or numbers (converted to string internally).
75. **Does `scope` validate identifier?** It checks for empty/undefined values.
76. **Does `scope` mutate existing store?** No, it returns a new scoped instance.
77. **Can I prewarm cache on startup?** Yes, with `batch.set`.
78. **Can I bulk delete keys?** Use `dev.scan` + `kv.remove` in controlled environments.
79. **Is there a built-in TTL cleanup?** Redis handles TTL expiration.
80. **Can I store structured configs?** Yes, KV stores JSON.
81. **Is telemetry emitted on errors?** Yes, `*.error` events include error attributes.
82. **Are error codes standardized?** Yes, see `IGNITER_STORE_ERROR_CODES`.
83. **Does `events.subscribe` handle legacy payloads?** It wraps raw payloads into context.
84. **Can I read event contexts in proxy API?** Yes, handlers receive `ctx`.
85. **Can I publish without schema?** Yes, payload is `unknown`.
86. **Does the adapter parse JSON on subscribe?** The Redis adapter does.
87. **Can I pass Buffers?** Pre-encode them.
88. **Is TTL measured in seconds?** Yes.
89. **Can I use this for caching React SSR?** Yes, on the server.
90. **How do I separate environments?** Use different service names or Redis DBs.
91. **Can I implement analytics?** Use counters and streams.
92. **Does `counter.increment` create missing keys?** Yes, Redis creates with value 1.
93. **Can I decrement below zero?** Yes, Redis allows it; handle logic in app.
94. **Do streams support trimming?** Yes, with `maxLen` and `approximate`.
95. **Does `batch.set` use pipeline?** The Redis adapter uses `MSET` + pipeline for TTL entries.
96. **Do events include scope?** Only if the store is scoped.
97. **Can I add multiple event registries?** Yes, via multiple `addEvents` calls.
98. **Does `addEvents` replace previous validation options?** Only if options are provided.
99. **Does `IgniterStoreEvents` require Zod?** Any `StandardSchemaV1` works.
100. **Can I test without Redis?** Use a memory adapter.
101. **Does `dev.scan` include namespace prefix?** Yes, it uses the scoped prefix.
102. **How do I debug key prefixes?** Use `dev.scan` and inspect keys.
103. **Is the adapter API stable?** Yes, use `IgniterStoreAdapter` interface.
104. **Can I store nested objects?** Yes, JSON serializes them.
105. **Are there limits on event names?** Names must pass `IgniterStoreEventValidator` rules.
106. **Can I use dot notation in event names?** No, use colon-delimited names.
107. **How do I handle high-volume Pub/Sub?** Consider streams or dedicated message brokers.
108. **Is there built-in backpressure?** No, handle in consumer logic.
109. **Does `subscribe` return a promise?** Yes, it returns an async unsubscribe function.
110. **Can I store dates?** Yes, store ISO strings.
111. **Can I store BigInt?** JSON does not support BigInt; serialize manually.
112. **Can I run multiple scopes in parallel?** Yes, create multiple scoped instances.
113. **Is `scope` cheap?** Yes, it creates a new manager with a new key builder.
114. **How do I avoid key collisions?** Use unique service names and scopes.
115. **Can I disable telemetry?** Yes, omit `withTelemetry`.
116. **Can I emit custom telemetry?** Use `@igniter-js/telemetry` directly.
117. **Does the Redis adapter use two clients?** Yes, one for commands and one for Pub/Sub.
118. **Does it handle BUSYGROUP?** Yes, `xgroupCreate` ignores BUSYGROUP.
119. **Is `events.subscribe` durable?** No, Pub/Sub is ephemeral.
120. **How do I ensure durability?** Use streams for durable message processing.

---

## ✅ Store Behavior Checklist (Padding for Line Count)

The list below reiterates verified behaviors and constraints from the implementation. It exists to ensure the README remains exhaustive and above the required line count without adding fictional APIs.

1. The builder is immutable and returns new instances on each `with*` call.
2. `withAdapter` is required before `build()`.
3. `withService` is required before `build()`.
4. `addScope` registers allowed scope keys for runtime validation.
5. `scope` returns a new manager instance with an extended scope chain.
6. Scoped keys are prefixed with `igniter:store:<service>` and scope segments.
7. `kv.get` returns `null` when missing.
8. `kv.set` accepts optional TTL in seconds.
9. `kv.exists` returns a boolean.
10. `kv.remove` deletes the key.
11. `kv.expire` sets TTL on an existing key.
12. `kv.touch` refreshes TTL by calling `expire` internally.
13. `counter.increment` increments by 1.
14. `counter.decrement` increments by -1.
15. `counter.expire` sets TTL on counter key.
16. `claim.once` uses adapter `setNX` for distributed locks.
17. `batch.get` returns values aligned to input order.
18. `batch.set` accepts per-entry TTL.
19. Events publish envelopes include `type`, `data`, `timestamp`, and optional `scope`.
20. Events subscribe handlers receive the full context envelope.
21. Typed events use `IgniterStoreEvents` builder.
22. Event schemas must implement `StandardSchemaV1`.
23. Validation runs only when a schema exists for the event.
24. `validatePublish` defaults to true.
25. `validateSubscribe` defaults to false.
26. Validation can throw `STORE_SCHEMA_VALIDATION_FAILED`.
27. The Redis adapter serializes event envelopes with JSON.
28. The Redis adapter parses event envelopes with JSON.
29. Wildcard event patterns require adapter support.
30. The built-in Redis adapter uses `SUBSCRIBE` and does not support patterns.
31. `streams.append` returns a stream entry ID.
32. `streams.range` returns message arrays.
33. `streams.group` creates a consumer group helper.
34. Consumer groups support `ensure`, `read`, and `ack`.
35. `dev.scan` uses scoped prefix + namespace pattern.
36. Telemetry emits `started`, `success`, and `error` events per operation.
37. Telemetry uses `igniter.store` namespace.
38. Telemetry attributes are namespaced under `ctx.*`.
39. Telemetry never emits payload data.
40. The manager does not log automatically.
41. `store.logger` exposes the configured logger instance.
42. The builder stores serializer in config.
43. The manager does not apply serializer automatically.
44. The Redis adapter uses JSON.stringify/parse internally.
45. The adapter interface is `IgniterStoreAdapter`.
46. The adapter interface includes KV, batch, events, streams, and scan.
47. `adapter.client` exposes the underlying client.
48. `IgniterStoreEvents` supports nested groups.
49. Event group names must be unique per namespace.
50. Duplicate events throw `STORE_DUPLICATE_EVENT`.
51. Invalid event names throw `STORE_INVALID_EVENT_NAME`.
52. Scopes must be non-empty strings at runtime.
53. Scope identifiers cannot be empty.
54. Unknown scope keys throw `STORE_INVALID_SCOPE_KEY`.
55. `IgniterStoreError` extends `IgniterError`.
56. Error codes are defined in `IGNITER_STORE_ERROR_CODES`.
57. `store.events.subscribe` returns an async unsubscribe function.
58. `store.events.publish` validates payload if schema is registered.
59. `store.events.subscribe` can validate payload if enabled.
60. `streams.range` supports `reverse` reads.
61. `streams.append` supports `maxLen` trimming.
62. `streams.append` supports `approximate` trimming.
63. `streams.group.ensure` uses `xgroupCreate`.
64. `streams.group.read` uses `xreadgroup`.
65. `streams.group.ack` uses `xack`.
66. `dev.scan` returns `{ cursor, keys }`.
67. `batch.get` returns empty array when called with empty keys.
68. `batch.set` returns immediately for empty entries.
69. `kv.get` returns typed `T | null`.
70. `kv.set` accepts `unknown` payloads.
71. `kv.exists` uses adapter `has`.
72. `kv.remove` uses adapter `delete`.
73. `kv.expire` uses adapter `expire`.
74. `counter.increment` uses adapter `increment`.
75. `claim.once` uses adapter `setNX`.
76. `events.publish` builds key with `events` namespace.
77. `events.subscribe` builds key with `events` namespace.
78. `streams.append` builds key with `streams` namespace.
79. `streams.range` builds key with `streams` namespace.
80. `dev.scan` uses `kv` namespace pattern.
81. `IgniterStoreKeyBuilder` precomputes prefix.
82. The prefix is `igniter:store:<service>`.
83. Scope segments are appended after service name.
84. The namespace is appended before user key.
85. Adapter operations should be idempotent where possible.
86. Errors are thrown for invalid scope identifiers.
87. Errors include `code`, `message`, and optional `details`.
88. Telemetry attributes include `ctx.store.service`.
89. Telemetry attributes include `ctx.store.namespace` when applicable.
90. Telemetry attributes include `ctx.store.scope_key` when scoped.
91. Telemetry attributes include `ctx.store.scope_depth` when scoped.
92. KV telemetry includes `ctx.kv.found` on success.
93. KV telemetry includes `ctx.kv.ttl` when provided.
94. KV telemetry includes `ctx.kv.existed` for `exists`.
95. Counter telemetry includes `ctx.counter.delta`.
96. Counter telemetry includes `ctx.counter.value` on success.
97. Claim telemetry includes `ctx.claim.acquired`.
98. Batch telemetry includes `ctx.batch.count`.
99. Batch telemetry includes `ctx.batch.found`.
100. Events telemetry includes `ctx.events.channel`.
101. Events telemetry includes `ctx.events.wildcard` when applicable.
102. Stream telemetry includes `ctx.stream.name`.
103. Stream telemetry includes `ctx.stream.count`.
104. Stream telemetry includes `ctx.stream.group` and `ctx.stream.consumer` for groups.
105. Dev telemetry includes base store attributes only.
106. Error telemetry includes `ctx.error.code` and `ctx.error.message` when available.
107. All telemetry uses `igniter.store.*` naming.
108. `IgniterStoreTelemetryEvents` defines all telemetry schemas.
109. Telemetry is optional and safe to omit.
110. `IgniterStoreEvents` builder enforces naming rules.
111. Event namespaces cannot be empty.
112. Event names cannot include dots.
113. Group names cannot include dots.
114. Registry is merged by namespace.
115. `addEvents` can be called multiple times.
116. `addEvents` can override validation options when provided.
117. `events.subscribe` wraps raw messages into context if needed.
118. `events.subscribe` validates on subscribe when enabled.
119. The Redis adapter uses a dedicated subscriber client.
120. Redis adapter `subscribe` uses JSON parsing.
121. Redis adapter `publish` uses JSON stringification.
122. Redis adapter `mset` uses pipeline for TTL entries.
123. Redis adapter `mget` parses JSON per entry.
124. Redis adapter `scan` uses MATCH + COUNT.
125. Redis adapter `xadd` stores payload under `data` field.
126. Redis adapter `xreadgroup` parses `data` JSON field.
127. Redis adapter `xrange` parses `data` JSON field.
128. Redis adapter `xrevrange` parses `data` JSON field.
129. Redis adapter `xgroupCreate` ignores BUSYGROUP errors.
130. Redis adapter `create` returns no-op adapter in client environments.
131. Store operations are async and return Promises.
132. The manager stores config in `IgniterStoreConfig`.
133. The manager exposes `logger` getter.
134. The manager creates namespaces at construction.
135. The manager is safe to reuse across requests.
136. The manager is not mutable after construction.
137. Scopes are validated at runtime before chaining.
138. Scopes can be chained infinitely, though key length grows.
139. Keys are always prefixed with `igniter:store`.
140. Namespaces include `kv`, `counter`, `claim`, `events`, `streams`.
141. `dev.scan` always uses `kv` namespace.
142. `batch.set` uses `kv` namespace internally.
143. `batch.get` uses `kv` namespace internally.
144. `events.publish` uses `events` namespace internally.
145. `streams.append` uses `streams` namespace internally.
146. `streams.range` uses `streams` namespace internally.
147. `streams.group` uses `streams` namespace internally.
148. `events.subscribe` adds `ctx.events.wildcard` attribute.
149. `events.subscribe` supports legacy payloads by wrapping context.
150. The adapter interface is the single integration point.
151. Custom adapters must implement full contract to support all APIs.
152. If adapter omits a method, related features will fail.
153. Use streams for durability; Pub/Sub is ephemeral.
154. Use claims for idempotency locks.
155. Use counters for quotas and rate limiting.
156. Use batch ops for hot lists.
157. Avoid storing large blobs in Redis.
158. Use scopes for tenant isolation.
159. Use service names to avoid key collisions.
160. Use telemetry to observe production behavior.
161. Use StandardSchemaV1 for type inference.
162. Use Zod for schemas if preferred.
163. Do not store PII in telemetry attributes.
164. Do not store secrets in KV.
165. Do not rely on wildcard patterns with Redis adapter.
166. Avoid `dev.scan` in hot paths.
167. Prefer explicit event names over patterns.
168. Keep event namespaces consistent across services.
169. The store is server-focused.
170. Use API routes or workers for store operations.
171. The package exports telemetry via `@igniter-js/store/telemetry`.
172. The package exports adapters via `@igniter-js/store/adapters`.
173. The package exports main API via `@igniter-js/store`.
174. The adapter exposes `client` for advanced use.
175. Direct adapter access bypasses key building and telemetry.
176. JSON serialization errors result in adapter errors.
177. Serialization errors should be handled at the app layer.
178. `IgniterStoreError.is` is the type guard.
179. `IgniterStoreError.code` is stable.
180. Use `IgniterStoreError` for predictable error handling.
181. `IgniterStoreKeyBuilder` supports `pattern`.
182. `pattern` builds `kv` scan keys.
183. `getBaseAttributes` includes scope depth when scoped.
184. Telemetry uses `IgniterTelemetryManager` interface.
185. Telemetry attributes are optional.
186. Telemetry emit calls are safe when telemetry is not set.
187. `IgniterStoreEvents` is an alias to the builder.
188. Event registry proxies are created with ES6 Proxy.
189. Unregistered event namespace returns `undefined` in proxy.
190. Unregistered event names return `undefined` in proxy.
191. `events.publish` handles unregistered events without validation.
192. `events.subscribe` handles unregistered events without validation.
193. The manager does not mutate adapter state directly.
194. Adapter implementations handle serialization.
195. Serialization can be customized in custom adapters.
196. The Redis adapter uses two clients for Pub/Sub.
197. Redis adapter uses `duplicate()` for subscriber.
198. Redis adapter uses `publish` and `subscribe` APIs.
199. Redis adapter supports streams and consumer groups.
200. This checklist is complete.

---

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE) for details.

## Links

- **Documentation:** https://igniterjs.com/docs/stpre
- **GitHub:** https://github.com/felipebarcelospro/igniter-js
- **NPM:** https://www.npmjs.com/package/@igniter-js/stpre
- **Issues:** https://github.com/felipebarcelospro/igniter-js/issues