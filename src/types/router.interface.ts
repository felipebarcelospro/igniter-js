import type { IgniterControllerConfig } from "./controller.interface";
import type { RequestProcessorInterface } from "./request.processor";
import type { IgniterProcedure } from "./procedure.interface";
import type { SecurityConfig } from "../procedures/security";

export type IgniterRouterConfig<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
> = {
  baseURL?: string;
  basePATH?: string;
  controllers: TControllers;
  context?: (request: Request) => TContext | Promise<TContext>;
  /** Global security configuration */
  security?: SecurityConfig;
  /** Global middleware procedures */
  use?: IgniterProcedure<TContext, any, any>[];
}

export type IgniterRouter<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
> = {
  config: { baseURL?: string; basePATH?: string; }
  handler: (request: Request) => Promise<Response>;
  controllers: TControllers;
  processor: RequestProcessorInterface<any>;
}