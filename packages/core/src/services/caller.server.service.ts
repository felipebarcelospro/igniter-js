import type { RequestProcessor } from "../processors";
import type { ContextCallback, DocsConfig, IgniterBaseConfig, IgniterControllerBaseAction, IgniterControllerConfig, IgniterRouter, InferServerRouterCaller, MutationActionCallerResult, QueryActionCallerResult, RealtimeActionCallerResult } from "../types";

/**
 * Creates a proxy-based caller for invoking actions via controller namespace (server-only).
 * Usage: caller.users.create({ ...input }) instead of caller('users', 'create', input)
 */
export function createServerCaller<
  TContext extends object | ContextCallback,
  TConfig extends IgniterBaseConfig,
  TPlugins extends Record<string, any>,
  TControllers extends Record<string, IgniterControllerConfig<any>>,
  TDocs extends DocsConfig
>(
  controllers: TControllers,
  processor: RequestProcessor<IgniterRouter<TContext, TControllers, TConfig, TPlugins, TDocs>>
): InferServerRouterCaller<IgniterRouter<TContext, TControllers, TConfig, TPlugins, TDocs>> {
  const caller = new Proxy({} as InferServerRouterCaller<IgniterRouter<TContext, TControllers, TConfig, TPlugins, TDocs>>, {
    get(_, controllerName: string) {
      const controller = controllers[controllerName as keyof TControllers];
      if (!controller) {
        throw new Error(`Controller "${controllerName}" not found in router.`);
      }
      return new Proxy({}, {
        get(_, actionName: string) {
          const action = controller.actions[actionName] as IgniterControllerBaseAction;
          if (!action) {
            throw new Error(`Action "${actionName}" not found in controller "${controllerName}".`);
          }

          if (action.method === 'GET') {
            return {
              type: 'query' as const,
              useRealtime: (...args: any[]) => ({} as RealtimeActionCallerResult<typeof action>),
              useQuery: (...args: any[]) => ({} as QueryActionCallerResult<typeof action>),
              query: async (input: typeof action['$Infer']['$Input'] & {
                headers?: Record<string, string> | undefined;
                cookies?: Record<string, string>;
                credentials?: RequestCredentials;
              }) => {
                if (!processor) {
                  throw new Error('Processor is required to call actions on server');
                }
                return processor.call(controllerName, actionName, input, {
                  headers: input?.headers,
                  cookies: input?.cookies,
                  credentials: input?.credentials,
                });
              }
            }
          }

          return {
            type: 'mutation' as const,
            useMutation: (...args: any[]) => ({} as MutationActionCallerResult<typeof action>),
            mutate: async (input: typeof action['$Infer']['$Input'] & {
              headers?: Record<string, string> | undefined;
              cookies?: Record<string, string>;
              credentials?: RequestCredentials;
            }) => {
              if (!processor) {
                throw new Error('Processor is required to call actions on server');
              }

              return processor.call(controllerName, actionName, input, {
                headers: input?.headers,
                cookies: input?.cookies,
                credentials: input?.credentials,
              });
            }
          }
        }
      });
    }
  });

  return caller;
}
