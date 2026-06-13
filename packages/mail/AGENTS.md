# AGENTS.md — @igniter-js/mail

> **Last Updated:** 2026-06-02
> **Version:** 1.0.0-alpha.0
> **Purpose:** Complete operational manual for code agents working on `@igniter-js/mail`. Covers internal architecture, maintenance workflows, and consumer patterns.

---

## I. PACKAGE VISION & CONTEXT

**@igniter-js/mail** is the transactional email layer of the Igniter.js ecosystem. It treats email as a first-class, typed, observable operation — not an afterthought.

### Problem Space

- **String-concatenation fragility:** Building HTML emails with string templates leads to runtime rendering bugs.
- **Payload uncertainty:** Backend code passes arbitrary data to templates; contracts drift silently.
- **Provider lock-in:** Changing ESPs (Resend → Postmark → SendGrid → SMTP) forces rewrites.
- **Zero observability:** Developers don't know when an email fails, why, or how long rendering took.

### Design Principles

1. **Type-safe templates** — React components + StandardSchemaV1 schemas = compile-time and runtime safety.
2. **Adapter abstraction** — A single `IgniterMailAdapter` interface. Swap providers with one config line.
3. **Queue-native** — `schedule()` enqueues through any `IgniterJobQueueAdapter`. No boilerplate.
4. **Telemetry-first** — 28 typed events across `send`, `schedule`, and `templates` groups.
5. **Server-only** — Browser shim prevents accidental client bundling.

---

## II. MAINTAINER GUIDE

### 1. FileSystem Topology

```
packages/mail/
├── src/
│   ├── index.ts                    # Main barrel export (all domains)
│   ├── shim.ts                     # Browser shim (throws server-only error)
│   ├── adapters/
│   │   ├── index.ts                # Barrel: exports all 5 adapters
│   │   ├── resend.adapter.ts       # Resend SDK wrapper
│   │   ├── postmark.adapter.ts     # Native fetch → Postmark API
│   │   ├── sendgrid.adapter.ts     # Native fetch → SendGrid API
│   │   ├── smtp.adapter.ts         # Nodemailer SMTP wrapper
│   │   └── mock.adapter.ts         # In-memory adapter for testing
│   ├── builders/
│   │   ├── index.ts                # Barrel
│   │   ├── main.builder.ts         # IgniterMailBuilder (aliased as IgniterMail)
│   │   └── template.builder.ts     # IgniterMailTemplateBuilder
│   ├── core/
│   │   ├── index.ts                # Barrel
│   │   └── manager.tsx             # IgniterMailManagerCore (runtime)
│   ├── errors/
│   │   ├── index.ts                # Barrel
│   │   └── mail.error.ts           # IgniterMailError + IgniterMailErrorCode
│   ├── telemetry/
│   │   └── index.ts                # IgniterMailTelemetryEvents
│   ├── types/
│   │   ├── index.ts                # Barrel
│   │   ├── adapter.ts              # IgniterMailAdapter, send params, credentials
│   │   ├── provider.ts             # IIgniterMail, options, queue config, hooks
│   │   └── templates.ts            # IgniterMailTemplateBuilt, meta, payload types
│   └── utils/
│       ├── index.ts                # Barrel
│       └── schema.ts               # IgniterMailSchema (StandardSchemaV1 wrapper)
├── AGENTS.md                       # ← This file
├── README.md                       # Consumer-facing documentation
├── CHANGELOG.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

### 2. Architecture Deep-Dive

#### 2.1 Builder Accumulation Pattern (Hybrid Immutable)

`IgniterMailBuilder` uses a **hybrid pattern** to balance type inference with ergonomics:

- **Mutable setters** (return `this`): `withFrom()`, `withAdapter()`, `withLogger()`, `withTelemetry()`, `withQueue()`, `onSendStarted()`, `onSendSuccess()`, `onSendError()`.
- **Immutable template expansion** (returns new builder): `addTemplate()`.

Each call to `addTemplate(key, template)` creates a **new builder instance** with the generic `TTemplates` extended by the new key + template type. This is the mechanism that ensures `send()` has perfect autocomplete for template keys and type-safe payload inference.

```typescript
// In main.builder.ts:
addTemplate<TKey extends string, TTemplate extends IgniterMailTemplateBuilt<any>>(
  key: TKey,
  template: TTemplate,
) {
  return new IgniterMailBuilder<
    TTemplates & { [K in TKey]: TTemplate }
  >({
    // Clones all state into the new builder...
    templates: {
      ...this.templates,
      [key]: template,
    } as TTemplates & { [K in TKey]: TTemplate },
    // ...
  })
}
```

**Why not make everything immutable?** Because `withFrom` and `withAdapter` don't change the generic signature — they'd just add allocation overhead for no inference benefit. Conversely, `addTemplate` MUST return a new instance because TypeScript can't retroactively narrow `this` generics.

#### 2.2 Rendering Pipeline

`IgniterMailManagerCore.send()` runs a 4-phase pipeline:

```
Phase 1: PRE-FLIGHT
  → emit telemetry 'igniter.mail.send.started'
  → await onSendStarted hook
  → resolve template from registry (throw MAIL_PROVIDER_TEMPLATE_NOT_FOUND if missing)

