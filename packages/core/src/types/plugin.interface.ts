import type { ContextCallback, IgniterProcedure } from "../types";
import type { StandardSchemaV1 } from "../types/schema.interface";
import type {
  HTTPMethod,
  IgniterHeaders,
  IgniterCookies,
  InferParamPath,
} from "../types";
import { IgniterResponseProcessor } from "@/processors/response.processor";

// ============ SELF-REFERENTIAL PLUGIN ARCHITECTURE ============

// type helper for remove params if is never

/**
 * Self-referential plugin context - cada plugin tem acesso às suas próprias actions
 *
 * @template TContext - Application context type
 * @template TActions - Collection of plugin actions with their types
 *
 * @example
 * ```typescript
 * // Inside plugin controller handler
 * handler: async ({ self, context }) => {
 *   // ✅ Type-safe access to own actions
 *   const result = await self.actions.validateToken({ token: 'abc' });
 *
 *   // ✅ Type-safe event emission
 *   await self.emit('user:login', { userId: result.userId });
 * }
 * ```
 */
export type PluginSelfContext<
  TContext extends object | ContextCallback,
  TActions extends PluginActionsCollection<TContext>,
> = {
  /** Type-safe access to plugin's own actions */
  actions: {
    [K in keyof TActions]: TActions[K] extends {
      $Infer: {
        input: infer TInput;
        output: infer TOutput;
      };
    }
      ? TInput extends never
        ? () => Promise<TOutput>
        : (args: TInput) => Promise<TOutput>
      : never;
  };
  /** Type-safe event emission for plugin events */
  emit: <TPayload>(eventName: string, payload: TPayload) => Promise<void>;
  /** Reference to the current context */
  context: TContext;
};

/**
 * Plugin controller action with self-reference capabilities
 *
 * @template TContext - Application context type
 * @template TActions - Plugin actions collection
 * @template TPath - Route path with parameters
 * @template TMethod - HTTP method
 * @template TBody - Request body schema
 * @template TQuery - Query parameters schema
 */
export type PluginControllerAction<
  TContext extends object | ContextCallback,
  TActions extends PluginActionsCollection<TContext>,
  TPath extends string,
  TMethod extends HTTPMethod,
  TBody extends StandardSchemaV1 | undefined,
  TQuery extends StandardSchemaV1 | undefined,
> = {
  /** Route path (supports parameters like /users/:id) */
  path: TPath;
  /** HTTP method */
  method: TMethod;
  /** Request body schema (for POST, PUT, PATCH) */
  body?: TBody;
  /** Query parameters schema */
  query?: TQuery;
  /** Route handler with self-reference and full typing */
  handler: (params: {
    /** Parsed request data with full typing */
    request: {
      method: TMethod;
      path: TPath;
      params: InferParamPath<TPath>;
      headers: IgniterHeaders;
      cookies: IgniterCookies;
      body: TBody extends StandardSchemaV1
        ? StandardSchemaV1.InferInput<TBody>
        : undefined;
      query: TQuery extends StandardSchemaV1
        ? StandardSchemaV1.InferInput<TQuery>
        : undefined;
    };
    /** Application context */
    context: TContext;
    /** Self-reference for accessing plugin's own actions */
    self: PluginSelfContext<TContext, TActions>;
    /** Response processor for building responses */
    response: IgniterResponseProcessor<TContext>;
  }) => any | Promise<any>;
};

// ============ TYPE-SAFE PLUGIN ACTIONS WITH FACTORY ============

/**
 * Type-safe plugin action with schema validation
 */
export type PluginActionDefinition<
  TContext extends object | ContextCallback,
  TName extends string,
  TInput extends StandardSchemaV1,
  TOutput,
> = {
  name: TName;
  description: string;
  input: TInput;
  handler: (params: {
    context: TContext;
    input: StandardSchemaV1.InferInput<TInput>;
  }) => TOutput | Promise<TOutput>;
  $Infer: {
    input: TInput;
    output: TOutput;
  };
};

/**
 * Factory para criar plugin actions type-safe
 */
export function createIgniterPluginAction<
  TContext extends object | ContextCallback,
  TName extends string,
  TInput extends StandardSchemaV1,
  TOutput,
>(config: {
  name: TName;
  description: string;
  input: TInput;
  handler: (params: {
    context: TContext;
    input: StandardSchemaV1.InferInput<TInput>;
  }) => TOutput | Promise<TOutput>;
}): PluginActionDefinition<TContext, TName, TInput, TOutput> {
  return {
    name: config.name,
    description: config.description,
    input: config.input,
    handler: config.handler,
    $Infer: {} as {
      input: TInput;
      output: TOutput;
    },
  };
}

