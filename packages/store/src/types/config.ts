/**
 * @fileoverview Configuration types for @igniter-js/store
 * @module @igniter-js/store/types/config
 */

import type { IgniterLogger } from '@igniter-js/core'
import type { IgniterStoreAdapter } from './adapter'
import type { IgniterStoreEventsRegistry, IgniterStoreEventsValidationOptions } from './events'
import type {
  IgniterStoreActorDefinition,
  IgniterStoreActorEntry,
  IgniterStoreScopeChain,
  IgniterStoreScopeDefinition,
} from './scope'
import type { IgniterStoreSerializer } from './serializer'

/**
 * Internal configuration for IgniterStore.
 *
 * @typeParam TRegistry - The events registry type for typed pub/sub
 * @typeParam TScopes - The scope keys type (from addScope)
 * @typeParam TActors - The actor keys type (from addActor)
 *
 * @example
 * ```typescript
 * const config: IgniterStoreConfig = {
 *   adapter: redisAdapter,
 *   service: 'my-api',
 *   environment: 'production',
 *   keyPrefix: 'ign:store',
 * }
 * ```
 */
export interface IgniterStoreConfig<
  TRegistry extends IgniterStoreEventsRegistry = IgniterStoreEventsRegistry,
  TScopes extends string = string,
  TActors extends string = string,
> {
  /** The store adapter instance */
  adapter: IgniterStoreAdapter

  /** The service name (used in key prefix) */
  service: string

  /** The environment (used in key prefix) */
  environment: string

  /** The key prefix (default: 'ign:store') */
  keyPrefix: string

  /** Custom serializer for encoding/decoding values */
  serializer: IgniterStoreSerializer

  /** Events registry for typed pub/sub (built from addEvents) */
  eventsRegistry?: TRegistry

  /** Events validation options */
  eventsValidation?: IgniterStoreEventsValidationOptions

  /** Scope definitions (built from addScope) */
  scopeDefinitions?: Record<TScopes, IgniterStoreScopeDefinition[TScopes]>

  /** Actor definitions (built from addActor) */
  actorDefinitions?: Record<TActors, IgniterStoreActorDefinition[TActors]>

  /** Logger instance */
  logger?: IgniterLogger

  /** Current scope chain (for scoped instances) */
  scopeChain: IgniterStoreScopeChain

  /** Current actor (for event context) */
  actor?: IgniterStoreActorEntry
}

/**
 * Type for key namespaces in the store.
 */
export type IgniterStoreKeyNamespace =
  | 'kv'
  | 'counter'
  | 'claim'
  | 'events'
  | 'streams'