Phase 2: VALIDATION
  → pass params.data through template.schema via IgniterMailSchema.validateInput()
  → uses StandardSchemaV1 '~standard.validate' protocol
  → if issues exist → throw MAIL_PROVIDER_TEMPLATE_DATA_INVALID with issues in error.details
  → if no validator → data passes through as-is (passthrough behavior)

Phase 3: RENDERING
  → call template.render(validatedData) → ReactElement
  → call @react-email/components render(element) → HTML string
  → call @react-email/components render(element, { plainText: true }) → text string

Phase 4: DELIVERY
  → await adapter.send({ to, subject, html, text })
  → await onSendSuccess hook
  → emit telemetry 'igniter.mail.send.success'
```

On failure at any phase: catch → normalize to `IgniterMailError` → `onSendError` hook → telemetry error → throw.

#### 2.3 Queue Integration

`schedule()` lazily registers a job on the queue adapter:

```
schedule(params, date)
  ├─ Validate: date > now (throw MAIL_PROVIDER_SCHEDULE_DATE_INVALID)
  ├─ Validate: queue adapter exists (throw MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED)
  ├─ ensureQueueJobRegistered()
  │   ├─ Idempotent: if already registered → return
  │   ├─ If registering (concurrent) → await pending registration
  │   └─ Create passthrough schema → call queue.adapter.register({
  │       name: options.job ?? "send",
  │       input: passthroughSchema,
  │       handler: async ({ input }) => { await this.send(input) },
  │       ... other queue options
  │     })
  └─ queue.adapter.invoke({ id: "mail.send", input: params, delay })
