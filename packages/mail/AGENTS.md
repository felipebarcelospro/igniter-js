# AGENTS.md - @igniter-js/mail

> **Last Updated:** 2026-01-29
> **Version:** 1.0.0-alpha.0
> **Goal:** This document serves as the complete operational manual for Code Agents working on the @igniter-js/mail package.

---

## 1. Package Vision & Context

**@igniter-js/mail** is the definitive transactional email solution for the Igniter.js ecosystem. It is built on the premise that email templates should be as maintainable, type-safe, and expressive as the rest of an application's UI. By marrying **React Email** components with **StandardSchemaV1** validation and a robust **Adapter pattern**, this package ensures that sending an email is as predictable as rendering a web page.

### The Problem Space

In traditional backend development, email management is often an afterthought, leading to:

- **String Concatenation Mess:** Building HTML emails with string templates is error-prone and hard to debug.
- **Payload Uncertainty:** Backend services often pass data to templates that doesn't match the expected structure, resulting in broken emails.
- **Provider Rigidity:** Changing from one ESP (Email Service Provider) to another usually involves breaking changes across the codebase.
- **Observability Gaps:** Developers often don't know when an email fails, why it failed, or how long it took to render.

### The Igniter.js Vision

@igniter-js/mail provides a unified interface that abstracts away the complexities of email delivery:

1. **Expressive Templates:** Leverage the full power of React and Tailwind CSS (via React Email) to build beautiful, responsive emails.
2. **Contract-Based Sending:** Every template defines a schema. The package enforces this contract at the boundaries, ensuring that only valid data reaches your templates.
3. **Provider Agnostic:** Swap adapters (Resend, Postmark, SendGrid, SMTP) with a single line of configuration.
4. **Mission-Critical Reliability:** Built-in hooks for success/error tracking and deep integration with @igniter-js/jobs for guaranteed delivery via background queues.

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

Maintaining `@igniter-js/mail` requires understanding its modular structure. The package is divided into functional domains that strictly separate configuration, logic, and infrastructure.

#### Directory Breakdown

- **`src/adapters/`**: Infrastructure layer.
  - `index.ts`: Central export for all built-in adapters.
  - `resend.adapter.ts`: Wrapper for the Resend SDK.
  - `postmark.adapter.ts`: Native fetch-based implementation for Postmark (minimal dependency footprint).
  - `sendgrid.adapter.ts`: Native fetch-based implementation for SendGrid.
  - `smtp.adapter.ts`: Nodemailer-based implementation for traditional SMTP servers.
  - `mock.adapter.ts`: In-memory implementation that records all outgoing emails for assertion in unit tests.

- **`src/builders/`**: The Configuration API.
  - `main.builder.ts`: Implements `IgniterMailBuilder`. This is the entry point where `from`, `adapter`, and `queue` are configured. It uses a recursive generic pattern to accumulate template types.
  - `template.builder.ts`: Implements `IgniterMailTemplateBuilder`. A specialized builder for defining a template's metadata (subject, schema) and its React renderer.

- **`src/core/`**: The Processing Engine.
  - `manager.tsx`: Home of `IgniterMailManagerCore`. This class is the heart of the package. It handles the template registry, executes rendering, coordinates validation, and manages the execution of lifecycle hooks.

- **`src/errors/`**: Standardization of Failures.
  - `mail.error.ts`: Defines the `IgniterMailError` class and the `IgniterMailErrorCode` union. All errors within the package are normalized to this format.

- **`src/telemetry/`**: Observability Registry.
  - `index.ts`: Defines the `IgniterMailTelemetryEvents` namespace. It captures the start, success, and error states of both immediate (`send`) and scheduled (`schedule`) operations.

- **`src/types/`**: Pure Type Definitions.
  - `adapter.ts`: Defines the `IgniterMailAdapter` interface and associated parameter types.
  - `templates.ts`: Defines the structure of built templates and helper types for key/payload extraction.
  - `provider.ts`: Defines the main public interfaces (`IIgniterMail`) and initialization options.

- **`src/utils/`**: Shared Utilities.
  - `schema.ts`: Implements the `IgniterMailSchema` class, which provides agnostic handling of StandardSchemaV1 (supporting Zod and others).

- **`src/index.ts`**: The public entry point. It follows a strict barrel pattern with grouping comments.

- **`src/shim.ts`**: A critical file that prevents server-only logic from being included in client-side bundles.

---

### 3. Architecture Deep-Dive

#### 3.1 The Builder Accumulation Pattern

The `IgniterMailBuilder` uses a **hybrid immutable pattern**:

- `addTemplate(...)` returns a **new builder instance** to preserve template key inference.
- `withFrom(...)`, `withAdapter(...)`, `withLogger(...)`, `withTelemetry(...)`, and hooks **mutate the current builder instance** and return `this` for fluent chaining.

```typescript
export class IgniterMailBuilder<
  TTemplates extends Record<string, IgniterMailTemplateBuilt<any>>,
> {
  // ...
  addTemplate<
    TKey extends string,
    TTemplate extends IgniterMailTemplateBuilt<any>,
  >(
    key: TKey,
    template: TTemplate,
  ): IgniterMailBuilder<TTemplates & { [K in TKey]: TTemplate }> {
    // ...
  }
}
```

Each call to `addTemplate` returns a **new instance** of the builder where the generic `TTemplates` is extended. This ensures that:

1. The final `build()` method returns a manager instance that is fully aware of its registered templates.
2. The user gets perfect IDE autocomplete for template keys.
3. The `data` parameter in `mail.send()` is typed specifically to the selected template's schema.

#### 3.2 The Rendering Pipeline Internals

Rendering is a two-pass process handled within `IgniterMailManagerCore`:

