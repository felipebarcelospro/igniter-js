import { BaseAddOn } from "@/core/registry/add-ons/base-addon";
import { resolveTemplatePath } from "@/core/registry/starters/base-starter";

export class LoggingAddOn extends BaseAddOn {
  name = "Logging";
  description = "Advanced console logging with structured output";
  value = "logging";
  hint = "For better observability";
  templates = [
    {
      template: resolveTemplatePath("add-ons/logging/logger.ts.hbs"),
      outputPath: "src/services/logger.ts",
    },
  ];
  dependencies = [
    {
      name: "@igniter-js/core",
      version: "latest",
      type: "dependency",
    },
  ];
  dockerServices = [];
  envVars = [
    {
      key: "IGNITER_LOG_LEVEL",
      value: "info",
      description: "Logging level (debug, info, warn, error)",
    },
  ];
}
