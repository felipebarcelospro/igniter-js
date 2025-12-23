import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterStorageAdapter } from "../adapters/storage.adapter";
import type {
  IgniterStorageAdapterCredentialsMap,
  IgniterStorageAdapterFactoryMap,
  IgniterStorageAdapterKey,
} from "./credentials";
import type { IgniterStorageHooks } from "./hooks";
import type { IgniterStoragePolicies } from "./policies";
import type { IgniterStorageScopes } from "./scopes";

/**
 * internal state for the IgniterStorageBuilder.
 */
export type IgniterStorageBuilderState = {
  /** Explicit adapter instance (highest priority). */
  adapter?: IgniterStorageAdapter;
  /** Selected adapter key when using factories. */
  adapterKey?: IgniterStorageAdapterKey;
  /** Adapter credentials for factory-built adapters. */
  adapterCredentials?: IgniterStorageAdapterCredentialsMap[IgniterStorageAdapterKey];

  /** Public base URL used for generating file links. */
  baseUrl?: string;
  /** Base path prefix applied to all storage keys. */
  basePath?: string;

  /** Logger instance for operational tracing. */
  logger?: IgniterLogger;
  /** Telemetry manager for event emission. */
  telemetry?: IgniterTelemetryManager;
  /** Lifecycle hooks for storage operations. */
  hooks?: IgniterStorageHooks;
  /** Upload policies for size, types, and extensions. */
  policies?: IgniterStoragePolicies;

  /** Registered scopes for type-safe path composition. */
  scopes: IgniterStorageScopes;

  /** Optional adapter factories used by `.withAdapter(key, credentials)`. */
  adapterFactories?: Partial<IgniterStorageAdapterFactoryMap>;
};
