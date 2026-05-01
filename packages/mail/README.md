# @igniter-js/mail

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/mail.svg)](https://www.npmjs.com/package/@igniter-js/mail)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe email library for Igniter.js applications with React Email templates and multiple provider adapters. Send transactional emails with confidence using compile-time type safety and runtime validation.

**Quick Navigation**

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Adapters](#adapters)
- [Queue Integration](#queue-integration)
- [Telemetry Integration](#telemetry-integration)
- [API Reference](#api-reference)
- [Examples Gallery](#examples-gallery)
- [Real-World Scenarios](#real-world-scenarios)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Framework Integrations](#framework-integrations)

## Features

- ✅ **Type-Safe Templates** - Full TypeScript inference with template payload validation
- ✅ **React Email** - Build beautiful emails with React components
- ✅ **Multiple Providers** - Resend, Postmark, SendGrid, SMTP
- ✅ **Mock Adapter** - In-memory adapter for unit testing
- ✅ **Schema Validation** - Runtime validation with StandardSchemaV1 (Zod v4+ or any StandardSchemaV1-compatible lib)
- ✅ **Telemetry Ready** - Optional integration with `@igniter-js/telemetry`
- ✅ **Queue Integration** - Schedule emails with BullMQ or custom queues
- ✅ **Lifecycle Hooks** - React to send events (started, success, error)
- ✅ **Builder Pattern** - Fluent API for configuration
- ✅ **Server-First** - Built for Node.js, Bun, Deno (no browser dependencies)

## Installation

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

### Provider Dependencies

Install the adapter you need:

**Resend:**
```bash
npm install resend
```

**SMTP:**
```bash
npm install nodemailer @types/nodemailer
```

### Optional Dependencies

**Telemetry:**
```bash
npm install @igniter-js/telemetry
```

**Validation (StandardSchemaV1-compatible):**
```bash
npm install zod
```

## Quick Start

### 1. Create Email Templates

Use React Email components to build your templates:

```tsx
// src/emails/welcome.tsx
import { Button, Html, Text } from '@react-email/components'

export interface WelcomeEmailProps {
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

### 2. Initialize Mail Service

```typescript
import { IgniterMail } from '@igniter-js/mail'
import { z } from 'zod'
import { WelcomeEmail } from './emails/welcome'

// Create mail instance with builder
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

### 3. Send Emails

```typescript
// Send immediately
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  data: {
    name: 'John Doe',
    verifyUrl: 'https://example.com/verify?token=abc123',
  },
})

// Schedule for later (requires withQueue configured)
await mail.schedule(
  {
    to: 'user@example.com',
    template: 'welcome',
    data: {
      name: 'John Doe',
      verifyUrl: 'https://example.com/verify?token=abc123',
    },
  },
  new Date(Date.now() + 24 * 60 * 60 * 1000) // Send in 24 hours
)
```

## Core Concepts

### Templates

Templates combine React Email components with schema validation:

```typescript
import { IgniterMail } from '@igniter-js/mail'
import { z } from 'zod'

const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.IGNITER_MAIL_SECRET!)
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

// Optional: build templates with the template builder
import { IgniterMailTemplate } from '@igniter-js/mail'

const resetPasswordTemplate = IgniterMailTemplate.create()
  .withSubject('Reset Your Password')
  .withSchema(
    z.object({
      name: z.string(),
      resetLink: z.string().url(),
      expiresAt: z.date(),
    })
  )
  .withRender(({ name, resetLink, expiresAt }) => (
    <Html>
      <Text>Hi {name},</Text>
      <Text>Click below to reset your password:</Text>
      <Button href={resetLink}>Reset Password</Button>
      <Text>This link expires at {expiresAt.toLocaleString()}</Text>
    </Html>
  ))
  .build()
```

### Template Registry

Access template metadata and render previews without sending:

```typescript
const templates = await mail.templates.list()
const template = await mail.templates.get('resetPassword')
const preview = await mail.templates.render('resetPassword', {
  name: 'Jane',
  resetLink: 'https://example.com/reset',
  expiresAt: new Date(),
})
```

### Type Safety

The library provides end-to-end type safety:

```typescript
// ✅ TypeScript knows 'welcome' template exists
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  data: {
    name: 'John Doe',
    verifyUrl: 'https://example.com/verify',
  },
})

// ❌ TypeScript error: unknown template
await mail.send({
  to: 'user@example.com',
  template: 'unknown', // Error: Type '"unknown"' is not assignable to type '"welcome"'
  data: {},
})

// ❌ TypeScript error: invalid data shape
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  data: {
    invalidProp: true, // Error: Object literal may only specify known properties
  },
})
```

### Schema Validation

Templates support StandardSchemaV1 for runtime validation (Zod 3.23+ or any compatible library):

```typescript
import { z } from 'zod'
import { IgniterMail } from '@igniter-js/mail'

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

// ✅ Valid data
await mail.send({
  to: 'user@example.com',
  template: 'notification',
  data: {
    message: 'Your order has shipped!',
    priority: 'high',
  },
})

// ❌ Runtime validation error
await mail.send({
  to: 'user@example.com',
  template: 'notification',
  data: {
    message: '', // Error: String must contain at least 1 character(s)
    priority: 'urgent', // Error: Invalid enum value
  },
})
```

## Adapters

### Resend

```typescript
import { IgniterMail } from '@igniter-js/mail'
import { ResendMailAdapter } from '@igniter-js/mail/adapters'

// Using builder shorthand
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .build()

// Or using adapter instance
const adapter = ResendMailAdapter.create({
  secret: process.env.RESEND_API_KEY,
  from: 'no-reply@example.com',
})

const mailWithAdapter = IgniterMail.create()
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

### SendGrid

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('sendgrid', process.env.SENDGRID_API_KEY!)
  .build()
```

### SMTP

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('smtp', 'smtps://user:pass@smtp.gmail.com:465')
  .build()
```

### Mock Adapter

For unit tests:

```typescript
import { MockMailAdapter } from '@igniter-js/mail/adapters'

const adapter = MockMailAdapter.create()

const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter(adapter)
  .build()

// Send email
await mail.send({ ... })

// Verify in tests
expect(adapter.sent).toHaveLength(1)
expect(adapter.sent[0].to).toBe('user@example.com')
expect(adapter.sent[0].html).toContain('Welcome')
```

## Queue Integration

Integrate with BullMQ or custom job queues for async email delivery:

```typescript
import { IgniterMail } from '@igniter-js/mail'
import { createBullMQAdapter } from '@igniter-js/adapter-bullmq'

const queueAdapter = createBullMQAdapter({
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
})

const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .withQueue(queueAdapter, {
    queue: 'mail',
    job: 'send',
    attempts: 3,
    removeOnComplete: true,
  })
  .addTemplate('welcome', { ... })
  .build()

// This now enqueues the email instead of sending immediately
await mail.schedule(
  {
    to: 'user@example.com',
    template: 'welcome',
    data: { name: 'John' },
  },
  new Date(Date.now() + 60000) // Send in 1 minute
)
```

## Lifecycle Hooks

React to email sending events:

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .onSendStarted(async (params) => {
    console.log('Starting to send email:', params.template)
  })
  .onSendSuccess(async (params) => {
    console.log('Email sent successfully:', params.template)
    // Log to analytics, update database, etc.
  })
  .onSendError(async (params, error) => {
    console.error('Failed to send email:', error)
    // Log error, send alert, etc.
  })
  .build()
```

## Telemetry Integration

Use `@igniter-js/telemetry` to capture mail events with a typed schema:

```typescript
import { IgniterTelemetry } from '@igniter-js/telemetry'
import { IgniterMailTelemetryEvents } from '@igniter-js/mail/telemetry'

const telemetry = IgniterTelemetry.create()
  .withService('my-api')
  .addEvents(IgniterMailTelemetryEvents)
  .build()

const mail = IgniterMail.create()
  .withTelemetry(telemetry)
  // ...
  .build()
```

## API Reference

### IgniterMail

Main mail client created by the builder.

#### Methods

##### `send(params)`

Sends an email immediately.

```typescript
await mail.send({
  to: string
  template: TemplateKey
  data: TemplatePayload
  subject?: string // Optional subject override
})
```

##### `schedule(params, date)`

Schedules an email for a future date. Requires a queue adapter.

```typescript
await mail.schedule(
  {
    to: string
    template: TemplateKey
    data: TemplatePayload
    subject?: string
  },
  date: Date
)
```

##### `templates.list()`

Lists template metadata available in the registry.

```typescript
const templates = await mail.templates.list()
```

##### `templates.get(id)`

Gets a single template metadata entry.

```typescript
const template = await mail.templates.get('welcome')
```

##### `templates.render(id, variables?)`

Renders a template to HTML and plain text without sending.

```typescript
const preview = await mail.templates.render('welcome', {
  name: 'User',
})
```

### IgniterMailBuilder

Fluent API for configuring the mail service.

#### Methods

##### `create()`

Creates a new builder instance.

```typescript
const builder = IgniterMail.create()
```

##### `withFrom(from)`

Sets the default FROM address.

```typescript
builder.withFrom('no-reply@example.com')
```

##### `withAdapter(adapter)`

Sets the mail adapter (instance or provider + secret).

```typescript
// With provider string + secret
builder.withAdapter('resend', process.env.RESEND_API_KEY!)

// With adapter instance
builder.withAdapter(adapterInstance)
```

##### `withLogger(logger)`

Attaches a logger for debugging.

```typescript
builder.withLogger(logger)
```

##### `withQueue(adapter, options?)`

Enables queue-based delivery.

```typescript
builder.withQueue(queueAdapter, {
  queue: 'mail',
  job: 'send',
  attempts: 3,
})
```

##### `addTemplate(key, template)`

Registers an email template.

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: ({ name }) => <Html>...</Html>,
})
```

##### `onSendStarted(hook)`

Registers a hook for send start events.

```typescript
builder.onSendStarted(async (params) => {
  console.log('Sending:', params.template)
})
```

##### `onSendSuccess(hook)`

Registers a hook for send success events.

```typescript
builder.onSendSuccess(async (params) => {
  console.log('Sent:', params.template)
})
```

##### `onSendError(hook)`

Registers a hook for send error events.

```typescript
builder.onSendError(async (params, error) => {
  console.error('Failed:', error)
})
```

##### `build()`

Builds the mail instance.

```typescript
const mail = builder.build()
```

## Error Handling

All errors are instances of `IgniterMailError` with stable error codes:

```typescript
try {
  await mail.send({ ... })
} catch (error) {
  if (error instanceof IgniterMailError) {
    console.error('Code:', error.code)
    console.error('Metadata:', error.metadata)
  }
}
```

**Common Error Codes:**
- `MAIL_PROVIDER_ADAPTER_REQUIRED` - No adapter configured
- `MAIL_PROVIDER_TEMPLATES_REQUIRED` - No templates registered
- `MAIL_PROVIDER_TEMPLATE_NOT_FOUND` - Template key doesn't exist
- `MAIL_PROVIDER_TEMPLATE_DATA_INVALID` - Schema validation failed
- `MAIL_PROVIDER_SEND_FAILED` - Failed to send email
- `MAIL_PROVIDER_SCHEDULE_DATE_INVALID` - Schedule date is in the past
- `MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED` - Queue adapter is required for scheduling
- `MAIL_PROVIDER_SCHEDULE_FAILED` - Failed to schedule email
- `MAIL_ADAPTER_CONFIGURATION_INVALID` - Adapter configuration error

## TypeScript Support

Full TypeScript support with compile-time type inference:

```typescript
const mail = IgniterMail.create()
  .addTemplate('welcome', {
    subject: 'Welcome',
    schema: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    render: (props) => <Html>...</Html>,
  })
  .build()

// Type inference works!
type Templates = typeof mail.$Infer.Templates // 'welcome'
type WelcomePayload = typeof mail.$Infer.Payloads['welcome'] // { name: string; email: string }
type SendInput = typeof mail.$Infer.SendInput // Union of all send params
```

## Best Practices

1. **Centralize Templates** - Define all templates in one place for consistency
2. **Use Schema Validation** - Always provide schemas for runtime safety
3. **Leverage Hooks** - Use hooks for logging, analytics, and error tracking
4. **Queue Heavy Loads** - Use queue integration for high-volume sending
5. **Mock Adapter First** - Use MockMailAdapter in unit tests before deploying
6. **Environment Variables** - Store API keys and secrets in environment variables
7. **Preview Emails** - Use React Email's preview feature during development

## Examples

### Password Reset Email

```tsx
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

// Usage
await mail.send({
  to: 'user@example.com',
  template: 'resetPassword',
  data: {
    name: 'John Doe',
    resetLink: 'https://example.com/reset?token=abc',
    expiresIn: 15,
  },
})
```

### Order Confirmation with Queue

```typescript
import { IgniterMail } from '@igniter-js/mail'
import { createBullMQAdapter } from '@igniter-js/adapter-bullmq'

const queueAdapter = createBullMQAdapter({ ... })

const mail = IgniterMail.create()
  .withFrom('orders@example.com')
  .withAdapter('postmark', process.env.POSTMARK_TOKEN!)
  .withQueue(queueAdapter, {
    queue: 'mail',
    job: 'send',
    attempts: 5,
    priority: 10,
  })
  .addTemplate('orderConfirmation', { ... })
  .build()

// Sends via queue
await mail.send({
  to: 'customer@example.com',
  template: 'orderConfirmation',
  data: { orderNumber: '12345', items: [...] },
})
```

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE) for details.

## Links

- **Documentation:** https://igniterjs.com/docs/mail
- **GitHub:** https://github.com/felipebarcelospro/igniter-js
- **NPM:** https://www.npmjs.com/package/@igniter-js/mail
- **Issues:** https://github.com/felipebarcelospro/igniter-js/issues
- **React Email:** https://react.email

---

# Why @igniter-js/mail

**You ship emails like you ship UI.**
Each template is a typed React component.
Each payload is validated at runtime.
Each send is observable through hooks and telemetry.

Key reasons teams adopt this package:

- **Template contracts never drift.**
- **Adapters are swappable.**
- **Queue support is built-in.**
- **Telemetry is first-class and optional.**
- **Testing is fast with the mock adapter.**

---

# Architecture at a Glance

```
IgniterMailBuilder
  ├─ withFrom / withAdapter / withQueue / withTelemetry
  ├─ addTemplate(...) -> new builder instance (type inference)
  └─ build() -> IgniterMailManagerCore

IgniterMailManagerCore
  ├─ templates.list / get / render
  ├─ send(params)
  └─ schedule(params, date)
```

---

# Complete API Reference

This section mirrors the actual exports in [packages/mail/src](packages/mail/src).

## IgniterMail

Builder alias exported as `IgniterMail`.

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', { subject: 'Welcome', schema: z.object({ name: z.string() }), render: WelcomeEmail })
  .build()
```

### `IgniterMail.create()`

```typescript
const builder = IgniterMail.create()
```

### `builder.withFrom(from)`

```typescript
builder.withFrom('no-reply@example.com')
```

### `builder.withAdapter(adapter | provider, secret?)`

```typescript
builder.withAdapter('resend', process.env.RESEND_API_KEY!)
```

```typescript
const adapter = ResendMailAdapter.create({ secret: process.env.RESEND_API_KEY, from: 'no-reply@example.com' })
builder.withAdapter(adapter)
```

### `builder.withLogger(logger)`

```typescript
builder.withLogger(logger)
```

### `builder.withTelemetry(telemetry)`

```typescript
builder.withTelemetry(telemetry)
```

### `builder.withQueue(adapter, options?)`

```typescript
builder.withQueue(queueAdapter, {
  queue: 'mail',
  job: 'send',
  attempts: 3,
  priority: 5,
})
```

### `builder.addTemplate(key, template)`

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
})
```

### `builder.onSendStarted(handler)`

```typescript
builder.onSendStarted(async ({ to, template }) => {
  console.log('Sending', to, template)
})
```

### `builder.onSendSuccess(handler)`

```typescript
builder.onSendSuccess(async ({ to, template }) => {
  console.log('Sent', to, template)
})
```

### `builder.onSendError(handler)`

```typescript
builder.onSendError(async ({ to, template }, error) => {
  console.error('Failed', to, template, error)
})
```

### `builder.build()`

```typescript
const mail = builder.build()
```

## IgniterMailManagerCore (runtime instance)

### `mail.send(params)`

```typescript
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  data: { name: 'Ada' },
})
```

### `mail.schedule(params, date)`

```typescript
await mail.schedule(
  { to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } },
  new Date(Date.now() + 60_000)
)
```

### `mail.templates.list()`

```typescript
const templates = await mail.templates.list()
```

### `mail.templates.get(id)`

```typescript
const template = await mail.templates.get('welcome')
```

### `mail.templates.render(id, variables?)`

```typescript
const preview = await mail.templates.render('welcome', { name: 'Ada' })
```

## IgniterMailTemplate

Builder for template definitions.

```typescript
const template = IgniterMailTemplate.create()
  .withSubject('Welcome')
  .withSchema(z.object({ name: z.string() }))
  .withRender(({ name }) => <Text>Hello {name}</Text>)
  .build()
