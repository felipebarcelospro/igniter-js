# @igniter-js/telemetry

A type-safe, session-based telemetry system for Igniter.js with generic envelope, typed events registry, and multi-transport support.

## Features

- 📊 **Generic Envelope** - Standardized event structure for logs, traces, errors, and domain events
- 🎯 **Type-Safe Events** - Full TypeScript inference with typed event registry
- 🔄 **Session Management** - Three DX modes with AsyncLocalStorage for request isolation
- 🚚 **Multi-Transport** - Pluggable transport adapters (logger, store streams, etc.)
- 🔒 **Redaction Pipeline** - PII/sensitive data protection
- 📉 **Sampling** - Configurable sampling rates per log level
- ✅ **Schema Validation** - Optional Zod schema validation for payloads
- 🏗️ ** API** - Fluent, type-accumulating configuration

## Installation

```bash
npm install @igniter-js/telemetry
# or
pnpm add @igniter-js/telemetry
# or
yarn add @igniter-js/telemetry
# or
bun add @igniter-js/telemetry
```

## Quick Start

```typescript
import { IgniterTelemetry, LoggerTransportAdapter } from '@igniter-js/telemetry'

// Create the telemetry instance
const telemetry = IgniterTelemetry.create()
  .withService('my-api')
  .withEnvironment(process.env.NODE_ENV ?? 'development')
  .addTransport('logger', LoggerTransportAdapter.create())
  .build()

// Emit events
telemetry.emit('app.started', { port: 3000 })
```

## API Reference

### Configuration

```typescript
import { IgniterTelemetry, LoggerTransportAdapter } from '@igniter-js/telemetry'

const telemetry = IgniterTelemetry.create()
  // Required: Service name (identifies your application)
  .withService('my-api')
  
  // Optional: Environment (default: 'development')
  .withEnvironment('production')
  
  // Required: At least one transport adapter
  .addTransport('logger', LoggerTransportAdapter.create())
  
  // Optional: Typed event groups (see Event Registry section)
  .addEventGroup(myEventGroup)
  
  // Optional: Redaction policy for sensitive data
  .withRedaction({
    enabled: true,
    fields: ['password', 'token', 'secret', 'apiKey'],
    patterns: [/credit_card/i],
    replacement: '[REDACTED]',
  })
  
  // Optional: Sampling rates per log level (0.0 to 1.0)
  .withSampling({
    debugRate: 0.1,   // 10% of debug events
    infoRate: 0.5,    // 50% of info events
    warnRate: 1.0,    // 100% of warnings
    errorRate: 1.0,   // 100% of errors
  })
  
  // Optional: Schema validation mode
  .withValidation({
    mode: 'development',  // 'always' | 'development' | 'never'
  })
  
  .build()
```

### Emitting Events

```typescript
// Basic emit with auto-generated sessionId
telemetry.emit('user.login', {
  userId: 'user_123',
  method: 'password',
})

// Emit with explicit level
telemetry.emit('payment.failed', {
  orderId: 'order_456',
  reason: 'insufficient_funds',
}, {
  level: 'error',
})

// Emit with metadata
telemetry.emit('api.request', {
  method: 'GET',
  path: '/users',
}, {
  level: 'info',
  metadata: {
    traceId: 'trace_789',
    spanId: 'span_abc',
  },
})
```

### Session Management

The telemetry provides three modes for session context:

#### Mode 1: Direct Emit (Implicit Session)

```typescript
// Each emit gets its own sessionId
telemetry.emit('event.one', { data: 'value' })
telemetry.emit('event.two', { data: 'value' })
// These events have different sessionIds
```

#### Mode 2: Manual Session Handle

```typescript
// Create a session and use it explicitly
const session = telemetry.session()

session.emit('event.one', { data: 'value' })
session.emit('event.two', { data: 'value' })
// These events share the same sessionId
```

#### Mode 3: Scoped Execution (Recommended)

```typescript
// Run code within a session scope
await telemetry.session().run(async () => {
  // All emits in this scope share the same sessionId
  telemetry.emit('request.started', { path: '/api/users' })
  
  const users = await fetchUsers()
  
  telemetry.emit('request.completed', { 
    path: '/api/users',
    count: users.length,
  })
})
```

### Typed Event Registry

Use `IgniterTelemetryEvents` to define type-safe event schemas with full TypeScript inference:

```typescript
import { IgniterTelemetryEvents } from '@igniter-js/telemetry'
import { z } from 'zod'

// Define your event schemas
const authEvents = IgniterTelemetryEvents.create()
  .group('auth')
  .event('login.started', z.object({
    email: z.string(),
    method: z.enum(['password', 'oauth', 'magic_link']),
  }))
  .event('login.succeeded', z.object({
    userId: z.string(),
    sessionId: z.string(),
  }))
  .event('login.failed', z.object({
    email: z.string(),
    reason: z.string(),
  }))
  .build()

// Register with telemetry
const telemetry = IgniterTelemetry.create()
  .withService('my-api')
  .addEventGroup(authEvents)
  .addTransport('logger', LoggerTransportAdapter.create())
  .build()

// TypeScript infers valid event names
telemetry.emit('auth.login.started', {
  email: 'user@example.com',
  method: 'password',
})  // ✅ Valid

telemetry.emit('auth.invalid', {})  // ❌ Type error
```

### Transport Adapters

