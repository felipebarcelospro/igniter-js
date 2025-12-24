import type { IgniterTelemetryEmitInput } from "./emit"
import type { IgniterTelemetryActor, IgniterTelemetryAttributes, IgniterTelemetryScope, IgniterTelemetryTags } from "./envelope"

/**
 * Session state stored in AsyncLocalStorage.
 */
export interface IgniterTelemetrySessionState {
  /** The session ID */
  sessionId: string
  /** The actor for this session */
  actor?: IgniterTelemetryActor
  /** The scope for this session */
  scope?: IgniterTelemetryScope
  /** Session-level attributes */
  attributes?: IgniterTelemetryAttributes
  /** Whether the session has ended */
  ended: boolean
  /** Timestamp when the session started */
  startedAt: string
}

/**
 * Emit function type for session to call.
 */
export type IgniterSessionEmitCallback = (
  name: string,
  input?: IgniterTelemetryEmitInput,
  sessionState?: IgniterTelemetrySessionState,
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
export interface IIgniterTelemetrySession<TActor extends string = string, TScope extends string = string> {
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
  actor(type: TActor, id?: string, tags?: IgniterTelemetryTags): this

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
  scope(type: TScope, id: string, tags?: IgniterTelemetryTags): this

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
  attributes(attrs: IgniterTelemetryAttributes): this

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
  emit<TName extends string>(name: TName, input?: IgniterTelemetryEmitInput<TName>): void

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
  getState(): IgniterTelemetrySessionState
}