```

## IgniterMailSchema

Schema utilities used internally and available for advanced usage.

```typescript
const passthrough = IgniterMailSchema.createPassthroughSchema()
const validated = await IgniterMailSchema.validateInput(passthrough, { any: 'data' })
```

## IgniterMailError

```typescript
try {
  await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
} catch (error) {
  if (error instanceof IgniterMailError) {
    console.error(error.code, error.message)
  }
}
```

## IgniterMailAdapter

```typescript
const adapter: IgniterMailAdapter = {
  async send({ to, subject, html, text }) {
    console.log({ to, subject, html, text })
  },
}
```

---

# Configuration

## Queue Options

```typescript
type IgniterMailQueueOptions = {
  job?: string
  queue?: string
  attempts?: number
  priority?: number
  removeOnComplete?: boolean | number
  removeOnFail?: boolean | number
  metadata?: Record<string, any>
  limiter?: JobLimiter
}
```

## Template Metadata (optional)

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

# Examples Gallery

The examples below are intentionally small and copy-paste ready.

## Example 01 — Minimal builder chain

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', { subject: 'Welcome', schema: z.object({ name: z.string() }), render: WelcomeEmail })
  .build()
```

## Example 02 — Subject override

```typescript
await mail.send({
  to: 'user@example.com',
  template: 'welcome',
  subject: 'Custom subject',
  data: { name: 'Ada' },
})
```