```

Key detail: the queue handler simply calls `this.send(input)` — meaning the full rendering + validation pipeline runs inside the worker, not at schedule-time.

#### 2.4 Telemetry Implementation Map

Every public method follows the same telemetry pattern: started → success/error.

| Method | Started Event | Success Event | Error Event |
|--------|--------------|---------------|-------------|
| `send()` | `igniter.mail.send.started` | `igniter.mail.send.success` | `igniter.mail.send.error` |
| `schedule()` | `igniter.mail.schedule.started` | `igniter.mail.schedule.success` | `igniter.mail.schedule.error` |
| `templates.list()` | `igniter.mail.templates.list.started` | `igniter.mail.templates.list.success` | `igniter.mail.templates.list.error` |
| `templates.get()` | `igniter.mail.templates.get.started` | `igniter.mail.templates.get.success` | `igniter.mail.templates.get.error` |
| `templates.render()` | `igniter.mail.templates.render.started` | `igniter.mail.templates.render.success` | `igniter.mail.templates.render.error` |

**Attribute conventions:**
- `send` events use `mail.*` prefix: `mail.to`, `mail.template`, `mail.subject?`, `mail.duration_ms?`, `mail.error.code`, `mail.error.message`
- `schedule` events add: `mail.scheduled_at`, `mail.delay_ms`, `mail.queue_id?`
- `templates` events use `ctx.mail.*` prefix: `ctx.mail.template_id`, `ctx.mail.template.count`, `ctx.mail.duration_ms`, `ctx.mail.error.code`, `ctx.mail.error.message`
- PII (email content, raw data payloads) is NEVER included in telemetry attributes

#### 2.5 Logging Parity

For every public operation, the logger receives matching debug/info/error calls that mirror telemetry attributes:

```
send started   → logger.debug("IgniterMail.send started", { to, template })
send success   → logger.info("IgniterMail.send success", { to, template, durationMs })
send error     → logger.error("IgniterMail.send failed", normalizedError)
```

Rule: never log raw template payloads. Log only to, template key, and duration.

### 3. Operational Flow Mappings

#### `IgniterMailBuilder.create()`
1. Creates new `IgniterMailBuilder<{}>` with empty state.
2. Initializes internal `from`, `adapter`, `templates` as empty/undefined.
3. Returns builder. No validation at this point.

#### `builder.withFrom(from: string)`
1. Sets `this.from = from`.
2. Returns `this` (mutable).

#### `builder.withAdapter(provider: string, secret: string)`
1. If `secret` is falsy → throw `MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED`.
2. Switch on `provider`:
   - `"resend"` → `ResendMailAdapter.create({ secret, from: this.from })`
   - `"smtp"` → `SmtpMailAdapter.create({ secret, from: this.from })`
   - `"postmark"` → `PostmarkMailAdapter.create({ secret, from: this.from })`
   - `"sendgrid"` → `SendGridMailAdapter.create({ secret, from: this.from })`
   - default → throw `MAIL_PROVIDER_ADAPTER_NOT_FOUND`
3. Sets `this.adapter`.
4. Returns `this` (mutable).

#### `builder.withAdapter(adapter: IgniterMailAdapter)`
1. Sets `this.adapter = adapter`.
2. Returns `this` (mutable).

#### `builder.withQueue(adapter, options?)`
1. Sets `this.queue = { adapter, options }`.
2. Returns `this` (mutable).

#### `builder.addTemplate(key, template)`
1. Clones current state into new builder.
2. Merges `{ [key]: template }` into templates registry.
3. Returns new builder with extended generic `TTemplates & { [K in TKey]: TTemplate }`.

#### `builder.build(): IIgniterMail<TTemplates>`
1. If `!this.from` → throw `MAIL_PROVIDER_FROM_REQUIRED`.
2. If `!this.adapter` → throw `MAIL_PROVIDER_ADAPTER_REQUIRED`.
3. Constructs `IgniterMailManagerCore<TTemplates>` with all accumulated state.
4. Returns the manager instance.

#### `manager.send(params)`
Full pipeline described in §2.2. Error codes: `MAIL_PROVIDER_TEMPLATE_NOT_FOUND`, `MAIL_PROVIDER_TEMPLATE_DATA_INVALID`, `MAIL_PROVIDER_SEND_FAILED`.

#### `manager.schedule(params, date)`
Full pipeline described in §2.3. Error codes: `MAIL_PROVIDER_SCHEDULE_DATE_INVALID`, `MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED`, `MAIL_PROVIDER_SCHEDULE_FAILED`.

#### `manager.templates.list()`
1. Emit `igniter.mail.templates.list.started`.
2. Map `Object.entries(templateRegistry)` into `IgniterMailTemplateMeta[]`.
3. Emit `igniter.mail.templates.list.success` with count + duration.
4. Return results. Error code: `MAIL_PROVIDER_TEMPLATE_LIST_FAILED`.

#### `manager.templates.get(id)`
1. Emit `igniter.mail.templates.get.started`.
2. Lookup `templateRegistry[id]`. Return `null` if missing (not an error).
3. Build `IgniterMailTemplateMeta` from template. Emit success. Error code: `MAIL_PROVIDER_TEMPLATE_GET_FAILED`.

#### `manager.templates.render(id, variables?)`
1. Emit `igniter.mail.templates.render.started`.
2. Validate template exists; throw `MAIL_PROVIDER_TEMPLATE_NOT_FOUND` if missing.
3. Validate variables against schema (or passthrough). Throw `MAIL_PROVIDER_TEMPLATE_DATA_INVALID` if fails.
4. Render HTML + text via React Email.
5. Emit success with duration. Error code: `MAIL_PROVIDER_TEMPLATE_RENDER_FAILED`.

### 4. Type Graph & Dependencies

#### 4.1 Core Type Flow

```
IgniterMailBuilder<TTemplates>
  │
  ├─ addTemplate(key, tpl) → IgniterMailBuilder<TTemplates & { [K]: TTemplate }>
  │
  └─ build() → IgniterMailManagerCore<TTemplates> implements IIgniterMail<TTemplates>
       │
       ├─ send<T>(params: IgniterMailSendParams<TTemplates, T>)
       ├─ schedule<T>(params: IgniterMailSendParams<TTemplates, T>, date: Date)
       ├─ templates: IgniterMailTemplatesAPI<TTemplates>
       └─ $Infer: IgniterMailInfer<TTemplates>
            ├─ .Templates — key union
            ├─ .Payloads — key → payload map
            ├─ .SendInput — union of all send params
            └─ .ScheduleInput — [sendParams, Date] tuple
