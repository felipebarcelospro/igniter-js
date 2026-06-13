# @igniter-js/mail

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/mail.svg)](https://www.npmjs.com/package/@igniter-js/mail)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)

**Type-safe transactional email for TypeScript backends**  
React Email templates · StandardSchemaV1 validation · Multi-provider adapters · Queue scheduling · Telemetry

[Quick Start](#-quick-start) · [Core Concepts](#-core-concepts) · [Adapters](#-adapters) · [API Reference](#-api-reference) · [Examples](#-real-world-examples) · [Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Why @igniter-js/mail?

Email in backend applications is often fragile: string-concatenated HTML, missing validation, hard-wired providers, and zero observability. **@igniter-js/mail** treats every email as a typed, validated, and observable operation — just like a database write or API call.

- ✅ **Type-safe templates** — Full TypeScript inference from schema to payload; `mail.send()` knows which templates exist and what data each expects
- ✅ **React Email components** — Build beautiful, responsive emails with React and Tailwind (via `@react-email/components`)
- ✅ **Runtime validation** — StandardSchemaV1 enforces template contracts at the boundary; Zod, Valibot, or any compatible library
- ✅ **Swappable adapters** — Resend, Postmark, SendGrid, SMTP — change providers with one line
- ✅ **Built-in queue support** — `schedule()` enqueues through any `IgniterJobQueueAdapter` implementation
- ✅ **Lifecycle hooks** — `onSendStarted`, `onSendSuccess`, `onSendError` for audit trails, analytics, and error recovery
- ✅ **Telemetry-first** — 28 typed events across `send`, `schedule`, and `templates` groups via `@igniter-js/telemetry`
- ✅ **Mock adapter** — In-memory adapter records all sends for deterministic unit tests
- ✅ **Server-only** — Browser shim prevents accidental client-side bundling with a clear error message

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @igniter-js/mail @react-email/components react

# pnpm
pnpm add @igniter-js/mail @react-email/components react

# yarn
yarn add @igniter-js/mail @react-email/components react

# bun
bun add @igniter-js/mail @react-email/components react
```

Provider-specific dependencies (install only what you use):

```bash
# Resend
npm install resend

# SMTP
npm install nodemailer @types/nodemailer

# Postmark / SendGrid — no extra dependencies (uses native fetch)

# Validation (StandardSchemaV1-compatible)
npm install zod
```

### Your First Email (60 seconds)

```tsx
// 1. Create a React Email template
// src/emails/welcome.tsx
import { Button, Html, Text } from '@react-email/components'

interface WelcomeEmailProps {
  name: string
  verifyUrl: string
}

export function WelcomeEmail({ name, verifyUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Text>Hi {name},</Text>
      <Text>Welcome to our platform! Click below to verify your email:</Text>
      <Button href={verifyUrl}>Verify Email</Button>
    </Html>
  )
}
```

```typescript
// 2. Initialize the mail service
// src/mail.ts
import { IgniterMail } from '@igniter-js/mail'
import { z } from 'zod'
import { WelcomeEmail } from './emails/welcome'

export const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', {
    subject: 'Welcome to Our Platform',
    schema: z.object({
      name: z.string(),
      verifyUrl: z.string().url(),
    }),
    render: WelcomeEmail,
  })
  .build()
```

```typescript
// 3. Send!
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  data: {
    name: 'John Doe',
    verifyUrl: 'https://example.com/verify?token=abc123',
  },
})
```

**✅ Success!** You just sent a type-safe transactional email with validated payload and React-rendered HTML.

---

## 🎯 Core Concepts

### Architecture at a Glance

```
IgniterMailBuilder                    IgniterMailManagerCore
├─ withFrom(email)        build()     ├─ templates.list()
├─ withAdapter(...)   ──────────►     ├─ templates.get(id)
├─ withQueue(...)                     ├─ templates.render(id, vars?)
├─ addTemplate(key, tpl)              ├─ send(params)
├─ onSendStarted(fn)                  ├─ schedule(params, date)
├─ onSendSuccess(fn)                  └─ $Infer (type helper)
├─ onSendError(fn)                         ├─ .Templates
└─ build()                                ├─ .Payloads
                                          ├─ .SendInput
                                          └─ .ScheduleInput
```

### Templates

Templates combine three things: a React component, a schema for validation, and a subject line. You can define them inline with `addTemplate()` or use the standalone `IgniterMailTemplate` builder:

```typescript
import { IgniterMail } from '@igniter-js/mail'
import { z } from 'zod'

