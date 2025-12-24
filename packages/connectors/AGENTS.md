# @igniter-js/connectors - AI Agent Instructions

> **Package Version:** 0.1.0  
> **Last Updated:** 2025-01-16  
> **Status:** Ready for Publication with Telemetry Integration

---

## Package Overview

**Name:** `@igniter-js/connectors`  
**Purpose:** Type-safe, multi-tenant connector management library for Igniter.js  
**Type:** Core Library (used with Igniter.js for third-party integrations)

### Core Features

- Type-safe connector definitions with Zod schema validation
- Multi-tenant scopes (organization, user, system)
- OAuth 2.0 Universal with PKCE support
- AES-256-GCM encryption for sensitive fields
- Webhook handling with signature verification
- Prisma adapter for database operations
- Builder pattern for fluent configuration
- Event system for lifecycle monitoring
- **Telemetry integration** for observability and monitoring

---

## Architecture

### Design Principles

1. **Type Safety First**
   - End-to-end TypeScript inference from config to action outputs
   - Connector definitions carry full type information
   - No `any` types in public APIs

2. **Multi-Tenant by Design**
   - Scopes isolate connector data per tenant
   - Required vs optional scope identifiers
   - Flexible scope naming (organization, user, project, etc.)

3. **Adapter-Based Architecture**
   - Core defines interfaces, adapters provide implementations
   - PrismaAdapter is the default production adapter
   - Easy to implement custom adapters

4. **Security Built-In**
   - Field-level encryption for sensitive data
   - OAuth state verification with PKCE
   - Webhook signature validation

5. **Builder Pattern**
   - Fluent API for defining connectors and managers
   - Compile-time validation of configuration
   - Progressive type narrowing

---

## File Structure

```
packages/connectors/
├── src/
│   ├── index.ts                              # Public exports
│   │
│   ├── telemetry/
│   │   ├── connectors.telemetry.ts           # Telemetry event definitions
│   │   └── index.ts                          # Telemetry exports
│   │
│   ├── core/
│   │   ├── igniter-connector.ts              # Main manager runtime
│   │   ├── igniter-connector-scoped.ts       # Scoped instance logic
│   │   └── igniter-connector-oauth.ts        # OAuth flow handler
│   │
│   ├── builders/
│   │   ├── connector.builder.ts              # Connector definition builder
│   │   ├── igniter-connector.builder.ts      # Manager builder
│   │   └── index.ts                          # Builder exports
│   │
│   ├── adapters/
│   │   ├── igniter-connector.adapter.ts      # Base adapter class
│   │   ├── prisma.adapter.ts                 # Prisma ORM adapter
│   │   └── index.ts                          # Adapter exports
│   │
│   ├── errors/
│   │   ├── igniter-connector.error.ts        # Error class and codes
│   │   └── index.ts                          # Error exports
│   │
│   ├── types/
│   │   ├── adapter.ts                        # Adapter interface types
│   │   ├── config.ts                         # Configuration types
│   │   ├── connector.ts                      # Connector definition types
│   │   ├── events.ts                         # Event types
│   │   ├── hooks.ts                          # Hook types
│   │   ├── infer.ts                          # Type inference helpers
│   │   ├── oauth.ts                          # OAuth types
│   │   ├── scope.ts                          # Scope types
│   │   ├── webhook.ts                        # Webhook types
│   │   └── index.ts                          # Type exports
│   │
│   └── utils/
│       ├── igniter-connector-crypto.ts       # Encryption utilities
│       ├── igniter-connector-fields.ts       # Field extraction utilities
│       ├── igniter-connector-oauth.ts        # OAuth utility functions
│       ├── igniter-connector-schema.ts       # Schema validation utilities
│       ├── igniter-connector-url.ts          # URL building utilities
│       └── index.ts                          # Utility exports
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── AGENTS.md                                  # This file
└── CHANGELOG.md
```

---

## Key Components

### `IgniterConnector` (Core Manager)

The main class that orchestrates:

- Database operations via adapter
- Scope management and scoped instance creation
- Connector registration and lookup
- OAuth flow handling
- Webhook routing
- Event emission
- Configuration encryption/decryption

**Key Methods:**

