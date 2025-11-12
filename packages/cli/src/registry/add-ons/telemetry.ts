import { BaseAddOn } from "@/core/registry/add-ons/base-addon";
import path from "path";

export class TelemetryAddOn extends BaseAddOn {
  name = "Telemetry";
  description = "Telemetry for tracking requests and errors";
  value = "telemetry";
  hint = "For observability";
  dockerServices = [];
  templates = [
    {
      template: path.resolve(
        process.cwd(),
        "templates/add-ons/telemetry/telemetry.ts.hbs",
      ),
      outputPath: "src/services/telemetry.ts",
    },
  ];
  dependencies = [
    {
      name: "@igniter-js/core",
      version: "latest",
      type: "dependency",
    },
  ];
  envVars = [
    {
      key: "IGNITER_TELEMETRY_ENABLE_TRACING",
      value: "true",
      description: "Enable telemetry tracing",
    },
    {
      key: "IGNITER_TELEMETRY_ENABLE_METRICS",
      value: "true",
      description: "Enable telemetry metrics",
    },
    {
      key: "IGNITER_TELEMETRY_ENABLE_EVENTS",
      value: "true",
      description: "Enable telemetry events",
    },
    {
      key: "IGNITER_TELEMETRY_ENABLE_CLI_INTEGRATION",
      value: "true",
      description: "Enable telemetry CLI integration",
    },
  ];
}
