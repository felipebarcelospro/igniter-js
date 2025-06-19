import { createIgniterProcedure } from "../../services/procedure.service";
import { IgniterError } from "../../error";
import type { AuthOptions } from "./types";

/**
 * Creates an authentication procedure for the Igniter Framework.
 * This procedure validates authentication tokens and adds user context.
 * 
 * @param options - Authentication configuration options
 * @returns A configured authentication procedure
 * 
 * @example
 * ```typescript
 * const auth = createAuthProcedure({
 *   strategy: 'jwt',
 *   secret: process.env.JWT_SECRET,
 *   required: true
 * });
 * 
 * const protectedAction = createIgniterQuery({
 *   path: '/protected',
 *   use: [auth()],
 *   handler: (ctx) => {
 *     // ctx.context.user is available
 *     return ctx.response.success({ user: ctx.context.user });
 *   }
 * });
 * ```
 */
export const createAuthProcedure = (options: AuthOptions = {}) =>
  createIgniterProcedure<any, AuthOptions, { user?: any }>({
    name: 'auth',
    handler: async (_, ctx) => {
      const authHeader = ctx.request.headers.get('authorization');
      
      if (!authHeader && options.required !== false) {
        throw new IgniterError({
          code: 'AUTH_MISSING_TOKEN',
          message: options.errorMessage || 'Authorization header is required'
        });
      }

      if (!authHeader) {
        return {}; // Optional auth, no token provided
      }

      let token = authHeader;
      
      // Extract token based on strategy
      if (options.strategy === 'bearer' || options.strategy === 'jwt') {
        if (!authHeader.startsWith('Bearer ')) {
          throw new IgniterError({
            code: 'AUTH_INVALID_FORMAT',
            message: 'Authorization header must start with "Bearer "'
          });
        }
        token = authHeader.substring(7);
      } else if (options.strategy === 'basic') {
        if (!authHeader.startsWith('Basic ')) {
          throw new IgniterError({
            code: 'AUTH_INVALID_FORMAT',
            message: 'Authorization header must start with "Basic "'
          });
        }
        token = authHeader.substring(6);
      }

      try {
        let user;
        
        if (options.validate) {
          // Custom validation function
          user = await options.validate(token);
        } else if (options.strategy === 'jwt' && options.secret) {
          // Basic JWT validation (you might want to use a proper JWT library)
          const payload = JSON.parse(atob(token.split('.')[1]));
          user = payload;
        } else {
          // Default: treat token as user identifier
          user = { token };
        }

        if (!user) {
          throw new IgniterError({
            code: 'AUTH_INVALID_TOKEN',
            message: options.errorMessage || 'Invalid authentication token'
          });
        }

        return { user };
      } catch (error) {
        if (error instanceof IgniterError) {
          throw error;
        }
        
        throw new IgniterError({
          code: 'AUTH_VALIDATION_FAILED',
          message: options.errorMessage || 'Token validation failed'
        });
      }
    }
  }); 