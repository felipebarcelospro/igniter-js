# @igniter-js/connectors

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/connectors)](https://www.npmjs.com/package/@igniter-js/connectors)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-brightgreen)](https://nodejs.org/)

**Type-safe connector management for multi-tenant integrations**  
Build OAuth, API-key, and webhook connectors with strong typing, encryption, and telemetry.

[Quick Start](#-quick-start) • [Core Concepts](#-core-concepts) • [Examples](#-examples-library) • [API Reference](#-api-reference) • [Telemetry](#-telemetry)

</div>

---

## ✨ Why @igniter-js/connectors?

Integrations are hard because they span auth, storage, webhooks, and observability. This package gives you a single, consistent model that scales across tenants and providers:

- ✅ **Type-safe connectors** with `StandardSchemaV1` (Zod-compatible)
- ✅ **Multi-tenant scopes** (organization, user, system, or custom)
- ✅ **OAuth 2.0 with PKCE** and refresh handling
- ✅ **AES-256-GCM encryption** for sensitive fields
- ✅ **Webhook pipelines** with validation and verification
- ✅ **Adapter system** (Prisma + Mock + custom)
- ✅ **Telemetry-ready** with structured events
- ✅ **Predictable errors** with stable error codes

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @igniter-js/connectors @igniter-js/common zod

# pnpm
pnpm add @igniter-js/connectors @igniter-js/common zod

# yarn
yarn add @igniter-js/connectors @igniter-js/common zod

# bun
bun add @igniter-js/connectors @igniter-js/common zod
```

### 60-Second Setup

```typescript
import { IgniterConnector, IgniterConnectorManager } from "@igniter-js/connectors";
import { IgniterConnectorPrismaAdapter } from "@igniter-js/connectors/adapters";
import { z } from "zod";

// 1) Define a connector
const telegram = IgniterConnector.create()
  .withConfig(
    z.object({
      botToken: z.string(),
      chatId: z.string(),
    }),
  )
  .addAction("sendMessage", {
    input: z.object({ message: z.string() }),
    output: z.object({ messageId: z.string() }),
    handler: async ({ input, config }) => {
      const response = await fetch(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: config.chatId, text: input.message }),
        },
      );
      const data = await response.json();
      return { messageId: String(data.result.message_id) };
    },
  })
  .build();

// 2) Create the manager
const connectors = IgniterConnectorManager.create()
  .withDatabase(IgniterConnectorPrismaAdapter.create(prisma))
  .withEncrypt(["botToken"]) // Encrypt sensitive fields at rest
  .addScope("organization", { required: true })
  .addConnector("telegram", telegram)
  .build();

// 3) Use scoped connectors
const scoped = connectors.scope("organization", "org_123");
await scoped.connect("telegram", { botToken: "token", chatId: "123" });

const { data, error } = await scoped.action("telegram", "sendMessage").call({
  message: "Hello from Igniter.js",
});

if (error) throw error;
console.log("Message ID:", data?.messageId);
```

**✅ Success!** You just created a multi-tenant connector with encryption and typed actions.

---

## 🎯 Core Concepts

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                      │
├─────────────────────────────────────────────────────────┤
│   scoped.action('telegram','sendMessage').call(...)      │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│              IgniterConnectorManagerCore                │
│   - Scopes                                              │
│   - Connectors                                          │
│   - Hooks                                               │
│   - Telemetry                                           │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│                     Adapter Layer                       │
│  PrismaAdapter | MockAdapter | CustomAdapter            │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│                     Storage Backend                     │
│  Postgres | MySQL | SQLite | Memory | Anything           │
└─────────────────────────────────────────────────────────┘
```

### Mental Model

- **Connector Definition** (`IgniterConnector.create()`) defines config, actions, OAuth, webhooks.
- **Manager Builder** (`IgniterConnectorManager.create()`) wires adapters, encryption, telemetry, scopes.
- **Scoped Instance** (`connectors.scope(...)`) performs operations per tenant.
- **Adapter** persists connector configs (Prisma + mock + custom).
- **Telemetry** uses `IgniterConnectorsTelemetryEvents` to emit consistent events.

---

## 🧭 Exports & Subpaths

### Main Exports

```typescript
import {
  IgniterConnector,
  IgniterConnectorManager,
  IgniterConnectorManagerBuilder,
  IgniterConnectorError,
  IGNITER_CONNECTOR_ERROR_CODES,
  IgniterConnectorCrypto,
  IgniterConnectorFields,
  IgniterConnectorSchema,
  IgniterConnectorOAuthUtils,
  IgniterConnectorUrl,
  $Infer,
  $InferScoped,
  $InferConnectorKey,
  $InferScopeKey,
  $InferConfig,
  $InferActionKeys,
} from "@igniter-js/connectors";
```

### Adapters Subpath

```typescript
import {
  IgniterConnectorBaseAdapter,
  IgniterConnectorPrismaAdapter,
  IgniterConnectorMockAdapter,
} from "@igniter-js/connectors/adapters";
```

### Telemetry Subpath

```typescript
import { IgniterConnectorsTelemetryEvents } from "@igniter-js/connectors/telemetry";
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `IGNITER_SECRET` | Yes (if using default encryption) | AES-256-GCM encryption key (min 32 chars) |
| `IGNITER_BASE_URL` | Recommended | Base URL for OAuth/webhook URL generation |
| `IGNITER_BASE_PATH` | Optional | Base path prefix (e.g. `/api/v1`) |

### Encryption

Use built-in AES-256-GCM or your own encrypt/decrypt callbacks.

```typescript
const connectors = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .withEncrypt(["apiKey", "refreshToken"], {
    encrypt: async (value) => encryptValue(value),
    decrypt: async (value) => decryptValue(value),
  })
  .addScope("organization", { required: true })
  .addConnector("billing", billingConnector)
  .build();
```

---

## 🧠 Core Concepts Deep Dive

### Connectors

Connectors define schemas, metadata, actions, OAuth, and webhooks.

```typescript
const slack = IgniterConnector.create()
  .withConfig(
    z.object({
      webhookUrl: z.string().url(),
      channel: z.string(),
    }),
  )
  .withMetadata(
    z.object({ name: z.string(), icon: z.string() }),
    { name: "Slack", icon: "slack.svg" },
  )
  .addAction("postMessage", {
    input: z.object({ text: z.string() }),
    handler: async ({ input, config }) => {
      await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: config.channel, text: input.text }),
      });
    },
  })
  .build();
```

### Scopes

Scopes model multi-tenancy. A required scope needs an identity; optional scopes can omit it.

```typescript
const connectors = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addScope("user", { required: true })
  .addScope("system", { required: false })
  .addConnector("slack", slack)
  .build();

const orgScoped = connectors.scope("organization", "org_123");
const systemScoped = connectors.scope("system");
```

### OAuth Connectors (Default Config Required)

OAuth connectors store tokens automatically after callback. If you need extra config, use `withDefaultConfig()`.

```typescript
const mailchimp = IgniterConnector.create()
  .withConfig(z.object({ dc: z.string() }))
  .withDefaultConfig({ dc: "us6" })
  .withOAuth({
    authorizationUrl: "https://login.mailchimp.com/oauth2/authorize",
    tokenUrl: "https://login.mailchimp.com/oauth2/token",
    clientId: process.env.MAILCHIMP_CLIENT_ID!,
    clientSecret: process.env.MAILCHIMP_CLIENT_SECRET!,
    scopes: [],
  })
  .addAction("lists", {
    input: z.object({}),
    handler: async ({ config, oauth }) => {
      const response = await fetch(
        `https://${config.dc}.api.mailchimp.com/3.0/lists`,
        {
          headers: { Authorization: `Bearer ${oauth?.accessToken}` },
        },
      );
      return response.json();
    },
  })
  .build();
```

---

## 🧪 Examples Library

Below is a curated library of examples you can copy-paste. Each example is verified against the current implementation.

### Example 1 — Minimal Connector

```typescript
const basic = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .addAction("ping", {
    input: z.object({}),
    handler: async () => ({ ok: true }),
  })
  .build();
