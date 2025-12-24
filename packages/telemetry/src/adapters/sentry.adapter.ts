/**
 * @fileoverview Sentry transport adapter for @igniter-js/telemetry
 * @module @igniter-js/telemetry/adapters/sentry
 */

import type { IgniterTelemetryTransportAdapter } from "../types/transport";
import type { IgniterTelemetryEnvelope } from "../types/envelope";

/**
 * Partial interface for the Sentry SDK to avoid strict dependencies
 */
interface SentrySDK {
  captureException(exception: unknown, captureContext?: unknown): string;
  addBreadcrumb(breadcrumb: unknown): void;
  withScope(callback: (scope: unknown) => void): void;
}

export interface SentryTransportConfig {
  /**
   * The Sentry instance to use.
   * Pass the imported `* as Sentry` object.
   */
  sentry: any;
}

export class SentryTransportAdapter implements IgniterTelemetryTransportAdapter {
  readonly type = "sentry" as const;
  private sentry: SentrySDK;

  constructor(config: SentryTransportConfig) {
    this.sentry = config.sentry;
  }

  static create(config: SentryTransportConfig): SentryTransportAdapter {
    return new SentryTransportAdapter(config);
  }

  handle(envelope: IgniterTelemetryEnvelope): void {
    // If it's an error, capture it
    if (envelope.level === "error" || envelope.error) {
      this.captureError(envelope);
    } else {
      // Otherwise add as breadcrumb
      this.addBreadcrumb(envelope);
    }
  }

  private captureError(envelope: IgniterTelemetryEnvelope): void {
    this.sentry.withScope((scope: any) => {
      // Set tags
      scope.setTag("event_name", envelope.name);
      scope.setTag("service", envelope.service);
      scope.setTag("environment", envelope.environment);
      if (envelope.version) scope.setTag("release", envelope.version);
      if (envelope.sessionId) scope.setTag("session_id", envelope.sessionId);

      // Set user/actor if available
      if (envelope.actor) {
        scope.setUser({
          id: envelope.actor.id,
          segment: envelope.actor.type,
          ...envelope.actor.tags,
        });
      }

      // Set extra data
      scope.setContext("telemetry", {
        attributes: envelope.attributes,
        scope: envelope.scope,
        source: envelope.source,
      });

      // If there is an explicit error object, use it
      if (envelope.error) {
        const error = new Error(envelope.error.message);
        error.name = envelope.error.name;
        error.stack = envelope.error.stack;
        this.sentry.captureException(error);
      } else {
        // Otherwise treat the event itself as the issue
        this.sentry.captureException(new Error(envelope.name));
      }
    });
  }

  private addBreadcrumb(envelope: IgniterTelemetryEnvelope): void {
    this.sentry.addBreadcrumb({
      category: envelope.name.split(".")[0] || "telemetry",
      message: envelope.name,
      level: this.mapLevel(envelope.level),
      data: {
        sessionId: envelope.sessionId,
        ...envelope.attributes,
      },
      timestamp: new Date(envelope.time).getTime() / 1000,
    });
  }

  private mapLevel(level: string): string {
    switch (level) {
      case "debug":
        return "debug";
      case "info":
        return "info";
      case "warn":
        return "warning";
      case "error":
        return "error";
      default:
        return "info";
    }
  }
}
