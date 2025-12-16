/**
 * @fileoverview Scope and Actor types for @igniter-js/store multi-tenant support
 * @module @igniter-js/store/types/scope
 */

/**
 * Options for scope definition.
 */
export interface IgniterStoreScopeOptions {
  /** Whether this scope is required when using scoped operations (default: true) */
  required?: boolean
  /** Description of the scope for documentation */
  description?: string
}

/**
 * Options for actor definition.
 */
export interface IgniterStoreActorOptions {
  /** Whether this actor type is required (default: false) */
  required?: boolean
  /** Description of the actor for documentation */
  description?: string
}

/**
 * Scope definition registry type.
 */
export type IgniterStoreScopeDefinition = {
  [key: string]: IgniterStoreScopeOptions
}

/**
 * Actor definition registry type.
 */
export type IgniterStoreActorDefinition = {
  [key: string]: IgniterStoreActorOptions
}

/**
 * Scope chain entry representing a single scope level.
 *
 * @example
 * ```typescript
 * const scope: IgniterStoreScopeEntry = {
 *   key: 'organization',
 *   identifier: 'org_123',
 * }
 * ```
 */
export interface IgniterStoreScopeEntry {
  /** The scope key (e.g., 'organization', 'workspace', 'project') */
  key: string
  /** The scope identifier (e.g., 'org_123') */
  identifier: string
}

/**
 * Actor entry representing the current actor.
 */
export interface IgniterStoreActorEntry {
  /** The actor type (e.g., 'user', 'system', 'bot') */
  key: string
  /** The actor identifier (e.g., 'usr_123') */
  identifier: string
}

/**
 * Scope chain representing the full hierarchy of scopes.
 *
 * @example
 * ```typescript
 * const chain: IgniterStoreScopeChain = [
 *   { key: 'organization', identifier: 'org_123' },
 *   { key: 'workspace', identifier: 'ws_456' },
 * ]
 * ```
 */
export type IgniterStoreScopeChain = IgniterStoreScopeEntry[]

/**
 * Type for scope identifier - can be string or number.
 *
 * @example
 * ```typescript
 * store.scope('organization', 'org_123') // string
 * store.scope('user', 42) // number
 * ```
 */
export type IgniterStoreScopeIdentifier = string | number

