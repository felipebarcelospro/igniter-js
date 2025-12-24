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
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { IgniterTelemetryAttributes, IgniterTelemetryTags } from '../types/envelope'
import type { IgniterTelemetryEmitInput } from '../types/emit'
import { IgniterTelemetryId } from '../utils/id'
import { IgniterTelemetryError } from '../errors/telemetry.error'
import type {
  IgniterSessionEmitCallback,
  IIgniterTelemetrySession,
  IgniterTelemetrySessionState,
} from '../types/session'

/**
 * AsyncLocalStorage instance for session context.
 * Shared across all session instances for context isolation.
 */
const sessionStorage = new AsyncLocalStorage<IgniterTelemetrySessionState>()

/**
 * Session implementation class for telemetry context management.
 *
 * Provides a fluent API for building session context and emitting events
 * with proper actor, scope, and attribute tracking.
 *
 * @example
 * ```typescript
 * const session = IgniterTelemetrySession.create(emitFn)
 *   .actor('user', 'usr_123')
 *   .scope('organization', 'org_456')
 *
 * session.emit('user.action', { attributes: {} })
 * await session.end()
 * ```
 */
export class IgniterTelemetrySession<TActor extends string = string, TScope extends string = string>
  implements IIgniterTelemetrySession<TActor, TScope>
{
  /**
   * Internal session state.
   */
  private readonly state: IgniterTelemetrySessionState

  /**
   * Emit callback function.
   */
  private readonly emitFn: IgniterSessionEmitCallback

  /**
   * Private constructor - use static create() method.
   */
  private constructor(emitFn: IgniterSessionEmitCallback) {
    this.emitFn = emitFn
    this.state = {
      sessionId: IgniterTelemetryId.generateSessionId(),
      ended: false,
      startedAt: new Date().toISOString(),
    }
  }

  /**
   * Creates a new telemetry session.
   *
   * @param emitFn - The emit function to use for this session
   * @returns A new session instance
   *
   * @example
   * ```typescript
   * const session = IgniterTelemetrySession.create(emitFn)
   * ```
   */
  static create<TActor extends string = string, TScope extends string = string>(
    emitFn: IgniterSessionEmitCallback,
  ): IgniterTelemetrySession<TActor, TScope> {
    return new IgniterTelemetrySession<TActor, TScope>(emitFn)
  }

  /**
   * Gets the current active session state from AsyncLocalStorage.
   *
   * @returns The active session state or undefined
   *
   * @example
   * ```typescript
   * const state = IgniterTelemetrySession.getActive()
   * if (state) {
   *   console.log('Active session:', state.sessionId)
   * }
   * ```
   */
  static getActive(): IgniterTelemetrySessionState | undefined {
    return sessionStorage.getStore()
  }

  /**
   * Runs a function with a specific session state as active.
   * Used internally for session.run() implementation.
   *
   * @param state - The session state to use
   * @param fn - The function to run
   * @returns A promise resolving to the function's return value
   *
   * @example
   * ```typescript
   * await IgniterTelemetrySession.runWith(state, async () => {
   *   // Session is active here
   * })
   * ```
   */
  static runWith<T>(state: IgniterTelemetrySessionState, fn: () => Promise<T> | T): Promise<T> {
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

  /**
   * Validates that the session has not ended.
   * @throws IgniterTelemetryError if session has ended
   */
  private assertNotEnded(action: string): void {
    if (this.state.ended) {
      throw new IgniterTelemetryError({
        code: 'TELEMETRY_SESSION_ENDED',
        message: `Cannot ${action} after session has ended`,
        statusCode: 400,
      })
    }
  }

  /**
   * Sets a custom session ID.
   *
   * @param sessionId - The custom session ID to use
   * @returns This session instance for chaining
   */
  id(sessionId: string): this {
    this.assertNotEnded('modify session')
    this.state.sessionId = sessionId
    return this
  }

  /**
   * Sets the actor for this session.
   *
   * @param type - The actor type (e.g., 'user', 'service', 'system')
   * @param id - Optional actor identifier
   * @param tags - Optional additional tags for the actor
   * @returns This session instance for chaining
   */
  actor(type: TActor, id?: string, tags?: IgniterTelemetryTags): this {
    this.assertNotEnded('modify session')
    this.state.actor = { type, id, tags }
    return this
  }

  /**
   * Sets the scope for this session.
   *
   * @param type - The scope type (e.g., 'organization', 'workspace', 'project')
   * @param id - The scope identifier
   * @param tags - Optional additional tags for the scope
   * @returns This session instance for chaining
   */
  scope(type: TScope, id: string, tags?: IgniterTelemetryTags): this {
    this.assertNotEnded('modify session')
    this.state.scope = { type, id, tags }
    return this
  }

  /**
   * Sets or merges attributes for this session.
   *
   * @param attrs - Attributes to add or merge into the session
   * @returns This session instance for chaining
   */
  attributes(attrs: IgniterTelemetryAttributes): this {
    this.assertNotEnded('modify session')
    this.state.attributes = { ...this.state.attributes, ...attrs }
    return this
  }

  /**
   * Emits a telemetry event with this session's context.
   *
   * @param name - The event name
   * @param input - Optional event input with level, attributes, etc.
   */
  emit<TName extends string>(name: TName, input?: IgniterTelemetryEmitInput<TName>): void {
    this.assertNotEnded('emit')
    this.emitFn(name, input, this.state)
  }

  /**
   * Runs a function with this session as the active context.
   * The session will be available via IgniterTelemetrySession.getActive() within the callback.
   *
   * @param fn - The function to run within the session context
   * @returns A promise resolving to the function's return value
   */
  async run<T>(fn: () => Promise<T> | T): Promise<T> {
    this.assertNotEnded('run')
    return IgniterTelemetrySession.runWith(this.state, fn)
  }

  /**
   * Ends this session, preventing further modifications or emissions.
   */
  async end(): Promise<void> {
    this.state.ended = true
  }

  /**
   * Returns a copy of the current session state.
   *
   * @returns A copy of the session state object
   */
  getState(): IgniterTelemetrySessionState {
    return { ...this.state }
  }
}
