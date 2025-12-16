/**
 * @fileoverview Event utilities for @igniter-js/jobs
 * @module @igniter-js/jobs/utils/events.utils
 */

import type { IgniterJobsAdapter } from "../types/adapter";
import type { IgniterJobsEvent } from "../types/events";
import type { IgniterJobsScopeEntry } from "../types/scope";
import { IgniterJobsPrefix } from "./prefix";

/**
 * Static utility class for building and publishing job events.
 */
export class IgniterJobsEventsUtils {
  /**
   * Constructs a standardized job event type string.
   *
   * @param queue - The queue name.
   * @param jobName - The job name.
   * @param event - The specific event name (e.g., 'started', 'completed').
   * @returns A string in the format `queue:jobName:event`.
   */
  public static buildJobEventType(
    queue: string,
    jobName: string,
    event: string,
  ): string {
    return `${queue}:${jobName}:${event}`;
  }

  /**
   * Publishes a job event to the configured adapter.
   * Handles publishing to both the base channel and the scope-specific channel if a scope is provided.
   *
   * @param params - Configuration parameters for publishing the event.
   */
  public static async publishJobsEvent(params: {
    adapter: IgniterJobsAdapter;
    service: string;
    environment: string;
    scope?: IgniterJobsScopeEntry;
    event: IgniterJobsEvent;
  }): Promise<void> {
    const baseChannel = IgniterJobsPrefix.buildEventsChannel({
      service: params.service,
      environment: params.environment,
    });
    await params.adapter.publishEvent(baseChannel, params.event);

    if (params.scope) {
      const scopeChannel = IgniterJobsPrefix.buildEventsChannel({
        service: params.service,
        environment: params.environment,
        scope: { type: params.scope.type, id: params.scope.id },
      });
      await params.adapter.publishEvent(scopeChannel, params.event);
    }
  }
}
