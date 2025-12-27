---
applyTo: "**"
---

# Mission: Standardize selected @igniter-js packages (2 phases, approval gate)

You are the **orchestrator** for a refactor/standardization effort in the Igniter.js monorepo.  
Goal: ensure **only the packages listed below** fully comply with the standards in this prompt, with a **complete audit report before any code changes**.

## In-scope packages (ONLY these)

- @igniter-js/caller (HTTP client)
- @igniter-js/connectors (integration connectors)
- @igniter-js/jobs (jobs system)
- @igniter-js/mail (email sending)
- @igniter-js/storage (storage system)
- @igniter-js/store (state/cache store)
- @igniter-js/telemetry (telemetry/metrics)
- @igniter-js/agents (telemetry/metrics)

Out of scope: everything else (do not modify or analyze other packages beyond what is necessary to understand integrations).

---

# Global non-negotiable rules

## 0) Orchestration & Execution Protocol

### 0.1) Phase 0: The Deep-Audit Report

No code changes are allowed without a prior **Deep-Audit Report**. This report must analyze the current state, map the transformation path, and identify risks.

- **Audit Content:** Detailed file mapping (Current vs. Target), Public API impact (Breaking Changes), Test coverage assessment, and Dependency analysis.
- **Delegation Strategy:** If the environment supports **Subagents** (e.g., `Task` tool), the Orchestrator MUST delegate the Audit to a specialized subagent to preserve context and ensure objective analysis. If no subagents are available, the Orchestrator must perform the audit manually before proceeding.

### 0.2) Phase Final: The Quality Gate

After implementation, a **Quality Review** must be performed.

- **Review Content:** Verification of TSDoc, `AGENTS.md` line count/quality, Test pass rate, and Lint/Typecheck status.
- **Delegation Strategy:** Use a subagent for the final review if available.

### 0.3) Cross-Package Boundaries (Integrity)

- **NO INTERNAL IMPORTS:** It is strictly prohibited to import from the `src/` directory of another package (e.g., `import { ... } from '../../other-package/src/...'`).
- **PUBLIC EXPORTS ONLY:** All cross-package communication must happen through the public exports defined in the target's `package.json`.

---

## 1) Language and grounding

All docs and comments must be **English**, must be **well documented**, and must be **grounded in the real code** (no fictional APIs).  
This applies to: `AGENTS.md`, `README.md`, TSDoc, examples, troubleshooting, and any other documentation.

---

## 2) Initialization API pattern (public entrypoint)

All packages must expose a consistent initialization pattern:

✅ **Must be:**

- `IgniterJobs.create()`
- `IgniterStorage.create()`
- `IgniterMail.create()`
- etc.

❌ **Must NOT be:**

- `IgniterJobsBuilder.create()`
- any primary public entrypoint class/object with suffix `Builder`

**Rule:** the main exported API is `IgniterX` (no Builder suffix) and provides `.create()`.
Implementation pattern (as used in mail/store):

- `src/builders/main.builder.ts` exports `IgniterXBuilder` and `export const IgniterX = IgniterXBuilder`.
- `src/index.ts` re-exports `IgniterX` (builder alias), `IgniterXBuilder`, and the manager/types.

### 2.1) Builder Implementation Pattern (Strict Immutability)

The Builder MUST be implemented using the **Immutable State Pattern**.

✅ **Canonical Implementation:**

```typescript
// src/types/builder.ts
export interface IgniterXBuilderState<TConfig> {
  adapter?: IgniterXAdapter;
  config?: TConfig;
}

// src/builders/main.builder.ts
export class IgniterXBuilder<TConfig = {}> {
  // Private constructor forces usage of static create()
  private constructor(
    private readonly state: IgniterXBuilderState<TConfig> = {},
  ) {}

  static create(): IgniterXBuilder<{}> {
    return new IgniterXBuilder({});
  }

  withAdapter(adapter: IgniterXAdapter): IgniterXBuilder<TConfig> {
    // MUST return new instance, NEVER mutate 'this.state'
    return new IgniterXBuilder({ ...this.state, adapter });
  }

  build(): IgniterXManager {
    // Validation happens HERE, not in setters
    if (!this.state.adapter) throw new IgniterXError("ADAPTER_REQUIRED");
    return new IgniterXManager(this.state);
  }
}
```

