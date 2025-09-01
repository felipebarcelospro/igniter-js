import type { HTTPMethod, IgniterCookies, IgniterHeaders } from "./action.interface";
import type { UnionToIntersection } from "./utils.interface";
import type { StandardSchemaV1 } from "./schema.interface";
import type { NextFunction } from "./next.interface";
import { IgniterResponseProcessor } from "@/processors";

/**
 * Represents the context for an Igniter procedure.
 * @template TActionContext - The type of the custom action context.
 *
 * @typedef {Object} IgniterProcedureContext
 * @property {Object} request - The HTTP request information.
 * @property {string} request.path - The request path.
 * @property {any} request.params - The route parameters.
 * @property {any} request.body - The request body data.
 * @property {any} request.query - The URL query parameters.
 * @property {HTTPMethod} request.method - The HTTP method used.
 * @property {IgniterHeaders} request.headers - The request headers.
 * @property {IgniterCookies} request.cookies - The request cookies.
 * @property {TActionContext} context - Custom context passed to the procedure.
 * @property {IgniterResponseProcessor} response - The response processor for handling the procedure output.
 *
 * @since 1.0.0
 */
export type IgniterProcedureContext<TActionContext> = {
  request: {
    path: string;
    params: any;
    body: any;
    query: any;
    method: HTTPMethod;
    headers: IgniterHeaders;
    cookies: IgniterCookies;
  }
  context: TActionContext;
  response: IgniterResponseProcessor<TActionContext>;
  /**
   * Next function for continuing to the next middleware/procedure
   * or handling errors and custom results
   */
  next: NextFunction;
}

/**
 * Represents a procedure in the Igniter framework.
 * @template TActionContext - The type of the action context.
 * @template TOptions - The type of options passed to the procedure handler.
 * @template TOutput - The type of output returned by the procedure handler.
 *
 * @property name - The name of the procedure.
 * @property handler - The function that handles the procedure execution.
 * Takes options and a procedure context as parameters and returns a promise
 * or direct value of type TOutput.
 */
export type IgniterProcedure<
  TActionContext,
  TOptions,
  TOutput
> = {
  name: string;
  handler: (options: TOptions, ctx: IgniterProcedureContext<TActionContext>) => Promise<TOutput> | TOutput;
}

// ============================================================================
// NEW ENHANCED PROCEDURE INTERFACES
// ============================================================================

/**
 * Enhanced procedure context that provides better type inference and DX.
 * This is used by the new Builder API and factory functions.
 *
 * @template TActionContext - The type of the custom action context
 * @template TOptions - The type of options (validated if schema provided)
 *
 * @example
 * ```typescript
 * // Basic usage
 * const loggerProcedure = igniter.procedure.simple(async (ctx) => {
 *   ctx.context.logger.info('Request received', { path: ctx.request.path });
 *   return { requestId: crypto.randomUUID() };
 * });
 *
 * // With typed options
 * const authProcedure = igniter.procedure()
 *   .options(z.object({ required: z.boolean() }))
 *   .handler(async ({ options, request, context }) => {
 *     // options is fully typed as { required: boolean }
 *     const token = request.headers.get('authorization');
 *     if (!token && options.required) {
 *       throw new Error('Authentication required');
 *     }
 *     return { auth: { user: await verifyToken(token) } };
 *   });
 * ```
 */
export type EnhancedProcedureContext<
  TActionContext,
  TOptions = undefined
> = {
  /** HTTP request information with full typing */
  request: {
    path: string;
    params: any;
    body: any;
    query: any;
    method: HTTPMethod;
    headers: IgniterHeaders;
    cookies: IgniterCookies;
  };
  /** Application context with injected services and data */
  context: TActionContext;
  /** Type-safe response processor for early returns */
  response: IgniterResponseProcessor<TActionContext>;
  /** Validated options (if schema provided) */
  options: TOptions;
  /**
   * Next function for continuing to the next middleware/procedure
   * or handling errors and custom results
   */
  next: NextFunction;
}