- `scope(type, identity)` - Get scoped instance
- `handle(connector, path, params)` - Handle OAuth/webhook routes
- `getConnector(key)` - Get connector definition
- `getAdapter()` - Get database adapter
- `encryptConfig(config)` / `decryptConfig(config)` - Encrypt/decrypt values

### `IgniterConnectorScoped` (Scoped Instance)

Provides scoped access to connectors:

- `list()` - List all connected connectors
- `get(key)` - Get specific connector
- `connect(key, config)` - Connect with config
- `update(key, config)` - Update config
- `enable(key)` / `disable(key)` - Toggle state
- `disconnect(key)` - Remove connection
- `action(key, action).call(input)` - Execute action
- `subscribe(handler)` - Subscribe to events

### `Connector` (Builder)

Fluent API for defining connectors:

- `withConfig(schema)` - Set config schema
- `withMetadata(schema, value)` - Set metadata
- `withDefaultConfig(config)` - Set defaults
- `withOAuth(options)` - Configure OAuth
- `withWebhook(options)` - Configure webhooks
- `onContext(hook)` - Add context hook
- `onValidate(hook)` - Add validation hook
- `addAction(key, options)` - Add action
- `build()` - Build definition

### `PrismaAdapter` (Database)

Prisma-based database adapter:

- `get(scope, identity, provider)` - Get record
- `list(scope, identity)` - List records
- `upsert(scope, identity, provider, data)` - Create/update
- `update(scope, identity, provider, data)` - Update only
- `delete(scope, identity, provider)` - Delete record

---

## Development Guidelines

### Adding New Features

1. **Connector Logic → Builder**
   - New connector capabilities go in `ConnectorBuilder`
   - Examples: new OAuth modes, custom validation

2. **Manager Logic → Core**
   - Business logic belongs in `IgniterConnector`
   - Examples: new routing, event handling

3. **Database Logic → Adapter**
   - Storage operations go in adapters
   - Examples: pagination, filtering

4. **Type Logic → Types**
   - Type definitions in `types/` directory
   - Use inference helpers in `types/infer.ts`

### Testing Strategy

**Unit Tests:**

- Test builders produce correct definitions
- Test error classes have correct codes
- Test crypto functions encrypt/decrypt correctly
- Test schema validation utilities

**Integration Tests:**

- Test scoped operations with mock adapter
- Test OAuth flows with mock states
- Test webhook handling

**Type Tests:**

- Verify connector key inference
- Verify action input/output inference
- Verify scope key inference

### Code Style

- Follow ESLint rules (`npm run lint`)
- Use JSDoc comments for public APIs (in English)
- Prefer explicit types over inference in public APIs
- Use `readonly` for immutable properties
- Use `async/await` over raw Promises

### Error Handling

- All predictable errors must throw `IgniterConnectorError`
- Use stable error codes from `IGNITER_CONNECTOR_ERROR_CODES`
- Include relevant context in `error.metadata`

### Commit Messages

Follow Conventional Commits:

```
feat(connectors): add custom encryption support
fix(connectors): handle expired OAuth tokens
docs(connectors): update README with webhook examples
test(connectors): add tests for PrismaAdapter
```

---

## Adding a New Adapter

1. Create file in `src/adapters/`
2. Extend `IgniterConnectorBaseAdapter`
3. Implement all required methods
4. Export from `src/adapters/index.ts`
5. Update `src/index.ts` exports
6. Add tests in `src/adapters/<name>.spec.ts`
7. Document in README

```typescript
// src/adapters/drizzle.adapter.ts
import { IgniterConnectorBaseAdapter } from "./igniter-connector.adapter";
import type {
  IgniterConnectorRecord,
  IgniterConnectorUpdateData,
} from "../types/adapter";

export class DrizzleAdapter extends IgniterConnectorBaseAdapter {
  constructor(private db: DrizzleDB) {
    super();
  }

  static create(db: DrizzleDB): DrizzleAdapter {
    return new DrizzleAdapter(db);
  }

  async get(
    scope: string,
    identity: string,
    provider: string,
  ): Promise<IgniterConnectorRecord | null> {
    // Implementation
  }

  // ... other methods
}
```

---

## Adding a New Connector Type

