import type { 
  IgniterProcedure, 
  IgniterProcedureContext,
  EnhancedProcedureBuilder,
  EnhancedProcedureBuilderWithName,
  EnhancedProcedureBuilderWithOptions,
  EnhancedProcedureBuilderWithNameAndOptions,
  EnhancedProcedureFactories,
  EnhancedProcedureHandler,
  EnhancedProcedureConfig,
  EnhancedProcedureContext
} from "../types";
import type { StandardSchemaV1 } from "../types/schema.interface";

// ============================================================================
// LEGACY API (MAINTAINED FOR BACKWARD COMPATIBILITY)
// ============================================================================

/**
 * Creates a reusable middleware procedure for the Igniter Framework.
 * Procedures can be used as middleware to modify context, validate requests,
 * or handle common operations across multiple actions.
 * 
 * **⚠️ LEGACY API**: This is the original procedure API. For better type safety 
 * and developer experience, consider using the new Builder API or Factory functions.
 * 
 * @template TActionContext - The type of the action context
 * @template TOptions - Configuration options type for the procedure
 * @template TOutput - The type of data returned by the procedure
 * 
 * @param Procedure - The procedure configuration and handler
 * @returns A factory function that creates configured procedures
 * 
 * @example
 * ```typescript
 * // Legacy API (still supported)
 * const authProcedure = createIgniterProcedure({
 *   name: 'auth',
 *   handler: async (options, ctx) => {
 *     const token = ctx.request.headers.get('authorization');
 *     if (!token) {
 *       return ctx.response.unauthorized();
 *     }
 *     const user = await verifyToken(token);
 *     return { user };
 *   }
 * });
 * 
 * // Use the procedure in an action
 * const protectedAction = createIgniterQuery({
 *   path: 'protected',
 *   use: [authProcedure()],
 *   handler: (ctx) => {
 *     // Access authenticated user from context
 *     const { user } = ctx.context;
 *     return ctx.response.success({ message: `Hello ${user.name}` });
 *   }
 * });
 * ```
 * 
 * @see {@link createEnhancedProcedureBuilder} For the new Builder API
 * @see {@link createEnhancedProcedureFactories} For the new Factory functions
 */
export const createIgniterProcedure = <
  TActionContext = object,
  TOptions = object,
  TOutput = object
>(Procedure: IgniterProcedure<TActionContext, TOptions, TOutput>) => (_options?: TOptions): IgniterProcedure<TActionContext, TOptions, TOutput> => {
  return {
    ...Procedure
  }
};

// ============================================================================
// NEW ENHANCED BUILDER API
// ============================================================================

