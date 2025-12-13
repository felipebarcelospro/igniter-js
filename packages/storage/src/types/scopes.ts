/**
 * @packageDocumentation
 *
 * Type-level utilities for scopes.
 */

export type IgniterStorageScopeTemplate = string

export type ContainsIdentifier<T extends string> =
  T extends `${string}[identifier]${string}` ? true : false

export type IgniterStorageScopeDefinition<TPath extends string> = {
  path: TPath
  requiresIdentifier: ContainsIdentifier<TPath>
}

export type IgniterStorageScopes = Record<
  string,
  IgniterStorageScopeDefinition<string>
>
