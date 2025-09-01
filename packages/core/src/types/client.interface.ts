import type {
  IgniterRouter,
  IgniterAction,
  Prettify,
  DeepPartial,
} from ".";

/**
 * Igniter.js Client Interface Definitions
 *
 * This module contains all type definitions for the Igniter.js client-side implementation.
 * The client is a completely custom implementation built from scratch specifically for Igniter.js,
 * providing end-to-end type safety and seamless integration with the Igniter.js backend.
 *
 * Key Features:
 * - Custom query and mutation management (not dependent on external libraries)
 * - Built-in caching with configurable stale time
 * - Real-time subscriptions via Server-Sent Events (SSE)
 * - Automatic refetching with configurable intervals and triggers
 * - Complete TypeScript type safety from backend to frontend
 * - Custom provider-based state management
 */

export type ClientConfig<TRouter extends IgniterRouter<any, any, any, any, any>> = {
  router: TRouter | (() => TRouter);
  baseURL: string;
  basePATH: string;
}

export type QueryActionCallerOptions<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> = {
  enabled?: boolean;
  initialData?: Awaited<TAction["$Infer"]["$Output"]>;
  query?: TAction["$Infer"]["query"];
  params?: TAction["$Infer"]["params"];
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  credentials?: RequestCredentials;
  staleTime?: number;
  refetchInterval?: number;
  refetchIntervalInBackground?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
  onLoading?: (isLoading: boolean) => void;
  onRequest?: (response: Awaited<TAction["$Infer"]["$Response"]>) => void;
  onSuccess?: (data: Awaited<TAction["$Infer"]["$Output"]>) => void;
  onError?: (error: Awaited<TAction["$Infer"]["$Errors"]>) => void;
  onSettled?: (data: Awaited<TAction["$Infer"]["$Output"]> | null, error?: Awaited<TAction["$Infer"]["$Errors"]> | null) => void;
};

export type QueryActionCallerResult<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> = Prettify<
  {
    /**
     * The data returned from a successful query. It will be `undefined` until the fetch succeeds.
     */
    data: TAction["$Infer"]["$Response"]["data"];

    /**
     * The variables used for the QueryActionCaller. It will be `undefined` until the query is called.
     */
    variables?: TAction['$Infer']['$Input']

    /**
     * A boolean that is `true` only during the very first fetch for a query.
     */
    isLoading: boolean;

    /**
     * A boolean that is `true` whenever a request is in-flight (including initial load and subsequent refetches).
     */
    isFetching: boolean;

    /**
     * A boolean that is `true` if the query has completed successfully.
     */
    isSuccess: boolean;

    /**
     * A boolean that is `true` if the query has failed.
     */
    isError: boolean;

    /**
     * If `isError` is true, this property will contain the error object.
     */
    error: TAction["$Infer"]["$Response"]["error"];

    /**
     * A function you can call to manually trigger a refetch of the query.
     */
    refetch: () => void;

    /**
     * A string representing the query's state: `'loading'`, `'error'`, or `'success'`.
     */
    status: 'loading' | 'error' | 'success';

    /**
     * [DEPRECATED] Use `isLoading` instead.
     */
    loading: boolean;

    /**
     * [DEPRECATED] Use `refetch` instead.
     */
    invalidate: () => void;

    /**
     * The function to execute the query.
     */
    execute: TAction["$Infer"]["$Caller"];
  }
>;

export type QueryActionCaller<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> = (
  options?: QueryActionCallerOptions<TAction>,
) => QueryActionCallerResult<TAction>;

export type RefetchFn = (invalidate?: boolean) => void;

export type RealtimeSubscriberFn = (data: any) => void;

export type MutationActionCallerResult<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> = Prettify<
  {
    // [DEPRECATED] The 'loading' property is deprecated. Please use 'isLoading' instead.
    mutate: TAction["$Infer"]["$Caller"];

    /**
     * The data returned from a successful query. It will be `undefined` until the fetch succeeds.
     */
    data: TAction["$Infer"]["$Response"]["data"];

    /**
     * The variables used for the mutation. It will be `undefined` until the mutation is called.
     */
    variables?: TAction['$Infer']['$Input']

    /**
     * A boolean that is `true` only during the very first fetch for a query.
     */
    isLoading: boolean;

    /**
     * A boolean that is `true` if the query has completed successfully.
     */
    isSuccess: boolean;

    /**
     * A boolean that is `true` if the query has failed.
     */
    isError: boolean;

    /**
     * If `isError` is true, this property will contain the error object.
     */
    error: TAction["$Infer"]["$Response"]["error"];

    /**
     * A function you can call to manually trigger a refetch of the query.
     */
    retry: () => void;

    /**
     * A string representing the query's state: `'loading'`, `'error'`, or `'success'`.
     */
    status: 'loading' | 'error' | 'success';

    /**
     * [DEPRECATED] Use `isLoading` instead.
     */
    loading: boolean;
  }
>;

export type MutationActionCallerOptions<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> = {
  query?: DeepPartial<TAction["$Infer"]["query"]>;
  params?: DeepPartial<TAction["$Infer"]["params"]>;
  body?: DeepPartial<TAction["$Infer"]["body"]>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  credentials?: RequestCredentials;
  onLoading?: (isLoading: boolean) => void;
  onRequest?: (data: Awaited<TAction["$Infer"]["$Response"]>) => void;
  onSuccess?: (data: Awaited<TAction["$Infer"]["$Output"]>) => void;
  onError?: (error: Awaited<TAction["$Infer"]["$Errors"]>) => void;
  onSettled?: (
    data: Awaited<TAction["$Infer"]["$Output"]>,
    error: Awaited<TAction["$Infer"]["$Errors"]>,
  ) => void;
};