1. **React Element Creation:** The template's `render` function is called with the validated data.
2. **HTML Generation:** `@react-email/components`' `render` is called on the element.
3. **Text Generation:** The same element is passed to `render` with the `plainText: true` option.

This duality ensures high deliverability, as many email clients and spam filters penalize emails that lack a plain-text version.

#### 3.3 Queue Integration Logic

The `schedule` method provides a seamless bridge to `@igniter-js/jobs`.

- If a queue adapter is provided, the manager automatically registers a "send" job on that queue.
- This job handler is a simple wrapper that calls `manager.send()` with the provided payload.
- This allows developers to move heavy email rendering and network calls out of the request lifecycle with zero boilerplate.

#### 3.4 Telemetry and Observability

The package integrates deeply with `@igniter-js/telemetry`. Every public method emits a `started` event, followed by either a `success` or `error` event.

- **Attributes:** Send/schedule events use `mail.*` attributes. Template events use `ctx.mail.*` attributes.
- **Privacy:** By default, PII (like email content or raw data objects) is **never** included in telemetry attributes.

---

### 4. Operational Flow Mapping (Pipelines)

#### Method: `IgniterMailBuilder.create()`

1. **Intent:** Initialize a fresh configuration chain.
2. **Execution:** Creates a new `IgniterMailBuilder` with default empty state.
3. **State:** `templates` is `{}`.

#### Method: `IgniterMailBuilder.withAdapter(provider, secret)`

1. **Validation:** Checks if `provider` is a known string ('resend', 'postmark', etc.).
2. **Validation:** Throws `MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED` if `secret` is missing.
3. **Instantiation:** Calls `ResendMailAdapter.create`, `PostmarkMailAdapter.create`, `SendGridMailAdapter.create`, or `SmtpMailAdapter.create`.
4. **Assignment:** Stores the adapter instance in the builder's state.
4. **Returns:** The updated builder instance.

#### Method: `IgniterMailBuilder.addTemplate(key, template)`

1. **Type Mapping:** Takes a `key` string and a template object (built via `IgniterMailTemplate.create()`).
2. **Merging:** Clones the current registry and adds the new template.
3. **Casting:** Returns a new builder instance cast to the intersection of the old templates and the new one.

#### Method: `IgniterMailManagerCore.send(params)`

1. **Entry:** User calls `mail.send({ to: '...', template: '...', data: { ... } })`.
2. **Telemetry (Started):** Emits `igniter.mail.send.started`.
3. **Hook (Started):** Awaits the execution of the `onSendStarted` hook.
4. **Template Retrieval:** Checks if the template exists. If not, throws `MAIL_PROVIDER_TEMPLATE_NOT_FOUND`.
5. **Validation:** Passes `params.data` through the template's schema.
   - If validation fails, throws `MAIL_PROVIDER_TEMPLATE_DATA_INVALID` with the schema issues in the `details` property.
6. **Rendering:** Executes the React component and generates HTML and Text strings.
7. **Adapter Execution:** Awaits `adapter.send()`.
   - If the adapter throws, the manager catches it, normalizes it to `MAIL_PROVIDER_SEND_FAILED`, and proceeds to the error flow.
8. **Telemetry (Success):** Emits `igniter.mail.send.success` with the calculated duration.
9. **Hook (Success):** Awaits the `onSendSuccess` hook.

#### Method: `IgniterMailManagerCore.schedule(params, date)`

1. **Entry:** User calls `mail.schedule(params, futureDate)`.
2. **Validation:** Ensures `futureDate` is > `now()`.
3. **Queue Check:** Ensures `this.queue` is configured.
4. **Idempotent Registration:** Calls `ensureQueueJobRegistered()` and registers the queue handler if needed.
5. **Invocation:** Calls `queue.adapter.invoke()` with a delay calculated from the target date.
6. **Telemetry:** Emits `igniter.mail.schedule.success` or `igniter.mail.schedule.error` on failure.

---

### 5. Dependency & Type Graph

Understanding the type flow is essential for maintaining the "automatic" feel of the package.

#### 5.1 Type Architecture

- **`IgniterMailAdapter`**: The base interface. Any object with a `send` method matching the signature can be used as an adapter.
- **`IgniterMailTemplateBuilt<TSchema>`**: Represents a template that is ready for consumption. It carries the generic `TSchema` so it can be extracted later.
- **`IgniterMailInfer<TTemplates>`**: This is a utility type that transforms the template registry into a consumable format for other packages:
  - `.Templates`: A union of string literal keys (e.g., `'welcome' | 'goodbye'`).
  - `.Payloads`: A map of keys to their inferred schema input types.

#### 5.2 Dependency Management

The package keeps a "Zero-Bloat" policy for production:

- **`react` and `@react-email/components`**: Required for template rendering.
- **`resend`, `nodemailer`**: Peer dependencies. They are not bundled, keeping the core package small.
- **`@igniter-js/common`**: Provides the foundational error class and logger interfaces.
- **`@igniter-js/core`**: Provides job interfaces used by the mail queue integration.
- **`@igniter-js/telemetry`**: Optional peer dependency. If missing, telemetry emission is safely skipped.

---

### 6. Maintenance Checklist

#### Feature Addition Workflow

1. [ ] Define the interface in `src/types/`.
2. [ ] Add configuration method to `IgniterMailBuilder` (ensure immutability).
3. [ ] Implement the logic in `IgniterMailManagerCore`.
4. [ ] If the feature involves a new error state, add the code to `IgniterMailErrorCode`.
5. [ ] Define new telemetry events if needed.
6. [ ] Add unit tests in the corresponding `.spec.ts` file.
7. [ ] Run `npm run build` to verify that types are correctly exported.

#### Bugfix Workflow