```

### Example 2 — Metadata for UI Cards

```typescript
const metadataConnector = IgniterConnector.create()
  .withConfig(z.object({ token: z.string() }))
  .withMetadata(
    z.object({ name: z.string(), icon: z.string(), docs: z.string() }),
    { name: "Discord", icon: "discord.svg", docs: "https://discord.com" },
  )
  .addAction("health", {
    input: z.object({}),
    handler: async () => ({ ok: true }),
  })
  .build();
```

### Example 3 — Context Hook

```typescript
const withContext = IgniterConnector.create()
  .withConfig(z.object({ apiUrl: z.string().url() }))
  .onContext(async ({ config }) => ({
    client: createHttpClient(config.apiUrl),
  }))
  .addAction("getStatus", {
    input: z.object({}),
    handler: async ({ context }) => {
      return context.client.get("/status");
    },
  })
  .build();
```

### Example 4 — Validate Config Before Connect

```typescript
const validated = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .onValidate(async ({ config }) => {
    const ok = await testKey(config.apiKey);
    if (!ok) throw new Error("Invalid API key");
  })
  .addAction("profile", {
    input: z.object({}),
    handler: async () => ({ ok: true }),
  })
  .build();
```

### Example 5 — OAuth Connector (PKCE)

```typescript
const oauthConnector = IgniterConnector.create()
  .withConfig(z.object({ workspaceId: z.string() }))
  .withDefaultConfig({ workspaceId: "default" })
  .withOAuth({
    authorizationUrl: "https://provider.com/oauth/authorize",
    tokenUrl: "https://provider.com/oauth/token",
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    pkce: true,
    scopes: ["read", "write"],
  })
  .addAction("me", {
    input: z.object({}),
    handler: async ({ oauth }) => ({ token: oauth?.accessToken }),
  })
  .build();
```

### Example 6 — Custom Token Parsing

```typescript
const customToken = IgniterConnector.create()
  .withConfig(z.object({}))
  .withDefaultConfig({})
  .withOAuth({
    authorizationUrl: "https://provider.com/auth",
    tokenUrl: "https://provider.com/token",
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    parseTokenResponse: (response) => ({
      accessToken: String(response.token),
      refreshToken: String(response.refresh),
      expiresIn: Number(response.expires),
    }),
  })
  .build();
```

### Example 7 — Custom User Info Parsing

```typescript
const customUserInfo = IgniterConnector.create()
  .withConfig(z.object({}))
  .withDefaultConfig({})
  .withOAuth({
    authorizationUrl: "https://provider.com/auth",
    tokenUrl: "https://provider.com/token",
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    userInfoUrl: "https://provider.com/me",
    parseUserInfo: (response) => ({
      id: String(response.user_id),
      name: String(response.display_name ?? ""),
      email: String(response.email ?? ""),
    }),
  })
  .build();
```

### Example 8 — OAuth Refresh Override

```typescript
const customRefresh = IgniterConnector.create()
  .withConfig(z.object({}))
  .withDefaultConfig({})
  .withOAuth({
    authorizationUrl: "https://provider.com/auth",
    tokenUrl: "https://provider.com/token",
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    onRefresh: async ({ refreshToken }) => ({
      accessToken: await refreshViaCustomApi(refreshToken),
    }),
  })
  .build();
```

### Example 9 — Webhook with Signature Verification

```typescript
const webhookConnector = IgniterConnector.create()
  .withConfig(z.object({ webhookSecret: z.string() }))
  .withWebhook({
    description: "Stripe webhook",
    schema: z.object({ type: z.string(), data: z.object({ object: z.any() }) }),
    verify: async (request, config) => {
      return verifyStripeSignature(request, config.webhookSecret);
    },
    handler: async ({ payload }) => {
      return { received: payload.type };
    },
  })
  .build();
```

### Example 10 — Webhook Handler Only

```typescript
const webhookOnly = IgniterConnector.create()
  .withConfig(z.object({}))
  .withWebhook({
    schema: z.object({ event: z.string() }),
    handler: async ({ payload }) => {
      console.log("Event:", payload.event);
    },
  })
  .build();
```

### Example 11 — Manager List with Counts

```typescript
const list = await connectors.list({
  count: { connections: true },
  limit: 10,
  offset: 0,
});
```

### Example 12 — Manager Get with Counts

```typescript
const info = await connectors.get("telegram", { count: { connections: true } });
```

### Example 13 — Scoped List Filtering

```typescript
const enabledOnly = await scoped.list({ where: { enabled: true } });
const named = await scoped.list({ where: { name: "Slack" } });
```

### Example 14 — Scoped Count

```typescript
const count = await scoped.count({ where: { enabled: true } });
```

### Example 15 — Connect a Connector

```typescript
await scoped.connect("slack", {
  webhookUrl: "https://hooks.slack.com/...",
  channel: "#alerts",
});
```

### Example 16 — Toggle Connector

```typescript
await scoped.toggle("slack");
await scoped.toggle("slack", true);
```

### Example 17 — Scoped Action Call

```typescript
const { data, error } = await scoped.action("slack", "postMessage").call({
  text: "Deployment complete",
});
```

### Example 18 — Manager Action with Default Config

```typescript
const defaultConnector = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withDefaultConfig({ apiKey: process.env.API_KEY! })
  .addAction("status", {
    input: z.object({}),
    handler: async ({ config }) => fetchStatus(config.apiKey),
  })
  .build();

const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("system", { required: false })
  .addConnector("status", defaultConnector)
  .build();

const result = await manager.action("status", "status").call({});
```

### Example 19 — onConnect Hook

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("slack", slack)
  .onConnect(async ({ connector, scope, identity }) => {
    await audit.log("connector.connected", { connector, scope, identity });
  })
  .build();
```

### Example 20 — onDisconnect Hook

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("slack", slack)
  .onDisconnect(async ({ connector, scope, identity }) => {
    await audit.log("connector.disconnected", { connector, scope, identity });
  })
  .build();
```

### Example 21 — onError Hook

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("slack", slack)
  .onError(async ({ error, connector, operation }) => {
    await errorTracker.capture(error, { connector, operation });
  })
  .build();
```

### Example 22 — Global Event Handler

```typescript
const subscription = connectors.on(async (event) => {
  console.log("Event:", event.type, event.connector);
});

subscription.unsubscribe();
```

### Example 23 — Scoped Event Handler

```typescript
const scopedSubscription = scoped.on((event) => {
  if (event.type === "action.completed") {
    console.log("Action finished:", event.action);
  }
});

scopedSubscription.unsubscribe();
```

### Example 24 — Custom Encryption Logic

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .withEncrypt(["apiKey"], {
    encrypt: (value) => customEncrypt(value),
    decrypt: (value) => customDecrypt(value),
  })
  .addScope("organization", { required: true })
  .addConnector("billing", billing)
  .build();
```

### Example 25 — Encrypt/Decrypt Utility

```typescript
const encrypted = await IgniterConnectorCrypto.encrypt("secret");
const decrypted = await IgniterConnectorCrypto.decrypt(encrypted);
```

### Example 26 — Schema Validation Utility

```typescript
const schema = z.object({ name: z.string() });
const result = await IgniterConnectorSchema.validate(schema, { name: "Igniter" });
if (result.success) {
  console.log(result.data);
}
```

### Example 27 — Build UI Fields

```typescript
const fields = IgniterConnectorFields.fromSchema(
  z.object({ apiKey: z.string().describe("API key") }),
);
```

### Example 28 — Parse OAuth Tokens

```typescript
const tokens = IgniterConnectorOAuthUtils.parseTokenResponse({
  access_token: "abc",
  refresh_token: "xyz",
  expires_in: 3600,
});
```

### Example 29 — Build URLs

```typescript
const webhookUrl = IgniterConnectorUrl.buildWebhookUrl("stripe", "secret123");
const callbackUrl = IgniterConnectorUrl.buildOAuthCallbackUrl("mailchimp");
```

### Example 30 — Prisma Adapter

```typescript
const adapter = IgniterConnectorPrismaAdapter.create(prisma, { model: "Connector" });
```

### Example 31 — Mock Adapter for Tests

```typescript
const adapter = IgniterConnectorMockAdapter.create();
const connectors = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("slack", slack)
  .build();