❌ **Anti-Patterns (Strictly Prohibited):**

- Mutating `this` properties (e.g., `this.adapter = adapter; return this;`).
- Using `public` properties in the Builder.
- Performing validation inside `with*` methods (validation belongs in `build()`).

Reference:

- `packages/mail/src/builders/main.builder.ts`
- `packages/mail/src/index.ts`
- `packages/store/src/builders/main.builder.ts`
- `packages/store/src/index.ts`

---

## 3) Hooks naming standard

Hooks/event handlers must be standardized:

✅ **Must be:**

- `IgniterStorage.onSuccess(...)`

❌ **Must NOT be:**

- `IgniterStorage.withOnSuccess(...)`
- any `withOn*` for hooks

**Rule:** hooks should be `onX(...)` and consistent across packages.
Reference:

- `packages/mail/src/builders/main.builder.ts`
- `packages/mail/src/core/manager.tsx`

---

## 3.1) Typed events builder (StandardSchemaV1)

If the package exposes typed events:

- Use a typed events builder with `IgniterXEvents.create('namespace')`.
- `addEvents(events)` accepts the object returned by `.build()` (no separate namespace param).
- Schemas must implement `StandardSchemaV1` (Zod is supported).
- Validation only applies to **registered** typed events. Unregistered events must pass through without validation.
  Reference:
- `packages/store/src/builders/events.builder.ts`
- `packages/store/src/builders/main.builder.ts`
- `packages/store/src/core/manager.ts`

---

## 4) Telemetry integration standard (@igniter-js/telemetry)

All packages must integrate with telemetry in a standardized way to ensure full project observability.

### 4.1) Builder API requirements

- The builder/API must support `withTelemetry(...)` method.
- `withTelemetry(...)` must accept `IgniterTelemetryManager` from `@igniter-js/telemetry` (the dispatcher).
- Telemetry is **optional** — packages must work without it.
  Reference:
- `packages/mail/src/builders/main.builder.ts`
- `packages/mail/src/core/manager.tsx`
- `packages/store/src/builders/main.builder.ts`
- `packages/store/src/core/manager.ts`

### 4.2) Telemetry subpath export (mandatory)

Every package with telemetry must export telemetry definitions via a separate subpath: `@igniter-js/<package>/telemetry`.
Reference:

- `packages/mail/src/telemetry/index.ts`
- `packages/store/src/telemetry/index.ts`
- `packages/mail/package.json`
- `packages/store/package.json`

### 4.3) Unified emit pattern (mandatory)

Packages must implement a **unified event emission pattern** where internal events AND telemetry are emitted together.
**Robustness Rule:** Contemplate all possible events for the domain (Start, Success, Fail, etc.) to ensure the developer has total control and visibility.

### 4.4) Telemetry Schema Definition

Telemetry definitions MUST use `IgniterTelemetryEvents` builder in `src/telemetry/index.ts`.

**Rules:**

1.  **Namespace:** Must be `igniter.<package_name>` (e.g., `igniter.store`).
2.  **Groups:** Organize by domain (e.g., `kv`, `send`, `job`).
3.  **Attributes:** MUST use `ctx.<domain>.<attribute>` naming.
4.  **PII Safety:** NEVER define attributes for raw values (`value`, `body`, `email_content`).

✅ **Canonical Implementation:**

