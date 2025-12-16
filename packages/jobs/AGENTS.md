# AGENTS.md - @igniter-js/jobs

> **Last Updated:** 2025-12-15  
> **Version:** 0.0.1 (bootstrap)

This file is the operations manual for AI agents maintaining `@igniter-js/jobs`. Follow these instructions before changing any code.

## 1. Purpose

`@igniter-js/jobs` delivers a fluent builder API for background jobs, workers, and queue management. It mirrors the DX of `@igniter-js/store` and `@igniter-js/telemetry`, wraps adapter implementations (BullMQ first, memory for tests), and exposes typed events, scopes, and management APIs.

## 2. Directory Map

```
packages/jobs/
├── src/
│   ├── adapters/          # Adapter implementations + barrel
│   ├── builders/          # Fluent builders (jobs, queue, worker)
│   ├── core/              # Runtime classes & proxies
│   ├── errors/            # IgniterJobsError hierarchy
│   ├── types/             # Public type surface (adapter/config/events/queue/worker)
│   └── utils/             # Static utility classes (id/prefix helpers)
├── AGENTS.md
# AGENTS.md - @igniter-js/jobs

> **Last Updated:** 2025-12-16  
> **Version:** 0.0.1 (bootstrap)

Operations manual for AI agents maintaining `@igniter-js/jobs`. Read this before changing code.

## 1. Mission & Scope

`@igniter-js/jobs` provides a fluent, type-safe API for defining queues, jobs, workers, and scheduling. It mirrors `@igniter-js/store` and `@igniter-js/telemetry` patterns, wraps adapters (BullMQ primary, memory for tests), and emits typed telemetry for observability. Scope includes: builders, runtime, adapters, telemetry glue, and docs/tests for everything public.

## 2. Directory Map & Responsibilities

```
packages/jobs/
├── src/
│   ├── adapters/          # Adapter impls + barrel (bullmq, memory); capability parity with @igniter-js/adapter-bullmq
│   ├── builders/          # Fluent builders: queue, worker, job, cron definitions
│   ├── core/              # Runtime classes (queue runtime, worker runtime, proxies)
│   ├── errors/            # IgniterJobsError hierarchy
│   ├── telemetry/         # Event descriptors + emit helpers (if present)
│   ├── types/             # Public surface (config, adapter contracts, events, queue/worker types)
│   └── utils/             # Static helpers (ids, prefixes, validation)
├── AGENTS.md              # You are here
├── CHANGELOG.md           # Release notes
├── README.md              # User-facing docs
├── package.json           # Package metadata
├── tsconfig.json          # TS build config
├── tsup.config.ts         # Build outputs
└── vitest.config.ts       # Test config
```

## 3. Architecture Overview

- **Builders (immutable):** `.create()` → chain setters → `.build()`. Must copy state, never mutate in-place. Maintain type accumulation for scopes/options like `@igniter-js/store`.
- **Runtime flow (happy path):**
	1) User defines queue/worker via builders.
	2) Adapter (BullMQ) wires queues/workers; memory adapter is for tests.
	3) Job enqueue → adapter schedules → worker consumes → lifecycle events emit (internal + telemetry).
	4) Errors bubble as `IgniterJobsError` with codes; runtime logs/telemetry should not crash workers.
- **Telemetry:** Optional peer; events emitted via lightweight helper (fire-and-forget). Event names `igniter.jobs.<group>.<event>`; attributes prefixed with `ctx.`. No actors; single scope (e.g., queue/workspace) only.
- **Scheduling:** `queue.addCron()` produces repeatable jobs; advanced scheduling metadata (skip weekends/business hours) attaches via `metadata.advancedScheduling`. BullMQ repeat options must be preserved.

## 4. Design Rules (must-keep)

- **Prefixing:** Public classes/types start with `IgniterJobs` (singular `IgniterJob` when appropriate). Utils are static classes.
- **Type Safety:** No implicit `any` on public API. Use `Prettify` helpers for flattened types. Align with `packages/core/src/types/jobs.interface.ts` and keep parity.
- **Adapters:** `IgniterJobsAdapter` defines capabilities. BullMQ adapter must keep: rate limiting, scheduling (cron/repeat), retries/backoff, job metadata, progress, bulk ops, management APIs (pause/resume/drain/clean/obliterate), hooks/callbacks. Memory adapter is test-only.
- **Docs:** TSDoc (English) with examples/edge cases for every exported symbol. Keep README + AGENTS + CHANGELOG in sync with behavior.
- **Utils:** Keep shared helpers in `src/utils`; add tests. Prefer pure functions or static classes.
- **Telemetry:** Optional dependency; interface lives in types to avoid hard dependency. Telemetry errors must never fail job execution.

## 5. Component Map (what to touch)

- **src/builders/**: Queue builder, worker builder, job definition builder. Ensure immutability and type accumulation. Provide `.withTelemetry()`, `.withAdapter()`, and scheduling helpers.
- **src/core/**: Runtime wrappers that orchestrate builders + adapters. Handles lifecycle hooks, logging/telemetry, error translation.
- **src/adapters/**: Adapter implementations + barrel. BullMQ mirrors `@igniter-js/adapter-bullmq`; memory adapter minimal but API-compatible for tests.
- **src/errors/**: `IgniterJobsError` codes. Add new codes here first; keep messages actionable.
- **src/telemetry/**: Event descriptors + emit helpers. Keep names stable and attributes prefixed `ctx.`.
- **src/types/**: Single source of truth for public API (config, events, adapters, queue/worker types). Update before implementation.
- **src/utils/**: ID generation, prefix handling, validation, backoff helpers. Pure and tested.

## 6. Telemetry Events (contract)

- **Namespace:** `igniter.jobs`.
- **Job events:** `enqueued`, `scheduled`, `started`, `completed`, `failed`, `progress`, `retrying`.
- **Worker events:** `started`, `stopped`, `idle`, `paused`, `resumed`.
- **Queue events:** `paused`, `resumed`, `drained`, `cleaned`, `obliterated`.
- **Attributes:** always include `ctx.job.id`, `ctx.job.queue`, plus duration/progress where applicable. Add `ctx.worker.id` for worker lifecycle.
- **Behavior:** Emission is best-effort; never throw. Keep helper tolerant (swallow telemetry errors, log if logger available).

## 7. Testing Strategy

	- `npm test --filter @igniter-js/jobs`
	- `bun test` (if bun is configured in scripts)
	- `npx tsc --noEmit` for types

## 8. Build & Tooling

- **Build:** `bun run build` or `npm run build --filter @igniter-js/jobs` (tsup). Outputs ESM + CJS with dts.
- **Config:** `tsconfig.json` extends shared base; `tsup.config.ts` declares multiple entries if needed; keep barrels aligned.
- **External deps:** BullMQ/Redis via adapter; avoid pulling heavy deps into core runtime. Telemetry is optional peer.

## 9. Workflow Checklist (per change)

1. Read this AGENTS + `README.md` + relevant code before editing.
2. Update types (public surface) first; then implementation; then tests.
3. Preserve BullMQ feature parity; log any intentional deltas in CHANGELOG.
4. Keep telemetry names/attributes stable; update descriptors + tests if changed.
5. Add/adjust TSDoc for every exported symbol and public function.
6. Run tests and typecheck (`npm test --filter @igniter-js/jobs`, `npx tsc --noEmit`).
7. Update README + AGENTS + CHANGELOG when behavior or API changes.

## 10. Troubleshooting Notes

- **Telemetry failures:** Should be swallowed; if tests fail, ensure helper mocks errors without throwing.
- **Cron/repeat drift:** Verify repeat options passed untouched to BullMQ; advanced scheduling metadata must survive serialization.
- **Type regressions:** Compare against `packages/core/src/types/jobs.interface.ts`. No `any` leakage in public exports.
- **Adapter parity gaps:** Cross-check with `packages/adapter-bullmq/src/bullmq.adapter.ts` for missing capabilities.
- **Flaky integration tests:** Prefer Redis-mock/stub; isolate time-based tests with fake timers.

## 11. References

- `packages/core/src/types/jobs.interface.ts` — canonical job interfaces.
- `packages/adapter-bullmq/src/bullmq.adapter.ts` — legacy feature set to mirror.
- `packages/store`, `packages/telemetry` — builder/test patterns and redaction/sampling ideas.

Stay consistent, type-safe, and keep docs/tests in lockstep with the code.
