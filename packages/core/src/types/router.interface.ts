import type { IgniterControllerConfig } from "./controller.interface";
import type { DocsConfig, IgniterBaseConfig } from "./builder.interface";
import type { ContextCallback } from "./context.interface";
import type { MutationActionCallerResult, QueryActionCallerResult } from "./client.interface";
import type { IgniterAction } from "./action.interface";
import type { Prettify } from "./utils.interface";
import type { IgniterServerOptions, IIgniterServerInstance } from "./server";
import type { IgniterProcedure } from "./procedure.interface";

/**
 * CORS configuration options.
 */
export interface IgniterCorsOptions {
  origins?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Rate limit configuration options.
 */
export interface IgniterRateLimitOptions {
  max?: number;
  windowSeconds?: number;
  keyGenerator?: (request: Request) => string;
  skip?: (request: Request) => boolean;
  onLimit?: (request: Request, info: any) => Response | Promise<Response>;
  store?: any;
}

/**
 * Lifecycle hook called before each request is processed.
 */
export type IgniterOnRequestHook = (request: Request) => void | Promise<void>;

/**
 * Lifecycle hook called after each response is generated.
 */
export type IgniterOnResponseHook = (response: Response, request: Request) => void | Promise<void>;

/**
 * Centralized error handler for all errors in the router.
 */
export type IgniterErrorHandler = (
  error: Error,
  context: any | null,
  request: Request,
) => Response | Promise<Response>;

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
  TControllers extends Record<string, IgniterControllerConfig<any>>,
  TConfig extends IgniterBaseConfig = IgniterBaseConfig,
  TPlugins extends Record<string, any> = Record<string, any>,
  TDocs extends DocsConfig = DocsConfig,
> = {
  config: TConfig & { docs?: TDocs };
  controllers: TControllers;
  handler: (request: Request) => Promise<Response>;
  caller: InferServerRouterCaller<IgniterRouter<TContext, TControllers, TConfig, TPlugins, TDocs>>;

  /**
   * Starts a standalone HTTP server for this router.
   *
   * Automatically detects the runtime (Bun, Deno, or Node.js) and uses
   * the optimal server adapter for maximum performance.
   *
   * @param options - Port number or server options
   * @returns A promise resolving to the server instance
   *
   * @example
   * ```typescript
   * // Simple port
   * await router.listen(3000);
   *
   * // With options
   * await router.listen({
   *   port: 3000,
   *   hostname: '0.0.0.0',
   *   onListen: ({ port, hostname }) => {
   *     console.log(`🚀 Server running at http://${hostname}:${port}`);
   *   },
   * });
   * ```
   */
  listen: (options?: IgniterServerOptions | number) => Promise<IIgniterServerInstance>;

  /**
   * Internal properties for framework use.
   */
  $builder?: {
    middlewares?: IgniterProcedure<any, any, any>[];
    errorHandler?: IgniterErrorHandler;
    healthCheck?: { path: string };
    cors?: IgniterCorsOptions;
    rateLimit?: IgniterRateLimitOptions;
    onRequest?: IgniterOnRequestHook;
    onResponse?: IgniterOnResponseHook;
  };

  $Infer: {
    $context: TContext;
    $plugins: TPlugins;
  }
}