## Example 03 — Template preview rendering

```typescript
const preview = await mail.templates.render('welcome', { name: 'Ada' })
console.log(preview.html)
```

## Example 04 — Null when template missing

```typescript
const template = await mail.templates.get('does-not-exist')
if (!template) {
  console.log('No template found')
}
```

## Example 05 — Template builder usage

```typescript
const newsletter = IgniterMailTemplate.create()
  .withSubject('Weekly Update')
  .withSchema(z.object({ title: z.string() }))
  .withRender(({ title }) => <Text>{title}</Text>)
  .build()
```

## Example 06 — Add template built by builder

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('postmark', process.env.POSTMARK_SERVER_TOKEN!)
  .addTemplate('newsletter', newsletter)
  .build()
```

## Example 07 — Logger integration

```typescript
const mail = IgniterMail.create()
  .withLogger(logger)
  .withFrom('no-reply@example.com')
  .withAdapter('sendgrid', process.env.SENDGRID_API_KEY!)
  .addTemplate('welcome', { subject: 'Welcome', schema: z.object({ name: z.string() }), render: WelcomeEmail })
  .build()
```

## Example 08 — Telemetry integration

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addEvents(IgniterMailTelemetryEvents)
  .build()

const mail = IgniterMail.create()
  .withTelemetry(telemetry)
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', { subject: 'Welcome', schema: z.object({ name: z.string() }), render: WelcomeEmail })
  .build()
```

