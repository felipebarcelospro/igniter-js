/**
 * @fileoverview Prisma adapter for IgniterConnector database operations
 * @module @igniter-js/connectors/adapters/prisma
 */

import type {
  IgniterConnectorRecord,
  IgniterConnectorAdapterOptions,
} from '../types/adapter'
import { IgniterConnectorBaseAdapter } from './igniter-connector.adapter'

/**
 * Prisma client type.
 * Uses a minimal interface to avoid strict Prisma version dependency.
 */
interface PrismaClient {
  $connect?: () => Promise<void>
  $disconnect?: () => Promise<void>
  [key: string]: any
}

/**
 * Prisma model delegate with CRUD operations.
 */
interface PrismaModelDelegate {
  findUnique: (args: {
    where: Record<string, unknown>
  }) => Promise<IgniterConnectorRecord | null>
  findMany: (args: {
    where: Record<string, unknown>
  }) => Promise<IgniterConnectorRecord[]>
  create: (args: {
    data: Record<string, unknown>
  }) => Promise<IgniterConnectorRecord>
  update: (args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
  }) => Promise<IgniterConnectorRecord>
  delete: (args: { where: Record<string, unknown> }) => Promise<unknown>
  upsert: (args: {
    where: Record<string, unknown>
    create: Record<string, unknown>
    update: Record<string, unknown>
  }) => Promise<IgniterConnectorRecord>
  count: (args: { where: Record<string, unknown> }) => Promise<number>
}

/**
 * Options for Prisma adapter.
 */
export interface IgniterConnectorPrismaAdapterOptions<TPrismaClient>
  extends IgniterConnectorAdapterOptions<TPrismaClient> {
  /**
   * The Prisma model name to use.
   * @default 'Integration'
   */
  model?: Omit<keyof TPrismaClient, symbol>
}

/**
 * Prisma adapter for connector database operations.
 * Provides CRUD operations for connector records using Prisma ORM.
 *
 * @example
 * ```typescript
 * import { PrismaAdapter } from '@igniter-js/connectors'
 * import { prisma } from './prisma'
 *
 * // With default model name (Integration)
 * const adapter = PrismaAdapter.create(prisma)
 *
 * // With custom model name
 * const adapter = PrismaAdapter.create(prisma, { model: 'Connector' })
 *
 * // Use with IgniterConnector
 * const connectors = IgniterConnector.create()
 *   .withDatabase(adapter)
 *   .build()
 * ```
 */
export class PrismaAdapter<TPrismaClient extends PrismaClient> extends IgniterConnectorBaseAdapter  {
  /** Prisma client instance */
  private prisma: TPrismaClient

  /** Model name for database operations */
  private modelName: string

  /** Prisma model delegate */
  private model: PrismaModelDelegate

  /**
   * Private constructor. Use `PrismaAdapter.create()` instead.
   *
   * @param prisma - Prisma client instance
   * @param options - Adapter options
   */
  private constructor(
    prisma: TPrismaClient,
    options: IgniterConnectorPrismaAdapterOptions<TPrismaClient> = {}
  ) {
    super()
    this.prisma = prisma
    // @ts-expect-error - Type inference for model name
    this.modelName = options.model || 'Connector'

    // Data Transform: Get model delegate
    const model = this.prisma[this.modelName] as
      | PrismaModelDelegate
      | undefined

    // Validation: Model must exist
    if (!model) {
      throw new Error(
        `Prisma model "${this.modelName}" not found. ` +
          'Make sure the model exists in your Prisma schema.'
      )
    }

    this.model = model
  }

  /**
   * Create a new Prisma adapter instance.
   *
   * @param prisma - Prisma client instance
   * @param options - Adapter options
   * @returns New PrismaAdapter instance
   *
   * @example
   * ```typescript
   * const adapter = PrismaAdapter.create(prisma)
   * const adapter = PrismaAdapter.create(prisma, { model: 'Connector' })
   * ```
   */
  static create<TPrismaClient extends PrismaClient>(
    prisma: TPrismaClient,
    options?: IgniterConnectorPrismaAdapterOptions<TPrismaClient>
  ): PrismaAdapter<TPrismaClient> {
    return new PrismaAdapter(prisma, options)
  }

  /**
   * Get a single connector record.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @returns The connector record or null
   *
   * @example
   * ```typescript
   * const record = await adapter.get('organization', 'org_123', 'telegram')
   * if (record) {
   *   console.log('Found:', record.provider)
   * }
   * ```
   */
  async get(
    scope: string,
    identity: string,
    provider: string
  ): Promise<IgniterConnectorRecord | null> {
    // Database Query: Find by unique constraint
    const record = await this.model.findUnique({
      where: {
        scope_identity_provider: {
          scope,
          identity,
          provider,
        },
      },
    })

    return record
  }

  /**
   * List all connector records for a scope.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @returns Array of connector records
   *
   * @example
   * ```typescript
   * const records = await adapter.list('organization', 'org_123')
   * for (const record of records) {
   *   console.log(`${record.provider}: ${record.enabled ? 'enabled' : 'disabled'}`)
   * }
   * ```
   */
  async list(
    scope: string,
    identity: string
  ): Promise<IgniterConnectorRecord[]> {
    // Database Query: Find all for scope/identity
    const records = await this.model.findMany({
      where: {
        scope,
        identity,
      },
    })

    return records
  }

