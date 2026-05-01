# AGENTS.md - @igniter-js/connectors

> **Last Updated:** 2026-01-29  
> **Version:** 0.1.1  
> **Goal:** This document is the complete operational manual for Code Agents working on @igniter-js/connectors.

---

## 1. Package Vision & Context

@igniter-js/connectors provides a **type-safe, multi-tenant connector system** for integrating third-party services. It unifies configuration, OAuth, encryption, webhooks, and observability under a single API.

The package is designed to be:

- **Tenant-aware**: Scoped connectors isolate configuration and access per organization, user, or system.
- **Secure by default**: Encryption utilities and secrets handling are built-in.
- **Observable**: Unified event emission + telemetry integration.
- **Adapter-driven**: Storage implementations are pluggable.
- **Type-safe**: All public APIs are typed using `StandardSchemaV1`.

---

# I. MAINTAINER GUIDE (Internal Architecture)

## 2. FileSystem Topology (Maintenance)

```
packages/connectors/
├── src/
│   ├── index.ts
│   ├── shim.ts
│   ├── adapters/
│   │   ├── connector.adapter.ts
│   │   ├── mock.adapter.ts
│   │   ├── mock.adapter.spec.ts
│   │   ├── prisma.adapter.ts
│   │   ├── prisma.adapter.spec.ts
│   │   └── index.ts
│   ├── builders/
│   │   ├── connector.builder.ts
│   │   ├── main.builder.ts
│   │   └── index.ts
│   ├── core/
│   │   ├── manager.ts
│   │   ├── manager.spec.ts
│   │   ├── oauth.ts
│   │   ├── scoped.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── connector.error.ts
│   │   └── index.ts
│   ├── telemetry/
│   │   └── index.ts
│   ├── types/
│   │   ├── adapter.ts
│   │   ├── config.ts
│   │   ├── connector.ts
│   │   ├── events.ts
│   │   ├── hooks.ts
│   │   ├── infer.ts
│   │   ├── oauth.ts
│   │   ├── scope.ts
│   │   ├── webhook.ts
│   │   └── index.ts
│   └── utils/
│       ├── crypto.ts
│       ├── crypto.spec.ts
│       ├── fields.ts
│       ├── fields.spec.ts
│       ├── oauth.ts
│       ├── oauth.spec.ts
│       ├── schema.ts
│       ├── schema.spec.ts
│       ├── url.ts
│       ├── url.spec.ts
│       └── index.ts
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

### Responsibilities by Folder

- `src/builders/` — Builder pattern for connectors and manager.
- `src/core/` — Runtime logic for manager and scoped instances.
- `src/adapters/` — Storage backends (Prisma, Mock, base adapter).
- `src/errors/` — Error code registry and error class.
- `src/telemetry/` — Telemetry schema registry.
- `src/types/` — All type contracts.
- `src/utils/` — Crypto, schema, OAuth, URL, and field helpers.
- `src/shim.ts` — Server-only guard for browser environments.

---

## 3. Architecture Deep-Dive

### 3.1 Builder → Manager → Scoped

```
IgniterConnector.create()         IgniterConnectorManager.create()
      │                                        │
      ▼                                        ▼
Connector definition                   Manager builder
      │                                        │
      ▼                                        ▼
Connector map + schema           Manager core instance
      │                                        │
      ▼                                        ▼