// Inline definition (simplest)
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('resetPassword', {
    subject: 'Reset Your Password',
    schema: z.object({
      name: z.string(),
      resetLink: z.string().url(),
      expiresAt: z.date(),
    }),
    render: ({ name, resetLink, expiresAt }) => (
      <Html>
        <Text>Hi {name},</Text>
        <Text>Click below to reset your password:</Text>
        <Button href={resetLink}>Reset Password</Button>
        <Text>This link expires at {expiresAt.toLocaleString()}</Text>
      </Html>
    ),
  })
  .build()
```

```typescript
// Standalone template builder (reusable)
import { IgniterMailTemplate } from '@igniter-js/mail'

const resetPasswordTemplate = IgniterMailTemplate.create()
  .withSubject('Reset Your Password')
  .withSchema(z.object({
    name: z.string(),
    resetLink: z.string().url(),
    expiresAt: z.date(),
  }))
  .withRender(({ name, resetLink, expiresAt }) => (
    <Html>
      <Text>Hi {name},</Text>
      <Text>Click below to reset your password:</Text>
      <Button href={resetLink}>Reset Password</Button>
      <Text>This link expires at {expiresAt.toLocaleString()}</Text>
    </Html>
  ))
  .build()

// Use it
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('resetPassword', resetPasswordTemplate)
  .build()
```

### Template Registry

Inspect, preview, and manage templates at runtime without sending:

```typescript
// List all registered templates
const templates = await mail.templates.list()
// [{ id: 'resetPassword', name: 'resetPassword', subject: 'Reset Your Password', ... }]

// Get a single template's metadata (returns null if missing)
const template = await mail.templates.get('resetPassword')

// Render a template to HTML + plain text without sending
const preview = await mail.templates.render('resetPassword', {
  name: 'Jane',
  resetLink: 'https://example.com/reset',
  expiresAt: new Date(),
})
// { html: '<!DOCTYPE html>...', text: 'Hi Jane,\nClick below...' }
```

### Type Safety

The builder's type accumulation ensures end-to-end inference:

```typescript
// ✅ TypeScript knows 'welcome' and 'resetPassword' are valid keys
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  data: { name: 'John', verifyUrl: 'https://...' },
})

// ❌ Compile error: unknown template key
await mail.send({
  to: 'user@example.com',
  template: 'unknown', // Type '"unknown"' is not assignable to type '"welcome" | "resetPassword"'
  data: {},
})

// ❌ Compile error: wrong payload shape
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  data: { invalidProp: true }, // Object literal may only specify known properties
})
```

### Type Helpers (`$Infer`)

The runtime instance exposes a `$Infer` property for type-level consumption:

```typescript
type Templates = typeof mail.$Infer.Templates        // "welcome" | "resetPassword"
type WelcomePayload = typeof mail.$Infer.Payloads['welcome']  // { name: string; verifyUrl: string }
type SendInput = typeof mail.$Infer.SendInput         // union of all send params
type ScheduleInput = typeof mail.$Infer.ScheduleInput // [sendParams, Date] tuple
```

### Schema Validation

Templates use StandardSchemaV1 for runtime validation. Zod 3.23+ works out of the box; any compatible library (Valibot, ArkType) is supported:

```typescript
import { z } from 'zod'

const mail = IgniterMail.create()
  .addTemplate('notification', {
    subject: 'New Notification',
    schema: z.object({
      message: z.string().min(1).max(500),
      priority: z.enum(['low', 'medium', 'high']),
    }),
    render: ({ message, priority }) => (
      <Html>
        <Text>Priority: {priority}</Text>
        <Text>{message}</Text>
      </Html>
    ),
  })
  .build()

// ✅ Valid — passes schema check
await mail.send({
  to: 'user@example.com',
  template: 'notification',
  data: { message: 'Your order has shipped!', priority: 'high' },
})

// ❌ Runtime error: MAIL_PROVIDER_TEMPLATE_DATA_INVALID
await mail.send({
  to: 'user@example.com',
  template: 'notification',
  data: { message: '', priority: 'urgent' }, // min(1) fails, invalid enum
})
```

### Subject Override

Each template has a default subject; override per-send:

```typescript
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  subject: 'Special welcome for John!',
  data: { name: 'John', verifyUrl: 'https://...' },
})
```

---

## 📦 Adapters

`@igniter-js/mail` ships with five adapters. Choose one — or build your own by implementing the `IgniterMailAdapter` interface.

### Resend

```typescript
// Provider string shorthand
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .build()

// Or: adapter instance
import { ResendMailAdapter } from '@igniter-js/mail/adapters'

const adapter = ResendMailAdapter.create({
  secret: process.env.RESEND_API_KEY,
  from: 'no-reply@example.com',
})

const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter(adapter)
  .build()
```

### Postmark

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('postmark', process.env.POSTMARK_SERVER_TOKEN!)
  .build()
```

Uses native `fetch` — zero extra dependencies.

