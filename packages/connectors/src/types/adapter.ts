/**
 * @fileoverview Database adapter types for IgniterConnector
 * @module @igniter-js/connectors/types/adapter
 */

/**
 * Record stored in the database representing a connector configuration.
 *
 * @example
 * ```typescript
 * const record: IgniterConnectorRecord = {
 *   id: 'cuid123',
 *   scope: 'organization',
 *   identity: 'org_456',
 *   provider: 'telegram',
 *   value: { botToken: 'encrypted...', chatId: '123' },
 *   enabled: true,
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * }
 * ```
 */
export interface IgniterConnectorRecord {
  /** Unique identifier for the record */
  id: string
  /** Scope type (e.g., 'organization', 'user', 'system') */
  scope: string
  /** Scope identifier (e.g., 'org_123') or empty string for non-required scopes */
  identity: string
  /** Connector key (e.g., 'telegram', 'mailchimp') */
  provider: string
  /** Configuration value (JSON, may contain encrypted fields) */
  value: Record<string, unknown>
  /** Whether the connector is enabled */
  enabled: boolean
  /** Record creation timestamp */
  createdAt: Date
  /** Record last update timestamp */
  updatedAt: Date
}

/**
 * Options for creating a database adapter.
 *
 * @example
 * ```typescript
 * const options: IgniterConnectorAdapterOptions = {
 *   model: 'Integration', // Prisma model name
 * }
 * ```
 */
export interface IgniterConnectorAdapterOptions<TClient> {
  /**
   * The database model/table name to use.
   * @default 'Connector'
   */
  model?: Omit<keyof TClient, symbol>
}

/**
 * Data for updating a connector record.
 */
export interface IgniterConnectorUpdateData {
  /** New configuration value */
  value?: Record<string, unknown>
  /** New enabled state */
  enabled?: boolean
}

/**
 * Abstract interface for database adapters.
 * Implement this interface to create custom database adapters.
 *
 * @example
 * ```typescript
 * class MyCustomAdapter implements IgniterConnectorAdapter {
 *   async get(scope, identity, provider) {
 *     // Custom implementation
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface IgniterConnectorAdapter {
  /**
   * Get a single connector record by scope, identity, and provider.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @returns The connector record or null if not found
   */
  get(
    scope: string,
    identity: string,
    provider: string
  ): Promise<IgniterConnectorRecord | null>

  /**
   * List all connector records for a scope and identity.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @returns Array of connector records
   */
  list(scope: string, identity: string): Promise<IgniterConnectorRecord[]>

  /**
   * Save a new connector record or update existing.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @param value - The configuration value
   * @param enabled - Whether the connector is enabled
   * @returns The saved connector record
   */
  save(
    scope: string,
    identity: string,
    provider: string,
    value: Record<string, unknown>,
    enabled: boolean
  ): Promise<IgniterConnectorRecord>

  /**
   * Update an existing connector record.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @param data - The data to update
   * @returns The updated connector record
   */
  update(
    scope: string,
    identity: string,
    provider: string,
    data: IgniterConnectorUpdateData
  ): Promise<IgniterConnectorRecord>

  /**
   * Delete a connector record.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   */
  delete(scope: string, identity: string, provider: string): Promise<void>

  /**
   * Check if a connector record exists.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @returns True if the connector record exists
   */
  exists(scope: string, identity: string, provider: string): Promise<boolean>

  /**
   * Count total connections for a specific connector.
   * Used for non-scoped list/get operations.
   *
   * @param provider - The connector key
   * @returns The total number of connections across all scopes
   */
  countConnections(provider: string): Promise<number>

  /**
   * Find a connector record by webhook secret.
   * Used for webhook handling where scope is recovered from the secret.
   *
   * @param provider - The connector key
   * @param secret - The webhook secret
   * @returns The connector record or null if not found
   */
  findByWebhookSecret(
    provider: string,
    secret: string
  ): Promise<IgniterConnectorRecord | null>

  /**
   * Update webhook metadata for a connector.
   * Tracks last event time, result, and any errors.
   *
   * @param provider - The connector key
   * @param secret - The webhook secret
   * @param metadata - The metadata to update
   */
  updateWebhookMetadata(
    provider: string,
    secret: string,
    metadata: {
      lastEventAt: Date
      lastEventResult: 'success' | 'error'
      error?: string
    }
  ): Promise<void>
}