Scoped operations                      Scoped instance
```

### 3.2 Data Flow Summary

1. Connector definition is created using `IgniterConnector.create()`.
2. Manager builder registers connectors and scopes.
3. `build()` returns `IgniterConnectorManagerCore`.
4. `scope()` returns `IgniterConnectorScoped` for tenant context.
5. Actions and webhook operations use scoped context.
6. Events are emitted and optionally forwarded to telemetry.

---

## 4. Operational Flow Mapping (Pipelines)

All flows must follow this order: **Validation → Encryption → Adapter → Hooks → Events/Telemetry**.

### 4.1 Manager: `scope(scopeKey, identity?)`

1. Validate scope exists in `scopes`.
2. If scope is required, validate identity exists.
3. Resolve empty identity to `""` for optional scopes.
4. Return `IgniterConnectorScoped` instance.

### 4.2 Manager: `list(options?)`

1. Iterate all registered connectors.
2. Optionally filter by metadata name.
3. Optionally count connections using adapter.
4. Apply pagination offset/limit.
5. Return metadata list.

### 4.3 Manager: `get(connectorKey, options?)`

1. Lookup connector definition.
2. Optionally count connections.
3. Return metadata or null.

### 4.4 Manager: `action(connectorKey, actionKey)` (defaultConfig)

1. Verify connector exists.
2. Verify action exists.
3. Ensure `defaultConfig` is present.
4. Validate input schema.
5. Apply `onContext` hook if defined.
6. Emit `action.started` event.
7. Execute action handler.
8. Emit `action.completed` or `action.failed`.
9. If failed, call `onError` hook.

### 4.5 Manager: `handle("oauth.callback" | "webhook", request)`

1. Parse URL for connector key and secret.
2. Validate connector exists.
3. Dispatch to `handleOAuthCallback()` or `handleWebhook()`.
4. Return a `Response` object.

### 4.6 Manager: `handleOAuthConnect(connectorKey, params)`

1. Lookup OAuth handler in `oauthHandlers`.
2. Build redirect URL.
3. Emit `oauth.started`.
4. Set cookie with scope info.
5. Return 302 redirect response.

### 4.7 Manager: `emit(event)`

1. Log event with logger.
2. Invoke all internal handlers.
3. Build telemetry attributes from event.
4. Emit telemetry if configured.

### 4.8 Scoped: `list(options?)`

1. Adapter `list(scope, identity)`.
2. Decrypt config for each record.
3. Build `IgniterConnectorInstance`.
4. Apply filters.
5. Return list.

### 4.9 Scoped: `get(connectorKey)`

1. Adapter `get(scope, identity, connectorKey)`.
2. Decrypt config.
3. Build `IgniterConnectorInstance`.
4. Return instance or null.

### 4.10 Scoped: `connect(connectorKey, config)`

1. Validate connector exists.
2. Validate config schema.
3. Run connector-level `onValidate`.
4. If webhook enabled, generate secret and attach to config.
5. If OAuth enabled, call `handleOAuthConnect()` and return response.
6. Encrypt config values.
7. Adapter `save()` record.
8. Run manager `onConnect` hook.
9. Emit `connector.connected` event.

### 4.11 Scoped: `disconnect(connectorKey)`

1. Adapter `delete()` record.
2. Run manager `onDisconnect` hook.
3. Emit `connector.disconnected` event.

### 4.12 Scoped: `toggle(connectorKey, enabled?)`

1. If enabled not provided, fetch record.
2. Adapter `update()` with enabled state.
3. Emit `connector.enabled` or `connector.disabled`.

### 4.13 Scoped: `action(connectorKey, actionKey)`

1. Validate connector exists.
2. Fetch instance from adapter.
3. Ensure enabled and connected.
4. Refresh OAuth tokens if expired.
5. Validate input schema.
6. Compute context via `onContext`.
7. Emit `action.started`.
8. Execute handler.
9. Emit `action.completed` or `action.failed`.
10. Run `onError` hook if failed.

### 4.14 Scoped: `on(handler)`

1. Register local handler.
2. Forward to manager emit pipeline.

---

## 5. State & Mutability

- Connector builder (`IgniterConnectorBuilder`) stores internal state **mutably**.
- Manager builder (`IgniterConnectorManagerBuilder`) stores state **mutably**.
- Manager core (`IgniterConnectorManagerCore`) stores state in `Map`s.
- Scoped instance holds references to manager and scope identity.

Maintain consistency by avoiding in-place mutation of connector definitions after build.

---

## 6. Telemetry & Observability (Maintainer View)

Telemetry definitions are in `src/telemetry/index.ts`.

Key requirements:

- All event names use `igniter.connectors.*` namespace.
- Attributes must use `ctx.*` keys.
- Sensitive data must never be added to attributes.

When adding new behavior:

1. Add telemetry event in `src/telemetry/index.ts`.
2. Emit event in core logic.
3. Update tests to validate telemetry attributes.

---

## 7. Contribution Checklist (Maintainer)

### Adding a New Connector Capability

1. Update connector types in `src/types/`.
2. Update connector builder in `src/builders/connector.builder.ts`.
3. Update core logic in `src/core/`.
4. Add/update tests in `src/core` or `src/builders`.
5. Update telemetry events if needed.
6. Update README and AGENTS (consumer + maintainer).

### Adding a New Adapter

1. Create adapter in `src/adapters/`.
2. Extend `IgniterConnectorBaseAdapter`.
3. Implement required adapter methods.
4. Add tests in same folder.
5. Export in `src/adapters/index.ts`.
6. Update documentation and AGENTS.

### Adding a New Utility

1. Create utility in `src/utils/`.
2. Add unit tests in the same folder.
3. Export in `src/utils/index.ts`.
4. Document in README and AGENTS.

---

## 8. Testing Strategy (Maintainer)

### Test Locations

- `src/core/manager.spec.ts` — Manager + scoped behavior
- `src/adapters/*.spec.ts` — Adapter correctness
- `src/utils/*.spec.ts` — Utility correctness

### Mandatory Scenarios

- OAuth flow success + failure.
- Webhook validation + verification.
- Action input validation.
- Encryption/decryption logic.
- Telemetry event emission for each group.

### Testing with Mock Adapter

Use `IgniterConnectorMockAdapter` to test without database.

---

# II. CONSUMER GUIDE (Developer Manual)

## 9. Distribution Anatomy (Consumption)

The package uses ESM with subpath exports:

- `@igniter-js/connectors` — main exports (builders, core, types, utils)
- `@igniter-js/connectors/adapters` — adapters
- `@igniter-js/connectors/telemetry` — telemetry registry

Browser environments load a shim that throws a server-only error.

---

## 10. Quick Start & Common Patterns

### Pattern: Define Connector + Manager

```typescript
const connector = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .addAction("ping", {
    input: z.object({}),
    handler: async () => ({ ok: true }),
  })
  .build();

const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("ping", connector)
  .build();
```

### Pattern: Scope + Action

```typescript
const scoped = manager.scope("organization", "org_123");
await scoped.connect("ping", { apiKey: "secret" });
await scoped.action("ping", "ping").call({});
```

---

## 11. Real-World Use Case Library

### Case A — E-commerce Order Notifications

```typescript
const orders = IgniterConnector.create()
  .withConfig(z.object({ webhookUrl: z.string().url() }))
  .addAction("notify", {
    input: z.object({ orderId: z.string(), status: z.string() }),
    handler: async ({ input, config }) => {
      await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    },
  })
  .build();
```

### Case B — Fintech Account Sync (OAuth)

```typescript
const bank = IgniterConnector.create()
  .withConfig(z.object({ region: z.string() }))
  .withDefaultConfig({ region: "us" })
  .withOAuth({
    authorizationUrl: "https://bank.com/oauth/authorize",
    tokenUrl: "https://bank.com/oauth/token",
    clientId: process.env.BANK_CLIENT_ID!,
    clientSecret: process.env.BANK_CLIENT_SECRET!,
  })
  .addAction("accounts", {
    input: z.object({}),
    handler: async ({ oauth }) => fetchAccounts(oauth?.accessToken),
  })
  .build();
```

### Case C — SaaS Usage Metering

```typescript
const usage = IgniterConnector.create()
  .withConfig(z.object({ webhookSecret: z.string() }))
  .withWebhook({
    schema: z.object({ userId: z.string(), usage: z.number() }),
    handler: async ({ payload }) => storeUsage(payload.userId, payload.usage),
  })
  .build();
```

### Case D — Customer Support Ticketing

```typescript
const support = IgniterConnector.create()
  .withConfig(z.object({ apiUrl: z.string().url(), apiKey: z.string() }))
  .onContext(async ({ config }) => ({
    client: createHttpClient(config.apiUrl, config.apiKey),
  }))
  .addAction("createTicket", {
    input: z.object({ subject: z.string(), body: z.string() }),
    handler: async ({ input, context }) => context.client.post("/tickets", input),
  })
  .build();
```

### Case E — Marketing Campaign Publisher

```typescript
const campaigns = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .addAction("publish", {
    input: z.object({ campaignId: z.string() }),
    handler: async ({ input, config }) => publishCampaign(config.apiKey, input.campaignId),
  })
  .build();
```

### Case F — DevOps Alerting

```typescript
const pager = IgniterConnector.create()
  .withConfig(z.object({ integrationKey: z.string() }))
  .addAction("alert", {
    input: z.object({ message: z.string() }),
    handler: async ({ input, config }) => sendPagerDuty(config.integrationKey, input.message),
  })
  .build();
```

### Case G — Analytics Webhook Ingestion

```typescript
const analytics = IgniterConnector.create()
  .withConfig(z.object({ webhookSecret: z.string() }))
  .withWebhook({
    schema: z.object({ event: z.string(), userId: z.string() }),
    handler: async ({ payload }) => storeEvent(payload),
  })
  .build();
```

### Case H — Internal Admin Tooling

```typescript
const admin = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withDefaultConfig({ apiKey: process.env.ADMIN_KEY! })
  .addAction("stats", {
    input: z.object({}),
    handler: async ({ config }) => fetchAdminStats(config.apiKey),
  })
  .build();
```

---

## 12. Domain-Specific Guidance

### High-Volume Events

- Use telemetry sampling when events are high volume.
- Avoid logging input/output payloads.
- Consider batching actions if the provider allows it.

### OAuth Providers

- Always configure `withDefaultConfig()` for OAuth connectors.
- Use `parseTokenResponse` for non-standard providers.
- Use `parseUserInfo` when user info payload is custom.

### Webhook Providers

- Always validate webhook payload with `schema`.
- Use `verify` for signature verification.
- Persist `webhook.secret` via adapter.

---

## 13. Best Practices vs. Anti-Patterns

| ✅ Best Practice | Why | Example |
| --- | --- | --- |
| Encrypt secrets | Prevent leakage | `.withEncrypt(["apiKey"])` |
| Use scopes | Isolate tenants | `.addScope("organization")` |
| Validate input | Safe actions | `schema.validate()` |
| Use mock adapter | Fast tests | `IgniterConnectorMockAdapter.create()` |

| ❌ Anti-Pattern | Why | Example |
| --- | --- | --- |
| Store raw secrets | Security risk | `config.apiKey = "raw"` |
| Use OAuth without redaction | Leaks tokens | `.withTelemetry()` without redaction |
| Skip `defaultConfig` for OAuth | Runtime error | OAuth connector without default config |

---

# III. TECHNICAL REFERENCE & RESILIENCE

## 14. Exhaustive API Reference

### 14.1 Public Classes

- `IgniterConnectorBuilder`
- `IgniterConnectorManagerBuilder`
- `IgniterConnectorManagerCore`
- `IgniterConnectorScoped`
- `IgniterConnectorBaseAdapter`
- `IgniterConnectorPrismaAdapter`
- `IgniterConnectorMockAdapter`
- `IgniterConnectorError`
- `IgniterConnectorCrypto`
- `IgniterConnectorSchema`
- `IgniterConnectorFields`
- `IgniterConnectorOAuthUtils`
- `IgniterConnectorUrl`

### 14.2 Builder Methods Summary

Connector builder:

- `withConfig(schema)`
- `withMetadata(schema, value)`
- `withDefaultConfig(config)`
- `withOAuth(options)`
- `withWebhook(options)`
- `onContext(handler)`
- `onValidate(handler)`
- `addAction(key, options)`
- `build()`

Manager builder:

- `withLogger(logger)`
- `withTelemetry(telemetry)`
- `withDatabase(adapter)`
- `withEncrypt(fields, callbacks)`
- `addScope(key, options)`
- `addConnector(key, connector)`
- `onConnect(handler)`
- `onDisconnect(handler)`
- `onError(handler)`
- `on(handler)`
- `build()`

---

## 15. Telemetry & Observability Registry

### Event Groups

- **connector**: connected, disconnected, enabled, disabled, updated
- **oauth**: started, completed, refreshed, failed
- **action**: started, completed, failed
- **webhook**: received, processed, failed
- **adapter**: get, list, upsert, update, delete
- **error**: occurred

### Core Attributes

- `ctx.connector.provider`
- `ctx.connector.scope`
- `ctx.connector.identity`
- `ctx.action.name`
- `ctx.action.durationMs`
- `ctx.action.success`
- `ctx.webhook.method`
- `ctx.webhook.path`
- `ctx.webhook.durationMs`
- `ctx.webhook.verified`
- `ctx.error.code`
- `ctx.error.message`

---

## 16. Exhaustive Error & Troubleshooting Library

Each error code includes context, cause, mitigation, and solution.

### CONNECTOR_NOT_FOUND
- **Context:** Connector key not registered
- **Cause:** `connectorKey` not found in manager map
- **Mitigation:** Validate keys at compile time
- **Solution:** Add `.addConnector()`

```typescript
IgniterConnectorManager.create().addConnector("slack", slack)
```

### CONNECTOR_NOT_CONNECTED
- **Context:** Action called on unconnected connector
- **Cause:** Adapter returned no record
- **Mitigation:** Call `.connect()` first
- **Solution:** Connect before action

```typescript
await scoped.connect("slack", config)
```

### CONNECTOR_ALREADY_CONNECTED
- **Context:** Duplicate connect attempt
- **Cause:** Record already exists
- **Mitigation:** Check `scoped.get()` first
- **Solution:** Use `update` flow or `toggle`

### CONNECTOR_CONFIG_INVALID
- **Context:** Config schema validation failed
- **Cause:** Input does not match schema
- **Mitigation:** Validate on UI
- **Solution:** Fix config

### CONNECTOR_DEFAULT_CONFIG_REQUIRED
- **Context:** Manager `.action()` without defaultConfig
- **Cause:** No `withDefaultConfig()`
- **Mitigation:** Use scoped action or set default config
- **Solution:** Add `withDefaultConfig()`

### CONNECTOR_ACTION_NOT_FOUND
- **Context:** Unknown action key
- **Cause:** Missing `.addAction()`
- **Mitigation:** Use type helpers
- **Solution:** Add action or fix key

### CONNECTOR_ACTION_INPUT_INVALID
- **Context:** Input schema failed
- **Cause:** Bad input
- **Mitigation:** Validate input
- **Solution:** Fix payload

### CONNECTOR_ACTION_OUTPUT_INVALID
- **Context:** Output schema mismatch
- **Cause:** Handler returns wrong output
- **Mitigation:** Align handler return type
- **Solution:** Fix handler output

### CONNECTOR_ACTION_FAILED
- **Context:** Handler threw
- **Cause:** Network error or bug
- **Mitigation:** Wrap in try/catch
- **Solution:** Fix handler

### CONNECTOR_SCOPE_INVALID
- **Context:** Invalid scope
- **Cause:** Scope not added
- **Mitigation:** Use `$InferScopeKey`
- **Solution:** Add scope definition

### CONNECTOR_SCOPE_IDENTIFIER_REQUIRED
- **Context:** Missing identity
- **Cause:** Scope requires identity
- **Mitigation:** Always pass identity
- **Solution:** Provide identity value

### CONNECTOR_DATABASE_REQUIRED
- **Context:** No adapter configured
- **Cause:** Missing `.withDatabase()`
- **Mitigation:** Validate builder setup
- **Solution:** Add adapter

### CONNECTOR_DATABASE_FAILED
- **Context:** Adapter error
- **Cause:** Database down or adapter bug
- **Mitigation:** Retry or fallback
- **Solution:** Fix adapter

### CONNECTOR_OAUTH_NOT_CONFIGURED
- **Context:** OAuth operation used without OAuth
- **Cause:** Missing `.withOAuth()`
- **Mitigation:** Check connector type
- **Solution:** Add OAuth config

### CONNECTOR_OAUTH_STATE_INVALID
- **Context:** Callback state mismatch
- **Cause:** Cookie missing or invalid
- **Mitigation:** Preserve cookies
- **Solution:** Restart OAuth flow

### CONNECTOR_OAUTH_TOKEN_FAILED
- **Context:** Token exchange failed
- **Cause:** Invalid client credentials
- **Mitigation:** Check secrets
- **Solution:** Update OAuth config

### CONNECTOR_OAUTH_PARSE_TOKEN_FAILED
- **Context:** Token response unsupported
- **Cause:** Non-standard provider response
- **Mitigation:** Implement `parseTokenResponse`
- **Solution:** Provide parser

### CONNECTOR_OAUTH_PARSE_USERINFO_FAILED
- **Context:** User info response unsupported
- **Cause:** Non-standard provider response
- **Mitigation:** Implement `parseUserInfo`
- **Solution:** Provide parser

### CONNECTOR_OAUTH_REFRESH_FAILED
- **Context:** Refresh token invalid
- **Cause:** Token revoked or expired
- **Mitigation:** Reconnect
- **Solution:** Re-run OAuth flow

### CONNECTOR_WEBHOOK_NOT_CONFIGURED
- **Context:** Webhook handling without webhook
- **Cause:** Missing `.withWebhook()`
- **Mitigation:** Add webhook definition
- **Solution:** Configure webhook

### CONNECTOR_WEBHOOK_VALIDATION_FAILED
- **Context:** Payload invalid
- **Cause:** Schema mismatch
- **Mitigation:** Update schema or sender
- **Solution:** Fix payload

### CONNECTOR_WEBHOOK_VERIFICATION_FAILED
- **Context:** Signature invalid
- **Cause:** Wrong secret or signature
- **Mitigation:** Check secret
- **Solution:** Fix verification

### CONNECTOR_ENCRYPT_FAILED
- **Context:** Encrypt failed
- **Cause:** Missing secret
- **Mitigation:** Set `IGNITER_SECRET`
- **Solution:** Provide secret or custom encrypt

### CONNECTOR_DECRYPT_FAILED
- **Context:** Decrypt failed
- **Cause:** Wrong secret
- **Mitigation:** Ensure secret match
- **Solution:** Fix secret

### CONNECTOR_ENCRYPTION_SECRET_REQUIRED
- **Context:** Encryption requires secret
- **Cause:** `IGNITER_SECRET` missing
- **Mitigation:** Set env var
- **Solution:** Provide secret or custom encrypt

### CONNECTOR_BUILD_CONFIG_REQUIRED
- **Context:** `.withConfig()` missing
- **Cause:** Connector definition incomplete
- **Mitigation:** Always set schema
- **Solution:** Add `.withConfig()`

### CONNECTOR_BUILD_SCOPES_REQUIRED
- **Context:** No scopes configured
- **Cause:** Missing `.addScope()`
- **Mitigation:** Add at least one scope
- **Solution:** Define scope

### CONNECTOR_BUILD_CONNECTORS_REQUIRED
- **Context:** No connectors configured
- **Cause:** Missing `.addConnector()`
- **Mitigation:** Register at least one connector
- **Solution:** Add connector

---

## 17. Maintenance Notes

- Always update telemetry definitions when adding new operations.
- Always update README and AGENTS when public APIs change.
- Never expose sensitive payloads in logs or telemetry.
- Ensure adapter methods handle JSON value fields safely.

---

## 18. Reference Links

- Repository: https://github.com/felipebarcelospro/igniter-js
- NPM: https://www.npmjs.com/package/@igniter-js/connectors
- Docs: https://igniterjs.com

---

# IV. EXTENDED MAINTAINER APPENDICES

## Appendix A — Method-by-Method Operational Deep Dive

This appendix provides expanded pipelines for each public method with implementation notes.

### A.1 `IgniterConnectorManagerBuilder.create()`

1. Returns a new builder instance.
2. Initializes internal maps for scopes and connectors.
3. Initializes hooks to empty object.
4. Returns typed builder for inference.

### A.2 `IgniterConnectorManagerBuilder.withDatabase(adapter)`

1. Assigns adapter to internal state.
2. Returns builder instance.
3. Adapter must satisfy `IgniterConnectorAdapter` interface.

### A.3 `IgniterConnectorManagerBuilder.withEncrypt(fields, callbacks?)`

1. Stores list of field names for encryption.
2. Stores optional `encrypt` and `decrypt` callbacks.
3. Builder does not validate env secret here.
4. Encryption errors are handled at runtime.

### A.4 `IgniterConnectorManagerBuilder.addScope(key, options)`

1. Builds `IgniterConnectorScopeDefinition`.
2. Inserts into `scopes` map.
3. Returns builder with expanded scope type.

### A.5 `IgniterConnectorManagerBuilder.addConnector(key, connector)`

1. Inserts connector definition into `connectors` map.
2. Returns builder with expanded connector type.

### A.6 `IgniterConnectorManagerBuilder.build()`

1. Validates adapter exists.
2. Validates at least one scope exists.
3. Constructs `IgniterConnectorManagerConfig`.
4. Returns `IgniterConnectorManagerCore`.

### A.7 `IgniterConnectorBuilder.create()`

1. Returns builder instance for connector definition.
2. Internal state is mutable.
3. No validation until `build()`.

### A.8 `IgniterConnectorBuilder.withConfig(schema)`

1. Stores config schema.
2. Resets action map for inference.
3. Returns a re-typed builder.

### A.9 `IgniterConnectorBuilder.withMetadata(schema, value)`

1. Stores metadata schema and value.
2. Returns builder with metadata types.

### A.10 `IgniterConnectorBuilder.withDefaultConfig(config)`

1. Stores defaultConfig.
2. Used by manager `.action()`.
3. Used by OAuth callback when building config.

### A.11 `IgniterConnectorBuilder.withOAuth(options)`

1. Stores OAuth options.
2. Does not validate here.
3. OAuth options are used to construct `IgniterConnectorOAuth` in manager.

### A.12 `IgniterConnectorBuilder.withWebhook(options)`

1. Stores webhook options.
2. Webhook handler invoked in `IgniterConnectorManagerCore.handleWebhook()`.
3. Verification uses `verify` if defined.

### A.13 `IgniterConnectorBuilder.onContext(handler)`

1. Stores onContext hook.
2. Resets action map for inference.
3. Hook is called on action execution.

### A.14 `IgniterConnectorBuilder.onValidate(handler)`

1. Stores onValidate hook.
2. Hook is called during `scoped.connect()`.

### A.15 `IgniterConnectorBuilder.addAction(key, options)`

1. Adds `IgniterConnectorActionDefinition` to internal map.
2. Preserves input/output schema for inference.
3. Returns re-typed builder.

### A.16 `IgniterConnectorBuilder.build()`

1. Throws if config schema missing.
2. Builds connector definition.
3. Returns `IgniterConnectorDefinition`.

---

## Appendix B — Telemetry Implementation Notes

### B.1 Event Emission Rules

1. All events must be emitted using `manager.emit()`.
2. `manager.emit()` propagates to telemetry if configured.
3. Attributes are derived from event object and must be sanitized.

### B.2 Telemetry Attribute Mapping

| Event Type | Core Attributes | Extra Attributes |
| --- | --- | --- |
| `connector.connected` | provider, scope, identity | encrypted, encryptedFields |
| `oauth.failed` | provider, scope, identity | error code, error message |
| `action.failed` | provider, scope, identity, action | duration, error code |
| `webhook.failed` | provider, scope, identity | duration, error code |
| `error.occurred` | provider, scope, identity | error code, message, operation |

---

## Appendix C — Utility Class Deep Dive

### C.1 `IgniterConnectorCrypto`

- AES-256-GCM encryption
- Uses `IGNITER_SECRET` env var
- Provides `encrypt`, `decrypt`, `encryptFields`, `decryptFields`, `maskFields`

### C.2 `IgniterConnectorSchema`

- StandardSchemaV1 validation helper
- Works with Zod and other compatible schemas

### C.3 `IgniterConnectorFields`

- Extracts form fields from Zod schema
- Marks sensitive fields via regex patterns

### C.4 `IgniterConnectorOAuthUtils`

- Parses token/user info responses
- Handles PKCE generation
- Detects expiration and refresh capability

### C.5 `IgniterConnectorUrl`

- Builds OAuth callback and webhook URLs
- Parses callback and webhook URLs
- Supports env-based base URL detection

---

## Appendix D — Extended Real-World Scenarios (Consumer)

### D.1 Marketplace Connector Registry

```typescript
const marketplace = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withMetadata(
    z.object({ name: z.string(), category: z.string() }),
    { name: "Shopify", category: "commerce" },
  )
  .addAction("products", {
    input: z.object({}),
    handler: async () => ({ items: [] as Array<{ id: string }> }),
  })
  .build();
```

### D.2 Multi-Region Connector

```typescript
const regional = IgniterConnector.create()
  .withConfig(z.object({ region: z.enum(["us", "eu"]) }))
  .addAction("ping", {
    input: z.object({}),
    handler: async ({ config }) => ({ region: config.region }),
  })
  .build();
```

### D.3 Identity Provider Connector

```typescript
const idp = IgniterConnector.create()
  .withConfig(z.object({ tenant: z.string() }))
  .withDefaultConfig({ tenant: "global" })
  .withOAuth({
    authorizationUrl: "https://idp.com/oauth/authorize",
    tokenUrl: "https://idp.com/oauth/token",
    clientId: process.env.IDP_CLIENT_ID!,
    clientSecret: process.env.IDP_CLIENT_SECRET!,
  })
  .addAction("profile", {
    input: z.object({}),
    handler: async ({ oauth }) => fetchProfile(oauth?.accessToken),
  })
  .build();
```

### D.4 Event Relay Connector

```typescript
const relay = IgniterConnector.create()
  .withConfig(z.object({ endpoint: z.string().url() }))
  .addAction("publish", {
    input: z.object({ event: z.string(), payload: z.any() }),
    handler: async ({ input, config }) => {
      await fetch(config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    },
  })
  .build();
```

### D.5 Data Warehouse Sync

```typescript
const warehouse = IgniterConnector.create()
  .withConfig(z.object({ token: z.string() }))
  .addAction("ingest", {
    input: z.object({ batchId: z.string() }),
    handler: async ({ input }) => ({ ok: input.batchId }),
  })
  .build();
```

### D.6 Notification Fanout

```typescript
const notifications = IgniterConnector.create()
  .withConfig(z.object({ webhookUrl: z.string().url() }))
  .addAction("send", {
    input: z.object({ message: z.string() }),
    handler: async ({ input, config }) => {
      await fetch(config.webhookUrl, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  })
  .build();
```

### D.7 HR System Connector

```typescript
const hr = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .addAction("employees", {
    input: z.object({}),
    handler: async () => ({ employees: [] as Array<{ id: string }> }),
  })
  .build();
```

### D.8 Billing Provider

```typescript
const billing = IgniterConnector.create()
  .withConfig(z.object({ secret: z.string() }))
  .addAction("invoice", {
    input: z.object({ customerId: z.string() }),
    handler: async ({ input }) => ({ invoiceId: `inv_${input.customerId}` }),
  })
  .build();
```

### D.9 On-Call Roster Integration

```typescript
const roster = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .addAction("schedule", {
    input: z.object({}),
    handler: async () => ({ schedule: [] as string[] }),
  })
  .build();
```

### D.10 Warehouse Webhook Handler

```typescript
const inbound = IgniterConnector.create()
  .withConfig(z.object({ webhookSecret: z.string() }))
  .withWebhook({
    schema: z.object({ event: z.string(), payload: z.any() }),
    handler: async ({ payload }) => ({ ok: payload.event }),
  })
  .build();
```

---

## Appendix E — Developer FAQ (Internal)

### E.1 Why is `defaultConfig` required for manager `.action()`?
Manager `.action()` does not use scoped storage, so it needs a static configuration.

### E.2 Why are OAuth connectors not passing user config?
OAuth connect is tied to redirect flows. The design assumes static config via `withDefaultConfig()`.

### E.3 Why does `handle()` only accept `oauth.callback` and `webhook`?
OAuth connect is initiated by `scoped.connect()` which sets cookies and redirects.

---

## Appendix F — Glossary (Internal)

- **Connector Definition**: Output of `IgniterConnectorBuilder.build()`.
- **Connector Instance**: Runtime data from adapter with decrypted config.
- **OAuth Handler**: Internal helper in `core/oauth.ts`.
- **Scope Definition**: Stored in manager to validate scope usage.

---

## Appendix G — Complete API Example Catalog

### G.1 Connector With Metadata + Actions

```typescript
const sample = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withMetadata(z.object({ name: z.string() }), { name: "Sample" })
  .addAction("ping", {
    input: z.object({}),
    handler: async () => ({ ok: true }),
  })
  .build();
```

### G.2 Connector With Context

```typescript
const withContext = IgniterConnector.create()
  .withConfig(z.object({ apiUrl: z.string().url() }))
  .onContext(async ({ config }) => ({ client: createHttpClient(config.apiUrl) }))
  .addAction("fetch", {
    input: z.object({ id: z.string() }),
    handler: async ({ input, context }) => context.client.get(`/items/${input.id}`),
  })
  .build();
```

### G.3 Manager With Logger

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .withLogger(console)
  .addScope("organization", { required: true })
  .addConnector("sample", sample)
  .build();
```

### G.4 Manager With Telemetry

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .withTelemetry(telemetry)
  .addScope("organization", { required: true })
  .addConnector("sample", sample)
  .build();
```

### G.5 Scoped Connect

```typescript
const scoped = manager.scope("organization", "org_1");
await scoped.connect("sample", { apiKey: "secret" });
```

### G.6 Scoped Action

```typescript
const result = await scoped.action("sample", "ping").call({});
```

### G.7 Manager Action With Default Config

```typescript
const systemConnector = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withDefaultConfig({ apiKey: "system" })
  .addAction("ping", { input: z.object({}), handler: async () => ({ ok: true }) })
  .build();

const systemManager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("system", { required: false })
  .addConnector("system", systemConnector)
  .build();

await systemManager.action("system", "ping").call({});
```

### G.8 Scoped Toggle

```typescript
await scoped.toggle("sample", false);
```

### G.9 Scoped List

```typescript
const connected = await scoped.list({ where: { enabled: true } });
```

### G.10 Scoped Count

```typescript
const count = await scoped.count();
```

### G.11 Global Events

```typescript
const subscription = manager.on((event) => {
  console.log(event.type, event.connector);
});
subscription.unsubscribe();
```

### G.12 Scoped Events

```typescript
const subscription = scoped.on((event) => {
  console.log(event.type);
});
subscription.unsubscribe();
```

### G.13 Webhook Handling

```typescript
export async function POST(request: Request) {
  return manager.handle("webhook", request);
}
```

### G.14 OAuth Callback Handling

```typescript
export async function GET(request: Request) {
  return manager.handle("oauth.callback", request);
}
```

### G.15 Adapter Mock Usage

```typescript
const mock = IgniterConnectorMockAdapter.create();
await mock.save("org", "id", "sample", {}, true);
mock.clear();
```

### G.16 Field Extraction

```typescript
const fields = IgniterConnectorFields.fromSchema(z.object({ apiKey: z.string() }));
```

### G.17 Crypto Utilities

```typescript
const encrypted = await IgniterConnectorCrypto.encrypt("secret");
const decrypted = await IgniterConnectorCrypto.decrypt(encrypted);
```

### G.18 Schema Validation

```typescript
const result = await IgniterConnectorSchema.validate(z.object({ id: z.string() }), { id: "1" });
```

### G.19 OAuth Parsing

```typescript
const tokens = IgniterConnectorOAuthUtils.parseTokenResponse({ access_token: "abc" });
```

### G.20 URL Builder

```typescript
const callbackUrl = IgniterConnectorUrl.buildOAuthCallbackUrl("sample");
```

---

## Appendix H — Telemetry Testing Checklist

For each group, assert attributes:

- **connector.connected**: provider, scope, identity
- **connector.disconnected**: provider, scope, identity
- **connector.enabled**: provider, scope, identity
- **connector.disabled**: provider, scope, identity
- **connector.updated**: provider, scope, identity
- **oauth.started**: provider, scope, identity
- **oauth.completed**: provider, scope, identity
- **oauth.refreshed**: provider, scope, identity
- **oauth.failed**: provider, scope, identity, error code
- **action.started**: provider, scope, identity, action
- **action.completed**: provider, scope, identity, action, duration
- **action.failed**: provider, scope, identity, action, error code
- **webhook.received**: provider, scope, identity, method, path
- **webhook.processed**: provider, scope, identity, duration
- **webhook.failed**: provider, scope, identity, error code
- **adapter.get**: provider, scope, identity, duration, found
- **adapter.list**: provider, scope, identity, duration, count
- **adapter.upsert**: provider, scope, identity, inserted
- **adapter.update**: provider, scope, identity, duration
- **adapter.delete**: provider, scope, identity, duration
- **error.occurred**: provider, scope, identity, error code, operation

---

## Appendix I — Detailed Adapter Contract

### Required Methods

- `get(scope, identity, provider)`
- `list(scope, identity)`
- `save(scope, identity, provider, value, enabled)`
- `update(scope, identity, provider, data)`
- `delete(scope, identity, provider)`
- `exists(scope, identity, provider)`
- `countConnections(provider)`
- `findByWebhookSecret(provider, secret)`
- `updateWebhookMetadata(provider, secret, metadata)`

### Expected Behaviors

1. `save` should upsert by `(scope, identity, provider)`.
2. `update` should update `value` and/or `enabled`.
3. `findByWebhookSecret` should search stored config for `webhook.secret`.
4. `updateWebhookMetadata` should write `webhook.lastEventAt` and `webhook.lastEventResult`.

---

## Appendix J — Error Solutions (Code Snippets)

### CONNECTOR_NOT_FOUND

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("slack", slack)
  .build();
```

### CONNECTOR_NOT_CONNECTED

```typescript
await scoped.connect("slack", { webhookUrl: "https://...", channel: "#alerts" });
```

### CONNECTOR_ALREADY_CONNECTED

```typescript
const instance = await scoped.get("slack");
if (!instance) await scoped.connect("slack", config);
```

### CONNECTOR_CONFIG_INVALID

```typescript
const schema = z.object({ webhookUrl: z.string().url() });
```

### CONNECTOR_DEFAULT_CONFIG_REQUIRED

```typescript
IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withDefaultConfig({ apiKey: process.env.API_KEY! });
```

### CONNECTOR_ACTION_NOT_FOUND

```typescript
const connector = IgniterConnector.create()
  .withConfig(z.object({}))
  .addAction("ping", { input: z.object({}), handler: async () => ({ ok: true }) })
  .build();
```

### CONNECTOR_ACTION_INPUT_INVALID

```typescript
await scoped.action("slack", "postMessage").call({ text: "Hello" });
```

### CONNECTOR_SCOPE_INVALID

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .build();
```

### CONNECTOR_SCOPE_IDENTIFIER_REQUIRED

```typescript
const scoped = manager.scope("organization", "org_123");
```

### CONNECTOR_DATABASE_REQUIRED

```typescript
IgniterConnectorManager.create().withDatabase(adapter);
```

### CONNECTOR_OAUTH_NOT_CONFIGURED

```typescript
IgniterConnector.create().withOAuth({
  authorizationUrl: "https://provider.com/oauth/authorize",
  tokenUrl: "https://provider.com/oauth/token",
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
});
```

### CONNECTOR_OAUTH_STATE_INVALID

```typescript
// Ensure cookies are preserved between connect and callback.
```

### CONNECTOR_OAUTH_PARSE_TOKEN_FAILED

```typescript
parseTokenResponse: (response) => ({
  accessToken: String(response.token),
});
```

### CONNECTOR_OAUTH_PARSE_USERINFO_FAILED

```typescript
parseUserInfo: (response) => ({
  id: String(response.user_id),
});
```

### CONNECTOR_WEBHOOK_NOT_CONFIGURED

```typescript
IgniterConnector.create().withWebhook({
  schema: z.object({ event: z.string() }),
  handler: async () => ({ ok: true }),
});
```

### CONNECTOR_WEBHOOK_VALIDATION_FAILED

```typescript
const schema = z.object({ event: z.string() });
```

### CONNECTOR_WEBHOOK_VERIFICATION_FAILED

```typescript
verify: async (request, config) => verifySignature(request, config.webhookSecret)
```

### CONNECTOR_ENCRYPTION_SECRET_REQUIRED

```bash
export IGNITER_SECRET="your-32-character-secret-key"
```

### CONNECTOR_BUILD_SCOPES_REQUIRED

```typescript
IgniterConnectorManager.create().addScope("organization", { required: true });
```

### CONNECTOR_BUILD_CONNECTORS_REQUIRED

```typescript
IgniterConnectorManager.create().addConnector("slack", slack);
```



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
