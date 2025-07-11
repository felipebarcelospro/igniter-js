import type { IgniterControllerBaseAction, IgniterControllerConfig } from "../types";

/**
 * Creates a controller configuration for the Igniter Framework.
 * Controllers group related actions together and provide a common path prefix.
 * 
 * @template TControllerContext - The type of the controller context
 * @template TControllerActions - Record of actions belonging to this controller
 * 
 * @param config - The controller configuration object
 * @returns A configured controller object
 * 
 * @example
 * ```typescript
 * const userController = igniter.controller({
 *   path: 'users',
 *   actions: {
 *     list: igniter.query({
 *       path: '',
 *       handler: (ctx) => ctx.response.success({ users: [] })
 *     }),
 *     create: igniter.mutation({
 *       path: '',
 *       method: 'POST',
 *       body: userSchema,
 *       handler: (ctx) => ctx.response.created({ id: 1 })
 *     })
 *   }
 * });
 * ```
 */
export const createIgniterController = <
  TControllerActions extends Record<string, IgniterControllerBaseAction>
>(
  config: IgniterControllerConfig<TControllerActions>
) => {
  return config as IgniterControllerConfig<TControllerActions>;
};