// ============ TYPE-SAFE EVENT LISTENERS WITH FACTORY ============

/**
 * Type-safe event listener with schema validation
 */
export type PluginEventListener<
  TContext extends object | ContextCallback,
  TPayload extends StandardSchemaV1,
  TEventName extends string = string,
> = {
  readonly event: TEventName;
  readonly schema: TPayload;
  readonly handler: (
    payload: StandardSchemaV1.InferInput<TPayload>,
    context: TContext,
  ) => void | Promise<void>;
  readonly $Infer: {
    event: TEventName;
    payload: StandardSchemaV1.InferInput<TPayload>;
  };
};

/**
 * Factory para criar event listeners type-safe
 */
export function createIgniterPluginEventListener<
  const TEventName extends string,
  TPayload extends StandardSchemaV1,
  TContext extends object | ContextCallback = any,
>(config: {
  event: TEventName;
  schema: TPayload;
  handler: (
    payload: StandardSchemaV1.InferInput<TPayload>,
    context: TContext,
  ) => void | Promise<void>;
}): PluginEventListener<TContext, TPayload, TEventName> {
  return Object.freeze({
    event: config.event,
    schema: config.schema,
    handler: config.handler,
    $Infer: {} as {
      event: TEventName;
      payload: StandardSchemaV1.InferInput<TPayload>;
    },
  });
}

// ============ TYPE-SAFE EVENT EMITTERS WITH FACTORY ============

/**
 * Type-safe event emitter definition
 */
export type PluginEventEmitter<
  TPayload extends StandardSchemaV1,
  TEventName extends string = string,
> = {
  readonly event: TEventName;
  readonly schema: TPayload;
  readonly $Infer: {
    event: TEventName;
    payload: StandardSchemaV1.InferInput<TPayload>;
  };
};

/**
 * Factory para criar event emitters type-safe
 */
export function createIgniterPluginEventEmitter<
  const TEventName extends string,
  TPayload extends StandardSchemaV1,
>(config: {
  event: TEventName;
  schema: TPayload;
}): PluginEventEmitter<TPayload, TEventName> {
  return Object.freeze({
    event: config.event,
    schema: config.schema,
    $Infer: {} as {
      event: TEventName;
      payload: StandardSchemaV1.InferInput<TPayload>;
    },
  });
}

// ============ HELPER TYPES FOR COLLECTIONS ============

/**
 * Collection of plugin actions
 */
export type PluginActionsCollection<TContext extends object | ContextCallback> =
  Record<string, PluginActionDefinition<TContext, any, any, any>>;

/**
 * Collection of event listeners
 */
export type PluginEventListenersCollection<
  TContext extends object | ContextCallback,
> = Record<string, PluginEventListener<TContext, any, any>>;

/**
 * Collection of event emitters
 */
export type PluginEventEmittersCollection = Record<
  string,
  PluginEventEmitter<any, any>
>;

// ============ TYPE-SAFE RESOURCE MANAGEMENT ============

/**
 * Strongly typed resource categories
 */
export type ResourceCategory =
  | "database"
  | "file"
  | "process"
  | "timer"
  | "network"
  | "cache";

/**
 * Type-safe resource definition
 */
export type PluginResource<
  TCategory extends ResourceCategory = ResourceCategory,
> = {
  category: TCategory;
  identifier: string;
  metadata?: Record<string, any>;
};

/**
 * Type-safe resource management
 */
export type PluginResourceManager<
  TContext extends object | ContextCallback,
> = {
  resources: PluginResource[];
  cleanup: (context: TContext) => void | Promise<void>;
};

// ============ TYPE-SAFE MIDDLEWARE SYSTEM ============

/**
 * Route pattern validation
 */
export type RoutePattern = `/${string}` | "*" | `${string}/*`;

/**
 * Type-safe middleware configuration
 */
export type PluginMiddlewareConfig<
  TContext extends object | ContextCallback,
> =
  {
    global?: IgniterProcedure<TContext, any, any>[];
    routes?: Record<RoutePattern, IgniterProcedure<TContext, any, any>[]>;
  };

// ============ TYPE-SAFE DEPENDENCY SYSTEM ============

/**
 * Plugin dependency status
 */
export type DependencyStatus = "required" | "optional" | "conflicts";

/**
 * Type-safe dependency definition
 */
export type PluginDependency = {
  name: string;
  version?: string;
  status: DependencyStatus;
};

/**
 * Type-safe dependency configuration
 */
