/**
 * @fileoverview Manager builder for creating IgniterConnector instances
 * @module @igniter-js/connectors/builders/manager
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import type { IgniterConnectorAdapter } from '../types/adapter'
import type {
  IgniterConnectorDefinition,
  IgniterConnectorActionMap,
} from '../types/connector'
import type {
  IgniterConnectorScopeDefinition,
  IgniterConnectorScopeOptions,
} from '../types/scope'
import type { IgniterConnectorEventHandler } from '../types/events'

// Lazy import type to avoid circular dependency
import type { IgniterConnector } from '../core/igniter-connector'

/**
 * Logger interface for connector operations.
 */
export interface IgniterConnectorLogger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

/**
 * Encryption configuration for the manager.
 */
export interface IgniterConnectorEncryptionOptions {
  /** Fields to encrypt */
  fields: string[]
  /** Custom encryption function (optional) */
  encrypt?: (value: string) => string | Promise<string>
  /** Custom decryption function (optional) */
  decrypt?: (value: string) => string | Promise<string>
}

/**
 * Hook context for onConnect event.
 */
export interface IgniterConnectorOnConnectContext<TConfig = unknown> {
  /** The connector key */
  connector: string
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
  /** The configuration (decrypted) */
  config: TConfig
}

/**
 * Hook context for onDisconnect event.
 */
export interface IgniterConnectorOnDisconnectContext {
  /** The connector key */
  connector: string
  /** The scope type */
  scope: string
  /** The scope identifier */
  identity: string
}

/**
 * Hook context for onError event.
 */
export interface IgniterConnectorOnErrorContext {
  /** The error that occurred */
  error: Error
  /** The connector key (if applicable) */
  connector?: string
  /** The scope type (if applicable) */
  scope?: string
  /** The scope identifier (if applicable) */
  identity?: string
  /** The action key (if applicable) */
  action?: string
}

/**
 * Internal configuration for IgniterConnector.
 */
export interface IgniterConnectorConfig {
  /** Database adapter */
  adapter: IgniterConnectorAdapter
  /** Logger instance */
  logger?: IgniterConnectorLogger
  /** Encryption configuration */
  encryption: IgniterConnectorEncryptionOptions
  /** Scope definitions */
  scopes: Map<string, IgniterConnectorScopeDefinition>
  /** Connector definitions */
  connectors: Map<string, IgniterConnectorDefinition>
  /** Global event handlers */
  eventHandlers: IgniterConnectorEventHandler[]
  /** Lifecycle hooks */
  hooks: {
    onConnect?: (context: IgniterConnectorOnConnectContext) => Promise<void>
    onDisconnect?: (context: IgniterConnectorOnDisconnectContext) => Promise<void>
    onError?: (context: IgniterConnectorOnErrorContext) => Promise<void>
  }
}

/**
 * Type helper for extracting connector map type.
 */
export type IgniterConnectorMap<
  TConnectors extends Record<
    string,
    IgniterConnectorDefinition<
      StandardSchemaV1,
      StandardSchemaV1,
      unknown,
      unknown,
      IgniterConnectorActionMap
    >
  >,
> = TConnectors

/**
 * Builder class for creating IgniterConnector manager instances.
 * Uses a fluent API pattern for configuration.
 *
 * @typeParam TScopes - Map of scope definitions
 * @typeParam TConnectors - Map of connector definitions
 *
 * @example
 * ```typescript
 * import { IgniterConnector, PrismaAdapter } from '@igniter-js/connectors'
 *
 * const connectors = IgniterConnector.create()
 *   .withDatabase(PrismaAdapter.create(prisma))
 *   .withEncrypt(['apiKey', 'accessToken', 'refreshToken'])
 *   .addScope('organization', { required: true })
 *   .addScope('user', { required: true })
 *   .addConnector('telegram', telegramConnector)
 *   .addConnector('mailchimp', mailchimpConnector)
 *   .onConnect(async ({ connector, scope, identity }) => {
 *     console.log(`Connected ${connector} for ${scope}:${identity}`)
 *   })
 *   .build()
 * ```
 */
export class IgniterConnectorBuilder<
  TScopes extends Record<string, IgniterConnectorScopeDefinition>,
  TConnectors extends Record<
    string,
    IgniterConnectorDefinition<
      StandardSchemaV1,
      StandardSchemaV1,
      unknown,
      unknown,
      IgniterConnectorActionMap,
      unknown
    >
  >,
