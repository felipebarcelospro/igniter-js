import type { IIgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterCoreTelemetryEvents } from "../telemetry";

export type IgniterCoreTelemetryManager =
  IIgniterTelemetryManager<IgniterCoreTelemetryEvents>;