export type PluginDependencies = {
  requires: PluginDependency[];
  provides: string[];
  conflicts: string[];
};

// ============ TYPE-SAFE LIFECYCLE HOOKS ============

/**
 * Plugin lifecycle phases
 */
export type PluginLifecyclePhase =
  | "init"
  | "beforeRequest"
  | "afterRequest"
  | "error"
  | "destroy";

/**
 * Type-safe lifecycle hook
 */
export type PluginLifecycleHook<
  TPhase extends PluginLifecyclePhase,
  TContext extends object | ContextCallback,
> = TPhase extends "init" | "destroy"
  ? (context: TContext) => void | Promise<void>
  : TPhase extends "beforeRequest"
    ? (context: TContext, request: Request) => void | Promise<void>
    : TPhase extends "afterRequest"
      ? (context: TContext, response: Response) => void | Promise<void>
      : TPhase extends "error"
        ? (context: TContext, error: Error) => void | Promise<void>
        : never;

/**
 * Type-safe lifecycle hooks configuration with self-reference support
 *
 * @template TContext - Application context type
 * @template TActions - Plugin actions collection for self-reference
 */
export type PluginLifecycleHooks<
  TContext extends object | ContextCallback,
  TActions extends PluginActionsCollection<TContext>,
> = {
  /** Initialize plugin (called when plugin is registered) */
  init?: (
    context: TContext,
    self: PluginSelfContext<TContext, TActions>,
  ) => void | Promise<void>;

  /** Called before each request */
  beforeRequest?: (
    context: TContext,
    request: Request,
    self: PluginSelfContext<TContext, TActions>,
  ) => void | Promise<void>;

  /** Called after each request */
  afterRequest?: (
    context: TContext,
    request: Request,
    response: Response,
    self: PluginSelfContext<TContext, TActions>,
  ) => void | Promise<void>;

  /** Called when an error occurs */
  error?: (
    context: TContext,
    error: Error,
    self: PluginSelfContext<TContext, TActions>,
  ) => void | Promise<void>;

  /** Cleanup plugin (called when plugin is unregistered) */
  destroy?: (
    context: TContext,
    self: PluginSelfContext<TContext, TActions>,
  ) => void | Promise<void>;

  /** OPTIONAL: Hook para estender o contexto globalmente (uso interno) */
  extendContext?: (
    ctx: TContext,
    self: PluginSelfContext<TContext, TActions>,
    plugins: Record<string, any>,
  ) => object | Promise<object>;
};

// ============ TYPE-SAFE PLUGIN REGISTRATION ============

/**
 * Semantic version pattern
 */
export type SemanticVersion = `${number}.${number}.${number}${string}`;

/**
 * Plugin registration metadata
 */
export type PluginRegistration = {
  readonly discoverable: boolean;
  readonly version: SemanticVersion;
  readonly requiresFramework: SemanticVersion;
  readonly category: ReadonlyArray<string>;
  readonly author: string;
  readonly repository?: string;
  readonly documentation?: string;
};

// ============ MAIN PLUGIN INTERFACE ============

/**
 * 100% Type-Safe Plugin Interface with Self-Reference Support
 *
 * @template TContext - Application context type
 * @template TName - Plugin name (unique identifier)
 * @template TMeta - Plugin metadata
 * @template TConfig - Plugin configuration
 * @template TControllers - Plugin controllers (can use self-actions)
 * @template TActions - Plugin actions collection
 * @template TEventListeners - Plugin event listeners
 * @template TEventEmitters - Plugin event emitters
 *
 * @example
 * ```typescript
 * const authPlugin = createIgniterPlugin({
 *   name: 'auth',
 *   $actions: {
 *     validateToken: createIgniterPluginAction({ ... }),
 *     createSession: createIgniterPluginAction({ ... })
 *   },
 *   $controllers: (actions) => ({
 *     login: {
 *       handler: async ({ self }) => {
 *         // ✅ Can use own actions!
 *         await self.actions.validateToken({ token });
 *       }
 *     }
 *   })
 * });
 * ```
 */
export type IgniterPlugin<
  TContext extends object | ContextCallback,
  TName extends string,
  TMeta extends Record<string, any>,
  TConfig extends Record<string, any>,
  TActions extends PluginActionsCollection<any>,
  TControllers extends Record<
  string,
  PluginControllerAction<TContext, TActions, any, any, any, any>
  >,
  TEventListeners extends PluginEventListenersCollection<any>,
  TEventEmitters extends PluginEventEmittersCollection,
