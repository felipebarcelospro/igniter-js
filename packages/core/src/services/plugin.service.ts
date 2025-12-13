import type {
  IgniterPlugin,
  PluginRegistry,
  PluginEventBusListener,
  PluginDependencyNode,
  PluginExecutionResult,
  PluginManagerConfig,
  PluginActionsCollection,
  PluginEventListenersCollection,
  PluginEventEmittersCollection,
  PluginSelfContext,
  PluginActionDefinition,
  PluginControllerAction,
} from "../types/plugin.interface";
import type {
  ContextCallback,
  IgniterBaseContext,
} from "../types/context.interface";
import type { StandardSchemaV1 } from "../types/schema.interface";
import type { IgniterStoreAdapter } from "../types/store.interface";
import { IgniterLogLevel, type IgniterLogger } from "../types";
import { IgniterConsoleLogger } from "./logger.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";

/**
 * 100% Type-Safe Plugin Manager for Igniter.js with StoreAdapter Integration
 *
 * Manages plugin lifecycle, dependencies, events, and execution with complete type safety.
 * Uses StoreAdapter for event pub/sub and maintains Map registry for performance.
 * Supports self-referential plugins and complete context extension.
 *
 * @template TContext - Application context type
 *
 * @example
 * ```typescript
 * const pluginManager = new IgniterPluginManager<MyContext>({
 *   store: redisStoreAdapter,
 *   logger: customLogger,
 *   config: {
 *     enableRuntimeValidation: true,
 *     enableMetrics: true,
 *     maxExecutionTime: 5000
 *   }
 * });
 *
 * await pluginManager.register(myPlugin);
 * await pluginManager.loadAll();
 *
 * const result = await pluginManager.executeAction('auth-plugin', 'validateToken', args, context);
 * await pluginManager.emit('user:login', payload, context);
 * ```
 */
export class IgniterPluginManager<TContext extends object | ContextCallback> {
  // ============ PRIVATE PROPERTIES ============
  private readonly plugins: PluginRegistry<TContext> = new Map();
  private readonly dependencyGraph: Map<string, PluginDependencyNode> =
    new Map();
  private readonly eventBus: Map<string, PluginEventBusListener<TContext>[]> =
    new Map(); // Local cache for performance
  private readonly config: PluginManagerConfig<TContext>;
  private readonly metrics: Map<
    string,
    { calls: number; totalTime: number; errors: number }
  > = new Map();
  private readonly pluginProxies: Map<
    string,
    PluginSelfContext<TContext, any>
  > = new Map();
  private isInitialized = false;

  // ============ INJECTED DEPENDENCIES ============
  private readonly store: IgniterStoreAdapter;
  private readonly logger?: IgniterLogger;

  // ============ CONSTRUCTOR ============
  constructor(params: {
    store: IgniterStoreAdapter;
    logger?: IgniterLogger;
    config?: PluginManagerConfig<TContext>;
  }) {
    this.store = params.store;
    this.logger = params.logger?.child("IgniterPluginManager");

    this.config = {
      enableRuntimeValidation: true,
      enableMetrics: false,
      maxExecutionTime: 30000, // 30 seconds
      enableDebugLogging: false,
      ...params.config,
    };

    this.logger?.debug("Initialized with config:", this.config);
  }

  // ============ PLUGIN REGISTRATION ============