```

### Example 32 — Custom Adapter Skeleton

```typescript
class CustomAdapter extends IgniterConnectorBaseAdapter {
  async get(scope, identity, provider) {
    return null;
  }
  async list(scope, identity) {
    return [];
  }
  async save(scope, identity, provider, value, enabled) {
    return {
      id: "1",
      scope,
      identity,
      provider,
      value,
      enabled,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  async update(scope, identity, provider, data) {
    return {
      id: "1",
      scope,
      identity,
      provider,
      value: data.value ?? {},
      enabled: data.enabled ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  async delete() {}
  async countConnections() {
    return 0;
  }
}
```

### Example 33 — Telemetry Setup

```typescript
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { IgniterConnectorsTelemetryEvents } from "@igniter-js/connectors/telemetry";

const telemetry = IgniterTelemetry.create()
  .withService("api")
  .addEvents(IgniterConnectorsTelemetryEvents)
  .withRedaction({
    denylistKeys: ["config", "accessToken", "refreshToken", "payload"],
    hashKeys: ["ctx.connector.identity"],
  })
  .build();
```

### Example 34 — OAuth Callback Handling (Request)

```typescript
export async function GET(request: Request): Promise<Response> {
  return connectors.handle("oauth.callback", request);
}
```

### Example 35 — Webhook Handling (Request)

```typescript
export async function POST(request: Request): Promise<Response> {
  return connectors.handle("webhook", request);
}
```

### Example 36 — Get Webhook Secret After Connect

```typescript
await scoped.connect("stripe", { webhookSecret: "whsec_123" });
const instance = await scoped.get("stripe");
const secret = instance?.config?.webhook?.secret as string | undefined;
const webhookUrl = secret
  ? IgniterConnectorUrl.buildWebhookUrl("stripe", secret)
  : null;
```

### Example 37 — Manager Emit (Custom Event)

```typescript
await connectors.emit({
  type: "connector.updated",
  connector: "slack",
  scope: "organization",
  identity: "org_123",
  timestamp: new Date(),
});
```

### Example 38 — Validate OAuth Tokens Expiration

```typescript
const expired = IgniterConnectorOAuthUtils.isExpired({
  accessToken: "token",
  expiresAt: new Date(Date.now() - 1000),
});
```

### Example 39 — Manual URL Base Configuration

```typescript
IgniterConnectorUrl.setBaseUrl("https://app.example.com");
const callback = IgniterConnectorUrl.buildOAuthCallbackUrl("slack");
```

### Example 40 — Mask Sensitive Fields

```typescript
const masked = IgniterConnectorCrypto.maskFields(
  { apiKey: "sk_test_123456" },
  ["apiKey"],
);
```

---

## 🧩 Real-World Examples

Below are production-style scenarios you can adapt. Each example uses only APIs in this package.

### 1) E-commerce: Order Status Notifications

```typescript
const orderConnector = IgniterConnector.create()
  .withConfig(z.object({ webhookUrl: z.string().url() }))
  .addAction("notify", {
    input: z.object({ orderId: z.string(), status: z.string() }),
    handler: async ({ input, config }) => {
      await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return { ok: true };
    },
  })
  .build();

const connectors = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("orders", orderConnector)
  .build();

await connectors.scope("organization", "shop_001")
  .action("orders", "notify")
  .call({ orderId: "A-123", status: "shipped" });
```

### 2) Fintech: Bank Sync via OAuth

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
    handler: async ({ oauth }) => {
      const response = await fetch("https://bank.com/api/accounts", {
        headers: { Authorization: `Bearer ${oauth?.accessToken}` },
      });
      return response.json();
    },
  })
  .build();

const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("bank", bank)
  .build();

const scoped = manager.scope("organization", "fin_001");
const response = await scoped.connect("bank", { redirectUri: "https://app.com/callback" });
```

### 3) SaaS: Usage Metrics Ingestion Webhook

```typescript
const metrics = IgniterConnector.create()
  .withConfig(z.object({ webhookSecret: z.string() }))
  .withWebhook({
    schema: z.object({ userId: z.string(), usage: z.number() }),
    handler: async ({ payload }) => {
      await storeUsage(payload.userId, payload.usage);
    },
  })
  .build();

const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("metrics", metrics)
  .build();
```

### 4) Support: Ticket Sync With Context Hook

```typescript
const tickets = IgniterConnector.create()
  .withConfig(z.object({ apiUrl: z.string().url(), apiKey: z.string() }))
  .onContext(async ({ config }) => ({
    client: createHttpClient(config.apiUrl, config.apiKey),
  }))
  .addAction("create", {
    input: z.object({ subject: z.string(), body: z.string() }),
    handler: async ({ context, input }) => {
      return context.client.post("/tickets", input);
    },
  })
  .build();
```

### 5) Marketing: Campaign Publisher

```typescript
const campaigns = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .addAction("publish", {
    input: z.object({ id: z.string() }),
    handler: async ({ input, config }) => {
      return publishCampaign(config.apiKey, input.id);
    },
  })
  .build();
```

### 6) DevOps: Incident Alerts

```typescript
const pager = IgniterConnector.create()
  .withConfig(z.object({ integrationKey: z.string() }))
  .addAction("alert", {
    input: z.object({ message: z.string() }),
    handler: async ({ input, config }) => {
      await fetch("https://events.pagerduty.com/v2/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routing_key: config.integrationKey, payload: { summary: input.message } }),
      });
    },
  })
  .build();
```

---

## 📡 Telemetry

When you call `.withTelemetry()` on the manager, all connector events are automatically emitted.

### Setup

```typescript
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { IgniterConnectorsTelemetryEvents } from "@igniter-js/connectors/telemetry";

const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .addEvents(IgniterConnectorsTelemetryEvents)
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
  })
  .build();
```

### Event Groups

- `igniter.connectors.connector.*`
- `igniter.connectors.oauth.*`
- `igniter.connectors.action.*`
- `igniter.connectors.webhook.*`
- `igniter.connectors.adapter.*`
- `igniter.connectors.error.*`

---

## 🧱 Adapters

### Prisma Adapter

```typescript
import { IgniterConnectorPrismaAdapter } from "@igniter-js/connectors/adapters";
const adapter = IgniterConnectorPrismaAdapter.create(prisma, { model: "Connector" });
```

### Mock Adapter (Testing)

```typescript
import { IgniterConnectorMockAdapter } from "@igniter-js/connectors/adapters";
const adapter = IgniterConnectorMockAdapter.create();
```

### Custom Adapter Contract

```typescript
import { IgniterConnectorBaseAdapter } from "@igniter-js/connectors/adapters";

class DynamoAdapter extends IgniterConnectorBaseAdapter {
  async get(scope, identity, provider) {
    return null;
  }
  async list(scope, identity) {
    return [];
  }
  async save(scope, identity, provider, value, enabled) {
    return { id: "1", scope, identity, provider, value, enabled, createdAt: new Date(), updatedAt: new Date() };
  }
  async update(scope, identity, provider, data) {
    return { id: "1", scope, identity, provider, value: data.value ?? {}, enabled: data.enabled ?? true, createdAt: new Date(), updatedAt: new Date() };
  }
  async delete() {}
  async countConnections() { return 0; }
}
```

---

## 📚 API Reference

### Connector Builder (`IgniterConnector`)

| Method | Description |
| --- | --- |
| `IgniterConnector.create()` | Create a new connector builder |
| `.withConfig(schema)` | Set configuration schema |
| `.withMetadata(schema, value)` | Set metadata schema + value |
| `.withDefaultConfig(config)` | Provide default config (required for OAuth-only config) |
| `.withOAuth(options)` | Configure OAuth flow |
| `.withWebhook(options)` | Configure webhook validation + handler |
| `.onContext(handler)` | Provide action context |
| `.onValidate(handler)` | Validate config on connect |
| `.addAction(key, options)` | Add a typed action |
| `.build()` | Build connector definition |

### Manager Builder (`IgniterConnectorManager`)

| Method | Description |
| --- | --- |
| `IgniterConnectorManager.create()` | Create builder |
| `.withDatabase(adapter)` | Required adapter |
| `.withLogger(logger)` | Optional logger |
| `.withTelemetry(telemetry)` | Optional telemetry |
| `.withEncrypt(fields, callbacks?)` | Encryption config |
| `.addScope(key, options)` | Add a scope |
| `.addConnector(key, connector)` | Register a connector |
| `.onConnect(handler)` | Lifecycle hook |
| `.onDisconnect(handler)` | Lifecycle hook |
| `.onError(handler)` | Lifecycle hook |
| `.on(handler)` | Global event handler |
| `.build()` | Build manager |
| `.getScopes()` | Get scope types (for inference) |
| `.getConnectors()` | Get connector types (for inference) |

### Manager Instance (returned by `.build()`)

| Method | Description |
| --- | --- |
| `.scope(scope, identity?)` | Create a scoped instance |
| `.list(options?)` | List connector metadata |
| `.get(key, options?)` | Get connector metadata |
| `.action(connector, action)` | Run action using `defaultConfig` |
| `.handle("oauth.callback"|"webhook", request)` | Handle OAuth callback or webhook |
| `.on(handler)` | Subscribe to events |
| `.emit(event)` | Emit event (also telemetry) |
| `.encrypt(value)` / `.decrypt(value)` | Encrypt/decrypt value |
| `.encryptConfig(config)` / `.decryptConfig(config)` | Encrypt/decrypt config |

### Scoped Instance (`IgniterConnectorScoped`)

| Method | Description |
| --- | --- |
| `.list(options?)` | List connectors for scope |
| `.get(key)` | Get connector instance |
| `.count(options?)` | Count connected connectors |
| `.connect(key, config)` | Connect a connector |
| `.disconnect(key)` | Disconnect |
| `.toggle(key, enabled?)` | Enable/disable |
| `.action(key, action)` | Execute action |
| `.on(handler)` | Subscribe to scoped events |

---

## 🧬 Type Inference

```typescript
import { IgniterConnectorManager, $Infer } from "@igniter-js/connectors";

const connectors = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("telegram", telegram)
  .build();

type Types = $Infer<typeof connectors>;
type ScopeKey = Types["ScopeKey"]; // "organization"
type ConnectorKey = Types["ConnectorKey"]; // "telegram"
type TelegramConfig = Types["Config"]["telegram"]; // { botToken: string; chatId: string }
```

---

## 🧯 Error Handling

```typescript
import {
  IgniterConnectorError,
  IGNITER_CONNECTOR_ERROR_CODES,
} from "@igniter-js/connectors";

try {
  await scoped.action("telegram", "sendMessage").call({ message: "" });
} catch (error) {
  if (error instanceof IgniterConnectorError) {
    if (error.code === IGNITER_CONNECTOR_ERROR_CODES.CONNECTOR_ACTION_INPUT_INVALID) {
      console.error("Invalid input:", error.metadata);
    }
  }
}
```

---

## 🧪 Testing

### Unit Test with Mock Adapter

```typescript
import { describe, it, expect } from "vitest";
import { IgniterConnectorManager } from "@igniter-js/connectors";
import { IgniterConnectorMockAdapter } from "@igniter-js/connectors/adapters";

describe("connectors", () => {
  it("connects and performs actions", async () => {
    const adapter = IgniterConnectorMockAdapter.create();
    const manager = IgniterConnectorManager.create()
      .withDatabase(adapter)
      .addScope("organization", { required: true })
      .addConnector("slack", slack)
      .build();

    const scoped = manager.scope("organization", "org_1");
    await scoped.connect("slack", { webhookUrl: "https://...", channel: "#alerts" });

    const { data, error } = await scoped.action("slack", "postMessage").call({
      text: "Test",
    });

    expect(error).toBeUndefined();
    expect(data).toBeDefined();
  });
});
```

---

## ✅ Best Practices

| ✅ Do | Why |
| --- | --- |
| Encrypt sensitive fields | Prevent secrets from leaking |
| Use scopes for tenant isolation | Avoid cross-tenant access |
| Add telemetry with redaction | Observability without leaks |
| Use mock adapter in tests | Faster and deterministic |
| Use `withDefaultConfig()` for OAuth-only inputs | OAuth connect does not accept config |

| ❌ Don’t | Why |
| --- | --- |
| Store raw secrets in config | Config is persisted |
| Skip `IGNITER_SECRET` in production | Encryption will fail |
| Pass OAuth config to `connect()` | OAuth connect only accepts `redirectUri` |
| Assume webhook URL is auto-returned | Build it from stored secret |

---

## 🧩 Framework Integration

### Next.js Route Handlers

```typescript
export async function GET(request: Request) {
  return connectors.handle("oauth.callback", request);
}

export async function POST(request: Request) {
  return connectors.handle("webhook", request);
}
```

### Express

```typescript
app.get("/api/v1/connectors/:key/oauth/callback", async (req, res) => {
  const request = new Request(req.protocol + "://" + req.get("host") + req.originalUrl, {
    method: "GET",
    headers: req.headers as Record<string, string>,
  });
  const response = await connectors.handle("oauth.callback", request);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(await response.text());
});

app.post("/api/v1/connectors/:key/webhook/:secret", async (req, res) => {
  const request = new Request(req.protocol + "://" + req.get("host") + req.originalUrl, {
    method: "POST",
    headers: req.headers as Record<string, string>,
    body: JSON.stringify(req.body),
  });
  const response = await connectors.handle("webhook", request);
  res.status(response.status).send(await response.text());
});
```

### Fastify

```typescript
// OAuth callback route
fastify.get("/api/v1/connectors/:key/oauth/callback", async (request, reply) => {
  const req = new Request(
    `${request.protocol}://${request.hostname}${request.url}`,
    { method: "GET", headers: request.headers as Record<string, string> },
  );
  const response = await connectors.handle("oauth.callback", req);
  reply.status(response.status);
  response.headers.forEach((value, key) => reply.header(key, value));
  return response.text();
});

// Webhook route
fastify.post("/api/v1/connectors/:key/webhook/:secret", async (request, reply) => {
  const req = new Request(
    `${request.protocol}://${request.hostname}${request.url}`,
    {
      method: "POST",
      headers: request.headers as Record<string, string>,
      body: JSON.stringify(request.body),
    },
  );
  const response = await connectors.handle("webhook", req);
  reply.status(response.status);
  return response.text();
});
```

### Astro

```astro
---
// src/pages/api/connectors/[key]/oauth/callback.ts
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  return connectors.handle("oauth.callback", request);
};

