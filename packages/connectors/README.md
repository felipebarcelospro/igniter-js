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
- ✅ **Telemetry Integration** - Built-in observability with automatic event emission

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
import { Connector } from "@igniter-js/connectors";
import { z } from "zod";

// Define a Telegram connector
const telegramConnector = Connector.create()
  .withConfig(
    z.object({
      botToken: z.string(),
      chatId: z.string(),
    }),
  )
  .withMetadata(z.object({ name: z.string(), icon: z.string() }), {
    name: "Telegram",
    icon: "telegram.svg",
  })
  .addAction("sendMessage", {
    description: "Send a message to a Telegram chat",
    input: z.object({
      message: z.string(),
      parseMode: z.enum(["HTML", "Markdown"]).optional(),
    }),
    output: z.object({
      messageId: z.number(),
    }),
    handler: async ({ input, config }) => {
      const response = await fetch(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: config.chatId,
            text: input.message,
            parse_mode: input.parseMode,
          }),
        },
      );
      const data = await response.json();
      return { messageId: data.result.message_id };
    },
  })
  .build();
```

### 2. Create the Connector Manager

Use `IgniterConnector` to create a manager that handles database operations and scoping:

```typescript
import { IgniterConnector, PrismaAdapter } from "@igniter-js/connectors";
import { prisma } from "./prisma";

// Create the connector manager
const connectors = IgniterConnector.create()
  .withDatabase(PrismaAdapter.create(prisma))
  .withEncrypt(["botToken", "accessToken", "refreshToken"])
  .addScope("organization", { required: true })
  .addConnector("telegram", telegramConnector)
  .onConnect(async ({ connector, scope, identity }) => {
    console.log(`Connected ${connector} for ${scope}:${identity}`);
  })
  .build();

export { connectors };
```

### 3. Use Scoped Connectors

Access connectors within a specific scope:

```typescript
// Get a scoped instance
const scoped = connectors.scope("organization", "org_123");

// Connect a connector
await scoped.connect("telegram", {
  botToken: "bot_token_here",
  chatId: "123456",
});

// Check connection status
const telegram = await scoped.get("telegram");
console.log("Connected:", telegram?.enabled);

// Execute an action
const result = await scoped.action("telegram", "sendMessage").call({
  message: "Hello from Igniter.js!",
  parseMode: "HTML",
});
console.log("Message ID:", result.data?.messageId);

// Disconnect
await scoped.disconnect("telegram");
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
  .withConfig(
    z.object({
      webhookUrl: z.string().url(),
      channel: z.string(),
    }),
  )
  .withMetadata(z.object({ name: z.string() }), { name: "Slack" })
  .addAction("postMessage", {
    input: z.object({ text: z.string() }),
    handler: async ({ input, config }) => {
      await fetch(config.webhookUrl, {
        method: "POST",
        body: JSON.stringify({
          channel: config.channel,
          text: input.text,
        }),
      });
    },
  })
  .build();
```

### Scopes

Scopes enable multi-tenant connector management:

```typescript
const connectors = IgniterConnector.create()
  .withDatabase(adapter)
  // Organization-level connectors
  .addScope("organization", { required: true })
  // User-level connectors
  .addScope("user", { required: true })
  // System-level (no identifier needed)
  .addScope("system", { required: false })
  .build();

// Each scope is isolated
const orgScoped = connectors.scope("organization", "org_123");
const userScoped = connectors.scope("user", "user_456");
```

### Encryption

Sensitive fields are automatically encrypted at rest:

```typescript
const connectors = IgniterConnector.create()
  .withDatabase(adapter)
  .withEncrypt(["apiKey", "accessToken", "refreshToken", "secret"])
  .build();
```

Set the `IGNITER_SECRET` environment variable for the encryption key:

```bash
IGNITER_SECRET=your-32-character-secret-key-here
```

### OAuth Connectors

Build OAuth-enabled connectors with automatic token management:

```typescript
const mailchimpConnector = Connector.create()
  .withConfig(
    z.object({
      dc: z.string(), // Mailchimp data center
    }),
  )
  .withOAuth({
    authorizationUrl: "https://login.mailchimp.com/oauth2/authorize",
    tokenUrl: "https://login.mailchimp.com/oauth2/token",
    clientId: process.env.MAILCHIMP_CLIENT_ID!,
    clientSecret: process.env.MAILCHIMP_CLIENT_SECRET!,
    scopes: [],
    userInfoUrl: "https://login.mailchimp.com/oauth2/metadata",
    parseUserInfo: (data) => ({
      id: data.user_id,
      name: data.accountname,
    }),
  })
  .addAction("getLists", {
    input: z.object({}),
    handler: async ({ config, oauth }) => {
      const response = await fetch(
        `https://${config.dc}.api.mailchimp.com/3.0/lists`,
        {
          headers: {
            Authorization: `Bearer ${oauth?.accessToken}`,
          },
        },
      );
      return response.json();
    },
  })
  .build();