### SendGrid

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('sendgrid', process.env.SENDGRID_API_KEY!)
  .build()
```

Uses native `fetch` — zero extra dependencies.

### SMTP

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('smtp', 'smtps://user:pass@smtp.gmail.com:465')
  .build()
```

Uses Nodemailer under the hood. Requires `npm install nodemailer @types/nodemailer`.

### Mock Adapter (Testing)

```typescript
import { MockMailAdapter } from '@igniter-js/mail/adapters'

const adapter = MockMailAdapter.create()

const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter(adapter)
  .addTemplate('welcome', { /* ... */ })
  .build()

// Send — recorded, not delivered
await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Test' } })

// Assert
expect(adapter.sent).toHaveLength(1)
expect(adapter.sent[0].to).toBe('user@example.com')
expect(adapter.sent[0].html).toContain('Test')
expect(adapter.calls.send).toBe(1)

// Reset between tests
adapter.clear()
```

### Custom Adapter

Implement the `IgniterMailAdapter` interface:

```typescript
import type { IgniterMailAdapter } from '@igniter-js/mail'

const customAdapter: IgniterMailAdapter = {
  async send({ to, subject, html, text }) {
    await myEmailService.deliver({ to, subject, html, text })
  },
}

const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter(customAdapter)
  .build()
```

---

## 🔄 Queue Integration

Use `withQueue()` and `schedule()` to offload email delivery from the request lifecycle. Any adapter implementing `IgniterJobQueueAdapter` from `@igniter-js/core` is supported:

```typescript
import { IgniterMail } from '@igniter-js/mail'
import type { IgniterJobQueueAdapter } from '@igniter-js/core'

const queueAdapter: IgniterJobQueueAdapter<any> = myQueueAdapter // BullMQ, custom, etc.

const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .withQueue(queueAdapter, {
    queue: 'mail',          // queue name (default: "mail")
    job: 'send',             // job name (default: "send")
    attempts: 3,             // retry on failure
    priority: 5,             // job priority (higher = sooner)
    removeOnComplete: true,  // auto-cleanup
    removeOnFail: false,     // keep failed jobs for inspection
  })
  .addTemplate('welcome', { /* ... */ })
  .build()

// Schedule for later delivery
await mail.schedule(
  {
    to: 'user@example.com',
    template: 'welcome',
    data: { name: 'John', verifyUrl: 'https://...' },
  },
  new Date(Date.now() + 60_000) // 1 minute from now
)

// 💡 send() still works — it delivers immediately
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  data: { name: 'Jane', verifyUrl: 'https://...' },
})
```

**Important:** `send()` always delivers immediately (synchronous). `schedule()` enqueues via the configured queue adapter and delivers asynchronously at the target date. The schedule date must be in the future; past dates throw `MAIL_PROVIDER_SCHEDULE_DATE_INVALID`.

---

## 🪝 Lifecycle Hooks

React to email events for audit trails, analytics, and error recovery:

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .onSendStarted(async (params) => {
    console.log('Sending:', params.template, 'to:', params.to)
    await auditLog.create({ event: 'mail.started', template: params.template })
  })
  .onSendSuccess(async (params) => {
    console.log('Sent:', params.template, 'to:', params.to)
    await analytics.track('email.sent', { template: params.template })
  })
  .onSendError(async (params, error) => {
    console.error('Failed:', params.template, error.message)
    await alerts.notify({ template: params.template, error: error.message })
  })
  .addTemplate('welcome', { /* ... */ })
  .build()
```

Hooks receive the full `IgniterMailSendParams` object. The error hook additionally receives the normalized `IgniterMailError`.

---

## 📊 Telemetry Integration

Attach a typed telemetry manager for structured observability:

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { IgniterMailTelemetryEvents } from '@igniter-js/mail/telemetry'

const telemetry = IgniterTelemetry.create()
  .withService('my-api')
  .addEvents(IgniterMailTelemetryEvents)
  .build()

const mail = IgniterMail.create()
  .withTelemetry(telemetry)
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', { /* ... */ })
  .build()
```

The package emits 28 typed events across three groups:

| Group | Events | Description |
|-------|--------|-------------|
| `send` | `started`, `success`, `error` | Emitted during `mail.send()` |
| `schedule` | `started`, `success`, `error` | Emitted during `mail.schedule()` |
| `templates` | `list.*`, `get.*`, `render.*` (3 each) | Emitted during template registry operations |

All attributes are fully typed — no stringly-typed telemetry.

---

## 📘 API Reference

### `IgniterMail` (Builder)

Alias for `IgniterMailBuilder`. The primary entry point.

#### `IgniterMail.create()`

Creates a new builder instance.

```typescript
const builder = IgniterMail.create()
```