/**
 * Creates an enhanced procedure builder with fluent API and full type safety.
 * This is the recommended way to create procedures in modern Igniter applications.
 * 
 * The builder pattern provides:
 * - **Type Safety**: Full TypeScript inference throughout the building process
 * - **Schema Integration**: Automatic validation and typing of options
 * - **Better DX**: Fluent API with intelligent autocomplete
 * - **Flexibility**: Optional naming, schema validation, and configuration
 * 
 * @template TActionContext - The application context type
 * @returns A builder instance for creating enhanced procedures
 * 
 * @example
 * ```typescript
 * // Basic procedure without options
 * const timestampProcedure = igniter.procedure()
 *   .name('timestamp')
 *   .handler(async ({ context }) => {
 *     context.logger.info('Timestamp procedure executed');
 *     return { timestamp: Date.now(), serverTime: new Date().toISOString() };
 *   });
 * 
 * // Advanced procedure with schema validation
 * const authProcedure = igniter.procedure()
 *   .name('authentication')
 *   .options(z.object({
 *     required: z.boolean().default(false),
 *     roles: z.array(z.string()).optional(),
 *     permissions: z.array(z.string()).optional(),
 *     allowServiceAccount: z.boolean().default(false)
 *   }))
 *   .handler(async ({ options, request, context, response }) => {
 *     const token = request.headers.get('authorization') || 
 *                   request.cookies.get('auth-token');
 * 
 *     // Handle missing token
 *     if (!token) {
 *       if (options.required) {
 *         return response.unauthorized('Authentication token required');
 *       }
 *       return { auth: { user: null, isAuthenticated: false } };
 *     }
 * 
 *     // Verify and decode token
 *     try {
 *       const payload = await verifyJWT(token, context.config.jwtSecret);
 *       const user = await context.db.user.findUnique({ 
 *         where: { id: payload.userId },
 *         include: { roles: true, permissions: true }
 *       });
 * 
 *       if (!user) {
 *         return response.unauthorized('Invalid token: user not found');
 *       }
 * 
 *       // Check role requirements
 *       if (options.roles?.length) {
 *         const userRoles = user.roles.map(r => r.name);
 *         const hasRequiredRole = options.roles.some(role => userRoles.includes(role));
 *         
 *         if (!hasRequiredRole) {
 *           return response.forbidden(`Required roles: ${options.roles.join(', ')}`);
 *         }
 *       }
 * 
 *       // Check permission requirements
 *       if (options.permissions?.length) {
 *         const userPermissions = user.permissions.map(p => p.name);
 *         const hasRequiredPermissions = options.permissions.every(
 *           permission => userPermissions.includes(permission)
 *         );
 * 
 *         if (!hasRequiredPermissions) {
 *           return response.forbidden(`Required permissions: ${options.permissions.join(', ')}`);
 *         }
 *       }
 * 
 *       return {
 *         auth: {
 *           user,
 *           isAuthenticated: true,
 *           hasRole: (role: string) => user.roles.some(r => r.name === role),
 *           hasPermission: (permission: string) => user.permissions.some(p => p.name === permission),
 *           requireRole: (role: string) => {
 *             if (!user.roles.some(r => r.name === role)) {
 *               throw new Error(`Role '${role}' required but not found`);
 *             }
 *           },
 *           requirePermission: (permission: string) => {
 *             if (!user.permissions.some(p => p.name === permission)) {
 *               throw new Error(`Permission '${permission}' required but not found`);
 *             }
 *           }
 *         }
 *       };
 *     } catch (error) {
 *       context.logger.warn('Authentication failed', { error: error.message });
 *       return response.unauthorized('Invalid or expired token');
 *     }
 *   });
 * 
 * // Usage in actions with full type safety
 * const adminAction = igniter.query({
 *   path: '/admin/users',
 *   use: [authProcedure({ required: true, roles: ['admin', 'super-admin'] })],
 *   handler: ({ context }) => {
 *     // context.auth is fully typed with all methods available
 *     context.auth.requireRole('admin'); // Type-safe method call
 *     
 *     const users = await context.db.user.findMany();
 *     return response.success({ 
 *       users, 
 *       requestedBy: context.auth.user.email,
 *       timestamp: context.timestamp 
 *     });
 *   }
 * });
 * ```
 * 
 * @see {@link EnhancedProcedureBuilder} For the builder interface documentation
 */