> = {
  // ============ CORE PLUGIN IDENTITY ============
  name: TName;
  $meta: TMeta;
  $config: TConfig;

  // ============ TYPE-SAFE ACTIONS (can be used by controllers) ============
  $actions: TActions;

  // ============ SELF-REFERENTIAL CONTROLLERS ============
  $controllers: TControllers;

  // ============ TYPE-SAFE EVENTS (usando factories) ============
  $events: {
    emits: TEventEmitters;
    listens: TEventListeners;
  };

  // ============ REGISTRATION & DEPENDENCIES ============
  registration: PluginRegistration;
  dependencies: PluginDependencies;

  // ============ LIFECYCLE & MIDDLEWARE (with self-reference) ============
  hooks: PluginLifecycleHooks<TContext, TActions>;
  middleware: PluginMiddlewareConfig<TContext>;

  // ============ RESOURCE MANAGEMENT ============
  resources: PluginResourceManager<TContext>;
};

// ============ PLUGIN FACTORY ============
/**
 * Enhanced plugin factory with self-reference support and full type safety
 *
 * @template TContext - Application context type
 * @template TName - Plugin name
 * @template TMeta - Plugin metadata
 * @template TConfig - Plugin configuration
 * @template TActions - Plugin actions collection (inferred first)
 * @template TControllers - Plugin controllers with self-reference (depends on TActions)
 * @template TEventListeners - Plugin event listeners
 * @template TEventEmitters - Plugin event emitters
 *
 * @example
 * ```typescript
 * const authPlugin = createIgniterPlugin({
 *   name: 'auth',
 *   $actions: {
 *     validateToken: createIgniterPluginAction({
 *       name: 'validateToken',
 *       input: z.object({ token: z.string() }),
 *       handler: async ({ args }) => ({ userId: '123', valid: true })
 *     })
 *   },
 *   hooks: {
 *     init: async (context, self) => {
 *       // ✅ Can use own actions in lifecycle hooks
 *       console.log('Plugin initialized with actions:', Object.keys(self.actions));
 *     }
 *   }
 * });
 * ```
 */
export function createIgniterPlugin<
  TContext extends object | ContextCallback,
  TName extends string = string,
  TMeta extends Record<string, any> = Record<string, any>,
  TConfig extends Record<string, any> = Record<string, any>,
  TActions extends
    PluginActionsCollection<TContext> = PluginActionsCollection<TContext>,
  TEventListeners extends
    PluginEventListenersCollection<TContext> = PluginEventListenersCollection<TContext>,
  TEventEmitters extends
    PluginEventEmittersCollection = PluginEventEmittersCollection,
  TControllers extends Record<
    string,
    PluginControllerAction<TContext, TActions, any, any, any, any>
  > = Record<
    string,
    PluginControllerAction<TContext, TActions, any, any, any, any>
  >,
>(definition: {
  name: TName;
  $meta: TMeta;
  $config: TConfig;
  $actions: TActions;
  $controllers: TControllers;
  $events: {
    emits: TEventEmitters;
    listens: TEventListeners;
  };
  registration: PluginRegistration;
  dependencies: PluginDependencies;
  hooks?: PluginLifecycleHooks<TContext, TActions>;
  middleware: PluginMiddlewareConfig<TContext>;
  resources: PluginResourceManager<TContext>;
}): IgniterPlugin<
  TContext,
  TName,
  TMeta,
  TConfig,
  TActions,
  TControllers,
  TEventListeners,
  TEventEmitters
> {
  // Validate plugin structure at runtime
  if (!definition.name || typeof definition.name !== "string") {
    throw new Error("Plugin must have a valid name");
  }

  if (!definition.$actions || typeof definition.$actions !== "object") {
    throw new Error("Plugin must have actions collection");
  }

  // Runtime validation é feita no PluginManager
  return Object.freeze({
    ...definition,
    hooks: definition.hooks || {},
  }) as IgniterPlugin<
    TContext,
    TName,
    TMeta,
    TConfig,
    TActions,
    TControllers,
    TEventListeners,
    TEventEmitters
  >;
}

// ============ PLUGIN MANAGER INTERFACES ============

/**
 * Type-safe plugin registry
 */
export type PluginRegistry<TContext extends object | ContextCallback> = Map<
    string,
    IgniterPlugin<
      TContext,
      string,
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
>;

/**
 * Plugin event listener with schema
 */
export type PluginEventBusListener<TContext extends object | ContextCallback> =
  {
    handler: (payload: any, context: TContext) => void | Promise<void>;
    schema: StandardSchemaV1;
    pluginName: string;
  };