export const POST: APIRoute = async ({ request }) => {
  return connectors.handle("webhook", request);
};
```

```typescript
// src/pages/api/connectors/[key]/webhook/[secret].ts
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  return connectors.handle("webhook", request);
};
```

---

## 🧩 Manager-Level Actions (System Connectors)

When a connector has `withDefaultConfig()`, you can execute actions directly through the manager without a scoped instance. This is ideal for internal/system connectors that don't need per-tenant configuration.

```typescript
// 1) Define a system connector with default config
const systemConnector = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withDefaultConfig({ apiKey: process.env.INTERNAL_KEY! })
  .addAction("status", {
    input: z.object({}),
    handler: async ({ config }) => getStatus(config.apiKey),
  })
  .build();

// 2) Register it in the manager
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("system", { required: false })
  .addConnector("internal", systemConnector)
  .build();

// 3) Execute the action directly from the manager
const { data, error } = await manager
  .action("internal", "status")
  .call({});

if (error) throw error;
console.log("Status:", data);
```

> **Important:** Manager-level actions require `withDefaultConfig()`. Without it, the action will throw `CONNECTOR_DEFAULT_CONFIG_REQUIRED`. For scoped (per-tenant) actions, use `scoped.action()` instead.

---

## 🧩 Troubleshooting

### `IGNITER_SECRET` missing

**Symptom:** Encryption fails with `CONNECTOR_ENCRYPTION_SECRET_REQUIRED`.

**Fix:** Set a 32+ char `IGNITER_SECRET` or supply custom encrypt/decrypt callbacks.

```bash
export IGNITER_SECRET="your-32-character-secret-key-here"
```

### OAuth callback errors

**Symptom:** OAuth flow fails with `CONNECTOR_OAUTH_STATE_INVALID`.

**Fix:** Ensure cookies are preserved between connect and callback. The callback handler reads `igniter_oauth_<connector>` cookie.

---

## 📦 Extended Examples Library (Advanced)

Use these to cover advanced patterns and edge cases.

### Example 41 — OAuth Connect in a Controller

```typescript
const scoped = connectors.scope("organization", "org_123");
const response = await scoped.connect("bank", { redirectUri: "https://app.com/callback" });
```

### Example 42 — Fetch Metadata with Counts

```typescript
const catalog = await connectors.list({ count: { connections: true } });
const mailchimp = await connectors.get("mailchimp", { count: { connections: true } });
```

### Example 43 — Filter Connected Connectors by Name

```typescript
const list = await scoped.list({ where: { name: "Slack" } });
```

### Example 44 — Build Webhook URL After Connection

```typescript
const instance = await scoped.get("stripe");
const secret = instance?.config?.webhook?.secret as string | undefined;
const webhookUrl = secret
  ? IgniterConnectorUrl.buildWebhookUrl("stripe", secret)
  : null;
