# @igniter-js/connectors

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/connectors.svg)](https://www.npmjs.com/package/@igniter-js/connectors)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe, multi-tenant connector management library for Igniter.js. Build integrations with third-party services using OAuth, custom configurations, webhooks, and encrypted field storage.

## Features

- ✅ **Type-Safe Connectors** - Full TypeScript inference for configs, actions, and outputs
- ✅ **Multi-Tenant Scopes** - Organize connectors by organization, user, or custom scopes
- ✅ **OAuth Universal** - Built-in OAuth 2.0 flow with PKCE support and auto-refresh
- ✅ **Field Encryption** - AES-256-GCM encryption for sensitive configuration fields
- ✅ **Webhook Support** - Receive and validate webhooks from integrated services
- ✅ **Prisma Adapter** - Production-ready database adapter for Prisma ORM
- ✅ **Builder Pattern** - Fluent API for defining connectors and managers
- ✅ **Event System** - Subscribe to connector lifecycle events
- ✅ **Schema Validation** - Runtime validation with StandardSchema (Zod)

## Installation

```bash
# npm
npm install @igniter-js/connectors @igniter-js/core

# pnpm
pnpm add @igniter-js/connectors @igniter-js/core

# yarn
yarn add @igniter-js/connectors @igniter-js/core

# bun
bun add @igniter-js/connectors @igniter-js/core
```

## Quick Start

### 1. Define a Connector

Use the `Connector` builder to define what a connector needs and can do:

```typescript
import { Connector } from '@igniter-js/connectors'
import { z } from 'zod'

// Define a Telegram connector
const telegramConnector = Connector.create()
  .withConfig(z.object({
    botToken: z.string(),
    chatId: z.string(),
  }))
  .withMetadata(
    z.object({ name: z.string(), icon: z.string() }),
    { name: 'Telegram', icon: 'telegram.svg' }
  )
  .addAction('sendMessage', {
    description: 'Send a message to a Telegram chat',
    input: z.object({
      message: z.string(),
      parseMode: z.enum(['HTML', 'Markdown']).optional(),
    }),
    output: z.object({
      messageId: z.number(),
    }),
    handler: async ({ input, config }) => {
      const response = await fetch(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chatId,
            text: input.message,
            parse_mode: input.parseMode,
          }),
        }
      )
      const data = await response.json()
      return { messageId: data.result.message_id }
    },
  })
  .build()
```

### 2. Create the Connector Manager

Use `IgniterConnector` to create a manager that handles database operations and scoping:

```typescript
import { IgniterConnector, PrismaAdapter } from '@igniter-js/connectors'
import { prisma } from './prisma'

// Create the connector manager
const connectors = IgniterConnector.create()
  .withDatabase(PrismaAdapter.create(prisma))
  .withEncrypt(['botToken', 'accessToken', 'refreshToken'])
  .addScope('organization', { required: true })
  .addConnector('telegram', telegramConnector)
  .onConnect(async ({ connector, scope, identity }) => {
    console.log(`Connected ${connector} for ${scope}:${identity}`)
  })
  .build()

export { connectors }
```

### 3. Use Scoped Connectors

Access connectors within a specific scope:

```typescript
// Get a scoped instance
const scoped = connectors.scope('organization', 'org_123')

// Connect a connector
await scoped.connect('telegram', {
  botToken: 'bot_token_here',
  chatId: '123456',
})

// Check connection status
const telegram = await scoped.get('telegram')
console.log('Connected:', telegram?.enabled)

// Execute an action
const result = await scoped.action('telegram', 'sendMessage').call({
  message: 'Hello from Igniter.js!',
  parseMode: 'HTML',
})
console.log('Message ID:', result.data?.messageId)

// Disconnect
await scoped.disconnect('telegram')
```

## Core Concepts

### Connectors

A connector defines:
- **Configuration Schema** - What users provide when connecting
- **Metadata** - Static info (name, icon, description)
- **Actions** - Operations the connector can perform
- **OAuth** (optional) - OAuth 2.0 configuration for automatic auth
- **Webhooks** (optional) - Incoming webhook handling

```typescript
const slackConnector = Connector.create()
  .withConfig(z.object({
    webhookUrl: z.string().url(),
    channel: z.string(),
  }))
  .withMetadata(
    z.object({ name: z.string() }),
    { name: 'Slack' }
  )
  .addAction('postMessage', {
    input: z.object({ text: z.string() }),
    handler: async ({ input, config }) => {
      await fetch(config.webhookUrl, {
        method: 'POST',
        body: JSON.stringify({
          channel: config.channel,
          text: input.text,
        }),
      })
    },
  })
  .build()
```

### Scopes

Scopes enable multi-tenant connector management:

```typescript
const connectors = IgniterConnector.create()
  .withDatabase(adapter)
  // Organization-level connectors
  .addScope('organization', { required: true })
  // User-level connectors  
  .addScope('user', { required: true })
  // System-level (no identifier needed)
  .addScope('system', { required: false })
  .build()

// Each scope is isolated
const orgScoped = connectors.scope('organization', 'org_123')
const userScoped = connectors.scope('user', 'user_456')
```

### Encryption

Sensitive fields are automatically encrypted at rest:

```typescript
const connectors = IgniterConnector.create()
  .withDatabase(adapter)
  .withEncrypt(['apiKey', 'accessToken', 'refreshToken', 'secret'])
  .build()
```

Set the `IGNITER_SECRET` environment variable for the encryption key:

```bash
IGNITER_SECRET=your-32-character-secret-key-here
```

### OAuth Connectors

Build OAuth-enabled connectors with automatic token management:

```typescript
const mailchimpConnector = Connector.create()
  .withConfig(z.object({
    dc: z.string(), // Mailchimp data center
  }))
  .withOAuth({
    authorizationUrl: 'https://login.mailchimp.com/oauth2/authorize',
    tokenUrl: 'https://login.mailchimp.com/oauth2/token',
    clientId: process.env.MAILCHIMP_CLIENT_ID!,
    clientSecret: process.env.MAILCHIMP_CLIENT_SECRET!,
    scopes: [],
    userInfoUrl: 'https://login.mailchimp.com/oauth2/metadata',
    parseUserInfo: (data) => ({
      id: data.user_id,
      name: data.accountname,
    }),
  })
  .addAction('getLists', {
    input: z.object({}),
    handler: async ({ config, oauth }) => {
      const response = await fetch(
        `https://${config.dc}.api.mailchimp.com/3.0/lists`,
        {
          headers: {
            Authorization: `Bearer ${oauth?.accessToken}`,
          },
        }
      )
      return response.json()
    },
  })
  .build()
