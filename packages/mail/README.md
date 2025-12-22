# @igniter-js/mail

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/mail.svg)](https://www.npmjs.com/package/@igniter-js/mail)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe email library for Igniter.js applications with React Email templates and multiple provider adapters. Send transactional emails with confidence using compile-time type safety and runtime validation.

## Features

- ✅ **Type-Safe Templates** - Full TypeScript inference with template payload validation
- ✅ **React Email** - Build beautiful emails with React components
- ✅ **Multiple Providers** - Resend, Postmark, SendGrid, SMTP
- ✅ **Mock Adapter** - In-memory adapter for unit testing
- ✅ **Schema Validation** - Runtime validation with StandardSchema (Zod 3.23+ or any StandardSchemaV1-compatible lib)
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
import { ResendMailAdapterBuilder } from '@igniter-js/mail'

// Using builder shorthand
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .build()

// Or using adapter builder
const adapter = ResendMailAdapterBuilder.create()
  .withSecret(process.env.RESEND_API_KEY!)
  .withFrom('no-reply@example.com')
  .build()

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
  .withAdapter('smtp', JSON.stringify({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }))
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
