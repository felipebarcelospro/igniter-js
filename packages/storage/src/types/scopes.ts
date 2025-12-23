/**
 * @packageDocumentation
 *
 * Type-level utilities for scopes in `@igniter-js/storage`.
 *
 * This module provides TypeScript type utilities for defining and working with storage scopes.
 * Scopes allow you to organize files into logical namespaces with optional dynamic identifiers,
 * providing type-safe path management throughout your application.
 */

/**
 * String template used to define a scope's path structure.
 *
 * Scope templates can include static path segments and the special `[identifier]` placeholder
 * for dynamic values that are provided at runtime.
 *
 * @remarks
 * The `[identifier]` placeholder is replaced with an actual identifier value when using the scope.
 * Only one `[identifier]` placeholder is supported per scope template.
 *
 * @example Static scope templates
 * ```typescript
 * '/public'           // Files accessible to everyone
 * '/temp'             // Temporary uploads
 * '/assets/images'    // Static asset organization
 * ```
 *
 * @example Dynamic scope templates
 * ```typescript
 * '/users/[identifier]'             // Per-user storage
 * '/teams/[identifier]/documents'   // Team-specific documents
 * '/products/[identifier]/images'   // Product image galleries
 * ```
 *
 * @example Usage with builder
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .addScope('user', '/users/[identifier]')
 *   .addScope('public', '/public')
 *   .addScope('temp', '/temp')
 *   .build()
 *
 * // Type-safe usage
 * const userStorage = storage.scope('user', '123')
 * await userStorage.upload(file, 'avatar.png')
 * // Uploads to: /users/123/avatar.png
 *
 * const publicStorage = storage.scope('public')
 * await publicStorage.upload(file, 'logo.png')
 * // Uploads to: /public/logo.png
 * ```
 *
 * @public
 */
export type IgniterStorageScopeTemplate = string;

/**
 * Type-level utility that checks if a template string contains the `[identifier]` placeholder.
 *
 * This utility type returns `true` if the template includes `[identifier]`, and `false` otherwise.
 * It's used internally to enforce type safety when using scopes - scopes with identifiers
 * require the identifier to be provided, while scopes without identifiers don't.
 *
 * @template T - The template string to check
 *
 * @remarks
 * This is a compile-time check that provides TypeScript inference for the `requiresIdentifier`
 * property in scope definitions.
 *
 * @example Type inference in action
 * ```typescript
 * type HasId = ContainsIdentifier<'/users/[identifier]'>  // true
 * type NoId = ContainsIdentifier<'/public'>               // false
 *
 * // Used internally by the builder:
 * const storage = IgniterStorageBuilder.create()
 *   .addScope('user', '/users/[identifier]')
 *   .build()
 *
 * // TypeScript enforces identifier parameter:
 * storage.scope('user', '123')  // ✓ Valid - identifier required
 * storage.scope('user')         // ✗ Error - identifier required
 * ```
 *
 * @example Custom scope utilities
 * ```typescript
 * type UserScope = ContainsIdentifier<'/users/[identifier]'>     // true
 * type TeamScope = ContainsIdentifier<'/teams/[identifier]'>     // true
 * type PublicScope = ContainsIdentifier<'/public'>               // false
 * type StaticScope = ContainsIdentifier<'/assets/images'>        // false
 * ```
 *
 * @public
 */
export type ContainsIdentifier<T extends string> =
  T extends `${string}[identifier]${string}` ? true : false;