```typescript
// src/telemetry/index.ts
export const IgniterXTelemetryEvents = IgniterTelemetryEvents.namespace(
  "igniter.x",
)
  .group("operation", (g) =>
    g
      .event(
        "started",
        z.object({
          "ctx.x.operation_id": z.string(),
          "ctx.x.input_size": z.number(),
        }),
      )
      .event(
        "success",
        z.object({
          "ctx.x.duration_ms": z.number(),
        }),
      )
      .event(
        "error",
        z.object({
          "ctx.x.error.code": z.string(),
          "ctx.x.error.message": z.string(),
        }),
      ),
  )
  .build();
```

    Reference:

- `packages/mail/src/telemetry/index.ts`
- `packages/mail/src/core/manager.tsx`
- `packages/mail/tsup.config.ts`
- `packages/store/src/telemetry/index.ts`
- `packages/store/src/core/manager.ts`
- `packages/store/tsup.config.ts`

### 4.5) Telemetry-First Design

- **Mandatory Sequence:** Telemetry events for a new feature or method MUST be defined in `src/telemetry/index.ts` BEFORE the internal logic is implemented.
- **Observability Parity:** Every new public method must have at least one `started` event and a `success` or `error` event.

### 4.6) Optional Telemetry & Circular Dependency Prevention

When telemetry is marked as **optional** in `peerDependenciesMeta`:

- **MUST NOT** export telemetry from the main `src/index.ts` (root entrypoint).
- **MUST** be exported **ONLY** via the subpath `@igniter-js/<package>/telemetry`.
- **Rationale:** Exporting from the main entry forces telemetry load on all consumers, creating circular dependencies when telemetry itself depends on the package (e.g., store adapter).

✅ **Correct:**
```json
{
  "exports": {
    ".": { /* main exports WITHOUT telemetry */ },
    "./telemetry": { /* ONLY telemetry here */ }
  },
  "peerDependenciesMeta": {
    "@igniter-js/telemetry": { "optional": true }
  }
}
```

❌ **Incorrect:**
```typescript
// In src/index.ts - DO NOT DO THIS for optional telemetry
export * from './telemetry'
```

Reference:
- `packages/store/package.json`
- `packages/caller/package.json`
- `packages/storage/package.json`

---

## 5) Client-import protections (server-only safety)

All packages (except `@igniter-js/caller`) must be protected from being imported in client/browser environments.

- Create a `src/shim.ts` that throws explicit "Server-only" errors.
- Register it in `package.json` under the `browser` field and `exports`.
  Reference:
- `packages/mail/src/shim.ts`
- `packages/mail/package.json`

---

## 6) Adapters & Mocking standard

- Any package that has adapters must export them via a separate subpath (e.g., `@igniter-js/storage/adapters`).
- **High-Fidelity Mocks:** It is mandatory to export a `Mock[Package]Adapter` in `src/adapters/mock.adapter.ts`.
- The mock must track calls and state to facilitate unit testing for both the package and the end-user.
- **Interface Definition:** The adapter interface MUST be defined in `src/types/adapter.ts`.

✅ **Canonical Adapter Interface:**

```typescript
// src/types/adapter.ts
export interface IgniterXAdapter {
  // Define core methods
  send(params: Params): Promise<Result>;
  // ...
}
```

Reference:

- `packages/mail/src/adapters/mock.adapter.ts`
- `packages/mail/src/adapters/mock.adapter.spec.ts`
- `packages/mail/src/adapters/index.ts`

---

## 7) Utilities standard (static classes)

- Utilities are **static classes** prefixed with `Igniter[Package][Util]` (e.g., `IgniterStoragePath`).
- utilities MUST be in `src/utils/` folder.
- Each utility file exports a single static class.
- **Mandatory Testing:** All utils must have unit tests covering all essential logic cases.
  Reference:
- `packages/mail/src/utils/schema.ts`
- `packages/mail/src/utils/schema.spec.ts`
- `packages/store/src/builders/store-key.builder.ts`
- `packages/store/src/builders/store-key.builder.spec.ts`

---

## 8) Types organization standard (Pure Contracts)

