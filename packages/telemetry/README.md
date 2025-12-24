# @igniter-js/telemetry

A type-safe, session-based telemetry system for Igniter.js with generic envelope, typed events registry, and multi-transport support.

## Features

- 📊 **Generic Envelope** - Standardized event structure for logs, traces, errors, and domain events
- 🎯 **Type-Safe Events** - Full TypeScript inference with typed event registry
- 🔄 **Session Management** - Three DX modes with AsyncLocalStorage for request isolation
- 🚚 **Multi-Transport** - Pluggable transport adapters (Sentry, OTLP, Slack, Discord, etc.)
- 🔒 **Redaction Pipeline** - PII/sensitive data protection
- 📉 **Sampling** - Configurable sampling rates per log level
- ✅ **Schema Validation** - Optional Zod schema validation for payloads
- 🏗️ **Fluent API** - Fluent, type-accumulating configuration

## Installation

```bash
npm install @igniter-js/telemetry
# or
pnpm add @igniter-js/telemetry
```

## Quick Start

```typescript
import {
  IgniterTelemetry,
  LoggerTransportAdapter,
} from "@igniter-js/telemetry";

// Create the telemetry instance
const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .withEnvironment(process.env.NODE_ENV ?? "development")
  .addTransport("logger", LoggerTransportAdapter.create({ format: "pretty" }))
  .build();

// Emit events
telemetry.emit("app.started", { attributes: { port: 3000 } });
```

## Transport Adapters

The library comes with several built-in transport adapters. You can use multiple transports simultaneously.

### 1. Console Logger (Default)

Useful for development and debugging.

```typescript
import { LoggerTransportAdapter } from "@igniter-js/telemetry";

const logger = LoggerTransportAdapter.create({
  format: "pretty", // 'pretty' | 'json'
  minLevel: "debug",
});
```

### 2. Sentry (Error Monitoring)

Captures errors and adds breadcrumbs for other events.

```typescript
import * as Sentry from "@sentry/node";
import { SentryTransportAdapter } from "@igniter-js/telemetry";

// Initialize Sentry as usual
Sentry.init({ dsn: "..." });

const sentryTransport = SentryTransportAdapter.create({
  sentry: Sentry,
});
```

### 3. OpenTelemetry (OTLP)

Sends events to OTLP-compatible collectors (Jaeger, Honeycomb, Datadog, etc.) via HTTP/JSON.

```typescript
import { OtlpTransportAdapter } from "@igniter-js/telemetry";

const otlp = OtlpTransportAdapter.create({
  // URL for OTLP Logs ingestion
  url: "http://localhost:4318/v1/logs",
  headers: {
    "x-api-key": process.env.OTEL_API_KEY,
  },
});
```

### 4. Slack / Discord / Telegram (Notifications)

Great for alerting on critical errors or business events.

```typescript
import {
  SlackTransportAdapter,
  DiscordTransportAdapter,
  TelegramTransportAdapter,
} from "@igniter-js/telemetry";

// Slack
const slack = SlackTransportAdapter.create({
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  minLevel: "error", // Only send errors
  username: "My Bot",
});

// Discord
const discord = DiscordTransportAdapter.create({
  webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  minLevel: "warn",
});

// Telegram
const telegram = TelegramTransportAdapter.create({
  botToken: process.env.TELEGRAM_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
});
```

### 5. File System

Writes events to a local file (NDJSON format).

```typescript
import { FileTransportAdapter } from "@igniter-js/telemetry";

const file = FileTransportAdapter.create({
  path: "./logs/telemetry.log",
});
```

### 6. Generic HTTP

Sends events to any HTTP endpoint (e.g., Zapier, n8n, custom backend).

```typescript
import { HttpTransportAdapter } from "@igniter-js/telemetry";

const http = HttpTransportAdapter.create({
  url: "https://webhook.site/...",
  headers: { Authorization: "Bearer ..." },
  timeout: 5000,
});
```

### 7. In-Memory (Testing)

Stores events in an array. Useful for unit tests.

```typescript
import { InMemoryTransportAdapter } from "@igniter-js/telemetry";

const memory = InMemoryTransportAdapter.create();

// Access events later
const events = memory.getEvents();
```

## Advanced Usage

### Full Configuration Example

```typescript
const telemetry = IgniterTelemetry.create()
  .withService("payment-service")
  .withEnvironment("production")
  // 1. Log everything to console in JSON
  .addTransport("console", LoggerTransportAdapter.create({ format: "json" }))
  // 2. Send errors to Sentry
  .addTransport("sentry", SentryTransportAdapter.create({ sentry: Sentry }))
  // 3. Alert critical failures to Slack
  .addTransport(
    "slack",
    SlackTransportAdapter.create({
      webhookUrl: process.env.SLACK_URL,
      minLevel: "error",
    }),
  )
  // 4. Archive all events to OTLP collector
  .addTransport(
    "otlp",
    OtlpTransportAdapter.create({
      url: "http://otel-collector:4318/v1/logs",
    }),
  )
  .build();
```

### Redaction

Protect sensitive data in event payloads.

```typescript
const telemetry = IgniterTelemetry.create()
  .withRedaction({
    enabled: true,
    // Field names to redact (case-insensitive, deep)
    fields: ["password", "token", "secret", "apiKey", "creditCard"],
    // Regex patterns to match field names
    patterns: [/auth.*token/i, /api[-_]?key/i],
    // Replacement string (default: '[REDACTED]')
    replacement: "***",
  })
  .build();
```

## Session Management

The telemetry provides three modes for session context:

### Mode 1: Direct Emit (Implicit Session)

```typescript
// Each emit gets its own sessionId
telemetry.emit("event.one", { attributes: { data: "value" } });
```

### Mode 2: Manual Session Handle

```typescript
// Create a session and use it explicitly
const session = telemetry.session();
session.actor("user", "usr_123");

session.emit("event.one", { attributes: { data: "value" } });
// These events share the same sessionId and actor
```

### Mode 3: Scoped Execution (Recommended)

```typescript
// Run code within a session scope
await telemetry.session().run(async () => {
  // All emits in this scope share the same sessionId
  telemetry.emit("request.started", { attributes: { path: "/api/users" } });

  await next();
});
```

## Envelope Structure

All emitted events follow this envelope structure:

```typescript
interface TelemetryEnvelope<T = unknown> {
  name: string; // Event name (e.g., 'auth.login.succeeded')
  time: string; // ISO 8601 timestamp
  level: TelemetryLevel; // 'debug' | 'info' | 'warn' | 'error'
  sessionId: string; // Session identifier
  service: string; // Service name from config
  environment: string; // Environment from config
  traceId?: string; // Distributed tracing ID
  spanId?: string; // Span ID
  actor?: { type: string; id?: string; tags?: Record<string, any> };
  scope?: { type: string; id: string; tags?: Record<string, any> };
  attributes?: T; // Event-specific data
  error?: TelemetryError; // Error details
}
```

## License

MIT