## Example 09 — Schedule with queue

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('smtp', process.env.SMTP_URL!)
  .withQueue(queueAdapter, { queue: 'mail', job: 'send' })
  .addTemplate('welcome', { subject: 'Welcome', schema: z.object({ name: z.string() }), render: WelcomeEmail })
  .build()

await mail.schedule(
  { to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } },
  new Date(Date.now() + 5 * 60 * 1000)
)
```

## Example 10 — Schedule inputs via type helper

```typescript
type ScheduleInput = typeof mail.$Infer.ScheduleInput
```

## Example 11 — Send inputs via type helper

```typescript
type SendInput = typeof mail.$Infer.SendInput
```

## Example 12 — Narrow template key union

```typescript
type Keys = typeof mail.$Infer.Templates
```

## Example 13 — Payload inference

```typescript
type WelcomePayload = typeof mail.$Infer.Payloads['welcome']
```

## Example 14 — Custom adapter

```typescript
const adapter: IgniterMailAdapter = {
  async send({ to, subject, html, text }) {
    console.log({ to, subject })
    await customProvider.send({ to, subject, html, text })
  },
}
```

## Example 15 — Mock adapter for tests

```typescript
const adapter = MockMailAdapter.create()
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter(adapter)
  .addTemplate('welcome', { subject: 'Welcome', schema: z.object({ name: z.string() }), render: WelcomeEmail })
  .build()