#### `builder.withFrom(from: string)`

Sets the default FROM address. **Required** before `build()`.

```typescript
builder.withFrom('no-reply@example.com')
```

#### `builder.withAdapter(provider: string, secret: string)`

Configures a built-in adapter by provider key. Supported keys: `'resend' | 'postmark' | 'sendgrid' | 'smtp'`.

```typescript
builder.withAdapter('resend', process.env.RESEND_API_KEY!)
```

Throws `MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED` if `secret` is missing.
Throws `MAIL_PROVIDER_ADAPTER_NOT_FOUND` if `provider` is unrecognized.

#### `builder.withAdapter(adapter: IgniterMailAdapter)`

Configures a custom or pre-instantiated adapter.

```typescript
import { ResendMailAdapter } from '@igniter-js/mail/adapters'

const adapter = ResendMailAdapter.create({
  secret: process.env.RESEND_API_KEY,
  from: 'no-reply@example.com',
})

builder.withAdapter(adapter)
```

#### `builder.withLogger(logger: IgniterLogger)`

Attaches a logger for debug/info/error output.

```typescript
builder.withLogger(logger)
```

#### `builder.withTelemetry(telemetry: IgniterTelemetryManager<any>)`

Attaches a telemetry instance for observability.

```typescript
builder.withTelemetry(telemetry)
```

#### `builder.withQueue(adapter: IgniterJobQueueAdapter<any>, options?: IgniterMailQueueOptions)`

Enables queue-based delivery for `schedule()`.

```typescript
builder.withQueue(queueAdapter, {
  queue: 'mail',
  job: 'send',
  attempts: 3,
  priority: 5,
  removeOnComplete: true,
  removeOnFail: false,
  metadata: { source: 'api' },
  limiter: { max: 10, duration: 1_000 },
})
```

#### `builder.addTemplate(key: string, template: IgniterMailTemplateBuilt<any>)`

Registers a template. Returns a **new builder instance** with expanded type generics — this is how type inference accumulates.

```typescript
builder
  .addTemplate('welcome', {
    subject: 'Welcome',
    schema: z.object({ name: z.string() }),
    render: WelcomeEmail,
  })
  .addTemplate('resetPassword', {
    subject: 'Reset Your Password',
    schema: z.object({ resetLink: z.string().url() }),
    render: ResetEmail,
    // Optional metadata:
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset',
    path: 'mail/auth/reset',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variables: ['resetLink'],
  })
```

#### `builder.onSendStarted(handler)`, `builder.onSendSuccess(handler)`, `builder.onSendError(handler)`

