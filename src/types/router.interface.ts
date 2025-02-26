import type { IgniterControllerConfig } from "./controller.interface";
import type { RequestProcessorInterface } from "./request.processor";

export type IgniterRouterConfig<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
> = {
  baseURL: string;
  basePATH: string;
  controllers: TControllers;
  context?: (request: Request) => TContext | Promise<TContext>;
}

export type IgniterRouter<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
> = {
  config: { baseURL: string; basePATH: string; }
  handler: (request: Request) => Promise<Response>;
  controllers: TControllers;
  processor: RequestProcessorInterface<IgniterRouterConfig<TContext, TControllers>>;
}