```

#### Handle OAuth Routes

```typescript
// Start OAuth flow
app.get("/oauth/mailchimp/connect", async (req, res) => {
  const result = await connectors.handle("mailchimp", "/oauth/connect", {
    scope: "organization",
    identity: req.session.organizationId,
    redirectUrl: "/settings/integrations",
  });
  res.redirect(result.redirect!);
});

// Handle OAuth callback
app.get("/oauth/mailchimp/callback", async (req, res) => {
  const result = await connectors.handle("mailchimp", "/oauth/callback", {
    code: req.query.code,
    state: req.query.state,
    request: req,
  });
  res.redirect(result.redirect!);
});
```

### Webhooks

Handle incoming webhooks from integrated services:

```typescript
const stripeConnector = Connector.create()
  .withConfig(
    z.object({
      webhookSecret: z.string(),
    }),
  )
  .withWebhook({
    description: "Receive Stripe events",
    schema: z.object({
      type: z.string(),
      data: z.object({ object: z.any() }),
    }),
    handler: async ({ payload, config }) => {
      switch (payload.type) {
        case "payment_intent.succeeded":
          // Handle successful payment
          break;
        case "customer.subscription.deleted":
          // Handle subscription cancellation
          break;
      }
    },
  })
  .build();
```

#### Handle Webhooks

```typescript
app.post("/webhooks/:secret", async (req, res) => {
  const result = await connectors.handle("stripe", "/webhook", {
    secret: req.params.secret,
    request: req,
    body: req.body,
    headers: req.headers,
  });
  res.status(result.status).json(result.body);
});
```

## Telemetry & Observability

Monitor all connector operations with built-in telemetry integration powered by `@igniter-js/telemetry`.

### Setting Up Telemetry

```typescript
import { IgniterConnector, PrismaAdapter } from "@igniter-js/connectors";
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { ConnectorsTelemetryEvents } from "@igniter-js/connectors";

// 1. Create telemetry with redaction
const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .withEnvironment("production")
  .addEvents(ConnectorsTelemetryEvents)
  .withRedaction({
    // REQUIRED: Protect sensitive data
    denylistKeys: [
      "config", // Connector configurations
      "accessToken", // OAuth tokens
      "refreshToken", // OAuth refresh tokens
      "clientSecret", // OAuth client secrets
      "apiKey", // API keys
      "token", // Generic tokens
      "secret", // Secrets
      "password", // Passwords
      "payload", // Webhook payloads
      "input", // Action inputs
      "output", // Action outputs
      "userInfo", // User information
    ],
    // OPTIONAL: Hash identifiers for privacy
    hashKeys: ["ctx.connector.identity"],
  })
  .build();

// 2. Connect telemetry to connectors
const connectors = IgniterConnector.create()
  .withDatabase(PrismaAdapter.create(prisma))
  .withTelemetry(telemetry) // Enable automatic event emission
  .addScope("organization", { required: true })
  .addConnector("telegram", telegramConnector)
  .build();

// 3. Use connectors (telemetry events emitted automatically)
const scoped = connectors.scope("organization", "org_123");
await scoped.connect("telegram", { botToken: "...", chatId: "..." });
// → Emits: igniter.connectors.connector.connected

