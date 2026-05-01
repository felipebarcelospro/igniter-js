# @igniter-js/core

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/core)](https://www.npmjs.com/package/@igniter-js/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange)](https://bun.sh)

**Modern, type-safe HTTP framework for scalable APIs**  
Builder-first routing, typed actions, middleware pipelines, realtime SSE, and optional telemetry.

[Quick Start](#-quick-start) • [Core Concepts](#-core-concepts) • [Real-World Examples](#-real-world-examples) • [API Reference](#-api-reference)

</div>

---

## ✨ Why @igniter-js/core?

Igniter Core gives you a modern HTTP framework with **type safety end-to-end** and a **builder-first** developer experience.

- ✅ **End-to-end types** — Context, request, params, query, body, response
- ✅ **Fluent builder** — Immutable config chain with clear defaults
- ✅ **Composable actions** — Query + mutation factories with middleware
- ✅ **Realtime + SSE** — Built-in response streaming + revalidation hooks
- ✅ **Server-ready** — Bun, Node.js, Deno support with adapters
- ✅ **Optional telemetry** — First-class observability when needed

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @igniter-js/core

# pnpm
pnpm add @igniter-js/core

# yarn
yarn add @igniter-js/core

# bun
bun add @igniter-js/core
```

Most projects also install Zod for schema validation:

```bash
npm install zod
```

### Your First API (60 seconds)

```typescript
import { Igniter } from "@igniter-js/core";

export type AppContext = {
  db: {
    listUsers: () => Promise<{ id: string; name: string }[]>;
    createUser: (name: string) => Promise<{ id: string; name: string }>;
  };
};

export const igniter = Igniter.create()
  .withContext<AppContext>()
  .build();

export const usersController = igniter.controller({
  path: "/users",
  actions: {
    list: igniter.query({
      path: "/",
      handler: async ({ context, response }) => {
        const users = await context.db.listUsers();
        return response.success({ users });
      },
    }),
    create: igniter.mutation({
      path: "/",
      method: "POST",
      handler: async ({ request, context, response }) => {
        const user = await context.db.createUser(request.body.name);
        return response.created(user);
      },
    }),
  },
});

export const router = igniter.router
  .create()
  .addController("users", usersController)
  .withHealthCheck("/health")
  .build();

await router.listen(3000);
```

**✅ Success!** You now have a fully typed API with built-in request/response pipelines.

---

## 🎯 Core Concepts

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                         Your App                        │
├─────────────────────────────────────────────────────────┤
│  igniter.query / igniter.mutation / igniter.controller  │
└───────────────┬─────────────────────────────────────────┘
                │ Typed actions + middleware
                ▼
┌─────────────────────────────────────────────────────────┐
│                   Igniter Router Builder               │
│  Controllers • CORS • Rate Limit • Hooks • Healthcheck  │
└───────────────┬─────────────────────────────────────────┘
                │ Request pipeline
                ▼
┌─────────────────────────────────────────────────────────┐
│   RequestProcessor → Context → Middleware → Handler     │
└───────────────┬─────────────────────────────────────────┘
                │ Typed response
                ▼
┌─────────────────────────────────────────────────────────┐
│             IgniterResponseProcessor (JSON/SSE)         │
└─────────────────────────────────────────────────────────┘
```

### Key Abstractions

- **IgniterBuilder** → Immutable configuration (`withContext`, `withConfig`, `withStore`)
- **Action factories** → `query` and `mutation` with typed handlers
- **Controllers** → Group actions with shared paths
- **Router builder** → Add controllers, CORS, rate limit, hooks
- **Response processor** → Typed responses, cache, revalidate, streaming
- **Client runtime** → `createIgniterClient` + React hooks
- **Adapters** → Next.js + Express bridges
- **Plugins** → Self-contained features with actions, events, hooks

---

## 📦 Core Usage Examples

### 1) Create a typed context

```typescript
import { Igniter } from "@igniter-js/core";

type AppContext = {
  db: { findUser: (id: string) => Promise<{ id: string; name: string } | null> };
  env: "dev" | "prod";
};

export const igniter = Igniter.create()
  .withContext<AppContext>()
  .withConfig({ basePATH: "/api/v1" })
  .build();
```

### 2) Query action with params + query validation

```typescript
import { z } from "zod";

export const usersController = igniter.controller({
  path: "/users",
  actions: {
    getById: igniter.query({
      path: "/:id",
      query: z.object({ includePosts: z.boolean().optional() }).optional(),
      handler: async ({ request, context, response }) => {
        const user = await context.db.findUser(request.params.id);
        if (!user) return response.notFound("User not found");
        return response.success({ user, includePosts: request.query?.includePosts });
      },
    }),
  },
});
```

### 3) Mutation action with body validation

```typescript
import { z } from "zod";

export const usersController = igniter.controller({
  path: "/users",
  actions: {
    create: igniter.mutation({
      path: "/",
      method: "POST",
      body: z.object({ name: z.string().min(1) }),
      handler: async ({ request, response }) => {
        return response.created({ id: "usr_1", name: request.body.name });
      },
    }),
  },
});
```

### 4) Controller composition

```typescript
export const billingController = igniter.controller({
  path: "/billing",
  actions: {
    invoices: igniter.query({
      path: "/invoices",
      handler: async ({ response }) => response.success({ items: [] }),
    }),
  },
});
```

### 5) Router builder (recommended)

```typescript
import { createCorsMiddleware, createRateLimitMiddleware } from "@igniter-js/core";

export const router = igniter.router
  .create()
  .addController("users", usersController)
  .addController("billing", billingController)
  .addMiddleware(createCorsMiddleware({ origins: ["https://app.example.com"] }))
  .addMiddleware(createRateLimitMiddleware({ max: 100, windowSeconds: 60 }))
  .withHealthCheck("/health")
  .onRequest((req) => console.log("Incoming", req.method, req.url))
  .onResponse((res, req) => console.log("Outgoing", res.status, req.url))
  .build();
```

### 6) Standalone server (Bun/Node/Deno)

```typescript
await router.listen({
  port: 3000,
  hostname: "0.0.0.0",
  onListen: ({ port }) => console.log(`Listening on ${port}`),
});
```

### 7) Next.js adapter

```typescript
import { nextRouteHandlerAdapter } from "@igniter-js/core/adapters";

export const { GET, POST, PUT, DELETE, PATCH } = nextRouteHandlerAdapter(router);
```

### 8) Next.js config helper

```typescript
import { withIgniter } from "@igniter-js/core/adapters";

export default withIgniter({
  reactStrictMode: true,
});
```

### 9) Express adapter

```typescript
import express from "express";
import { expressAdapter } from "@igniter-js/core/adapters";

const app = express();
app.use(expressAdapter(router.handler));
app.listen(3000);
```

### 10) Manual router (factory function)

```typescript
import { createIgniterRouter } from "@igniter-js/core";

const manualRouter = createIgniterRouter({
  context: async () => ({ db: {} }),
  controllers: { users: usersController },
  config: { basePATH: "/api/v1", baseURL: "http://localhost:3000" },
  plugins: {},
});
```

### 11) Browser client

```typescript
import { createIgniterClient } from "@igniter-js/core/client";

const client = createIgniterClient({
  router,
  baseURL: "http://localhost:3000",
  basePATH: "/api/v1",
});

const users = await client.users.list.query({ params: {}, query: {} });
```

### 12) React hooks (useQuery)

```tsx
const { data, isLoading, error, refetch } = client.users.list.useQuery({
  query: { includePosts: true },
});
```

### 13) React hooks (useMutation)

```tsx
const createUser = client.users.create.useMutation({
  onSuccess: (data) => console.log("Created", data),
});

createUser.mutate({ body: { name: "Ada" }, params: {}, query: {} });
```

### 14) React hooks (useRealtime)

```tsx
const stream = client.events.stream.useRealtime({
  params: {},
  query: { channel: "notifications" },
});

if (stream.isConnected) {
  console.log("Connected to stream");
}
```

### 15) IgniterProvider with scopes

```tsx
import { IgniterProvider } from "@igniter-js/core/client";

<IgniterProvider
  enableRealtime
  getContext={async () => ({ userId: "usr_1" })}
  getScopes={(ctx) => [{ key: "user", identifier: ctx.userId }]}
>
  <App />
</IgniterProvider>;
```

### 16) Response helpers (success/created/noContent)

```typescript
handler: async ({ response }) => {
  return response.created({ id: "usr_1" });
}
```

### 17) Response helpers (errors)

```typescript
handler: async ({ response }) => {
  return response.badRequest("Invalid input");
}
```

### 18) Streaming response

```typescript
handler: async ({ response }) => {
  return response.stream({ channelId: "notifications" });
}
```

### 19) Revalidation after mutation

```typescript
handler: async ({ response }) => {
  return response.success({ ok: true }).revalidate({
    paths: ["/dashboard"],
  });
}
```

### 20) Cache response with tags

```typescript
handler: async ({ response }) => {
  return response.success({ ok: true }).cache({
    policy: "public",
    tags: ["dashboard"],
  });
}
```

### 21) Scope cache and revalidation

```typescript
handler: async ({ response }) => {
  return response
    .success({ ok: true })
    .scope("tenant", "tenant_123")
    .cache({ policy: "private", tags: ["tenant:dashboard"] });
}
```

### 22) Cookie helper

```typescript
handler: async ({ request, response }) => {
  const theme = request.cookies.get("theme") ?? "light";
  response.setCookie("theme", theme, { httpOnly: true });
  return response.success({ theme });
}
```

### 23) Console logger

```typescript
import { IgniterConsoleLogger, IgniterLogLevel } from "@igniter-js/core";

const logger = IgniterConsoleLogger.create({
  level: IgniterLogLevel.DEBUG,
  context: { component: "App" },
});

logger.info("Server starting");
```

### 24) CORS middleware

```typescript
import { createCorsMiddleware } from "@igniter-js/core";

router.addMiddleware(createCorsMiddleware({
  origins: ["https://app.example.com"],
  credentials: true,
}));
```

### 25) Rate limit middleware (in-memory)

```typescript
import { createRateLimitMiddleware } from "@igniter-js/core";

router.addMiddleware(createRateLimitMiddleware({
  max: 100,
  windowSeconds: 60,
}));
```

### 26) Rate limit with Igniter Store

```typescript
import { createRateLimitMiddleware, IgniterStoreRateLimitStore } from "@igniter-js/core";

router.addMiddleware(createRateLimitMiddleware({
  max: 500,
  windowSeconds: 60,
  store: new IgniterStoreRateLimitStore(store, 500),
}));
```

### 27) Legacy procedure

```typescript
const authProcedure = igniter.procedure({
  name: "auth",
  handler: async (options, ctx) => {
    if (!ctx.request.headers.get("authorization")) {
      return ctx.response.unauthorized();
    }
    return { userId: "usr_1" };
  },
});
```

### 28) Enhanced procedure builder

```typescript
import { createEnhancedProcedureBuilder } from "@igniter-js/core";
import { z } from "zod";

const procedures = createEnhancedProcedureBuilder<AppContext>();

const auth = procedures
  .name("auth")
  .options(z.object({ required: z.boolean().default(true) }))
  .handler(async ({ options, request, response }) => {
    if (options.required && !request.headers.get("authorization")) {
      return response.unauthorized("Missing token");
    }
    return { auth: { isAuthenticated: true } };
  });
```

### 29) Enhanced procedure factories

```typescript
import { createEnhancedProcedureFactories } from "@igniter-js/core";

const factories = createEnhancedProcedureFactories<AppContext>();

const requestId = factories.simple(async ({ request }) => ({
  requestId: request.id,
}));
```

### 30) Ensure plugin usage

```typescript
import { ensure } from "@igniter-js/core/plugins";

export const igniter = Igniter.create()
  .withContext<AppContext>()
  .addPlugin("ensure", ensure)
  .build();

handler: async ({ plugins }) => {
  plugins.ensure.toBeNotEmpty("value", "Value required");
}
```

### 31) Audit plugin usage

```typescript
import { audit } from "@igniter-js/core/plugins";

export const igniter = Igniter.create()
  .withContext<AppContext>()
  .addPlugin("audit", audit)
  .build();

handler: async ({ plugins }) => {
  await plugins.audit.actions.create({ action: "user:login" });
}
```

### 32) Jobs service

```typescript
import { createIgniterJobsService } from "@igniter-js/core";

const jobs = createIgniterJobsService({
  adapter: jobsAdapter,
  context: async () => ({ db: {} }),
});

const sendEmail = jobs.register({
  name: "email.send",
  input: z.object({ to: z.string().email() }),
  handler: async ({ input }) => ({ ok: true, to: input.to }),
});
```

### 33) Jobs router

```typescript
import { createJobsRouter } from "@igniter-js/core";

const jobsRouter = createJobsRouter({
  namespace: "email",
  jobs: {
    send: sendEmail,
  },
});
```

### 34) Jobs proxy

```typescript
import { createJobsProxy } from "@igniter-js/core";

const proxy = createJobsProxy(jobsRouter.jobs, jobsRouter.registry, jobs.invoke, jobs.management);
await proxy.email.send.enqueue({ to: "dev@igniterjs.com" });
```

### 35) Optional telemetry

```typescript
import { IgniterTelemetry, LoggerTransportAdapter } from "@igniter-js/telemetry";
import { IgniterCoreTelemetryEvents } from "@igniter-js/core/telemetry";

const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .addEvents(IgniterCoreTelemetryEvents)
  .addTransport(LoggerTransportAdapter.create({ logger: console }))
  .build();

export const igniter = Igniter.create()
  .withContext<AppContext>()
  .withTelemetry(telemetry)
  .build();
```

---

## 🌍 Real-World Examples

### Example 1: E-commerce Checkout API

```typescript
export const checkoutController = igniter.controller({
  path: "/checkout",
  actions: {
    createOrder: igniter.mutation({
      path: "/",
      method: "POST",
      body: z.object({ cartId: z.string(), paymentMethod: z.string() }),
      handler: async ({ request, context, response }) => {
        const order = await context.payments.charge(request.body);
        return response.created({ orderId: order.id });
      },
    }),
  },
});
```

### Example 2: Fintech Transfers

```typescript
export const transfers = igniter.controller({
  path: "/transfers",
  actions: {
    send: igniter.mutation({
      path: "/",
      method: "POST",
      body: z.object({ from: z.string(), to: z.string(), amount: z.number() }),
      handler: async ({ request, context, response }) => {
        const receipt = await context.ledger.transfer(request.body);
        return response.success({ receipt });
      },
    }),
  },
});
```

### Example 3: Social Feed

```typescript
export const feed = igniter.controller({
  path: "/feed",
  actions: {
    list: igniter.query({
      path: "/",
      query: z.object({ page: z.number().optional() }).optional(),
      handler: async ({ request, context, response }) => {
        const posts = await context.feed.list(request.query?.page ?? 1);
        return response.success({ posts });
      },
    }),
  },
});
```

### Example 4: Healthcare Appointments

```typescript
export const appointments = igniter.controller({
  path: "/appointments",
  actions: {
    book: igniter.mutation({
      path: "/",
      method: "POST",
      body: z.object({ patientId: z.string(), date: z.string() }),
      handler: async ({ request, context, response }) => {
        const booking = await context.appointments.book(request.body);
        return response.created(booking);
      },
    }),
  },
});
```

### Example 5: SaaS Admin API

```typescript
export const admin = igniter.controller({
  path: "/admin",
  actions: {
    disableUser: igniter.mutation({
      path: "/users/:id/disable",
      method: "PATCH",
      handler: async ({ request, context, response }) => {
        await context.users.disable(request.params.id);
        return response.noContent();
      },
    }),
  },
});
```

### Example 6: Logistics Tracking

```typescript
export const tracking = igniter.controller({
  path: "/tracking",
  actions: {
    status: igniter.query({
      path: "/:id",
      handler: async ({ request, context, response }) => {
        const status = await context.tracking.status(request.params.id);
        return response.success({ status });
      },
    }),
  },
});
```

### Example 7: Education Platform

```typescript
export const courses = igniter.controller({
  path: "/courses",
  actions: {
    enroll: igniter.mutation({
      path: "/:id/enroll",
      method: "POST",
      body: z.object({ userId: z.string() }),
      handler: async ({ request, context, response }) => {
        const result = await context.courses.enroll(request.params.id, request.body.userId);
        return response.success({ result });
      },
    }),
  },
});
```

### Example 8: Realtime Streaming (SSE)

```typescript
export const events = igniter.controller({
  path: "/events",
  actions: {
    stream: igniter.query({
      path: "/stream",
      stream: true,
      handler: async ({ response }) => response.stream({ channelId: "events" }),
    }),
  },
});
```

---

## 📚 API Reference

This is the public surface exported from `@igniter-js/core` and related subpaths.

### Core Builder (`@igniter-js/core`)

```typescript
class IgniterBuilder<...> {
  static create(): IgniterBuilder<...>

  withContext<TNewContext>(context?: TNewContext): IgniterBuilder<...>
  withConfig<TNewConfig>(config: TNewConfig): IgniterBuilder<...>
  withStore(store: IgniterStoreManager): IgniterBuilder<...>
  withLogger(logger: IgniterLogger): IgniterBuilder<...>
  withTelemetry(telemetry: IgniterTelemetryManager): IgniterBuilder<...>
  addPlugin<TKey extends string, TPlugin>(key: TKey, plugin: TPlugin): IgniterBuilder<...>

  // Deprecated aliases (still available for compatibility)
  context(...)
  config(...)
  store(...)
  logger(...)
  telemetry(...)
  plugins(...)
  jobs(...) // deprecated
  docs(...) // deprecated

  build(): {
    query: (...)
    mutation: (...)
    controller: (...)
    router: { create: () => IgniterRouterBuilder }
    procedure: (...)
    $Infer: {...}
  }

  create(): ReturnType<this["build"]> // deprecated
}

export const Igniter = IgniterBuilder;
```

### Action Factories (`@igniter-js/core`)

```typescript
createIgniterQuery(options: IgniterQueryOptions): IgniterAction
createIgniterMutation(options: IgniterMutationOptions): IgniterAction
```

### Controller Factory (`@igniter-js/core`)

```typescript
createIgniterController(config: IgniterControllerConfig): IgniterControllerConfig
```

### Router Factory (`@igniter-js/core`)

```typescript
createIgniterRouter({
  context,
  controllers,
  config,
  plugins,
  docs,
  logger,
  telemetry,
  store,
  realtime,
  cache,
  $builder,
}): IgniterRouter
```

### Router Builder (`@igniter-js/core`)

```typescript
class IgniterRouterBuilder {
  addController(key, controller)
  addMiddleware(middleware)
  onError(handler)
  onRequest(hook)
  onResponse(hook)
  withHealthCheck(path?)
  withCors(options)
  withRateLimit(options)
  build(): IgniterRouter
}

createRouterBuilder(options?): IgniterRouterBuilder
```

### Procedures (`@igniter-js/core`)

```typescript
createIgniterProcedure(config): (options?) => IgniterProcedure
createEnhancedProcedureBuilder<TContext>(): EnhancedProcedureBuilder<TContext>
createEnhancedProcedureFactories<TContext>(): EnhancedProcedureFactories<TContext>
```

### Response Processor (`@igniter-js/core`)

```typescript
class IgniterResponseProcessor {
  static init(...): IgniterResponseProcessor
  status(code)
  setHeader(name, value)
  setCookie(name, value, options?)
  scope(key, id)
  json(data)
  success(data?)
  created(data)
  noContent()
  error(code, message?, data?)
  badRequest(message?, data?)
  unauthorized(message?, data?)
  forbidden(message?, data?)
  notFound(message?, data?)
  redirect(destination, type?)
  stream(options)
  revalidate(input)
  cache(options?)
  toResponse(): Promise<Response>
}
```

### Cookies (`@igniter-js/core`)

```typescript
class IgniterCookie {
  constructor(headers: Headers)
  get(key)
  set(key, value, options?)
  getSigned(key, secret)
  setSigned(key, value, secret, options?)
  getAll()
  has(key)
  delete(key)
  clear()
  toString()
}
```

### Logger (`@igniter-js/core`)

```typescript
class IgniterConsoleLogger {
  static create(options): IgniterLogger
  log(level, message, context?, error?)
  debug/info/warn/error/fatal(...)
  child(component, context?)
}
```

### Realtime + Cache Processors (`@igniter-js/core`)

```typescript
class IgniterStoreRealtimeProcessor {
  publish(eventName, payload)
  subscribe(eventName, handler)
  scope(key, id)
  openConnection(request)
}

class IgniterStoreCacheProcessor {
  get(key)
  set(key, value, options?)
  invalidate(keys)
  setGeo(ip, geo)
  getGeo(ip)
}
```

### Middlewares (`@igniter-js/core`)

```typescript
createCorsMiddleware(options?)
createRateLimitMiddleware(options?)
MemoryRateLimitStore
IgniterStoreRateLimitStore
```

### Client (`@igniter-js/core/client`)

```typescript
createIgniterClient({ router, baseURL, basePATH })
IgniterProvider
useIgniterQueryClient
useRealtime
```

### Adapters (`@igniter-js/core/adapters`)

```typescript
nextRouteHandlerAdapter(router)
withIgniter(nextConfig?)
getHeadersSafe()
expressAdapter(handler)
```

### Plugins (`@igniter-js/core/plugins`)

```typescript
ensure
audit
```

### Telemetry (`@igniter-js/core/telemetry`)

```typescript
IgniterCoreTelemetryEvents
```

### Store Events (`@igniter-js/core/store`)

```typescript
IgniterCoreStoreEvents
IgniterCoreStoreEventsRegistry
```

### Utilities (`@igniter-js/core`)

```typescript
ClientCache
isServer
isClient
parseResponse
preserveUnion
conditionalResponse
tryCatch
parseURL
resolveLogLevel
createLoggerContext
isServerEnvironment
isClientEnvironment
getRequestIp
parseDeviceFromUserAgent
generateRequestId
resolveGeo
```

---

## 🔧 Configuration

### Builder config

```typescript
Igniter.create()
  .withConfig({
    baseURL: "http://localhost:3000",
    basePATH: "/api/v1",
  })
  .build();
```

### Docs config (legacy)

```typescript
Igniter.create()
  .docs({
    openapi: {},
    playground: { route: "/docs" },
  })
  .build();
```

> `docs()` is deprecated in the builder but still wired into the router for compatibility.

### Client provider options

```typescript
<IgniterProvider
  enableRealtime
  autoReconnect
  maxReconnectAttempts={5}
  reconnectDelay={1000}
  debug
  getContext={async () => ({ userId: "usr_1" })}
  getScopes={(ctx) => [{ key: "user", identifier: ctx.userId }]}
/>
```

---

## 🧪 Testing

### Unit test with `router.caller`

```typescript
const result = await router.caller.users.list.query({ params: {}, query: {} });
expect(result.data?.users).toHaveLength(2);
```

### Test middleware behavior

```typescript
const unauthorized = await router.caller.users.private.query({ params: {}, query: {} });
expect(unauthorized.error?.code).toBe("ERR_UNAUTHORIZED");
```

---

## ✅ Best Practices

- Use `withContext()` and `withConfig()` instead of deprecated builder methods.
- Use `response.success/created/noContent` for consistent response envelopes.
- Prefer router builder (`igniter.router.create()`) for global middleware.
- Use `router.caller` for testing and server-side calls.
- Only enable telemetry if you need observability; keep it optional.

---

## ❌ Anti-Patterns

- Do not mutate builder instances. Always chain `with*` calls.
- Do not parse JSON manually inside handlers.
- Do not import internal files from `packages/core/src`.
- Do not expose raw PII in telemetry or logs.

---

## 🧯 Troubleshooting

### BODY_PARSE_ERROR
- **Cause:** Invalid JSON or unsupported Content-Type.
- **Fix:** Ensure the request `Content-Type` matches the body format.

### REALTIME_NOT_CONFIGURED
- **Cause:** SSE endpoint called without Store configured.
- **Fix:** Provide a Store manager via `withStore()`.

### CONTROLLER_NOT_FOUND / ACTION_NOT_FOUND
- **Cause:** Missing keys in router/controller registration.
- **Fix:** Verify controller keys and action names.

### VALIDATION_ERROR
- **Cause:** Schema validation failed.
- **Fix:** Ensure request body/query matches schema.

---

## Framework Integrations

### Next.js Route Handlers

```typescript
import { nextRouteHandlerAdapter } from "@igniter-js/core/adapters";

export const { GET, POST } = nextRouteHandlerAdapter(router);
```

### Express

```typescript
import { expressAdapter } from "@igniter-js/core/adapters";

app.use(expressAdapter(router.handler));
```

---

## 🧩 Advanced Recipes

### Recipe 1: Async context factory

```typescript
type AppContext = {
  db: { findUser: (id: string) => Promise<any> };
  user?: { id: string } | null;
};

export const igniter = Igniter.create()
  .withContext(async (request: Request) => {
    const userId = request.headers.get("x-user-id");
    return {
      db,
      user: userId ? await db.findUser(userId) : null,
    };
  })
  .build();
```

### Recipe 2: Action-level middleware

```typescript
const auth = igniter.procedure({
  name: "auth",
  handler: async (_options, ctx) => {
    const token = ctx.request.headers.get("authorization");
    if (!token) return ctx.response.unauthorized();
    return { auth: { token } };
  },
});

export const secureController = igniter.controller({
  path: "/secure",
  actions: {
    profile: igniter.query({
      path: "/me",
      use: [auth()],
      handler: async ({ context, response }) => {
        return response.success({ token: context.auth.token });
      },
    }),
  },
});
```

### Recipe 3: Custom error handler in router

```typescript
const router = igniter.router
  .create()
  .addController("users", usersController)
  .onError((error, ctx, req) => {
    return new Response(
      JSON.stringify({ error: { message: error.message } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  })
  .build();
```

### Recipe 4: CORS preflight handling

```typescript
router.addMiddleware(createCorsMiddleware({
  origins: (origin) => origin.endsWith(".example.com"),
  credentials: true,
  methods: ["GET", "POST", "PATCH"],
}));
```

### Recipe 5: Rate limit per user ID

```typescript
router.addMiddleware(createRateLimitMiddleware({
  max: 300,
  windowSeconds: 60,
  keyGenerator: (req) => req.headers.get("x-user-id") || "anonymous",
}));
```

### Recipe 6: Return a raw Response

```typescript
handler: async () => {
  return new Response("OK", { status: 200 });
}
```

### Recipe 7: Use response.redirect

```typescript
handler: async ({ response }) => {
  return response.redirect("/login", "replace");
}
```

### Recipe 8: Stream with a specific channel name

```typescript
handler: async ({ response }) => {
  return response.stream({
    channelId: "tenant:alerts",
    initialData: { connected: true },
  });
}
```

### Recipe 9: Cache response using tags

```typescript
handler: async ({ response }) => {
  return response
    .success({ stats: { users: 120 } })
    .cache({ policy: "public", tags: ["stats:users"] });
}
```

### Recipe 10: Revalidate with data

```typescript
handler: async ({ response }) => {
  return response
    .success({ ok: true })
    .revalidate({ paths: ["/dashboard"], data: { reason: "profile-updated" } });
}
```

### Recipe 11: Access request metadata

```typescript
handler: async ({ request, response }) => {
  const info = {
    id: request.id,
    ip: request.ip,
    device: request.device,
    geo: request.geo,
  };
  return response.success(info);
}
```

### Recipe 12: Use IgniterServer directly

```typescript
import { IgniterServer } from "@igniter-js/core";

const server = IgniterServer.create(router.handler);
await server.listen(3000);
```

### Recipe 13: Create a custom client cache key

```typescript
import { ClientCache } from "@igniter-js/core";

const key = "users.list?page=1";
ClientCache.set(key, { data: { users: [] }, error: null });
```

### Recipe 14: Use parseResponse helper

```typescript
import { parseResponse } from "@igniter-js/core";

const response = await fetch("/api/v1/users");
const result = await parseResponse(response);
```

### Recipe 15: tryCatch helper

```typescript
import { tryCatch } from "@igniter-js/core";

const result = await tryCatch(fetch("/api/v1/users"));
if (result.error) {
  console.error(result.error);
}
```

### Recipe 16: Generate request ID

```typescript
import { generateRequestId } from "@igniter-js/core";

const id = generateRequestId();
```

### Recipe 17: Resolve geo from headers

```typescript
import { resolveGeo } from "@igniter-js/core";

const geo = await resolveGeo({
  headers: request.headers,
});
```

### Recipe 18: Using getHeadersSafe in Next.js

```typescript
import { getHeadersSafe } from "@igniter-js/core/adapters";

const headers = await getHeadersSafe();
const token = headers.get("authorization");
```

### Recipe 19: Server-side client caller

```typescript
const result = await router.caller.users.list.query({ params: {}, query: {} });
```

### Recipe 20: Optional telemetry in a handler

```typescript
handler: async ({ telemetry, response }) => {
  telemetry?.emit("custom.event", {
    attributes: { "ctx.custom.value": "example" },
  });
  return response.success({ ok: true });
}
```

---

## 🔍 Reference: Action Options

### Query options

```typescript
type IgniterQueryOptions = {
  name?: string;
  description?: string;
  path: string;
  stream?: boolean;
  method?: "GET";
  query?: StandardSchemaV1;
  use?: IgniterProcedure[];
  handler: (ctx) => any;
};
```

### Mutation options

```typescript
type IgniterMutationOptions = {
  name?: string;
  description?: string;
  path: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: StandardSchemaV1;
  query?: StandardSchemaV1;
  use?: IgniterProcedure[];
  handler: (ctx) => any;
};
```

---

## 🔍 Reference: Router Builder Options

### CORS options

```typescript
type CorsOptions = {
  origins?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
};
```

### Rate limit options

```typescript
type RateLimitOptions = {
  max?: number;
  windowSeconds?: number;
  keyGenerator?: (request: Request) => string;
  skip?: (request: Request) => boolean;
  onLimit?: (request: Request, info: RateLimitInfo) => Response | Promise<Response>;
  store?: RateLimitStore;
};
```

---

## 🧠 Full Examples (End-to-End)

### Full Example 1: Auth + Admin

```typescript
import { Igniter } from "@igniter-js/core";
import { z } from "zod";

type Context = { user?: { id: string; role: "admin" | "user" } };
const igniter = Igniter.create().withContext<Context>().build();

const requireAdmin = igniter.procedure({
  name: "require-admin",
  handler: async (_options, ctx) => {
    if (!ctx.context.user || ctx.context.user.role !== "admin") {
      return ctx.response.forbidden("Admin required");
    }
    return { admin: true };
  },
});

const adminController = igniter.controller({
  path: "/admin",
  actions: {
    stats: igniter.query({
      path: "/stats",
      use: [requireAdmin()],
      handler: async ({ response }) => response.success({ users: 120 }),
    }),
  },
});

export const router = igniter.router
  .create()
  .addController("admin", adminController)
  .build();
```

### Full Example 2: File upload pattern (body as JSON metadata)

```typescript
const uploads = igniter.controller({
  path: "/uploads",
  actions: {
    init: igniter.mutation({
      path: "/init",
      method: "POST",
      body: z.object({ filename: z.string(), size: z.number() }),
      handler: async ({ request, response }) => {
        return response.created({
          uploadId: crypto.randomUUID(),
          filename: request.body.filename,
          size: request.body.size,
        });
      },
    }),
  },
});
```

### Full Example 3: Realtime notifications

```typescript
const notifications = igniter.controller({
  path: "/notifications",
  actions: {
    stream: igniter.query({
      path: "/stream",
      stream: true,
      handler: async ({ response }) => response.stream({ channelId: "user:notifications" }),
    }),
  },
});
```

### Full Example 4: Pagination

```typescript
const pagination = igniter.controller({
  path: "/posts",
  actions: {
    list: igniter.query({
      path: "/",
      query: z.object({ page: z.number().default(1) }).optional(),
      handler: async ({ request, response }) => {
        const page = request.query?.page ?? 1;
        return response.success({ page, items: [] });
      },
    }),
  },
});
```

### Full Example 5: Scoped cache

```typescript
const dashboard = igniter.controller({
  path: "/dashboard",
  actions: {
    stats: igniter.query({
      path: "/stats",
      handler: async ({ response }) => {
        return response
          .success({ total: 100 })
          .scope("tenant", "tenant_1")
          .cache({ policy: "private", tags: ["dashboard:stats"] });
      },
    }),
  },
});
```

---

## 📈 Additional Real-World Scenarios

### Scenario A: Customer Support Portal

```typescript
const support = igniter.controller({
  path: "/support",
  actions: {
    tickets: igniter.query({
      path: "/tickets",
      handler: async ({ response }) => response.success({ items: [] }),
    }),
  },
});
```

### Scenario B: Analytics API

```typescript
const analytics = igniter.controller({
  path: "/analytics",
  actions: {
    metrics: igniter.query({
      path: "/metrics",
      handler: async ({ response }) => response.success({ visitors: 1234 }),
    }),
  },
});
```

### Scenario C: Content Moderation

```typescript
const moderation = igniter.controller({
  path: "/moderation",
  actions: {
    approve: igniter.mutation({
      path: "/:id/approve",
      method: "POST",
      handler: async ({ response }) => response.noContent(),
    }),
  },
});
```

### Scenario D: Multi-tenant User Directory

```typescript
const directory = igniter.controller({
  path: "/directory",
  actions: {
    list: igniter.query({
      path: "/",
      handler: async ({ response }) => response.success({ items: [] }),
    }),
  },
});
```

### Scenario E: Mobile Push Tokens

```typescript
const push = igniter.controller({
  path: "/push",
  actions: {
    register: igniter.mutation({
      path: "/register",
      method: "POST",
      body: z.object({ token: z.string() }),
      handler: async ({ response }) => response.success({ ok: true }),
    }),
  },
});
```

---

## 🧪 Debugging Checklist

1. Verify controller paths and action paths.
2. Confirm schema shape matches request payload.
3. Use `router.caller` for isolated unit tests.
4. Enable logger and telemetry for visibility.
5. Use `response.badRequest/unauthorized/forbidden` consistently.

---

## 📡 Telemetry Event Catalog (Core)

When you register `IgniterCoreTelemetryEvents`, the core emits the following event names:

```text
http.request.started
http.request.success
http.request.error
route.resolve.started
route.resolve.success
route.resolve.not_found
route.resolve.error
body.parse.started
body.parse.success
body.parse.error
context.build.started
context.build.success
context.build.error
context.enhance.started
context.enhance.success
context.enhance.error
middleware.execute.started
middleware.execute.success
middleware.execute.early_return
middleware.execute.error
validation.started
validation.success
validation.error
action.execute.started
action.execute.success
action.execute.error
response.build.started
response.build.success
response.build.error
response.stream.created
cache.set.started
cache.set.success
cache.set.error
cache.invalidate.started
cache.invalidate.success
cache.invalidate.error
cache.key.resolve_failed
revalidate.requested
revalidate.published
revalidate.error
realtime.connection.open.started
realtime.connection.open.success
realtime.connection.open.error
realtime.connection.close.started
realtime.connection.close.success
realtime.connection.close.error
realtime.connection.keepalive
realtime.subscribe.started
realtime.subscribe.success
realtime.subscribe.error
realtime.unsubscribe.started
realtime.unsubscribe.success
realtime.unsubscribe.error
realtime.event.publish.started
realtime.event.publish.success
realtime.event.publish.error
realtime.event.deliver.success
error.tracked
```

### Telemetry example with custom events

```typescript
telemetry.session().run(() => {
  telemetry.emit("custom.domain.event", {
    level: "info",
    attributes: {
      "ctx.custom.value": "example",
    },
  });
});
```

---

## 🔌 Plugin System Reference

### Create a plugin

```typescript
import { createIgniterPlugin, createIgniterPluginAction } from "@igniter-js/core";
import { z } from "zod";

export const analyticsPlugin = createIgniterPlugin({
  name: "analytics",
  $meta: { version: "1.0.0", description: "Simple analytics" },
  $config: {},
  $events: { emits: {}, listens: {} },
  dependencies: { requires: [], provides: [], conflicts: [] },
  hooks: {},
  middleware: { global: [], routes: { "*": [] } },
  resources: { resources: [], cleanup: async () => {} },
  registration: {
    discoverable: true,
    version: "1.0.0",
    requiresFramework: "1.0.0",
    category: ["analytics"],
    author: "Igniter",
    repository: "https://github.com/felipebarcelospro/igniter-js",
    documentation: "https://igniterjs.com/docs",
  },
  $controllers: {},
  $actions: {
    track: createIgniterPluginAction({
      name: "track",
      description: "Track event",
      input: z.object({ name: z.string() }),
      handler: async ({ input }) => ({ ok: true, name: input.name }),
    }),
  },
});
```

### Use a plugin inside context

```typescript
const igniter = Igniter.create()
  .withContext<AppContext>()
  .addPlugin("analytics", analyticsPlugin)
  .build();

handler: async ({ plugins }) => {
  await plugins.analytics.actions.track({ name: "user.login" });
}
```

---

## 🧰 Jobs System Reference

### Jobs service + registry + proxy

```typescript
import { createIgniterJobsService, createJobsRegistry, createJobsProxy } from "@igniter-js/core";

const jobs = createIgniterJobsService({ adapter: jobsAdapter, context: async () => ({}) });
const job = jobs.register({
  name: "billing.charge",
  input: z.object({ userId: z.string() }),
  handler: async ({ input }) => ({ ok: true, userId: input.userId }),
});

const registry = createJobsRegistry([job], { namespace: "billing" });
const proxy = createJobsProxy([job], registry, jobs.invoke, jobs.management);
await proxy.billing.charge.enqueue({ userId: "usr_1" });
```

---

## 🧾 Response Processor Recipes

### Manual Response creation

```typescript
handler: async ({ response }) => {
  return response
    .status(202)
    .setHeader("x-custom", "value")
    .json({ accepted: true });
}
```

### Cookies + scoped cache

```typescript
handler: async ({ response }) => {
  response.setCookie("session", "abc", { httpOnly: true });
  return response
    .success({ ok: true })
    .scope("user", "usr_1")
    .cache({ policy: "private", tags: ["session"] });
}
```

---

## 📦 Export Matrix

### Root exports (`@igniter-js/core`)

```text
IgniterBuilder, Igniter
createIgniterQuery, createIgniterMutation
createIgniterController, createIgniterRouter
createIgniterProcedure
createEnhancedProcedureBuilder
createEnhancedProcedureFactories
IgniterCookie
IgniterConsoleLogger
IgniterStoreRealtimeProcessor
IgniterStoreCacheProcessor
IgniterSSETransport
createIgniterJobsService
createJobDefinition
createJobsRouter
createJobsRegistry
createJobsProxy
IgniterPluginManager
IgniterServer
IgniterServerBunAdapter
IgniterServerDenoAdapter
IgniterServerNodeAdapter
createCorsMiddleware
createRateLimitMiddleware
MemoryRateLimitStore
IgniterStoreRateLimitStore
ClientCache
isServer, isClient
parseResponse, preserveUnion, conditionalResponse
tryCatch
parseURL
resolveLogLevel, createLoggerContext
isServerEnvironment, isClientEnvironment
getRequestIp, parseDeviceFromUserAgent, generateRequestId, resolveGeo
```

### Subpath exports

```text
@igniter-js/core/client
@igniter-js/core/adapters
@igniter-js/core/plugins
@igniter-js/core/telemetry
@igniter-js/core/store
```

---

## 🧾 Action Context Reference

Every handler receives a fully typed `IgniterActionContext`.

```text
ctx.request.id          // request id
ctx.request.method      // HTTP method
ctx.request.path        // action path template
ctx.request.params      // path params from the template
ctx.request.query       // parsed & validated query
ctx.request.body        // parsed & validated body
ctx.request.headers     // Headers
ctx.request.cookies     // IgniterCookie helper
ctx.request.ip          // resolved IP (if available)
ctx.request.device      // parsed device info (if available)
ctx.request.geo         // geo info (if available)
ctx.request.raw         // original Request

ctx.context             // merged context + middleware output
ctx.plugins             // plugin registry (if configured)
ctx.realtime            // realtime api (if store configured)
ctx.cache               // cache api (if store configured)
ctx.response            // IgniterResponseProcessor
ctx.telemetry           // telemetry session (optional)
```

---

## 🧩 Client Options Reference

### Query options (`useQuery`)

```typescript
type QueryActionCallerOptions<TAction> = {
  enabled?: boolean;
  initialData?: Awaited<TAction["$Infer"]["$Output"]>;
  query?: TAction["$Infer"]["query"];
  params?: TAction["$Infer"]["params"];
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  credentials?: RequestCredentials;
  staleTime?: number;
  refetchInterval?: number;
  refetchIntervalInBackground?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
  onLoading?: (isLoading: boolean) => void;
  onRequest?: (response: Awaited<TAction["$Infer"]["$Response"]>) => void;
  onSuccess?: (data: Awaited<TAction["$Infer"]["$Output"]>) => void;
  onError?: (error: Awaited<TAction["$Infer"]["$Errors"]>) => void;
  onSettled?: (data: Awaited<TAction["$Infer"]["$Output"]> | null, error?: Awaited<TAction["$Infer"]["$Errors"]> | null) => void;
};
```

### Mutation options (`useMutation`)

```typescript
type MutationActionCallerOptions<TAction> = {
  query?: TAction["$Infer"]["query"];
  params?: TAction["$Infer"]["params"];
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  credentials?: RequestCredentials;
  onLoading?: (isLoading: boolean) => void;
  onRequest?: (response: Awaited<TAction["$Infer"]["$Response"]>) => void;
  onSuccess?: (data: Awaited<TAction["$Infer"]["$Output"]>) => void;
  onError?: (error: Awaited<TAction["$Infer"]["$Errors"]>) => void;
  onSettled?: (data: Awaited<TAction["$Infer"]["$Output"]> | null, error?: Awaited<TAction["$Infer"]["$Errors"]> | null) => void;
};
```

### Realtime options (`useRealtime`)

```typescript
type RealtimeActionCallerOptions<TAction> = {
  initialData?: Awaited<TAction["$Infer"]["$Output"]>;
  query?: TAction["$Infer"]["query"];
  params?: TAction["$Infer"]["params"];
  onMessage?: (response: Awaited<TAction["$Infer"]["$Response"]>) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
};
```

---

## 🧠 Provider Options

```typescript
type IgniterProviderOptions = {
  enableRealtime?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  debug?: boolean;
  getContext?: () => Promise<any> | any;
  getScopes?: (ctx: any) => Promise<string[] | { key: string; identifier: string }[]> | string[] | { key: string; identifier: string }[];
};
```

---

## 🧷 Error Codes Reference

These are common error codes emitted by the core pipeline:

```text
BODY_PARSE_ERROR
REALTIME_NOT_CONFIGURED
CONTROLLER_NOT_FOUND
ACTION_NOT_FOUND
VALIDATION_ERROR
INTERNAL_SERVER_ERROR
INITIALIZATION_ERROR
GENERIC_ERROR
UNKNOWN_ERROR
ERR_BAD_REQUEST
ERR_UNAUTHORIZED
ERR_FORBIDDEN
ERR_NOT_FOUND
ERR_REDIRECT
SERIALIZATION_ERROR
RATE_LIMIT_EXCEEDED
```

---

## 🍳 Cookbook (Patterns You Can Copy)

### Pattern 1: Query with optional schema

```typescript
const health = igniter.query({
  path: "/health",
  query: z.object({ verbose: z.boolean().optional() }).optional(),
  handler: async ({ request, response }) => {
    return response.success({ ok: true, verbose: request.query?.verbose });
  },
});
```

### Pattern 2: Mutation with custom method

```typescript
const updateUser = igniter.mutation({
  path: "/users/:id",
  method: "PATCH",
  body: z.object({ name: z.string().min(1) }),
  handler: async ({ request, response }) => {
    return response.success({ id: request.params.id, name: request.body.name });
  },
});
```

### Pattern 3: Controller with nested actions

```typescript
const files = igniter.controller({
  path: "/files",
  actions: {
    list: igniter.query({ path: "/", handler: async ({ response }) => response.success({ items: [] }) }),
    get: igniter.query({ path: "/:id", handler: async ({ request, response }) => response.success({ id: request.params.id }) }),
  },
});
```

### Pattern 4: Global middleware for request timing

```typescript
const timing = igniter.procedure({
  name: "timing",
  handler: async (_options, ctx) => {
    const start = performance.now();
    const result = await ctx.next();
    const duration = performance.now() - start;
    ctx.response.setHeader("x-response-time", `${duration.toFixed(2)}ms`);
    return result;
  },
});

router.addMiddleware(timing());
```

### Pattern 5: Accessing cookies

```typescript
const session = igniter.query({
  path: "/session",
  handler: async ({ request, response }) => {
    const sessionId = request.cookies.get("session_id");
    return response.success({ sessionId });
  },
});
```

### Pattern 6: Response with headers

```typescript
handler: async ({ response }) => {
  return response
    .status(201)
    .setHeader("x-service", "igniter")
    .success({ ok: true });
}
```

### Pattern 7: Body validation with Zod

```typescript
const createPost = igniter.mutation({
  path: "/posts",
  method: "POST",
  body: z.object({ title: z.string(), body: z.string() }),
  handler: async ({ request, response }) => response.created(request.body),
});
```

### Pattern 8: Query validation with Zod

```typescript
const search = igniter.query({
  path: "/search",
  query: z.object({ q: z.string().min(2) }),
  handler: async ({ request, response }) => response.success({ q: request.query.q }),
});
```

### Pattern 9: Use `router.caller` for tests

```typescript
const result = await router.caller.users.list.query({ params: {}, query: {} });
expect(result.data?.users).toBeDefined();
```

### Pattern 10: Use `createIgniterClient` on server

```typescript
import { createIgniterClient } from "@igniter-js/core/client";

const serverClient = createIgniterClient({
  router,
  baseURL: "http://localhost:3000",
  basePATH: "/api/v1",
});
await serverClient.users.list.query({ params: {}, query: {} });
```

### Pattern 11: `useQuery` with stale time

```tsx
const users = client.users.list.useQuery({ staleTime: 10_000 });
```

### Pattern 12: `useMutation` with retry

```tsx
const update = client.users.update.useMutation({
  onError: () => update.retry(),
});
```

### Pattern 13: Real-time stream subscription

```tsx
const stream = client.notifications.stream.useRealtime({
  query: { channel: "user" },
  onMessage: ({ data }) => console.log(data),
});
```

### Pattern 14: Access action params

```typescript
handler: async ({ request, response }) => {
  const id = request.params.id;
  return response.success({ id });
}
```

### Pattern 15: Custom error responses

```typescript
handler: async ({ response }) => {
  return response.error("ERR_BAD_REQUEST", "Invalid user input");
}
```

### Pattern 16: Realtime publish (store-backed)

```typescript
handler: async ({ realtime, response }) => {
  await realtime.publish("notifications.new", { title: "Hello" });
  return response.success({ ok: true });
}
```

### Pattern 17: Use cache invalidation

```typescript
handler: async ({ cache, response }) => {
  await cache.invalidate(["users.list"]).catch(() => undefined);
  return response.noContent();
}
```

### Pattern 18: Revalidation with scopes

```typescript
handler: async ({ response }) => {
  return response
    .success({ ok: true })
    .scope("user", "usr_1")
    .revalidate({ paths: ["/profile"] });
}
```

### Pattern 19: Attach custom metadata

```typescript
handler: async ({ response }) => {
  response.setHeader("x-request-id", crypto.randomUUID());
  return response.success({ ok: true });
}
```

### Pattern 20: Health check controller

```typescript
const healthController = igniter.controller({
  path: "/health",
  actions: {
    check: igniter.query({
      path: "/",
      handler: async ({ response }) => response.success({ ok: true }),
    }),
  },
});
```

---

## 🧠 Type Inference Examples

### Inference 1: Params from path

```typescript
const getUser = igniter.query({
  path: "/users/:id",
  handler: async ({ request, response }) => {
    const id = request.params.id; // string
    return response.success({ id });
  },
});
```

### Inference 2: Body from schema

```typescript
const createUser = igniter.mutation({
  path: "/users",
  method: "POST",
  body: z.object({ name: z.string(), age: z.number() }),
  handler: async ({ request, response }) => {
    const name = request.body.name; // string
    const age = request.body.age; // number
    return response.created({ name, age });
  },
});
```

### Inference 3: Query from schema

```typescript
const searchUsers = igniter.query({
  path: "/users",
  query: z.object({ q: z.string() }),
  handler: async ({ request, response }) => {
    return response.success({ q: request.query.q });
  },
});
```

### Inference 4: Middleware context

```typescript
const withTenant = igniter.procedure({
  name: "tenant",
  handler: async (_options, ctx) => {
    return { tenantId: ctx.request.headers.get("x-tenant-id") || "default" };
  },
});

const tenants = igniter.query({
  path: "/tenants",
  use: [withTenant()],
  handler: async ({ context, response }) => {
    return response.success({ tenantId: context.tenantId });
  },
});
```

### Inference 5: Plugin context

```typescript
const igniter = Igniter.create()
  .withContext<AppContext>()
  .addPlugin("audit", audit)
  .build();

const action = igniter.query({
  path: "/audit",
  handler: async ({ plugins, response }) => {
      await plugins.audit.actions.create({ action: "read" });
    return response.success({ ok: true });
  },
});
```

### Inference 6: Router caller types

```typescript
const result = await router.caller.users.list.query({ params: {}, query: {} });
result.data?.users; // inferred type
```

### Inference 7: Client hook types

```tsx
const { data } = client.users.list.useQuery({ query: { includePosts: true } });
data?.users; // inferred type
```

### Inference 8: Realtime output types

```tsx
const stream = client.events.stream.useRealtime();
stream.data; // inferred stream payload type
```

### Inference 9: Response envelope

```typescript
const action = igniter.query({
  path: "/hello",
  handler: async ({ response }) => response.success({ message: "hi" }),
});

// Inference: { data: { message: string }, error: null }
```

### Inference 10: Error envelopes

```typescript
const action = igniter.query({
  path: "/nope",
  handler: async ({ response }) => response.notFound("Missing"),
});
```

---

## 📜 Response Data Shapes

### Success envelope

```typescript
type IgniterResponseSuccess<T> = { data: T; error: null };
```

### Error envelope

```typescript
type IgniterResponseError = {
  data: null;
  error: {
    code: string;
    message?: string;
    data?: unknown;
  };
};
```

---

## 🧭 Router Builder Hooks

### onRequest + onResponse

```typescript
const router = igniter.router
  .create()
  .onRequest((req) => {
    console.log("Incoming", req.method, req.url);
  })
  .onResponse((res, req) => {
    console.log("Outgoing", res.status, req.url);
  })
  .build();
```

### onError

```typescript
const router = igniter.router
  .create()
  .onError((error, ctx, req) => {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  })
  .build();
```

---

## 📘 Docs & Playground Config (Legacy)

```typescript
Igniter.create()
  .docs({
    openapi: {},
    info: {
      title: "My API",
      version: "1.0.0",
      description: "Public API",
    },
    servers: [{ url: "https://api.example.com" }],
    playground: {
      enabled: true,
      route: "/docs",
      security: async (req) => req.headers.get("x-admin") === "true",
    },
  })
  .build();
```

---

## 📊 Telemetry Attributes (Highlights)

These attributes are emitted across the core pipeline. Use them for dashboards and alerts.

```text
ctx.http.method
ctx.http.path_key
ctx.http.duration_ms
ctx.http.status_code
ctx.route.method
ctx.route.path_key
ctx.route.duration_ms
ctx.body.content_type
ctx.body.size_bytes
ctx.context.duration_ms
ctx.middleware.name
ctx.middleware.type
ctx.action.path_key
ctx.action.method
ctx.action.duration_ms
ctx.response.type
ctx.response.status_code
ctx.response.size_bytes
ctx.cache.policy
ctx.cache.tags_count
ctx.revalidate.paths_count
ctx.realtime.channels_count
ctx.error.code
ctx.error.message
```

---

## 🧱 Server Adapters

### Use a specific server adapter

```typescript
import { IgniterServer, IgniterServerNodeAdapter } from "@igniter-js/core";

const server = IgniterServer.create(router.handler, {
  adapter: new IgniterServerNodeAdapter(),
});

await server.listen(3000);
```

---

## 🗂 Store Events (Core)

Use `IgniterCoreStoreEvents` to register Store events used by core revalidation and SSE.

```typescript
import { IgniterCoreStoreEvents } from "@igniter-js/core/store";

// Example: add core events into your store event registry
store.events.addEvents(IgniterCoreStoreEvents);
```

Event groups included:

```text
http.revalidate.requested
http.cache.tagged
http.sse:connection.opened
http.sse:connection.closed
http.sse:event.delivered
http.realtime:event.published
```

---

## 🛰️ Realtime Scopes

Scopes allow isolating streams and cache per tenant/user.

```typescript
handler: async ({ response }) => {
  return response
    .success({ ok: true })
    .scope("tenant", "tenant_1")
    .revalidate({ paths: ["/tenant/dashboard"] });
}
```

---

## 📚 Extended API Tables

### IgniterProvider options

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| enableRealtime | boolean | true | Enables SSE connection |
| autoReconnect | boolean | true | Reconnect on disconnect |
| maxReconnectAttempts | number | 5 | Max retries |
| reconnectDelay | number | 1000 | Base delay in ms |
| debug | boolean | false | Console logs |
| getContext | function | - | Returns context for scopes |
| getScopes | function | - | Scope list (string or entries) |

### Router builder hooks

| Hook | Signature | When |
| --- | --- | --- |
| onRequest | `(request) => void` | Before processing |
| onResponse | `(response, request) => void` | After response |
| onError | `(error, context, request) => Response` | On pipeline errors |

### CORS options

| Field | Type | Default |
| --- | --- | --- |
| origins | string \| string[] \| function | "*" |
| methods | string[] | GET, POST, PUT, DELETE, PATCH, OPTIONS |
| allowedHeaders | string[] | Content-Type, Authorization |
| exposedHeaders | string[] | [] |
| credentials | boolean | false |
| maxAge | number | 86400 |

### Rate limit options

| Field | Type | Default |
| --- | --- | --- |
| max | number | 100 |
| windowSeconds | number | 60 |
| keyGenerator | function | uses IP |
| skip | function | - |
| onLimit | function | 429 response |
| store | RateLimitStore | MemoryRateLimitStore |

---

## 📦 Additional Examples (Edge Cases)

### Example: Avoiding double JSON parsing

```typescript
handler: async ({ response }) => {
  return response.json({ ok: true });
}
```

### Example: Explicit status + noContent

```typescript
handler: async ({ response }) => {
  return response.status(204).noContent();
}
```

### Example: Custom headers + caching

```typescript
handler: async ({ response }) => {
  return response
    .setHeader("x-cache", "hit")
    .success({ ok: true })
    .cache({ policy: "public", tags: ["public:stats"] });
}
```

### Example: Metrics action

```typescript
const metrics = igniter.query({
  path: "/metrics",
  handler: async ({ response }) => response.success({ uptime: process.uptime() }),
});
```

### Example: SSE from query

```typescript
const stream = igniter.query({
  path: "/stream",
  stream: true,
  handler: async ({ response }) => response.stream({ channelId: "stream" }),
});
```

### Example: Rate limit skip for health

```typescript
router.addMiddleware(createRateLimitMiddleware({
  skip: (req) => new URL(req.url).pathname === "/health",
}));
```

---

## 📚 Type Reference (Detailed)

### IgniterRouter shape

```typescript
type IgniterRouter = {
  caller: Record<string, any>;
  controllers: Record<string, any>;
  config: { baseURL?: string; basePATH?: string };
  handler: (request: Request) => Promise<Response>;
  listen: (options?: number | { port: number; hostname?: string }) => Promise<any>;
  $builder?: {
    middlewares: any[];
    errorHandler?: any;
    healthCheck?: { path: string };
    cors?: any;
    rateLimit?: any;
    onRequest?: any;
    onResponse?: any;
  };
  $Infer: { $context: any; $plugins: any };
};
```

### IgniterActionContext shape

```typescript
type IgniterActionContext = {
  request: {
    id: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    params: Record<string, string>;
    headers: Headers;
    cookies: IgniterCookie;
    ip?: string;
    device?: { device?: string; os?: string; browser?: string };
    geo?: { country?: string; region?: string; city?: string };
    body?: any;
    query?: any;
    raw: Request;
  };
  context: Record<string, any>;
  response: IgniterResponseProcessor;
  realtime: any;
  cache: any;
  telemetry?: any;
  plugins?: Record<string, any>;
};
```

### Response processor fluent API

```typescript
response
  .status(200)
  .setHeader("x-demo", "1")
  .setCookie("session", "abc")
  .success({ ok: true })
  .cache({ policy: "public" })
  .revalidate({ paths: ["/dashboard"] })
  .toResponse();
```

### Client caller shape

```typescript
client.users.list.query({ params: {}, query: {} });
client.users.list.useQuery({ query: { page: 1 } });
client.users.create.mutate({ body: { name: "Ada" }, params: {}, query: {} });
```

---

## ❓ FAQ

### Do I need a Store to use core?

No. Store is optional. You only need it for realtime events, cache invalidation, and revalidation flows.

### How do I enable SSE?

Use `response.stream()` in a query action and wrap your app with `IgniterProvider` on the client.

### Can I call actions without HTTP?

Yes. Use `router.caller` on the server to invoke actions directly in a type-safe manner.

### Where should I put middleware?

- **Global middleware** → `router.addMiddleware()`
- **Action-specific middleware** → `use: [procedure()]` on a query/mutation

### Is telemetry required?

No. Telemetry is optional and only used if you pass a manager to `withTelemetry()`.

---

## 🔄 Migration Notes (Deprecated APIs)

The builder exposes a few deprecated methods for compatibility. Prefer the new `with*` methods.

| Deprecated | Replacement |
| --- | --- |
| `context()` | `withContext()` |
| `config()` | `withConfig()` |
| `store()` | `withStore()` |
| `logger()` | `withLogger()` |
| `telemetry()` | `withTelemetry()` |
| `plugins()` | `addPlugin()` |
| `jobs()` | External jobs management |
| `docs()` | External docs tooling (still supported, but deprecated) |
| `create()` | `build()` |

---

## 📖 Glossary

- **Action** — A query or mutation definition.
- **Adapter** — Bridge between Igniter and a runtime (Next.js, Express, server).
- **Builder** — Immutable config object that creates a router API.
- **Cache Processor** — Handles response cache + tags.
- **Caller** — Type-safe server-side invoker (`router.caller`).
- **Client** — Browser or server client produced by `createIgniterClient`.
- **Context** — Your app dependencies passed to actions.
- **Controller** — Groups actions with a shared path prefix.
- **CORS** — Cross-Origin Resource Sharing configuration.
- **Docs** — OpenAPI + playground configuration (legacy).
- **Handler** — Function that handles an HTTP request.
- **Hook** — Lifecycle callback for router (onRequest, onResponse).
- **IgniterCookie** — Helper for cookie parsing and signing.
- **IgniterResponseProcessor** — Fluent response builder.
- **Job** — Background task definition (jobs service).
- **Logger** — Structured logging interface.
- **Middleware** — Procedure that runs before an action handler.
- **Mutation** — Non-idempotent action (POST/PUT/PATCH/DELETE).
- **Namespace** — Grouping key for jobs or events.
- **OpenAPI** — API specification data.
- **Plugin** — Modular feature with actions/events/hooks.
- **Procedure** — Middleware definition.
- **Query** — Idempotent action (GET).
- **Realtime** — Store-backed SSE publish/subscribe.
- **Revalidate** — Notify clients to refetch cached data.
- **RequestProcessor** — Pipeline that executes an HTTP request.
- **Response Envelope** — `{ data, error }` shape.
- **Router** — Runtime entity that handles HTTP requests.
- **SSE** — Server-Sent Events transport.
- **Scope** — Identifier to isolate cache/realtime.
- **Telemetry** — Event emission for observability.
- **Type inference** — Automatic types from schemas and paths.

---

## 🧾 Appendix: Response Mappings

### Example: Validation error

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "data": { "field": "name" }
  }
}
```

### Example: Not found

```json
{
  "data": null,
  "error": {
    "code": "ERR_NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### Example: Success

```json
{
  "data": { "ok": true },
  "error": null
}
```

---

## 🧪 Example Gallery (More Copy/Paste)

### Gallery 1: Multi-controller router

```typescript
const router = igniter.router
  .create()
  .addController("users", usersController)
  .addController("posts", postsController)
  .addController("billing", billingController)
  .build();
```

### Gallery 2: Conditional response helper

```typescript
import { conditionalResponse } from "@igniter-js/core";

handler: async ({ response }) => {
  const user = null;
  return conditionalResponse(
    !user,
    () => response.notFound("User not found"),
    () => response.success({ user })
  );
}
```

### Gallery 3: Preserve union helper

```typescript
import { preserveUnion } from "@igniter-js/core";

handler: async ({ response }) => {
  return preserveUnion(
    Math.random() > 0.5
      ? response.success({ ok: true })
      : response.badRequest("Invalid")
  );
}
```

### Gallery 4: Using parseURL

```typescript
import { parseURL } from "@igniter-js/core";

const full = parseURL("https://api.example.com", "v1", "users");
```

### Gallery 5: Create a browser-only client

```typescript
const client = createIgniterClient({
  router,
  baseURL: "https://api.example.com",
  basePATH: "/api/v1",
});
```

### Gallery 6: Custom rate limit response

```typescript
router.addMiddleware(createRateLimitMiddleware({
  onLimit: (req, info) =>
    new Response(JSON.stringify({
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: info.resetAt,
    }), { status: 429 }),
}));
```

### Gallery 7: Use createRouterBuilder directly

```typescript
import { createRouterBuilder } from "@igniter-js/core";

const router = createRouterBuilder()
  .addController("users", usersController)
  .build();
```

### Gallery 8: Use server client in SSR

```typescript
const ssrClient = createIgniterClient({
  router,
  baseURL: "http://localhost:3000",
  basePATH: "/api/v1",
});
const data = await ssrClient.users.list.query({ params: {}, query: {} });
```

### Gallery 9: Force refetch

```tsx
const users = client.users.list.useQuery();
users.refetch();
```

### Gallery 10: On-demand invalidate

```tsx
const { invalidate } = useIgniterQueryClient();
invalidate(["users.list"]);
```

---

## 🗃 Sample Project Structure

```text
src/
  igniter.context.ts
  igniter.ts
  router.ts
  main.ts
  features/
    users/
      users.controller.ts
      users.schema.ts
    billing/
      billing.controller.ts
```

### src/igniter.context.ts

```typescript
export type AppContext = {
  db: { findUsers: () => Promise<any[]> };
  payments: { charge: (input: any) => Promise<{ id: string }> };
};
```

### src/igniter.ts

```typescript
import { Igniter } from "@igniter-js/core";
import type { AppContext } from "./igniter.context";

export const igniter = Igniter.create()
  .withContext<AppContext>()
  .build();
```

### src/features/users/users.controller.ts

```typescript
import { igniter } from "../../igniter";

export const usersController = igniter.controller({
  path: "/users",
  actions: {
    list: igniter.query({
      path: "/",
      handler: async ({ response }) => response.success({ users: [] }),
    }),
  },
});
```

### src/router.ts

```typescript
import { igniter } from "./igniter";
import { usersController } from "./features/users/users.controller";

export const router = igniter.router
  .create()
  .addController("users", usersController)
  .build();
```

### src/main.ts

```typescript
import { router } from "./router";

await router.listen(3000);
```

---

---

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE) for details.

## Links

- **Documentation:** https://igniterjs.com/docs/core
- **GitHub:** https://github.com/felipebarcelospro/igniter-js
- **NPM:** https://www.npmjs.com/package/@igniter-js/core
- **Issues:** https://github.com/felipebarcelospro/igniter-js/issues