  /**
   * Save a new connector record.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @param value - The encrypted configuration
   * @param enabled - Whether the connector is enabled
   * @returns The created connector record
   *
   * @example
   * ```typescript
   * const record = await adapter.save(
   *   'organization',
   *   'org_123',
   *   'telegram',
   *   { botToken: 'encrypted...', chatId: 'encrypted...' },
   *   true
   * )
   * ```
   */
  async save(
    scope: string,
    identity: string,
    provider: string,
    value: Record<string, unknown>,
    enabled = true
  ): Promise<IgniterConnectorRecord> {
    // Database Query: Create or update (upsert)
    const record = await this.model.upsert({
      where: {
        scope_identity_provider: {
          scope,
          identity,
          provider,
        },
      },
      create: {
        scope,
        identity,
        provider,
        value,
        enabled,
      },
      update: {
        value,
        enabled,
      },
    })

    return record
  }

  /**
   * Update an existing connector record.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @param data - Partial update data
   * @returns The updated connector record
   *
   * @example
   * ```typescript
   * // Update config
   * await adapter.update('organization', 'org_123', 'telegram', {
   *   value: { botToken: 'new-encrypted...' },
   * })
   *
   * // Enable/disable
   * await adapter.update('organization', 'org_123', 'telegram', {
   *   enabled: false,
   * })
   * ```
   */
  async update(
    scope: string,
    identity: string,
    provider: string,
    data: Partial<Pick<IgniterConnectorRecord, 'value' | 'enabled'>>
  ): Promise<IgniterConnectorRecord> {
    // Database Query: Update by unique constraint
    const record = await this.model.update({
      where: {
        scope_identity_provider: {
          scope,
          identity,
          provider,
        },
      },
      data,
    })

    return record
  }

  /**
   * Delete a connector record.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   *
   * @example
   * ```typescript
   * await adapter.delete('organization', 'org_123', 'telegram')
   * ```
   */
  async delete(
    scope: string,
    identity: string,
    provider: string
  ): Promise<void> {
    // Database Query: Delete by unique constraint
    await this.model.delete({
      where: {
        scope_identity_provider: {
          scope,
          identity,
          provider,
        },
      },
    })
  }

  /**
   * Check if a connector record exists.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier
   * @param provider - The connector key
   * @returns True if the connector record exists
   *
   * @example
   * ```typescript
   * const exists = await adapter.exists('organization', 'org_123', 'telegram')
   * if (exists) {
   *   console.log('Telegram is connected')
   * }
   * ```
   */
  async exists(
    scope: string,
    identity: string,
    provider: string
  ): Promise<boolean> {
    // Database Query: Find by unique constraint
    const record = await this.model.findUnique({
      where: {
        scope_identity_provider: {
          scope,
          identity,
          provider,
        },
      },
    })

    return record !== null
  }

  /**
   * Count total connections for a specific connector.
   * Used for non-scoped list/get operations.
   *
   * @param provider - The connector key
   * @returns The total number of connections across all scopes
   *
   * @example
   * ```typescript
   * const count = await adapter.countConnections('telegram')
   * console.log(`Total Telegram connections: ${count}`)
   * ```
   */
  async countConnections(provider: string): Promise<number> {
    // Database Query: Count all records for provider
    const count = await this.model.count({
      where: {
        provider,
      },
    })

    return count
  }

  /**
   * Find a connector record by webhook secret.
   * Searches in the JSON value field for the webhook secret.
   *
   * @param provider - The connector key
   * @param secret - The webhook secret
   * @returns The connector record or null
   *
   * @example
   * ```typescript
   * const record = await adapter.findByWebhookSecret('telegram', 'abc123')
   * if (record) {
   *   console.log('Found connection for scope:', record.scope)
   * }
   * ```
   */
  async findByWebhookSecret(
    provider: string,
    secret: string
  ): Promise<IgniterConnectorRecord | null> {
    // Database Query: Find by provider and webhook secret in JSON
    const records = await this.model.findMany({
      where: {
        provider,
      },
    })

    // Loop: Search for matching webhook secret in value
    for (const record of records) {
      const value = record.value as Record<string, unknown>
      const webhook = value.webhook as Record<string, unknown> | undefined
      if (webhook?.secret === secret) {
        return record
      }
    }

    return null
  }

  /**
   * Update webhook metadata for a connector.
   * Stores last event time, result, and any errors.
   *
   * @param provider - The connector key
   * @param secret - The webhook secret
   * @param metadata - The metadata to update
   *
   * @example
   * ```typescript
   * await adapter.updateWebhookMetadata('telegram', 'abc123', {
   *   lastEventAt: new Date(),
   *   lastEventResult: 'success',
   * })
   * ```
   */
  async updateWebhookMetadata(
    provider: string,
    secret: string,
    metadata: {
      lastEventAt: Date
      lastEventResult: 'success' | 'error'
      error?: string
    }
  ): Promise<void> {
    // Database Query: Find the record first
    const record = await this.findByWebhookSecret(provider, secret)
    if (!record) {
      return
    }

    // Data Transform: Update webhook metadata in value
    const value = record.value as Record<string, unknown>
    const webhook = (value.webhook as Record<string, unknown>) || {}
    webhook.lastEventAt = metadata.lastEventAt
    webhook.lastEventResult = metadata.lastEventResult
    if (metadata.error) {
      webhook.error = metadata.error
    } else {
      delete webhook.error
    }
    value.webhook = webhook

    // Database Query: Update the record
    await this.model.update({
      where: {
        scope_identity_provider: {
          scope: record.scope,
          identity: record.identity,
          provider: record.provider,
        },
      },
      data: {
        value,
      },
    })
  }
}
