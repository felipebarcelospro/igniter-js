# @igniter-js/mail - AI Agent Instructions

> **Package Version:** 0.1.1  
> **Last Updated:** 2025-01-22  
> **Status:** Ready for Publication

---

## Package Overview

**Name:** `@igniter-js/mail`  
**Purpose:** Type-safe email library for Igniter.js with React Email templates and multiple provider adapters  
**Type:** Standalone Library (can be used independently or with Igniter.js)

### Core Features
- Type-safe email templates with React Email components
- Runtime validation with StandardSchema support  
- Multiple provider adapters (Resend, Postmark, SendGrid, SMTP)
- Mock adapter for unit testing
- Queue integration for async email delivery
- Lifecycle hooks for monitoring and logging
- Builder pattern for fluent configuration
- Server-first design (Node.js, Bun, Deno)

---

## Architecture

### Design Principles

1. **Type Safety First**
   - End-to-end TypeScript inference from templates to send params
   - Template payload validation with StandardSchema
   - No `any` types in public APIs

2. **React Email Integration**
   - Templates are React components
   - Automatic HTML and plain-text rendering
   - Leverage React Email's component library

3. **Adapter-Based Architecture**
   - Core defines interfaces, adapters provide implementations
   - Easy to add new email providers
   - Adapters are peer dependencies (optional)

4. **Builder Pattern**
   - Fluent API for configuration
   - Type-safe template registration
   - Compile-time validation of configuration

---

## File Structure

```
packages/mail/
├── src/
│   ├── index.ts                         # Public exports
│   │
│   ├── adapters/
│   │   ├── index.ts                    # Adapters barrel
│   │   ├── mock.adapter.ts             # In-memory mock adapter
│   │   ├── mock.adapter.spec.ts        # Mock adapter tests
│   │   ├── postmark.adapter.ts         # Postmark provider
│   │   ├── postmark.adapter.spec.ts    # Postmark adapter tests
│   │   ├── resend.adapter.ts           # Resend provider
│   │   ├── resend.adapter.spec.ts      # Resend adapter tests
│   │   ├── sendgrid.adapter.ts         # SendGrid provider
│   │   ├── sendgrid.adapter.spec.ts    # SendGrid adapter tests
│   │   ├── smtp.adapter.ts             # SMTP provider
│   │   └── smtp.adapter.spec.ts        # SMTP adapter tests
│   │
│   ├── builders/
│   │   ├── main.builder.ts             # Main builder
│   │   ├── main.builder.spec.ts        # Builder tests
│   │   ├── template.builder.ts         # Template builder
│   │   └── template.builder.spec.ts    # Template builder tests
│   │
│   ├── core/
│   │   ├── manager.tsx                 # Core runtime logic
│   │   └── manager.spec.tsx            # Core tests
│   │
│   ├── errors/
│   │   └── mail.error.ts               # Main error class
│   │
│   ├── types/
│   │   ├── adapter.ts                  # Adapter types
│   │   ├── provider.ts                 # Provider types
│   │   ├── telemetry.ts                # Telemetry types
│   │   └── templates.ts                # Template types
│   │
│   ├── telemetry/
│   │   └── index.ts                    # Telemetry events
│   │
│   ├── utils/
│   │   ├── schema.ts                   # StandardSchema utilities
│   │   └── schema.spec.ts              # Schema tests
│   │
│   └── shim.ts                         # Browser/client shim
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── AGENTS.md                            # This file
└── CHANGELOG.md
```

---

## Key Responsibilities

### `IgniterMail` (Core Runtime)

The core class handles:
- Template registration and management
- Template data validation using StandardSchema
- React Email rendering (HTML + plain text)
- Adapter orchestration
- Queue integration for scheduled sends (requires queue adapter)
- Lifecycle hooks (onSendStarted, onSendSuccess, onSendError)
- Error handling and normalization
- Telemetry emission via `IgniterMailTelemetryEvents`

**Key Invariants:**
- All templates must have a `subject`, `schema`, and `render` function
- Template data is validated before rendering
- All predictable failures throw `IgniterMailError` with stable `code`
- Hooks are always invoked (started → success/error)

### `MailAdapter` (Infrastructure-only)

Adapters **must**:
- Implement the `send` method with `MailAdapterSendParams`
- Handle provider-specific API calls and authentication
- NOT implement business logic (no validation, no hooks, no queuing)
- Return cleanly or throw errors (which core will normalize)

**Mental Model:**
- **Core** decides *what* to send and *when*
- **Adapter** executes *how* to talk to the provider

---

## Development Guidelines

### Adding New Features

1. **Business Logic → Core**
   - If it's a rule or decision, it belongs in `IgniterMail`
   - Examples: validation, hooks, queuing

2. **Infrastructure Logic → Adapter**
   - If it's provider-specific, it belongs in the adapter
   - Examples: API calls, authentication, retry logic

3. **Public API → Builder or Core**
   - If users need to configure it, add to `IgniterMailBuilder`
   - If users need to call it at runtime, add to `IgniterMail`

### Testing Strategy

**Unit Tests** (`src/core/manager.spec.tsx`):
- Use `MockMailAdapter` for isolated core testing
- Test template validation (valid and invalid schemas)
- Test hooks lifecycle (started, success, error)
- Test queue integration (enqueue)

**Adapter Tests** (`src/adapters/*.spec.ts`):
- Test mock adapter tracking behavior
- Mock provider APIs
- Test error handling

**Builder Tests** (`src/builders/*.spec.ts`):
- Test chaining, hooks, and template builder validation

**Type Tests** (in manager spec):
- Verify template key type inference
- Verify payload type inference
- Verify builder fluent API type safety

### Code Style

