import type { RequestProcessor } from "../processors/request.processor";
import type { IgniterControllerConfig } from "./controller.interface";

export type IgniterRouterConfig<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
> = {
  baseURL?: string;
  basePath?: string;
  context?: (request: Request) => TContext | Promise<TContext>;
  controllers: TControllers;
}

export type IgniterRouter<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
> = {
  handler: (request: Request) => Promise<Response>;
  controllers: TControllers;
  processor: RequestProcessor<IgniterRouterConfig<TContext, TControllers>>;
}