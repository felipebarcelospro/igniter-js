/**
 * @fileoverview Telemetry envelope and related types for @igniter-js/telemetry
 * @module @igniter-js/telemetry/types/envelope
 */

import type { IgniterTelemetryLevel } from "./levels";

/**
 * Tags are key-value pairs for categorization and filtering.
 * Values must be primitive types for efficient indexing.
 *
 * @example
 * ```typescript
 * const tags: IgniterTelemetryTags = {
 *   role: 'admin',
 *   verified: true,
 *   loginCount: 42,
 * }
 * ```
 */
export type IgniterTelemetryTags = Record<string, string | number | boolean>;

/**
 * Attributes contain domain-specific data about the event.
 * Use the `ctx.` prefix convention for context-specific attributes.
 *
 * @example
 * ```typescript
 * const attributes: IgniterTelemetryAttributes = {
 *   'ctx.post.id': 'p-123',
 *   'ctx.post.title': 'Hello World',
 *   'ctx.post.published': true,
 *   'ctx.post.views': null, // null is allowed for missing values
 * }
 * ```
 */
export type IgniterTelemetryAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Actor information identifying who triggered the event.
 *
 * @example
 * ```typescript
 * const actor: IgniterTelemetryActor = {
 *   type: 'user',
 *   id: 'usr_123',
 *   tags: { role: 'admin', plan: 'pro' },
 * }
 * ```
 */
export interface IgniterTelemetryActor {
  /** The type of actor (e.g., 'user', 'system', 'agent') */
  type: string;
  /** Optional unique identifier for the actor */
  id?: string;
  /** Optional tags for additional actor metadata */
  tags?: IgniterTelemetryTags;
}

/**
 * Scope information for multi-tenant isolation.
 *
 * @example
 * ```typescript
 * const scope: IgniterTelemetryScope = {
 *   type: 'organization',
 *   id: 'org_456',
 *   tags: { plan: 'enterprise', region: 'us-east' },
 * }
 * ```
 */
export interface IgniterTelemetryScope {
  /** The type of scope (e.g., 'organization', 'workspace', 'project') */
  type: string;
  /** Unique identifier for the scope */
  id: string;
  /** Optional tags for additional scope metadata */
  tags?: IgniterTelemetryTags;
}

/**
 * Error information included in error-level telemetry events.
 *
 * @example
 * ```typescript
 * const error: IgniterTelemetryErrorInfo = {
 *   name: 'ValidationError',
 *   message: 'Invalid email format',
 *   code: 'VALIDATION_FAILED',
 *   stack: 'Error: Invalid email format\n    at validate...',
 *   cause: 'Email must contain @ symbol',
 * }
 * ```
 */
export interface IgniterTelemetryErrorInfo {
  /** The error class/type name */
  name: string;
  /** Human-readable error message */
  message: string;
  /** Optional machine-readable error code */
  code?: string;
  /** Optional stack trace */
  stack?: string;
  /** Optional description of the underlying cause */
  cause?: string;
}

/**
 * Source information for debugging and tracing.
 *
 * @example
 * ```typescript
 * const source: IgniterTelemetrySource = {
 *   causer: '@igniter-js/core',
 *   file: 'router.ts',
 *   line: 42,
 * }
 * ```
 */
export interface IgniterTelemetrySource {
  /** The package or module that caused the event */
  causer?: string;
  /** The source file name */
  file?: string;
  /** The line number in the source file */
  line?: number;
}

/**
 * The telemetry envelope is the standard structure for all emitted events.
 * It contains event metadata, context, and payload.
 *
 * This is a generic envelope without fixed domain contexts. Everything
 * domain-specific should be expressed via `attributes` with standard
 * naming conventions (recommended prefix `ctx.`).
 *
 * @typeParam TName - The event name type
 *
 * @example
 * ```typescript
 * const envelope: IgniterTelemetryEnvelope = {
 *   name: 'user.login',
 *   time: '2025-01-15T10:30:00.000Z',
 *   level: 'info',
 *   service: 'my-api',
 *   environment: 'production',
 *   version: '1.0.0',
 *   sessionId: 'ses_abc123',
 *   actor: { type: 'user', id: 'usr_123' },
 *   scope: { type: 'organization', id: 'org_456' },
 *   attributes: {
 *     'ctx.user.email': 'user@example.com',
 *     'ctx.login.method': 'oauth',
 *   },
 * }
 * ```
 */
export interface IgniterTelemetryEnvelope<TName extends string = string> {
  /** The event name (e.g., 'user.login', 'igniter.jobs.job.completed') */
  name: TName;

  /** ISO 8601 timestamp when the event occurred */
  time: string;

  /** Severity level of the event */
  level: IgniterTelemetryLevel;

  /** Service name that emitted the event */
  service: string;

  /** Environment where the event occurred (e.g., 'production', 'development') */
  environment: string;

  /** Optional version of the service */
  version?: string;

  /** Session identifier for correlating related events */
  sessionId: string;

  /** Optional trace ID for distributed tracing */
  traceId?: string;

  /** Optional span ID for distributed tracing */
  spanId?: string;

  /** Optional parent span ID for distributed tracing */
  parentSpanId?: string;

  /** Optional actor information */
  actor?: IgniterTelemetryActor;

  /** Optional scope information */
  scope?: IgniterTelemetryScope;

  /** Optional domain-specific attributes */
  attributes?: IgniterTelemetryAttributes;

  /** Optional error information (for error-level events) */
  error?: IgniterTelemetryErrorInfo;

  /** Optional source information */
  source?: IgniterTelemetrySource;
}