export type MutationActionCaller<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> = (
  options?: MutationActionCallerOptions<TAction>,
) => MutationActionCallerResult<TAction>;

export type ClientActionCaller<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> = TAction extends { method: "GET" }
  ? {
      useQuery: QueryActionCaller<TAction>;
      useRealtime: RealtimeActionCaller<TAction>;
      query: TAction["$Infer"]["$Caller"];
    }
  : {
      useMutation: MutationActionCaller<TAction>;
      mutate: TAction["$Infer"]["$Caller"];
    };

// 1. Gera uma união de todas as rotas de action como strings. Ex: "users.getById" | "users.getAll"
export type InferAllActionPaths<TRouter extends IgniterRouter<any, any, any, any, any>> = {
  [C in keyof TRouter['controllers']]: C extends string
    ? {
        [A in keyof TRouter['controllers'][C]['actions']]: A extends string
          ? `${C}.${A}`
          : never;
      }[keyof TRouter['controllers'][C]['actions']]
    : never;
}[keyof TRouter['controllers']];

// 2. Dado uma rota (ex: "users.getById"), infere o tipo do input esperado.
export type InferInputFromPath<
  TRouter extends IgniterRouter<any, any, any, any, any>,
  TPath extends string,
> = TPath extends `${infer TController}.${infer TAction}`
  ? TController extends keyof TRouter['controllers']
    ? TAction extends keyof TRouter['controllers'][TController]['actions']
      ? TRouter['controllers'][TController]['actions'][TAction]['$Infer']['$Input']
      : never
    : never
  : never;

// 3. Define a função `invalidate` sobrecarregada
export type InvalidateFunction<TRouter extends IgniterRouter<any, any, any, any, any>> = {
  // Sobrecarga 1: `invalidate('path', input)`
  <TPath extends InferAllActionPaths<TRouter>>(
    path: TPath,
    input: InferInputFromPath<TRouter, TPath>,
  ): void;

  // Sobrecarga 2: `invalidate(['path1', 'path2'])`
  (paths: InferAllActionPaths<TRouter>[]): void;
};

export type InferRouterCaller<
  TRouter extends IgniterRouter<any, any, any, any, any>,
> =
  TRouter extends IgniterRouter<any, infer TControllers, any, any, any>
    ? {
        [TControllerName in keyof TControllers]: {
          [TActionName in keyof TControllers[TControllerName]["actions"]]: ClientActionCaller<
            TControllers[TControllerName]["actions"][TActionName]
          >;
        };
      }
    : never;

export type IgniterContextType<
  TRouter extends IgniterRouter<any, any, any, any, any>,
> = {
  register: (key: string, refetch: RefetchFn) => void;
  unregister: (key: string, refetch: RefetchFn) => void;
  invalidate: InvalidateFunction<TRouter>;
  subscribeToRealtime: (
    channelId: string,
    callback: RealtimeSubscriberFn,
  ) => () => void;
  listeners: Map<string, Set<RefetchFn>>;
  realtimeSubscribers?: Map<string, Set<RealtimeSubscriberFn>>;
};

/**
 * Options for realtime hooks
 */
export interface RealtimeActionCallerOptions<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> {
  /**
   * Initial query parameters for the stream
   */
  query?: TAction["$Infer"]["query"];

  /**
   * Initial path parameters for the stream
   */
  params?: TAction["$Infer"]["params"];

  /**
   * Initial data for the stream
   */
  initialData?: Awaited<TAction["$Infer"]["$Output"]>;

  /**
   * Callback fired when connection is established
   */
  onConnect?: () => void;

  /**
   * Callback fired when connection is lost
   */
  onDisconnect?: () => void;

  /**
   * Callback fired when an error occurs
   */
  onError?: (error: Error) => void;

  /**
   * Callback fired when new data is received
   */
  onMessage?: (data: Awaited<TAction["$Infer"]["$Output"]>) => void;

  /**
   * Whether to automatically reconnect on connection loss
   */
  autoReconnect?: boolean;

  /**
   * Maximum number of reconnection attempts
   */
  maxReconnectAttempts?: number;

  /**
   * Delay between reconnection attempts (in milliseconds)
   */
  reconnectDelay?: number;
}

/**
 * Result type for realtime hooks
 */
export interface RealtimeActionCallerResult<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> {
  /**
   * Latest data received from the stream
   */
  data: Awaited<TAction["$Infer"]["$Output"]>;

  /**
   * Whether the stream is currently connected
   */
  isConnected: boolean;

  /**
   * Whether the stream is attempting to reconnect
   */
  isReconnecting: boolean;

  /**
   * Last error that occurred
   */
  error: Error | null;

  /**
   * Manually disconnect the stream
   */
  disconnect: () => void;

  /**
   * Manually reconnect the stream
   */
  reconnect: () => void;
}

/**
 * Realtime action caller type
 */
export type RealtimeActionCaller<
  TAction extends IgniterAction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
> = (
  options?: RealtimeActionCallerOptions<TAction>,
) => RealtimeActionCallerResult<TAction>;