1. [ ] Create a reproduction test case in `src/core/manager.spec.tsx`.
2. [ ] Identify the layer (Builder, Core, or Adapter).
3. [ ] Apply the fix.
4. [ ] Verify that `npm run typecheck` still passes (inference is fragile).
5. [ ] Update `CHANGELOG.md` with a descriptive message following Conventional Commits.

---

### 7. Maintainer Troubleshooting

#### Q: The `schedule` method is throwing "Job not found".

**A:** This usually happens if the queue adapter's name resolution is inconsistent. Check `manager.tsx`'s `ensureQueueJobRegistered` method. Ensure that the name used in `register` matches exactly the name used in `invoke`.

#### Q: TypeScript is complaining that `TTemplates` is not assignable.

**A:** This happens in the `addTemplate` method of the builder. Because we are using an intersection type (`TTemplates & { ... }`), sometimes TypeScript gets lost if the registry gets too deep. Ensure you are using `as any` only where strictly necessary to "bridge" the generic transition.

#### Q: StandardSchemaV1 validation is being skipped.

**A:** Check `src/utils/schema.ts`. It looks for the `~standard` property on the schema object. If the user provided a plain object instead of a Zod schema (or a compatible one), the package defaults to a "passthrough" mode.

---

## II. CONSUMER GUIDE (Developer Manual)

### 8. Distribution Anatomy (Consumption)

`@igniter-js/mail` is architected to be runtime-agnostic but server-safe.

#### 8.1 Module Formats

- **ESM (`.mjs`)**: For modern Node.js, Bun, and Edge runtimes.
- **CommonJS (`.js`)**: For legacy Node.js support.
- **DTS (`.d.ts`)**: Full type definitions including all internal interfaces.

#### 8.2 Subpath Exports

We provide dedicated subpaths to optimize bundle size and organization:

- `@igniter-js/mail`: Main entry point (Builder, Manager).
- `@igniter-js/mail/adapters`: Direct access to adapter classes.
- `@igniter-js/mail/telemetry`: Telemetry event definitions.

#### 8.3 Browser Shim

The `shim.ts` ensures that your frontend bundle doesn't accidentally include `nodemailer` or other heavy server dependencies. If you see a "Server-only" error in your browser console, you've imported the mail service into a client component.

---

### 9. Quick Start & Common Patterns

#### Initializing the Service

```typescript
import { IgniterMail } from "@igniter-js/mail";
import { z } from "zod";
import { WelcomeEmail } from "./emails/WelcomeEmail";

export const mail = IgniterMail.create()
  .withFrom("system@myapp.com")
  .withAdapter("resend", process.env.RESEND_API_KEY!)
  .addTemplate("welcome", {
    subject: "Welcome to the Team!",
    schema: z.object({ name: z.string() }),
    render: WelcomeEmail,
  })
  .build();
```

#### Sending an Email

```typescript
await mail.send({
  to: "user@example.com",
  template: "welcome",
  data: { name: "John Doe" },
});
```

#### Overriding Subjects

```typescript
await mail.send({
  to: "user@example.com",
  template: "welcome",
  subject: "Special welcome for John!", // This overrides the default 'Welcome to the Team!'
  data: { name: "John" },
});
```

---

### 10. Real-World Use Case Library

#### Case 1: High-Performance Verification Emails

**Scenario:** A user signs up and needs an OTP code immediately.
**Solution:** Use the Resend adapter for ultra-low latency and send directly in the request.

```typescript
await mail.send({
  to: user.email,
  template: "verifyCode",
  data: { code: "123456" },
});
```

#### Case 2: Bulk Newsletter Delivery

**Scenario:** Sending a weekly update to 10,000 users.
**Solution:** Use `.withQueue()` and `mail.schedule()` to avoid timing out the main server.

```typescript
for (const user of subscribers) {
  await mail.schedule(
    {
      to: user.email,
      template: "weeklyUpdate",
      data: { content: updateContent },
    },
    new Date(),
  ); // Immediate but async via queue
}
```

#### Case 3: SaaS Multi-Tenant Support

**Scenario:** Different companies using the same platform need different "From" addresses.
**Solution:** Use a dynamic adapter instance or the `subject` override.

#### Case 4: Healthcare Compliance Reminders

**Scenario:** Patients must receive a HIPAA notice exactly 48 hours before surgery.
**Solution:** Use `mail.schedule()` with a precise target date.

```typescript
const surgeryDate = new Date(...);
const reminderDate = new Date(surgeryDate.getTime() - (48 * 60 * 60 * 1000));
await mail.schedule(params, reminderDate);
```

#### Case 5: E-commerce Order Tracking

**Scenario:** Providing real-time updates as a package moves.
**Solution:** Use hooks to update the database state when an email is successfully sent.

```typescript
.onSendSuccess(async (params) => {
  if (params.template === 'shippingUpdate') {
    await db.orders.update({ where: { id: params.data.orderId }, data: { notified: true } });
  }
})
```

#### Case 6: Education Platform Course Onboarding

**Scenario:** A sequence of 5 emails over 5 days.
**Solution:** Use `mail.schedule()` for each day in the sequence upon enrollment.

#### Case 7: Social Media Mention Alerts

**Scenario:** Frequent, small emails.
**Solution:** Use the Postmark adapter for its excellent deliverability and simple JSON API.

#### Case 8: HR Portal Application Status

**Scenario:** High PII (Personally Identifiable Information) sensitivity.
**Solution:** Use the SMTP adapter with a private company mail server to keep traffic internal.

#### Case 9: Logistics "Proof of Delivery"

**Scenario:** Attaching a link to a signed document.
**Solution:** React Email's `Link` component and Zod's `.url()` validation.

#### Case 10: Fintech Fraud Alerts

**Scenario:** Every millisecond counts.
**Solution:** Use the `onSendStarted` hook to immediately log the attempt to a high-speed audit log.

---

### 11. Domain-Specific Guidance