/**
 * Handler function signature for enhanced procedures.
 * Provides better ergonomics by destructuring commonly used properties.
 *
 * @template TActionContext - The application context type
 * @template TOptions - The options type (validated if schema provided)
 * @template TOutput - The return type of the procedure
 *
 * @example
 * ```typescript
 * const rateLimitHandler: EnhancedProcedureHandler<
 *   AppContext,
 *   { max: number; windowMs: number },
 *   { rateLimit: { remaining: number } }
 * > = async ({ options, request, context }) => {
 *   const key = `rate_limit:${getClientIP(request)}`;
 *   const current = await context.store.increment(key, { ttl: options.windowMs });
 *
 *   if (current > options.max) {
 *     throw new Error('Rate limit exceeded');
 *   }
 *
 *   return { rateLimit: { remaining: options.max - current } };
 * };
 * ```
 */
export type EnhancedProcedureHandler<
  TActionContext,
  TOptions = undefined,
  TOutput = unknown
> = (ctx: EnhancedProcedureContext<TActionContext, TOptions>) => Promise<TOutput> | TOutput;

/**
 * Configuration for building enhanced procedures with the Builder API.
 * Supports optional schema validation, custom naming, and enhanced type inference.
 *
 * @template TActionContext - The application context type
 * @template TOptionsSchema - The options validation schema (optional)
 * @template TOutput - The return type of the procedure
 *
 * @example
 * ```typescript
 * // Basic procedure without options
 * const timestampProcedure: EnhancedProcedureConfig<AppContext, undefined, { timestamp: number }> = {
 *   name: 'timestamp',
 *   handler: async () => ({ timestamp: Date.now() })
 * };
 *
 * // Procedure with schema validation
 * const cacheProcedure: EnhancedProcedureConfig<
 *   AppContext,
 *   z.ZodObject<{ key: z.ZodString; ttl: z.ZodOptional<z.ZodNumber> }>,
 *   { cache: CacheHelpers }
 * > = {
 *   name: 'cache',
 *   optionsSchema: z.object({
 *     key: z.string(),
 *     ttl: z.number().optional()
 *   }),
 *   handler: async ({ options, context }) => ({
 *     cache: createCacheHelpers(context.store, options.key, options.ttl)
 *   })
 * };
 * ```
 */
export type EnhancedProcedureConfig<
  TActionContext,
  TOptionsSchema extends StandardSchemaV1 | undefined = undefined,
  TOutput = unknown
> = {
  /**
   * Human-readable name for the procedure (used in debugging and introspection)
   * @example 'auth', 'rateLimit', 'validateInput'
   */
  name?: string;

  /**
   * Optional schema for validating procedure options.
   * If provided, options will be validated and typed automatically.
   * @example z.object({ required: z.boolean(), roles: z.array(z.string()) })
   */
  optionsSchema?: TOptionsSchema;

  /**
   * The procedure handler function.
   * Receives enhanced context with destructured properties for better DX.
   */
  handler: EnhancedProcedureHandler<
    TActionContext,
    TOptionsSchema extends StandardSchemaV1
      ? StandardSchemaV1.InferInput<TOptionsSchema>
      : undefined,
    TOutput
  >;
}

/**
 * Builder interface for creating enhanced procedures with fluent API.
 * Provides step-by-step configuration with full type safety and inference.
 *
 * @template TActionContext - The application context type
 *
 * @example
 * ```typescript
 * // Step-by-step building
 * const authProcedure = igniter.procedure()
 *   .name('authentication')
 *   .options(z.object({
 *     required: z.boolean().default(false),
 *     roles: z.array(z.string()).optional()
 *   }))
 *   .handler(async ({ options, request, context }) => {
 *     // Full type safety with inferred option types
 *     const token = request.headers.get('authorization');
 *
 *     if (!token && options.required) {
 *       throw new Error('Authentication required');
 *     }
 *
 *     const user = token ? await verifyToken(token) : null;
 *
 *     if (options.roles && user && !hasAnyRole(user, options.roles)) {
 *       throw new Error('Insufficient permissions');
 *     }
 *
 *     return {
 *       auth: {
 *         user,
 *         hasRole: (role: string) => user?.roles.includes(role) ?? false,
 *         requireRole: (role: string) => {
 *           if (!user?.roles.includes(role)) {
 *             throw new Error(`Role '${role}' required`);
 *           }
 *         }
 *       }
 *     };
 *   });
 * ```
 */
