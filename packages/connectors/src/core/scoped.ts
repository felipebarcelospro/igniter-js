/**
 * @fileoverview Scoped connector instance with Proxy-based access
 * @module @igniter-js/connectors/core/scoped
 */

import type { StandardSchemaV1 } from "@igniter-js/core";
import type {
  IgniterConnectorDefinition,
  IgniterConnectorActionBuilder,
  IgniterConnectorActionResult,
  IgniterConnectorInstance,
  ExtractConnectorActionKeys,
  InferActionInput,
  InferActionOutput,
  ExtractConnectorConnectOutput,
  ExtractConnectorConnectInput,
} from "../types/connector";
import type {
  IgniterConnectorEvent,
  IgniterConnectorEventHandler,
  IgniterConnectorEventSubscription,
} from "../types/events";
import type { IgniterConnectorScopeDefinition } from "../types/scope";
import { IgniterConnectorManagerCore } from "./manager";
import { IgniterConnectorError } from "../errors/connector.error";
import { IgniterConnectorSchema } from "../utils/schema";
import { IgniterConnectorOAuthUtils } from "../utils/oauth";
import { IgniterConnectorUrl } from "../utils/url";

/**
 * Scoped connector instance.
 * Provides access to connectors within a specific scope and identity.
 *
 * @example
 * ```typescript
 * const scoped = connectors.scope('organization', 'org_123')
 *
 * // Get connector info
 * const info = await scoped.get('telegram')
 *
 * // List all connected connectors
 * const list = await scoped.list()
 *
 * // Connect a connector
 * await scoped.connect('telegram', { botToken: '...', chatId: '...' })
 *
 * // Execute an action
 * const { data, error } = await scoped.action('telegram', 'sendMessage').call({ message: 'Hello!' })
 * ```
 */