await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
expect(adapter.calls.send).toBe(1)
```

## Example 16 — Reset adapter state in tests

```typescript
adapter.clear()
expect(adapter.sent).toHaveLength(0)
```

## Example 17 — Templates list

```typescript
const templates = await mail.templates.list()
templates.forEach((t) => console.log(t.id, t.subject))
```

## Example 18 — Render for previews

```typescript
const preview = await mail.templates.render('welcome', { name: 'Ada' })
const html = preview.html
const text = preview.text
```

## Example 19 — Error handling

```typescript
try {
  await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
} catch (error) {
  if (error instanceof IgniterMailError) {
    console.error(error.code)
  }
}
```

## Example 20 — Template metadata for Studio

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  name: 'Welcome Email',
  description: 'Primary onboarding email',
  variables: ['name'],
})
```

## Example 21 — Simple Postmark adapter

```typescript
const adapter = PostmarkMailAdapter.create({
  secret: process.env.POSTMARK_SERVER_TOKEN,
  from: 'no-reply@example.com',
})
```

## Example 22 — Simple SendGrid adapter

```typescript
const adapter = SendGridMailAdapter.create({
  secret: process.env.SENDGRID_API_KEY,
  from: 'no-reply@example.com',
})
```

## Example 23 — Simple SMTP adapter

```typescript
const adapter = SmtpMailAdapter.create({
  secret: process.env.SMTP_URL,
  from: 'no-reply@example.com',
})
```

## Example 24 — Scheduled date validation guard

```typescript
const future = new Date(Date.now() + 10_000)
await mail.schedule({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } }, future)
```

## Example 25 — Add multiple templates

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', { subject: 'Welcome', schema: z.object({ name: z.string() }), render: WelcomeEmail })
  .addTemplate('reset', { subject: 'Reset', schema: z.object({ name: z.string(), link: z.string().url() }), render: ResetEmail })
  .build()
```

## Example 26 — Inspect send duration via telemetry

```typescript
telemetry.on('igniter.mail.send.success', (event) => {
  console.log(event.attributes['mail.duration_ms'])
})
```

## Example 27 — Hook for onSendStarted

```typescript
builder.onSendStarted(async ({ to }) => {
  await audit.log({ to })
})
```

## Example 28 — Hook for onSendError

```typescript
builder.onSendError(async ({ to }, error) => {
  await alerts.notify({ to, error: error.message })
})
```

## Example 29 — Hook for onSendSuccess

```typescript
builder.onSendSuccess(async ({ to }) => {
  await analytics.track('mail.sent', { to })
})
```

## Example 30 — Render with optional data

```typescript
await mail.templates.render('welcome', { name: 'Ada' })
```

## Example 31 — Template registry read-only usage

```typescript
const registry = await mail.templates.list()
const ids = registry.map((t) => t.id)
```

## Example 32 — Template metadata usage

```typescript
const meta = await mail.templates.get('welcome')
if (meta) {
  console.log(meta.subject, meta.path)
}
```

## Example 33 — Custom schema without validation

```typescript
const passthrough = IgniterMailSchema.createPassthroughSchema()
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('raw', { subject: 'Raw', schema: passthrough, render: RawEmail })
  .build()