```

#### 4.2 Key Type Utilities

- **`IgniterMailTemplateKey<TTemplates>`** — Extracts valid string keys where the value type extends `IgniterMailTemplateBuilt<any>`.
- **`IgniterMailTemplatePayload<TTemplate>`** — Extracts `StandardSchemaV1.InferInput<TSchema>` from a template's schema generic.
- **`IgniterMailInfer<TTemplates>`** — Computed type helper exposed as `$Infer` on the runtime instance.

#### 4.3 Dependency Map

| Dependency | Type | Role |
|------------|------|------|
| `@igniter-js/common` | Production | `IgniterError` base class, `IgniterLogger`, `StandardSchemaV1` |
| `@react-email/components` | Production | HTML/text rendering from React elements |
| `react` | Peer | React element creation |
| `@igniter-js/core` | Peer (optional) | `IgniterJobQueueAdapter` interface |
| `@igniter-js/telemetry` | Peer (optional) | Telemetry event emission |
| `resend` | Peer (optional) | Resend SDK adapter |
| `nodemailer` | Peer (optional) | SMTP adapter |
| `zod` | Peer (optional) | Schema validation (any StandardSchemaV1 library works) |

### 5. Error Code Library

All errors normalize to `IgniterMailError` with a stable `IgniterMailErrorCode`:

| Code | Context | Trigger |
|------|---------|---------|
| `MAIL_PROVIDER_FROM_REQUIRED` | `build()` | `withFrom()` not called |
| `MAIL_PROVIDER_ADAPTER_REQUIRED` | `build()` | `withAdapter()` not called |
| `MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED` | `withAdapter(str, secret)` | `secret` is undefined/empty |
| `MAIL_PROVIDER_ADAPTER_NOT_FOUND` | `withAdapter(str, secret)` | Provider string unrecognized |
| `MAIL_PROVIDER_TEMPLATES_REQUIRED` | `build()` | Empty template registry (edge case) |
| `MAIL_PROVIDER_TEMPLATE_NOT_FOUND` | `send()`, `render()` | Template key missing from registry |
| `MAIL_PROVIDER_TEMPLATE_DATA_INVALID` | `send()`, `render()` | Schema validation failed; issues in `error.details` |
| `MAIL_PROVIDER_TEMPLATE_LIST_FAILED` | `templates.list()` | Unexpected error during list |
| `MAIL_PROVIDER_TEMPLATE_GET_FAILED` | `templates.get()` | Unexpected error during get |
| `MAIL_PROVIDER_TEMPLATE_RENDER_FAILED` | `templates.render()` | Rendering threw (non-validation) |
| `MAIL_PROVIDER_SCHEDULE_DATE_INVALID` | `schedule()` | Date is ≤ now |
| `MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED` | `schedule()` | No queue adapter |
| `MAIL_PROVIDER_SCHEDULE_FAILED` | `schedule()` | Queue invoke failed |
| `MAIL_PROVIDER_SEND_FAILED` | `send()` | Adapter delivery failed |
| `MAIL_ADAPTER_CONFIGURATION_INVALID` | Adapter `send()` | Adapter `secret` or `from` missing |
| `MAIL_TEMPLATE_CONFIGURATION_INVALID` | `IgniterMailTemplate.build()` | Missing subject, schema, or render |

### 6. Adapter Implementation Guide

Every built-in adapter follows this pattern:

```typescript
export class ExampleMailAdapter implements IgniterMailAdapter {
  static create(credentials: IgniterMailAdapterCredentials) {
    return new ExampleMailAdapter(credentials)
  }