Register lifecycle hooks. See [Lifecycle Hooks](#-lifecycle-hooks) section.

#### `builder.build(): IIgniterMail<TTemplates>`

Builds the mail instance. Throws `MAIL_PROVIDER_FROM_REQUIRED` if `withFrom()` was not called. Throws `MAIL_PROVIDER_ADAPTER_REQUIRED` if `withAdapter()` was not called.

```typescript
const mail = builder.build()
```

### Runtime Instance (`IIgniterMail`)

Returned by `builder.build()`.

#### `mail.send(params)`

Sends an email immediately.

```typescript
await mail.send({
  to: 'user@example.com',       // string
  template: 'welcome',          // TemplateKey (type-safe)
  subject: 'Custom subject',    // optional override
  data: { name: 'Ada' },        // TemplatePayload (type-safe)
})
```

Pipeline: telemetry started → `onSendStarted` hook → template lookup → schema validation → React render (HTML + text) → adapter.send() → `onSendSuccess` hook → telemetry success.

On failure: `onSendError` hook → telemetry error → throws `IgniterMailError`.

#### `mail.schedule(params, date)`

Schedules an email for a future date. Requires a queue adapter.

```typescript
await mail.schedule(
  {
    to: 'user@example.com',
    template: 'welcome',
    data: { name: 'Ada' },
  },
  new Date(Date.now() + 60_000) // Must be in the future
)
```

Throws `MAIL_PROVIDER_SCHEDULE_DATE_INVALID` if the date is in the past. Throws `MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED` if no queue adapter was configured.

#### `mail.templates.list()`

Lists all registered templates with metadata.

```typescript
const templates: IgniterMailTemplateMeta[] = await mail.templates.list()
// [{ id: 'welcome', name: 'welcome', subject: 'Welcome', ... }]
```

#### `mail.templates.get(id)`

Gets a single template's metadata. Returns `null` if not found.

```typescript
const template = await mail.templates.get('welcome')
if (!template) {
  console.log('Template not found')
}
```

#### `mail.templates.render(id, variables?)`

Renders a template to HTML and plain text without sending.

```typescript
const preview = await mail.templates.render('welcome', { name: 'Ada' })
// { html: '<!DOCTYPE html>...', text: 'Hi Ada,\nWelcome...' }
```

#### `mail.$Infer`

Type-level helper (runtime value is `{}`). Used only in type contexts:

```typescript
type Keys = typeof mail.$Infer.Templates        // union of template keys
type Payload = typeof mail.$Infer.Payloads['k'] // payload for key "k"
type Input = typeof mail.$Infer.SendInput       // union of all send params
type Sched = typeof mail.$Infer.ScheduleInput   // [sendParams, Date]
```

### `IgniterMailTemplate` (Template Builder)

Standalone builder for reusable template definitions.

```typescript
import { IgniterMailTemplate } from '@igniter-js/mail'

const template = IgniterMailTemplate.create()
  .withSubject('Welcome')
  .withSchema(z.object({ name: z.string() }))
  .withRender(({ name }) => <Text>Hello {name}</Text>)
  .build()
```

All three methods are required. Missing any throws `MAIL_TEMPLATE_CONFIGURATION_INVALID`.

### `IgniterMailTemplateBuilt<TSchema>`

The shape of a built template:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | `string` | Yes | Default subject line |
| `schema` | `TSchema` | Yes | StandardSchemaV1 schema |
| `render` | `(data) => ReactElement` | Yes | React Email component |
| `name` | `string` | No | Display name for tooling |
| `description` | `string` | No | Description for tooling |
| `path` | `string` | No | Path hint for routing |
| `createdAt` | `string` | No | ISO timestamp |
| `updatedAt` | `string` | No | ISO timestamp |
| `variables` | `string[]` | No | Variable names for tooling |

### `IgniterMailTemplateMeta`

Returned by `templates.list()` and `templates.get()`:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Template key |
| `name` | `string` | Display name |
| `description` | `string` | Description |
| `path` | `string` | Path hint |
| `subject` | `string` | Default subject |
| `createdAt` | `string` | ISO timestamp |
| `updatedAt` | `string` | ISO timestamp |
| `variables` | `string[]?` | Variable names |

### `IgniterMailAdapter` (Interface)

For building custom adapters:

```typescript
import type { IgniterMailAdapter, IgniterMailAdapterSendParams } from '@igniter-js/mail'

const myAdapter: IgniterMailAdapter = {
  async send(params: IgniterMailAdapterSendParams): Promise<void> {
    // params: { to, subject, html, text, scheduledAt? }
    await myProvider.deliver(params)
  },
}
```

### `IgniterMailSchema` (Utilities)

Internal schema utilities, available for advanced use:

```typescript
import { IgniterMailSchema } from '@igniter-js/mail'

// Validate an input against a StandardSchemaV1 schema
const data = await IgniterMailSchema.validateInput(mySchema, rawInput)

// Create a passthrough schema (accepts any data)
const passthrough = IgniterMailSchema.createPassthroughSchema()
```

### `IgniterMailError`

All errors thrown by the package are instances of `IgniterMailError` (extends `IgniterError` from `@igniter-js/common`):

```typescript
import { IgniterMailError } from '@igniter-js/mail'

try {
  await mail.send({ /* ... */ })
} catch (error) {
  if (error instanceof IgniterMailError) {
    console.error('Code:', error.code)        // IgniterMailErrorCode
    console.error('Message:', error.message)  // Human-readable
    console.error('Metadata:', error.metadata) // Diagnostic context
    console.error('Details:', error.details)  // Schema issues, etc.
  }
}
```

### Adapter Exports

All adapters are available from `@igniter-js/mail/adapters`:

| Class | Provider | Required Dependency |
|-------|----------|---------------------|
| `ResendMailAdapter` | Resend.com | `resend` (npm) |
| `PostmarkMailAdapter` | Postmark | None (native fetch) |
| `SendGridMailAdapter` | SendGrid | None (native fetch) |
| `SmtpMailAdapter` | Generic SMTP | `nodemailer` (npm) |
| `MockMailAdapter` | In-memory | None |

### Telemetry Exports

Available from `@igniter-js/mail/telemetry`:

```typescript
import { IgniterMailTelemetryEvents } from '@igniter-js/mail/telemetry'
// Also: IgniterMailTelemetryEvents type
```

---

## ⚙️ Configuration

### Queue Options (`IgniterMailQueueOptions`)

```typescript
type IgniterMailQueueOptions = {
  job?: string                    // Job name (default: "send")
  queue?: string                  // Queue name (default: "mail")
  attempts?: number               // Retry attempts on failure
  priority?: number               // Job priority (higher = sooner)
  removeOnComplete?: boolean | number  // Auto-remove after completion
  removeOnFail?: boolean | number      // Auto-remove after failure
  metadata?: Record<string, any>       // Arbitrary metadata
  limiter?: JobLimiter                  // Rate limiter config
}
```

### Template Metadata (Optional)

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  name: 'Welcome Email',
  description: 'Sent after a user signs up',
  path: 'mail/welcome',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  variables: ['name'],
})
```

---

## 🌍 Real-World Examples

### Password Reset

```typescript
import { Button, Html, Text } from '@react-email/components'
import { IgniterMail } from '@igniter-js/mail'
import { z } from 'zod'