#### Fintech and Security

- **Strict Validation:** Use `z.object({ ... }).strict()` in your templates to prevent passing extra data that might be logged.
- **Telemetry:** Avoid putting transaction IDs or account numbers in the subject line, as they will be captured by telemetry.

#### Marketing and Newsletters

- **Spam Score:** Always provide a plain-text fallback. Igniter.js does this automatically, but ensure your component renders meaningful text (no "click here" only).
- **Unsubscribe:** Use provider-level tooling or custom adapter logic to add compliance headers.

#### E-commerce

- **HTML Size:** Some email clients (like Gmail) clip emails larger than 1024KB. Keep your React components lean and use hosted images instead of base64.

---

### 12. Best Practices & Anti-Patterns

| Practice                             | Why?                                              | Example                           |
| ------------------------------------ | ------------------------------------------------- | --------------------------------- |
| ✅ **Always define schemas**         | Prevents runtime rendering errors.                | `z.object({ name: z.string() })`  |
| ✅ **Use `MockMailAdapter` in CI**   | Fast, deterministic, and free.                    | `MockMailAdapter.create()`        |
| ✅ **Await `send` calls**            | Ensures errors are caught in the current context. | `await mail.send(...)`            |
| ✅ **Set `scheduledAt` for queues**  | Better visibility in your job manager.            | `mail.schedule(p, date)`          |
| ❌ **Don't use `any` in data**       | Breaks the primary value of this package.         | `data: { name: 123 } as any`      |
| ❌ **Don't put secrets in subjects** | Telemetry and logs will expose them.              | `subject: 'Your secret: 123'`     |
| ❌ **Don't hardcode FROM addresses** | Makes it hard to change environments.             | `withFrom(process.env.MAIL_FROM)` |

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 13. Exhaustive API Reference

#### Core Classes

| Symbol                   | Responsibility       | Key Methods                                         |
| ------------------------ | -------------------- | --------------------------------------------------- |
| `IgniterMail`            | Primary entry point  | `create()`                                          |
| `IgniterMailBuilder`     | Configuration engine | `withAdapter`, `withFrom`, `addTemplate`, `build`   |
| `IgniterMailManagerCore` | Runtime engine       | `send`, `schedule`, `$Infer`, `templates.*`         |
| `IgniterMailTemplate`    | Template definition  | `create`, `withSubject`, `withSchema`, `withRender` |

#### Adapters