```

## Example 34 — Use StandardSchemaV1 directly

```typescript
const schema: StandardSchemaV1 = IgniterMailSchema.createPassthroughSchema()
```

## Example 35 — Adapter send payload format

```typescript
await adapter.send({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello</p>',
  text: 'Hello',
})
```

---

# Real-World Scenarios

## Scenario 01 — SaaS onboarding series

```typescript
await mail.send({ to: user.email, template: 'welcome', data: { name: user.name } })
await mail.schedule({ to: user.email, template: 'tips', data: { name: user.name } }, new Date(Date.now() + 86400000))
```

## Scenario 02 — Healthcare appointment reminders

```typescript
const reminderAt = new Date(appointment.start.getTime() - 48 * 60 * 60 * 1000)
await mail.schedule({ to: patient.email, template: 'appointmentReminder', data: { name: patient.name } }, reminderAt)
```

## Scenario 03 — E-commerce order updates

```typescript
await mail.send({ to: order.email, template: 'orderPlaced', data: { orderId: order.id } })
```

## Scenario 04 — Fintech security alerts

```typescript
await mail.send({ to: user.email, template: 'securityAlert', data: { name: user.name } })
```

## Scenario 05 — Education cohort reminders

```typescript
await mail.schedule({ to: student.email, template: 'classReminder', data: { course: 'Math 101' } }, nextClassAt)
```

## Scenario 06 — Logistics delivery proof

```typescript
await mail.send({ to: recipient.email, template: 'deliveryProof', data: { trackingId } })
```

## Scenario 07 — Hiring pipeline status

```typescript
await mail.send({ to: candidate.email, template: 'applicationUpdate', data: { stage: 'Interview' } })
```

## Scenario 08 — Social product notification

```typescript
await mail.send({ to: user.email, template: 'mentionAlert', data: { name: user.name } })
```

---

# Testing

## Unit testing with MockMailAdapter

```typescript
import { MockMailAdapter } from '@igniter-js/mail/adapters'

const adapter = MockMailAdapter.create()
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter(adapter)
  .addTemplate('welcome', { subject: 'Welcome', schema: z.object({ name: z.string() }), render: WelcomeEmail })
  .build()

await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })

expect(adapter.sent).toHaveLength(1)
expect(adapter.sent[0].subject).toBe('Welcome')
```

## Integration testing with real adapters

```typescript
const adapter = ResendMailAdapter.create({ secret: process.env.RESEND_API_KEY, from: 'no-reply@example.com' })
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter(adapter)
  .addTemplate('smoke', { subject: 'Smoke', schema: z.object({ ok: z.boolean() }), render: SmokeEmail })
  .build()
```

---

# Troubleshooting

Common errors are thrown as `IgniterMailError`.

## `MAIL_PROVIDER_FROM_REQUIRED`

```typescript
IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .build()
```

## `MAIL_PROVIDER_ADAPTER_REQUIRED`

```typescript
IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .build()
```

## `MAIL_PROVIDER_TEMPLATE_NOT_FOUND`

```typescript
await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
```

## `MAIL_PROVIDER_TEMPLATE_DATA_INVALID`

```typescript
await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: '' } })
```

## `MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED`

```typescript
IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .build()
```

---

# Framework Integrations

## Next.js Route Handler

```typescript
import { NextResponse } from 'next/server'

export async function POST() {
  await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
  return NextResponse.json({ ok: true })
}
```

## Express Route

```typescript
app.post('/send', async (_req, res) => {
  await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
  res.json({ ok: true })
})
```

## Fastify Route

```typescript
fastify.post('/send', async () => {
  await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
  return { ok: true }
})

---

# Best Practices

| ✅ Do | Why | Example |
| --- | --- | --- |
| Define schemas for every template | Prevent runtime payload drift | `z.object({ name: z.string() })` |
| Use `MockMailAdapter` in CI | Deterministic, fast tests | `MockMailAdapter.create()` |
| Provide `withFrom()` early | Adapter creation needs `from` | `.withFrom('no-reply@acme.com')` |
| Use hooks for side effects | Keep email logic isolated | `.onSendSuccess(async () => ...)` |
| Schedule high-volume sending | Avoid request timeouts | `.withQueue(adapter)` |

# Anti-Patterns

| ❌ Don’t | Why | Example |
| --- | --- | --- |
| Skip schema validation | Invalid data reaches templates | `schema: IgniterMailSchema.createPassthroughSchema()` for uncontrolled input |
| Catch and ignore send errors | You lose delivery guarantees | `try { await mail.send(...) } catch {}` |
| Hardcode secrets | Unsafe and hard to rotate | `withAdapter('resend', 'hardcoded')` |
| Use client components | Server-only package | Importing mail in the browser triggers the shim |

---

# Adapter Comparison

| Adapter | Transport | Dependency | Best For |
| --- | --- | --- | --- |
| Resend | SDK | `resend` | Modern transactional email with simple setup |
| Postmark | HTTP API | `fetch` | High deliverability with minimal dependencies |
| SendGrid | HTTP API | `fetch` | Large-scale transactional email |
| SMTP | SMTP | `nodemailer` | Internal or legacy infrastructure |
| Mock | In-memory | None | Tests and local development |

---

# Telemetry Registry (Reference)

The following events are defined in `@igniter-js/mail/telemetry`.

## Group: `send`

- `igniter.mail.send.started`
  - `mail.to`
  - `mail.template`
  - `mail.subject` (optional)
- `igniter.mail.send.success`
  - `mail.to`
  - `mail.template`
  - `mail.subject` (optional)
  - `mail.duration_ms` (optional)
- `igniter.mail.send.error`
  - `mail.to`
  - `mail.template`
  - `mail.subject` (optional)
  - `mail.error.code`
  - `mail.error.message`
  - `mail.duration_ms` (optional)

## Group: `schedule`

- `igniter.mail.schedule.started`
  - `mail.to`
  - `mail.template`
  - `mail.scheduled_at`
  - `mail.delay_ms`
