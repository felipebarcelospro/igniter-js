# AGENTS.md - @igniter-js/telemetry

> **Last Updated:** 2025-01-15
> **Version:** 0.1.0

---

## 1. Package Overview

**Name:** `@igniter-js/telemetry`  
**Purpose:** Type-safe, session-based telemetry system with generic envelope, typed events registry, and multi-transport support.  
**Status:** Active Development

### Core Responsibilities
- Generic telemetry envelope emission (logs, traces, errors, domain events)
- Session-based context management with AsyncLocalStorage
- Typed event registry with nested groups
- Multi-transport system with "one per type" validation
- Redaction pipeline for PII/sensitive data
- Sampling support for high-volume environments
- Schema validation for type-safe event payloads

---

## 2. Architecture

### Directory Structure

```
packages/telemetry/
├── src/
│   ├── adapters/
│   │   ├── logger.adapter.ts        # Console logger transport
│   │   ├── store.adapter.ts         # Store stream transport
│   │   └── index.ts                 # Adapter exports
│   ├── builders/
│   │   ├── igniter-telemetry.builder.ts      # Fluent builder with type accumulation
│   │   ├── igniter-telemetry.builder.spec.ts # Builder tests
│   │   └── index.ts
│   ├── core/
│   │   ├── igniter-telemetry.ts     # Main telemetry runtime
│   │   ├── igniter-telemetry.spec.ts# Core tests
│   │   └── index.ts
│   ├── errors/
│   │   ├── igniter-telemetry.error.ts # Error definitions
│   │   ├── igniter-telemetry.error.spec.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── adapter.ts               # Transport adapter interface
│   │   ├── config.ts                # Configuration types
│   │   ├── emit.ts                  # Emit input/options types
│   │   ├── envelope.ts              # Envelope structure types
│   │   ├── events.ts                # Event schema types
│   │   ├── levels.ts                # Telemetry level definitions
│   │   ├── policies.ts              # Redaction/sampling policies
│   │   ├── registry.ts              # Events registry types
│   │   ├── session.ts               # Session handle types
│   │   └── index.ts
│   ├── utils/
│   │   ├── redact.ts                # Redaction utility
│   │   ├── redact.spec.ts
│   │   ├── sample.ts                # Sampling utility
│   │   ├── sample.spec.ts
│   │   ├── schema.ts                # IgniterTelemetryEvents builder
│   │   ├── schema.spec.ts
│   │   └── index.ts
│   └── index.ts                     # Main entry point
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
└── AGENTS.md
```

### Core Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `IgniterTelemetryRuntime` | `core/igniter-telemetry.ts` | Main runtime with emit, session, flush, shutdown |
| `IgniterTelemetryBuilder` | `builders/igniter-telemetry.builder.ts` | Fluent builder with type accumulation |
| `LoggerTransportAdapter` | `adapters/logger.adapter.ts` | Console logger transport |
| `StoreStreamTransportAdapter` | `adapters/store.adapter.ts` | IgniterStore stream transport |
| `IgniterTelemetryEvents` | `utils/schema.ts` | Typed event registry builder |
| `IgniterTelemetryError` | `errors/igniter-telemetry.error.ts` | Typed error handling |

---

## 3. Key Design Patterns

### 3.1 Builder API Pattern with Type Accumulation

The telemetry uses an immutable fluent builder with TypeScript type accumulation:

```typescript
// Each method returns a new builder instance with accumulated types
const telemetry = IgniterTelemetryBuilder.create()
  .withService('my-api')
  .withEnvironment('production')
  .addEventGroup(coreEvents)          // TRegistry accumulates event schemas
  .addEventGroup(authEvents)          // TRegistry grows with each group
  .addTransport('logger', loggerAdapter)
  .withRedaction({
    enabled: true,
    fields: ['password', 'token', 'secret'],
  })
  .withSampling({
    debugRate: 0.1,   // 10% of debug events
    infoRate: 0.5,    // 50% of info events
    warnRate: 1.0,    // 100% of warnings
    errorRate: 1.0,   // 100% of errors
  })
  .withValidation({ mode: 'development' })  // Validate schemas in dev
  .build()

// TypeScript enforces valid event names
telemetry.emit('core.request.started', payload)  // ✅ Valid
telemetry.emit('invalid.event', payload)          // ❌ Type error
```

### 3.2 Session System (3 DX Modes)

The telemetry provides three ways to manage session context:

```typescript
// Mode 1: Direct active session (implicit current session)
telemetry.emit('event.name', { data: 'value' })

// Mode 2: Manual session handle
const session = telemetry.session()
session.emit('event.name', { data: 'value' })

// Mode 3: Scoped execution (recommended for request handlers)
await telemetry.session().run(async () => {
  // All emits in this scope share the same sessionId
  telemetry.emit('event.start', {})
  await doWork()
  telemetry.emit('event.end', {})
})
```

