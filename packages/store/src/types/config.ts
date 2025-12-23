/**
 * @fileoverview Configuration types for @igniter-js/store
 * @module @igniter-js/store/types/config
 */

import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterStoreTelemetry } from "./telemetry";
import type { IgniterStoreAdapter } from "./adapter";
import type {
  IgniterStoreEventsRegistry,
  IgniterStoreEventsValidationOptions,
} from "./events";
import type { IgniterStoreScopeChain, IgniterStoreScopeDefinition } from "./scope";
import type { IgniterStoreSerializer } from "./serializer";

/**
 * Internal configuration for IgniterStore.
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The scope keys type (from addScope)
 *
 * @example
 * ```typescript
 * const config: IgniterStoreConfig = {
 *   adapter: redisAdapter,
 *   service: 'my-api',
 * }
 * ```
 */
export interface IgniterStoreConfig<
  TRegistry extends IgniterStoreEventsRegistry = IgniterStoreEventsRegistry,
  TScopes extends string = string,
> {
  /** The store adapter instance */
  adapter: IgniterStoreAdapter;

  /** The service name (used in key prefix) */
  service: string;

  /** Custom serializer for encoding/decoding values */
  serializer: IgniterStoreSerializer;

  /** Events registry for typed pub/sub (built from addEvents) */
  eventsRegistry?: TRegistry;

  /** Events validation options */
  eventsValidation?: IgniterStoreEventsValidationOptions;

  /** Scope definitions (built from addScope) */
  scopeDefinitions?: Record<TScopes, IgniterStoreScopeDefinition[TScopes]>;

  /** Logger instance */
  logger?: IgniterLogger;

  /** Telemetry manager for observability */
  telemetry?: IgniterStoreTelemetry;

  /** Current scope chain (for scoped instances) */
  scopeChain: IgniterStoreScopeChain;

}

/**
 * Type for key namespaces in the store.
 */
export type IgniterStoreKeyNamespace =
  | "kv"
  | "counter"
  | "claim"
  | "events"
  | "streams";
