/**
 * @fileoverview Key builder utility for @igniter-js/store
 * @module @igniter-js/store/builders/store-key
 *
 * @description
 * Provides utilities for building consistent, namespaced keys
 * with support for environment, service, and scope prefixes.
 */

import type { IgniterStoreScopeChain } from '../types/scope'
import type { IgniterStoreKeyNamespace } from '../types/config'

/**
 * Options for building a store key.
 */
export interface IgniterStoreKeyBuilderOptions {
  /** Service name */
  service: string
  /** Current scope chain */
  scopeChain: IgniterStoreScopeChain
}

/**
 * Builds consistent, namespaced keys for store operations.
 *
 * Key format:
 * `<prefix>:<service>[:<scope>:<id>...]:namespace:<key>`
 *
 * @example
 * ```typescript
 * const builder = new IgniterStoreKeyBuilder({
 *   service: 'my-api',
 *   scopeChain: [{ key: 'organization', identifier: 'org_123' }],
 * })
 *
 * builder.build('kv', 'user:123')
 * // Returns: 'igniter:store:my-api:organization:org_123:kv:user:123'
 * ```
 */
export class IgniterStoreKeyBuilder {
  private readonly prefix: string

  /**
   * Creates a new IgniterStoreKeyBuilder.
   *
   * @param options - The builder options
   */
  constructor(private readonly options: IgniterStoreKeyBuilderOptions) {
    // Build the base prefix once
    const parts: string[] = [
      'igniter:store',
      options.service,
    ]

    // Add scope chain
    for (const scope of options.scopeChain) {
      parts.push(scope.key, String(scope.identifier))
    }

    this.prefix = parts.join(':')
  }

  /**
   * Builds a complete key with namespace and suffix.
   *
   * @param namespace - The key namespace (kv, counter, claim, events, streams)
   * @param key - The key suffix
   * @returns The complete namespaced key
   *
   * @example
   * ```typescript
   * builder.build('kv', 'user:123')
   * // 'igniter:store:my-api:kv:user:123'
   *
   * builder.build('events', 'user:created')
   * // 'igniter:store:my-api:events:user:created'
   * ```
   */
  build(namespace: IgniterStoreKeyNamespace, key: string): string {
    return `${this.prefix}:${namespace}:${key}`
  }

  /**
   * Builds a scan pattern with namespace.
   *
   * @param namespace - The key namespace
   * @param pattern - The pattern suffix (may include *)
   * @returns The complete pattern
   *
   * @example
   * ```typescript
   * builder.pattern('kv', 'user:*')
   * // 'igniter:store:my-api:kv:user:*'
   * ```
   */
  pattern(namespace: IgniterStoreKeyNamespace, pattern: string): string {
    return `${this.prefix}:${namespace}:${pattern}`
  }

  /**
   * Creates a new builder with an additional scope.
   *
   * @param key - The scope key
   * @param identifier - The scope identifier
   * @returns A new builder with the added scope
   *
   * @example
   * ```typescript
   * const scopedBuilder = builder.withScope('workspace', 'ws_456')
   * scopedBuilder.build('kv', 'settings')
   * // 'igniter:store:my-api:organization:org_123:workspace:ws_456:kv:settings'
   * ```
   */
  withScope(key: string, identifier: string | number): IgniterStoreKeyBuilder {
    return new IgniterStoreKeyBuilder({
      ...this.options,
      scopeChain: [
        ...this.options.scopeChain,
        { key, identifier: String(identifier) },
      ],
    })
  }

  /**
   * Gets the base prefix without namespace.
   *
   * @returns The base prefix
   */
  getPrefix(): string {
    return this.prefix
  }
}