For new connector features (e.g., API key auth):

1. Define types in `src/types/`
2. Add builder methods in `ConnectorBuilder`
3. Handle in `IgniterConnector` core logic
4. Add tests for new functionality
5. Document in README

---

## Type System

### Key Type Helpers

```typescript
// Extract connector keys from manager
type Keys = $InferConnectorKey<typeof manager>;

// Extract scope keys from manager
type Scopes = $InferScopeKey<typeof manager>;

// Extract scoped instance type
type Scoped = $InferScoped<typeof manager>;

// Extract config type from connector
type Config = $InferConfig<typeof connector>;

// Extract action keys from connector
type Actions = $InferActionKeys<typeof connector>;
```

### Generic Constraints

When adding new types, use these patterns:

```typescript
// For connector definitions
TConnectors extends Record<
  string,
  IgniterConnectorDefinition<
    StandardSchemaV1,
    StandardSchemaV1,
    any,
    any,
    any,
    any
  >
>

// For scope definitions
TScopes extends Record<string, IgniterConnectorScopeDefinition>

// For schemas
TSchema extends StandardSchemaV1
```

---

## Telemetry & Observability

### Overview

The connectors package includes built-in telemetry integration powered by `@igniter-js/telemetry`. When configured, the package automatically emits structured events for all connector operations, enabling comprehensive observability and monitoring.

### Architecture

#### Event Emission Flow

```
User Action → Connector Operation → Telemetry Event → Redaction → Transport(s)
```

1. **User Action**: User performs operation (connect, action, etc.)
2. **Connector Operation**: Internal connector logic executes
3. **Telemetry Event**: Structured event is created with attributes
4. **Redaction**: Sensitive data is removed/hashed per policy
5. **Transport(s)**: Event is sent to configured destinations (logs, streams, etc.)

#### Key Components

| Component                             | Location                                    | Responsibility               |
| ------------------------------------- | ------------------------------------------- | ---------------------------- |
| `ConnectorsTelemetryEvents`           | `src/telemetry/connectors.telemetry.ts`     | Event schema definitions     |
| `IgniterConnectorTelemetry` interface | `src/builders/igniter-connector.builder.ts` | Telemetry runtime interface  |
| `withTelemetry()` method              | `src/builders/igniter-connector.builder.ts` | Builder configuration method |
| Event emission logic                  | `src/core/*`, `src/adapters/*`              | Actual event emission calls  |

### Event Catalog

#### Connection Lifecycle Events

```typescript
// Event: igniter.connectors.connector.connected
{
  'ctx.connector.provider': 'telegram',
  'ctx.connector.scope': 'organization',
  'ctx.connector.identity': 'org_123',  // Can be hashed
  'ctx.connector.encrypted': true,
  'ctx.connector.encryptedFields': 2
}

// Event: igniter.connectors.connector.disconnected
{
  'ctx.connector.provider': 'telegram',
  'ctx.connector.scope': 'organization',
  'ctx.connector.identity': 'org_123'
}
```

#### OAuth Flow Events

```typescript
// Event: igniter.connectors.oauth.started
{
  'ctx.connector.provider': 'mailchimp',
  'ctx.connector.scope': 'organization',
  'ctx.connector.identity': 'org_123',
  'ctx.oauth.authorizationUrl': 'https://login.mailchimp.com',
  'ctx.oauth.pkce': true,
  'ctx.oauth.scopes': 'read,write'
}

// Event: igniter.connectors.oauth.completed
{
  'ctx.connector.provider': 'mailchimp',
  'ctx.connector.scope': 'organization',
  'ctx.connector.identity': 'org_123',
  // Note: accessToken, refreshToken, userInfo are REDACTED
}

// Event: igniter.connectors.oauth.failed
{
  'ctx.connector.provider': 'mailchimp',
  'ctx.error.code': 'CONNECTOR_OAUTH_STATE_INVALID',
  'ctx.error.message': 'OAuth state is invalid or expired'
}
```

#### Action Execution Events