export function createEnhancedProcedureBuilder<TActionContext>(): EnhancedProcedureBuilder<TActionContext> {
  return {
    name<TName extends string>(name: TName): EnhancedProcedureBuilderWithName<TActionContext, TName> {
      return {
        options<TOptionsSchema extends StandardSchemaV1>(
          schema: TOptionsSchema
        ): EnhancedProcedureBuilderWithNameAndOptions<TActionContext, TName, TOptionsSchema> {
          return {
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
            > & { name: TName } {
              return {
                name,
                handler: (options: StandardSchemaV1.InferInput<TOptionsSchema>, ctx: IgniterProcedureContext<TActionContext>) => {
                  // Validate options using the schema
                  const validatedOptions = (schema as any).parse ? (schema as any).parse(options) : options;
                  
                  // Create enhanced context
                  const enhancedCtx: EnhancedProcedureContext<TActionContext, StandardSchemaV1.InferInput<TOptionsSchema>> = {
                    ...ctx,
                    options: validatedOptions
                  };
                  
                  return handler(enhancedCtx);
                }
              } as IgniterProcedure<TActionContext, StandardSchemaV1.InferInput<TOptionsSchema>, TOutput> & { name: TName };
            }
          };
        },

        handler<TOutput>(
          handler: EnhancedProcedureHandler<TActionContext, undefined, TOutput>
        ): IgniterProcedure<TActionContext, undefined, TOutput> & { name: TName } {
          return {
            name,
            handler: (_options: undefined, ctx: IgniterProcedureContext<TActionContext>) => {
              const enhancedCtx: EnhancedProcedureContext<TActionContext, undefined> = {
                ...ctx,
                options: undefined as undefined
              };
              
              return handler(enhancedCtx);
            }
          } as IgniterProcedure<TActionContext, undefined, TOutput> & { name: TName };
        }
      };
    },

    options<TOptionsSchema extends StandardSchemaV1>(
      schema: TOptionsSchema
    ): EnhancedProcedureBuilderWithOptions<TActionContext, TOptionsSchema> {
      return {
        name<TName extends string>(name: TName): EnhancedProcedureBuilderWithNameAndOptions<TActionContext, TName, TOptionsSchema> {
          return {
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
            > & { name: TName } {
              return {
                name,
                handler: (options: StandardSchemaV1.InferInput<TOptionsSchema>, ctx: IgniterProcedureContext<TActionContext>) => {
                  // Validate options using the schema
                  const validatedOptions = (schema as any).parse ? (schema as any).parse(options) : options;
                  
                  const enhancedCtx: EnhancedProcedureContext<TActionContext, StandardSchemaV1.InferInput<TOptionsSchema>> = {
                    ...ctx,
                    options: validatedOptions
                  };
                  
                  return handler(enhancedCtx);
                }
              } as IgniterProcedure<TActionContext, StandardSchemaV1.InferInput<TOptionsSchema>, TOutput> & { name: TName };
            }
          };
        },

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
        > {
          return {
            name: 'enhanced-procedure',
            handler: (options: StandardSchemaV1.InferInput<TOptionsSchema>, ctx: IgniterProcedureContext<TActionContext>) => {
              // Validate options using the schema
              const validatedOptions = (schema as any).parse ? (schema as any).parse(options) : options;
              
              const enhancedCtx: EnhancedProcedureContext<TActionContext, StandardSchemaV1.InferInput<TOptionsSchema>> = {
                ...ctx,
                options: validatedOptions
              };
              
              return handler(enhancedCtx);
            }
          };
        }
      };
    },

    handler<TOutput>(
      handler: EnhancedProcedureHandler<TActionContext, undefined, TOutput>
    ): IgniterProcedure<TActionContext, undefined, TOutput> {
      return {
        name: 'enhanced-procedure',
        handler: (_options: undefined, ctx: IgniterProcedureContext<TActionContext>) => {
          const enhancedCtx: EnhancedProcedureContext<TActionContext, undefined> = {
            ...ctx,
            options: undefined as undefined
          };
          
          return handler(enhancedCtx);
        }
      };
    }
  };
}

