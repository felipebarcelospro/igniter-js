/**
 * @fileoverview Manager builder for creating IgniterConnectorManager instances
 * @module @igniter-js/connectors/builders/manager
 */

import type { IgniterLogger, StandardSchemaV1 } from "@igniter-js/core";
import type { IgniterConnectorAdapter } from "../types/adapter";
import type {
  IgniterConnectorDefinition,
  IgniterConnectorActionMap,
} from "../types/connector";
import type { IgniterConnectorEncryptionConfig } from "../types/config";
import type {
  IgniterConnectorScopeDefinition,
  IgniterConnectorScopeOptions,
} from "../types/scope";
import type { IgniterConnectorEventHandler } from "../types/events";
import { IgniterConnectorManagerCore } from "../core/manager";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterConnectorManagerConfig } from "../types/manager";
import type {
  IgniterConnectorManagerHooks,
  IgniterConnectorManagerOnConnectHook,
  IgniterConnectorManagerOnDisconnectHook,
  IgniterConnectorManagerOnErrorHook,
} from "../types/hooks";

/**
 * Builder class for creating IgniterConnectorManager instances.
 * Uses a fluent API pattern for configuration.
 *
 * @typeParam TScopes - Map of scope definitions
 * @typeParam TConnectors - Map of connector definitions
 *
 * @example
 * ```typescript
 * import { IgniterConnector, IgniterConnectorManager, IgniterConnectorPrismaAdapter } from '@igniter-js/connectors'
 *
 * const connectors = IgniterConnectorManager.create()
 *   .withDatabase(IgniterConnectorPrismaAdapter.create(prisma))
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
export class IgniterConnectorManagerBuilder<
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
  private adapter?: IgniterConnectorAdapter;

  /** Logger instance */
  private logger?: IgniterLogger;

  /** Telemetry runtime */
  private telemetry?: IgniterTelemetryManager;

  /** Encryption fields */
  private encryptFields: string[] = [];

  /** Custom encryption function */
  private customEncrypt?: (value: string) => string | Promise<string>;

  /** Custom decryption function */
  private customDecrypt?: (value: string) => string | Promise<string>;

  /** Scope definitions */
  private scopes: Map<string, IgniterConnectorScopeDefinition> = new Map();

  /** Connector definitions */
  private connectors: Map<string, IgniterConnectorDefinition> = new Map();

  /** Global event handlers */
  private eventHandlers: IgniterConnectorEventHandler[] = [];

  /** Lifecycle hooks */
  private hooks: IgniterConnectorManagerHooks = {};

  /**
   * Private constructor. Use `IgniterConnectorManager.create()` instead.
   */
  private constructor() {}

  /**
   * Create a new manager builder.
   *
   * @returns A new IgniterConnectorManagerBuilder instance
   *
   * @example
   * ```typescript
   * const builder = IgniterConnectorManager.create()
   * ```
   */
  // biome-ignore lint/complexity/noBannedTypes: Empty object is needed for proper type inference with keyof
  static create(): IgniterConnectorManagerBuilder<{}, {}> {
    // biome-ignore lint/complexity/noBannedTypes: Empty object is needed for proper type inference with keyof
    return new IgniterConnectorManagerBuilder() as IgniterConnectorManagerBuilder<{}, {}>;
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
    logger: IgniterLogger,
  ): IgniterConnectorManagerBuilder<TScopes, TConnectors> {
    this.logger = logger;
    return this;
  }

  /**
   * Set the telemetry runtime for connector observability.
   *
   * When configured, the connector will automatically emit telemetry events for:
   * - Connection lifecycle (connected, disconnected, enabled, disabled, updated)
   * - OAuth flows (started, completed, refreshed, failed)
   * - Action execution (started, completed, failed)
   * - Webhook handling (received, processed, failed)
   * - Adapter operations (get, list, upsert, update, delete)
   * - Errors (occurred)
   *
   * **IMPORTANT: Redaction Rules**
   *
   * When using telemetry, you MUST configure redaction to prevent exposing sensitive data:
   *
   * ```typescript
   * import { IgniterTelemetry } from '@igniter-js/telemetry'
   * import { ConnectorsTelemetryEvents } from '@igniter-js/connectors'
   *
   * const telemetry = IgniterTelemetry.create()
   *   .withService('my-api')
   *   .addEvents(ConnectorsTelemetryEvents)
   *   .withRedaction({
   *     // REQUIRED: Denylist sensitive fields
   *     denylistKeys: [
   *       'config',           // Connector configs (may contain API keys)
   *       'accessToken',      // OAuth tokens
   *       'refreshToken',     // OAuth refresh tokens
   *       'clientSecret',     // OAuth client secrets
   *       'apiKey',           // API keys
   *       'token',            // Generic tokens
   *       'secret',           // Secrets
   *       'password',         // Passwords
   *       'payload',          // Webhook payloads
   *       'input',            // Action inputs
   *       'output',           // Action outputs
   *       'userInfo',         // User information from OAuth
   *     ],
   *     // OPTIONAL: Hash identifiers for privacy
   *     hashKeys: ['ctx.connector.identity'],
   *   })
   *   .build()
   *
   * const connectors = IgniterConnectorManager.create()
   *   .withDatabase(adapter)
   *   .withTelemetry(telemetry) // Events auto-emitted with redaction
   *   .build()
   * ```
   *
   * **Safe Attributes**
   *
   * The following attributes are safe to expose in telemetry:
   * - Connector provider keys (e.g., 'telegram', 'slack')
   * - Action names (e.g., 'sendMessage', 'createRecord')
   * - Scope types (e.g., 'organization', 'user')
   * - Scope identifiers (can be hashed)
   * - Timestamps and durations
   * - Success/failure states
   * - Error codes
   *
   * **Redacted Attributes**
   *
   * These MUST be redacted (automatically handled when using recommended config):
   * - Connector configurations
   * - OAuth tokens (access, refresh, client secrets)
   * - Webhook payloads
   * - Action inputs/outputs
   * - User information from OAuth providers
   *
   * @param telemetry - Telemetry runtime instance from @igniter-js/telemetry
   * @returns The builder
   *
   * @example
   * ```typescript
   * import { IgniterConnector } from '@igniter-js/connectors'
   * import { IgniterTelemetry } from '@igniter-js/telemetry'
   * import { ConnectorsTelemetryEvents } from '@igniter-js/connectors'
   *
   * // 1. Create telemetry with redaction
   * const telemetry = IgniterTelemetry.create()
   *   .withService('my-api')
   *   .withEnvironment('production')
   *   .addEvents(ConnectorsTelemetryEvents)
   *   .withRedaction({
   *     denylistKeys: ['config', 'accessToken', 'payload'],
   *     hashKeys: ['ctx.connector.identity'],
   *   })
   *   .build()
   *
   * // 2. Create connector with telemetry
   * const connectors = IgniterConnectorManager.create()
   *   .withDatabase(adapter)
   *   .withTelemetry(telemetry) // Events auto-emitted!
   *   .addScope('organization', { required: true })
   *   .addConnector('telegram', telegram)
   *   .build()
   *
   * // 3. Use connector (telemetry events emitted automatically)
   * const scoped = connectors.scope('organization', 'org_123')
   * await scoped.connect('telegram', { botToken: '...', chatId: '...' })
   * // → Emits: igniter.connectors.connector.connected
   *
   * await scoped.action('telegram', 'sendMessage').call({ message: 'Hi!' })
   * // → Emits: igniter.connectors.action.started
   * // → Emits: igniter.connectors.action.completed
   * ```
   *
   * @see {@link ConnectorsTelemetryEvents} for all available events
   * @see {@link https://igniterjs.com/docs/telemetry} for telemetry documentation
   */
  withTelemetry(
    telemetry: IgniterTelemetryManager,
  ): IgniterConnectorManagerBuilder<TScopes, TConnectors> {
    this.telemetry = telemetry;
    return this;
  }

  /**
   * Set the database adapter.
   *
   * @param adapter - Database adapter instance
   * @returns The builder
   *
   * @example
   * ```typescript
   * .withDatabase(IgniterConnectorPrismaAdapter.create(prisma))
   * ```
   */
  withDatabase(
    adapter: IgniterConnectorAdapter,
  ): IgniterConnectorManagerBuilder<TScopes, TConnectors> {
    this.adapter = adapter;
    return this;
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
      encrypt?: (value: string) => string | Promise<string>;
      decrypt?: (value: string) => string | Promise<string>;
    },
  ): IgniterConnectorManagerBuilder<TScopes, TConnectors> {
    this.encryptFields = fields;
    this.customEncrypt = callbacks?.encrypt;
    this.customDecrypt = callbacks?.decrypt;
    return this;
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
    options: IgniterConnectorScopeOptions = { required: true },
  ): IgniterConnectorManagerBuilder<
    TScopes & { [K in TKey]: IgniterConnectorScopeDefinition },
    TConnectors
  > {
    // Data Transform: Convert options to full definition with key
    const definition: IgniterConnectorScopeDefinition = {
      key,
      required: options.required ?? true,
    };
    this.scopes.set(key, definition);
    return this as IgniterConnectorManagerBuilder<
      TScopes & { [K in TKey]: IgniterConnectorScopeDefinition },
      TConnectors
    >;
  }

  /**
   * Add a connector definition.
   *
   * @param key - Unique connector identifier
   * @param connector - Connector definition (from `IgniterConnector.create().build()`)
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
    connector: TConnector,
  ): IgniterConnectorManagerBuilder<
    TScopes,
    TConnectors & { [K in TKey]: TConnector }
  > {
    this.connectors.set(key, connector);
    return this as any as IgniterConnectorManagerBuilder<
      TScopes,
      TConnectors & { [K in TKey]: TConnector }
    >;
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
    handler: IgniterConnectorManagerOnConnectHook,
  ): IgniterConnectorManagerBuilder<TScopes, TConnectors> {
    this.hooks.onConnect = handler;
    return this;
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
    handler: IgniterConnectorManagerOnDisconnectHook,
  ): IgniterConnectorManagerBuilder<TScopes, TConnectors> {
    this.hooks.onDisconnect = handler;
    return this;
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
    handler: IgniterConnectorManagerOnErrorHook,
  ): IgniterConnectorManagerBuilder<TScopes, TConnectors> {
    this.hooks.onError = handler;
    return this;
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
    handler: IgniterConnectorEventHandler,
  ): IgniterConnectorManagerBuilder<TScopes, TConnectors> {
    this.eventHandlers.push(handler);
    return this;
  }

  /**
   * Build the IgniterConnectorManager instance.
   * This returns the fully configured connector manager.
   *
   * @returns The IgniterConnectorManager instance ready for use
   * @throws Error if required configuration is missing
   *
   * @example
   * ```typescript
   * const connectors = IgniterConnectorManager.create()
   *   .withDatabase(adapter)
   *   .addScope('organization', { required: true })
   *   .addConnector('telegram', telegram)
   *   .build()
   *
   * // Use the connectors
   * const scoped = connectors.scope('organization', 'org_123')
   * ```
   */
  build(): IgniterConnectorManagerCore<TScopes, TConnectors> {
    // Validation: Database adapter is required
    if (!this.adapter) {
      throw new Error(
        "Database adapter is required. Use .withDatabase(adapter) to set it.",
      );
    }

    // Validation: At least one scope is required
    if (this.scopes.size === 0) {
      throw new Error(
        "At least one scope is required. Use .addScope(key, options) to add scopes.",
      );
    }

    // Response: Build configuration object
    const config: IgniterConnectorManagerConfig = {
      adapter: this.adapter,
      logger: this.logger,
      telemetry: this.telemetry,
      encryption: {
        fields: this.encryptFields,
        encrypt: this.customEncrypt,
        decrypt: this.customDecrypt,
      } as IgniterConnectorEncryptionConfig,
      scopes: this.scopes,
      connectors: this.connectors,
      eventHandlers: this.eventHandlers,
      hooks: this.hooks,
    };

    // Response: Return IgniterConnector instance
    return new IgniterConnectorManagerCore(config) as IgniterConnectorManagerCore<
      TScopes,
      TConnectors
    >;
  }

  /**
   * Get the scopes map for type inference.
   *
   * @returns The scopes type map
   */
  getScopes(): TScopes {
    return Object.fromEntries(this.scopes) as TScopes;
  }

  /**
   * Get the connectors map for type inference.
   *
   * @returns The connectors type map
   */
  getConnectors(): TConnectors {
    return Object.fromEntries(this.connectors) as TConnectors;
  }
}

/**
 * Public entrypoint alias for IgniterConnectorManager.
 */
export const IgniterConnectorManager = IgniterConnectorManagerBuilder;
