/**
 * Helpers for building consistent key/queue prefixes.
 */
export class IgniterJobsPrefix {
  public static readonly BASE_PREFIX = 'igniter:jobs'

  /**
   * Builds a normalized queue name using the global prefix and queue id.
   *
   * @example
   * ```typescript
   * const name = IgniterJobsPrefix.buildQueueName('email')
   * // -> igniter:jobs:email
   * ```
   */
  public static buildQueueName(queue: string): string {
    return `${IgniterJobsPrefix.BASE_PREFIX}:${queue}`
  }

  /**
   * Builds the event channel used for pub/sub.
   *
   * Unscoped events are published to a global channel per service/environment.
   * Scoped events are also published to an additional channel for that scope.
   */
  public static buildEventsChannel(params: {
    service: string
    environment: string
    scope?: { type: string; id: string | number }
  }): string {
    const base = `${IgniterJobsPrefix.BASE_PREFIX}:events:${params.environment}:${params.service}`
    if (!params.scope) return base
    return `${base}:scope:${params.scope.type}:${params.scope.id}`
  }
}