// ============================================================================
// ENHANCED FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates factory functions for enhanced procedures with different patterns.
 * These factories provide convenient shortcuts for common procedure patterns
 * while maintaining full type safety and the enhanced developer experience.
 * 
 * @template TActionContext - The application context type
 * @returns Object containing factory functions for different procedure patterns
 * 
 * @example
 * ```typescript
 * const factories = createEnhancedProcedureFactories<AppContext>();
 * 
 * // Simple procedure without options
 * const requestLogger = factories.simple(async ({ request, context }) => {
 *   const requestId = crypto.randomUUID();
 *   context.logger.info('Request received', { 
 *     requestId, 
 *     method: request.method, 
 *     path: request.path,
 *     userAgent: request.headers.get('user-agent'),
 *     timestamp: new Date().toISOString()
 *   });
 *   
 *   return { 
 *     requestId,
 *     timing: {
 *       start: performance.now(),
 *       end: () => {
 *         const duration = performance.now() - start;
 *         context.logger.info('Request completed', { requestId, duration });
 *         return duration;
 *       }
 *     }
 *   };
 * });
 * 
 * // Procedure with schema validation
 * const rateLimitProcedure = factories.withSchema({
 *   optionsSchema: z.object({
 *     max: z.number().min(1).max(10000).default(100),
 *     windowMs: z.number().min(1000).default(60000),
 *     message: z.string().optional(),
 *     skipSuccessfulRequests: z.boolean().default(false),
 *     skipFailedRequests: z.boolean().default(false),
 *     keyGenerator: z.function().args(z.any()).returns(z.string()).optional()
 *   }),
 *   handler: async ({ options, request, context, response }) => {
 *     // Generate unique key for rate limiting
 *     const defaultKey = `rate_limit:${getClientIP(request)}:${request.method}:${request.path}`;
 *     const key = options.keyGenerator ? options.keyGenerator(request) : defaultKey;
 *     
 *     // Get current request count
 *     const current = await context.store.increment(key, { 
 *       ttl: options.windowMs / 1000 
 *     });
 *     
 *     // Check if limit exceeded
 *     if (current > options.max) {
 *       const resetTime = new Date(Date.now() + options.windowMs);
 *       const errorMessage = options.message || 
 *         `Rate limit exceeded. Maximum ${options.max} requests per ${options.windowMs}ms.`;
 *       
 *       // Add rate limit headers
 *       response.setHeader('X-RateLimit-Limit', options.max.toString());
 *       response.setHeader('X-RateLimit-Remaining', '0');
 *       response.setHeader('X-RateLimit-Reset', resetTime.getTime().toString());
 *       
 *       return response.tooManyRequests(errorMessage);
 *     }
 *     
 *     return {
 *       rateLimit: {
 *         limit: options.max,
 *         current,
 *         remaining: options.max - current,
 *         resetTime: new Date(Date.now() + options.windowMs),
 *         isLimited: false
 *       }
 *     };
 *   }
 * });
 * ```
 * 
 * @see {@link EnhancedProcedureFactories} For the factory interface documentation
 */
