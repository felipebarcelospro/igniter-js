import type { IgniterControllerConfig } from "./controller.interface";
import type { RequestProcessorInterface } from "./request.processor";
import type { IgniterProcedure } from "./procedure.interface";
import type { SecurityConfig } from "../procedures/security";
import type { IgniterStoreAdapter } from "./store.interface";
import type { IgniterLogger } from "./logger.interface";

// Schema types - clean version without server logic
export type IgniterRouterSchema<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>
> = {
  config: { 
    baseURL?: string; 
    basePATH?: string; 
  };
  controllers: {
    [K in keyof TControllers]: {
      name: string;
      path: string;
      actions: {
        [A in keyof TControllers[K]['actions']]: {
          path: string;
          method: string;
          description?: string;
          $Infer: TControllers[K]['actions'][A]['$Infer'];
          // Explicitly NO: handler, use, $Caller
        }
      }
    }
  };
  // Explicitly NO: processor, handler, context functions
};

export type IgniterRouterConfig<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>,
  TStore extends IgniterStoreAdapter = IgniterStoreAdapter,
  TLogger extends IgniterLogger = IgniterLogger
> = {
  baseURL?: string;
  basePATH?: string;
  controllers: TControllers;
  context?: (request: Request) => TContext | Promise<TContext>;
  /** Global security configuration */
  security?: SecurityConfig;
  /** Global middleware procedures */
  use?: IgniterProcedure<TContext, any, any>[];
  /** Store adapter for caching, events, and more */
  store?: TStore;
  /** Logger adapter for logging */
  logger?: TLogger;
  /** Extended parameters */
  [key: string]: any;
}

export type IgniterRouter<
  TContext extends object,
  TControllers extends Record<string, IgniterControllerConfig<TContext, any>>,
> = {
  config: { baseURL?: string; basePATH?: string; }
  handler: (request: Request) => Promise<Response>;
  controllers: TControllers;
  processor: RequestProcessorInterface<IgniterRouterConfig<any, any, any, any>>;
}