  constructor(private readonly credentials: IgniterMailAdapterCredentials = {}) {}

  async send(params: IgniterMailAdapterSendParams): Promise<void> {
    // 1. Validate credentials
    if (!this.credentials.secret) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Example adapter secret is required',
      })
    }

    if (!this.credentials.from) {
      throw new IgniterMailError({
        code: 'MAIL_ADAPTER_CONFIGURATION_INVALID',
        message: 'Example adapter from is required',
      })
    }

    // 2. Call provider API
    // ...

    // 3. On failure, throw MAIL_PROVIDER_SEND_FAILED with provider diagnostics
    throw new IgniterMailError({
      code: 'MAIL_PROVIDER_SEND_FAILED',
      message: 'Example send failed',
      metadata: { status: response.status, body: responseBody },
    })
  }
}
```

Requirements for custom adapters:
- Implement `IgniterMailAdapter.send(params)`.
- Validate required credentials (`secret`, `from`).
- Throw `IgniterMailError` on failure with meaningful metadata.
- Never leak PII to error metadata.

### 7. Schema Validation Internals

`IgniterMailSchema.validateInput()` uses the StandardSchemaV1 protocol:

```typescript
static async validateInput<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  input: unknown,
): Promise<StandardSchemaV1.InferInput<TSchema>> {
  const standard = (schema as any)?.['~standard']

  if (!standard?.validate) {
    return input as StandardSchemaV1.InferInput<TSchema>  // Passthrough
  }

  const result = await standard.validate(input)

  if ((result as any)?.issues?.length) {
    throw new IgniterMailError({
      code: 'MAIL_PROVIDER_TEMPLATE_DATA_INVALID',
      message: 'Invalid mail template payload',
      statusCode: 400,
      details: (result as any).issues,  // StandardSchemaV1 Issue[]
    })
  }

  return ((result as any)?.value ?? input) as StandardSchemaV1.InferInput<TSchema>
}
```

**Passthrough behavior:** If a schema lacks the `~standard.validate` method, the input passes through unchecked. This is used internally for the queue registration job (which receives already-validated data from `send()`).

### 8. Browser Shim

The `src/shim.ts` file is critical for server-only safety. It:

1. Is mapped in `package.json` as the `browser` condition for all entry points.
2. Exports stubs for `IgniterMail`, `IgniterMailBuilder`, `IgniterMailTemplate`, all adapters, and `IgniterMailError`.
3. Every stub's `create()` throws a detailed error explaining the package is server-only.
4. The error message includes framework-specific guidance (Next.js App Router, Pages Router, etc.).

**Rule:** When adding a new public class, add a corresponding stub in `shim.ts`.

### 9. Maintenance Checklist

#### Adding a New Feature
1. Define types in `src/types/` (provider.ts for public API, adapter.ts for adapter concerns, templates.ts for template types).
2. Add builder method to `IgniterMailBuilder` — decide mutable vs. immutable based on whether generics change.
3. Implement logic in `IgniterMailManagerCore`.
4. If the feature introduces a new error condition, add the code to `IgniterMailErrorCode` in `src/errors/mail.error.ts`.
5. Define new telemetry events in `src/telemetry/index.ts`.
6. Add unit tests in the relevant `.spec.ts` file.
7. Run `pnpm typecheck` to verify inference isn't broken.
8. Run `pnpm build` to verify types are correctly exported.
9. Update this AGENTS.md and README.md.

#### Adding a New Adapter
1. Create `src/adapters/<name>.adapter.ts` following the pattern in §6.
2. Export from `src/adapters/index.ts`.
3. Add a case in `IgniterMailBuilder.withAdapter()` if it should support provider-string shorthand.
4. Add stub in `src/shim.ts`.
5. Add unit tests in `src/adapters/<name>.adapter.spec.ts`.
6. Update README.md adapter table.

#### Fixing a Bug
1. Create a minimal reproduction in the relevant `.spec.ts` / `.spec.tsx` file.
2. Identify the layer: Builder, Core Manager, or Adapter.
3. Apply the fix.
4. Run `pnpm typecheck` — type inference is fragile.
5. Run `pnpm test` to verify no regressions.
6. Update CHANGELOG.md.

### 10. Testing Strategy

| Test File | Coverage |
|-----------|----------|
| `src/core/manager.spec.tsx` | Send, schedule, templates, hooks, error handling |
| `src/builders/main.builder.spec.ts` | Builder type inference, configuration errors |
| `src/builders/template.builder.spec.ts` | Template builder validation |
| `src/adapters/resend.adapter.spec.ts` | Resend adapter |
| `src/adapters/postmark.adapter.spec.ts` | Postmark adapter |
| `src/adapters/sendgrid.adapter.spec.ts` | SendGrid adapter |
| `src/adapters/smtp.adapter.spec.ts` | SMTP adapter |
| `src/adapters/mock.adapter.spec.ts` | Mock adapter recording |
| `src/utils/schema.spec.ts` | Schema validation utilities |

---

## III. CONSUMER GUIDE (Abbreviated)

Full consumer documentation lives in [README.md](./README.md). This section provides the essential patterns for agents to generate correct consumer code.

### Distribution Anatomy

| Entry Point | Exports |
|-------------|---------|
| `@igniter-js/mail` | `IgniterMail`, `IgniterMailBuilder`, `IgniterMailTemplate`, `IgniterMailManagerCore`, `IgniterMailError`, all types |
| `@igniter-js/mail/adapters` | `ResendMailAdapter`, `PostmarkMailAdapter`, `SendGridMailAdapter`, `SmtpMailAdapter`, `MockMailAdapter` |
| `@igniter-js/mail/telemetry` | `IgniterMailTelemetryEvents`, `IgniterMailTelemetryEvents` type |

### Minimal Setup (Copy-Paste Ready)

```typescript
import { IgniterMail } from '@igniter-js/mail'
import { z } from 'zod'