await scoped.action("telegram", "sendMessage").call({ message: "Hi!" });
// → Emits: igniter.connectors.action.started
// → Emits: igniter.connectors.action.completed
```

### Telemetry Events

The connectors package automatically emits the following events:

#### Connection Lifecycle

- `igniter.connectors.connector.connected` - Connector connected
- `igniter.connectors.connector.disconnected` - Connector disconnected
- `igniter.connectors.connector.enabled` - Connector enabled
- `igniter.connectors.connector.disabled` - Connector disabled
- `igniter.connectors.connector.updated` - Connector config updated

#### OAuth Flows

- `igniter.connectors.oauth.started` - OAuth flow initiated
- `igniter.connectors.oauth.completed` - OAuth flow completed
- `igniter.connectors.oauth.refreshed` - OAuth token refreshed
- `igniter.connectors.oauth.failed` - OAuth flow failed

#### Action Execution

- `igniter.connectors.action.started` - Action started
- `igniter.connectors.action.completed` - Action completed
- `igniter.connectors.action.failed` - Action failed

#### Webhook Handling

- `igniter.connectors.webhook.received` - Webhook received
- `igniter.connectors.webhook.processed` - Webhook processed
- `igniter.connectors.webhook.failed` - Webhook failed

#### Adapter Operations

- `igniter.connectors.adapter.get` - Fetch connector from database
- `igniter.connectors.adapter.list` - List connectors from database
- `igniter.connectors.adapter.upsert` - Create/update connector in database
- `igniter.connectors.adapter.update` - Update connector in database
- `igniter.connectors.adapter.delete` - Delete connector from database

#### Errors

- `igniter.connectors.error.occurred` - General error occurred

### Redaction Rules

**CRITICAL:** When using telemetry, you MUST configure redaction to prevent exposing sensitive data.

#### Automatically Redacted (with recommended config)

- Connector configurations (may contain API keys, tokens)
- OAuth tokens (accessToken, refreshToken, clientSecret)
- Webhook payloads (may contain PII)
- Action inputs/outputs (may contain sensitive data)
- User information from OAuth providers

#### Safe to Expose

- Connector provider keys (e.g., 'telegram', 'slack')
- Action names (e.g., 'sendMessage')
- Scope types (e.g., 'organization')
- Scope identifiers (can be hashed)
- Timestamps and durations
- Success/failure states
- Error codes

#### Example Redaction Config

```typescript
const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .addEvents(ConnectorsTelemetryEvents)
  .withRedaction({
    // Denylist: Fields that will be completely removed
    denylistKeys: [
      "config", // All connector configs
      "accessToken", // OAuth access tokens
      "refreshToken", // OAuth refresh tokens
      "clientSecret", // OAuth client secrets
      "apiKey", // API keys in configs
      "token", // Generic tokens
      "secret", // Any secrets
      "password", // Passwords
      "payload", // Webhook payloads
      "input", // Action inputs
      "output", // Action outputs
      "userInfo", // OAuth user info
    ],
    // Hash: Fields that will be hashed (one-way)
    hashKeys: [
      "ctx.connector.identity", // Scope identifiers (org IDs, user IDs)
    ],
    // Truncate long strings (default: 1000 chars)
    maxStringLength: 1000,
  })
  .build();
```

### Monitoring Best Practices

1. **Always Enable Redaction in Production**

   ```typescript
   .withRedaction({
     denylistKeys: ['config', 'accessToken', 'payload', 'input', 'output'],
   })
   ```

2. **Use Multiple Transports**

   ```typescript
   const telemetry = IgniterTelemetry.create()
     .addTransport("logger", LoggerTransportAdapter.create())
     .addTransport("stream", StoreStreamTransportAdapter.create({ redis }))
     .build();
   ```

3. **Sample High-Volume Events**

   ```typescript
   .withSampling({
     debugRate: 0.1,   // 10% of debug events
     infoRate: 0.5,    // 50% of info events
     warnRate: 1.0,    // 100% of warnings
     errorRate: 1.0,   // 100% of errors (never drop)
   })
   ```

4. **Use Session Scopes for Request Tracing**
   ```typescript
   app.use(async (req, res, next) => {
     await telemetry.session().run(async () => {
       // All connector events in this scope share the same sessionId
       const scoped = connectors.scope("organization", req.user.orgId);
       await scoped.action("telegram", "sendMessage").call({ message: "Hi" });
       next();
     });
   });
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
import { PrismaAdapter } from "@igniter-js/connectors";
import { prisma } from "./prisma";

const adapter = PrismaAdapter.create(prisma);

// Or with custom model name
const adapter = PrismaAdapter.create(prisma, { model: "Integration" });
```

### Custom Adapters

Implement the `IgniterConnectorAdapter` interface:

```typescript
import { IgniterConnectorBaseAdapter } from "@igniter-js/connectors";
import type {
  IgniterConnectorRecord,
  IgniterConnectorUpdateData,
} from "@igniter-js/connectors";

class CustomAdapter extends IgniterConnectorBaseAdapter {
  async get(
    scope: string,
    identity: string,
    provider: string,
  ): Promise<IgniterConnectorRecord | null> {
    // Implementation
  }

  async list(
    scope: string,
    identity: string,
  ): Promise<IgniterConnectorRecord[]> {
    // Implementation
  }

  async upsert(
    scope: string,
    identity: string,
    provider: string,
    data: IgniterConnectorUpdateData,
  ): Promise<IgniterConnectorRecord> {
    // Implementation
  }

  async update(
    scope: string,
    identity: string,
    provider: string,
    data: IgniterConnectorUpdateData,
  ): Promise<IgniterConnectorRecord> {
    // Implementation
  }

  async delete(
    scope: string,
    identity: string,
    provider: string,
  ): Promise<void> {
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
      case "connected":
        console.log(`${event.connector} connected`);
        break;
      case "disconnected":
        console.log(`${event.connector} disconnected`);
        break;
      case "action":
        console.log(`${event.action} executed on ${event.connector}`);
        break;
      case "oauth:completed":
        console.log(`OAuth completed for ${event.connector}`);
        break;
      case "webhook:received":
        console.log(`Webhook received for ${event.connector}`);
        break;
      case "error":
        console.error(`Error in ${event.connector}:`, event.error);
        break;
    }
  })
  .build();