```typescript
// Event: igniter.connectors.action.started
{
  'ctx.connector.provider': 'telegram',
  'ctx.connector.scope': 'organization',
  'ctx.connector.identity': 'org_123',
  'ctx.action.name': 'sendMessage'
  // Note: input parameters are REDACTED
}

// Event: igniter.connectors.action.completed
{
  'ctx.connector.provider': 'telegram',
  'ctx.action.name': 'sendMessage',
  'ctx.action.durationMs': 245,
  'ctx.action.success': true
  // Note: output/result is REDACTED
}
```

#### Adapter Events

```typescript
// Event: igniter.connectors.adapter.get
{
  'ctx.connector.provider': 'telegram',
  'ctx.connector.scope': 'organization',
  'ctx.connector.identity': 'org_123',
  'ctx.adapter.durationMs': 12,
  'ctx.adapter.found': true
}

// Event: igniter.connectors.adapter.upsert
{
  'ctx.connector.provider': 'telegram',
  'ctx.connector.scope': 'organization',
  'ctx.connector.identity': 'org_123',
  'ctx.adapter.durationMs': 35,
  'ctx.adapter.inserted': false,  // Was an update
  'ctx.connector.encrypted': true,
  'ctx.connector.encryptedFields': 2
}
```

### Redaction Policy

**CRITICAL SECURITY RULE:** Never expose sensitive data in telemetry events.

#### Mandatory Denylist (Always Redact)

These fields MUST be in the denylist:

```typescript
denylistKeys: [
  "config", // Connector configurations (contain secrets)
  "accessToken", // OAuth access tokens
  "refreshToken", // OAuth refresh tokens
  "clientSecret", // OAuth client secrets
  "apiKey", // API keys
  "token", // Generic tokens
  "secret", // Any secrets
  "password", // Passwords
  "payload", // Webhook payloads
  "input", // Action inputs
  "output", // Action outputs
  "userInfo", // OAuth user information
];
```

#### Optional Hash Keys (One-Way Hash)

These can be hashed for privacy:

```typescript
hashKeys: [
  "ctx.connector.identity", // Organization IDs, User IDs, etc.
];
```

#### Safe Attributes

These are safe to expose:

- `ctx.connector.provider` - Connector key (e.g., 'telegram')
- `ctx.connector.scope` - Scope type (e.g., 'organization')
- `ctx.action.name` - Action name (e.g., 'sendMessage')
- `ctx.action.durationMs` - Timing metrics
- `ctx.action.success` - Success/failure boolean
- `ctx.error.code` - Error codes
- `ctx.oauth.authorizationUrl` - Public OAuth URLs (domain only)
- `ctx.oauth.pkce` - PKCE enabled flag
- `ctx.oauth.scopes` - OAuth scopes requested

### Implementation Guide

#### Step 1: Configure Telemetry

```typescript
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { ConnectorsTelemetryEvents } from "@igniter-js/connectors";

const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .withEnvironment(process.env.NODE_ENV)
  .addEvents(ConnectorsTelemetryEvents)
  .withRedaction({
    denylistKeys: [
      "config",
      "accessToken",
      "refreshToken",
      "clientSecret",
      "apiKey",
      "token",
      "secret",
      "password",
      "payload",
      "input",
      "output",
      "userInfo",
    ],
    hashKeys: ["ctx.connector.identity"],
    maxStringLength: 1000,
  })
  .build();
```

#### Step 2: Connect to Connectors

```typescript
const connectors = IgniterConnector.create()
  .withDatabase(adapter)
  .withTelemetry(telemetry) // Enable automatic events
  .addScope("organization", { required: true })
  .addConnector("telegram", telegramConnector)
  .build();
```

#### Step 3: Events Emitted Automatically

```typescript
// No code changes needed - events emitted automatically!
const scoped = connectors.scope("organization", "org_123");
await scoped.connect("telegram", { botToken: "..." });
// → igniter.connectors.connector.connected

await scoped.action("telegram", "sendMessage").call({ message: "Hi" });
// → igniter.connectors.action.started
// → igniter.connectors.action.completed
```

### Testing Telemetry

When writing tests, mock the telemetry runtime:

