# AGENTS.md - @igniter-js/mail

> **Last Updated:** 2025-12-23
> **Version:** 0.1.11
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

The `IgniterMailBuilder` is designed as an immutable state machine.

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

- **Attributes:** Events carry normalized attributes like `mail.to`, `mail.template`, and `mail.duration_ms`.
- **Privacy:** By default, PII (like email content or raw data objects) is **never** included in telemetry attributes.

---

### 4. Operational Flow Mapping (Pipelines)

#### Method: `IgniterMailBuilder.create()`

1. **Intent:** Initialize a fresh configuration chain.
2. **Execution:** Creates a new `IgniterMailBuilder` with default empty state.
3. **State:** `templates` is `{}`.

#### Method: `IgniterMailBuilder.withAdapter(provider, secret)`

1. **Validation:** Checks if `provider` is a known string ('resend', 'postmark', etc.).
2. **Instantiation:** Calls the static `create()` method of the corresponding adapter class.
3. **Assignment:** Stores the adapter instance in the builder's state.
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
4. **Idempotent Registration:** Calls `ensureQueueJobRegistered()`. If the job isn't yet registered on the queue adapter, it does so now.
5. **Invocation:** Calls `queue.adapter.invoke()` with a delay calculated from the target date.
6. **Telemetry:** Emits `igniter.mail.schedule.success`.

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
- **`@igniter-js/core`**: Provides the foundational error class and job interfaces.
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
- **Unsubscribe:** Use the `headers` property (coming soon) to add the `List-Unsubscribe` header.

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
| `IgniterMailManagerCore` | Runtime engine       | `send`, `schedule`, `$Infer`                        |
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

| Event     | Attributes                    | Context                                   |
| --------- | ----------------------------- | ----------------------------------------- |
| `started` | `mail.to`, `mail.template`    | Emitted when `.send()` is called.         |
| `success` | `mail.to`, `mail.duration_ms` | Emitted when the ESP accepts the email.   |
| `error`   | `mail.to`, `mail.error.code`  | Emitted on validation or network failure. |

#### Group: `schedule`

| Event     | Attributes                      | Context                               |
| --------- | ------------------------------- | ------------------------------------- |
| `started` | `mail.to`, `mail.scheduled_at`  | Emitted when `.schedule()` is called. |
| `success` | `mail.to`, `mail.queue_id`      | Emitted when the job is enqueued.     |
| `error`   | `mail.to`, `mail.error.message` | Emitted if the queue adapter fails.   |

---

### 15. Troubleshooting & Error Code Library

#### `MAIL_PROVIDER_ADAPTER_REQUIRED`

- **Context:** Occurs during `.build()`.
- **Cause:** You called `build()` before telling the service how to actually send emails.
- **Mitigation:** Ensure `.withAdapter()` is present in your builder chain.
- **Solution:** `mail.withAdapter('resend', 'key').build()`.

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

---

**End of AGENTS.md for @igniter-js/mail**