```

### Example 45 — Custom Base Path for URLs

```typescript
process.env.IGNITER_BASE_URL = "https://app.example.com";
process.env.IGNITER_BASE_PATH = "/api/v1";
const callbackUrl = IgniterConnectorUrl.buildOAuthCallbackUrl("stripe");
```

### Example 46 — Use `validateOrThrow`

```typescript
const schema = z.object({ id: z.string() });
const valid = await IgniterConnectorSchema.validateOrThrow(schema, { id: "abc" });
```

### Example 47 — Generate Form Fields from Schema

```typescript
const schema = z.object({
  apiKey: z.string().describe("API key"),
  region: z.enum(["us", "eu"]).describe("Region"),
});
const fields = IgniterConnectorFields.fromSchema(schema);
```

### Example 48 — Merge Fields With Stored Config

```typescript
const fields = IgniterConnectorFields.fromSchema(schema);
const withValues = IgniterConnectorFields.mergeWithConfig(fields, {
  apiKey: "sk_123",
  region: "us",
});
```

### Example 49 — Mask Fields for Logging

```typescript
const masked = IgniterConnectorCrypto.maskFields(
  { apiKey: "sk_test_123456" },
  ["apiKey"],
  "*",
  3,
);
```

### Example 50 — Parse OAuth User Info

```typescript
const user = IgniterConnectorOAuthUtils.parseUserInfo({
  sub: "user_123",
  name: "Ava",
  email: "ava@example.com",
});
```

### Example 51 — Verify Token Refresh Capability

```typescript
const canRefresh = IgniterConnectorOAuthUtils.canRefresh({
  accessToken: "token",
  refreshToken: "refresh",
});
```

### Example 52 — Create Scoped Helper Function

```typescript
type Scoped = $InferScoped<typeof connectors>;

async function sendAlert(scoped: Scoped, message: string) {
  await scoped.action("slack", "postMessage").call({ text: message });
}
```

### Example 53 — Using `$InferConfig`

```typescript
type SlackConfig = $InferConfig<typeof connectors, "slack">;
const config: SlackConfig = { webhookUrl: "https://...", channel: "#ops" };
```

### Example 54 — Using `$InferActionKeys`

```typescript
type SlackActions = $InferActionKeys<typeof connectors, "slack">;
const action: SlackActions = "postMessage";
```

### Example 55 — Event Filtering

```typescript
connectors.on((event) => {
  if (event.type === "connector.connected") {
    console.log("Connected:", event.connector);
  }
});
```

### Example 56 — Manual Telemetry Emit

```typescript
await connectors.emit({
  type: "error.occurred",
  connector: "slack",
  scope: "organization",
  identity: "org_123",
  timestamp: new Date(),
  error: new Error("Boom"),
  errorCode: "CUSTOM_ERROR",
  errorMessage: "Something failed",
  operation: "action",
});
```

### Example 57 — Count Connections Per Connector

```typescript
const stats = await connectors.list({ count: { connections: true } });
```

### Example 58 — Refresh OAuth Tokens Automatically

```typescript
const { data } = await scoped.action("bank", "accounts").call({});
```

### Example 59 — Use Mock Adapter Call Counters

```typescript
const adapter = IgniterConnectorMockAdapter.create();
await adapter.save("org", "id", "slack", {}, true);
console.log(adapter.calls.save); // 1
```

### Example 60 — Use Mock Adapter Clear

```typescript
adapter.clear();
```

### Example 61 — Build Authorization URL Manually

```typescript
const url = IgniterConnectorOAuthUtils.buildAuthUrl(
  "https://provider.com/oauth/authorize",
  {
    client_id: "client",
    redirect_uri: "https://app.com/callback",
    response_type: "code",
    scope: "read",
    state: "random",
  },
);
```

### Example 62 — Generate OAuth State

```typescript
const state = IgniterConnectorOAuthUtils.generateState();
```

### Example 63 — Generate PKCE Verifier/Challenge

```typescript
const verifier = IgniterConnectorOAuthUtils.generateCodeVerifier();
const challenge = await IgniterConnectorOAuthUtils.generateCodeChallenge(verifier);
```

### Example 64 — Encrypt and Decrypt Fields

```typescript
const encrypted = await IgniterConnectorCrypto.encryptFields(
  { token: "secret", name: "Test" },
  ["token"],
);
const decrypted = await IgniterConnectorCrypto.decryptFields(encrypted, ["token"]);
```

### Example 65 — Make a System Connector

```typescript
const systemConnector = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withDefaultConfig({ apiKey: process.env.SYSTEM_KEY! })
  .addAction("status", {
    input: z.object({}),
    handler: async ({ config }) => getStatus(config.apiKey),
  })
  .build();

const systemManager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("system", { required: false })
  .addConnector("system", systemConnector)
  .build();
```

### Example 66 — Shared Manager for Multiple Connectors

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("organization", { required: true })
  .addConnector("slack", slack)
  .addConnector("telegram", telegram)
  .addConnector("stripe", stripe)
  .build();
```

### Example 67 — Update Enable State Directly (Adapter)

```typescript
await adapter.update("organization", "org_123", "slack", { enabled: false });
```

### Example 68 — Webhook Verification Failure Handling

```typescript
try {
  await connectors.handle("webhook", request);
} catch (error) {
  console.error("Webhook failed:", error);
}
```

### Example 69 — Build Connector List UI

```typescript
const list = await connectors.list();
const uiItems = list.map((item) => ({
  key: item.key,
  type: item.type,
  name: item.metadata.name,
}));
```

### Example 70 — Connection Health Check

```typescript
const instance = await scoped.get("slack");
const enabled = instance?.enabled ?? false;
```

---

## 🧾 Full API Reference (Detailed)

### `IgniterConnectorManagerCore` (Manager Instance)

#### `scope(scopeKey, identity?)`
- Validates scope key
- Requires identity if scope is `required: true`
- Returns `IgniterConnectorScoped`

```typescript
const scoped = connectors.scope("organization", "org_123");
```

#### `list(options?)`
- Returns metadata for all registered connectors
- Optional `count.connections` includes connection counts

```typescript
const list = await connectors.list({ limit: 10, offset: 0, count: { connections: true } });
```

