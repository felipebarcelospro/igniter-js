import type { IgniterRouter, IgniterAction, NonUnknownObject, Prettify, DeepPartial, IgniterRouterSchema } from ".";

export type ClientConfig<TRouter extends IgniterRouter<any, any>> = TRouter

export type ClientCallerFetcher<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = (options?: ClientCallerOptions<TAction>) => Promise<TAction['$Infer']['$Output']>;
  

export type ClientCallerOptions<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = 
  NonUnknownObject<TAction['$Infer']['$Input']>

export type ClientCallerHandler<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = 
  ClientCallerOptions<TAction> extends never ? () => Promise<Promise<TAction['$Infer']['$Output']>> : (input?: ClientCallerOptions<TAction>) => Promise<TAction['$Infer']['$Output']>;


export type ServerResponse<T = unknown> = {
  data: T;
  error: null;
} | {
  data: null;
  error: unknown
}


export type QueryActionCallerOptions<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = {
  enabled?: boolean;
  data?: Awaited<TAction['$Infer']['$Output']>;
  params?: TAction['$Infer']['$Input'];
  staleTime?: number;
  refetchInterval?: number;
  refetchIntervalInBackground?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
  onLoading?: (isLoading: boolean) => void;
  onRequest?: (data: Awaited<TAction['$Infer']['$Output']>) => void;
}

export type QueryActionCallerResult<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = 
  Prettify<{ loading: boolean; execute: ClientCallerHandler<TAction>, invalidate: () => void } & Awaited<TAction['$Infer']['$Output']>>

export type QueryActionCaller<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = 
  (options?: QueryActionCallerOptions<TAction>) => QueryActionCallerResult<TAction>

export type RefetchFn = () => void;

export type MutationActionCallerResult<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = 
  Prettify<{ loading: boolean; mutate: ClientCallerHandler<TAction> } & Awaited<TAction['$Infer']['$Output']>>

export type MutationActionCallerOptions<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = {
  defaultValues?: DeepPartial<TAction['$Infer']['$Input']>;
  onLoading?: (isLoading: boolean) => void;
  onRequest?: (data: Awaited<TAction['$Infer']['$Output']>) => void;
}

export type MutationActionCaller<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = 
  (options?: MutationActionCallerOptions<TAction>) => MutationActionCallerResult<TAction>

export type ClientActionCaller<
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any>
> = 
  TAction extends { method: 'GET' } ? { 
    useQuery: QueryActionCaller<TAction>;
    query: ClientCallerHandler<TAction>;
   } : { 
    useMutation: MutationActionCaller<TAction>; 
    mutate: ClientCallerHandler<TAction>;
  }

export type InferCacheKeysFromRouter<TRouter extends IgniterRouter<any, any>> = {
  [TControllerName in keyof TRouter['controllers']]: {
    [TActionName in keyof TRouter['controllers'][TControllerName]['actions']]:
      TRouter['controllers'][TControllerName]['actions'][TActionName] extends { method: 'GET' } ?
      `${TControllerName & string}.${TActionName & string}` : never;
  }[keyof TRouter['controllers'][TControllerName]['actions']];
}[keyof TRouter['controllers']];


// MODIFICAR linha 109 (InferRouterCaller):
export type InferRouterCaller<TRouterOrSchema> = 
  TRouterOrSchema extends IgniterRouter<any, infer TControllers>
    ? {
        [TControllerName in keyof TControllers]: {
          [TActionName in keyof TControllers[TControllerName]['actions']]: ClientActionCaller<TControllers[TControllerName]['actions'][TActionName]>
        }
      }
    : TRouterOrSchema extends IgniterRouterSchema<any, infer TControllers>
    ? {
        [TControllerName in keyof TControllers]: {
          [TActionName in keyof TControllers[TControllerName]['actions']]: ClientActionCaller<TControllers[TControllerName]['actions'][TActionName]>
        }
      }
    : never;


export type IgniterContextType<TRouter extends IgniterRouter<any, any>> = {
  register: (key: string, refetch: RefetchFn) => void;
  unregister: (key: string, refetch: RefetchFn) => void;
  invalidate: (keys: InferCacheKeysFromRouter<TRouter> | InferCacheKeysFromRouter<TRouter>[]) => void;
  listeners: Map<string, Set<RefetchFn>>;
};