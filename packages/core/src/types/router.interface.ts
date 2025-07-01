import type { IgniterControllerConfig } from "./controller.interface";
import type { IgniterBaseConfig } from "./builder.interface";
import type { ContextCallback } from "./context.interface";

export type IgniterRouterCaller<
  TControllers extends Record<string, IgniterControllerConfig<any>>, // ✅ Simplificado
> = {
  [C in keyof TControllers]: {
    [A in keyof TControllers[C]['actions']]: TControllers[C]['actions'][A]['$Infer']['$Caller']
  }
}

export type IgniterRouterConfig<
  TContext extends object | ContextCallback,
  TControllers extends Record<string, IgniterControllerConfig<any>>, // ✅ Simplificado
  TConfig extends IgniterBaseConfig,
  TPlugins extends Record<string, any>
> = {
  config: TConfig;
  controllers: TControllers;
  context: TContext;  
  plugins: TPlugins;
}

export type IgniterRouter<
  TContext extends object | ContextCallback,
  TControllers extends Record<string, IgniterControllerConfig<any>>, // ✅ Simplificado
  TConfig extends IgniterBaseConfig,
  TPlugins extends Record<string, any>
> = {
  config: TConfig,
  controllers: TControllers;
  handler: (request: Request) => Promise<Response>;
  $context: TContext;
  $plugins: TPlugins;
  $caller: IgniterRouterCaller<TControllers>;
}