const mail = IgniterMail.create()
  .withFrom('security@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('resetPassword', {
    subject: 'Reset Your Password',
    schema: z.object({
      name: z.string(),
      resetLink: z.string().url(),
      expiresIn: z.number(),
    }),
    render: ({ name, resetLink, expiresIn }) => (
      <Html>
        <Text>Hi {name},</Text>
        <Text>You requested to reset your password.</Text>
        <Button href={resetLink}>Reset Password</Button>
        <Text>This link expires in {expiresIn} minutes.</Text>
      </Html>
    ),
  })
  .build()

await mail.send({
  to: 'user@example.com',
  template: 'resetPassword',
  data: { name: 'John Doe', resetLink: 'https://example.com/reset?token=abc', expiresIn: 15 },
})
```

### Order Confirmation with Queue

```typescript
const mail = IgniterMail.create()
  .withFrom('orders@example.com')
  .withAdapter('postmark', process.env.POSTMARK_SERVER_TOKEN!)
  .withQueue(queueAdapter, {
    queue: 'mail',
    job: 'send',
    attempts: 5,
    priority: 10,
  })
  .addTemplate('orderConfirmation', {
    subject: 'Order #{{orderNumber}} Confirmed',
    schema: z.object({ orderNumber: z.string(), items: z.array(z.string()) }),
    render: ({ orderNumber, items }) => (
      <Html>
        <Text>Your order #{orderNumber} has been confirmed.</Text>
        <Text>Items: {items.join(', ')}</Text>
      </Html>
    ),
  })
  .build()

// Queue for async delivery
await mail.schedule(
  {
    to: 'customer@example.com',
    template: 'orderConfirmation',
    data: { orderNumber: '12345', items: ['Widget A', 'Widget B'] },
  },
  new Date(Date.now() + 1_000) // Near-immediate via queue
)
```

### Multi-Template Service

```typescript
export const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('sendgrid', process.env.SENDGRID_API_KEY!)
  .withLogger(logger)
  .onSendStarted(async ({ to, template }) => {
    await db.auditLog.create({ event: 'mail.started', to, template })
  })
  .onSendError(async ({ to, template }, error) => {
    await alerts.notify({ level: 'error', template, error: error.message })
  })
  .addTemplate('welcome', { /* ... */ })
  .addTemplate('resetPassword', { /* ... */ })
  .addTemplate('orderConfirmation', { /* ... */ })
  .addTemplate('shippingUpdate', { /* ... */ })
  .addTemplate('invoice', { /* ... */ })
  .build()
```

### Healthcare Reminder (Scheduled)

```typescript
const surgeryDate = new Date('2026-07-01T08:00:00Z')
const reminderDate = new Date(surgeryDate.getTime() - 48 * 60 * 60 * 1000)

await mail.schedule(
  {
    to: 'patient@example.com',
    template: 'surgeryReminder',
    data: { procedure: 'Knee Surgery', date: surgeryDate.toISOString() },
  },
  reminderDate
)
```

### E-commerce Order Tracking with Hooks

```typescript
const mail = IgniterMail.create()
  .withFrom('orders@example.com')
  .withAdapter('postmark', process.env.POSTMARK_SERVER_TOKEN!)
  .onSendSuccess(async (params) => {
    if (params.template === 'shippingUpdate') {
      await db.orders.update({
        where: { id: params.data.orderId },
        data: { notified: true },
      })
    }
  })
  .addTemplate('shippingUpdate', {
    subject: 'Your Order Has Shipped',
    schema: z.object({ orderId: z.string(), trackingUrl: z.string().url() }),
    render: ({ orderId, trackingUrl }) => (
      <Html>
        <Text>Your order {orderId} is on the way!</Text>
        <Button href={trackingUrl}>Track Package</Button>
      </Html>
    ),
  })
  .build()
```

---

## 🧪 Testing

### Unit Tests with Mock Adapter

```typescript
import { describe, it, expect } from 'vitest'
import { IgniterMail } from '@igniter-js/mail'
import { MockMailAdapter } from '@igniter-js/mail/adapters'
import { z } from 'zod'