- `igniter.mail.schedule.success`
  - `mail.to`
  - `mail.template`
  - `mail.scheduled_at`
  - `mail.delay_ms`
  - `mail.queue_id` (optional)
- `igniter.mail.schedule.error`
  - `mail.to`
  - `mail.template`
  - `mail.scheduled_at`
  - `mail.error.code`
  - `mail.error.message`

## Group: `templates`

- `igniter.mail.templates.list.started`
  - `ctx.mail.template.count` (optional)
  - `ctx.mail.duration_ms` (optional)
- `igniter.mail.templates.list.success`
  - `ctx.mail.template.count` (optional)
  - `ctx.mail.duration_ms` (optional)
- `igniter.mail.templates.list.error`
  - `ctx.mail.template_id` (optional)
  - `ctx.mail.error.code`
  - `ctx.mail.error.message`
  - `ctx.mail.duration_ms` (optional)
- `igniter.mail.templates.get.started`
  - `ctx.mail.template_id`
  - `ctx.mail.duration_ms` (optional)
- `igniter.mail.templates.get.success`
  - `ctx.mail.template_id`
  - `ctx.mail.duration_ms` (optional)
- `igniter.mail.templates.get.error`
  - `ctx.mail.template_id` (optional)
  - `ctx.mail.error.code`
  - `ctx.mail.error.message`
  - `ctx.mail.duration_ms` (optional)
- `igniter.mail.templates.render.started`
  - `ctx.mail.template_id`
  - `ctx.mail.duration_ms` (optional)
- `igniter.mail.templates.render.success`
  - `ctx.mail.template_id`
  - `ctx.mail.duration_ms` (optional)
- `igniter.mail.templates.render.error`
  - `ctx.mail.template_id` (optional)
  - `ctx.mail.error.code`
  - `ctx.mail.error.message`
  - `ctx.mail.duration_ms` (optional)

---

# Security and Compliance Notes

- Do not put sensitive data in subjects.
- Avoid sending raw secrets in template data.
- Use the telemetry hooks to detect failed sends without logging payloads.
- Keep provider secrets in environment variables.

---

# Performance Notes

- Rendered HTML + text happens per send.
- For high volume, use `.withQueue()` and `.schedule()`.
- Keep templates small to reduce render time.

---

# Extended Examples (Appendix)

## Example 36 — Template list timing metrics

```typescript
const list = await mail.templates.list()
console.log('Templates', list.length)
```

## Example 37 — Schedule multiple emails

```typescript
await Promise.all(
  users.map((user) =>
    mail.schedule(
      { to: user.email, template: 'welcome', data: { name: user.name } },
      new Date(Date.now() + 60_000)
    )
  )
)
```

## Example 38 — Swap adapters per environment

```typescript
const adapter = process.env.NODE_ENV === 'production'
  ? ResendMailAdapter.create({ secret: process.env.RESEND_API_KEY, from: 'no-reply@example.com' })
  : MockMailAdapter.create()
```

## Example 39 — Render only for previews

```typescript
const { html } = await mail.templates.render('welcome', { name: 'Preview' })
```

## Example 40 — Typed template map in utility

```typescript
function sendWelcome(input: typeof mail.$Infer.SendInput) {
  return mail.send(input)
}
```

## Example 41 — Provide template metadata for tooling

```typescript
builder.addTemplate('invoice', {
  subject: 'Invoice',
  schema: z.object({ total: z.number() }),
  render: InvoiceEmail,
  name: 'Invoice Email',
  description: 'Billing notification',
  path: 'mail/invoice',
})
```

## Example 42 — Pre-generate text in React template

```typescript
const Email = ({ name }: { name: string }) => (
  <Html>
    <Text>Hello {name}</Text>
  </Html>
)
```

## Example 43 — Schedule with explicit delay

```typescript
await mail.schedule({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } }, new Date(Date.now() + 300_000))
```

## Example 44 — Hook chain

```typescript
const mail = IgniterMail.create()
  .onSendStarted(async (params) => audit.log('started', params.template))
  .onSendSuccess(async (params) => audit.log('success', params.template))
  .onSendError(async (params, error) => audit.log('error', error.message))
```

## Example 45 — Mock adapter in integration tests

```typescript
const adapter = MockMailAdapter.create()
adapter.clear()
```

## Example 46 — Safe schedule guard

```typescript
const date = new Date(Date.now() + 10_000)
if (date.getTime() > Date.now()) {
  await mail.schedule({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } }, date)
}
```

## Example 47 — Template data inference helper

```typescript
type ResetPayload = typeof mail.$Infer.Payloads['reset']
```

## Example 48 — Adapter send payload shape in tests

```typescript
const last = adapter.sent.at(-1)
expect(last?.to).toBe('user@example.com')
```

## Example 49 — Template registry map

```typescript
const registry = await mail.templates.list()
const ids = registry.map((entry) => entry.id)
```

## Example 50 — Render for text-only preview

```typescript
const { text } = await mail.templates.render('welcome', { name: 'Ada' })
```

## Example 51 — Strict Zod schema

```typescript
const schema = z.object({ name: z.string() }).strict()
```

## Example 52 — Custom template render function

```typescript
const render = ({ name }: { name: string }) => <Text>Hello {name}</Text>
```

