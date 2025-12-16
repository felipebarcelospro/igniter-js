/**
 * @fileoverview Session management for @igniter-js/telemetry
 * @module @igniter-js/telemetry/core/session
 *
 * @description
 * Provides session-based context management for telemetry events.
 * Supports three DX modes:
 * 1. Direct (active session if exists; auto-session if none)
 * 2. Manual session handle
 * 3. Scoped execution with session.run()
 *
 * Uses AsyncLocalStorage for context isolation in concurrent environments.
 *
 * @example
 * ```typescript
 * // Mode A: Direct emit
 * telemetry.emit('user.login', { attributes: { 'ctx.user.id': '123' } })
 *
 * // Mode B: Manual session handle
 * const session = telemetry.session()
 *   .actor('user', 'usr_123')
 *   .scope('organization', 'org_456')
 *
 * session.emit('user.login', { attributes: { 'ctx.user.id': '123' } })
 * await session.end()
 *
 * // Mode C: Scoped execution
 * await telemetry.session()
 *   .actor('user', 'usr_123')
 *   .run(async () => {
 *     telemetry.emit('user.login', { attributes: {} })
 *   })
 * ```
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { TelemetryActor, TelemetryAttributes, TelemetryScope, TelemetryTags } from '../types/envelope'
import type { TelemetryEmitInput } from '../types/emit'
import { generateSessionId } from '../utils/id'
import { IgniterTelemetryError } from '../errors/igniter-telemetry.error'

/**
 * Session state stored in AsyncLocalStorage.
 */
export interface TelemetrySessionState {
  /** The session ID */
  sessionId: string
  /** The actor for this session */
  actor?: TelemetryActor
  /** The scope for this session */
  scope?: TelemetryScope
  /** Session-level attributes */
  attributes?: TelemetryAttributes
  /** Whether the session has ended */
  ended: boolean
  /** Timestamp when the session started */
  startedAt: string
}

/**
 * Emit function type for session to call.
 */
export type SessionEmitFn = (
  name: string,
  input?: TelemetryEmitInput,
  sessionState?: TelemetrySessionState,
) => void

/**
 * Session interface for telemetry context management.
 *
 * @typeParam TActor - Valid actor types (from builder config)
 * @typeParam TScope - Valid scope types (from builder config)
 *
 * @example
 * ```typescript
 * const session = telemetry.session()
 *   .actor('user', 'usr_123', { role: 'admin' })
 *   .scope('organization', 'org_456', { plan: 'enterprise' })
 *   .attributes({ 'ctx.request.id': 'req-abc' })
 *
 * session.emit('action.performed', { attributes: { 'ctx.action': 'create' } })
 * await session.end()
 * ```
 */
export interface IgniterTelemetrySession<TActor extends string = string, TScope extends string = string> {
  /**
   * Sets a custom session ID.
   *
   * @param sessionId - The session ID to use
   * @returns The session instance for chaining
   *
   * @example
   * ```typescript
   * session.id('custom-session-id')
   * ```
   */
  id(sessionId: string): this

  /**
   * Sets the actor for this session.
   *
   * @param type - The actor type (must be registered with addActor)
   * @param id - Optional actor identifier
   * @param tags - Optional actor metadata tags
   * @returns The session instance for chaining
   *
   * @example
   * ```typescript
   * session.actor('user', 'usr_123', { role: 'admin' })
   * ```
   */
  actor(type: TActor, id?: string, tags?: TelemetryTags): this

  /**
   * Sets the scope for this session.
   *
   * @param type - The scope type (must be registered with addScope)
   * @param id - The scope identifier
   * @param tags - Optional scope metadata tags
   * @returns The session instance for chaining
   *
   * @example
   * ```typescript
   * session.scope('organization', 'org_456', { plan: 'enterprise' })
   * ```
   */
  scope(type: TScope, id: string, tags?: TelemetryTags): this

  /**
   * Sets session-level attributes.
   * These will be merged with event-level attributes.
   *
   * @param attrs - The attributes to set
   * @returns The session instance for chaining
   *
   * @example
   * ```typescript
   * session.attributes({ 'ctx.request.id': 'req-abc', 'ctx.correlation.id': 'corr-123' })
   * ```
   */
  attributes(attrs: TelemetryAttributes): this

  /**
   * Emits a telemetry event within this session's context.
   *
   * @param name - The event name
   * @param input - Optional emit input (level, attributes, etc.)
   *
   * @example
   * ```typescript
   * session.emit('user.action', { level: 'info', attributes: { 'ctx.action': 'click' } })
   * ```
   */
  emit<TName extends string>(name: TName, input?: TelemetryEmitInput<TName>): void