export class IgniterConnectorScoped<
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
  /** @internal */
  private manager: IgniterConnectorManagerCore<
    Record<string, IgniterConnectorScopeDefinition>,
    TConnectors
  >;
  /** @internal */
  private scopeType: string;
  /** @internal */
  private scopeIdentity: string;
  /** @internal */
  private localEventHandlers: Set<IgniterConnectorEventHandler> = new Set();

  /** @internal */
  constructor(
    manager: IgniterConnectorManagerCore<
      Record<string, IgniterConnectorScopeDefinition>,
      TConnectors
    >,
    scope: string,
    identity: string,
  ) {
    this.manager = manager;
    this.scopeType = scope;
    this.scopeIdentity = identity;
  }

  /**
   * List all connected connectors for this scope.
   *
   * @param options - Optional filtering and pagination options
   * @returns Array of connector instances
   *
   * @example
   * ```typescript
   * const connectors = await scoped.list({ where: { enabled: true } })
   * ```
   */
  async list(options?: {
    where?: { enabled?: boolean; name?: string };
    limit?: number;
    offset?: number;
    count?: { connections?: boolean };
  }): Promise<IgniterConnectorInstance[]> {
    // Database Query: Get all records for this scope
    const records = await this.manager
      .getAdapter()
      .list(this.scopeType, this.scopeIdentity);
    const instances: IgniterConnectorInstance[] = [];

    // Loop: Build instance objects
    for (const record of records) {
      const connector = this.manager.getConnector(record.provider);
      if (!connector) continue;

      // Conditional: Filter by enabled if specified
      if (
        options?.where?.enabled !== undefined &&
        record.enabled !== options.where.enabled
      ) {
        continue;
      }

      // Conditional: Filter by name if specified
      if (options?.where?.name !== undefined) {
        const metadata = connector.metadata as
          | Record<string, unknown>
          | undefined;
        if (metadata?.name !== options.where.name) continue;
      }

      // Data Transform: Decrypt config
      const decryptedValue = await this.manager.decryptConfig(
        record.value as Record<string, unknown>,
      );

      instances.push({
        key: record.provider,
        type: connector.oauth ? "oauth" : "custom",
        provider: record.provider,
        config: decryptedValue,
        enabled: record.enabled,
        metadata: (connector.metadata ?? {}) as Record<string, unknown>,
        oauth: decryptedValue.oauth as IgniterConnectorInstance["oauth"],
        webhook: decryptedValue.webhook as IgniterConnectorInstance["webhook"],
        fields: [],
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }

    // Data Transform: Apply pagination
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? instances.length;
    return instances.slice(offset, offset + limit);
  }

  /**
   * Get a specific connector instance.
   *
   * @param connectorKey - The connector key
   * @param options - Optional options
   * @returns The connector instance or null
   *
   * @example
   * ```typescript
   * const telegram = await scoped.get('telegram')
   * if (telegram) {
   *   console.log('Connected:', telegram.enabled)
   * }
   * ```
   */
  async get<K extends keyof TConnectors & string>(
    connectorKey: K,
    _options?: { count?: { connections?: boolean } },
  ): Promise<IgniterConnectorInstance | null> {
    const connector = this.manager.getConnector(connectorKey);
    if (!connector) return null;

    // Database Query: Get record
    const record = await this.manager
      .getAdapter()
      .get(this.scopeType, this.scopeIdentity, connectorKey);
    if (!record) return null;

    // Data Transform: Decrypt config
    const decryptedValue = await this.manager.decryptConfig(
      record.value as Record<string, unknown>,
    );

    return {
      key: connectorKey,
      type: connector.oauth ? "oauth" : "custom",
      provider: connectorKey,
      config: decryptedValue,
      enabled: record.enabled,
      metadata: (connector.metadata ?? {}) as Record<string, unknown>,
      oauth: decryptedValue.oauth as IgniterConnectorInstance["oauth"],
      webhook: decryptedValue.webhook as IgniterConnectorInstance["webhook"],
      fields: [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Count connected connectors.
   *
   * @param options - Optional filtering options
   * @returns The count
   *
   * @example
   * ```typescript
   * const count = await scoped.count({ where: { enabled: true } })
   * ```
   */
  async count(options?: {
    where?: { enabled?: boolean; name?: string };
  }): Promise<number> {
    const list = await this.list({ where: options?.where });
    return list.length;
  }

  /**
   * Connect a connector with configuration.
   * If the connector has webhook support, a webhook secret will be automatically generated.
   *
   * @param connectorKey - The connector key
   * @param config - The configuration
   * @returns Connection info including webhook URL if applicable
   *
   * @example
   * ```typescript
   * const result = await scoped.connect('telegram', { botToken: '...', chatId: '...' })
   * if (result.webhookUrl) {
   *   console.log('Configure webhook at:', result.webhookUrl)
   * }
   * ```
   */
  async connect<K extends keyof TConnectors & string>(
    connectorKey: K,
    config: ExtractConnectorConnectInput<TConnectors[K]>,
    // @ts-expect-error - TOAuth inference not working properly
  ): ExtractConnectorConnectOutput<TConnectors[K]> {
    const connector = this.manager.getConnector(connectorKey);
    if (!connector) throw IgniterConnectorError.connectorNotFound(connectorKey);

    // Validation: Validate config
    const validationResult = await IgniterConnectorSchema.validate(
      connector.configSchema,
      config,
    );
    if (!validationResult.success) {
      const errorMessage =
        validationResult.errors?.map((e) => e.message).join(", ") ||
        "Invalid config";
      throw IgniterConnectorError.validationFailed(connectorKey, errorMessage);
    }

    const validConfig = validationResult.data as Record<string, unknown>;

    // Side Effect: Call onValidate hook
    if (connector.hooks.onValidate) {
      await connector.hooks.onValidate({
        config: validConfig,
        scope: this.scopeType,
        identity: this.scopeIdentity,
      });
    }

    // Data Transform: Generate webhook secret if connector has webhook support
    if (connector.webhook) {
      const webhookSecret = IgniterConnectorUrl.generateSecret();

      validConfig.webhook = {
        secret: webhookSecret,
        createdAt: new Date(),
      };
    }

    if (connector.oauth) {
      // Side Effect: Prepare OAuth data
      const response = await this.manager.handleOAuthConnect(connectorKey, {
        scope: this.scopeType,
        identity: this.scopeIdentity,
        redirectUri: IgniterConnectorUrl.buildOAuthCallbackUrl(connectorKey),
      });

      return response as unknown as ExtractConnectorConnectOutput<
        TConnectors[K]
      >;
    }

    // Data Transform: Encrypt config
    const encryptedConfig = await this.manager.encryptConfig(validConfig);

    // Database Query: Save to database
    await this.manager
      .getAdapter()
      .save(
        this.scopeType,
        this.scopeIdentity,
        connectorKey,
        encryptedConfig,
        true,
      );

    // Side Effect: Call onConnect hook
    const hooks = this.manager.getHooks();
    if (hooks.onConnect) {
      await hooks.onConnect({
        connector: connectorKey,
        scope: this.scopeType,
        identity: this.scopeIdentity,
        config: validConfig,
      });
    }

    // Event Handling: Emit connected event
    await this.emit({
      type: "connector.connected",
      connector: connectorKey,
      scope: this.scopeType,
      identity: this.scopeIdentity,
      timestamp: new Date(),
    });
  }

  /**
   * Disconnect a connector.
   *
   * @param connectorKey - The connector key
   *
   * @example
   * ```typescript
   * await scoped.disconnect('telegram')
   * ```
   */
  async disconnect<K extends keyof TConnectors & string>(
    connectorKey: K,
  ): Promise<void> {
    // Database Query: Delete record
    await this.manager
      .getAdapter()
      .delete(this.scopeType, this.scopeIdentity, connectorKey);

    // Side Effect: Call onDisconnect hook
    const hooks = this.manager.getHooks();
    if (hooks.onDisconnect) {
      await hooks.onDisconnect({
        connector: connectorKey,
        scope: this.scopeType,
        identity: this.scopeIdentity,
      });
    }

    // Event Handling: Emit disconnected event
    await this.emit({
      type: "connector.disconnected",
      connector: connectorKey,
      scope: this.scopeType,
      identity: this.scopeIdentity,
      timestamp: new Date(),
    });
  }

  /**
   * Toggle connector enabled state.
   *
   * @param connectorKey - The connector key
   * @param enabled - Optional explicit state (if not provided, toggles current state)
   *
   * @example
   * ```typescript
   * // Toggle
   * await scoped.toggle('telegram')
   *
   * // Explicitly enable
   * await scoped.toggle('telegram', true)
   * ```
   */
  async toggle<K extends keyof TConnectors & string>(
    connectorKey: K,
    enabled?: boolean,
  ): Promise<void> {
    // Database Query: Get current state if not explicitly provided
    if (enabled === undefined) {
      const record = await this.manager
        .getAdapter()
        .get(this.scopeType, this.scopeIdentity, connectorKey);
      if (!record)
        throw IgniterConnectorError.connectorNotConnected(connectorKey);
      enabled = !record.enabled;
    }

    // Database Query: Update enabled state
    await this.manager
      .getAdapter()
      .update(this.scopeType, this.scopeIdentity, connectorKey, { enabled });

    // Event Handling: Emit enabled/disabled event
    await this.emit({
      type: enabled ? "connector.enabled" : "connector.disabled",
      connector: connectorKey,
      scope: this.scopeType,
      identity: this.scopeIdentity,
      timestamp: new Date(),
    });
  }

  /**
   * Create an action builder for executing connector actions.
   *
   * @param connectorKey - The connector key
   * @param actionKey - The action key
   * @returns An action builder with .call() method
   *
   * @example
   * ```typescript
   * const { data, error } = await scoped
   *   .action('telegram', 'sendMessage')
   *   .call({ message: 'Hello!' })
   *
   * if (error) {
   *   console.error('Failed:', error)
   * } else {
   *   console.log('Message ID:', data?.messageId)
   * }
   * ```
   */
  action<
    K extends keyof TConnectors & string,
    A extends ExtractConnectorActionKeys<TConnectors[K]>,
  >(
    connectorKey: K,
    actionKey: A,
  ): IgniterConnectorActionBuilder<
    InferActionInput<TConnectors, K, A>,
    InferActionOutput<TConnectors, K, A>
  > {
    const self = this;
    return {
      async call(
        input: InferActionInput<TConnectors, K, A>,
      ): Promise<
        IgniterConnectorActionResult<InferActionOutput<TConnectors, K, A>>
      > {
        try {
          const result = await self.executeActionInternal(
            connectorKey,
            actionKey,
            input,
          );
          return {
            data: result as InferActionOutput<TConnectors, K, A>,
            error: undefined,
          };
        } catch (error) {
          return { data: undefined, error: error as Error };
        }
      },
    };
  }

  /**
   * Register an event handler for this scoped instance.
   *
   * @param handler - The event handler function
   * @returns A subscription object with unsubscribe method
   *
   * @example
   * ```typescript
   * const subscription = scoped.on((event) => {
   *   console.log(`[${event.type}] ${event.connector}`)
   * })
   *
   * // Later
   * subscription.unsubscribe()
   * ```
   */
  on(handler: IgniterConnectorEventHandler): IgniterConnectorEventSubscription {
    this.localEventHandlers.add(handler);
    return {
      unsubscribe: () => {
        this.localEventHandlers.delete(handler);
      },
    };
  }

  // ============================================
  // INTERNAL METHODS (not exposed to public API)
  // ============================================

  /** @internal */
  private async executeActionInternal<TInput, TOutput>(
    connectorKey: string,
    actionKey: string,
    input: TInput,
  ): Promise<TOutput> {
    const connector = this.manager.getConnector(connectorKey);
    if (!connector) throw IgniterConnectorError.connectorNotFound(connectorKey);

    const action = connector.actions[actionKey];
    if (!action)
      throw IgniterConnectorError.actionNotFound(connectorKey, actionKey);

    // Database Query: Get connector instance
    const instance = await this.get(connectorKey as keyof TConnectors & string);
    if (!instance)
      throw IgniterConnectorError.connectorNotConnected(connectorKey);
    if (!instance.enabled)
      throw IgniterConnectorError.connectorDisabled(connectorKey);

    // Side Effect: Ensure OAuth tokens are valid
    if (instance.oauth) {
      await this.ensureValidTokens(connectorKey, instance);
    }

    // Validation: Validate input
    const validationResult = await IgniterConnectorSchema.validate(
      action.input,
      input,
    );
    if (!validationResult.success) {
      const errorMessage =
        validationResult.errors?.map((e) => e.message).join(", ") ||
        "Invalid input";
      throw IgniterConnectorError.validationFailed(connectorKey, errorMessage);
    }

    // Side Effect: Get context
    let context: unknown;
    if (connector.hooks.onContext && instance.config) {
      context = await connector.hooks.onContext({
        config: instance.config,
        scope: this.scopeType,
        identity: this.scopeIdentity,
      });
    }

    const startTime = Date.now();

    // Event Handling: Emit action started event
    await this.emit({
      type: "action.started",
      connector: connectorKey,
      scope: this.scopeType,
      identity: this.scopeIdentity,
      timestamp: new Date(),
      action: actionKey,
    });

    try {
      // API Call: Execute action handler
      const result = await action.handler({
        input: validationResult.data,
        config: instance.config,
        context,
        oauth: instance.oauth
          ? {
            accessToken: instance.oauth.accessToken,
            refreshToken: instance.oauth.refreshToken,
            expiresAt: instance.oauth.expiresAt,
            expiresIn: instance.oauth.expiresIn,
            userInfo: instance.oauth.userInfo
              ? {
                id: String(instance.oauth.userInfo.id ?? ""),
                name: instance.oauth.userInfo.name as string | undefined,
                email: instance.oauth.userInfo.email as string | undefined,
                avatar: instance.oauth.userInfo.avatar as
                  | string
                  | undefined,
              }
              : undefined,
            connectedAt: instance.oauth.connectedAt,
          }
          : undefined,
        scope: this.scopeType,
        identity: this.scopeIdentity,
      });

      // Event Handling: Emit action completed event
      await this.emit({
        type: "action.completed",
        connector: connectorKey,
        scope: this.scopeType,
        identity: this.scopeIdentity,
        timestamp: new Date(),
        action: actionKey,
        durationMs: Date.now() - startTime,
      });

      return result as TOutput;
    } catch (error) {
      // Event Handling: Emit action failed event
      await this.emit({
        type: "action.failed",
        connector: connectorKey,
        scope: this.scopeType,
        identity: this.scopeIdentity,
        timestamp: new Date(),
        action: actionKey,
        durationMs: Date.now() - startTime,
        errorCode: (error as any)?.code ?? "UNKNOWN",
        errorMessage: (error as Error).message,
      });

      // Side Effect: Call onError hook
      const hooks = this.manager.getHooks();
      if (hooks.onError) {
        await hooks.onError({
          error: error as IgniterConnectorError,
          connector: connectorKey,
          operation: "action",
          scope: this.scopeType,
          identity: this.scopeIdentity,
          action: actionKey,
        });
      }

      throw error;
    }
  }

  /** @internal */
  private async ensureValidTokens(
    connectorKey: string,
    instance: IgniterConnectorInstance,
  ): Promise<void> {
    if (!instance.oauth) return;

    const tokens = {
      accessToken: instance.oauth.accessToken,
      refreshToken: instance.oauth.refreshToken,
      expiresAt: instance.oauth.expiresAt,
      expiresIn: instance.oauth.expiresIn,
    };

    if (!IgniterConnectorOAuthUtils.isExpired(tokens)) return;
    if (!IgniterConnectorOAuthUtils.canRefresh(tokens))
      throw IgniterConnectorError.oauthTokenExpired(connectorKey);

    const oauthHandler = this.manager.getOAuthHandler(connectorKey);
    if (!oauthHandler)
      throw IgniterConnectorError.oauthNotConfigured(connectorKey);
    if (!tokens.refreshToken)
      throw IgniterConnectorError.oauthTokenExpired(connectorKey);

    const newTokens = await oauthHandler.refreshToken(tokens.refreshToken);

    const updatedOauth = {
      ...instance.oauth,
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken || instance.oauth.refreshToken,
      expiresAt: newTokens.expiresAt,
      expiresIn: newTokens.expiresIn,
    };

    const updatedConfig = {
      ...(instance.config as Record<string, unknown>),
      oauth: updatedOauth,
    };
    const encryptedConfig = await this.manager.encryptConfig(updatedConfig);

    await this.manager
      .getAdapter()
      .update(this.scopeType, this.scopeIdentity, connectorKey, {
        value: encryptedConfig,
      });

    await this.emit({
      type: "oauth.refreshed",
      connector: connectorKey,
      scope: this.scopeType,
      identity: this.scopeIdentity,
      timestamp: new Date(),
    });

    instance.oauth = updatedOauth;
    instance.config = updatedConfig;
  }

  /** @internal */
  private async emit(event: IgniterConnectorEvent): Promise<void> {
    // Local handlers
    for (const handler of this.localEventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        this.manager.getLogger()?.error("Local event handler error:", error);
      }
    }

    // Global handler (also handles telemetry emission)
    await this.manager.emit(event);
  }

}