```

#### Handle OAuth Routes

```typescript
// Start OAuth flow
app.get('/oauth/mailchimp/connect', async (req, res) => {
  const result = await connectors.handle('mailchimp', '/oauth/connect', {
    scope: 'organization',
    identity: req.session.organizationId,
    redirectUrl: '/settings/integrations',
  })
  res.redirect(result.redirect!)
})

// Handle OAuth callback
app.get('/oauth/mailchimp/callback', async (req, res) => {
  const result = await connectors.handle('mailchimp', '/oauth/callback', {
    code: req.query.code,
    state: req.query.state,
    request: req,
  })
  res.redirect(result.redirect!)
})
```

### Webhooks

Handle incoming webhooks from integrated services:

```typescript
const stripeConnector = Connector.create()
  .withConfig(z.object({
    webhookSecret: z.string(),
  }))
  .withWebhook({
    description: 'Receive Stripe events',
    schema: z.object({
      type: z.string(),
      data: z.object({ object: z.any() }),
    }),
    handler: async ({ payload, config }) => {
      switch (payload.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          break
        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          break
      }
    },
  })
  .build()
```

#### Handle Webhooks

```typescript
app.post('/webhooks/:secret', async (req, res) => {
  const result = await connectors.handle('stripe', '/webhook', {
    secret: req.params.secret,
    request: req,
    body: req.body,
    headers: req.headers,
  })
  res.status(result.status).json(result.body)
})
```

## Database Adapters

### Prisma Adapter

The built-in Prisma adapter requires a `Connector` model in your schema:

```prisma
model Connector {
  id        String   @id @default(cuid())
  scope     String
  identity  String
  provider  String
  value     Json
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([scope, identity, provider])
  @@index([scope, identity])
}
```

```typescript
import { PrismaAdapter } from '@igniter-js/connectors'
import { prisma } from './prisma'

const adapter = PrismaAdapter.create(prisma)

// Or with custom model name
const adapter = PrismaAdapter.create(prisma, { model: 'Integration' })
```

### Custom Adapters

Implement the `IgniterConnectorAdapter` interface:

```typescript
import { IgniterConnectorBaseAdapter } from '@igniter-js/connectors'
import type { IgniterConnectorRecord, IgniterConnectorUpdateData } from '@igniter-js/connectors'

class CustomAdapter extends IgniterConnectorBaseAdapter {
  async get(scope: string, identity: string, provider: string): Promise<IgniterConnectorRecord | null> {
    // Implementation
  }

  async list(scope: string, identity: string): Promise<IgniterConnectorRecord[]> {
    // Implementation
  }

  async upsert(scope: string, identity: string, provider: string, data: IgniterConnectorUpdateData): Promise<IgniterConnectorRecord> {
    // Implementation
  }

  async update(scope: string, identity: string, provider: string, data: IgniterConnectorUpdateData): Promise<IgniterConnectorRecord> {
    // Implementation
  }

