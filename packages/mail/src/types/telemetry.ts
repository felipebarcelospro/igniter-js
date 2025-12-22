import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterMailTelemetryEvents } from "../telemetry";

/**
 * Mail telemetry event names.
 */
export const IGNITER_MAIL_TELEMETRY_EVENTS = {
  /** Emitted when mail send operation starts */
  SEND_STARTED: "igniter.mail.send.started",
  /** Emitted when mail send operation succeeds */
  SEND_SUCCESS: "igniter.mail.send.success",
  /** Emitted when mail send operation fails */
  SEND_ERROR: "igniter.mail.send.error",
  /** Emitted when mail schedule operation starts */
  SCHEDULE_STARTED: "igniter.mail.schedule.started",
  /** Emitted when mail schedule operation succeeds */
  SCHEDULE_SUCCESS: "igniter.mail.schedule.success",
  /** Emitted when mail schedule operation fails */
  SCHEDULE_ERROR: "igniter.mail.schedule.error",
} as const;

export const MAIL_TELEMETRY_EVENTS = IGNITER_MAIL_TELEMETRY_EVENTS;

export type IgniterMailTelemetryEvent =
  (typeof IGNITER_MAIL_TELEMETRY_EVENTS)[keyof typeof IGNITER_MAIL_TELEMETRY_EVENTS];

export type IgniterMailTelemetryRegistry = {
  [K in IgniterMailTelemetryEvents["namespace"]]: IgniterMailTelemetryEvents["events"];
};

export type IgniterMailTelemetry = IgniterTelemetryManager<IgniterMailTelemetryRegistry>;