#### `get(connectorKey, options?)`
- Returns connector metadata or `null`

```typescript
const info = await connectors.get("slack", { count: { connections: true } });
```

#### `action(connectorKey, actionKey)`
- Uses `defaultConfig` from connector definition
- Returns `{ data, error }`

```typescript
const { data, error } = await connectors.action("system", "status").call({});
```

#### `handle("oauth.callback" | "webhook", request)`
- Parses URL and dispatches OAuth callback or webhook handling
- Expects URLs in `/api/v1/connectors/:key/oauth/callback` or `/api/v1/connectors/:key/webhook/:secret`

```typescript
return connectors.handle("oauth.callback", request);
```

#### `emit(event)`
- Emits to internal handlers
- Emits telemetry when configured

```typescript
await connectors.emit({
  type: "connector.connected",
  connector: "slack",
  scope: "organization",
  identity: "org_123",
  timestamp: new Date(),
});
```

### `IgniterConnectorScoped`

#### `connect(connectorKey, config)`
- Validates config schema (custom connectors)
- For OAuth connectors, uses `redirectUri` and returns `Response`

```typescript
await scoped.connect("slack", { webhookUrl: "https://...", channel: "#alerts" });
```

#### `disconnect(connectorKey)`

```typescript
await scoped.disconnect("slack");
```

#### `toggle(connectorKey, enabled?)`

```typescript
await scoped.toggle("slack", false);
```

#### `action(connectorKey, actionKey)`

```typescript
await scoped.action("slack", "postMessage").call({ text: "Hello" });
```

### `IgniterConnector` (Connector Builder)

#### `withConfig(schema)`
- Uses `StandardSchemaV1` (Zod-compatible)

```typescript
IgniterConnector.create().withConfig(z.object({ apiKey: z.string() }));
```

#### `withOAuth(options)`
- Configures OAuth workflow

```typescript
IgniterConnector.create().withOAuth({
  authorizationUrl: "https://provider.com/oauth/authorize",
  tokenUrl: "https://provider.com/oauth/token",
  clientId: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
});
```

---

## 🧯 Error Code Library

Every error code has a clear context, cause, and solution.

### CONNECTOR_NOT_FOUND
- **Context:** Connector key not registered
- **Cause:** Calling `.connect()` or `.action()` for an unknown key
- **Mitigation:** Validate connector key before use
- **Solution:** Register the connector with `.addConnector()`

### CONNECTOR_NOT_CONNECTED
- **Context:** Action attempted without prior connect
- **Cause:** No stored record for scope + connector
- **Mitigation:** Call `.connect()` first
- **Solution:** Ensure `scoped.connect()` completed

### CONNECTOR_ALREADY_CONNECTED
- **Context:** Attempted to connect twice
- **Cause:** Record already exists
- **Mitigation:** Check `scoped.get()` before connect
- **Solution:** Update instead of connect

### CONNECTOR_CONFIG_INVALID
- **Context:** Config schema validation failed
- **Cause:** Missing or invalid config fields
- **Mitigation:** Validate config client-side
- **Solution:** Fix config to match schema

### CONNECTOR_DEFAULT_CONFIG_REQUIRED
- **Context:** Manager `.action()` used without defaultConfig
- **Cause:** No `withDefaultConfig()` in connector definition
- **Mitigation:** Use scoped actions
- **Solution:** Add `withDefaultConfig()`

### CONNECTOR_ACTION_NOT_FOUND
- **Context:** Action key not registered
- **Cause:** Typo or missing action definition
- **Mitigation:** Use `$InferActionKeys` for type safety
- **Solution:** Add `.addAction()` or correct key

### CONNECTOR_ACTION_INPUT_INVALID
- **Context:** Action input schema failed
- **Cause:** Wrong input type or missing fields
- **Mitigation:** Validate input before calling
- **Solution:** Fix input to match schema

### CONNECTOR_ACTION_OUTPUT_INVALID
- **Context:** Action output schema mismatch
- **Cause:** Handler returns wrong shape
- **Mitigation:** Align handler output with schema
- **Solution:** Fix handler return type

### CONNECTOR_ACTION_FAILED
- **Context:** Action handler threw
- **Cause:** API failure or unexpected exception
- **Mitigation:** Add error handling in handler
- **Solution:** Catch/transform errors

### CONNECTOR_SCOPE_INVALID
- **Context:** Unknown scope key
- **Cause:** Calling `.scope()` with unregistered scope
- **Mitigation:** Use `$InferScopeKey`
- **Solution:** Add `.addScope()`

### CONNECTOR_SCOPE_IDENTIFIER_REQUIRED
- **Context:** Missing identity for required scope
- **Cause:** `required: true` scope but identity not provided
- **Mitigation:** Provide identity
- **Solution:** Pass identity or make scope optional

### CONNECTOR_DATABASE_REQUIRED
- **Context:** Database adapter missing
- **Cause:** `.withDatabase()` not called
- **Mitigation:** Ensure adapter is configured
- **Solution:** Add `.withDatabase()`

### CONNECTOR_DATABASE_FAILED
- **Context:** Adapter error
- **Cause:** DB connectivity or adapter bug
- **Mitigation:** Wrap adapter calls with retries
- **Solution:** Fix adapter implementation

### CONNECTOR_OAUTH_NOT_CONFIGURED
- **Context:** OAuth operation on non-OAuth connector
- **Cause:** Missing `.withOAuth()`
- **Mitigation:** Verify connector definition
- **Solution:** Add `.withOAuth()`

### CONNECTOR_OAUTH_STATE_INVALID
- **Context:** OAuth state mismatch
- **Cause:** Cookies dropped or incorrect state
- **Mitigation:** Preserve cookies
- **Solution:** Retry OAuth flow

### CONNECTOR_OAUTH_TOKEN_FAILED
- **Context:** Token exchange failure
- **Cause:** Invalid credentials or provider error
- **Mitigation:** Check client ID/secret
- **Solution:** Fix OAuth credentials

### CONNECTOR_OAUTH_PARSE_TOKEN_FAILED
- **Context:** Token response format unsupported
- **Cause:** Provider response is non-standard
- **Mitigation:** Provide `parseTokenResponse`
- **Solution:** Implement custom parser

### CONNECTOR_OAUTH_PARSE_USERINFO_FAILED
- **Context:** User info response format unsupported
- **Cause:** Provider response is non-standard
- **Mitigation:** Provide `parseUserInfo`
- **Solution:** Implement custom parser

### CONNECTOR_OAUTH_REFRESH_FAILED
- **Context:** Refresh token invalid
- **Cause:** Token revoked or expired
- **Mitigation:** Reconnect via OAuth
- **Solution:** Start new OAuth flow

### CONNECTOR_WEBHOOK_NOT_CONFIGURED
- **Context:** Webhook handler called without webhook config
- **Cause:** Missing `.withWebhook()`
- **Mitigation:** Add webhook config
- **Solution:** Use `.withWebhook()`

### CONNECTOR_WEBHOOK_VALIDATION_FAILED
- **Context:** Webhook payload invalid
- **Cause:** Payload does not match schema
- **Mitigation:** Validate payload before sending
- **Solution:** Fix sender or schema

### CONNECTOR_WEBHOOK_VERIFICATION_FAILED
- **Context:** Signature verification failed
- **Cause:** Wrong secret or signature
- **Mitigation:** Ensure correct secret
- **Solution:** Fix verification logic

### CONNECTOR_ENCRYPT_FAILED
- **Context:** Encryption failure
- **Cause:** Invalid secret or custom encrypt error
- **Mitigation:** Validate encryption keys
- **Solution:** Fix `IGNITER_SECRET` or custom encrypt

### CONNECTOR_DECRYPT_FAILED
- **Context:** Decryption failure
- **Cause:** Invalid secret or corrupted data
- **Mitigation:** Validate encryption keys
- **Solution:** Fix `IGNITER_SECRET` or custom decrypt