## Example 53 — Standalone template build

```typescript
const template = IgniterMailTemplate.create()
  .withSubject('Hello')
  .withSchema(z.object({ name: z.string() }))
  .withRender(({ name }) => <Text>{name}</Text>)
  .build()
```

## Example 54 — Schedule input typing

```typescript
type ScheduleInput = typeof mail.$Infer.ScheduleInput
```

## Example 55 — Adapter interface implementation

```typescript
const adapter: IgniterMailAdapter = { send: async () => undefined }
```

## Example 56 — Render template for logs

```typescript
const preview = await mail.templates.render('welcome', { name: 'Log' })
logger.info(preview.text)
```

## Example 57 — Optional subject override

```typescript
await mail.send({ to: 'user@example.com', template: 'welcome', subject: 'Custom', data: { name: 'Ada' } })
```

## Example 58 — Render template with shared data

```typescript
const data = { name: 'Ada' }
await mail.templates.render('welcome', data)
```

## Example 59 — Custom adapter with monitoring

```typescript
const adapter: IgniterMailAdapter = {
  async send(params) {
    await monitor.track('mail.send', { to: params.to })
  },
}
```

## Example 60 — Add template with metadata timestamps

```typescript
builder.addTemplate('report', {
  subject: 'Report',
  schema: z.object({ date: z.string() }),
  render: ReportEmail,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

---

# FAQ

## Does `send()` validate payloads?

Yes.
If a schema provides StandardSchemaV1 validation, the payload is validated before rendering.

## Can I render without sending?

Yes.
Use `mail.templates.render()` to get HTML + text without invoking the adapter.

## Do I need telemetry?

No.
Telemetry is optional and only active if you pass a telemetry manager.

## Is the package safe in the browser?

No.
This is server-only and guarded by a browser shim.

---

# Glossary

- **Builder**: The fluent configuration API (`IgniterMail`).
- **Adapter**: Provider-specific transport layer (`ResendMailAdapter`, etc.).
- **Template**: A React Email component paired with a schema.
- **Registry**: The in-memory map of templates.
- **Telemetry**: Optional typed events emitted on operations.

---

# Maintenance Checklist (for contributors)

- Update adapters and tests together.
- Ensure telemetry events are defined before new operations.
- Keep template schemas strict when adding new inputs.
- Avoid logging template payloads.

---

# More Examples (Appendix)

## Example 61 — Render template for admin preview

```typescript
const preview = await mail.templates.render('welcome', { name: 'Admin Preview' })
```

## Example 62 — Basic schedule wrapper

```typescript
const scheduleWelcome = (to: string, name: string, date: Date) =>
  mail.schedule({ to, template: 'welcome', data: { name } }, date)
```

## Example 63 — Use `IgniterMailSchema` passthrough

```typescript
const schema = IgniterMailSchema.createPassthroughSchema()
```

## Example 64 — Manual validation helper

```typescript
const validated = await IgniterMailSchema.validateInput(schema, { ok: true })
```

## Example 65 — Template metadata description

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  description: 'Sent after signup',
})
```

## Example 66 — Template metadata path

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  path: 'mail/welcome',
})
```

## Example 67 — Template metadata name

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  name: 'Welcome Email',
})
```

## Example 68 — Template variables

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  variables: ['name'],
})
```

## Example 69 — Render for text auditing

```typescript
const { text } = await mail.templates.render('welcome', { name: 'Audit' })
```

## Example 70 — Create template builder and add

```typescript
const template = IgniterMailTemplate.create()
  .withSubject('Alert')
  .withSchema(z.object({ message: z.string() }))
  .withRender(({ message }) => <Text>{message}</Text>)
  .build()

builder.addTemplate('alert', template)
```

## Example 71 — Provider string for SMTP

```typescript
builder.withAdapter('smtp', process.env.SMTP_URL!)
```

## Example 72 — Provider string for SendGrid

```typescript
builder.withAdapter('sendgrid', process.env.SENDGRID_API_KEY!)
```

## Example 73 — Provider string for Postmark

```typescript
builder.withAdapter('postmark', process.env.POSTMARK_SERVER_TOKEN!)
```

## Example 74 — Use mock adapter in local dev

```typescript
const adapter = MockMailAdapter.create()
```

## Example 75 — Queue limiter config

```typescript
builder.withQueue(queueAdapter, { limiter: { max: 10, duration: 1000 } })
```

## Example 76 — Guard against past schedule

```typescript
const date = new Date(Date.now() + 5000)
await mail.schedule({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } }, date)
```

## Example 77 — Use templates list for UI select

```typescript
const options = (await mail.templates.list()).map((t) => ({ label: t.name, value: t.id }))
```

## Example 78 — Use telemetry to track success

```typescript
telemetry.on('igniter.mail.send.success', (event) => {
  console.log(event.attributes['mail.duration_ms'])
})
```

## Example 79 — Use hooks for side effects

```typescript
builder.onSendSuccess(async ({ to }) => audit.log({ to }))
```

## Example 80 — Use templates.get() for metadata

```typescript
const meta = await mail.templates.get('welcome')
if (meta) console.log(meta.subject)
```
```

```