export function createEnhancedProcedureFactories<TActionContext>(): EnhancedProcedureFactories<TActionContext> {
  return {
    simple<TOutput>(
      handler: EnhancedProcedureHandler<TActionContext, undefined, TOutput>
    ): IgniterProcedure<TActionContext, undefined, TOutput> {
      return {
        name: 'simple-procedure',
        handler: (_options: undefined, ctx: IgniterProcedureContext<TActionContext>) => {
          const enhancedCtx: EnhancedProcedureContext<TActionContext, undefined> = {
            ...ctx,
            options: undefined as undefined
          };
          
          return handler(enhancedCtx);
        }
      };
    },

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
    > {
      return {
        name: 'schema-procedure',
        handler: (options: StandardSchemaV1.InferInput<TOptionsSchema>, ctx: IgniterProcedureContext<TActionContext>) => {
          // Validate options using the schema
          const validatedOptions = (config.optionsSchema as any).parse ? (config.optionsSchema as any).parse(options) : options;
          
          const enhancedCtx: EnhancedProcedureContext<TActionContext, StandardSchemaV1.InferInput<TOptionsSchema>> = {
            ...ctx,
            options: validatedOptions
          };
          
          return config.handler(enhancedCtx);
        }
      };
    },

    fromConfig<TOptionsSchema extends StandardSchemaV1 | undefined, TOutput>(
      config: EnhancedProcedureConfig<TActionContext, TOptionsSchema, TOutput>
    ): IgniterProcedure<
      TActionContext,
      TOptionsSchema extends StandardSchemaV1 
        ? StandardSchemaV1.InferInput<TOptionsSchema>
        : undefined,
      TOutput
    > {
      return {
        name: config.name || 'config-procedure',
        handler: (
          options: TOptionsSchema extends StandardSchemaV1 
            ? StandardSchemaV1.InferInput<TOptionsSchema>
            : undefined, 
          ctx: IgniterProcedureContext<TActionContext>
        ) => {
          // Validate options using the schema
          const validatedOptions = (config.optionsSchema as any).parse ? (config.optionsSchema as any).parse(options) : options;
          
          const enhancedCtx: EnhancedProcedureContext<
            TActionContext, 
            TOptionsSchema extends StandardSchemaV1 
              ? StandardSchemaV1.InferInput<TOptionsSchema>
              : undefined
          > = {
            ...ctx,
            options: validatedOptions as any
          };
          
          return config.handler(enhancedCtx);
        }
      } as IgniterProcedure<
        TActionContext,
        TOptionsSchema extends StandardSchemaV1 
          ? StandardSchemaV1.InferInput<TOptionsSchema>
          : undefined,
        TOutput
      >;
    }
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Utility function to extract client IP address from request.
 * Handles various proxy configurations and headers commonly used in production.
 * 
 * @param request - The HTTP request object
 * @returns The client IP address as a string
 * 
 * @example
 * ```typescript
 * const rateLimitProcedure = igniter.procedure.withSchema({
 *   optionsSchema: z.object({ max: z.number() }),
 *   handler: async ({ options, request, context }) => {
 *     const clientIP = getClientIP(request);
 *     const key = `rate_limit:${clientIP}`;
 *     // ... rate limiting logic
 *   }
 * });
 * ```
 */
export function getClientIP(request: { headers: Headers }): string {
  // Check for common proxy headers in order of preference
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, get the first one
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIP = request.headers.get('x-real-ip');
  if (xRealIP) {
    return xRealIP.trim();
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  const xClientIP = request.headers.get('x-client-ip');
  if (xClientIP) {
    return xClientIP.trim();
  }

  // Fallback to unknown if no IP found
  return 'unknown';
}

/**
 * Utility function to safely parse and validate JWT tokens.
 * Provides a consistent interface for token verification across procedures.
 * 
 * @param token - The JWT token to verify
 * @param secret - The secret key used to sign the token
 * @returns Promise resolving to the decoded payload
 * @throws Error if token is invalid or expired
 * 
 * @example
 * ```typescript
 * const authProcedure = igniter.procedure()
 *   .handler(async ({ request, context }) => {
 *     const token = request.headers.get('authorization')?.replace('Bearer ', '');
 *     if (!token) return { auth: { user: null } };
 *     
 *     try {
 *       const payload = await verifyJWT(token, context.config.jwtSecret);
 *       const user = await context.db.user.findUnique({ where: { id: payload.userId } });
 *       return { auth: { user } };
 *     } catch (error) {
 *       return { auth: { user: null, error: error.message } };
 *     }
 *   });
 * ```
 */
export async function verifyJWT(token: string, secret: string): Promise<any> {
  // This is a placeholder implementation
  // In a real application, you would use a library like 'jsonwebtoken' or similar
  try {
    // For demo purposes, we'll assume the token is valid
    // Replace this with actual JWT verification logic
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error) {
    throw new Error(`Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Utility function to check if a user has any of the specified roles.
 * Useful for role-based access control in authentication procedures.
 * 
 * @param user - User object with roles array
 * @param requiredRoles - Array of role names to check against
 * @returns Boolean indicating if user has any of the required roles
 * 
 * @example
 * ```typescript
 * const authProcedure = igniter.procedure()
 *   .options(z.object({ roles: z.array(z.string()).optional() }))
 *   .handler(async ({ options, request, context }) => {
 *     const user = await getCurrentUser(request);
 *     
 *     if (options.roles && !hasAnyRole(user, options.roles)) {
 *       throw new Error('Insufficient permissions');
 *     }
 *     
 *     return { auth: { user } };
 *   });
 * ```
 */
export function hasAnyRole(user: { roles: Array<{ name: string }> }, requiredRoles: string[]): boolean {
  const userRoles = user.roles.map(role => role.name);
  return requiredRoles.some(role => userRoles.includes(role));
}

/**
 * Utility function to check if a user has all specified permissions.
 * Useful for permission-based access control in authentication procedures.
 * 
 * @param user - User object with permissions array
 * @param requiredPermissions - Array of permission names to check against
 * @returns Boolean indicating if user has all required permissions
 * 
 * @example
 * ```typescript
 * const authProcedure = igniter.procedure()
 *   .options(z.object({ permissions: z.array(z.string()).optional() }))
 *   .handler(async ({ options, request, context }) => {
 *     const user = await getCurrentUser(request);
 *     
 *     if (options.permissions && !hasAllPermissions(user, options.permissions)) {
 *       throw new Error('Missing required permissions');
 *     }
 *     
 *     return { auth: { user } };
 *   });
 * ```
 */
export function hasAllPermissions(user: { permissions: Array<{ name: string }> }, requiredPermissions: string[]): boolean {
  const userPermissions = user.permissions.map(permission => permission.name);
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}