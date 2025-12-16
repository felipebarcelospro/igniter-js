import type { IgniterJobsScopeEntry } from "./scope";

/**
 * Base shape for any jobs event emitted by the package.
 */
export interface IgniterJobsEvent<
  TType extends string = string,
  TPayload = unknown,
> {
  type: TType;
  data: TPayload;
  timestamp: Date;
  scope?: IgniterJobsScopeEntry;
}

/**
 * Handler signature for subscribe/listen APIs.
 */
export type IgniterJobsEventHandler<
  TEvent extends IgniterJobsEvent = IgniterJobsEvent,
> = (event: TEvent) => void | Promise<void>;

/**
 * Telemetry instance expected by the jobs package.
 *
 * This interface mirrors the public API of `IgniterTelemetry` from `@igniter-js/telemetry`.
 * It is intentionally defined here to avoid a hard dependency on the telemetry package,
 * which is an optional peer dependency.
 *
 * The jobs runtime calls `telemetry.emit(eventName, { attributes })` during job lifecycle
 * events (enqueued, started, completed, failed, etc.).
 *
 * @example
 * ```typescript
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 * import { IgniterJobsTelemetryEvents } from '@igniter-js/jobs'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .addEvents(IgniterJobsTelemetryEvents)
 *   .build()
 *
 * const jobs = IgniterJobs.create()
 *   .withTelemetry(telemetry)
 *   // ...
 *   .build()
 * ```
 */
export interface IgniterJobsTelemetry {
  /**
   * Emits a telemetry event with optional attributes.
   *
   * @param name - The event name (e.g., 'igniter.jobs.job.completed')
   * @param input - Optional emit configuration containing attributes, level, etc.
   */
  emit(
    name: string,
    input?: {
      attributes?: Record<string, string | number | boolean | null>;
      level?: string;
    },
  ): void;

  /**
   * The service name configured on the telemetry instance.
   */
  readonly service: string;

  /**
   * The environment name configured on the telemetry instance.
   */
  readonly environment: string;
}