export const mail = IgniterMail.create()
  .withFrom(process.env.MAIL_FROM!)
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', {
    subject: 'Welcome',
    schema: z.object({ name: z.string() }),
    render: ({ name }) => <Html><Text>Hello {name}</Text></Html>,
  })
  .build()
```

### Common Consumer Patterns

```typescript
// Send immediately
await mail.send({ to: '...', template: 'welcome', data: { name: 'Ada' } })

// Override subject
await mail.send({ to: '...', template: 'welcome', subject: 'Custom', data: { name: 'Ada' } })

// Schedule with queue
await mail.schedule(
  { to: '...', template: 'welcome', data: { name: 'Ada' } },
  new Date(Date.now() + 60_000)
)

// Preview rendering
const { html, text } = await mail.templates.render('welcome', { name: 'Ada' })

// List templates
const templates = await mail.templates.list()

// Get template metadata
const tpl = await mail.templates.get('welcome')  // null if missing

// Template builder (reusable)
const tpl = IgniterMailTemplate.create()
  .withSubject('Hello')
  .withSchema(z.object({ name: z.string() }))
  .withRender(({ name }) => <Text>Hi {name}</Text>)
  .build()

// Error handling
import { IgniterMailError } from '@igniter-js/mail'

try {
  await mail.send({ /* ... */ })
} catch (error) {
  if (error instanceof IgniterMailError) {
    console.error(error.code, error.message, error.metadata)
  }
}

