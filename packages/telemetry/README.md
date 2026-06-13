# @igniter-js/telemetry

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/telemetry)](https://www.npmjs.com/package/@igniter-js/telemetry)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6%2B-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22%2B-green)](https://nodejs.org/)

**Type-safe telemetry for Node.js apps**  
Session-aware events, typed registries, redaction, sampling, and pluggable transports.

[Quick Start](#-quick-start) • [Core Concepts](#-core-concepts) • [Examples](#-usage-examples) • [Adapters](#-adapters) • [API Reference](#-api-reference)

</div>

---

## ✨ Why @igniter-js/telemetry?

Telemetry without structure becomes noise. This package delivers **typed, correlated, privacy-safe telemetry** with minimal configuration and maximum correctness.

- ✅ **Type-safe events** with autocompletion via `IgniterTelemetryEvents`
- ✅ **Session correlation** using AsyncLocalStorage (no manual context passing)
- ✅ **PII protection** with redaction + hashing
- ✅ **Volume control** with sampling policies
- ✅ **Pluggable transports** for logs, OTLP, Slack, Discord, Sentry, HTTP, and Redis Streams
- ✅ **Framework-friendly** patterns for Next.js, Express, Fastify, and more

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @igniter-js/telemetry
```

```bash
# pnpm
pnpm add @igniter-js/telemetry
```

```bash
# yarn
yarn add @igniter-js/telemetry
```

```bash
# bun
bun add @igniter-js/telemetry
```

### Your First Telemetry (60 seconds)

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { LoggerTransportAdapter } from '@igniter-js/telemetry/adapters'

const telemetry = IgniterTelemetry.create()
  .withService('billing-api')
  .withEnvironment(process.env.NODE_ENV ?? 'development')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()

telemetry.emit('service.booted', {
  attributes: { 'ctx.service.uptime_ms': 42 },
})
```

✅ **Success!** You now have structured telemetry with a console transport.

---

## 🎯 Core Concepts

### Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                       Your App                           │
├──────────────────────────────────────────────────────────┤
│ telemetry.emit('payment.succeeded', { attributes: ... }) │
└───────────────┬──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│          IgniterTelemetryManager (runtime)               │
│  Sampling → Envelope → Async Session → Redaction         │
└───────────────┬──────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────┐
│                     Transport Fan-out                    │
│  Logger | HTTP | OTLP | Sentry | Slack | Discord | Store  │
└──────────────────────────────────────────────────────────┘
```

### Key Abstractions

- **Builder**: `IgniterTelemetry.create()` builds immutable configuration.
- **Manager**: `IgniterTelemetryManager` emits events and manages sessions.
- **Events Registry**: `IgniterTelemetryEvents` defines typed event schemas.
- **Session**: `telemetry.session()` binds actor/scope/context across async calls.
- **Transport Adapter**: Implement `IgniterTelemetryTransportAdapter` to route events.

### Session Lifecycle

```
create → configure → run → emit → end → (re-create)
  │         │        │       │       │
  │    .actor()   enters   calls   marks
  │    .scope()    ALS     .emit()  ended
  │    .attrs()
  │
  └── telemetry.session()
```

### Session Modes (3 DX flavors)

| Mode | When to Use | Example |
|------|-------------|---------|
| **Direct emit** | Simple fire-and-forget events | `telemetry.emit('app.started')` |
| **Manual session** | Explicit context without async scoping | `const s = telemetry.session().actor(...)` |
| **Scoped execution** (recommended) | Request handlers, middleware, async workflows | `session.run(async () => { ... })`

---

## 📖 Usage Examples

> The examples below are fully aligned with the current implementation.

### 1) Minimal setup (Logger transport)

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { LoggerTransportAdapter } from '@igniter-js/telemetry/adapters'

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .withEnvironment('development')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()

telemetry.emit('app.started')
```

### 2) Add version metadata

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .withEnvironment('production')
  .withVersion('1.4.2')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

### 3) Register actors and scopes

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('checkout')
  .addActor('user', { description: 'Signed-in user' })
  .addActor('system')
  .addScope('organization', { required: true })
  .addScope('workspace')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

### 4) Emit with attributes

```typescript
telemetry.emit('cart.item_added', {
  attributes: {
    'ctx.cart.id': 'cart_123',
    'ctx.product.sku': 'sku_987',
    'ctx.product.quantity': 2,
  },
})
```

### 5) Emit with error details

```typescript
telemetry.emit('payment.failed', {
  level: 'error',
  error: {
    name: 'PaymentError',
    message: 'Card declined',
    code: 'CARD_DECLINED',
  },
  attributes: {
    'ctx.payment.provider': 'stripe',
  },
})
```

### 6) Manual session handle

```typescript
const session = telemetry.session()
  .actor('user', 'usr_123', { role: 'admin' })
  .scope('organization', 'org_789')
  .attributes({ 'ctx.request.id': 'req_456' })

session.emit('user.login', {
  attributes: { 'ctx.login.method': 'oauth' },
})

await session.end()
```

### 7) Scoped execution (recommended)

```typescript
await telemetry.session()
  .actor('user', 'usr_123')
  .scope('organization', 'org_789')
  .run(async () => {
    telemetry.emit('request.started', {
      attributes: { 'ctx.request.path': '/api/orders' },
    })

    // ... your logic

    telemetry.emit('request.completed', {
      attributes: { 'ctx.request.status': 200 },
    })
  })
```

### 8) Typed event registry (flat events)

```typescript
import { z } from 'zod'
import { IgniterTelemetryEvents } from '@igniter-js/telemetry'

const JobsEvents = IgniterTelemetryEvents
  .namespace('igniter.jobs')
  .event('worker.started', z.object({ 'ctx.worker.id': z.string() }))
  .event('worker.stopped', z.object({ 'ctx.worker.id': z.string() }))
  .build()
```

### 9) Typed event registry (grouped events)

```typescript
import { z } from 'zod'
import { IgniterTelemetryEvents } from '@igniter-js/telemetry'

const BillingEvents = IgniterTelemetryEvents
  .namespace('igniter.billing')
  .group('invoice', (g) =>
    g
      .event('created', z.object({ 'ctx.invoice.id': z.string() }))
      .event('paid', z.object({ 'ctx.invoice.id': z.string(), 'ctx.invoice.amount': z.number() }))
      .event('voided', z.object({ 'ctx.invoice.id': z.string() }))
  )
  .build()
```

### 10) Use registry in builder

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('billing')
  .addEvents(BillingEvents)
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()

telemetry.emit('igniter.billing.invoice.paid', {
  attributes: { 'ctx.invoice.id': 'inv_123', 'ctx.invoice.amount': 42 },
})
```

### 11) Validation options (stored in config)

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addEvents(BillingEvents, { mode: 'always', strict: true })
  .withValidation({ mode: 'always', strict: true })
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

### 12) Sampling policy

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .withSampling({
    debugRate: 0.01,
    infoRate: 0.1,
    warnRate: 1.0,
    errorRate: 1.0,
    always: ['*.failed', '*.error'],
    never: ['health.check', 'metrics.heartbeat'],
  })
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

### 13) Redaction policy

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .withRedaction({
    denylistKeys: ['password', 'token', 'authorization'],
    hashKeys: ['email', 'ip', 'userId'],
    maxStringLength: 500,
  })
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

### 14) Emit with source metadata

```typescript
telemetry.emit('feature.flag.loaded', {
  source: { causer: '@myapp/flags', file: 'flags.ts', line: 88 },
  attributes: { 'ctx.flag.key': 'new-dashboard' },
})
```

### 15) Custom transport adapter

```typescript
import type { IgniterTelemetryTransportAdapter } from '@igniter-js/telemetry'
import type { IgniterTelemetryEnvelope } from '@igniter-js/telemetry'

class DatadogTransport implements IgniterTelemetryTransportAdapter {
  readonly type = 'datadog' as const

  async handle(envelope: IgniterTelemetryEnvelope): Promise<void> {
    await fetch('https://example.com/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    })
  }
}

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(new DatadogTransport())
  .build()
```

### 16) In-memory transport (testing)

```typescript
import { InMemoryTransportAdapter } from '@igniter-js/telemetry/adapters'

const memory = InMemoryTransportAdapter.create()

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(memory)
  .build()

telemetry.emit('test.event')

const events = memory.getEvents()
console.log(events.length)
```

### 17) Mock adapter (unit tests)

```typescript
import { MockTelemetryAdapter } from '@igniter-js/telemetry/adapters'

const mock = MockTelemetryAdapter.create()

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(mock)
  .build()

telemetry.emit('user.created')

expect(mock.getLastEvent()?.name).toBe('user.created')
```

### 18) Logger adapter with JSON output

```typescript
const logger = LoggerTransportAdapter.create({
  logger: console,
  format: 'json',
  minLevel: 'info',
  includeTimestamp: true,
})

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(logger)
  .build()
```

### 19) HTTP adapter

```typescript
import { HttpTransportAdapter } from '@igniter-js/telemetry/adapters'

const http = HttpTransportAdapter.create({
  url: 'https://webhook.example.com/telemetry',
  headers: { Authorization: `Bearer ${process.env.TELEMETRY_TOKEN}` },
  timeout: 4000,
  retries: 0,
})

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(http)
  .build()
```

### 20) OTLP adapter (Logs over HTTP)

```typescript
import { OtlpTransportAdapter } from '@igniter-js/telemetry/adapters'

const otlp = OtlpTransportAdapter.create({
  url: 'http://localhost:4318/v1/logs',
  headers: { 'x-api-key': process.env.OTEL_API_KEY ?? '' },
})

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(otlp)
  .build()
```

### 21) Sentry adapter

```typescript
import * as Sentry from '@sentry/node'
import { SentryTransportAdapter } from '@igniter-js/telemetry/adapters'

Sentry.init({ dsn: process.env.SENTRY_DSN })

const sentry = SentryTransportAdapter.create({ sentry: Sentry })

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(sentry)
  .build()
```

### 22) Slack adapter

```typescript
import { SlackTransportAdapter } from '@igniter-js/telemetry/adapters'

const slack = SlackTransportAdapter.create({
  webhookUrl: process.env.SLACK_WEBHOOK_URL ?? '',
  minLevel: 'error',
  username: 'Igniter Bot',
  iconEmoji: ':rotating_light:',
})

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(slack)
  .build()
```

### 23) Discord adapter

```typescript
import { DiscordTransportAdapter } from '@igniter-js/telemetry/adapters'

const discord = DiscordTransportAdapter.create({
  webhookUrl: process.env.DISCORD_WEBHOOK_URL ?? '',
  minLevel: 'warn',
  username: 'Igniter Bot',
  avatarUrl: 'https://example.com/avatar.png',
})

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(discord)
  .build()
```

### 24) Telegram adapter

```typescript
import { TelegramTransportAdapter } from '@igniter-js/telemetry/adapters'

const telegram = TelegramTransportAdapter.create({
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  minLevel: 'error',
})

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(telegram)
  .build()
```

### 25) Store stream adapter (Redis Streams)

```typescript
import Redis from 'ioredis'
import { StoreStreamTransportAdapter } from '@igniter-js/telemetry/adapters'

const redis = new Redis(process.env.REDIS_URL)

const storeStream = StoreStreamTransportAdapter.create({
  redis,
  stream: 'telemetry:events',
  maxLen: 10000,
  approximate: true,
})

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(storeStream)
  .build()
```

### 26) Store stream adapter with dynamic stream names

```typescript
const storeStream = StoreStreamTransportAdapter.create({
  redis,
  streamBuilder: (envelope) => `telemetry:${envelope.service}:${envelope.level}`,
})

const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(storeStream)
  .build()
```

### 27) Combine multiple transports

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .addTransport(OtlpTransportAdapter.create({ url: 'http://localhost:4318/v1/logs' }))
  .addTransport(SlackTransportAdapter.create({ webhookUrl: process.env.SLACK_WEBHOOK_URL ?? '' }))
  .build()
```

### 28) Shared helper with manager type

```typescript
import type { IIgniterTelemetryManager } from '@igniter-js/telemetry'

export function trackCheckoutStart(telemetry: IIgniterTelemetryManager) {
  telemetry.emit('checkout.started', {
    attributes: { 'ctx.checkout.step': 'payment' },
  })
}
```

### 29) Emit from request middleware (Express)

```typescript
import type { Request, Response, NextFunction } from 'express'
import type { IIgniterTelemetryManager } from '@igniter-js/telemetry'

export function telemetryMiddleware(telemetry: IIgniterTelemetryManager) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    await telemetry.session()
      .actor('user', req.headers['x-user-id'] as string | undefined)
      .scope('organization', req.headers['x-org-id'] as string)
      .attributes({ 'ctx.request.id': req.headers['x-request-id'] as string })
      .run(async () => {
        telemetry.emit('request.received', { attributes: { 'ctx.request.path': req.path } })
        await next()
      })
  }
}
```

### 30) Next.js Route Handler

```typescript
// app/api/health/route.ts
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { LoggerTransportAdapter } from '@igniter-js/telemetry/adapters'

const telemetry = IgniterTelemetry.create()
  .withService('next-api')
  .withEnvironment(process.env.NODE_ENV ?? 'development')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()

export async function GET() {
  telemetry.emit('health.check')
  return new Response('ok')
}
```

### 31) Fastify hook

```typescript
import type { FastifyInstance } from 'fastify'
import type { IIgniterTelemetryManager } from '@igniter-js/telemetry'

export async function telemetryPlugin(app: FastifyInstance, telemetry: IIgniterTelemetryManager) {
  app.addHook('onRequest', async (req) => {
    await telemetry.session()
      .actor('user', (req.headers['x-user-id'] as string) ?? undefined)
      .run(async () => {
        telemetry.emit('request.received', { attributes: { 'ctx.request.path': req.url } })
      })
  })
}
```

### 32) Sampling helper

```typescript
import { IgniterTelemetrySampling } from '@igniter-js/telemetry'

const sampler = IgniterTelemetrySampling.createSampler({
  debugRate: 0.0,
  infoRate: 0.5,
  warnRate: 1.0,
  errorRate: 1.0,
})

const shouldLog = sampler('order.created', 'info')
console.log('sampled?', shouldLog)
```

### 33) Redact attributes programmatically

```typescript
import { IgniterTelemetryRedaction } from '@igniter-js/telemetry'

const redact = IgniterTelemetryRedaction.createRedactor({
  denylistKeys: ['password'],
  hashKeys: ['email'],
  maxStringLength: 100,
})

const result = await redact({
  password: 'secret',
  email: 'user@example.com',
  message: 'hello world',
})

console.log(result)
```

### 34) Generate IDs

```typescript
import { IgniterTelemetryId } from '@igniter-js/telemetry'

const sessionId = IgniterTelemetryId.generateSessionId()
const spanId = IgniterTelemetryId.generateSpanId()
const traceId = IgniterTelemetryId.generateTraceId()

console.log({ sessionId, spanId, traceId })
```

### 35) Validate event names

```typescript
import { IgniterTelemetryValidator } from '@igniter-js/telemetry'

IgniterTelemetryValidator.validate('billing.invoice.paid', 'Event')
IgniterTelemetryValidator.validate('igniter.billing', 'Namespace')
```

### 36) Session attributes merge behavior

```typescript
const session = telemetry.session().attributes({ 'ctx.request.id': 'req_1' })
session.emit('request.started', { attributes: { 'ctx.request.method': 'GET' } })
```

### 37) Session actor override per emit

```typescript
const session = telemetry.session().actor('user', 'usr_1')
session.emit('admin.action', {
  actor: { type: 'system', id: 'scheduler' },
})
```

### 38) Scoped execution with return value

```typescript
const result = await telemetry.session().run(async () => {
  telemetry.emit('task.started')
  return 42
})
```

### 39) Explicit session ID

```typescript
const session = telemetry.session().id('custom-session-id')
session.emit('session.bound')
```

### 40) Emit using `source`

```typescript
telemetry.emit('cache.miss', {
  source: { causer: '@myapp/cache', file: 'cache.ts', line: 132 },
  attributes: { 'ctx.cache.key': 'user:1' },
})
```

### 41) Emit with actor and scope in input

```typescript
telemetry.emit('audit.event', {
  actor: { type: 'user', id: 'usr_1' },
  scope: { type: 'organization', id: 'org_1' },
  attributes: { 'ctx.audit.action': 'delete' },
})
```

### 42) Flush and shutdown

```typescript
await telemetry.flush()
await telemetry.shutdown()
```

### 43) Basic schema cookbook: auth

```typescript
const AuthEvents = IgniterTelemetryEvents
  .namespace('igniter.auth')
  .event('login.succeeded', z.object({ 'ctx.user.id': z.string() }))
  .event('login.failed', z.object({ 'ctx.auth.reason': z.string() }))
  .build()
```

### 44) Schema cookbook: jobs

```typescript
const JobEvents = IgniterTelemetryEvents
  .namespace('igniter.jobs')
  .group('job', (g) =>
    g
      .event('started', z.object({ 'ctx.job.id': z.string() }))
      .event('completed', z.object({ 'ctx.job.id': z.string(), 'ctx.job.duration_ms': z.number() }))
      .event('failed', z.object({ 'ctx.job.id': z.string(), 'ctx.job.error': z.string() }))
  )
  .build()
```

### 45) Schema cookbook: storage

```typescript
const StorageEvents = IgniterTelemetryEvents
  .namespace('igniter.storage')
  .event('file.uploaded', z.object({ 'ctx.file.id': z.string(), 'ctx.file.size': z.number() }))
  .event('file.deleted', z.object({ 'ctx.file.id': z.string() }))
  .build()
```

### 46) Schema cookbook: http

```typescript
const HttpEvents = IgniterTelemetryEvents
  .namespace('igniter.http')
  .event('request.started', z.object({ 'ctx.request.path': z.string() }))
  .event('request.completed', z.object({ 'ctx.request.status': z.number() }))
  .build()
```

### 47) Schema cookbook: billing

```typescript
const BillingEvents = IgniterTelemetryEvents
  .namespace('igniter.billing')
  .group('invoice', (g) =>
    g
      .event('created', z.object({ 'ctx.invoice.id': z.string() }))
      .event('paid', z.object({ 'ctx.invoice.id': z.string(), 'ctx.invoice.amount': z.number() }))
  )
  .build()
```

### 48) Schema cookbook: analytics

```typescript
const AnalyticsEvents = IgniterTelemetryEvents
  .namespace('igniter.analytics')
  .event('event.tracked', z.object({ 'ctx.event.name': z.string() }))
  .build()
```

### 49) Sampling patterns with `always` and `never`

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .withSampling({ always: ['*.error'], never: ['health.check'] })
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

### 50) Redaction patterns for nested keys

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .withRedaction({ denylistKeys: ['user.password', 'credentials.token'] })
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

---

## 🧩 Adapters

All adapters are available from the subpath:

```typescript
import {
  LoggerTransportAdapter,
  HttpTransportAdapter,
  OtlpTransportAdapter,
  SlackTransportAdapter,
  DiscordTransportAdapter,
  TelegramTransportAdapter,
  SentryTransportAdapter,
  InMemoryTransportAdapter,
  MockTelemetryAdapter,
  StoreStreamTransportAdapter,
} from '@igniter-js/telemetry/adapters'
```

### Built-in adapters

| Adapter | Type | Purpose |
| --- | --- | --- |
| `LoggerTransportAdapter` | `logger` | Console or structured logs |
| `HttpTransportAdapter` | `http` | Send events to any HTTP endpoint |
| `OtlpTransportAdapter` | `otlp` | OTLP Logs over HTTP |
| `SentryTransportAdapter` | `sentry` | Errors + breadcrumbs to Sentry |
| `SlackTransportAdapter` | `slack` | Slack webhook alerts |
| `DiscordTransportAdapter` | `discord` | Discord webhook alerts |
| `TelegramTransportAdapter` | `telegram` | Telegram Bot alerts |
| `InMemoryTransportAdapter` | `memory` | In-memory capture (tests/dev) |
| `MockTelemetryAdapter` | `mock` | High-fidelity test adapter |
| `StoreStreamTransportAdapter` | `store` | Redis Streams via @igniter-js/store |

### Adapter configuration reference

#### LoggerTransportAdapter

```typescript
const adapter = LoggerTransportAdapter.create({
  logger: console,
  format: 'json',
  includeTimestamp: true,
  minLevel: 'debug',
})
```

#### HttpTransportAdapter

```typescript
const adapter = HttpTransportAdapter.create({
  url: 'https://example.com/telemetry',
  headers: { Authorization: 'Bearer token' },
  timeout: 5000,
  retries: 0,
})
```

#### OtlpTransportAdapter

```typescript
const adapter = OtlpTransportAdapter.create({
  url: 'http://localhost:4318/v1/logs',
  headers: { 'x-api-key': 'key' },
})
```

#### SentryTransportAdapter

```typescript
const adapter = SentryTransportAdapter.create({ sentry: Sentry })
```

#### SlackTransportAdapter

```typescript
const adapter = SlackTransportAdapter.create({
  webhookUrl: process.env.SLACK_WEBHOOK_URL ?? '',
  minLevel: 'error',
  username: 'Igniter Telemetry',
  iconEmoji: ':fire:',
})
```

#### DiscordTransportAdapter

```typescript
const adapter = DiscordTransportAdapter.create({
  webhookUrl: process.env.DISCORD_WEBHOOK_URL ?? '',
  minLevel: 'warn',
  username: 'Igniter Telemetry',
  avatarUrl: 'https://example.com/avatar.png',
})
```

#### TelegramTransportAdapter

```typescript
const adapter = TelegramTransportAdapter.create({
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  minLevel: 'error',
})
```

#### StoreStreamTransportAdapter

```typescript
const adapter = StoreStreamTransportAdapter.create({
  redis,
  stream: 'telemetry:events',
  maxLen: 10000,
  approximate: true,
  streamBuilder: (envelope) => `telemetry:${envelope.service}`,
})
```

---

## 🌍 Real-World Examples

### Case 1: E-commerce order pipeline (Retail)

```typescript
await telemetry.session()
  .scope('order', 'ord_123')
  .actor('user', 'usr_99')
  .run(async () => {
    telemetry.emit('order.payment_started', {
      attributes: { 'ctx.payment.provider': 'stripe' },
    })

    const result = await processPayment('ord_123')

    if (result.success) {
      telemetry.emit('order.payment_succeeded', {
        attributes: { 'ctx.payment.transaction_id': result.id },
      })
    } else {
      telemetry.emit('order.payment_failed', {
        level: 'error',
        error: { name: 'PaymentError', message: result.error },
      })
    }
  })
```

### Case 2: SaaS usage billing (B2B)

```typescript
telemetry.emit('workspace.created', {
  scope: { type: 'organization', id: 'org_9' },
  attributes: {
    'ctx.workspace.id': 'ws_77',
    'ctx.workspace.plan': 'pro',
  },
})
```

### Case 3: Fintech audit trail (Compliance)

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('bank-api')
  .withRedaction({ hashKeys: ['ctx.request.ip'] })
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()

telemetry.emit('account.balance_viewed', {
  attributes: {
    'ctx.account.id': 'acct_45',
    'ctx.request.ip': '203.0.113.1',
  },
})
```

### Case 4: DevOps pipeline telemetry

```typescript
const session = telemetry.session().scope('pipeline', 'build_123')

session.emit('pipeline.stage_started', {
  attributes: { 'ctx.stage.name': 'test' },
})

// ... run tests

session.emit('pipeline.stage_completed', {
  attributes: { 'ctx.stage.name': 'test', 'ctx.stage.status': 'success' },
})
```

### Case 5: AI agent orchestration

```typescript
await telemetry.session()
  .actor('agent', 'planner')
  .attributes({ 'ctx.agent.version': 'v3' })
  .run(async () => {
    telemetry.emit('agent.plan.started', {
      attributes: { 'ctx.plan.id': 'plan_42' },
    })

    // ... plan logic

    telemetry.emit('agent.plan.completed', {
      attributes: { 'ctx.plan.tokens_used': 812 },
    })
  })
```

### Case 6: Marketplace fraud detection

```typescript
telemetry.emit('fraud.signal.detected', {
  level: 'warn',
  attributes: {
    'ctx.user.id': 'usr_9',
    'ctx.fraud.score': 0.93,
    'ctx.fraud.rule': 'velocity-check',
  },
})
```

### Case 7: Healthcare record access

```typescript
telemetry.emit('patient.record.accessed', {
  actor: { type: 'user', id: 'dr_1' },
  attributes: {
    'ctx.patient.id': 'pat_9',
    'ctx.record.type': 'lab',
  },
})
```

### Case 8: Media streaming telemetry

```typescript
telemetry.emit('stream.segment.buffered', {
  attributes: {
    'ctx.stream.id': 'stream_1',
    'ctx.segment.ms': 4000,
  },
})
```

### Case 9: IoT sensor health

```typescript
telemetry.emit('sensor.heartbeat', {
  attributes: { 'ctx.sensor.id': 'sensor_1', 'ctx.sensor.temp_c': 21.2 },
})
```

### Case 10: Search relevance audits

```typescript
telemetry.emit('search.query.executed', {
  attributes: {
    'ctx.search.query': 'wireless earbuds',
    'ctx.search.results': 128,
  },
})
```

---

## ⚙️ Configuration

### Builder configuration overview

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .withEnvironment('production')
  .withVersion('1.2.3')
  .addActor('user')
  .addScope('organization')
  .addEvents(MyEvents)
  .withSampling({ infoRate: 0.1 })
  .withRedaction({ denylistKeys: ['password'] })
  .withValidation({ mode: 'development', strict: false })
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

### Redaction policy

```typescript
export interface IgniterTelemetryRedactionPolicy {
  denylistKeys?: string[]
  hashKeys?: string[]
  maxStringLength?: number
}
```

### Sampling policy

```typescript
export interface IgniterTelemetrySamplingPolicy {
  debugRate?: number
  infoRate?: number
  warnRate?: number
  errorRate?: number
  always?: string[]
  never?: string[]
}
```

### Event validation options

```typescript
export interface IgniterTelemetryEventsValidationOptions {
  mode?: 'development' | 'always' | 'none'
  strict?: boolean
}
```

---

## ✅ Testing

### Unit test with the mock adapter

```typescript
import { describe, it, expect } from 'vitest'
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { MockTelemetryAdapter } from '@igniter-js/telemetry/adapters'

describe('telemetry', () => {
  it('captures events', () => {
    const mock = MockTelemetryAdapter.create()

    const telemetry = IgniterTelemetry.create()
      .withService('test')
      .addTransport(mock)
      .build()

    telemetry.emit('test.event', { attributes: { 'ctx.test': true } })

    expect(mock.getEvents()).toHaveLength(1)
    expect(mock.getLastEvent()?.name).toBe('test.event')
  })
})
```

### Snapshot the envelope

```typescript
import { InMemoryTransportAdapter } from '@igniter-js/telemetry/adapters'

const memory = InMemoryTransportAdapter.create()
const telemetry = IgniterTelemetry.create()
  .withService('test')
  .addTransport(memory)
  .build()

telemetry.emit('snap.event', { attributes: { 'ctx.a': 1 } })
expect(memory.getEvents()[0].name).toBe('snap.event')
```

---

## 🧠 Best Practices

| ✅ Do | Why | Example |
| --- | --- | --- |
| Use `ctx.` prefixes | Prevent collisions with system fields | `'ctx.user.id'` |
| Use sessions for request scope | Guarantees correlation | `session.run(() => ...)` |
| Redact PII | Avoid data leaks | `withRedaction({ hashKeys: ['email'] })` |
| Sample debug noise | Reduce telemetry cost | `withSampling({ debugRate: 0.01 })` |
| Prefer typed registries | Enforces schema consistency | `IgniterTelemetryEvents` |

| ❌ Don’t | Why | Example |
| --- | --- | --- |
| Log raw tokens | Security risk | `{ token: '...' }` |
| Skip sessions in multi-tenant systems | Context loss | No `scope` |
| Use spaces or colons in names | Invalid event names | `'user:login'` |
| Throw inside transport `handle` | Disrupts pipeline | `throw new Error()` |

---

## 🧯 Troubleshooting

### `TELEMETRY_INVALID_TRANSPORT`

**Cause:** `addTransport()` received `undefined` or `null`.

**Fix:** Always pass a concrete adapter instance.

```typescript
telemetry.addTransport(LoggerTransportAdapter.create({ logger: console }))
```

### `TELEMETRY_DUPLICATE_NAMESPACE`

**Cause:** Two `IgniterTelemetryEvents` descriptors with the same namespace.

**Fix:** Ensure namespaces are unique.

```typescript
IgniterTelemetryEvents.namespace('igniter.billing')
```

### `TELEMETRY_DUPLICATE_SCOPE` / `TELEMETRY_DUPLICATE_ACTOR`

**Cause:** `addScope()` or `addActor()` was called with the same key twice.

**Fix:** Define each actor or scope once.

```typescript
telemetry.addScope('organization')
```

### `TELEMETRY_INVALID_EVENT_NAME` / `TELEMETRY_INVALID_NAMESPACE`

**Cause:** Reserved prefixes, spaces, or colon characters in names.

**Fix:** Use dot notation with lowercase words.

```typescript
IgniterTelemetryValidator.validate('billing.invoice.paid', 'Event')
```

### `TELEMETRY_SESSION_ENDED`

**Cause:** Emitting on a session after `await session.end()`.

**Fix:** Create a new session for subsequent events.

```typescript
const session = telemetry.session()
// ... use
await session.end()
```

### `TELEMETRY_TRANSPORT_INIT_FAILED`

**Cause:** Adapter `init()` threw during `build()`.

**Fix:** Validate adapter config and environment variables.

### `TELEMETRY_TRANSPORT_FAILED`

**Cause:** Every transport failed to handle the event.

**Fix:** Inspect adapter logs and ensure network connectivity.

---

## 🧩 Framework Integration

### Next.js (App Router)

```typescript
// app/lib/telemetry.ts
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { LoggerTransportAdapter } from '@igniter-js/telemetry/adapters'

export const telemetry = IgniterTelemetry.create()
  .withService('next-app')
  .withEnvironment(process.env.NODE_ENV ?? 'development')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

```typescript
// app/api/orders/route.ts
import { telemetry } from '@/app/lib/telemetry'

export async function POST() {
  telemetry.emit('orders.created', { attributes: { 'ctx.order.id': 'ord_1' } })
  return new Response('ok')
}
```

### Express

```typescript
import express from 'express'
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { LoggerTransportAdapter } from '@igniter-js/telemetry/adapters'

const telemetry = IgniterTelemetry.create()
  .withService('express-api')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()

const app = express()
app.get('/health', (_req, res) => {
  telemetry.emit('health.check')
  res.send('ok')
})
```

### Fastify

```typescript
import Fastify from 'fastify'
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { LoggerTransportAdapter } from '@igniter-js/telemetry/adapters'

const telemetry = IgniterTelemetry.create()
  .withService('fastify-api')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()

const app = Fastify()
app.get('/ping', async () => {
  telemetry.emit('ping')
  return { ok: true }
})
```

### Bun

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { LoggerTransportAdapter } from '@igniter-js/telemetry/adapters'

const telemetry = IgniterTelemetry.create()
  .withService('bun-app')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()

Bun.serve({
  fetch() {
    telemetry.emit('http.request')
    return new Response('ok')
  },
})
```

---

## 📚 API Reference

### `IgniterTelemetry` (builder alias)

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'

const builder = IgniterTelemetry.create()
```

#### Methods

| Method | Description |
| --- | --- |
| `create()` | Create a new builder instance |

---

### `IgniterTelemetryBuilder`

```typescript
import { IgniterTelemetryBuilder } from '@igniter-js/telemetry'
```

#### Methods

| Method | Description |
| --- | --- |
| `withService(name)` | Set service name |
| `withEnvironment(name)` | Set environment name |
| `withVersion(version)` | Set version |
| `addActor(key, options?)` | Register actor type |
| `addScope(key, options?)` | Register scope type |
| `addEvents(descriptor, options?)` | Register typed events |
| `addTransport(adapter)` | Add a transport adapter |
| `withSampling(policy)` | Configure sampling |
| `withRedaction(policy)` | Configure redaction |
| `withValidation(options)` | Configure validation options |
| `withLogger(logger)` | Set internal logger | `IgniterLogger` |
| `build()` | Build manager | `IIgniterTelemetryManager` |
| `buildConfig()` | Build config without runtime | `IgniterTelemetryConfig` |

#### Example

```typescript
const telemetry = IgniterTelemetryBuilder.create()
  .withService('api')
  .withEnvironment('production')
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build()
```

---

### `IgniterTelemetryEvents`

```typescript
import { IgniterTelemetryEvents } from '@igniter-js/telemetry'
```

#### Methods

| Method | Description |
| --- | --- |
| `namespace(name)` | Start a new namespace |
| `event(name, schema)` | Add an event |
| `group(name, builder)` | Add a nested event group |
| `build()` | Build descriptor |

#### Example

```typescript
const events = IgniterTelemetryEvents
  .namespace('igniter.auth')
  .event('login.succeeded', z.object({ 'ctx.user.id': z.string() }))
  .build()
```

---

### `IgniterTelemetryEventsGroup`

```typescript
import { IgniterTelemetryEventsGroup } from '@igniter-js/telemetry'
```

#### Methods

| Method | Description |
| --- | --- |
| `event(name, schema)` | Add event to group |
| `group(name, builder)` | Add nested group |
| `build()` | Build group events map |

---

### `IgniterTelemetryManager`

```typescript
import { IgniterTelemetryManager } from '@igniter-js/telemetry'
```

#### Methods

| Method | Description |
| --- | --- |
| `emit(name, input?)` | Emit telemetry event |
| `session()` | Create a session |
| `flush()` | Flush transports |
| `shutdown()` | Shutdown transports |
| `service` | Service name |
| `environment` | Environment name |
| `version` | Version name |

---

### `IgniterTelemetrySession`

```typescript
import { IgniterTelemetrySession } from '@igniter-js/telemetry'
```

#### Methods

| Method | Description |
| --- | --- |
| `id(sessionId)` | Set session ID |
| `actor(type, id?, tags?)` | Set actor |
| `scope(type, id, tags?)` | Set scope |
| `attributes(attrs)` | Set attributes |
| `emit(name, input?)` | Emit with session |
| `run(fn)` | Run in session context |
| `end()` | End session |
| `getState()` | Get session state |

---

### Types

#### `IgniterTelemetryEnvelope`

```typescript
export interface IgniterTelemetryEnvelope<TName extends string = string> {
  name: TName
  time: string
  level: 'debug' | 'info' | 'warn' | 'error'
  service: string
  environment: string
  version?: string
  sessionId: string
  traceId?: string
  spanId?: string
  parentSpanId?: string
  actor?: { type: string; id?: string; tags?: Record<string, string | number | boolean> }
  scope?: { type: string; id: string; tags?: Record<string, string | number | boolean> }
  attributes?: Record<string, string | number | boolean | null | undefined>
  error?: { name: string; message: string; code?: string; stack?: string; cause?: string }
  source?: { causer?: string; file?: string; line?: number }
}
```

#### `IgniterTelemetryEmitInput`

```typescript
export interface IgniterTelemetryEmitInput<TName extends string = string> {
  level?: 'debug' | 'info' | 'warn' | 'error'
  sessionId?: string
  actor?: { type: string; id?: string; tags?: Record<string, string | number | boolean> }
  scope?: { type: string; id: string; tags?: Record<string, string | number | boolean> }
  attributes?: Record<string, string | number | boolean | null | undefined>
  error?: { name: string; message: string; code?: string; stack?: string; cause?: string }
  source?: { causer?: string; file?: string; line?: number }
  time?: string
}
```

#### `IgniterTelemetryTransportAdapter`

```typescript
export interface IgniterTelemetryTransportAdapter {
  readonly type: string
  init?(meta: { service: string; environment: string; version?: string }): Promise<void> | void
  handle(envelope: IgniterTelemetryEnvelope): Promise<void> | void
  flush?(): Promise<void>
  shutdown?(): Promise<void>
}
```

---

## 🔬 Utilities

### `IgniterTelemetryId`

```typescript
import { IgniterTelemetryId } from '@igniter-js/telemetry'

const id = IgniterTelemetryId.generateSessionId()
```

### `IgniterTelemetrySampling`

```typescript
import { IgniterTelemetrySampling } from '@igniter-js/telemetry'

const shouldSample = IgniterTelemetrySampling.shouldSample(
  { infoRate: 0.1, always: ['*.error'] },
  'user.login',
  'info',
)
```

### `IgniterTelemetryRedaction`

```typescript
import { IgniterTelemetryRedaction } from '@igniter-js/telemetry'

const redact = IgniterTelemetryRedaction.createSyncRedactor({
  denylistKeys: ['password'],
})
```

### `IgniterTelemetryValidator`

```typescript
import { IgniterTelemetryValidator } from '@igniter-js/telemetry'

IgniterTelemetryValidator.validate('igniter.jobs', 'Namespace')
```

---

## 🧾 Errors

```typescript
import { IgniterTelemetryError } from '@igniter-js/telemetry'

try {
  telemetry.emit('unknown.event')
} catch (error) {
  if (IgniterTelemetryError.is(error)) {
    console.error(error.code)
  }
}
```

Common error codes:

| Code | Context | Fix |
|------|---------|-----|
| `TELEMETRY_INVALID_TRANSPORT` | `addTransport()` with falsy adapter | Pass adapter instance |
| `TELEMETRY_TRANSPORT_FAILED` | All adapters failed on `handle()` | Check downstream health |
| `TELEMETRY_TRANSPORT_INIT_FAILED` | Adapter `init()` threw at `build()` | Validate env vars, credentials |
| `TELEMETRY_DUPLICATE_NAMESPACE` | Two descriptors with same namespace | Use unique namespaces |
| `TELEMETRY_DUPLICATE_SCOPE` | `addScope()` with duplicate key | Define each scope once |
| `TELEMETRY_DUPLICATE_ACTOR` | `addActor()` with duplicate key | Define each actor once |
| `TELEMETRY_INVALID_EVENT_NAME` | Invalid characters in event name | Use dot notation, no colons |
| `TELEMETRY_INVALID_NAMESPACE` | Invalid namespace format | Use dot notation, lowercase |
| `TELEMETRY_SESSION_ENDED` | Emit after `session.end()` | Create new session |

---

## 🧩 Server-only Note

This package uses Node-only APIs (`AsyncLocalStorage`, `crypto`, etc.) and ships a server-only shim. It is **not intended for browser environments**.

---

## 📎 Related Packages

- `@igniter-js/store` — Used by `StoreStreamTransportAdapter`
- `@igniter-js/common` — Shared types and error base classes

---

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for setup and contribution guidelines.

---

## 📄 License

MIT
