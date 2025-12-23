/**
 * @fileoverview Scope types for @igniter-js/store multi-tenant support
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
 * Scope definition registry type.
 */
export type IgniterStoreScopeDefinition = {
  [key: string]: IgniterStoreScopeOptions
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