describe('mail service', () => {
  it('sends a welcome email', async () => {
    const adapter = MockMailAdapter.create()

    const mail = IgniterMail.create()
      .withFrom('test@example.com')
      .withAdapter(adapter)
      .addTemplate('welcome', {
        subject: 'Welcome',
        schema: z.object({ name: z.string() }),
        render: ({ name }) => <Html><Text>Hi {name}</Text></Html>,
      })
      .build()

    await mail.send({
      to: 'user@example.com',
      template: 'welcome',
      data: { name: 'Ada' },
    })

    expect(adapter.sent).toHaveLength(1)
    expect(adapter.calls.send).toBe(1)
    expect(adapter.sent[0].to).toBe('user@example.com')
    expect(adapter.sent[0].subject).toBe('Welcome')
    expect(adapter.sent[0].html).toContain('Hi Ada')
    expect(adapter.sent[0].text).toContain('Hi Ada')
  })

  it('throws on invalid template data', async () => {
    const adapter = MockMailAdapter.create()

    const mail = IgniterMail.create()
      .withFrom('test@example.com')
      .withAdapter(adapter)
      .addTemplate('welcome', {
        subject: 'Welcome',
        schema: z.object({ name: z.string().min(1) }),
        render: ({ name }) => <Html><Text>Hi {name}</Text></Html>,
      })
      .build()

    await expect(
      mail.send({ to: 'user@example.com', template: 'welcome', data: { name: '' } })
    ).rejects.toThrow('MAIL_PROVIDER_TEMPLATE_DATA_INVALID')
  })
})
```

---

## ✅ Best Practices

| ✅ Do | Why |
|-------|-----|
| Always define schemas for every template | Prevents runtime rendering errors with invalid payloads |
| Use `MockMailAdapter` in tests | Fast, deterministic, no network calls |
| Await `send()` calls | Ensures errors are caught in the current context |
| Use `withQueue()` for high-volume sending | Keeps request latency low; offloads delivery |
| Use hooks for side effects | Clean separation of delivery logic from business logic |
| Store secrets in environment variables | Security; never hardcode API keys |
| Use provider string shorthand for simple setups | Less boilerplate than creating adapter instances manually |
| Call `adapter.clear()` between tests | Prevents test pollution with MockMailAdapter |

| ❌ Avoid | Why |
|----------|-----|
| Don't use `any` in template data | Breaks the primary value proposition of type safety |
| Don't put secrets or PII in subject lines | Telemetry and logs capture subjects |
| Don't hardcode FROM addresses | Makes environment switching difficult |
| Don't import mail in browser/client bundles | Triggers the server-only shim |
| Don't ignore `MAIL_PROVIDER_TEMPLATE_DATA_INVALID` errors | Invalid data produces broken emails |
| Don't pass a past date to `schedule()` | Throws `MAIL_PROVIDER_SCHEDULE_DATE_INVALID` |

---

## 🔧 Troubleshooting

### `MAIL_PROVIDER_ADAPTER_REQUIRED`

**Context:** `build()`. **Cause:** `withAdapter()` was not called before `build()`. **Fix:** Add `.withAdapter('resend', apiKey)` or pass an adapter instance.

### `MAIL_PROVIDER_FROM_REQUIRED`

**Context:** `build()`. **Cause:** `withFrom()` was not called. **Fix:** Add `.withFrom('no-reply@example.com')` before `.build()`.

### `MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED`

**Context:** `withAdapter(provider, secret)`. **Cause:** Second argument (`secret`) was undefined or empty. **Fix:** Verify the environment variable is set and reachable.

### `MAIL_PROVIDER_ADAPTER_NOT_FOUND`

**Context:** `withAdapter(provider, secret)`. **Cause:** Provider string is not one of `resend | postmark | sendgrid | smtp`. **Fix:** Check for typos, or pass a custom adapter instance instead.

### `MAIL_PROVIDER_TEMPLATE_NOT_FOUND`

**Context:** `send()` or `render()`. **Cause:** The template key doesn't exist in the registry. **Fix:** Check the key matches exactly what was passed to `addTemplate()`.

### `MAIL_PROVIDER_TEMPLATE_DATA_INVALID`

**Context:** `send()` or `render()`. **Cause:** The payload failed schema validation. **Fix:** Check `error.details` for the specific validation issues (e.g., missing required fields, wrong types).

### `MAIL_PROVIDER_SCHEDULE_DATE_INVALID`

**Context:** `schedule()`. **Cause:** The target date is in the past. **Fix:** Pass a `Date` object representing a future time.

### `MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED`

**Context:** `schedule()`. **Cause:** `withQueue()` was not called. **Fix:** Add `.withQueue(adapter, options)` to the builder chain, or use `send()` for immediate delivery.

### `MAIL_PROVIDER_SEND_FAILED`

**Context:** `send()`. **Cause:** The adapter's provider rejected the email (network error, invalid credentials, rate limit). **Fix:** Check `error.metadata` for provider-specific diagnostics; verify credentials and provider status.

### `MAIL_ADAPTER_CONFIGURATION_INVALID`

**Context:** Adapter initialization or `send()`. **Cause:** The adapter's credentials (`secret` or `from`) are missing. **Fix:** Ensure the adapter receives both `secret` and `from`.

### Template renders but emails are blank

**Cause:** The React component may not render meaningful plain text. **Fix:** Ensure your component produces readable text content (not just images and buttons). `@igniter-js/mail` always generates both HTML and plain text automatically.

### Type inference breaks after multiple `addTemplate()` calls

**Cause:** Each `addTemplate()` returns a new builder. Ensure you chain the return value:

```typescript
// ✅ Correct — chains the new builder
const mail = IgniterMail.create()
  .withFrom('...')
  .withAdapter('...')
  .addTemplate('a', { /* ... */ })  // returns new builder
  .addTemplate('b', { /* ... */ })  // chains on new builder
  .build()