- **Zero Types in Classes:** Prohibited to define types or interfaces inside class files.
- Types MUST be in `src/types/` folder.
- `src/types/manager.ts`: Public API interfaces (prefixed with `IIgniter[Package]Manager`).
- `src/types/builder.ts`: Internal builder state types.
- `src/types/config.ts`: Final configuration object passed to Manager.
- All public types MUST have prefix `Igniter[Package][Type]`.
  Reference:
- `packages/mail/src/types/manager.ts`
- `packages/mail/src/types/builder.ts`
- `packages/store/src/types/manager.ts`
- `packages/store/src/types/builder.ts`

---

## 9) Core class interfaces & Immutability

- All Manager classes MUST implement interfaces from `src/types/manager.ts`.
- **Instance Immutability Rule:** Transformation methods (like `.scope()`, `.path()`) MUST be immutable, returning a freshly cloned instance with merged state.
  Reference:
- `packages/mail/src/core/manager.tsx`
- `packages/store/src/core/manager.ts`

---

## 10) File naming and architecture standard

- **NO** `igniter-` prefix in file names (e.g., `manager.ts`, not `igniter-storage.manager.ts`).
- `src/builders/main.builder.ts`: Contains the `Igniter[Package]Builder` class.
- `src/core/manager.ts`: Contains the `Igniter[Package]Manager` class.
- `src/index.ts`: Unified entry point exports (`IgniterX`, `IgniterXBuilder`, manager, types, adapters, telemetry).
- No environment/key prefix configuration unless explicitly required by the package domain (store uses fixed `igniter:store`).
  Reference:
- `packages/mail/src/builders/main.builder.ts`
- `packages/mail/src/core/manager.tsx`
- `packages/mail/src/index.ts`
- `packages/store/src/builders/main.builder.ts`
- `packages/store/src/core/manager.ts`
- `packages/store/src/index.ts`

---

## 10.1) Barrel files standard (organization + comments)

- Barrel files must be organized into clear sections using short English comments.
- Sections should group exports by domain (core, builders, adapters, telemetry, errors, types, utils).
- Prefer `export *` and `export type *` only; do not use named exports unless there is a conflict that requires it.
- Keep barrel files minimal and consistent; avoid re-exporting the same item in multiple layers unless the entrypoint needs it.
  Reference:
- `packages/mail/src/index.ts`
- `packages/mail/src/adapters/index.ts`
- `packages/mail/src/builders/index.ts`
- `packages/store/src/index.ts`
- `packages/store/src/adapters/index.ts`
- `packages/store/src/builders/index.ts`

---

## 11) Documentation Excellence (Gold Standard)

### 11.1 AGENTS.md (Hyper-Robust & Training-Ready)

The `AGENTS.md` is the primary source of truth and "training data" for Code Agents. It must be **extremely robust, detailed, and exhaustive**, aiming for at least **1,000 lines** of high-quality content to ensure the agent fully dominates the package's domain, architecture, and usage.

#### Mandatory Sections & Structure

The file must be divided into two main sections with deep-dives:

1.  **MAINTAINER SECTION (The "Inside"):** Focuses on how the package is built, why decisions were made, and how to safely modify it.
    - **Architecture Deep-Dive:** Detail the relationship between Builder, Manager, Adapters, and Telemetry.
    - **FileSystem Topology (Maintenance):** Map the entire `src/` directory structure, explaining the responsibility of each folder and file to guide internal code exploration.
    - **Operational Flow Mapping:** For EVERY public method, provide a step-by-step pipeline of what happens internally (Validation -> Telemetry -> Logic -> Adapter -> Logging).
    - **State & Immutability:** Explain how the immutable builder state is accumulated and passed.
    - **Contribution Checklist:** A step-by-step guide for adding new features (Types -> Adapter -> Core -> Tests -> Docs).
    - **Maintainer Troubleshooting:** How to debug internal leaks, type inference failures, or adapter mismatches.