// Type helpers
type Keys = typeof mail.$Infer.Templates
type Payload = typeof mail.$Infer.Payloads['welcome']
type Send = typeof mail.$Infer.SendInput
type Sched = typeof mail.$Infer.ScheduleInput
```

### Critical Rules for Agents Generating Consumer Code

1. **Always** chain `addTemplate()` results — each call returns a new builder.
2. **Always** call `withFrom()` and `withAdapter()` before `build()`.
3. **Never** import mail in browser/client code — it's server-only.
4. **Always** provide schemas for templates.
5. **Use** `schedule()` (not `send()`) when a queue adapter is configured and async delivery is desired.
6. **Use** `MockMailAdapter` in test code.
7. **Never** put secrets or PII in subject lines — telemetry captures subjects.

---

## IV. EXAMPLE LIBRARY

### A. Builder Patterns

```typescript
// A01 — Minimal chain
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', { subject: 'Hi', schema: z.object({ name: z.string() }), render: Welcome })
  .build()

// A02 — Template builder + inline
const tpl = IgniterMailTemplate.create()
  .withSubject('Hello')
  .withSchema(z.object({ name: z.string() }))
  .withRender(({ name }) => <Text>Hi {name}</Text>)
  .build()

const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('postmark', process.env.POSTMARK_SERVER_TOKEN!)
  .addTemplate('hello', tpl)
  .build()

// A03 — Full metadata
builder.addTemplate('report', {
  subject: 'Daily Report',
  schema: z.object({ date: z.string() }),
  render: ReportEmail,
  name: 'Daily Report',
  description: 'End-of-day summary',
  path: 'mail/reports/daily',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  variables: ['date'],
})
```

### B. Runtime Operations

```typescript
// B01 — send
await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })

// B02 — send with subject override
await mail.send({ to: 'user@example.com', template: 'welcome', subject: 'Special', data: { name: 'Ada' } })

// B03 — schedule
await mail.schedule(
  { to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } },
  new Date(Date.now() + 60_000)
)

// B04 — templates.list
const list = await mail.templates.list()

// B05 — templates.get (found)
const tpl = await mail.templates.get('welcome')

// B06 — templates.get (null)
const missing = await mail.templates.get('nonexistent')
if (!missing) { /* handle */ }

// B07 — templates.render
const { html, text } = await mail.templates.render('welcome', { name: 'Ada' })
```

### C. Adapters

```typescript
// C01 — Provider string (Resend)
builder.withAdapter('resend', process.env.RESEND_API_KEY!)

// C02 — Provider string (Postmark)
builder.withAdapter('postmark', process.env.POSTMARK_SERVER_TOKEN!)

// C03 — Provider string (SendGrid)
builder.withAdapter('sendgrid', process.env.SENDGRID_API_KEY!)