export interface EnhancedProcedureBuilder<TActionContext> {
  /**
   * Set a human-readable name for the procedure.
   * Useful for debugging, introspection, and error messages.
   *
   * @param name - The procedure name
   * @returns Builder with name configured
   *
   * @example
   * ```typescript
   * const procedure = igniter.procedure()
   *   .name('user-authentication')
   *   .handler(async (ctx) => { ... });
   * ```
   */
  name<TName extends string>(
    name: TName
  ): EnhancedProcedureBuilderWithName<TActionContext, TName>;

  /**
   * Configure options schema for validation and type inference.
   * The schema will be used to validate options at runtime and provide
   * full TypeScript inference in the handler.
   *
   * @param schema - Zod or compatible schema for options validation
   * @returns Builder with options schema configured
   *
   * @example
   * ```typescript
   * const procedure = igniter.procedure()
   *   .options(z.object({
   *     maxRetries: z.number().min(0).max(10).default(3),
   *     timeout: z.number().positive().optional(),
   *     skipCache: z.boolean().default(false)
   *   }))
   *   .handler(async ({ options }) => {
   *     // options is fully typed: { maxRetries: number; timeout?: number; skipCache: boolean }
   *     console.log(`Retries: ${options.maxRetries}, Timeout: ${options.timeout}`);
   *   });
   * ```
   */
  options<TOptionsSchema extends StandardSchemaV1>(
    schema: TOptionsSchema
  ): EnhancedProcedureBuilderWithOptions<TActionContext, TOptionsSchema>;

  /**
   * Define the procedure handler with enhanced context.
   * This is the final step in the builder chain.
   *
   * @param handler - The procedure implementation
   * @returns Configured procedure ready for use
   *
   * @example
   * ```typescript
   * const loggerProcedure = igniter.procedure()
   *   .handler(async ({ request, context }) => {
   *     const requestId = crypto.randomUUID();
   *     context.logger.info('Request started', {
   *       requestId,
   *       method: request.method,
   *       path: request.path
   *     });
   *     return { requestId };
   *   });
   * ```
   */
  handler<TOutput>(
    handler: EnhancedProcedureHandler<TActionContext, undefined, TOutput>
  ): IgniterProcedure<TActionContext, undefined, TOutput>;
}

/**
 * Builder interface after name has been configured.
 * Provides the same options as the base builder but preserves the name type.
 */
export interface EnhancedProcedureBuilderWithName<TActionContext, TName extends string> {
  /**
   * Configure options schema for validation and type inference.
   *
   * @param schema - Zod or compatible schema for options validation
   * @returns Builder with both name and options configured
   */
  options<TOptionsSchema extends StandardSchemaV1>(
    schema: TOptionsSchema
  ): EnhancedProcedureBuilderWithNameAndOptions<TActionContext, TName, TOptionsSchema>;

  /**
   * Define the procedure handler (final step).
   *
   * @param handler - The procedure implementation
   * @returns Configured procedure with name
   */
  handler<TOutput>(
    handler: EnhancedProcedureHandler<TActionContext, undefined, TOutput>
  ): IgniterProcedure<TActionContext, undefined, TOutput> & { name: TName };
}

/**
 * Builder interface after options schema has been configured.
 * The handler will receive validated and typed options.
 */
