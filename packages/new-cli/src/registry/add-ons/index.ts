import { AddOnRegistry } from "@/core/registry/add-ons/add-on-registry";
import { RedisStoreAddOn } from "./store";
import { JobsAddOn } from "./jobs";
import { McpServerAddOn } from "./mcp";
import { LoggingAddOn } from "./logging";
import { TelemetryAddOn } from "./telemetry";
import { BotsAddOn } from "./bots";
import { DatabaseAddOn } from "./database";
import { AuthAddOn } from "./auth";
import { ShadcnAddOn } from "./shadcn";

/**
 * Add-on registry
 */
export const addOnRegistry = AddOnRegistry.create()
  .register(new RedisStoreAddOn())
  .register(new JobsAddOn())
  .register(new McpServerAddOn())
  .register(new LoggingAddOn())
  .register(new TelemetryAddOn())
  .register(new BotsAddOn())
  .register(new DatabaseAddOn())
  .register(new AuthAddOn())
  .register(new ShadcnAddOn())
  .build();