2.  **CONSUMER SECTION (The "Outside"):** Focuses on how developers should use the package in real-world scenarios.
    - **Distribution Anatomy (Consumption):** Map the `dist/` and `exports` structure, explaining how the package is consumed in different runtimes and where each subpath leads.
    - **Real-World Use Case Library:** Provide at least 5-10 exhaustive examples covering different industries (e-commerce, fintech, social, etc.).
    - **Best Practices vs. Anti-Patterns:** Clear "Do" and "Don't" tables with code examples.
    - **Domain-Scoped Guidance:** How to tune the package for specific needs (e.g., "High-performance caching" vs. "Long-term storage").
    - **Exhaustive Error & Troubleshooting Library:** Every single error code must have:
      - **Context:** When it happens.
      - **Cause:** Technical reason.
      - **Mitigation:** How to prevent it.
      - **Solution:** Code snippet to fix it.

#### AGENTS.md Template (The 1,000-Line Blueprint)

```markdown
# AGENTS.md - @igniter-js/[package-name]

> **Last Updated:** YYYY-MM-DD
> **Version:** X.Y.Z
> **Goal:** This document serves as the complete operational manual for Code Agents.

---

## 1. Package Vision & Context

[Detailed explanation of why this package exists, what problem it solves, and its place in the Igniter.js ecosystem]

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

[Map the src/ folder. Explain where the real implementation of each feature lives]

- `src/builders/`: accumulation logic...
- `src/core/`: the manager's heart...
- etc.

### 3. Architecture Deep-Dive

[Diagrams or detailed text explaining the Builder -> Manager -> Adapter flow]

### 4. Operational Flow Mapping (Pipelines)

[For EACH public method, provide a step-by-step flow]

#### Method: `manager.doSomething()`

1. **Argument Validation:** [What is checked]
2. **Telemetry (Started):** [Event emitted]
3. **Internal Logic:** [Transformation, key building, etc.]
4. **Adapter Call:** [Interaction with the adapter]
5. **Telemetry (Success/Error):** [Event emitted]
6. **Result Formatting:** [What is returned]

### 5. Dependency & Type Graph

[Explanation of how types flow from src/types to the Manager]

### 6. Maintenance Checklist

[Detailed list of steps for features, bugfixes, and refactors]

---

## II. CONSUMER GUIDE (Developer Manual)

### 7. Distribution Anatomy (Consumption)

[Map how the package looks after build. Explain subpath exports like /telemetry, /adapters]

### 8. Quick Start & Common Patterns

[The most common 20% of use cases that solve 80% of problems]

### 9. Real-World Use Case Library

#### Case A: [Scenario Name]

[Problem description + Complete implementation code + Best practices]
[...repeat for Cases B, C, D, E, F...]

### 10. Domain-Specific Guidance

[Deep dive into specific domains: e.g., "Using Storage for User Avatars"]

### 11. Best Practices & Anti-Patterns

| Practice   | Why? | Example |
| ---------- | ---- | ------- |
| ✅ Do X    | ...  | `code`  |
| ❌ Don't Y | ...  | `code`  |

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 12. Exhaustive API Reference

[Table of every public class, method, property, and type with TSDoc summaries]

### 13. Telemetry & Observability Registry

[Table of every event, group, and attribute with their business meaning]

### 14. Troubleshooting & Error Code Library

#### ERROR_CODE_NAME

- **Context:** [Scenario]
- **Cause:** [Technical Detail]
- **Mitigation:** [Prevention]
- **Solution:** [Fix Code]

---
```

**Rule:** If an `AGENTS.md` is generated with less than 1,000 lines, it is considered incomplete and must be expanded with more use cases, deeper logic mapping, and more exhaustive troubleshooting.

### 11.2 TSDoc + Documentation hygiene (mandatory before done)

- **TSDoc is mandatory** for every class, method, parameter, and type. Keep it aligned with current behavior.
- Must include: `@param`, `@returns`, `@throws`, `@example`, and explanatory text for error solutions.
- Before marking any task complete, **review TSDoc**, `README.md`, and `AGENTS.md` to ensure they reflect the current implementation.
- If documentation is outdated, update it as part of the task (do not defer).
  Reference:
