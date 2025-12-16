/**
 * @fileoverview Core runtime for IgniterConnector
 * @module @igniter-js/connectors/core/runtime
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import type { IgniterConnectorAdapter } from '../types/adapter'
import type {
  IgniterConnectorDefinition,
  ExtractConnectorActionKeys,
  InferActionInput,
  InferActionOutput,
} from '../types/connector'
import type { IgniterConnectorScopeDefinition } from '../types/scope'
import type {
  IgniterConnectorEvent,
  IgniterConnectorEventHandler,
  IgniterConnectorEventSubscription,
} from '../types/events'
import type {
  IgniterConnectorWebhookRequest,
} from '../types/webhook'
import type {
  IgniterConnectorConfig,
  IgniterConnectorLogger,
  IgniterConnectorEncryptionOptions,
} from '../builders/igniter-connector.builder'
import {
  IgniterConnectorBuilder,
} from '../builders/igniter-connector.builder'
import { IgniterConnectorScoped } from './igniter-connector-scoped'
import { IgniterConnectorOAuth } from './igniter-connector-oauth'
import { IgniterConnectorCrypto } from '../utils/igniter-connector-crypto'
import { IgniterConnectorSchema } from '../utils/igniter-connector-schema'
import { IgniterConnectorUrl } from '../utils/igniter-connector-url'
import { IgniterConnectorError } from '../errors/igniter-connector.error'

// =============================================================================
// HANDLE OPERATION TYPES
// =============================================================================

/**
 * Parameters for OAuth connect operation.
 */
export interface IgniterConnectorOAuthConnectParams {
  /** The scope type for the connection */
  scope: string
  /** The scope identifier */
  identity: string
  /** URL to redirect to after OAuth completion */
  redirectUrl?: string
  /** Custom redirect URI for OAuth callback (defaults to auto-detected) */
  redirectUri?: string
}

/**
 * Extended parameters for OAuth callback operation.
 */
export interface IgniterConnectorOAuthCallbackParamsExt {
  /** The authorization code from OAuth provider */
  code?: string
  /** The state parameter for CSRF verification */
  state?: string
  /** Error code if OAuth failed */
  error?: string
  /** Error description if OAuth failed */
  errorDescription?: string
  /** The original request object (for cookie parsing) */
  request?: Request
  /** Override scope from cookie */
  scope?: string
  /** Override identity from cookie */
  identity?: string
  /** Override redirect URL from cookie */
  redirectUrl?: string
  /** Custom redirect URI (defaults to auto-detected) */
  redirectUri?: string
}

/**
 * Parameters for webhook handling operation.
 */
export interface IgniterConnectorWebhookParams {
  /** The webhook secret from URL path */
  secret?: string
  /** The original request object */
  request?: Request
  /** Request body (if already parsed) */
  body?: unknown
  /** Request headers (if already parsed) */
  headers?: Record<string, string>
  /** Request method */
  method?: string
  /** Request URL */
  url?: string
}

/**
 * Union type for all handle operation parameters.
 */
export type IgniterConnectorHandleParams =
  | IgniterConnectorOAuthConnectParams
  | IgniterConnectorOAuthCallbackParamsExt
  | IgniterConnectorWebhookParams

/**
 * Main IgniterConnector class.
 * Manages connector definitions, database operations, and scoped instances.
 *
 * @typeParam TScopes - Map of scope definitions
 * @typeParam TConnectors - Map of connector definitions
 *
 * @example
 * ```typescript
 * import { IgniterConnector, PrismaAdapter, Connector } from '@igniter-js/connectors'
 * import { z } from 'zod'
 *
 * // Define a connector
 * const telegram = Connector.create()
 *   .withConfig(z.object({ botToken: z.string(), chatId: z.string() }))
 *   .addAction('sendMessage', {
 *     input: z.object({ message: z.string() }),
 *     handler: async ({ input, config }) => {
 *       // Send message logic
 *     },
 *   })
 *   .build()
 *
 * // Create manager
 * const connectors = IgniterConnector.create()
 *   .withDatabase(PrismaAdapter.create(prisma))
 *   .withEncrypt(['botToken', 'accessToken'])
 *   .addScope('organization', { required: true })
 *   .addConnector('telegram', telegram)
 *   .build()
 *
 * // Use scoped instance
 * const scoped = connectors.scope('organization', 'org_123')
 * await scoped.telegram.connect({ botToken: '...', chatId: '...' })
 * await scoped.telegram.actions.sendMessage({ message: 'Hello!' })
 * ```
 */