export interface EnhancedProcedureBuilderWithOptions<TActionContext, TOptionsSchema extends StandardSchemaV1> {
  /**
   * Set a human-readable name for the procedure.
   *
   * @param name - The procedure name
   * @returns Builder with both options and name configured
   */
  name<TName extends string>(
    name: TName
  ): EnhancedProcedureBuilderWithNameAndOptions<TActionContext, TName, TOptionsSchema>;

  /**
   * Define the procedure handler with typed options (final step).
   *
   * @param handler - The procedure implementation with typed options
   * @returns Configured procedure with options validation
   */
  handler<TOutput>(
    handler: EnhancedProcedureHandler<
      TActionContext,
      StandardSchemaV1.InferInput<TOptionsSchema>,
      TOutput
    >
  ): IgniterProcedure<
    TActionContext,
    StandardSchemaV1.InferInput<TOptionsSchema>,
    TOutput
  >;
}

/**
 * Builder interface with both name and options configured.
 * This is the most complete builder state before the handler.
 */
export interface EnhancedProcedureBuilderWithNameAndOptions<
  TActionContext,
  TName extends string,
  TOptionsSchema extends StandardSchemaV1
> {
  /**
   * Define the procedure handler with typed options (final step).
   *
   * @param handler - The procedure implementation with typed options
   * @returns Configured procedure with name and options validation
   */
  handler<TOutput>(
    handler: EnhancedProcedureHandler<
      TActionContext,
      StandardSchemaV1.InferInput<TOptionsSchema>,
      TOutput
    >
  ): IgniterProcedure<
    TActionContext,
    StandardSchemaV1.InferInput<TOptionsSchema>,
    TOutput
  > & { name: TName };
}

/**
 * Factory functions for creating procedures with different patterns.
 * Provides shortcuts for common use cases while maintaining full type safety.
 *
 * @template TActionContext - The application context type
 *
 * @example
 * ```typescript
 * // Simple procedure without options
 * const timestamp = factories.simple(async ({ context }) => {
 *   context.logger.info('Timestamp requested');
 *   return { timestamp: Date.now() };
 * });
 *
 * // Procedure with schema validation
 * const cache = factories.withSchema({
 *   optionsSchema: z.object({ key: z.string(), ttl: z.number().optional() }),
 *   handler: async ({ options, context }) => ({
 *     get: () => context.store.get(options.key),
 *     set: (value: any) => context.store.set(options.key, value, { ttl: options.ttl })
 *   })
 * });
 *
 * // Procedure from configuration object
 * const rateLimit = factories.fromConfig({
 *   name: 'rate-limiter',
 *   optionsSchema: z.object({
 *     max: z.number().min(1).max(1000).default(100),
 *     windowMs: z.number().min(1000).default(60000),
 *     message: z.string().optional(),
 *     keyGenerator: z.function().args(z.any()).returns(z.string()).optional()
 *   }),
 *   handler: async ({ options, request, context, response }) => {
 *     // Generate rate limit key
 *     const key = options.keyGenerator
 *       ? options.keyGenerator(request)
 *       : `rate_limit:${getClientIP(request)}`;
 *
 *     // Check current usage
 *     const current = await context.store.increment(key, {
 *       ttl: options.windowMs
 *     });
 *
 *     // Enforce limit
 *     if (current > options.max) {
 *       return response.tooManyRequests(
 *         options.message || `Rate limit exceeded. Max ${options.max} requests per ${options.windowMs}ms.`
 *       );
 *     }
 *
 *     return {
 *       rateLimit: {
 *         current,
 *         max: options.max,
 *         remaining: options.max - current,
 *         resetTime: new Date(Date.now() + options.windowMs)
 *       }
 *     };
 *   }
 * });
 *
 * // Usage with custom configuration
 * const apiEndpoint = igniter.query({
 *   use: [rateLimitProcedure({
 *     max: 50,
 *     windowMs: 30000,
 *     keyGenerator: (req) => `api:${getUserId(req)}:endpoint`
 *   })],
 *   handler: ({ context }) => {
 *     // context.rateLimit provides usage info
 *     const { remaining, resetTime } = context.rateLimit;
 *     return response.success({ data: 'API response', meta: { remaining, resetTime } });
 *   }
 * });
 * ```
 */