- `packages/mail/src/core/manager.tsx`
- `packages/store/src/core/manager.ts`

---

## 12) Logging Standard (Operational Tracing)

- **Builder:** Must provide `.withLogger(logger: IgniterLogger)`.
- **Initialization:** The `.build()` method must log Manager creation with metadata.
- **Tracing:** Every public operation must log `Started` (debug) and `Completed`/`Failed` (info/error) with duration/size/key info.
- **Telemetry parity:** Logs must not contradict telemetry events (same operation names and statuses), and must not include PII.
  Reference:
- `packages/mail/src/builders/main.builder.ts`
- `packages/mail/src/core/manager.tsx`

---

## 13) Testing & Type-Safety Verification

- **100% Type-Safety Philosophy:** Igniter.js must ensure automatic type-safety.
- **Type Inference Tests:** Mandatory tests in the **Builder** spec to ensure the entire chain of types (e.g., Scopes) works automatically without manual casting. Use `expectTypeOf`.
- **Variety of Scenarios:** Builder and Manager tests must contemplate diverse scenarios (valid, invalid, edge cases).
- **Coverage by area:** Always test `/utils`, `/core`, `/builders`, and `/adapters`. This is mandatory for reliable coverage.
- **Utils Tests:** Test all logic-heavy methods.
- **Zod in tests:** Use Zod v4 schemas in tests to validate StandardSchemaV1 typing.
- **Test on same folder of implementation target:** The file of a implementation, needs to be on same folder of target file.
- **Telemetry coverage:** For telemetry-enabled packages, tests must cover **every telemetry event** (started/success/error). Use a `describe('telemetry.<group>')` per group and an `it` per event for clarity.
- **Telemetry attributes:** For each telemetry event test, assert the critical attributes for that event (e.g., `ctx.batch.count`, `ctx.stream.count`, `ctx.kv.found`) when applicable.
- **Test execution rule:** Whenever you add or modify tests, you must run the relevant test suite. If a test fails, **report the error and proposed fix to the user before changing any implementation**.

---

## 13.1) Build + exports verification

- After updating exports or entrypoints, run the package build to confirm the generated files match the `package.json` `exports` map.
- Every package must include `shim.ts` in `tsup` entry and must map `browser`/`exports` to the shim where applicable.
- For telemetry/adapters subpaths, ensure `exports` point to the actual generated `.mjs`/`.js`/`.d.ts` files.
  Reference:
- `packages/mail/tsup.config.ts`
- `packages/mail/package.json`
- `packages/store/tsup.config.ts`
- `packages/store/package.json`

---

## 14) Error Handling & Metadata Standard

- **Class:** All packages must use a custom error class extending `IgniterError` (from `@igniter-js/core`).
- **Codes:** Use a constant-based registry for error codes (e.g., `IGNITER_MAIL_ERROR_CODES`).
- **Metadata (details):** The `details` property in error objects MUST be structured to support observability:
  - **ctx.package:** The name of the package.
  - **ctx.operation:** The name of the method/operation that failed.
  - **ctx.state:** (Optional) Non-PII partial state relevant to the failure.
- **Solution-Oriented:** Errors should be descriptive enough to lead the developer (or the Agent) to a solution.

Reference:

- `packages/mail/src/errors/mail.error.ts`
- `packages/store/src/errors/store.error.ts`

---

## 15) Code quality & organization (Clean Code baseline)

- **Always** keep code organized, readable, and consistent with Clean Code, KISS, and DRY.
- If a test or implementation is getting messy, refactor the structure (without changing behavior) to keep clarity.
- Do **not** block delivery for non-critical improvements; if a substantial improvement is identified but not required to finish, note it to the user as a suggested improvement at the end.
  Reference:
- `packages/store/src/core/manager.spec.ts`
- `packages/mail/src/core/manager.spec.tsx`
