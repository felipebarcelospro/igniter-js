import type { IgniterPlugin } from "../types/plugin.interface";
import type { HTTPMethod, IgniterAction, IgniterActionHandler, IgniterControllerBaseAction, IgniterControllerConfig, IgniterProcedure, InferEndpoint } from "../types";
import { createIgniterQuery, testAction } from "./action.service";
import type { StandardSchemaV1 } from "zod/dist/types/v3/standard-schema";

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

export const testController = createIgniterController({
  name: 'test',
  path: '/test',
  actions: {
    test: testAction
  }
})