  /**
   * Register a plugin with full type checking and validation
   *
   * @param plugin - Plugin to register
   * @throws Error if plugin has invalid dependencies or conflicts
   *
   * @example
   * ```typescript
   * await pluginManager.register(authPlugin);
   * ```
   */
  async register<
    TName extends string,
    TMeta extends Record<string, any>,
    TConfig extends Record<string, any>,
    TActions extends PluginActionsCollection<any>,
    TControllers extends Record<string, any>,
    TEventListeners extends PluginEventListenersCollection<any>,
    TEventEmitters extends PluginEventEmittersCollection,
  >(
    plugin: IgniterPlugin<
      TContext,
      TName,
      TMeta,
      TConfig,
      TActions,
      TControllers,
      TEventListeners,
      TEventEmitters
    >,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Runtime validation
      if (this.config.enableRuntimeValidation) {
        this.validatePluginDefinition(plugin);
      }

      // Check for conflicts
      this.checkPluginConflicts(plugin);

      // Register plugin
      this.plugins.set(plugin.name, plugin as any);

      // Build dependency graph
      this.buildDependencyGraph(plugin);

      // Register event listeners
      this.registerEventListeners(plugin);

      // Create plugin self-reference proxy
      this.createPluginProxy(plugin);

      // Initialize metrics
      if (this.config.enableMetrics) {
        this.metrics.set(plugin.name, { calls: 0, totalTime: 0, errors: 0 });
      }

      // Trigger callback
      this.config.onPluginLoaded?.(plugin.name);

      this.logger?.debug(`Registered plugin: ${plugin.name}`);
    } catch (error) {
      this.config.onPluginError?.(error as Error, plugin.name);
      throw error;
    } finally {
      if (this.config.enableMetrics) {
        const executionTime = performance.now() - startTime;
        this.logger?.debug(
          `Registration time for ${plugin.name}: ${executionTime.toFixed(2)}ms`,
        );
      }
    }
  }

  /**
   * Unregister a plugin and cleanup resources
   *
   * @param pluginName - Name of plugin to unregister
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    try {
      // Execute cleanup hook
      if (plugin.hooks.destroy) {
        await this.executeWithTimeout(
          () =>
            plugin.hooks.destroy!(
              {} as TContext,
              this.pluginProxies.get(pluginName)!,
            ),
          this.config.maxExecutionTime!,
          `Plugin ${pluginName} destroy hook`,
        );
      }

      // Cleanup resources
      if (plugin.resources.cleanup) {
        await this.executeWithTimeout(
          () => plugin.resources.cleanup({} as TContext),
          this.config.maxExecutionTime!,
          `Plugin ${pluginName} resource cleanup`,
        );
      }

      // Remove from registry
      this.plugins.delete(pluginName);
      this.dependencyGraph.delete(pluginName);
      this.metrics.delete(pluginName);

      // Remove event listeners
      this.unregisterEventListeners(pluginName);

      this.config.onPluginUnloaded?.(pluginName);

      this.logger?.debug(`Unregistered plugin: ${pluginName}`);
    } catch (error) {
      this.config.onPluginError?.(error as Error, pluginName);
      throw error;
    }
  }

  // ============ PLUGIN LIFECYCLE ============

  /**
   * Load all registered plugins in dependency order
   */
  async loadAll(): Promise<void> {
    if (this.isInitialized) {
      this.logger?.warn("Already initialized");
      return;
    }

    const loadOrder = this.resolveDependencyOrder();

    for (const pluginName of loadOrder) {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) continue;

      try {
        // Update status
        const node = this.dependencyGraph.get(pluginName);
        if (node) node.status = "loading";

        // Execute init hook
        if (plugin.hooks.init) {
          await this.executeWithTimeout(
            () =>
              plugin.hooks.init!(
                {} as TContext,
                this.pluginProxies.get(pluginName)!,
              ),
            this.config.maxExecutionTime!,
            `Plugin ${pluginName} init hook`,
          );
        }

        // Mark as loaded
        if (node) node.status = "loaded";

        this.logger?.debug(`Loaded plugin: ${pluginName}`);
      } catch (error) {
        const node = this.dependencyGraph.get(pluginName);
        if (node) node.status = "failed";

        this.config.onPluginError?.(error as Error, pluginName);
        throw new Error(
          `Failed to load plugin "${pluginName}": ${(error as Error).message}`,
        );
      }
    }

    this.isInitialized = true;
    this.logger?.debug("All plugins loaded successfully");
  }

  /**
   * Reload a specific plugin
   */
  async reload(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    await this.unregister(pluginName);
    await this.register(plugin as any);
  }

  // ============ PLUGIN EXECUTION ============

  /**
   * Execute a plugin action with full type safety and validation
   *
   * @param pluginName - Name of the plugin
   * @param actionName - Name of the action
   * @param args - Action arguments (validated against schema)
   * @param context - Application context
   * @returns Promise with execution result
   *
   * @example
   * ```typescript
   * const result = await pluginManager.executeAction(
   *   'auth-plugin',
   *   'validateToken',
   *   { token: 'jwt_abc123' },
   *   context
   * );
   * ```
   */
  async executeAction<TInput, TOutput>(
    pluginName: string,
    actionName: string,
    args: TInput,
    context: TContext,
  ): Promise<PluginExecutionResult<TOutput>> {
    const startTime = performance.now();
    let success = false;
    let data: TOutput | undefined;
    let error: Error | undefined;

    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin "${pluginName}" not found`);
      }

      const action = plugin.$actions[actionName];
      if (!action) {
        throw new Error(
          `Action "${actionName}" not found in plugin "${pluginName}"`,
        );
      }

      // Runtime input validation
      let validatedArgs: any = args;
      if (this.config.enableRuntimeValidation && action.input) {
        try {
          validatedArgs = this.validateSchema(
            action.input,
            args,
            `${pluginName}.${actionName} input`,
          );
        } catch (validationError) {
          throw new Error(
            `Input validation failed for ${pluginName}.${actionName}: ${(validationError as Error).message}`,
          );
        }
      }

      // Execute action with timeout
      data = (await this.executeWithTimeout(
        () => action.handler({ context, input: validatedArgs }),
        this.config.maxExecutionTime!,
        `${pluginName}.${actionName}`,
      )) as TOutput;

      success = true;

      this.logger?.debug(`Executed ${pluginName}.${actionName} successfully`);
    } catch (err) {
      error = err as Error;
      this.config.onPluginError?.(error, pluginName);

      this.logger?.error(
        `Failed to execute ${pluginName}.${actionName}:`,
        error.message,
      );
    } finally {
      const executionTime = performance.now() - startTime;

      // Update metrics
      if (this.config.enableMetrics) {
        const metrics = this.metrics.get(pluginName);
        if (metrics) {
          metrics.calls++;
          metrics.totalTime += executionTime;
          if (!success) metrics.errors++;
        }
      }

      return {
        success,
        data,
        error,
        executionTime,
        pluginName,
        actionName,
      };
    }
  }

  // ============ EVENT SYSTEM ============

  /**
   * Emit an event using StoreAdapter pub/sub system
   *
   * Events are published to Redis channels with pattern: `igniter:plugin:events:{eventName}`
   * Local event listeners are also executed for immediate response
   *
   * @param eventName - Name of the event
   * @param payload - Event payload (validated against listener schemas)
   * @param context - Application context
   *
   * @example
   * ```typescript
   * await pluginManager.emit('user:login', {
   *   userId: '123',
   *   timestamp: new Date(),
   *   ip: '192.168.1.1'
   * }, context);
   * ```
   */
  async emit<TPayload>(
    eventName: string,
    payload: TPayload,
    context: TContext,
  ): Promise<void> {
    try {
      // 1. Execute local listeners first (synchronous)
      const localListeners = this.eventBus.get(eventName) || [];

      if (localListeners.length > 0) {
        const localPromises = localListeners.map(async (listener) => {
          try {
            // Validate payload against listener schema
            let validatedPayload: any = payload;
            if (this.config.enableRuntimeValidation && listener.schema) {
              validatedPayload = this.validateSchema(
                listener.schema,
                payload,
                `${eventName} payload for ${listener.pluginName}`,
              );
            }

            // Execute listener with timeout
            await this.executeWithTimeout(
              () => listener.handler(validatedPayload, context),
              this.config.maxExecutionTime!,
              `Event listener ${listener.pluginName}.${eventName}`,
            );

            this.logger?.debug(
              `Local event ${eventName} handled by ${listener.pluginName}`,
            );
          } catch (error) {
            this.logger?.error(
              `Local event listener failed for ${eventName} in ${listener.pluginName}:`,
              error,
            );
            this.config.onPluginError?.(error as Error, listener.pluginName);
          }
        });

        await Promise.allSettled(localPromises);
      }

      // 2. Publish to Store (Redis) for distributed handling
      const eventChannel = `igniter:plugin:events:${eventName}`;
      const eventMessage = JSON.stringify({
        eventName,
        payload,
        timestamp: Date.now(),
        source: "plugin-manager",
      });

      await this.store.publish(eventChannel, eventMessage);

      this.logger?.debug(
        `Event ${eventName} published to channel: ${eventChannel}`,
      );
    } catch (error) {
      this.logger?.error(`Failed to emit event ${eventName}:`, error);
      throw error;
    }
  }

  // ============ PLUGIN QUERIES ============

  /**
   * Get a plugin with preserved types
   */
  /**
   * Get a plugin with preserved types
   *
   * @param name - Plugin name
   * @returns The plugin instance if found, otherwise undefined
   */
  getPlugin<TName extends string>(
    name: TName,
  ):
    | IgniterPlugin<
        TContext,
        TName,
        Record<string, any>,
        Record<string, any>,
        PluginActionsCollection<TContext>,
        Record<
          string,
          PluginControllerAction<
            TContext,
            PluginActionsCollection<TContext>,
            any,
            any,
            any,
            any
          >
        >,
        PluginEventListenersCollection<TContext>,
        PluginEventEmittersCollection
      >
    | undefined {
    return this.plugins.get(name) as
      | IgniterPlugin<
          TContext,
          TName,
          Record<string, any>,
          Record<string, any>,
          PluginActionsCollection<TContext>,
          Record<
            string,
            PluginControllerAction<
              TContext,
              PluginActionsCollection<TContext>,
              any,
              any,
              any,
              any
            >
          >,
          PluginEventListenersCollection<TContext>,
          PluginEventEmittersCollection
        >
      | undefined;
  }

  /**
   * Get all registered plugin names
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get plugin metrics
   */
  getMetrics(
    pluginName?: string,
  ): Record<
    string,
    { calls: number; totalTime: number; errors: number; avgTime: number }
  > {
    const result: Record<string, any> = {};

    const metricsToProcess = pluginName
      ? [[pluginName, this.metrics.get(pluginName)]]
      : Array.from(this.metrics.entries());

    for (const entry of metricsToProcess) {
      // entry can be [string, metrics] or [string, undefined]
      const [name, metrics] = entry as [
        string,
        { calls: number; totalTime: number; errors: number } | undefined,
      ];

      if (metrics) {
        result[name as string] = {
          ...metrics,
          avgTime: metrics.calls > 0 ? metrics.totalTime / metrics.calls : 0,
        };
      }
    }

    return result;
  }

  /**
   * Get dependency graph information
   */
  getDependencyGraph(): Map<string, PluginDependencyNode> {
    return new Map(this.dependencyGraph);
  }

  /**
   * Check if a plugin is loaded
   */
  isPluginLoaded(pluginName: string): boolean {
    const node = this.dependencyGraph.get(pluginName);
    return node?.status === "loaded";
  }

  // ============ PRIVATE METHODS ============

  private validatePluginDefinition(plugin: any): void {
    if (!plugin.name || typeof plugin.name !== "string") {
      throw new Error("Plugin must have a valid name");
    }

    if (!plugin.registration || !plugin.registration.version) {
      throw new Error(
        `Plugin "${plugin.name}" must have registration with version`,
      );
    }

    if (!plugin.dependencies) {
      throw new Error(
        `Plugin "${plugin.name}" must have dependencies configuration`,
      );
    }

    // Validate actions
    if (plugin.$actions) {
      for (const [actionName, action] of Object.entries(plugin.$actions)) {
        if (!action || typeof action !== "object") {
          throw new Error(
            `Invalid action "${actionName}" in plugin "${plugin.name}"`,
          );
        }

        // @ts-expect-error - action.handler is a function
        if (!action.handler || typeof action.handler !== "function") {
          throw new Error(
            `Action "${actionName}" in plugin "${plugin.name}" must have a handler function`,
          );
        }
      }
    }

    // Validate event listeners
    if (plugin.$events?.listens) {
      for (const [listenerName, listener] of Object.entries(
        plugin.$events.listens,
      )) {
        if (!listener || typeof listener !== "object") {
          throw new Error(
            `Invalid event listener "${listenerName}" in plugin "${plugin.name}"`,
          );
        }
        // @ts-expect-error - listener.handler is a function
        if (!listener.handler || typeof listener.handler !== "function") {
          throw new Error(
            `Event listener "${listenerName}" in plugin "${plugin.name}" must have a handler function`,
          );
        }
      }
    }
  }

  private checkPluginConflicts(plugin: any): void {
    // Check if plugin already exists
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    // Check for conflicts with existing plugins
    for (const existingPlugin of this.plugins.values()) {
      const conflicts = existingPlugin.dependencies.conflicts || [];
      if (conflicts.includes(plugin.name)) {
        throw new Error(
          `Plugin "${plugin.name}" conflicts with existing plugin "${existingPlugin.name}"`,
        );
      }

      const newConflicts = plugin.dependencies.conflicts || [];
      if (newConflicts.includes(existingPlugin.name)) {
        throw new Error(
          `Plugin "${plugin.name}" conflicts with existing plugin "${existingPlugin.name}"`,
        );
      }
    }
  }

  private buildDependencyGraph(plugin: any): void {
    const dependencies = plugin.dependencies.requires.map(
      (dep: any) => dep.name,
    );

    this.dependencyGraph.set(plugin.name, {
      name: plugin.name,
      dependencies,
      dependents: [],
      status: "pending",
    });

    // Update dependents
    for (const depName of dependencies) {
      const depNode = this.dependencyGraph.get(depName);
      if (depNode && !depNode.dependents.includes(plugin.name)) {
        depNode.dependents.push(plugin.name);
      }
    }
  }

  private registerEventListeners(plugin: any): void {
    if (!plugin.$events?.listens) return;

    for (const listener of Object.values(plugin.$events.listens)) {
      const typedListener = listener as any;
      if (!this.eventBus.has(typedListener.event)) {
        this.eventBus.set(typedListener.event, []);
      }

      this.eventBus.get(typedListener.event)!.push({
        handler: typedListener.handler,
        schema: typedListener.schema,
        pluginName: plugin.name,
      });
    }
  }

  private unregisterEventListeners(pluginName: string): void {
    for (const [eventName, listeners] of this.eventBus.entries()) {
      const filtered = listeners.filter(
        (listener) => listener.pluginName !== pluginName,
      );
      if (filtered.length === 0) {
        this.eventBus.delete(eventName);
      } else {
        this.eventBus.set(eventName, filtered);
      }
    }
  }

  private resolveDependencyOrder(): string[] {
    const resolved: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (pluginName: string) => {
      if (visiting.has(pluginName)) {
        throw new Error(
          `Circular dependency detected involving plugin "${pluginName}"`,
        );
      }
      if (visited.has(pluginName)) {
        return;
      }

      visiting.add(pluginName);

      const node = this.dependencyGraph.get(pluginName);
      if (node) {
        for (const depName of node.dependencies) {
          if (!this.plugins.has(depName)) {
            throw new Error(
              `Plugin "${pluginName}" requires "${depName}" but it's not registered`,
            );
          }
          visit(depName);
        }
      }

      visiting.delete(pluginName);
      visited.add(pluginName);
      resolved.push(pluginName);
    };

    for (const pluginName of this.plugins.keys()) {
      visit(pluginName);
    }

    return resolved;
  }

  private validateSchema(
    schema: StandardSchemaV1,
    data: unknown,
    context: string,
  ): unknown {
    try {
      // Assuming StandardSchemaV1 has a parse method (like Zod)
      if ("parse" in schema && typeof schema.parse === "function") {
        return schema.parse(data);
      }
      // Fallback for other schema types
      return data;
    } catch (error) {
      throw new Error(
        `Schema validation failed for ${context}: ${(error as Error).message}`,
      );
    }
  }

  // ============ PLUGIN PROXY & CONTEXT EXTENSION ============

  /**
   * Create a self-referencing proxy for a plugin
   * Allows plugin actions, controllers, and hooks to access their own actions
   */
  private createPluginProxy<TActions extends PluginActionsCollection<any>>(
    plugin: IgniterPlugin<any, any, any, any, any, any, any, any>,
  ): void {
    const proxy: PluginSelfContext<TContext, TActions> = {
      actions: {} as any,
      emit: async (eventName: string, payload: any) => {
        await this.emit(eventName, payload, {} as TContext);
      },
      context: {} as TContext, // Will be populated at runtime
    };

    // Create type-safe action proxies
    for (const [actionName, actionDefinition] of Object.entries(
      plugin.$actions,
    )) {
      type ActionDef = typeof actionDefinition;
      type Input =
        ActionDef extends PluginActionDefinition<any, infer TInput, any, any>
          ? TInput extends StandardSchemaV1<infer U, any>
            ? U
            : never
          : never;
      type Output =
        ActionDef extends PluginActionDefinition<any, any, infer TOutput, any>
          ? TOutput
          : never;

      // @ts-expect-error Assign a type-safe proxy function for each action
      proxy.actions[actionName as keyof TActions] = (async (
        args: Input,
      ): Promise<Output> => {
        const result = await this.executeAction(
          plugin.name,
          actionName,
          args,
          proxy.context,
        );
        return result.data as Output;
      }) as unknown as TActions[typeof actionName];
    }

    this.pluginProxies.set(
      plugin.name,
      proxy as PluginSelfContext<TContext, TActions>,
    );

    this.logger?.debug(`Created self-reference proxy for ${plugin.name}`);
  }

  /**
   * Get the self-reference proxy for a plugin (public API)
   * Used by RequestProcessor to inject into contexts
   */
  getPluginProxy(
    pluginName: string,
  ): PluginSelfContext<TContext, any> | undefined {
    return this.pluginProxies.get(pluginName);
  }

  /**
   * Get all plugin proxies for context injection
   * Used by RequestProcessor to create the plugins object in action context
   */
  getAllPluginProxies(): Record<string, PluginSelfContext<TContext, any>> {
    const result: Record<string, any> = {};
    for (const [name, proxy] of this.pluginProxies.entries()) {
      result[name] = proxy;
    }
    return result;
  }

  /**
   * Enrich context with plugin-provided extensions (internal use)
   * Called by ContextBuilder to merge plugin context extensions
   *
   * @internal
   */
  async enrichContext(baseContext: TContext): Promise<Partial<TContext>> {
    const contextExtensions: any = {};

    // Process each plugin's context extensions
    for (const [pluginName, plugin] of this.plugins.entries()) {
      try {
        if (plugin.hooks.extendContext) {
          const proxy = this.pluginProxies.get(pluginName);
          if (proxy) {
            // Update proxy context reference
            proxy.context = baseContext;

            // Get context extension from plugin
            const extension = await this.executeWithTimeout(
              () =>
                plugin.hooks.extendContext!(
                  baseContext,
                  proxy,
                  this.getAllPluginProxies(),
                ),
              this.config.maxExecutionTime!,
              `Plugin ${pluginName} context extension`,
            );

            if (extension && typeof extension === "object") {
              Object.assign(contextExtensions, extension);
            }
          }
        }
      } catch (error) {
        this.logger?.error(
          `Context extension failed for plugin ${pluginName}:`,
          error,
        );
        this.config.onPluginError?.(error as Error, pluginName);
      }
    }

    return contextExtensions;
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(`Operation "${operation}" timed out after ${timeoutMs}ms`),
        );
      }, timeoutMs);

      Promise.resolve(fn())
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