```typescript
import { describe, it, expect, vi } from "vitest";

describe("Connector with telemetry", () => {
  it("should emit events", async () => {
    const emit = vi.fn();
    const telemetry = { emit };

    const connectors = IgniterConnector.create()
      .withDatabase(adapter)
      .withTelemetry(telemetry)
      .build();

    const scoped = connectors.scope("organization", "org_123");
    await scoped.connect("telegram", { botToken: "..." });

    expect(emit).toHaveBeenCalledWith(
      "igniter.connectors.connector.connected",
      expect.objectContaining({
        "ctx.connector.provider": "telegram",
        "ctx.connector.scope": "organization",
      }),
      expect.any(Object),
    );
  });
});
```

### Troubleshooting

#### Events Not Emitted

1. Check that `withTelemetry()` was called in builder
2. Verify telemetry instance is properly configured
3. Check transport adapters are working

#### Sensitive Data Exposed

1. Review redaction policy configuration
2. Ensure all sensitive keys are in denylist
3. Check event attributes in logs/streams
4. Update denylist immediately if found

#### Performance Issues

1. Use sampling for high-volume events:

   ```typescript
   .withSampling({
     debugRate: 0.1,
     infoRate: 0.5,
   })
   ```

2. Use async transports for I/O:
   ```typescript
   emit: async (event, attrs) => {
     await sendToRemote(event, attrs);
   };
   ```

---

## Security Considerations

### Encryption

- Uses AES-256-GCM with random IV
- Requires `IGNITER_SECRET` environment variable (min 32 chars)
- Only specified fields are encrypted
- Encryption is transparent to handlers

### OAuth

- State parameter for CSRF protection
- PKCE support for public clients
- Tokens stored encrypted in database
- Automatic token refresh on expiry

### Webhooks

- Secret per connector instance
- Signature verification (connector-specific)
- Request body validation with schema

---

## Common Patterns

### Connector with OAuth and Actions

```typescript
const connector = Connector.create()
  .withConfig(z.object({ workspace: z.string() }))
  .withOAuth({
    authorizationUrl: "https://provider.com/oauth/authorize",
    tokenUrl: "https://provider.com/oauth/token",
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
  })
  .addAction("doSomething", {
    input: z.object({ data: z.string() }),
    handler: async ({ input, config, oauth }) => {
      // Use oauth.accessToken for API calls
    },
  })
  .build();
```

### System-Level Connector

```typescript
const connector = Connector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withDefaultConfig({ apiKey: process.env.DEFAULT_API_KEY! })
  .build();

const manager = IgniterConnector.create()
  .withDatabase(adapter)
  .addScope("system", { required: false })
  .addConnector("internal", connector)
  .build();

// Access without identity
const scoped = manager.scope("system", "");
```

### Action with Context

```typescript
const connector = Connector.create()
  .withConfig(z.object({ apiUrl: z.string() }))
  .onContext(async ({ config }) => {
    // Fetch additional data
    return {
      client: createApiClient(config.apiUrl),
    };
  })
  .addAction("fetch", {
    input: z.object({ id: z.string() }),
    handler: async ({ input, context }) => {
      // context.client is available
      return context.client.get(input.id);
    },
  })
  .build();
```

---

## Troubleshooting

### Common Issues

1. **IGNITER_SECRET not set**
   - Ensure environment variable is set
   - Must be at least 32 characters

2. **Connector not found**
   - Verify connector is registered with `addConnector()`
   - Check connector key spelling

3. **OAuth state invalid**
   - State expires after 10 minutes
   - Ensure state is passed correctly in callback

4. **Database adapter error**
   - Verify Prisma model exists
   - Check model has required fields
   - Ensure unique constraint on [scope, identity, provider]

---

## Version History

### 0.1.0 (2025-01-16)

- Initial release
- Core connector management
- OAuth 2.0 with PKCE
- Prisma adapter
- AES-256-GCM encryption
- Webhook support
- Event system
- **Telemetry integration** with automatic event emission
- **Comprehensive TS Docs** for all public APIs
- **Redaction policy** for sensitive data protection

### Development Notes (2025-01-13)

- Project structure established
- Core features implemented
- Documentation framework created

---

## Resources

- [Igniter.js Documentation](https://igniterjs.com)
- [GitHub Repository](https://github.com/felipebarcelospro/igniter-js)
- [NPM Package](https://www.npmjs.com/package/@igniter-js/connectors)
