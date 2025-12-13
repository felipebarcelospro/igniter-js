import type { RouterContext } from "rou3";
import type { IgniterAction } from "./action.interface";
import type { IgniterRouter } from "./router.interface";
import { DocsConfig } from "./builder.interface";
import type { IgniterLogger } from "./logger.interface";

export interface RequestProcessorConfig<
  TConfig extends IgniterRouter<any, any, any, any, any>,
> {
  baseURL?: TConfig["config"]["baseURL"];
  basePATH?: TConfig["config"]["basePATH"];
  controllers: TConfig["controllers"];
  context: TConfig["$Infer"]["$context"];
  plugins?: Record<string, any>;
  docs?: DocsConfig;
  logger?: IgniterLogger;
}

export interface RequestProcessorInterface<
  TRouter extends IgniterRouter<any, any, any, any, any>,
  TConfig extends RequestProcessorConfig<TRouter>,
> {
  router: RouterContext<
    IgniterAction<any, any, any, any, any, any, any, any, any, any>
  >;

  /**
   * Process an incoming HTTP request
   * @param request The incoming HTTP request
   */
  process(request: Request): Promise<Response>;

  /**
   * Make a direct call to a specific controller action
   */
  call<
    TControllerKey extends keyof TConfig["controllers"],
    TActionKey extends keyof TConfig["controllers"][TControllerKey]["actions"],
    TAction extends
      TConfig["controllers"][TControllerKey]["actions"][TActionKey],
  >(
    controllerKey: TControllerKey,
    actionKey: TActionKey,
    input: TAction["$Infer"]["$Input"] & {
      params?: Record<string, string | number>;
    },
  ): Promise<TAction["$Infer"]["$Output"]>;
}