#### Logger Transport

Logs events to the console with formatting:

```typescript
import { LoggerTransportAdapter } from '@igniter-js/telemetry'

const loggerTransport = LoggerTransportAdapter.create({
  pretty: true,  // Enable pretty printing (default: false)
})
```

#### Store Stream Transport

Sends events to an IgniterStore stream:

```typescript
import { StoreStreamTransportAdapter } from '@igniter-js/telemetry'
import { IgniterStore } from '@igniter-js/store'
import { redis } from ''

const storeTransport = StoreStreamTransportAdapter.create({
  redis,
  streamKey: 'telemetry:events',
  maxLen: 10000,  // Optional: trim stream to max entries
})
```

#### Custom Transport

Implement the `TelemetryTransportAdapter` interface:

```typescript
import type { TelemetryTransportAdapter, TelemetryEnvelope } from '@igniter-js/telemetry'

class MyCustomTransport implements TelemetryTransportAdapter {
  async handle(envelope: TelemetryEnvelope): Promise<void> {
    // Send to your custom destination
    await sendToDatadog(envelope)
  }
  
  async init(): Promise<void> {
    // Optional: Initialize connection
  }
  
  async flush(): Promise<void> {
    // Optional: Flush buffered events
  }
  
  async shutdown(): Promise<void> {
    // Optional: Clean up resources
  }
}
```

### Redaction

Protect sensitive data in event payloads:

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('my-api')
  .withRedaction({
    enabled: true,
    // Field names to redact (case-insensitive, deep)
    fields: ['password', 'token', 'secret', 'apiKey', 'creditCard'],
    // Regex patterns to match field names
    patterns: [/auth.*token/i, /api[-_]?key/i],
    // Replacement string (default: '[REDACTED]')
    replacement: '***',
  })
  .addTransport('logger', LoggerTransportAdapter.create())
  .build()

// Sensitive data is automatically redacted
telemetry.emit('user.register', {
  email: 'user@example.com',
  password: 'supersecret',  // Will appear as '***' in logs
})
```

### Sampling

Configure sampling rates to reduce telemetry volume:

```typescript
const telemetry = IgniterTelemetry.create()
  .withService('my-api')
  .withSampling({
    debugRate: 0.01,  // 1% of debug events
    infoRate: 0.1,    // 10% of info events
    warnRate: 0.5,    // 50% of warnings
    errorRate: 1.0,   // 100% of errors (never drop errors)
  })
  .addTransport('logger', LoggerTransportAdapter.create())
  .build()
```

### Lifecycle Methods

```typescript
// Flush all buffered events to transports
await telemetry.flush()

// Graceful shutdown (flush + cleanup)
await telemetry.shutdown()
```

## Envelope Structure

All emitted events follow this envelope structure:

```typescript
interface TelemetryEnvelope<T = unknown> {
  eventName: string           // Event name (e.g., 'auth.login.succeeded')
  timestamp: string           // ISO 8601 timestamp
  level: TelemetryLevel       // 'debug' | 'info' | 'warn' | 'error'
  sessionId: string           // Session identifier
  service: string             // Service name from config
  environment: string         // Environment from config
  payload: T                  // Event-specific data
  metadata?: Record<string, unknown>  // Optional extra context
}
```

## Error Handling

The package uses typed errors extending `IgniterTelemetryError`:

```typescript
import { IgniterTelemetryError, TelemetryErrorCode } from '@igniter-js/telemetry'

try {
  // ... telemetry operations
} catch (error) {
  if (error instanceof IgniterTelemetryError) {
    switch (error.code) {
      case TelemetryErrorCode.SERVICE_REQUIRED:
        // Handle missing service
        break
      case TelemetryErrorCode.TRANSPORT_EXISTS:
        // Handle duplicate transport
        break
      case TelemetryErrorCode.VALIDATION_ERROR:
        // Handle schema validation failure
        break
    }
  }
}
```

## Best Practices

### 1. Use Scoped Sessions for Request Handlers

```typescript
app.use(async (req, res, next) => {
  await telemetry.session().run(async () => {
    telemetry.emit('http.request.started', {
      method: req.method,
      path: req.path,
    })
    
    await next()
    
    telemetry.emit('http.request.completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
    })
  })
})
```

### 2. Define Event Schemas for Type Safety

```typescript
// events/auth.ts
export const authEvents = IgniterTelemetryEvents.create()
  .group('auth')
  .event('login', LoginPayloadSchema)
  .event('logout', LogoutPayloadSchema)
  .build()

// telemetry.ts
const telemetry = IgniterTelemetry.create()
  .addEventGroup(authEvents)
  // ...
```

### 3. Enable Redaction in Production

```typescript
const telemetry = IgniterTelemetry.create()
  .withRedaction({
    enabled: process.env.NODE_ENV === 'production',
    fields: ['password', 'token', 'secret'],
  })
  // ...
```

### 4. Use Multiple Transports

```typescript
const telemetry = IgniterTelemetry.create()
  .addTransport('logger', LoggerTransportAdapter.create())
  .addTransport('store', StoreStreamTransportAdapter.create({ store }))
  // ...
```

### 5. Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await telemetry.shutdown()
  process.exit(0)
})
```

## TypeScript Support

This package is written in TypeScript and provides full type definitions. The  API uses type accumulation to provide type-safe event names based on registered event groups.

## License

MIT