| Adapter               | Provider         | Required Credential          |
| --------------------- | ---------------- | ---------------------------- |
| `ResendMailAdapter`   | Resend.com       | API Key                      |
| `PostmarkMailAdapter` | Postmarkapp.com  | Server Token                 |
| `SendGridMailAdapter` | Sendgrid.com     | API Key                      |
| `SmtpMailAdapter`     | Generic SMTP     | Connection URL (smtps://...) |
| `MockMailAdapter`     | Memory (Testing) | None                         |

#### Type Helpers

| Type               | Purpose                  | Usage                                                |
| ------------------ | ------------------------ | ---------------------------------------------------- |
| `$Infer.Templates` | Union of valid keys      | `type Keys = typeof mail.$Infer.Templates`           |
| `$Infer.Payloads`  | Map of payloads          | `type Data = typeof mail.$Infer.Payloads['welcome']` |
| `$Infer.SendInput` | Union of all send params | For reusable utility functions                       |

---

### 14. Telemetry & Observability Registry

The package exposes the following events via the `igniter.mail` namespace:

#### Group: `send`

| Event     | Attributes                                               | Context                                   |
| --------- | -------------------------------------------------------- | ----------------------------------------- |
| `started` | `mail.to`, `mail.template`, `mail.subject?`              | Emitted when `.send()` is called.         |
| `success` | `mail.to`, `mail.template`, `mail.subject?`, `mail.duration_ms?` | Emitted when the ESP accepts the email.   |
| `error`   | `mail.to`, `mail.template`, `mail.subject?`, `mail.error.code`, `mail.error.message`, `mail.duration_ms?` | Emitted on validation or network failure. |

#### Group: `schedule`

| Event     | Attributes                                                           | Context                               |
| --------- | -------------------------------------------------------------------- | ------------------------------------- |
| `started` | `mail.to`, `mail.template`, `mail.scheduled_at`, `mail.delay_ms`     | Emitted when `.schedule()` is called. |
| `success` | `mail.to`, `mail.template`, `mail.scheduled_at`, `mail.delay_ms`, `mail.queue_id?` | Emitted when the job is enqueued.     |
| `error`   | `mail.to`, `mail.template`, `mail.scheduled_at`, `mail.error.code`, `mail.error.message` | Emitted if the queue adapter fails.   |

#### Group: `templates`

| Event           | Attributes                                                                           | Context                                |
| --------------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| `list.started`  | `ctx.mail.template.count?`, `ctx.mail.duration_ms?`                                  | Emitted when `templates.list()` starts |
| `list.success`  | `ctx.mail.template.count?`, `ctx.mail.duration_ms?`                                  | Emitted when list resolves             |
| `list.error`    | `ctx.mail.template_id?`, `ctx.mail.error.code`, `ctx.mail.error.message`, `ctx.mail.duration_ms?` | Emitted on list failure |
| `get.started`   | `ctx.mail.template_id`, `ctx.mail.duration_ms?`                                      | Emitted when `templates.get()` starts  |
| `get.success`   | `ctx.mail.template_id`, `ctx.mail.duration_ms?`                                      | Emitted when get resolves              |
| `get.error`     | `ctx.mail.template_id?`, `ctx.mail.error.code`, `ctx.mail.error.message`, `ctx.mail.duration_ms?` | Emitted on get failure |
| `render.started`| `ctx.mail.template_id`, `ctx.mail.duration_ms?`                                      | Emitted when render starts             |
| `render.success`| `ctx.mail.template_id`, `ctx.mail.duration_ms?`                                      | Emitted when render resolves           |
| `render.error`  | `ctx.mail.template_id?`, `ctx.mail.error.code`, `ctx.mail.error.message`, `ctx.mail.duration_ms?` | Emitted on render failure |

---

### 15. Troubleshooting & Error Code Library

#### `MAIL_PROVIDER_ADAPTER_REQUIRED`

- **Context:** Occurs during `.build()`.
- **Cause:** You called `build()` before telling the service how to actually send emails.
- **Mitigation:** Ensure `.withAdapter()` is present in your builder chain.
- **Solution:** `mail.withAdapter('resend', 'key').build()`.

#### `MAIL_PROVIDER_FROM_REQUIRED`

- **Context:** Occurs during `.build()`.
- **Cause:** The default FROM address was not configured.
- **Mitigation:** Always call `.withFrom()` before `.build()`.
- **Solution:** `IgniterMail.create().withFrom('no-reply@acme.com').withAdapter(...).build()`.

#### `MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED`

- **Context:** Occurs during `.withAdapter(provider, secret)`.
- **Cause:** Provider string was provided without a secret.
- **Mitigation:** Ensure secrets are passed and exist in environment variables.
- **Solution:** `withAdapter('resend', process.env.RESEND_API_KEY!)`.

#### `MAIL_PROVIDER_ADAPTER_NOT_FOUND`

- **Context:** Occurs during `.withAdapter(provider, secret)`.
- **Cause:** Provider key is not one of `resend | postmark | sendgrid | smtp`.
- **Mitigation:** Validate provider names and avoid typos.
- **Solution:** Use a supported provider or pass a custom adapter instance.

#### `MAIL_PROVIDER_TEMPLATES_REQUIRED`

- **Context:** Occurs during `.build()`.
- **Cause:** The template registry is empty or missing.
- **Mitigation:** Register at least one template via `.addTemplate()`.
- **Solution:** `mail.addTemplate('welcome', template).build()`.

#### `MAIL_PROVIDER_TEMPLATE_NOT_FOUND`

- **Context:** Occurs during `.send()`.
- **Cause:** The string key provided for `template` does not exist in the builder's registry.
- **Mitigation:** Double-check typos and ensure `addTemplate` was called for that key.
- **Solution:** Check the `mail.addTemplate('welcom', ...)` typo.

#### `MAIL_PROVIDER_TEMPLATE_DATA_INVALID`

- **Context:** Occurs before rendering.
- **Cause:** The data object does not satisfy the template's schema (e.g., missing required fields).
- **Mitigation:** Check the `details` array of the error to see which Zod/Schema path failed.
- **Solution:** `data: { name: 'Valid String' }`.

#### `MAIL_PROVIDER_TEMPLATE_LIST_FAILED`

- **Context:** Occurs during `mail.templates.list()`.
- **Cause:** Unexpected failure while enumerating the template registry.
- **Mitigation:** Check for mutation or invalid template entries in the registry.
- **Solution:** Ensure all templates follow `IgniterMailTemplateBuilt` shape.

#### `MAIL_PROVIDER_TEMPLATE_GET_FAILED`

- **Context:** Occurs during `mail.templates.get()`.
- **Cause:** Unexpected failure while reading the template registry.
- **Mitigation:** Ensure the registry is not mutated at runtime.
- **Solution:** Rebuild the mail instance after modifying templates.

#### `MAIL_PROVIDER_TEMPLATE_RENDER_FAILED`

- **Context:** Occurs during `mail.templates.render()`.
- **Cause:** Rendering failed after validation (e.g., runtime errors inside the React template).
- **Mitigation:** Inspect the template render function for thrown errors.
- **Solution:** Render the template in isolation to reproduce the error.

#### `MAIL_PROVIDER_SEND_FAILED`

- **Context:** Occurs after rendering, during adapter execution.
- **Cause:** The ESP rejected the request (e.g., invalid API key, bounce, suppression list).
- **Mitigation:** Check the `metadata` property of the error for the raw provider response.
- **Solution:** Verify your API key and sender domain authorization.

#### `MAIL_PROVIDER_SCHEDULE_DATE_INVALID`

- **Context:** Occurs during `.schedule()`.
- **Cause:** The date provided is in the past.
- **Mitigation:** Ensure your scheduling logic accounts for clock drift and processing time.
- **Solution:** `mail.schedule(params, new Date(Date.now() + 5000))`.

#### `MAIL_PROVIDER_SCHEDULE_FAILED`

- **Context:** Occurs during `.schedule()`.
- **Cause:** The queue adapter rejected or failed the enqueue operation.
- **Mitigation:** Validate queue connection and retry policy.
- **Solution:** Check queue adapter logs and ensure the queue is reachable.

#### `MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED`

- **Context:** Occurs during `.schedule()`.
- **Cause:** Queue adapter was not configured via `.withQueue()`.
- **Mitigation:** Configure a queue adapter before scheduling.
- **Solution:** `IgniterMail.create().withQueue(queueAdapter, options).build()`.

#### `MAIL_ADAPTER_CONFIGURATION_INVALID`

- **Context:** Occurs when an adapter is missing `secret` or `from`.
- **Cause:** Adapter credentials are incomplete.
- **Mitigation:** Provide `secret` and `from` when creating adapters.
- **Solution:** `ResendMailAdapter.create({ secret, from })`.

#### `MAIL_TEMPLATE_CONFIGURATION_INVALID`

- **Context:** Occurs during `IgniterMailTemplate.build()`.
- **Cause:** Missing `subject`, `schema`, or `render`.
- **Mitigation:** Set all template components before building.
- **Solution:** `IgniterMailTemplate.create().withSubject(...).withSchema(...).withRender(...).build()`.

---

---

# IV. MAINTAINER APPENDIX (Deep Dive)

## 16. Builder State Model

The builder is intentionally mixed:

- **Mutable setters**: `withFrom`, `withAdapter`, `withLogger`, `withTelemetry`, `withQueue`, and hooks mutate the current instance.
- **Immutable template expansion**: `addTemplate` returns a new builder instance with expanded generics.

This ensures type inference remains precise without forcing every method to allocate a new builder.

## 17. Template Builder Internals

`IgniterMailTemplate` is a strict builder.

It validates three required fields:

1. `subject`
2. `schema`
3. `render`

Missing any of these throws `MAIL_TEMPLATE_CONFIGURATION_INVALID`.

## 18. Template Registry Flow (Expanded)

### `templates.list()`

1. Emit `igniter.mail.templates.list.started`.
2. Map each registry entry into `IgniterMailTemplateMeta`.
3. Emit `igniter.mail.templates.list.success` with count + duration.
4. Log success with count.

### `templates.get(id)`

1. Emit `igniter.mail.templates.get.started`.
2. Resolve template by key.
3. Return `null` if missing.
4. Emit `igniter.mail.templates.get.success`.

### `templates.render(id, variables)`

1. Emit `igniter.mail.templates.render.started`.
2. Validate template exists.
3. Validate payload with StandardSchemaV1 (if available).
4. Render HTML and text via React Email.
5. Emit `igniter.mail.templates.render.success`.

## 19. Queue Registration Pipeline

`schedule()` registers a job lazily.

1. Ensure queue adapter exists.
2. Register job named `options.job ?? "send"`.
3. Use passthrough schema for compatibility.
4. Handler calls `send(input)`.
5. Mark `queueJobRegistered` to avoid re-registering.

## 20. Telemetry Implementation Map

| Method | Start Event | Success Event | Error Event |
| --- | --- | --- | --- |
| `send` | `igniter.mail.send.started` | `igniter.mail.send.success` | `igniter.mail.send.error` |
| `schedule` | `igniter.mail.schedule.started` | `igniter.mail.schedule.success` | `igniter.mail.schedule.error` |
| `templates.list` | `igniter.mail.templates.list.started` | `igniter.mail.templates.list.success` | `igniter.mail.templates.list.error` |
| `templates.get` | `igniter.mail.templates.get.started` | `igniter.mail.templates.get.success` | `igniter.mail.templates.get.error` |
| `templates.render` | `igniter.mail.templates.render.started` | `igniter.mail.templates.render.success` | `igniter.mail.templates.render.error` |

## 21. Logging Parity Checklist

For every public operation:

- A debug log is emitted at start.
- An info log is emitted on success.
- An error log is emitted on failure.
- Logging attributes must mirror telemetry attributes.
- Never log raw template payloads.

## 22. Adapter Implementation Guide

Every adapter must:

- Implement `IgniterMailAdapter.send`.
- Validate required credentials (`secret`, `from`).
- Normalize errors as `IgniterMailError` when possible.
- Avoid leaking PII to logs or telemetry.

## 23. Maintainer Testing Checklist

- Add adapter tests in `src/adapters/*.spec.ts`.
- Add core tests for send/schedule/templates in `src/core/manager.spec.tsx`.
- Add builder tests for type inference in `src/builders/main.builder.spec.ts`.
- Add template builder tests in `src/builders/template.builder.spec.ts`.
- Add telemetry tests for each event group.

---

# V. CONSUMER APPENDIX (Practical Guide)

## 24. Distribution Anatomy (Expanded)

`@igniter-js/mail` exposes:

- **Main entry**: Builder, template builder, errors, types, utils.
- **Subpath `adapters`**: Adapter classes.
- **Subpath `telemetry`**: Telemetry events.

The browser shim ensures server-only safety.

## 25. Quick Start (Extended)

```typescript
import { IgniterMail } from '@igniter-js/mail'
import { z } from 'zod'
import { WelcomeEmail } from './emails/welcome'

export const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', {
    subject: 'Welcome',
    schema: z.object({ name: z.string() }),
    render: WelcomeEmail,
  })
  .build()
```

## 26. Consumer API Reference (Expanded)

### Builder Methods

- `create()`
- `withFrom(from: string)`
- `withAdapter(adapter: IgniterMailAdapter)`
- `withAdapter(provider: string, secret: string)`
- `withQueue(adapter: IgniterJobQueueAdapter, options?: IgniterMailQueueOptions)`
- `withLogger(logger: IgniterLogger)`
- `withTelemetry(telemetry: IgniterTelemetryManager)`
- `addTemplate(key, template)`
- `onSendStarted(handler)`
- `onSendError(handler)`
- `onSendSuccess(handler)`
- `build()`

### Runtime Methods

- `send(params)`
- `schedule(params, date)`
- `templates.list()`
- `templates.get(id)`
- `templates.render(id, variables?)`

## 27. Consumer Configuration Patterns

### Provider string + secret

```typescript
IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('postmark', process.env.POSTMARK_SERVER_TOKEN!)
```

### Adapter instance

```typescript
const adapter = ResendMailAdapter.create({
  secret: process.env.RESEND_API_KEY,
  from: 'no-reply@example.com',
})

IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter(adapter)
```

## 28. Consumer Real-World Use Cases (Expanded)

### Case 11: Multi-region notifications

```typescript
await mail.send({ to: user.email, template: 'regionNotice', data: { region: 'eu-west' } })
```

### Case 12: Marketplace receipts

```typescript
await mail.send({ to: buyer.email, template: 'receipt', data: { orderId: order.id } })
```

### Case 13: Banking daily digest

```typescript
await mail.schedule({ to: user.email, template: 'dailyDigest', data: { date: '2026-01-29' } }, tomorrow)
```

### Case 14: Travel check-in reminders

```typescript
await mail.schedule({ to: guest.email, template: 'checkIn', data: { hotel: 'Aster' } }, checkInDate)
```

### Case 15: Subscription renewal notice

```typescript
await mail.send({ to: user.email, template: 'renewal', data: { plan: 'Pro' } })
```

## 29. Consumer Best Practices (Expanded)

| ✅ Do | Why |
| --- | --- |
| Use `.withQueue()` for high-volume sending | Keeps request latency low |
| Validate data with schemas | Prevents invalid templates |
| Use `MockMailAdapter` for tests | Deterministic tests |
| Use hooks for side effects | Isolates delivery logic |

| ❌ Avoid | Why |
| --- | --- |
| Hardcoding secrets | Security risk |
| Importing mail in client bundles | Triggers server-only shim |
| Ignoring `MAIL_PROVIDER_TEMPLATE_DATA_INVALID` | Causes invalid emails |

---

# VI. EXAMPLE LIBRARY (30+)

## Example A01 — Minimal send

```typescript
await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
```

## Example A02 — Override subject

```typescript
await mail.send({ to: 'user@example.com', template: 'welcome', subject: 'Hello', data: { name: 'Ada' } })
```

## Example A03 — Render template for preview

```typescript
const preview = await mail.templates.render('welcome', { name: 'Ada' })
```

## Example A04 — Template list

```typescript
const list = await mail.templates.list()
```

## Example A05 — Template get

```typescript
const template = await mail.templates.get('welcome')
```

## Example A06 — Schedule an email

```typescript
await mail.schedule({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } }, new Date(Date.now() + 60_000))
```

## Example A07 — Create template via builder

```typescript
const template = IgniterMailTemplate.create()
  .withSubject('Welcome')
  .withSchema(z.object({ name: z.string() }))
  .withRender(({ name }) => <Text>Hello {name}</Text>)
  .build()
```

## Example A08 — Add template metadata

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  name: 'Welcome Email',
  description: 'First email',
  variables: ['name'],
})
```

## Example A09 — Logger integration

```typescript
builder.withLogger(logger)
```

## Example A10 — Telemetry integration

```typescript
builder.withTelemetry(telemetry)
```

## Example A11 — Mock adapter usage

```typescript
const adapter = MockMailAdapter.create()
```

## Example A12 — Reset mock adapter

```typescript
adapter.clear()
```

## Example A13 — Custom adapter

```typescript
const adapter: IgniterMailAdapter = { send: async () => undefined }
```

## Example A14 — Provider string adapter

```typescript
builder.withAdapter('resend', process.env.RESEND_API_KEY!)
```

## Example A15 — Provider instance adapter

```typescript
builder.withAdapter(ResendMailAdapter.create({ secret: process.env.RESEND_API_KEY, from: 'no-reply@example.com' }))
```

## Example A16 — Queue adapter

```typescript
builder.withQueue(queueAdapter, { queue: 'mail', job: 'send' })
```

## Example A17 — Hook: onSendStarted

```typescript
builder.onSendStarted(async ({ to }) => audit.log({ to }))
```

## Example A18 — Hook: onSendSuccess

```typescript
builder.onSendSuccess(async ({ to }) => analytics.track('mail.sent', { to }))
```

## Example A19 — Hook: onSendError

```typescript
builder.onSendError(async ({ to }, error) => alerts.notify({ to, error: error.message }))
```

## Example A20 — Type inference: template keys

```typescript
type Keys = typeof mail.$Infer.Templates
```

## Example A21 — Type inference: payloads

```typescript
type WelcomePayload = typeof mail.$Infer.Payloads['welcome']
```

## Example A22 — Type inference: send input

```typescript
type SendInput = typeof mail.$Infer.SendInput
```

## Example A23 — Type inference: schedule input

```typescript
type ScheduleInput = typeof mail.$Infer.ScheduleInput
```

## Example A24 — Template render output

```typescript
const { html, text } = await mail.templates.render('welcome', { name: 'Ada' })
```

## Example A25 — Error handling pattern

```typescript
try {
  await mail.send({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } })
} catch (error) {
  if (error instanceof IgniterMailError) {
    console.error(error.code)
  }
}
```

## Example A26 — Resend adapter

```typescript
const adapter = ResendMailAdapter.create({ secret: process.env.RESEND_API_KEY, from: 'no-reply@example.com' })
```

## Example A27 — Postmark adapter

```typescript
const adapter = PostmarkMailAdapter.create({ secret: process.env.POSTMARK_SERVER_TOKEN, from: 'no-reply@example.com' })
```

## Example A28 — SendGrid adapter

```typescript
const adapter = SendGridMailAdapter.create({ secret: process.env.SENDGRID_API_KEY, from: 'no-reply@example.com' })
```

## Example A29 — SMTP adapter

```typescript
const adapter = SmtpMailAdapter.create({ secret: process.env.SMTP_URL, from: 'no-reply@example.com' })
```

## Example A30 — Template metadata timestamps

```typescript
builder.addTemplate('report', {
  subject: 'Report',
  schema: z.object({ date: z.string() }),
  render: ReportEmail,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})