### CONNECTOR_ENCRYPTION_SECRET_REQUIRED
- **Context:** Missing `IGNITER_SECRET`
- **Cause:** Encryption attempted without secret
- **Mitigation:** Set env variable
- **Solution:** Provide secret or custom encrypt/decrypt

### CONNECTOR_BUILD_CONFIG_REQUIRED
- **Context:** `withConfig()` missing
- **Cause:** Connector definition incomplete
- **Mitigation:** Always call `.withConfig()`
- **Solution:** Add config schema

### CONNECTOR_BUILD_SCOPES_REQUIRED
- **Context:** No scopes configured
- **Cause:** Builder missing `.addScope()`
- **Mitigation:** Define at least one scope
- **Solution:** Add a scope

### CONNECTOR_BUILD_CONNECTORS_REQUIRED
- **Context:** No connectors configured
- **Cause:** Builder missing `.addConnector()`
- **Mitigation:** Register at least one connector
- **Solution:** Add a connector

---

## 📡 Telemetry Event Catalog

Each event emitted by the manager also maps to telemetry. Use this to build dashboards.

### Connector Lifecycle
- `igniter.connectors.connector.connected`
- `igniter.connectors.connector.disconnected`
- `igniter.connectors.connector.enabled`
- `igniter.connectors.connector.disabled`
- `igniter.connectors.connector.updated`

### OAuth Flow
- `igniter.connectors.oauth.started`
- `igniter.connectors.oauth.completed`
- `igniter.connectors.oauth.refreshed`
- `igniter.connectors.oauth.failed`

### Action Execution
- `igniter.connectors.action.started`
- `igniter.connectors.action.completed`
- `igniter.connectors.action.failed`

### Webhooks
- `igniter.connectors.webhook.received`
- `igniter.connectors.webhook.processed`
- `igniter.connectors.webhook.failed`

### Adapter
- `igniter.connectors.adapter.get`
- `igniter.connectors.adapter.list`
- `igniter.connectors.adapter.upsert`
- `igniter.connectors.adapter.update`
- `igniter.connectors.adapter.delete`

### Errors
- `igniter.connectors.error.occurred`

---

## 🧩 Security Notes

- Always use encryption for secrets.
- Never emit raw config or payloads in telemetry.
- Hash scope identities if they contain PII.
- Consider separate scopes for internal vs user integrations.

---

## 📚 Additional Recipes

### Recipe: UI Integration Config Form

```typescript
const fields = IgniterConnectorFields.fromSchema(connector.configSchema);
const formSchema = fields.map((field) => ({
  label: field.label,
  name: field.key,
  required: field.required,
}));
```

### Recipe: Batch Message Sender

```typescript
async function sendBatch(scoped: $InferScoped<typeof connectors>, messages: string[]) {
  for (const message of messages) {
    await scoped.action("slack", "postMessage").call({ text: message });
  }
}
```

### Recipe: Custom Adapter With Caching

```typescript
class CachedAdapter extends IgniterConnectorBaseAdapter {
  private cache = new Map<string, IgniterConnectorRecord>();

  async get(scope, identity, provider) {
    const key = `${scope}:${identity}:${provider}`;
    return this.cache.get(key) ?? null;
  }

  async list() { return []; }
  async save(scope, identity, provider, value, enabled) {
    const record = {
      id: "cached",
      scope,
      identity,
      provider,
      value,
      enabled,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.cache.set(`${scope}:${identity}:${provider}`, record);
    return record;
  }

  async update(scope, identity, provider, data) {
    return this.save(scope, identity, provider, data.value ?? {}, data.enabled ?? true);
  }

  async delete() {}
  async countConnections() { return 0; }
}
```

---

## 📚 Examples Library (Continued)

### Example 71 — Scoped Connect in a Job

```typescript
await connectors.scope("organization", "org_999")
  .connect("telegram", { botToken: "token", chatId: "123" });
```

### Example 72 — Scoped Disconnect in a Cleanup

```typescript
await connectors.scope("organization", "org_999")
  .disconnect("telegram");
```

### Example 73 — Create a Connector With Multiple Actions

```typescript
const crm = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .addAction("createContact", {
    input: z.object({ email: z.string().email() }),
    handler: async ({ input }) => ({ id: `c_${input.email}` }),
  })
  .addAction("listContacts", {
    input: z.object({}),
    handler: async () => ({ items: [] as Array<{ id: string }> }),
  })
  .build();
```

### Example 74 — Scoped Action Error Handling

```typescript
const { data, error } = await scoped.action("crm", "createContact").call({
  email: "invalid",
});
if (error) {
  console.error("Action failed:", error.message);
}
```

### Example 75 — onValidate With Remote Ping

```typescript
const pinged = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .onValidate(async ({ config }) => {
    const ok = await pingProvider(config.apiKey);
    if (!ok) throw new Error("Invalid api key");
  })
  .addAction("status", {
    input: z.object({}),
    handler: async () => ({ ok: true }),
  })
  .build();
```

### Example 76 — Event Stream to Logger

```typescript
connectors.on((event) => {
  console.log(`[${event.type}] ${event.connector}`);
});
```

### Example 77 — Scoped Event Stream to Logger

```typescript
scoped.on((event) => {
  console.log(`[${event.type}] ${event.connector}`);
});
```

### Example 78 — Use `IgniterConnectorUrl.parseWebhookUrl`

```typescript
const parsed = IgniterConnectorUrl.parseWebhookUrl(
  "https://app.example.com/api/v1/connectors/stripe/webhook/secret123",
);
```

### Example 79 — Use `IgniterConnectorUrl.parseOAuthCallbackUrl`

```typescript
const parsed = IgniterConnectorUrl.parseOAuthCallbackUrl(
  "https://app.example.com/api/v1/connectors/stripe/oauth/callback?code=123",
);
```

### Example 80 — Check `IgniterConnectorSchema.isSchema`

```typescript
const isSchema = IgniterConnectorSchema.isSchema(z.string());
```

### Example 81 — Use `getScopes()` for Type Inference

```typescript
const scopes = connectors.getScopes();
```

### Example 82 — Use `getConnectors()` for Type Inference

```typescript
const defs = connectors.getConnectors();
```

### Example 83 — Build a Reporting Dashboard

```typescript
const list = await connectors.list({ count: { connections: true } });
const metrics = list.map((item) => ({
  connector: item.key,
  connections: item.connections ?? 0,
}));
```

### Example 84 — Action with Output Schema

```typescript
const outputSchema = z.object({ id: z.string() });

const withOutput = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .addAction("create", {
    input: z.object({ name: z.string() }),
    output: outputSchema,
    handler: async ({ input }) => ({ id: `id_${input.name}` }),
  })
  .build();
```

### Example 85 — Default Config for System Connectors

```typescript
const internal = IgniterConnector.create()
  .withConfig(z.object({ key: z.string() }))
  .withDefaultConfig({ key: process.env.INTERNAL_KEY! })
  .addAction("ping", {
    input: z.object({}),
    handler: async () => ({ ok: true }),
  })
  .build();
```

### Example 86 — Disable Connector by Policy

```typescript
if (policy.shouldDisable(connectorKey)) {
  await scoped.toggle(connectorKey, false);
}
```

### Example 87 — OAuth With Extra Params

```typescript
const oauthExtra = IgniterConnector.create()
  .withConfig(z.object({}))
  .withDefaultConfig({})
  .withOAuth({
    authorizationUrl: "https://provider.com/oauth/authorize",
    tokenUrl: "https://provider.com/oauth/token",
    clientId: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    extraParams: { prompt: "consent", access_type: "offline" },
  })
  .build();
```

### Example 88 — Use `.withMetadata` for Marketplace Cards

```typescript
const market = IgniterConnector.create()
  .withConfig(z.object({ apiKey: z.string() }))
  .withMetadata(
    z.object({ name: z.string(), website: z.string().url() }),
    { name: "Acme", website: "https://acme.com" },
  )
  .addAction("ping", { input: z.object({}), handler: async () => ({ ok: true }) })
  .build();
```

