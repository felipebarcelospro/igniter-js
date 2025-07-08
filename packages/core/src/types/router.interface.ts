import type { IgniterControllerConfig } from "./controller.interface";
import type { IgniterBaseConfig } from "./builder.interface";
import type { ContextCallback } from "./context.interface";
import type { MutationActionCallerResult, QueryActionCallerResult } from "./client.interface";

export type IgniterRouterCaller<
  TControllers extends Record<string, IgniterControllerConfig<any>>, // ✅ Simplificado
> = {
  [C in keyof TControllers]: {
    [A in keyof TControllers[C]['actions']]:
    TControllers[C]['actions'][A]['type'] extends 'query' ? {
      type: 'query';
      useQuery: (...args: any[]) => QueryActionCallerResult<TControllers[C]['actions'][A]>
      query: (input: any) => Promise<TControllers[C]['actions'][A]['$Infer']['$Response']>
    } : {
      type: 'mutation';
      useMutation: (...args: any[]) => MutationActionCallerResult<TControllers[C]['actions'][A]>
      mutation: (input: any) => Promise<TControllers[C]['actions'][A]['$Infer']['$Response']>
    }
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