// Or subscribe on scoped instance
const scoped = connectors.scope("organization", "org_123");
const unsubscribe = scoped.subscribe((event) => {
  console.log("Event:", event);
});

// Unsubscribe later
unsubscribe();
```

## Lifecycle Hooks

Add hooks for connector operations:

```typescript
const connectors = IgniterConnector.create()
  .withDatabase(adapter)
  .onConnect(async ({ connector, scope, identity, config }) => {
    // Called after successful connection
    await analytics.track("connector_connected", {
      connector,
      scope,
      identity,
    });
  })
  .onDisconnect(async ({ connector, scope, identity }) => {
    // Called after disconnection
    await analytics.track("connector_disconnected", {
      connector,
      scope,
      identity,
    });
  })
  .onError(async ({ error, connector, scope, action }) => {
    // Called on any error
    await errorTracker.capture(error, {
      connector,
      scope,
      action,
    });
  })
  .build();
```

## API Reference

### `Connector.create()`

Creates a new connector builder.

| Method                         | Description                                |
| ------------------------------ | ------------------------------------------ |
| `.withConfig(schema)`          | Set configuration schema                   |
| `.withMetadata(schema, value)` | Set metadata schema and value              |
| `.withDefaultConfig(config)`   | Set default config (for system connectors) |
| `.withOAuth(options)`          | Configure OAuth 2.0                        |
| `.withWebhook(options)`        | Configure webhook handling                 |
| `.onContext(hook)`             | Add context enrichment hook                |
| `.onValidate(hook)`            | Add validation hook                        |
| `.addAction(key, options)`     | Add an action                              |
| `.build()`                     | Build the connector definition             |

### `IgniterConnector.create()`

Creates a new connector manager builder.

| Method                                 | Description                     |
| -------------------------------------- | ------------------------------- |
| `.withDatabase(adapter)`               | Set database adapter            |
| `.withLogger(logger)`                  | Set logger instance             |
| `.withEncrypt(fields)`                 | Set fields to encrypt           |
| `.withCustomEncrypt(encrypt, decrypt)` | Set custom encryption functions |
| `.addScope(key, options)`              | Add a scope definition          |
| `.addConnector(key, connector)`        | Add a connector                 |
| `.onConnect(hook)`                     | Add connection hook             |
| `.onDisconnect(hook)`                  | Add disconnection hook          |
| `.onError(hook)`                       | Add error hook                  |
| `.onEvent(handler)`                    | Add global event handler        |
| `.build()`                             | Build the manager instance      |

### `IgniterConnectorScoped`

Scoped connector instance returned by `connectors.scope()`.

| Method                           | Description                   |
| -------------------------------- | ----------------------------- |
| `.list(options?)`                | List all connected connectors |
| `.get(key)`                      | Get a specific connector      |
| `.connect(key, config)`          | Connect a connector           |
| `.update(key, config)`           | Update connector config       |
| `.enable(key)` / `.disable(key)` | Toggle connector state        |
| `.disconnect(key)`               | Disconnect a connector        |
| `.action(key, action)`           | Get action builder            |
| `.subscribe(handler)`            | Subscribe to events           |

## Type Inference

The library provides full type inference:

```typescript
// Extract connector keys
type ConnectorKey = $InferConnectorKey<typeof connectors>;
// => 'telegram' | 'slack' | 'mailchimp'

// Extract scope keys
type ScopeKey = $InferScopeKey<typeof connectors>;
// => 'organization' | 'user' | 'system'

// Extract scoped type
type Scoped = $InferScoped<typeof connectors>;

// Extract config type for a connector
type TelegramConfig = $InferConfig<typeof telegramConnector>;
// => { botToken: string; chatId: string }

// Extract action keys
type TelegramActions = $InferActionKeys<typeof telegramConnector>;
// => 'sendMessage'
```

## Error Handling

All errors are thrown as `IgniterConnectorError` with stable codes:

```typescript
import {
  IgniterConnectorError,
  IGNITER_CONNECTOR_ERROR_CODES,
} from "@igniter-js/connectors";

try {
  await scoped.action("telegram", "sendMessage").call({ message: "" });
} catch (error) {
  if (error instanceof IgniterConnectorError) {
    switch (error.code) {
      case IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_NOT_CONNECTED:
        // Connector is not connected
        break;
      case IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ACTION_INPUT_INVALID:
        // Invalid action input
        break;
      case IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ACTION_FAILED:
        // Action execution failed
        break;
    }
  }
}
```

## Environment Variables

| Variable         | Description                            |
| ---------------- | -------------------------------------- |
| `IGNITER_SECRET` | Required for encryption (min 32 chars) |

## License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro)