- Follow ESLint rules (`npm run lint`)
- Use JSDoc comments for public APIs (in English)
- Prefer explicit types over inference in public APIs
- Use `readonly` for immutable properties
- Use `async/await` over raw Promises

### Error Handling

- All predictable errors must throw `IgniterMailError`
- Use stable error codes (e.g., `MAIL_PROVIDER_TEMPLATE_NOT_FOUND`)
- Include relevant context in `error.metadata`

### Commit Messages

Follow Conventional Commits:
```
feat(mail): add SendGrid adapter
fix(mail): handle schema validation errors correctly
docs(mail): update README with queue examples
test(mail): add tests for template validation
```

---

## Adding a New Adapter

1. Create new file in `src/adapters/` (e.g., `aws-ses.adapter.ts`)
2. Create builder class extending pattern (e.g., `AwsSesMailAdapterBuilder`)
3. Implement `send` method with provider API calls
4. Export adapter and builder from `src/index.ts`
5. Add provider to `IgniterMailBuilder.withAdapter()` shorthand (optional)
6. Add tests for adapter-specific behavior
7. Update README with adapter documentation
8. Add peer dependency to `package.json`

**Adapter Checklist:**
- ✅ Implement `MailAdapter` interface
- ✅ Handle provider authentication
- ✅ Support `to`, `subject`, `html`, `text` fields
- ✅ Optionally support `scheduledAt` if provider supports it
- ✅ Throw descriptive errors
- ✅ Export builder with `create()` factory

---

## Common Tasks

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Run specific test file
npm run test -- src/core/manager.spec.tsx
```

### Building

```bash
# Build once
npm run build

# Build and watch
npm run dev
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

---

## Environment Variables

While the package doesn't directly read environment variables, adapters typically require:

**Resend:**
- `RESEND_API_KEY` - Resend API key

**Postmark:**
- `POSTMARK_SERVER_TOKEN` - Postmark server token

**SendGrid:**
- `SENDGRID_API_KEY` - SendGrid API key

**SMTP:**
- Uses a connection URL passed via adapter credentials (e.g., `smtps://user:pass@host:465`)

**Validation:**
- Supports any validation library that implements `StandardSchemaV1` (Zod 3.23+ or compatible)

---

## Publishing Workflow

### Pre-Publish Checklist

- [ ] All tests passing (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] README.md is up-to-date
- [ ] CHANGELOG.md is updated with version changes
- [ ] Version in `package.json` is correct
- [ ] All exports in `src/index.ts` are correct

### Version Update Process

**NEVER update version without user approval.**

When changes are ready:
1. Review changes made
2. Suggest version bump options (patch/minor/major)
3. Wait for user approval
4. Update `package.json` version
5. Update `CHANGELOG.md`
6. Run quality checks
7. Ask about publishing

### Publishing

```bash
# Login to npm (if not already)
npm login

# Publish (from package directory)
cd packages/mail
npm publish --access public
```

---

## Error Codes Reference

| Code | Reason |
|------|--------|
| `MAIL_PROVIDER_ADAPTER_REQUIRED` | No adapter configured |
| `MAIL_PROVIDER_TEMPLATES_REQUIRED` | No templates registered |
| `MAIL_PROVIDER_TEMPLATE_NOT_FOUND` | Template key doesn't exist |
| `MAIL_PROVIDER_TEMPLATE_DATA_INVALID` | Schema validation failed |
| `MAIL_PROVIDER_SEND_FAILED` | Failed to send email |
| `MAIL_PROVIDER_SCHEDULE_DATE_INVALID` | Schedule date is in the past |
| `MAIL_PROVIDER_SCHEDULE_QUEUE_NOT_CONFIGURED` | Queue adapter is required |
| `MAIL_PROVIDER_SCHEDULE_FAILED` | Failed to schedule email |
| `MAIL_PROVIDER_FROM_REQUIRED` | FROM address not configured |
| `MAIL_PROVIDER_ADAPTER_SECRET_REQUIRED` | Adapter secret not provided |
| `MAIL_PROVIDER_ADAPTER_NOT_FOUND` | Unknown adapter provider |
| `MAIL_ADAPTER_CONFIGURATION_INVALID` | Adapter configuration error |

---

## Non-Goals

By design, this package does NOT:
- Implement business rules in adapters (that's the core's job)
- Provide browser-side email sending (server-first)
- Bundle all adapter dependencies (they're peer dependencies)
- Support synchronous email sending (always async)

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Public exports |
| `src/core/manager.tsx` | Core runtime logic |
| `src/builders/main.builder.ts` | Builder API |
| `src/builders/template.builder.ts` | Template builder |
| `src/adapters/*.adapter.ts` | Provider adapters |
| `src/telemetry/index.ts` | Telemetry events |
| `src/shim.ts` | Browser/client shim |
| `src/types/*.ts` | Public types |
| `src/errors/mail.error.ts` | Error classes |

### Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Build and watch |
| `npm run build` | Build once |
| `npm run test` | Run tests |
| `npm run typecheck` | Check types |
| `npm run lint` | Lint code |

---

## Support & Communication

When working on this package:
- **Read this file first** before making changes
- **Follow existing patterns** - consistency is key
- **Update documentation** after every code change
- **Write tests** for new features and bug fixes
- **Ask for clarification** if requirements are unclear
- **Suggest improvements** to this AGENTS.md if needed

---

## Changelog History

### v0.1.0 (Initial Release)
- Core email functionality with React Email
- Type-safe templates with StandardSchema validation
- Multiple adapters (Resend, Postmark, SendGrid, SMTP) and mock adapter for tests
- Queue integration for scheduled sends
- Lifecycle hooks
- Builder pattern API
- Comprehensive documentation