### 3.3 Generic Telemetry Envelope

All emitted events follow a generic envelope structure:

```typescript
interface TelemetryEnvelope<T = unknown> {
  eventName: string           // e.g., 'core.request.started'
  timestamp: string           // ISO 8601 timestamp
  level: TelemetryLevel       // 'debug' | 'info' | 'warn' | 'error'
  sessionId: string           // Auto-generated or explicit
  service: string             // From builder config
  environment: string         // From builder config
  payload: T                  // Event-specific data
  metadata?: Record<string, unknown>  // Optional extra context
}
```

### 3.4 Transport Adapter Interface

Transports implement a simple interface:

```typescript
interface TelemetryTransportAdapter {
  handle(envelope: TelemetryEnvelope): void | Promise<void>
  init?(): void | Promise<void>
  flush?(): void | Promise<void>
  shutdown?(): void | Promise<void>
}
```

### 3.5 Typed Event Registry

Use `IgniterTelemetryEvents` to define type-safe event schemas:

```typescript
import { IgniterTelemetryEvents } from '@igniter-js/telemetry'
import { z } from 'zod'

const coreEvents = IgniterTelemetryEvents.create()
  .group('core')
  .event('request.started', z.object({
    method: z.string(),
    path: z.string(),
  }))
  .event('request.completed', z.object({
    method: z.string(),
    path: z.string(),
    statusCode: z.number(),
    durationMs: z.number(),
  }))
  .build()
```

---

## 4. Key Types

### TelemetryLevel

```typescript
type TelemetryLevel = 'debug' | 'info' | 'warn' | 'error'
```

### TelemetryConfig

```typescript
interface TelemetryConfig<TRegistry, TScopes, TActors> {
  service: string
  environment: string
  transports: Map<string, TelemetryTransportAdapter>
  registry?: TRegistry
  redaction?: RedactionPolicy
  sampling?: SamplingPolicy
  validation?: ValidationConfig
}
```

### RedactionPolicy

```typescript
interface RedactionPolicy {
  enabled: boolean
  fields?: string[]
  patterns?: RegExp[]
  replacement?: string  // Default: '[REDACTED]'
}
```

### SamplingPolicy

```typescript
interface SamplingPolicy {
  debugRate: number    // 0.0 to 1.0
  infoRate: number     // 0.0 to 1.0
  warnRate: number     // 0.0 to 1.0
  errorRate: number    // 0.0 to 1.0
}
```

---

## 5. Error Codes

| Code | Description |
|------|-------------|
| `TELEMETRY_SERVICE_REQUIRED` | Service name not provided to builder |
| `TELEMETRY_TRANSPORT_EXISTS` | Transport type already registered |
| `TELEMETRY_ADAPTER_ERROR` | Error in transport adapter |
| `TELEMETRY_VALIDATION_ERROR` | Schema validation failed |
| `TELEMETRY_SESSION_NOT_ACTIVE` | No active session for emit |
| `TELEMETRY_RUNTIME_NOT_INITIALIZED` | Runtime factory not initialized |

---

## 6. Development Guidelines

### Adding New Transport Adapters

1. Create new file in `src/adapters/`
2. Implement `TelemetryTransportAdapter` interface
3. Export from `src/adapters/index.ts`
4. Add tests in `*.spec.ts` file
5. Document in README.md

### Adding New Event Groups

1. Use `IgniterTelemetryEvents.create()` builder
2. Define Zod schemas for payloads
3. Register with `.addEventGroup()` in telemetry builder
4. TypeScript will infer event names automatically

### Testing Guidelines

- Use `vi.fn()` for transport mocks
- Test all three session modes
- Verify envelope structure in tests
- Test redaction with sensitive data
- Test sampling rates statistically

---

## 7. Dependencies

### Required
- `zod` - Schema validation

### Development
- `vitest` - Testing framework
- `tsup` - Build tool
- `typescript` - Type system

---

## 8. Build & Test Commands

```bash
# Build package
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Run tests in watch mode
npm run test:watch
```

---

## 9. Version History

### 0.1.0 (2025-01-15)
- Initial implementation
- Builder API with type accumulation
- Session system with AsyncLocalStorage
- Logger and Store transport adapters
- Redaction and sampling utilities
- Typed event registry with IgniterTelemetryEvents
- Full test suite

---

## 10. Related Packages

- `@igniter-js/core` - HTTP framework core
- `@igniter-js/store` - Distributed store (for StoreStreamTransportAdapter)
- `@igniter-js/bot` - Bot framework (can emit telemetry events)