export interface EnhancedProcedureFactories<TActionContext> {
  /**
   * Create a simple procedure without options or complex configuration.
   * Perfect for basic middleware like request logging, timestamp injection, etc.
   *
   * @param handler - Simple handler function without options
   * @returns Configured procedure
   *
   * @example
   * ```typescript
   * const requestLogger = igniter.procedure.simple(async ({ request, context }) => {
   *   const start = performance.now();
   *   context.logger.info('Request started', {
   *     method: request.method,
   *     path: request.path,
   *     userAgent: request.headers.get('user-agent')
   *   });
   *
   *   return {
   *     timing: {
   *       start,
   *       logDuration: () => {
   *         const duration = performance.now() - start;
   *         context.logger.info('Request completed', { duration });
   *       }
   *     }
   *   };
   * });
   *
   * // Usage in actions
   * const getUser = igniter.query({
   *   path: '/users/:id',
   *   use: [requestLogger()],
   *   handler: ({ context }) => {
   *     // context.timing is available
   *     const user = getUserById(params.id);
   *     context.timing.logDuration();
   *     return response.success(user);
   *   }
   * });
   * ```
   */
  simple<TOutput>(
    handler: EnhancedProcedureHandler<TActionContext, undefined, TOutput>
  ): IgniterProcedure<TActionContext, undefined, TOutput>;

  /**
   * Create a procedure with schema validation for options.
   * Provides automatic validation and type inference for procedure options.
   *
   * @param config - Configuration with schema and handler
   * @returns Configured procedure with validation
   *
   * @example
   * ```typescript
   * const authProcedure = igniter.procedure.withSchema({
   *   optionsSchema: z.object({
   *     required: z.boolean().default(false),
   *     roles: z.array(z.string()).optional(),
   *     allowGuest: z.boolean().default(true)
   *   }),
   *   handler: async ({ options, request, context, response }) => {
   *     const token = request.headers.get('authorization');
   *
   *     // Handle guest access
   *     if (!token && options.allowGuest && !options.required) {
   *       return { auth: { user: null, isGuest: true } };
   *     }
   *
   *     // Require authentication
   *     if (!token && options.required) {
   *       return response.unauthorized('Authentication required');
   *     }
   *
   *     const user = await verifyToken(token);
   *
   *     // Check role requirements
   *     if (options.roles && !options.roles.some(role => user.roles.includes(role))) {
   *       return response.forbidden('Insufficient permissions');
   *     }
   *
   *     return {
   *       auth: {
   *         user,
   *         isGuest: false,
   *         hasRole: (role: string) => user.roles.includes(role)
   *       }
   *     };
   *   }
   * });
   *
   * // Usage with typed options
   * const adminAction = igniter.query({
   *   use: [authProcedure({ required: true, roles: ['admin'] })],
   *   handler: ({ context }) => {
   *     // context.auth is fully typed
   *     if (context.auth.hasRole('super-admin')) {
   *       // Super admin specific logic
   *     }
   *   }
   * });
   * ```
   */
  withSchema<TOptionsSchema extends StandardSchemaV1, TOutput>(
    config: {
      optionsSchema: TOptionsSchema;
      handler: EnhancedProcedureHandler<
        TActionContext,
        StandardSchemaV1.InferInput<TOptionsSchema>,
        TOutput
      >;
    }
  ): IgniterProcedure<
    TActionContext,
    StandardSchemaV1.InferInput<TOptionsSchema>,
    TOutput
  >;