  /**
   * Runs a function within this session's context.
   * The session becomes the active session for all telemetry.emit() calls
   * made within the function.
   *
   * @param fn - The function to run
   * @returns A promise resolving to the function's return value
   *
   * @example
   * ```typescript
   * const result = await session.run(async () => {
   *   // All emit calls here use this session
   *   telemetry.emit('step.one', {})
   *   telemetry.emit('step.two', {})
   *   return 'done'
   * })
   * ```
   */
  run<T>(fn: () => Promise<T> | T): Promise<T>

  /**
   * Ends the session.
   * After calling end(), the session cannot be used for emitting events.
   *
   * @returns A promise that resolves when the session is ended
   *
   * @example
   * ```typescript
   * await session.end()
   * ```
   */
  end(): Promise<void>

  /**
   * Gets the current session state.
   * Useful for debugging or inspection.
   *
   * @returns The session state
   */
  getState(): TelemetrySessionState
}

/**
 * AsyncLocalStorage instance for session context.
 */
const sessionStorage = new AsyncLocalStorage<TelemetrySessionState>()

/**
 * Gets the current active session state from AsyncLocalStorage.
 *
 * @returns The active session state or undefined
 *
 * @example
 * ```typescript
 * const state = getActiveSession()
 * if (state) {
 *   console.log('Active session:', state.sessionId)
 * }
 * ```
 */
export function getActiveSession(): TelemetrySessionState | undefined {
  return sessionStorage.getStore()
}

/**
 * Creates a new telemetry session.
 *
 * @param emitFn - The emit function to use for this session
 * @returns A new session instance
 */
export function createSession<TActor extends string = string, TScope extends string = string>(
  emitFn: SessionEmitFn,
): IgniterTelemetrySession<TActor, TScope> {
  const state: TelemetrySessionState = {
    sessionId: generateSessionId(),
    ended: false,
    startedAt: new Date().toISOString(),
  }

  const session: IgniterTelemetrySession<TActor, TScope> = {
    id(sessionId: string) {
      if (state.ended) {
        throw new IgniterTelemetryError({
          code: 'TELEMETRY_SESSION_ENDED',
          message: 'Cannot modify session after it has ended',
          statusCode: 400,
        })
      }
      state.sessionId = sessionId
      return this
    },

    actor(type: TActor, id?: string, tags?: TelemetryTags) {
      if (state.ended) {
        throw new IgniterTelemetryError({
          code: 'TELEMETRY_SESSION_ENDED',
          message: 'Cannot modify session after it has ended',
          statusCode: 400,
        })
      }
      state.actor = { type, id, tags }
      return this
    },

    scope(type: TScope, id: string, tags?: TelemetryTags) {
      if (state.ended) {
        throw new IgniterTelemetryError({
          code: 'TELEMETRY_SESSION_ENDED',
          message: 'Cannot modify session after it has ended',
          statusCode: 400,
        })
      }
      state.scope = { type, id, tags }
      return this
    },

    attributes(attrs: TelemetryAttributes) {
      if (state.ended) {
        throw new IgniterTelemetryError({
          code: 'TELEMETRY_SESSION_ENDED',
          message: 'Cannot modify session after it has ended',
          statusCode: 400,
        })
      }
      state.attributes = { ...state.attributes, ...attrs }
      return this
    },

    emit<TName extends string>(name: TName, input?: TelemetryEmitInput<TName>) {
      if (state.ended) {
        throw new IgniterTelemetryError({
          code: 'TELEMETRY_SESSION_ENDED',
          message: 'Cannot emit after session has ended',
          statusCode: 400,
        })
      }
      emitFn(name, input, state)
    },

    async run<T>(fn: () => Promise<T> | T): Promise<T> {
      if (state.ended) {
        throw new IgniterTelemetryError({
          code: 'TELEMETRY_SESSION_ENDED',
          message: 'Cannot run after session has ended',
          statusCode: 400,
        })
      }

      return new Promise<T>((resolve, reject) => {
        sessionStorage.run(state, async () => {
          try {
            const result = await fn()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        })
      })
    },

    async end(): Promise<void> {
      state.ended = true
    },

    getState(): TelemetrySessionState {
      return { ...state }
    },
  }

  return session
}

/**
 * Runs a function with a specific session state as active.
 * Used internally for session.run() implementation.
 *
 * @param state - The session state to use
 * @param fn - The function to run
 * @returns A promise resolving to the function's return value
 */
export function runWithSession<T>(state: TelemetrySessionState, fn: () => Promise<T> | T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    sessionStorage.run(state, async () => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })
  })
}