/**
 * Plugin dependency graph node
 */
export type PluginDependencyNode = {
  name: string;
  dependencies: string[];
  dependents: string[];
  status: "pending" | "loading" | "loaded" | "failed";
};

/**
 * Plugin execution result
 */
export type PluginExecutionResult<TOutput = any> = {
  success: boolean;
  data?: TOutput;
  error?: Error;
  executionTime: number;
  pluginName: string;
  actionName?: string;
};

/**
 * Plugin manager configuration
 */
export type PluginManagerConfig<TContext extends object | ContextCallback> = {
  enableRuntimeValidation?: boolean;
  enableMetrics?: boolean;
  maxExecutionTime?: number;
  enableDebugLogging?: boolean;
  onPluginError?: (
    error: Error,
    pluginName: string,
    actionName?: string,
    context?: TContext,
  ) => void;
  onPluginLoaded?: (pluginName: string) => void;
  onPluginUnloaded?: (pluginName: string) => void;
};

// ============ TYPE-SAFE HELPER TYPES ============

/**
 * Extract plugin configuration type
 */
export type InferPluginConfig<T> =
  T extends IgniterPlugin<
    infer TContext,
    infer TName,
    infer TMeta,
    infer TConfig,
    infer TControllers,
    infer TActions,
    infer TEventListeners,
    infer TEventEmitters
  >
    ? TConfig
    : never;

/**
 * Extract plugin actions type
 */
export type InferPluginActions<T> =
  T extends IgniterPlugin<any, any, any, any, any, infer TActions, any, any>
    ? TActions
    : never;

/**
 * Extract plugin event listeners type
 */
export type InferPluginEventListeners<T> =
  T extends IgniterPlugin<
    any,
    any,
    any,
    any,
    any,
    any,
    infer TEventListeners,
    any
  >
    ? TEventListeners
    : never;

/**
 * Extract plugin event emitters type
 */
export type InferPluginEventEmitters<T> =
  T extends IgniterPlugin<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    infer TEventEmitters
  >
    ? TEventEmitters
    : never;

/**
 * Extract plugin context type
 */
export type InferPluginContext<T> =
  T extends IgniterPlugin<infer TContext, any, any, any, any, any, any, any>
    ? TContext
    : never;

// ============ PLUGIN REGISTRY & INFERENCE HELPERS ============

/**
 * Infer plugin registry from plugins record
 *
 * @template TPlugins - Record of plugin name to plugin instance
 *
 * @example
 * ```typescript
 * type MyPlugins = { auth: AuthPlugin, email: EmailPlugin }
 * type Registry = InferPluginRegistry<MyPlugins>
 * // Result: { auth: PluginProxy<AuthPlugin>, email: PluginProxy<EmailPlugin> }
 * ```
 */
export type InferPluginRegistry<TContext extends object | ContextCallback, TPlugins extends Record<string, any>> = {
  [K in keyof TPlugins]: TPlugins[K] extends { $actions: infer TActions }
    ? PluginSelfContext<TContext, TActions extends PluginActionsCollection<TContext> ? TActions : never>
    : TPlugins[K];
};

/**
 * Infer context extensions from plugins
 *
 * @template TPlugins - Record of plugin name to plugin instance
 *
 * @example
 * ```typescript
 * type MyPlugins = { auth: AuthPlugin, audit: AuditPlugin }
 * type Extensions = InferPluginContextExtensions<MyPlugins>
 * // Result: { auth: AuthContext, audit: AuditContext }
 * ```
 */
export type InferPluginContextExtensions<TPlugins extends Record<string, any>> =
  {
    [K in keyof TPlugins]: TPlugins[K] extends IgniterPlugin<
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >
      ? TPlugins[K]["hooks"]["extendContext"] extends (
          ...args: any[]
        ) => infer TExtension
        ? TExtension extends Promise<infer U>
          ? U
          : TExtension
        : never
      : never;
  };

/**
 * Type-safe plugin access for action contexts
 * Infers the correct plugin types from the plugins registry
 *
 * @template TContext - Application context type that may contain plugins
 *
 * @example
 * ```typescript
 * // In action handler
 * handler: async (ctx) => {
 *   // ✅ Type-safe plugin access
 *   ctx.plugins.auth.actions.validateToken({ token: 'abc' });
 *   ctx.plugins.audit.emit('user:login', { userId: '123' });
 * }
 * ```
 */
export type InferIgniterPlugins<TPlugins extends Record<string, any>> =
  TPlugins extends Record<string, any> ? InferPluginRegistry<any,TPlugins> : never;
