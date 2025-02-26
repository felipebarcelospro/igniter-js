import type { IgniterProcedure, IgniterProcedureContext } from "../types";

/**
 * Creates a reusable middleware procedure for the Igniter Framework.
 * Procedures can be used as middleware to modify context, validate requests,
 * or handle common operations across multiple actions.
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
 * // Create an authentication procedure
 * const authProcedure = createIgniterProcedure({
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
 */
export const createIgniterProcedure = <
  TActionContext = unknown,
  TOptions = unknown,
  TOutput = unknown
>(Procedure: IgniterProcedure<TActionContext, TOptions, TOutput>) => (options?: TOptions): IgniterProcedure<TActionContext, TOptions, TOutput> => {
  return {
    ...Procedure,
    // @ts-expect-error - This is a hack to get around the circular dependency
    handler: (ctx: IgniterProcedureContext<TActionContext>) => Procedure.handler(options, ctx)
  }
};