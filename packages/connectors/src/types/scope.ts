/**
 * @fileoverview Scope types for IgniterConnector multi-tenant support
 * @module @igniter-js/connectors/types/scope
 */

/**
 * Options for defining a scope.
 *
 * @example
 * ```typescript
 * // Required scope - must have an identifier
 * const orgScope: IgniterConnectorScopeOptions = {
 *   required: true,
 * }
 *
 * // Optional scope - identifier is optional (e.g., for system-level connectors)
 * const systemScope: IgniterConnectorScopeOptions = {
 *   required: false,
 * }
 * ```
 */
export interface IgniterConnectorScopeOptions {
  /**
   * Whether an identifier is required for this scope.
   *
   * - `true`: An identifier must be provided (e.g., 'organization', 'org_123')
   * - `false`: No identifier needed (e.g., 'system' scope for internal connectors)
   *
   * @default true
   */
  required?: boolean
}

/**
 * Internal scope definition after registration.
 */
export interface IgniterConnectorScopeDefinition {
  /** The scope key (e.g., 'organization', 'user', 'system') */
  key: string
  /** Whether an identifier is required */
  required: boolean
}

/**
 * Map of scope keys to their definitions.
 */
export type IgniterConnectorScopeMap = Record<
  string,
  IgniterConnectorScopeDefinition
>

/**
 * Extract scope keys from a scope map type.
 *
 * @typeParam TScopes - The scope map type
 */
export type IgniterConnectorScopeKeys<TScopes extends IgniterConnectorScopeMap> =
  keyof TScopes & string

/**
 * Check if a scope requires an identifier.
 *
 * @typeParam TScopes - The scope map type
 * @typeParam TKey - The specific scope key
 */
export type IgniterConnectorScopeRequiresIdentifier<
  TScopes extends IgniterConnectorScopeMap,
  TKey extends keyof TScopes,
> = TScopes[TKey]['required'] extends true ? true : false
