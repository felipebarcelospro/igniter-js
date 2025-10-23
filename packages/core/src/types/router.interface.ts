import type { IgniterControllerConfig } from "./controller.interface";
import type { DocsConfig, IgniterBaseConfig } from "./builder.interface";
import type { ContextCallback } from "./context.interface";
import type { MutationActionCallerResult, QueryActionCallerResult } from "./client.interface";
import type { IgniterAction } from "./action.interface";
import type { Prettify } from "./utils.interface";

export type IgniterRouterCaller<
  TControllers extends Record<string, IgniterControllerConfig<any>>, // ✅ Simplificado
> = {
  [C in keyof TControllers]: {
    [A in keyof TControllers[C]['actions']]:
    TControllers[C]['actions'][A]['type'] extends 'query' ? {
      type: 'query';
      query: (input: any) => Promise<TControllers[C]['actions'][A]['$Infer']['$Response']>
    } : {
      type: 'mutation';
      useMutation: (...args: any[]) => MutationActionCallerResult<TControllers[C]['actions'][A]>
      mutation: (input: any) => Promise<TControllers[C]['actions'][A]['$Infer']['$Response']>
    }
  }
}

export type ServerExtraCallerInput = {
  headers?: Record<string, string> | undefined;
  cookies?: Record<string, string>;
  credentials?: RequestCredentials;
}

export type InferServerRouterCallerAction<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any, any>,
  TCaller = TAction['$Infer']['$Caller'],
  TCallerParams = TCaller extends (input: infer P) => any ? P : never,
  TCallerReturn = TCaller extends (input: any) => Promise<infer R> ? R : never
> = TAction extends { method: "GET" }
  ? {
      type: 'query';
      query: (input: TCallerParams) => Promise<TCallerReturn>;
    }
  : {
      type: 'mutation';
      mutate: (input: TCallerParams) => Promise<TCallerReturn>;
    };

export type InferServerRouterCaller<
  TRouter extends IgniterRouter<any, any, any, any, any>,
> =
  TRouter extends IgniterRouter<any, infer TControllers, any, any, any>
    ? {
        [TControllerName in keyof TControllers]: {
          [TActionName in keyof TControllers[TControllerName]["actions"]]: InferServerRouterCallerAction<
            TControllers[TControllerName]["actions"][TActionName]
          >;
        };
      }
    : never;

export type IgniterRouterConfig<
  TContext extends object | ContextCallback,
  TControllers extends Record<string, IgniterControllerConfig<any>>, // ✅ Simplificado
  TConfig extends IgniterBaseConfig,
  TPlugins extends Record<string, any>,
  TDocs extends DocsConfig
> = {
  config: TConfig;
  controllers: TControllers;
  context: TContext;  
  plugins: TPlugins;
  docs: TDocs;
}

export type IgniterRouter<
  TContext extends object | ContextCallback,
  TControllers extends Record<string, IgniterControllerConfig<any>>, // ✅ Simplificado
  TConfig extends IgniterBaseConfig,
  TPlugins extends Record<string, any>,
  TDocs extends DocsConfig,
> = {
  config: TConfig & { docs?: TDocs };
  controllers: TControllers;
  handler: (request: Request) => Promise<Response>;
  caller: InferServerRouterCaller<IgniterRouter<TContext, TControllers, TConfig, TPlugins, TDocs>>;
  $Infer: {
    $context: TContext;
    $plugins: TPlugins;
  }
}