/**
 * Defines the structure of a storage scope including its path template
 * and whether it requires a runtime identifier.
 *
 * This type encapsulates both the path pattern and the metadata about whether
 * an identifier is needed when using the scope.
 *
 * @template TPath - The path template string, which may include `[identifier]`
 *
 * @remarks
 * Scope definitions are created automatically by the builder's `addScope` method.
 * You rarely need to create these manually.
 *
 * @example Scope definition structure
 * ```typescript
 * // With identifier
 * const userScopeDef: IgniterStorageScopeDefinition<'/users/[identifier]'> = {
 *   path: '/users/[identifier]',
 *   requiresIdentifier: true  // Inferred from path
 * }
 *
 * // Without identifier
 * const publicScopeDef: IgniterStorageScopeDefinition<'/public'> = {
 *   path: '/public',
 *   requiresIdentifier: false  // Inferred from path
 * }
 * ```
 *
 * @example Using scope definitions
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .addScope('user', '/users/[identifier]')
 *   .addScope('public', '/public')
 *   .build()
 *
 * // The builder creates scope definitions internally:
 * // {
 * //   user: { path: '/users/[identifier]', requiresIdentifier: true },
 * //   public: { path: '/public', requiresIdentifier: false }
 * // }
 * ```
 *
 * @example Type-safe scope usage
 * ```typescript
 * // When requiresIdentifier is true:
 * const userScope = storage.scope('user', '123')  // ✓ Identifier required
 *
 * // When requiresIdentifier is false:
 * const publicScope = storage.scope('public')     // ✓ No identifier needed
 * const publicScope2 = storage.scope('public', undefined)  // ✓ Also valid
 * ```
 *
 * @public
 */
export type IgniterStorageScopeDefinition<TPath extends string> = {
  /**
   * The path template for this scope.
   *
   * This template defines the base path structure for files stored under this scope.
   * It may include the `[identifier]` placeholder for dynamic path segments.
   *
   * @example
   * ```typescript
   * '/users/[identifier]'
   * '/public'
   * '/teams/[identifier]/files'
   * ```
   */
  path: TPath;

  /**
   * Whether this scope requires an identifier at runtime.
   *
   * This boolean is automatically inferred from the path template:
   * - `true` if the path contains `[identifier]`
   * - `false` otherwise
   *
   * This property is used to enforce type safety when calling the `scope` method.
   *
   * @example
   * ```typescript
   * // With [identifier] in path:
   * { path: '/users/[identifier]', requiresIdentifier: true }
   *
   * // Without [identifier] in path:
   * { path: '/public', requiresIdentifier: false }
   * ```
   */
  requiresIdentifier: ContainsIdentifier<TPath>;
};

/**
 * A collection of named scope definitions.
 *
 * This type represents the complete map of all scopes available in a storage instance.
 * Each scope is identified by a unique key and contains its definition.
 *
 * @remarks
 * This type is used internally by the storage builder to maintain type information
 * about all registered scopes. It enables full TypeScript inference when using
 * the `scope` method.
 *
 * @example Basic scope collection
 * ```typescript
 * type MyScopes = {
 *   user: IgniterStorageScopeDefinition<'/users/[identifier]'>
 *   public: IgniterStorageScopeDefinition<'/public'>
 *   temp: IgniterStorageScopeDefinition<'/temp'>
 * }
 * ```
 *
 * @example Building a typed storage instance
 * ```typescript
 * const storage = IgniterStorageBuilder.create()
 *   .addScope('user', '/users/[identifier]')
 *   .addScope('public', '/public')
 *   .addScope('team', '/teams/[identifier]/files')
 *   .addScope('temp', '/temp')
 *   .build()
 *
 * // TypeScript knows all available scopes:
 * storage.scope('user', '123')     // ✓ Valid
 * storage.scope('public')          // ✓ Valid
 * storage.scope('team', 'alpha')   // ✓ Valid
 * storage.scope('temp')            // ✓ Valid
 * storage.scope('invalid')         // ✗ TypeScript error
 * ```
 *
 * @example Accessing scope metadata
 * ```typescript
 * type UserScope = MyScopes['user']
 * // { path: '/users/[identifier]', requiresIdentifier: true }
 *
 * type PublicScope = MyScopes['public']
 * // { path: '/public', requiresIdentifier: false }
 * ```
 *
 * @example Advanced: Conditional logic based on scopes
 * ```typescript
 * function uploadToScope<K extends keyof MyScopes>(
 *   storage: IgniterStorage<MyScopes>,
 *   scopeKey: K,
 *   identifier: MyScopes[K]['requiresIdentifier'] extends true ? string : undefined,
 *   file: File
 * ) {
 *   const scoped = identifier
 *     ? storage.scope(scopeKey as any, identifier)
 *     : storage.scope(scopeKey as any)
 *
 *   return scoped.upload(file, 'uploaded-file')
 * }
 * ```
 *
 * @public
 */
export type IgniterStorageScopes = {
  [key: string]: IgniterStorageScopeDefinition<string>;
};
