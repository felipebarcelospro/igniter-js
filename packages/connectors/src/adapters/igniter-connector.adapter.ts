/**
 * @fileoverview Abstract base adapter for IgniterConnector database operations
 * @module @igniter-js/connectors/adapters/base
 */

import type {
  IgniterConnectorAdapter,
  IgniterConnectorRecord,
} from '../types/adapter'

/**
 * Abstract base class for connector database adapters.
 * Extend this class to implement custom storage backends.
 *
 * @example
 * ```typescript
 * import { IgniterConnectorBaseAdapter } from '@igniter-js/connectors'
 *
 * class MyAdapter extends IgniterConnectorBaseAdapter {
 *   async get(scope, identity, provider) {
 *     // Custom implementation
 *   }
 *   // ... other methods
 * }
 * ```
 */
export abstract class IgniterConnectorBaseAdapter
  implements IgniterConnectorAdapter
{
  /**
   * Get a single connector record.
   *
   * @param scope - The scope type (e.g., 'organization', 'user')
   * @param identity - The scope identifier (e.g., 'org_123')
   * @param provider - The connector key (e.g., 'telegram')
   * @returns The connector record or null if not found
   */
  abstract get(
    scope: string,
    identity: string,
    provider: string
  ): Promise<IgniterConnectorRecord | null>

  /**
   * List all connector records for a scope.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @returns Array of connector records
   */
  abstract list(
    scope: string,
    identity: string
  ): Promise<IgniterConnectorRecord[]>

  /**
   * Save a new connector record.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @param value - The encrypted configuration (JSON)
   * @param enabled - Whether the connector is enabled
   * @returns The created connector record
   */
  abstract save(
    scope: string,
    identity: string,
    provider: string,
    value: Record<string, unknown>,
    enabled?: boolean
  ): Promise<IgniterConnectorRecord>

  /**
   * Update an existing connector record.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @param data - Partial update data
   * @returns The updated connector record
   */
  abstract update(
    scope: string,
    identity: string,
    provider: string,
    data: Partial<Pick<IgniterConnectorRecord, 'value' | 'enabled'>>
  ): Promise<IgniterConnectorRecord>

  /**
   * Delete a connector record.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   */
  abstract delete(
    scope: string,
    identity: string,
    provider: string
  ): Promise<void>

  /**
   * Check if a connector exists.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @returns True if the connector exists
   */
  async exists(
    scope: string,
    identity: string,
    provider: string
  ): Promise<boolean> {
    const record = await this.get(scope, identity, provider)
    return record !== null
  }

  /**
   * Enable a connector.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @returns The updated connector record
   */
  async enable(
    scope: string,
    identity: string,
    provider: string
  ): Promise<IgniterConnectorRecord> {
    return this.update(scope, identity, provider, { enabled: true })
  }

  /**
   * Disable a connector.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @returns The updated connector record
   */
  async disable(
    scope: string,
    identity: string,
    provider: string
  ): Promise<IgniterConnectorRecord> {
    return this.update(scope, identity, provider, { enabled: false })
  }

  /**
   * Toggle connector enabled state.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @returns The updated connector record
   */
  async toggle(
    scope: string,
    identity: string,
    provider: string
  ): Promise<IgniterConnectorRecord> {
    const record = await this.get(scope, identity, provider)
    if (!record) {
      throw new Error(
        `Connector not found: ${scope}/${identity}/${provider}`
      )
    }
    return this.update(scope, identity, provider, { enabled: !record.enabled })
  }

  /**
   * Count total connections for a specific connector.
   * Used for non-scoped list/get operations.
   *
   * @param provider - The connector key
   * @returns The total number of connections across all scopes
   */
  abstract countConnections(provider: string): Promise<number>

  /**
   * Find a connector record by webhook secret.
   * Default implementation throws - override in subclass if needed.
   *
   * @param _provider - The connector key
   * @param _secret - The webhook secret
   * @returns The connector record or null
   */
  async findByWebhookSecret(
    _provider: string,
    _secret: string
  ): Promise<IgniterConnectorRecord | null> {
    throw new Error(
      'findByWebhookSecret not implemented. Override in your adapter if you need webhook support.'
    )
  }

  /**
   * Update webhook metadata for a connector.
   * Default implementation is a no-op - override in subclass if needed.
   *
   * @param _provider - The connector key
   * @param _secret - The webhook secret
   * @param _metadata - The metadata to update
   */
  async updateWebhookMetadata(
    _provider: string,
    _secret: string,
    _metadata: {
      lastEventAt: Date
      lastEventResult: 'success' | 'error'
      error?: string
    }
  ): Promise<void> {
    // Default no-op implementation
  }
}