> {
  /** Database adapter */
  private adapter?: IgniterConnectorAdapter

  /** Logger instance */
  private logger?: IgniterConnectorLogger

  /** Encryption fields */
  private encryptFields: string[] = []

  /** Custom encryption function */
  private customEncrypt?: (value: string) => string | Promise<string>

  /** Custom decryption function */
  private customDecrypt?: (value: string) => string | Promise<string>

  /** Scope definitions */
  private scopes: Map<string, IgniterConnectorScopeDefinition> = new Map()

  /** Connector definitions */
  private connectors: Map<string, IgniterConnectorDefinition> = new Map()

  /** Global event handlers */
  private eventHandlers: IgniterConnectorEventHandler[] =
    []

  /** Lifecycle hooks */
  private hooks: IgniterConnectorConfig['hooks'] = {}

  /**
   * Private constructor. Use `IgniterConnector.create()` instead.
   */
  private constructor() {}

  /**
   * Create a new manager builder.
   *
   * @returns A new IgniterConnectorBuilder instance
   *
   * @example
   * ```typescript
   * const builder = IgniterConnector.create()
   * ```
   */
  // biome-ignore lint/complexity/noBannedTypes: Empty object is needed for proper type inference with keyof
  static create(): IgniterConnectorBuilder<{}, {}> {
    // biome-ignore lint/complexity/noBannedTypes: Empty object is needed for proper type inference with keyof
    return new IgniterConnectorBuilder() as IgniterConnectorBuilder<{}, {}>
  }

  /**
   * Set the logger for connector operations.
   *
   * @param logger - Logger instance
   * @returns The builder
   *
   * @example
   * ```typescript
   * .withLogger(console)
   * // or
   * .withLogger({
   *   debug: (msg, ...args) => console.debug(`[Connector] ${msg}`, ...args),
   *   info: (msg, ...args) => console.info(`[Connector] ${msg}`, ...args),
   *   warn: (msg, ...args) => console.warn(`[Connector] ${msg}`, ...args),
   *   error: (msg, ...args) => console.error(`[Connector] ${msg}`, ...args),
   * })
   * ```
   */
  withLogger(
    logger: IgniterConnectorLogger
  ): IgniterConnectorBuilder<TScopes, TConnectors> {
    this.logger = logger
    return this
  }

  /**
   * Set the database adapter.
   *
   * @param adapter - Database adapter instance
   * @returns The builder
   *
   * @example
   * ```typescript
   * .withDatabase(PrismaAdapter.create(prisma))
   * ```
   */
  withDatabase(
    adapter: IgniterConnectorAdapter
  ): IgniterConnectorBuilder<TScopes, TConnectors> {
    this.adapter = adapter
    return this
  }

  /**
   * Configure field encryption.
   *
   * @param fields - Array of field names to encrypt
   * @param callbacks - Optional custom encrypt/decrypt functions
   * @returns The builder
   *
   * @example
   * ```typescript
   * // Use default AES-256-GCM encryption
   * .withEncrypt(['apiKey', 'accessToken', 'refreshToken'])
   *
   * // Use custom encryption
   * .withEncrypt(['apiKey'], {
   *   encrypt: async (value) => myEncrypt(value),
   *   decrypt: async (value) => myDecrypt(value),
   * })
   * ```
   */
  withEncrypt(
    fields: string[],
    callbacks?: {
      encrypt?: (value: string) => string | Promise<string>
      decrypt?: (value: string) => string | Promise<string>
    }
  ): IgniterConnectorBuilder<TScopes, TConnectors> {
    this.encryptFields = fields
    this.customEncrypt = callbacks?.encrypt
    this.customDecrypt = callbacks?.decrypt
    return this
  }

  /**
   * Add a scope definition.
   *
   * @param key - Unique scope identifier
   * @param options - Scope configuration
   * @returns The builder with updated scopes type
   *
   * @example
   * ```typescript
   * .addScope('organization', { required: true })
   * .addScope('user', { required: true })
   * .addScope('system', { required: false })
   * ```
   */
  addScope<TKey extends string>(
    key: TKey,
    options: IgniterConnectorScopeOptions = { required: true }
  ): IgniterConnectorBuilder<
    TScopes & { [K in TKey]: IgniterConnectorScopeDefinition },
    TConnectors
  > {
    // Data Transform: Convert options to full definition with key
    const definition: IgniterConnectorScopeDefinition = {
      key,
      required: options.required ?? true,
    }
    this.scopes.set(key, definition)
    return this as IgniterConnectorBuilder<
      TScopes & { [K in TKey]: IgniterConnectorScopeDefinition },
      TConnectors
    >
  }

  /**
   * Add a connector definition.
   *
   * @param key - Unique connector identifier
   * @param connector - Connector definition (from `Connector.create().build()`)
   * @returns The builder with updated connectors type
   *
   * @example
   * ```typescript
   * .addConnector('telegram', telegramConnector)
   * .addConnector('mailchimp', mailchimpConnector)
   * ```
   */
  addConnector<
    TKey extends string,
    TConnector extends IgniterConnectorDefinition<
      StandardSchemaV1,
      StandardSchemaV1,
      any,
      any,
      any
    >,
  >(
    key: TKey,
    connector: TConnector
  ): IgniterConnectorBuilder<
    TScopes,
    TConnectors & { [K in TKey]: TConnector }
  > {
    this.connectors.set(key, connector)
    return this as any as IgniterConnectorBuilder<
      TScopes,
      TConnectors & { [K in TKey]: TConnector }
    >
  }

  /**
   * Set the onConnect lifecycle hook.
   * Called when a connector is successfully connected.
   *
   * @param handler - Hook handler function
   * @returns The builder
   *
   * @example
   * ```typescript
   * .onConnect(async ({ connector, scope, identity, config }) => {
   *   await logConnectorEvent('connected', { connector, scope, identity })
   * })
   * ```
   */
  onConnect(
    handler: (context: IgniterConnectorOnConnectContext) => Promise<void>
  ): IgniterConnectorBuilder<TScopes, TConnectors> {
    this.hooks.onConnect = handler
    return this
  }

  /**
   * Set the onDisconnect lifecycle hook.
   * Called when a connector is disconnected.
   *
   * @param handler - Hook handler function
   * @returns The builder
   *
   * @example
   * ```typescript
   * .onDisconnect(async ({ connector, scope, identity }) => {
   *   await logConnectorEvent('disconnected', { connector, scope, identity })
   * })
   * ```
   */
  onDisconnect(
    handler: (context: IgniterConnectorOnDisconnectContext) => Promise<void>
  ): IgniterConnectorBuilder<TScopes, TConnectors> {
    this.hooks.onDisconnect = handler
    return this
  }

  /**
   * Set the onError lifecycle hook.
   * Called when an error occurs during connector operations.
   *
   * @param handler - Hook handler function
   * @returns The builder
   *
   * @example
   * ```typescript
   * .onError(async ({ error, connector, action }) => {
   *   await logError(error, { connector, action })
   * })
   * ```
   */
  onError(
    handler: (context: IgniterConnectorOnErrorContext) => Promise<void>
  ): IgniterConnectorBuilder<TScopes, TConnectors> {
    this.hooks.onError = handler
    return this
  }

  /**
   * Add a global event handler.
   * Called for all events across all connectors.
   *
   * @param handler - Event handler function
   * @returns The builder
   *
   * @example
   * ```typescript
   * .on(async (event) => {
   *   console.log(`Event: ${event.type}`, event)
   * })
   * ```
   */
  on(
    handler: IgniterConnectorEventHandler
  ): IgniterConnectorBuilder<TScopes, TConnectors> {
    this.eventHandlers.push(handler)
    return this
  }

  /**
   * Build the IgniterConnector instance.
   * This returns the fully configured connector manager.
   *
   * @returns The IgniterConnector instance ready for use
   * @throws Error if required configuration is missing
   *
   * @example
   * ```typescript
   * const connectors = IgniterConnector.create()
   *   .withDatabase(adapter)
   *   .addScope('organization', { required: true })
   *   .addConnector('telegram', telegram)
   *   .build()
   *
   * // Use the connectors
   * const scoped = connectors.scope('organization', 'org_123')
   * ```
   */
  build(): IgniterConnector<TScopes, TConnectors> {
    // Validation: Database adapter is required
    if (!this.adapter) {
      throw new Error(
        'Database adapter is required. Use .withDatabase(adapter) to set it.'
      )
    }

    // Validation: At least one scope is required
    if (this.scopes.size === 0) {
      throw new Error(
        'At least one scope is required. Use .addScope(key, options) to add scopes.'
      )
    }

    // Response: Build configuration object
    const config: IgniterConnectorConfig = {
      adapter: this.adapter,
      logger: this.logger,
      encryption: {
        fields: this.encryptFields,
        encrypt: this.customEncrypt,
        decrypt: this.customDecrypt,
      },
      scopes: this.scopes,
      connectors: this.connectors,
      eventHandlers: this.eventHandlers,
      hooks: this.hooks,
    }

    // Response: Return IgniterConnector instance (lazy require to avoid circular dependency)
    const { IgniterConnector: IgniterConnectorClass } = require('../core/igniter-connector')
    return new IgniterConnectorClass(config) as IgniterConnector<TScopes, TConnectors>
  }

  /**
   * Get the scopes map for type inference.
   *
   * @returns The scopes type map
   */
  getScopes(): TScopes {
    return Object.fromEntries(this.scopes) as TScopes
  }

  /**
   * Get the connectors map for type inference.
   *
   * @returns The connectors type map
   */
  getConnectors(): TConnectors {
    return Object.fromEntries(this.connectors) as TConnectors
  }
}