// ❌ Wrong — discards the returned builder
const b = IgniterMail.create()
b.addTemplate('a', { /* ... */ })  // new builder returned, but ignored
b.addTemplate('b', { /* ... */ })  // types won't include 'a'
```

---

## 🖥️ Framework Integration

### Next.js (App Router)

```typescript
// lib/mail.ts — server-only module
import 'server-only'
import { IgniterMail } from '@igniter-js/mail'
import { z } from 'zod'

export const mail = IgniterMail.create()
  .withFrom(process.env.MAIL_FROM!)
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', { /* ... */ })
  .build()
```

```typescript
// app/api/signup/route.ts
import { mail } from '@/lib/mail'

export async function POST(request: Request) {
  const { email, name } = await request.json()

  await mail.send({
    to: email,
    template: 'welcome',
    data: { name, verifyUrl: `${process.env.APP_URL}/verify?email=${email}` },
  })

  return Response.json({ ok: true })
}
```

### Next.js (Server Actions)

```typescript
// app/actions/reset-password.ts
'use server'
import { mail } from '@/lib/mail'

export async function sendResetEmail(email: string, name: string, token: string) {
  await mail.send({
    to: email,
    template: 'resetPassword',
    data: {
      name,
      resetLink: `${process.env.APP_URL}/reset?token=${token}`,
      expiresIn: 15,
    },
  })
}
```

### Express

```typescript
import express from 'express'
import { mail } from './mail'

const app = express()

app.post('/api/signup', async (req, res) => {
  try {
    await mail.send({
      to: req.body.email,
      template: 'welcome',
      data: { name: req.body.name, verifyUrl: '...' },
    })
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email' })
  }
})
```

### Fastify

```typescript
import Fastify from 'fastify'
import { mail } from './mail'

const app = Fastify()

app.post('/api/signup', async (request, reply) => {
  const { email, name } = request.body as any

  await mail.send({
    to: email,
    template: 'welcome',
    data: { name, verifyUrl: '...' },
  })

  return { ok: true }
})
```

### Astro

```typescript
// src/pages/api/signup.ts
import type { APIRoute } from 'astro'
import { mail } from '../../lib/mail'

export const POST: APIRoute = async ({ request }) => {
  const { email, name } = await request.json()

  await mail.send({
    to: email,
    template: 'welcome',
    data: { name, verifyUrl: '...' },
  })

  return new Response(JSON.stringify({ ok: true }))
}
```

### Hono

```typescript
import { Hono } from 'hono'
import { mail } from './mail'

const app = new Hono()

app.post('/api/signup', async (c) => {
  const { email, name } = await c.req.json()

  await mail.send({
    to: email,
    template: 'welcome',
    data: { name, verifyUrl: '...' },
  })

  return c.json({ ok: true })
})
```

---

## 📦 Package Exports

| Entry Point | Description |
|-------------|-------------|
| `@igniter-js/mail` | Main: builder, template builder, errors, types, utils |
| `@igniter-js/mail/adapters` | Adapter classes (Resend, Postmark, SendGrid, SMTP, Mock) |
| `@igniter-js/mail/telemetry` | Telemetry event definitions and types |

Browser imports are redirected to a shim that throws a clear error — this package is server-only.

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License — see [LICENSE](https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE).

## 🔗 Links

- **Documentation:** https://igniterjs.com/docs/mail
- **GitHub:** https://github.com/felipebarcelospro/igniter-js
- **NPM:** https://www.npmjs.com/package/@igniter-js/mail
- **Issues:** https://github.com/felipebarcelospro/igniter-js/issues
- **React Email:** https://react.email