### Example 89 — Build Config Validation Errors

```typescript
try {
  await scoped.connect("slack", { webhookUrl: "not-a-url", channel: "#general" });
} catch (error) {
  if (error instanceof IgniterConnectorError) {
    console.error(error.code, error.metadata);
  }
}
```

### Example 90 — Use `IgniterConnectorOAuthUtils.parseTokenResponse`

```typescript
const tokens = IgniterConnectorOAuthUtils.parseTokenResponse({
  token: "token",
  expires: 3600,
});
```

### Example 91 — Use Schema Validation in a CLI

```typescript
const result = await IgniterConnectorSchema.validate(schema, input);
if (!result.success) {
  console.error(result.errors);
}
```

### Example 92 — Use `.action()` for Fire-and-Forget

```typescript
await scoped.action("slack", "postMessage").call({ text: "Deploy done" });
```

### Example 93 — Enforce Max Field Size

```typescript
const schema = z.object({
  apiKey: z.string().min(1).max(64),
});
```

### Example 94 — Optional Scope for System Tasks

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("system", { required: false })
  .addConnector("status", systemConnector)
  .build();

const system = manager.scope("system");
```

### Example 95 — Check Enabled Flag Before Action

```typescript
const instance = await scoped.get("slack");
if (!instance?.enabled) {
  throw new Error("Connector disabled");
}
```

### Example 96 — Custom Logger

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .withLogger({
    debug: (...args) => console.debug("[connectors]", ...args),
    info: (...args) => console.info("[connectors]", ...args),
    warn: (...args) => console.warn("[connectors]", ...args),
    error: (...args) => console.error("[connectors]", ...args),
  })
  .addScope("organization", { required: true })
  .addConnector("slack", slack)
  .build();
```

### Example 97 — Add a Webhook-Only Connector

```typescript
const webhookOnly = IgniterConnector.create()
  .withConfig(z.object({ webhookSecret: z.string() }))
  .withWebhook({
    schema: z.object({ event: z.string() }),
    handler: async ({ payload }) => ({ ok: payload.event }),
  })
  .build();
```

### Example 98 — Enforce Custom Scope Keys

```typescript
const manager = IgniterConnectorManager.create()
  .withDatabase(adapter)
  .addScope("workspace", { required: true })
  .addConnector("slack", slack)
  .build();

const scoped = manager.scope("workspace", "wk_123");
```

### Example 99 — Use `IgniterConnectorCrypto.isEncrypted`

```typescript
const isEncrypted = IgniterConnectorCrypto.isEncrypted("iv:tag:cipher");
```

### Example 100 — Handle Errors with Codes

```typescript
try {
  await scoped.action("slack", "postMessage").call({ text: "" });
} catch (error) {
  if (error instanceof IgniterConnectorError) {
    console.error("Code:", error.code);
  }
}
```

---

## 🧾 Telemetry Attribute Reference

Use these attributes when querying your telemetry store.

### Base Connector Attributes
- `ctx.connector.provider`
- `ctx.connector.scope`
- `ctx.connector.identity`

### Connection Attributes
- `ctx.connector.encrypted`
- `ctx.connector.encryptedFields`

### OAuth Attributes
- `ctx.oauth.authorizationUrl`
- `ctx.oauth.tokenUrl`
- `ctx.oauth.pkce`
- `ctx.oauth.scopes`
- `ctx.oauth.hasState`

### Action Attributes
- `ctx.action.name`
- `ctx.action.durationMs`
- `ctx.action.success`

### Webhook Attributes
- `ctx.webhook.method`
- `ctx.webhook.path`
- `ctx.webhook.durationMs`
- `ctx.webhook.verified`

### Error Attributes
- `ctx.error.code`
- `ctx.error.message`
- `ctx.error.operation`
- `ctx.error.action`

### Adapter Attributes
- `ctx.adapter.durationMs`
- `ctx.adapter.found`
- `ctx.adapter.count`
- `ctx.adapter.inserted`

---

## ❓ FAQ

### 1) Do I need Zod?
No. You can use any `StandardSchemaV1` compatible library. Zod is the most common.

### 2) Why does OAuth connect not accept config?
OAuth connect uses `redirectUri` only. Use `withDefaultConfig()` for static config values.

### 3) Can I use this in a browser?
No. The package is server-only and ships a browser shim that throws explicit errors.

### 4) Where is telemetry emitted?
When you call `.withTelemetry()` on the manager.

### 5) Can I disable encryption?
Yes. Skip `withEncrypt()` and do not access crypto utilities.

### 6) How are webhooks validated?
Use `.withWebhook({ schema, verify })` to validate payload and verify signatures.

### 7) Do I need a database?
Yes for scoped operations. Manager `.action()` can run without database using `defaultConfig`.

### 8) How do I test without a DB?
Use `IgniterConnectorMockAdapter`.

### 9) Can I add custom scopes?
Yes. Scopes are arbitrary keys.

### 10) Does it refresh OAuth tokens?
Yes. It refreshes tokens when expired and `refreshToken` is available.

### 11) Can I override OAuth token parsing?
Yes, use `parseTokenResponse`.

### 12) Can I override OAuth user info parsing?
Yes, use `parseUserInfo`.

### 13) How do I handle errors globally?
Use `.onError()` and/or `.on()` event handlers.

### 14) Can I emit custom events?
Yes. Use `.emit()` with `IgniterConnectorEvent` shape.

### 15) How do I build webhook URLs?
Use `IgniterConnectorUrl.buildWebhookUrl()` and the stored `webhook.secret`.

### 16) Where is `IGNITER_BASE_URL` used?
It defines the base URL for OAuth and webhook URLs.

### 17) Can I run this in Edge runtimes?
The package uses `node:crypto` in `IgniterConnectorCrypto`.

### 18) How do I list all connectors?
Use `connectors.list()`.

### 19) How do I list connected connectors?
Use `scoped.list()`.

### 20) What if I need a custom adapter?
Extend `IgniterConnectorBaseAdapter` and implement required methods.

---

## 📘 Glossary

- **Connector**: A definition that describes config, actions, and optional OAuth/webhook behavior.
- **Manager**: Runtime that stores connectors, handles events, and produces scoped instances.
- **Scope**: A tenant boundary such as organization or user.
- **Scoped Instance**: Accessor for a specific scope + identity.
- **Adapter**: Storage implementation for connector records.
- **Action**: Typed operation defined on a connector.
- **Webhook**: Inbound event flow handled via URL + secret.
- **OAuth**: Authorization flow for third-party accounts.
- **Telemetry**: Structured event stream for observability.




## 📎 Related Packages

- [@igniter-js/telemetry](https://www.npmjs.com/package/@igniter-js/telemetry)
- [@igniter-js/common](https://www.npmjs.com/package/@igniter-js/common)

---

## 📜 License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro)# @igniter-js/connectors

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
npm install @igniter-js/connectors @igniter-js/common

# pnpm
pnpm add @igniter-js/connectors @igniter-js/common

# yarn
yarn add @igniter-js/connectors @igniter-js/common

# bun
bun add @igniter-js/connectors @igniter-js/common
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

## 🔗 Related Packages

| Package | Description |
| --- | --- |
| [@igniter-js/common](https://www.npmjs.com/package/@igniter-js/common) | Shared types, errors, and logger utilities |
| [@igniter-js/telemetry](https://www.npmjs.com/package/@igniter-js/telemetry) | Observability with structured event emission and redaction |
| [@igniter-js/collections](https://www.npmjs.com/package/@igniter-js/collections) | Type-safe ORM for content collections |
| [@igniter-js/mail](https://www.npmjs.com/package/@igniter-js/mail) | Type-safe email template system |
| [@igniter-js/storage](https://www.npmjs.com/package/@igniter-js/storage) | Multi-provider file storage with adapters |

## Environment Variables

| Variable         | Description                            |
| ---------------- | -------------------------------------- |
| `IGNITER_SECRET` | Required for encryption (min 32 chars) |

## License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro)