```

## Example A31 — Template variables

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  variables: ['name'],
})
```

## Example A32 — Schema passthrough

```typescript
const schema = IgniterMailSchema.createPassthroughSchema()
```

## Example A33 — Manual schema validation

```typescript
const validated = await IgniterMailSchema.validateInput(schema, { any: 'data' })
```

## Example A34 — Template render without send

```typescript
await mail.templates.render('welcome', { name: 'Ada' })
```

## Example A35 — Multiple templates

```typescript
const mail = IgniterMail.create()
  .withFrom('no-reply@example.com')
  .withAdapter('resend', process.env.RESEND_API_KEY!)
  .addTemplate('welcome', { subject: 'Welcome', schema: z.object({ name: z.string() }), render: WelcomeEmail })
  .addTemplate('reset', { subject: 'Reset', schema: z.object({ link: z.string().url() }), render: ResetEmail })
  .build()
```

## Example A36 — Template get null case

```typescript
const template = await mail.templates.get('missing')
if (!template) {
  console.log('missing')
}
```

## Example A37 — Queue schedule helper

```typescript
const sendLater = (params: typeof mail.$Infer.SendInput, date: Date) => mail.schedule(params, date)
```

## Example A38 — Hook side-effect example

```typescript
builder.onSendSuccess(async ({ to }) => db.notifications.insert({ to }))
```

