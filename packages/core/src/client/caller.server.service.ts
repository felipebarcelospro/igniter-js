import type { RequestProcessor } from "../processors";
import type { ContextCallback, IgniterBaseConfig, IgniterControllerConfig, IgniterRouter, IgniterRouterCaller } from "../types";

/**
 * Creates a proxy-based caller for invoking actions via controller namespace (server-only).
 * Usage: caller.users.create({ ...input }) instead of caller('users', 'create', input)
 */
export function createServerCaller<
  TContext extends object | ContextCallback,
  TConfig extends IgniterBaseConfig,
  TPlugins extends Record<string, any>,
  TControllers extends Record<string, IgniterControllerConfig<any>>,
>(
  controllers: TControllers,
  processor: RequestProcessor<IgniterRouter<TContext, TControllers, TConfig, TPlugins>>
): IgniterRouterCaller<TControllers> {
  const caller = new Proxy({} as IgniterRouterCaller<TControllers>, {
    get(_, controllerName: string) {
      const controller = controllers[controllerName as keyof TControllers];
      if (!controller) {
        throw new Error(`Controller "${controllerName}" not found in router.`);
      }
      return new Proxy({}, {
        get(_, actionName: string) {
          const action = controller.actions[actionName];
          if (!action) {
            throw new Error(`Action "${actionName}" not found in controller "${controllerName}".`);
          }

          return (input: any) => {
            if (!processor) {
              throw new Error('Processor is required to call actions on server');
            }

            return processor.call(controllerName, actionName, input);
          }
        }
      });
    }
  });

  return caller;
}