  /**
   * Create a procedure from a complete configuration object.
   * Most flexible option supporting all features: naming, schema validation, etc.
   *
   * @param config - Complete procedure configuration
   * @returns Configured procedure
   *
   * @example
   * ```typescript
   * const rateLimitProcedure = igniter.procedure.fromConfig({
   *   name: 'rate-limiter',
   *   optionsSchema: z.object({
   *     max: z.number().min(1).max(1000).default(100),
   *     windowMs: z.number().min(1000).default(60000),
   *     message: z.string().optional(),
   *     keyGenerator: z.function().args(z.any()).returns(z.string()).optional()
   *   }),
   *   handler: async ({ options, request, context, response }) => {
   *     // Generate rate limit key
   *     const key = options.keyGenerator
   *       ? options.keyGenerator(request)
   *       : `rate_limit:${getClientIP(request)}`;
   *
   *     // Check current usage
   *     const current = await context.store.increment(key, {
   *       ttl: options.windowMs
   *     });
   *
   *     // Enforce limit
   *     if (current > options.max) {
   *       return response.tooManyRequests(
   *         options.message || `Rate limit exceeded. Max ${options.max} requests per ${options.windowMs}ms.`
   *       );
   *     }
   *
   *     return {
   *       rateLimit: {
   *         current,
   *         max: options.max,
   *         remaining: options.max - current,
   *         resetTime: new Date(Date.now() + options.windowMs)
   *       }
   *     };
   *   }
   * });
   *
   * // Usage with custom configuration
   * const apiEndpoint = igniter.query({
   *   use: [rateLimitProcedure({
   *     max: 50,
   *     windowMs: 30000,
   *     keyGenerator: (req) => `api:${getUserId(req)}:endpoint`
   *   })],
   *   handler: ({ context }) => {
   *     // context.rateLimit provides usage info
   *     const { remaining, resetTime } = context.rateLimit;
   *     return response.success({ data: 'API response', meta: { remaining, resetTime } });
   *   }
   * });
   * ```
   */
  fromConfig<TOptionsSchema extends StandardSchemaV1 | undefined, TOutput>(
    config: EnhancedProcedureConfig<TActionContext, TOptionsSchema, TOutput>
  ): IgniterProcedure<
    TActionContext,
    TOptionsSchema extends StandardSchemaV1
      ? StandardSchemaV1.InferInput<TOptionsSchema>
      : undefined,
    TOutput
  >;
}

// ============================================================================
// LEGACY COMPATIBILITY TYPES (DO NOT MODIFY)
// ============================================================================

/**
 * Extracts the output type from a single procedure.
 */
type ExtractProcedureOutput<T> = T extends IgniterProcedure<any, any, infer TOutput> ? TOutput : never;

/**
 * Infers the procedure context type from an array of IgniterProcedure instances.
 *
 * @typeParam TActionProcedures - An array of IgniterProcedure instances with generic types for input, output, and context
 * @returns A union-to-intersection type of the output types of all procedures
 *
 * @example
 * ```typescript
 * type Procedures = [
 *   IgniterProcedure<any, any, { user: User }>,
 *   IgniterProcedure<any, any, { requestId: string }>
 * ]
 * type Context = InferProcedureContext<Procedures> // { user: User } & { requestId: string }
 * ```
 */
export type InferProcedureContext<TActionProcedures extends readonly IgniterProcedure<any, any, any>[]> =
  TActionProcedures extends readonly []
    ? {}
    : UnionToIntersection<
        TActionProcedures extends readonly (infer TProcedure)[]
          ? TProcedure extends IgniterProcedure<any, any, infer TOutput>
            ? TOutput extends Promise<infer TResolved>
              ? TResolved
              : TOutput
            : never
          : never
      >;

/**
 * Infers the context type from an array of IgniterProcedure instances.
 */
export type InferActionProcedureContext<TActionProcedures extends readonly IgniterProcedure<any, any, any>[]> =
TActionProcedures extends readonly []
  ? {}
  : UnionToIntersection<
      TActionProcedures extends readonly (infer TProcedure)[]
        ? TProcedure extends IgniterProcedure<any, any, infer TOutput>
          ? TOutput extends Promise<infer TResolved>
            ? TResolved
            : TOutput
          : never
        : never
    >;