## Example A39 — Telemetry event wire-up

```typescript
const telemetry = IgniterTelemetry.create().withService('api').addEvents(IgniterMailTelemetryEvents).build()
```

## Example A40 — Template rendering inside job handler

```typescript
queue.adapter.register({
  name: 'send',
  input: IgniterMailSchema.createPassthroughSchema(),
  handler: async ({ input }) => mail.send(input as any),
})
```

---

# VII. Troubleshooting Playbooks

## Playbook 1 — `MAIL_PROVIDER_TEMPLATE_DATA_INVALID`

1. Inspect `error.details` for schema issues.
2. Confirm template schema matches the data shape.
3. Validate that the template key is correct.

## Playbook 2 — `MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED`

1. Ensure `withQueue()` is called before `.build()`.
2. Confirm adapter registration happens once (no duplicate job names).

## Playbook 3 — Adapter credentials missing

1. Validate `secret` and `from` are set.
2. Use environment variables for secrets.

---

# VIII. Adapter Reference Patterns

## Resend adapter pattern

```typescript
const adapter = ResendMailAdapter.create({
  secret: process.env.RESEND_API_KEY,
  from: 'no-reply@example.com',
})
```

## Postmark adapter pattern

```typescript
const adapter = PostmarkMailAdapter.create({
  secret: process.env.POSTMARK_SERVER_TOKEN,
  from: 'no-reply@example.com',
})
```