// C04 — Provider string (SMTP)
builder.withAdapter('smtp', 'smtps://user:pass@host:465')

// C05 — Adapter instance
const adapter = ResendMailAdapter.create({ secret: process.env.RESEND_API_KEY, from: 'no-reply@example.com' })
builder.withAdapter(adapter)

// C06 — Mock adapter
const adapter = MockMailAdapter.create()
builder.withAdapter(adapter)
// ... await mail.send(...)
expect(adapter.sent).toHaveLength(1)

// C07 — Mock clear
adapter.clear()

// C08 — Custom adapter
const custom: IgniterMailAdapter = {
  async send({ to, subject, html, text }) {
    await myService.deliver({ to, subject, html, text })
  },
}
```

### D. Hooks

```typescript
// D01 — onSendStarted
builder.onSendStarted(async ({ to, template }) => {
  await auditLog.create({ event: 'mail.started', to, template })
})

// D02 — onSendSuccess
builder.onSendSuccess(async ({ to, template }) => {
  await analytics.track('email.sent', { template })
})

// D03 — onSendError
builder.onSendError(async ({ to, template }, error) => {
  await alerts.notify({ template, error: error.message })
})
```

### E. Queue

```typescript
// E01 — withQueue
builder.withQueue(queueAdapter, {
  queue: 'mail',
  job: 'send',
  attempts: 3,
  priority: 5,
  removeOnComplete: true,
})

// E02 — withQueue minimal
builder.withQueue(queueAdapter)
```

### F. Telemetry & Logger

```typescript
// F01 — withTelemetry
const telemetry = IgniterTelemetry.create()
  .withService('api')
  .addEvents(IgniterMailTelemetryEvents)
  .build()
builder.withTelemetry(telemetry)

// F02 — withLogger
builder.withLogger(logger)
```

### G. Type Helpers

```typescript
// G01 — Template keys
type Keys = typeof mail.$Infer.Templates

// G02 — Payload by key
type WelcomePayload = typeof mail.$Infer.Payloads['welcome']

// G03 — Send input union
type SendInput = typeof mail.$Infer.SendInput

// G04 — Schedule input tuple
type ScheduleInput = typeof mail.$Infer.ScheduleInput
```

### H. Error Handling

```typescript
// H01 — Catch and inspect
try {
  await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
} catch (error) {
  if (error instanceof IgniterMailError) {
    console.error(error.code)       // MAIL_PROVIDER_SEND_FAILED
    console.error(error.message)    // Human-readable
    console.error(error.metadata)   // Diagnostic context
    console.error(error.details)    // Schema issues (for TEMPLATE_DATA_INVALID)
  }
}
```

### I. Schema Utilities

```typescript
// I01 — Manual validation
const data = await IgniterMailSchema.validateInput(mySchema, rawInput)

// I02 — Passthrough schema
const passthrough = IgniterMailSchema.createPassthroughSchema()
```

### J. Multi-Template Service

```typescript
// J01 — Full service with logging, telemetry, hooks, queue, multiple templates
export const mail = IgniterMail.create()
  .withFrom(process.env.MAIL_FROM!)
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .withLogger(logger)
  .withTelemetry(telemetry)
  .withQueue(queueAdapter, { queue: 'mail', job: 'send', attempts: 3 })
  .onSendStarted(async (p) => { await db.audit.create({ event: 'mail.started', template: p.template }) })
  .onSendError(async (p, e) => { await alerts.notify({ template: p.template, error: e.message }) })
  .addTemplate('welcome', { /* ... */ })
  .addTemplate('resetPassword', { /* ... */ })
  .addTemplate('orderConfirmation', { /* ... */ })
  .addTemplate('shippingUpdate', { /* ... */ })
  .addTemplate('invoice', { /* ... */ })
  .build()
```

---

## V. VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-alpha.0 | 2026-01-29 | Initial alpha release |