  async delete(scope: string, identity: string, provider: string): Promise<void> {
    // Implementation
  }
}
```

## Events

Subscribe to connector lifecycle events:

```typescript
const connectors = IgniterConnector.create()
  .withDatabase(adapter)
  .onEvent((event) => {
    switch (event.type) {
      case 'connected':
        console.log(`${event.connector} connected`)
        break
      case 'disconnected':
        console.log(`${event.connector} disconnected`)
        break
      case 'action':
        console.log(`${event.action} executed on ${event.connector}`)
        break
      case 'oauth:completed':
        console.log(`OAuth completed for ${event.connector}`)
        break
      case 'webhook:received':
        console.log(`Webhook received for ${event.connector}`)
        break
      case 'error':
        console.error(`Error in ${event.connector}:`, event.error)
        break
    }
  })
  .build()

// Or subscribe on scoped instance
const scoped = connectors.scope('organization', 'org_123')
const unsubscribe = scoped.subscribe((event) => {
  console.log('Event:', event)
})

// Unsubscribe later
unsubscribe()
```

## Lifecycle Hooks

Add hooks for connector operations:

```typescript
const connectors = IgniterConnector.create()
  .withDatabase(adapter)
  .onConnect(async ({ connector, scope, identity, config }) => {
    // Called after successful connection
    await analytics.track('connector_connected', {
      connector,
      scope,
      identity,
    })
  })
  .onDisconnect(async ({ connector, scope, identity }) => {
    // Called after disconnection
    await analytics.track('connector_disconnected', {
      connector,
      scope,
      identity,
    })
  })
  .onError(async ({ error, connector, scope, action }) => {
    // Called on any error
    await errorTracker.capture(error, {
      connector,
      scope,
      action,
    })
  })
  .build()
```

## API Reference

### `Connector.create()`

Creates a new connector builder.

| Method | Description |
|--------|-------------|
| `.withConfig(schema)` | Set configuration schema |
| `.withMetadata(schema, value)` | Set metadata schema and value |
| `.withDefaultConfig(config)` | Set default config (for system connectors) |
| `.withOAuth(options)` | Configure OAuth 2.0 |
| `.withWebhook(options)` | Configure webhook handling |
| `.onContext(hook)` | Add context enrichment hook |
| `.onValidate(hook)` | Add validation hook |
| `.addAction(key, options)` | Add an action |
| `.build()` | Build the connector definition |

### `IgniterConnector.create()`

Creates a new connector manager builder.

| Method | Description |
|--------|-------------|
| `.withDatabase(adapter)` | Set database adapter |
| `.withLogger(logger)` | Set logger instance |
| `.withEncrypt(fields)` | Set fields to encrypt |
| `.withCustomEncrypt(encrypt, decrypt)` | Set custom encryption functions |
| `.addScope(key, options)` | Add a scope definition |
| `.addConnector(key, connector)` | Add a connector |
| `.onConnect(hook)` | Add connection hook |
| `.onDisconnect(hook)` | Add disconnection hook |
| `.onError(hook)` | Add error hook |
| `.onEvent(handler)` | Add global event handler |
| `.build()` | Build the manager instance |

### `IgniterConnectorScoped`

Scoped connector instance returned by `connectors.scope()`.

| Method | Description |
|--------|-------------|
| `.list(options?)` | List all connected connectors |
| `.get(key)` | Get a specific connector |
| `.connect(key, config)` | Connect a connector |
| `.update(key, config)` | Update connector config |
| `.enable(key)` / `.disable(key)` | Toggle connector state |
| `.disconnect(key)` | Disconnect a connector |
| `.action(key, action)` | Get action builder |
| `.subscribe(handler)` | Subscribe to events |

## Type Inference

The library provides full type inference:

```typescript
// Extract connector keys
type ConnectorKey = $InferConnectorKey<typeof connectors>
// => 'telegram' | 'slack' | 'mailchimp'

// Extract scope keys
type ScopeKey = $InferScopeKey<typeof connectors>
// => 'organization' | 'user' | 'system'

// Extract scoped type
type Scoped = $InferScoped<typeof connectors>

// Extract config type for a connector
type TelegramConfig = $InferConfig<typeof telegramConnector>
// => { botToken: string; chatId: string }

// Extract action keys
type TelegramActions = $InferActionKeys<typeof telegramConnector>
// => 'sendMessage'
```

## Error Handling

All errors are thrown as `IgniterConnectorError` with stable codes:

```typescript
import { IgniterConnectorError, IGNITER_CONNECTOR_ERROR_CODES } from '@igniter-js/connectors'

try {
  await scoped.action('telegram', 'sendMessage').call({ message: '' })
} catch (error) {
  if (error instanceof IgniterConnectorError) {
    switch (error.code) {
      case IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_CONNECTED:
        // Connector is not connected
        break
      case IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ACTION_INPUT_INVALID:
        // Invalid action input
        break
      case IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ACTION_FAILED:
        // Action execution failed
        break
    }
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `IGNITER_SECRET` | Required for encryption (min 32 chars) |

## License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro)