## SendGrid adapter pattern

```typescript
const adapter = SendGridMailAdapter.create({
  secret: process.env.SENDGRID_API_KEY,
  from: 'no-reply@example.com',
})
```

## SMTP adapter pattern

```typescript
const adapter = SmtpMailAdapter.create({
  secret: process.env.SMTP_URL,
  from: 'no-reply@example.com',
})
```

---

# IX. Additional Example Library

## Example A41 — List templates and log names

```typescript
const templates = await mail.templates.list()
templates.forEach((t) => console.log(t.name))
```

## Example A42 — Render for plain text preview

```typescript
const { text } = await mail.templates.render('welcome', { name: 'Ada' })
```

## Example A43 — Multi-template inference

```typescript
type Payloads = typeof mail.$Infer.Payloads
```

## Example A44 — Custom adapter with monitoring

```typescript
const adapter: IgniterMailAdapter = {
  async send(params) {
    await monitor.track('mail.send', { to: params.to })
  },
}
```

## Example A45 — Hook for compliance logging

```typescript
builder.onSendSuccess(async ({ to, template }) => compliance.log({ to, template }))
```

## Example A46 — Queue options with limiter

```typescript
builder.withQueue(queueAdapter, {
  queue: 'mail',
  job: 'send',
  limiter: { max: 10, duration: 1000 },
})
```

## Example A47 — Schedule far in the future

```typescript
const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
await mail.schedule({ to: 'user@example.com', template: 'welcome', data: { name: 'Ada' } }, date)
```

## Example A48 — Template metadata path

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  path: 'mail/welcome',
})
```

## Example A49 — Template description

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  description: 'Sent on account creation',
})
```

## Example A50 — Template variables list

```typescript
builder.addTemplate('welcome', {
  subject: 'Welcome',
  schema: z.object({ name: z.string() }),
  render: WelcomeEmail,
  variables: ['name'],
})
```

## Example A51 — Guard against missing template

```typescript
const meta = await mail.templates.get('welcome')
if (!meta) throw new Error('Template missing')
```

## Example A52 — Use `IgniterMailSchema.validateInput`

```typescript
const validated = await IgniterMailSchema.validateInput(z.object({ ok: z.boolean() }), { ok: true })
```

## Example A53 — Schedule input type alias

```typescript
type ScheduleInput = typeof mail.$Infer.ScheduleInput
```

## Example A54 — Send input type alias

```typescript
type SendInput = typeof mail.$Infer.SendInput
```

## Example A55 — Payload map alias

```typescript
type PayloadMap = typeof mail.$Infer.Payloads
```

## Example A56 — Use template builder in registry

```typescript
const template = IgniterMailTemplate.create()
  .withSubject('Reset')
  .withSchema(z.object({ link: z.string().url() }))
  .withRender(({ link }) => <Text>{link}</Text>)
  .build()

builder.addTemplate('reset', template)
```

## Example A57 — Avoid PII in telemetry

```typescript
builder.onSendSuccess(async ({ template }) => audit.track('mail.sent', { template }))
```

## Example A58 — Render for A/B preview

```typescript
const previewA = await mail.templates.render('welcome', { name: 'Ada' })
const previewB = await mail.templates.render('welcome', { name: 'Grace' })
```

## Example A59 — Schedule using helper function

```typescript
const scheduleWelcome = (to: string, name: string, date: Date) =>
  mail.schedule({ to, template: 'welcome', data: { name } }, date)
```

## Example A60 — Use templates list for admin UI

```typescript
const templates = await mail.templates.list()
const options = templates.map((t) => ({ label: t.name, value: t.id }))
```

---

**End of AGENTS.md for @igniter-js/mail**
