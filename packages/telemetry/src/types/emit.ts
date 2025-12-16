/**
 * @fileoverview Emit input types for @igniter-js/telemetry
 * @module @igniter-js/telemetry/types/emit
 */

import type { TelemetryLevel } from './levels'
import type { TelemetryActor, TelemetryAttributes, TelemetryError, TelemetryScope, TelemetrySource, TelemetryTags } from './envelope'

/**
 * Input type for emitting telemetry events.
 *
 * All fields are optional; defaults will be applied by the telemetry runtime.
 * When emitting within a session, the session's actor, scope, and sessionId
 * will be used unless explicitly overridden.
 *
 * @typeParam TName - The event name type (for typed event inference)
 *
 * @example
 * ```typescript
 * // Minimal emit
 * telemetry.emit('user.login', {
 *   attributes: { 'ctx.user.id': 'usr_123' },
 * })
 *
 * // Full emit with all options
 * telemetry.emit('user.login', {
 *   level: 'info',
 *   sessionId: 'custom-session-id',
 *   actor: { type: 'user', id: 'usr_123' },
 *   scope: { type: 'organization', id: 'org_456' },
 *   attributes: {
 *     'ctx.user.email': 'user@example.com',
 *     'ctx.login.method': 'oauth',
 *   },
 *   source: { causer: '@myapp/auth' },
 * })
 * ```
 */
export interface TelemetryEmitInput<TName extends string = string> {
  /**
   * Severity level for this event.
   * @default 'info'
   */
  level?: TelemetryLevel

  /**
   * Override the session ID for this event.
   * If not provided, uses the active session's ID or auto-generates one.
   */
  sessionId?: string

  /**
   * Actor information for this event.
   * If not provided, uses the active session's actor.
   */
  actor?: TelemetryActor

  /**
   * Scope information for this event.
   * If not provided, uses the active session's scope.
   */
  scope?: TelemetryScope

  /**
   * Domain-specific attributes for this event.
   * Will be merged with session attributes if present.
   */
  attributes?: TelemetryAttributes

  /**
   * Error information for this event.
   * Typically used with `level: 'error'`.
   */
  error?: TelemetryError

  /**
   * Source information for debugging.
   */
  source?: TelemetrySource

  /**
   * Override the timestamp for this event.
   * If not provided, uses the current time.
   * @default new Date().toISOString()
   */
  time?: string
}

/**
 * Input type for actor in emit or session methods.
 *
 * @example
 * ```typescript
 * const actorInput: TelemetryActorInput = {
 *   type: 'user',
 *   id: 'usr_123',
 *   tags: { role: 'admin' },
 * }
 * ```
 */
export interface TelemetryActorInput {
  /** The actor type (must be registered with addActor) */
  type: string
  /** Optional actor identifier */
  id?: string
  /** Optional actor tags */
  tags?: TelemetryTags
}

/**
 * Input type for scope in emit or session methods.
 *
 * @example
 * ```typescript
 * const scopeInput: TelemetryScopeInput = {
 *   type: 'organization',
 *   id: 'org_456',
 *   tags: { plan: 'enterprise' },
 * }
 * ```
 */
export interface TelemetryScopeInput {
  /** The scope type (must be registered with addScope) */
  type: string
  /** The scope identifier */
  id: string
  /** Optional scope tags */
  tags?: TelemetryTags
}
