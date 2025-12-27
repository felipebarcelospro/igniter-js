/**
 * @fileoverview Builder types for @igniter-js/store
 * @module @igniter-js/store/types/builder
 */

import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterStoreAdapter } from "./adapter";
import type {
  IgniterStoreEventsRegistry,
  IgniterStoreEventsValidationOptions,
} from "./events";
import type { IgniterStoreScopeOptions } from "./scope";
import type { IgniterStoreSerializer } from "./serializer";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";

/**
 * Reserved namespace prefixes that cannot be used by user code.
 * These are reserved for internal Igniter.js packages.
 */
export const RESERVED_NAMESPACE_PREFIXES = [
  "igniter",
  "ign",
  "__internal",
  "__",
] as const;

/**
 * Type for reserved namespace prefixes.
 */
export type ReservedNamespacePrefix = (typeof RESERVED_NAMESPACE_PREFIXES)[number];

/**
 * Builder state for IgniterStore configuration.
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The typed scope keys (from addScope)
 */
export interface IgniterStoreBuilderState<
  TRegistry extends IgniterStoreEventsRegistry = IgniterStoreEventsRegistry,
  TScopes extends string = never,
> {
  /** The store adapter */
  adapter?: IgniterStoreAdapter;
  /** The service name */
  service?: string;
  /** Custom serializer */
  serializer?: IgniterStoreSerializer;
  /** Events registry for typed pub/sub */
  eventsRegistry?: TRegistry;
  /** Events validation options */
  eventsValidation?: IgniterStoreEventsValidationOptions;
  /** Scope definitions (from addScope) */
  scopeDefinitions?: Record<string, IgniterStoreScopeOptions>;
  /** Logger instance */
  logger?: IgniterLogger;
  /** Telemetry instance for observability */
  telemetry?: IgniterTelemetryManager<any>;
}
