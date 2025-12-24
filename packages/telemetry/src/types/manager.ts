import type { IgniterTelemetryEmitInput } from "./emit"
import type { IgniterTelemetryEventsRegistry, IgniterTelemetryFlattenRegistryKeys } from "./events"
import type { IIgniterTelemetrySession } from "./session"

/**
 * Interface for the IgniterTelemetryManager runtime.
 *
 * @typeParam TRegistry - The events registry type
 * @typeParam TScopes - Valid scope types
 * @typeParam TActors - Valid actor types
 */
export interface IIgniterTelemetryManager<
  TRegistry extends IgniterTelemetryEventsRegistry = IgniterTelemetryEventsRegistry,
  TScopes extends string = string,
  TActors extends string = string,
> {
  /**
   * Emits a telemetry event.
   *
   * If called within a session.run() context, uses that session.
   * Otherwise, creates an implicit session for the event.
   *
   * @param name - The event name
   * @param input - Optional emit configuration
   *
   * @example
   * ```typescript
   * telemetry.emit('user.login', {
   *   level: 'info',
   *   attributes: { 'ctx.user.id': '123' },
   * })
   * ```
   */
  emit<TName extends IgniterTelemetryFlattenRegistryKeys<TRegistry> | (string & {})>(
    name: TName,
    input?: IgniterTelemetryEmitInput<TName>,
  ): void

  /**
   * Creates a new telemetry session.
   *
   * @returns A new session instance
   *
   * @example
   * ```typescript
   * const session = telemetry.session()
   *   .actor('user', 'usr_123')
   *   .scope('organization', 'org_456')
   *
   * session.emit('event', {})
   * await session.end()
   * ```
   */
  session(): IIgniterTelemetrySession<TActors, TScopes>

  /**
   * Flushes all pending telemetry events.
   * Calls flush() on all transports that support it.
   *
   * @returns A promise that resolves when flushing is complete
   */
  flush(): Promise<void>

  /**
   * Shuts down the telemetry system.
   * Flushes pending events and closes all transports.
   *
   * @returns A promise that resolves when shutdown is complete
   */
  shutdown(): Promise<void>

  /**
   * Gets the service name.
   */
  readonly service: string

  /**
   * Gets the environment name.
   */
  readonly environment: string

  /**
   * Gets the service version (if set).
   */
  readonly version?: string
}