export class IgniterConnector<
  TScopes extends Record<string, IgniterConnectorScopeDefinition>,
  TConnectors extends Record<
    string,
    IgniterConnectorDefinition<
      StandardSchemaV1,
      StandardSchemaV1,
      any,
      any,
      any,
      any
    >
  >,
> {
  /** Database adapter */
  private adapter: IgniterConnectorAdapter

  /** Logger instance */
  private logger?: IgniterConnectorLogger

  /** Encryption configuration */
  private encryption: IgniterConnectorEncryptionOptions

  /** Scope definitions */
  private scopes: Map<string, IgniterConnectorScopeDefinition>

  /** Connector definitions */
  private connectors: Map<string, IgniterConnectorDefinition<any, any, any, any, any, any>>

  /** OAuth handlers (cached per connector) */
  private oauthHandlers: Map<string, IgniterConnectorOAuth> = new Map()

  /** Global event handlers */
  private eventHandlers: Set<IgniterConnectorEventHandler> = new Set()

  /** Lifecycle hooks */
  private hooks: IgniterConnectorConfig['hooks']

  /**
   * Constructor. Use `IgniterConnector.create().build()` for the fluent API.
   *
   * @param config - The configuration object from builder
   */
  constructor(config: IgniterConnectorConfig) {
    this.adapter = config.adapter
    this.logger = config.logger
    this.encryption = config.encryption
    this.scopes = config.scopes
    this.connectors = config.connectors
    this.hooks = config.hooks

    // Initialization: Register global event handlers
    for (const handler of config.eventHandlers) {
      this.eventHandlers.add(handler)
    }

    // Initialization: Create OAuth handlers for connectors with OAuth
    for (const [key, connector] of this.connectors) {
      if (connector.oauth) {
        this.oauthHandlers.set(key, new IgniterConnectorOAuth(connector.oauth))
      }
    }
  }

  /**
   * Create a new IgniterConnector builder.
   *
   * @returns A new IgniterConnectorBuilder instance
   *
   * @example
   * ```typescript
   * const connectors = IgniterConnector.create()
   *   .withDatabase(adapter)
   *   .addScope('organization', { required: true })
   *   .addConnector('telegram', telegram)
   *   .build()
   * ```
   */
  // biome-ignore lint/complexity/noBannedTypes: Empty object is needed for proper type inference with keyof
  static create(): IgniterConnectorBuilder<{}, {}> {
    return IgniterConnectorBuilder.create()
  }

  /**
   * Create an IgniterConnector instance from configuration.
   * This is called internally after builder.build().
   *
   * @param config - The configuration object
   * @returns A new IgniterConnector instance
   */
  static fromConfig<
    TScopes extends Record<string, IgniterConnectorScopeDefinition>,
    TConnectors extends Record<
      string,
      IgniterConnectorDefinition<
        StandardSchemaV1,
        StandardSchemaV1,
        any,
        any,
        any,
        any
      >
    >,
  >(config: IgniterConnectorConfig): IgniterConnector<TScopes, TConnectors> {
    return new IgniterConnector(config)
  }

  /**
   * Get the database adapter.
   *
   * @returns The database adapter instance
   */
  getAdapter(): IgniterConnectorAdapter {
    return this.adapter
  }

  /**
   * Get the logger instance.
   *
   * @returns The logger or undefined
   */
  getLogger(): IgniterConnectorLogger | undefined {
    return this.logger
  }

  /**
   * Get all registered scope definitions.
   *
   * @returns Map of scope key to definition
   */
  getScopes(): Map<string, IgniterConnectorScopeDefinition> {
    return this.scopes
  }

  /**
   * Get all registered connector definitions.
   *
   * @returns Map of connector key to definition
   */
  getConnectors(): Map<string, IgniterConnectorDefinition<any, any, any, any, any>> {
    return this.connectors
  }

  /**
   * Get a specific connector definition.
   *
   * @param key - The connector key
   * @returns The connector definition or undefined
   */
  getConnector(key: string): IgniterConnectorDefinition<any, any, any, any, any> | undefined {
    return this.connectors.get(key)
  }

  /**
   * Get OAuth handler for a connector.
   *
   * @param connectorKey - The connector key
   * @returns The OAuth handler or undefined
   */
  getOAuthHandler(connectorKey: string): IgniterConnectorOAuth | undefined {
    return this.oauthHandlers.get(connectorKey)
  }

  /**
   * Get encryption configuration.
   *
   * @returns The encryption options
   */
  getEncryption(): IgniterConnectorEncryptionOptions {
    return this.encryption
  }

  /**
   * Get lifecycle hooks.
   *
   * @returns The hooks object
   */
  getHooks(): IgniterConnectorConfig['hooks'] {
    return this.hooks
  }

  /**
   * Create a scoped instance for a specific scope and identity.
   *
   * @param scope - The scope type
   * @param identity - The scope identifier (optional for scopes with required: false)
   * @returns A scoped connector instance
   *
   * @throws {IgniterConnectorError} If scope is not defined or identity is missing when required
   *
   * @example
   * ```typescript
   * // For organization scope
   * const scoped = connectors.scope('organization', 'org_123')
   *
   * // For system scope (no identity needed)
   * const system = connectors.scope('system')
   * ```
   */
  scope(
    scope: keyof TScopes & string,
    identity?: string
  ): IgniterConnectorScoped<TConnectors> {
    // Validation: Scope must be defined
    const scopeDef = this.scopes.get(scope)
    if (!scopeDef) {
      throw IgniterConnectorError.scopeNotDefined(scope)
    }

    // Validation: Identity is required for required scopes
    if (scopeDef.required && !identity) {
      throw IgniterConnectorError.scopeIdentityRequired(scope)
    }

    // Data Transform: Use empty string for optional scopes without identity
    const resolvedIdentity = identity || ''

    // Response: Create scoped instance
    return new IgniterConnectorScoped<TConnectors>(
      this,
      scope,
      resolvedIdentity
    )
  }

  /**
   * Register a global event handler.
   *
   * @param handler - The event handler function
   * @returns A subscription object to unsubscribe
   *
   * @example
   * ```typescript
   * const subscription = connectors.on((event) => {
   *   console.log(`[${event.type}] ${event.connector}`)
   * })
   *
   * // Later, to stop listening:
   * subscription.unsubscribe()
   * ```
   */
  on(handler: IgniterConnectorEventHandler): IgniterConnectorEventSubscription {
    this.eventHandlers.add(handler)

    return {
      unsubscribe: () => {
        this.eventHandlers.delete(handler)
      },
    }
  }

  /**
   * Emit an event to all registered handlers.
   *
   * @param event - The event to emit
   */
  async emit(event: IgniterConnectorEvent): Promise<void> {
    // Logging: Log event
    this.logger?.debug(`Event: ${event.type}`, event)

    // Loop: Call all handlers
    for (const handler of this.eventHandlers) {
      try {
        await handler(event)
      } catch (error) {
        // Error Handling: Log but don't throw
        this.logger?.error('Event handler error:', error)
      }
    }
  }

  /**
   * Encrypt a value using configured encryption.
   *
   * @param value - The value to encrypt
   * @returns The encrypted value
   */
  async encrypt(value: string): Promise<string> {
    if (this.encryption.encrypt) {
      return this.encryption.encrypt(value)
    }
    return IgniterConnectorCrypto.encrypt(value)
  }

  /**
   * Decrypt a value using configured decryption.
   *
   * @param value - The value to decrypt
   * @returns The decrypted value
   */
  async decrypt(value: string): Promise<string> {
    if (this.encryption.decrypt) {
      return this.encryption.decrypt(value)
    }
    return IgniterConnectorCrypto.decrypt(value)
  }

  /**
   * Encrypt fields in a config object.
   *
   * @param config - The configuration object
   * @returns The config with encrypted fields
   */
  async encryptConfig(
    config: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const result = { ...config }

    // Loop: Encrypt configured fields
    for (const field of this.encryption.fields) {
      if (field in result && typeof result[field] === 'string') {
        result[field] = await this.encrypt(result[field] as string)
      }
    }

    return result
  }

  /**
   * Decrypt fields in a config object.
   *
   * @param config - The configuration object
   * @returns The config with decrypted fields
   */
  async decryptConfig(
    config: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const result = { ...config }

    // Loop: Decrypt configured fields
    for (const field of this.encryption.fields) {
      if (
        field in result &&
        typeof result[field] === 'string' &&
        IgniterConnectorCrypto.isEncrypted(result[field] as string)
      ) {
        result[field] = await this.decrypt(result[field] as string)
      }
    }

    return result
  }

  // ============================================
  // NON-SCOPED API (without scope context)
  // ============================================

  /**
   * List all registered connectors (without scope context).
   * Does not include config or enabled status - use scoped.list() for that.
   * 
   * @param options - Optional filtering and pagination options
   * @returns Array of connector metadata
   * 
   * @example
   * ```typescript
   * const list = await connectors.list({
   *   where: { name: 'Telegram' },
   *   limit: 5,
   *   count: { connections: true }
   * })
   * ```
   */
  async list(options?: {
    where?: { name?: string }
    limit?: number
    offset?: number
    count?: { connections?: boolean }
  }): Promise<Array<{
    key: string
    type: 'oauth' | 'custom'
    metadata: Record<string, unknown>
    connections?: number
  }>> {
    const result: Array<{
      key: string
      type: 'oauth' | 'custom'
      metadata: Record<string, unknown>
      connections?: number
    }> = []

    // Loop: Iterate over all connectors
    for (const [key, connector] of this.connectors) {
      // Conditional: Filter by name if specified
      if (options?.where?.name !== undefined) {
        const metadata = connector.metadata as Record<string, unknown> | undefined
        if (metadata?.name !== options.where.name) continue
      }

      const item: {
        key: string
        type: 'oauth' | 'custom'
        metadata: Record<string, unknown>
        connections?: number
      } = {
        key,
        type: connector.oauth ? 'oauth' : 'custom',
        metadata: (connector.metadata ?? {}) as Record<string, unknown>,
      }

      // Conditional: Count connections if requested
      if (options?.count?.connections) {
        item.connections = await this.adapter.countConnections(key)
      }

      result.push(item)
    }

    // Data Transform: Apply pagination
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? result.length
    return result.slice(offset, offset + limit)
  }

  /**
   * Get a specific connector's metadata (without scope context).
   * Does not include config or enabled status - use scoped.get() for that.
   * 
   * @param connectorKey - The connector key
   * @param options - Optional options
   * @returns The connector metadata or null
   * 
   * @example
   * ```typescript
   * const telegram = await connectors.get('telegram', {
   *   count: { connections: true }
   * })
   * ```
   */
  async get<K extends keyof TConnectors & string>(
    connectorKey: K,
    options?: { count?: { connections?: boolean } }
  ): Promise<{
    key: string
    type: 'oauth' | 'custom'
    metadata: Record<string, unknown>
    connections?: number
  } | null> {
    const connector = this.connectors.get(connectorKey)
    if (!connector) return null

    const result: {
      key: string
      type: 'oauth' | 'custom'
      metadata: Record<string, unknown>
      connections?: number
    } = {
      key: connectorKey,
      type: connector.oauth ? 'oauth' : 'custom',
      metadata: (connector.metadata ?? {}) as Record<string, unknown>,
    }

    // Conditional: Count connections if requested
    if (options?.count?.connections) {
      result.connections = await this.adapter.countConnections(connectorKey)
    }

    return result
  }

  /**
   * Create an action builder for executing connector actions using defaultConfig.
   * This is useful for connectors that don't require database storage.
   * 
   * @param connectorKey - The connector key
   * @param actionKey - The action key
   * @returns An action builder with .call() method
   * 
   * @example
   * ```typescript
   * const { data, error } = await connectors
   *   .action('telegram', 'sendMessage')
   *   .call({ message: 'Hello!' })
   * ```
   */
  action<
    K extends keyof TConnectors & string,
    A extends ExtractConnectorActionKeys<TConnectors[K]>
  >(
    connectorKey: K,
    actionKey: A
  ): {
    call(input: InferActionInput<TConnectors, K, A>): Promise<{
      data: InferActionOutput<TConnectors, K, A> | null
      error: Error | null
    }>
  } {
    const self = this
    return {
      async call(input: InferActionInput<TConnectors, K, A>): Promise<{ data: InferActionOutput<TConnectors, K, A> | null; error: Error | null }> {
        try {
          const result = await self.executeActionWithDefaultConfig(connectorKey, actionKey, input)
          return { data: result as InferActionOutput<TConnectors, K, A>, error: null }
        } catch (error) {
          return { data: null, error: error as Error }
        }
      },
    }
  }

  /**
   * Handle connector operations like OAuth callbacks and webhooks at the global level.
   * The connector key is parsed from the request URL.
   * This is useful for handling OAuth callbacks and webhooks without a specific scope,
   * where the scope information is recovered from the request state/cookies.
   *
   * @param operation - The operation type ('oauth.callback' or 'webhook')
   * @param request - The incoming Request object
   * @returns A Response object for redirects, or operation result
   *
   * @example
   * ```typescript
   * // In Next.js API route for OAuth callback
   * export async function GET(request: Request) {
   *   return connectors.handle('oauth.callback', request)
   * }
   *
   * // Webhook handling
   * export async function POST(request: Request) {
   *   return connectors.handle('webhook', request)
   * }
   * ```
   */
  async handle(
    operation: 'oauth.callback' | 'webhook',
    request: Request
  ): Promise<Response> {
    try {
      const parsedUrl = IgniterConnectorUrl.parseOAuthCallbackUrl(request.url) ||
                  IgniterConnectorUrl.parseWebhookUrl(request.url)
      if (!parsedUrl) {
        throw new Error('Invalid connector URL')
      }

      const { connectorKey } = parsedUrl

      const connector = this.connectors.get(connectorKey)
      if (!connector) {
        throw IgniterConnectorError.connectorNotFound(connectorKey)
      }

      switch (operation) {
        case 'oauth.callback':
          return this.handleOAuthCallback(request)

        case 'webhook':
          return this.handleWebhook(request)

        default:
          throw new Error(`Unknown operation: ${operation}`)
      }
    } catch (error) {
      // Error Handling: Return error response
      return new Response(JSON.stringify({ data: null, error: (error as Error).message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  /**
   * Handle OAuth connect - generates authorization URL and returns redirect Response.
   * Stores scope information in a cookie for callback recovery.
   * @internal
   */
  async handleOAuthConnect(
    connectorKey: string,
    params: IgniterConnectorOAuthConnectParams
  ): Promise<Response> {
    const oauthHandler = this.oauthHandlers.get(connectorKey)
    if (!oauthHandler) {
      throw IgniterConnectorError.oauthNotConfigured(connectorKey)
    }

    // Data Transform: Build redirect URI
    const redirectUri = params.redirectUri || IgniterConnectorUrl.buildOAuthCallbackUrl(connectorKey)

    // API Call: Generate authorization URL
    const { url, state } = await oauthHandler.generateAuthUrl({
      scope: params.scope,
      identity: params.identity,
      connector: connectorKey,
      redirectUri,
    })

    // Event Handling: Emit OAuth started event
    await this.emit({
      type: 'oauth.started',
      connector: connectorKey,
      scope: params.scope,
      identity: params.identity,
      timestamp: new Date(),
    })

    // Data Transform: Create cookie value with scope info
    const cookieValue = JSON.stringify({
      scope: params.scope,
      identity: params.identity,
      redirectUrl: params.redirectUrl || '/',
      state,
    })

    // Response: Return redirect with scope cookie
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        'Set-Cookie': `igniter_oauth_${connectorKey}=${encodeURIComponent(cookieValue)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
      },
    })
  }

  /**
   * Handle OAuth callback - exchanges code for tokens and redirects with status.
   * @internal
   */
  private async handleOAuthCallback(
    request: Request
  ): Promise<Response> {
    const result = IgniterConnectorUrl.parseOAuthCallbackUrl(request.url)
    if(!result) {
      throw new Error('Invalid OAuth callback URL')
    }

    const { connectorKey } = result

    const connector = this.connectors.get(connectorKey)
    if (!connector) {
      throw IgniterConnectorError.connectorNotFound(connectorKey)
    }

    const oauthHandler = this.oauthHandlers.get(connectorKey)
    if (!oauthHandler) {
      throw IgniterConnectorError.oauthNotConfigured(connectorKey)
    }

    // Data Transform: Parse scope info from cookie
    let scopeInfo: { scope: string; identity: string; redirectUrl: string; state: string } | null = null

    if (request) {
      const cookieHeader = request.headers.get('cookie') || ''
      const cookieMatch = cookieHeader.match(new RegExp(`igniter_oauth_${connectorKey}=([^;]+)`))
      if (cookieMatch) {
        try {
          scopeInfo = JSON.parse(decodeURIComponent(cookieMatch[1]))
        } catch {
          // Fallback: Cookie parsing failed
        }
      }
    }

    // Fallback: Use params if cookie not found
    const scope = scopeInfo?.scope || 'default'
    const identity = scopeInfo?.identity || ''
    const redirectUrl = scopeInfo?.redirectUrl || '/'
    const error = scopeInfo?.state || ''
    const code = new URL(request.url).searchParams.get('code') || ''
    const state = new URL(request.url).searchParams.get('state') || ''

    // Data Transform: Build redirect URI
    const redirectUri = IgniterConnectorUrl.buildOAuthCallbackUrl(connectorKey)

    try {
      // Validation: Check for error in callback
      if (error) {
        throw new Error(error)
      }

      // Validation: Check for required code
      if (!code) {
        throw new Error('Authorization code not provided')
      }

      // API Call: Exchange code for tokens
      const { tokens } = await oauthHandler.exchangeCodeForToken(
        { code, state },
        redirectUri
      )

      // API Call: Get user info and complete OAuth data
      const oauthData = await oauthHandler.completeOAuthData(tokens)

      // Data Transform: Build config with OAuth data
      const config: Record<string, unknown> = { oauth: oauthData }
      if (connector.defaultConfig) {
        Object.assign(config, connector.defaultConfig)
      }

      // Data Transform: Encrypt config
      const encryptedConfig = await this.encryptConfig(config)

      // Database Query: Save to database
      await this.adapter.save(scope, identity, connectorKey, encryptedConfig, true)

      // Side Effect: Call onConnect hook
      if (this.hooks.onConnect) {
        await this.hooks.onConnect({
          connector: connectorKey,
          scope,
          identity,
          config,
        })
      }

      // Event Handling: Emit OAuth completed event
      await this.emit({
        type: 'oauth.completed',
        connector: connectorKey,
        scope,
        identity,
        timestamp: new Date(),
        success: true,
      })

      // Data Transform: Build success redirect URL
      const successUrl = new URL(redirectUrl, IgniterConnectorUrl.getBaseUrl() || 'http://localhost:3000')
      successUrl.searchParams.set('status', 'success')
      successUrl.searchParams.set('connector', connectorKey)

      // Response: Redirect with success and clear cookie
      return new Response(null, {
        status: 302,
        headers: {
          Location: successUrl.toString(),
          'Set-Cookie': `igniter_oauth_${connectorKey}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
        },
      })
    } catch (error) {
      // Event Handling: Emit OAuth error event
      await this.emit({
        type: 'oauth.completed',
        connector: connectorKey,
        scope,
        identity,
        timestamp: new Date(),
        success: false,
        error: (error as Error).message,
      })

      // Data Transform: Build error redirect URL
      const errorUrl = new URL(redirectUrl, IgniterConnectorUrl.getBaseUrl() || 'http://localhost:3000')
      errorUrl.searchParams.set('status', 'error')
      errorUrl.searchParams.set('connector', connectorKey)
      errorUrl.searchParams.set('error', (error as Error).message)

      // Response: Redirect with error and clear cookie
      return new Response(null, {
        status: 302,
        headers: {
          Location: errorUrl.toString(),
          'Set-Cookie': `igniter_oauth_${connectorKey}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
        },
      })
    }
  }

  /**
   * Handle webhook request.
   * @internal
   */
  private async handleWebhook(
    request: Request
  ): Promise<Response> {
    const result = IgniterConnectorUrl.parseWebhookUrl(request.url)

    if(!result) {
      throw new Error('Invalid webhook URL')
    }

    const { connectorKey, secret } = result

    const connector = this.connectors.get(connectorKey)
    if (!connector) {
      throw IgniterConnectorError.connectorNotFound(connectorKey)
    }

    if (!connector.webhook) {
      throw IgniterConnectorError.webhookNotConfigured(connectorKey)
    }


    // Validation: Verify webhook secret
    if (secret) {
      // Database Query: Find connection by webhook secret
      const connection = await this.adapter.findByWebhookSecret(connectorKey, secret)
      if (!connection) {
        throw IgniterConnectorError.webhookVerificationFailed(connectorKey)
      }

      const body = await request.json()
      const headers = request.headers
      const method = request.method
      const url = request.url

      // Data Transform: Build request object
      const webhookRequest: IgniterConnectorWebhookRequest = {
        body,
        headers,
        method,
        url,
      }

      // Data Transform: Decrypt config
      const decryptedConfig = await this.decryptConfig(connection.value as Record<string, unknown>)

      // Validation: Verify webhook signature if defined
      if (connector.webhook.verify) {
        const isValid = await connector.webhook.verify(webhookRequest, decryptedConfig)
        if (!isValid) {
          // Side Effect: Update webhook metadata with error
          await this.adapter.updateWebhookMetadata(connectorKey, secret, {
            lastEventAt: new Date(),
            lastEventResult: 'error',
            error: 'Webhook signature verification failed',
          })

          throw IgniterConnectorError.webhookVerificationFailed(connectorKey)
        }
      }

      // Validation: Validate payload
      const validationResult = await IgniterConnectorSchema.validate(connector.webhook.schema, request.body)
      if (!validationResult.success) {
        const errorMessage = validationResult.errors?.map((e) => e.message).join(', ') || 'Invalid webhook payload'
        // Side Effect: Update webhook metadata with error
        await this.adapter.updateWebhookMetadata(connectorKey, secret, {
          lastEventAt: new Date(),
          lastEventResult: 'error',
          error: errorMessage,
        })

        throw IgniterConnectorError.validationFailed(connectorKey, errorMessage)
      }

      // Side Effect: Get context
      let context: unknown
      if (connector.hooks.onContext) {
        context = await connector.hooks.onContext({
          config: decryptedConfig,
          scope: connection.scope,
          identity: connection.identity,
        })
      }

      // Event Handling: Emit webhook received event
      await this.emit({
        type: 'webhook.received',
        connector: connectorKey,
        scope: connection.scope,
        identity: connection.identity,
        timestamp: new Date(),
        success: true,
      })

      try {
        // API Call: Execute webhook handler
        const result = await connector.webhook.handler({
          payload: validationResult.data,
          config: decryptedConfig,
          context,
          scope: connection.scope,
          identity: connection.identity,
          headers: Object.fromEntries(headers),
        })

        // Side Effect: Update webhook metadata with success
        await this.adapter.updateWebhookMetadata(connectorKey, secret, {
          lastEventAt: new Date(),
          lastEventResult: 'success',
          error: undefined,
        })

        return new Response(JSON.stringify(result), { 
          status: 200 
        })
      } catch (error) {
        // Side Effect: Update webhook metadata with error
        await this.adapter.updateWebhookMetadata(connectorKey, secret, {
          lastEventAt: new Date(),
          lastEventResult: 'error',
          error: (error as Error).message,
        })

        throw error
      }
    }

    // Fallback: No secret provided, use legacy behavior
    throw new Error('Webhook secret is required')
  }

  /**
   * Execute an action using the connector's defaultConfig.
   * @internal
   */
  private async executeActionWithDefaultConfig<TInput, TOutput>(
    connectorKey: string,
    actionKey: string,
    input: TInput
  ): Promise<TOutput> {
    const connector = this.connectors.get(connectorKey)
    if (!connector) {
      throw IgniterConnectorError.connectorNotFound(connectorKey)
    }

    const action = connector.actions[actionKey]
    if (!action) {
      throw IgniterConnectorError.actionNotFound(connectorKey, actionKey)
    }

    // Validation: Check for defaultConfig
    if (!connector.defaultConfig) {
      throw IgniterConnectorError.configRequired(connectorKey)
    }

    // Validation: Validate input
    const validationResult = await IgniterConnectorSchema.validate(action.input, input)
    if (!validationResult.success) {
      const errorMessage = validationResult.errors?.map((e) => e.message).join(', ') || 'Invalid input'
      throw IgniterConnectorError.validationFailed(connectorKey, errorMessage)
    }

    // Side Effect: Get context
    let context: unknown
    if (connector.hooks.onContext) {
      context = await connector.hooks.onContext({
        config: connector.defaultConfig,
        scope: 'default',
        identity: '',
      })
    }

    const startTime = Date.now()

    try {
      // API Call: Execute action handler
      const result = await action.handler({
        input: validationResult.data,
        config: connector.defaultConfig,
        context,
        oauth: undefined,
        scope: 'default',
        identity: '',
      })

      // Event Handling: Emit action event
      await this.emit({
        type: 'action',
        connector: connectorKey,
        scope: 'default',
        identity: '',
        timestamp: new Date(),
        action: actionKey,
        success: true,
        duration: Date.now() - startTime,
      })

      return result as TOutput
    } catch (error) {
      // Event Handling: Emit error event
      await this.emit({
        type: 'error',
        connector: connectorKey,
        scope: 'default',
        identity: '',
        timestamp: new Date(),
        error: error as Error,
        action: actionKey,
      })

      // Side Effect: Call onError hook
      if (this.hooks.onError) {
        await this.hooks.onError({
          error: error as Error,
          connector: connectorKey,
          scope: 'default',
          identity: '',
          action: actionKey,
        })
      }

      throw error
    }
  }
}
