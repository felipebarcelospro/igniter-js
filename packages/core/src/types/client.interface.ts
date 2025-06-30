import type {
  IgniterRouter,
  IgniterAction,
  Prettify,
  DeepPartial,
} from ".";

export type ClientConfig<TRouter extends IgniterRouter<any, any, any, any>> = {
  router: TRouter | (() => TRouter);
  baseURL: string;
  basePath: string;
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
  initialParams?: TAction["$Infer"]["$Input"];
  staleTime?: number;
  refetchInterval?: number;
  refetchIntervalInBackground?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
  onLoading?: (isLoading: boolean) => void;
  onRequest?: (data: Awaited<TAction["$Infer"]["$Output"]>) => void;
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
    loading: boolean;
    isLoading: boolean;
    execute: TAction["$Infer"]["$Caller"];
    invalidate: () => void;
    data: TAction["$Infer"]["$Response"]["data"];
    error: TAction["$Infer"]["$Response"]["error"];
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

export type RefetchFn = () => void;

export type StreamSubscriberFn = (data: any) => void;

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
    loading: boolean;
    isLoading: boolean;
    mutate: TAction["$Infer"]["$Caller"];
    data: TAction["$Infer"]["$Response"]["data"];
    error: TAction["$Infer"]["$Response"]["error"];
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
  defaultValues?: DeepPartial<TAction["$Infer"]["$Input"]>;
  onLoading?: (isLoading: boolean) => void;
  onRequest?: (data: Awaited<TAction["$Infer"]["$Output"]>) => void;
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
      useStream: StreamActionCaller<TAction>;
      query: TAction["$Infer"]["$Caller"];
    }
  : {
      useMutation: MutationActionCaller<TAction>;
      mutate: TAction["$Infer"]["$Caller"];
    };

export type InferCacheKeysFromRouter<
  TRouter extends IgniterRouter<any, any, any, any>,
> = {
  [TControllerName in keyof TRouter["controllers"]]: {
    [TActionName in keyof TRouter["controllers"][TControllerName]["actions"]]: TRouter["controllers"][TControllerName]["actions"][TActionName] extends {
      method: "GET";
    }
      ? `${TControllerName & string}.${TActionName & string}`
      : never;
  }[keyof TRouter["controllers"][TControllerName]["actions"]];
}[keyof TRouter["controllers"]];

export type InferRouterCaller<
  TRouter extends IgniterRouter<any, any, any, any>,
> =
  TRouter extends IgniterRouter<any, infer TControllers, any, any>
    ? {
        [TControllerName in keyof TControllers]: {
          [TActionName in keyof TControllers[TControllerName]["actions"]]: ClientActionCaller<
            TControllers[TControllerName]["actions"][TActionName]
          >;
        };
      }
    : never;

export type IgniterContextType<
  TRouter extends IgniterRouter<any, any, any, any>,
> = {
  register: (key: string, refetch: RefetchFn) => void;
  unregister: (key: string, refetch: RefetchFn) => void;
  invalidate: (
    keys:
      | InferCacheKeysFromRouter<TRouter>
      | InferCacheKeysFromRouter<TRouter>[],
  ) => void;
  subscribeToStream: (
    channelId: string,
    callback: StreamSubscriberFn,
  ) => () => void;
  listeners: Map<string, Set<RefetchFn>>;
  streamSubscribers?: Map<string, Set<StreamSubscriberFn>>;
};

/**
 * Options for stream hooks
 */
export interface StreamActionCallerOptions<
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
   * Initial parameters for the stream
   */
  initialParams?: TAction["$Infer"]["$Input"];

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
 * Result type for stream hooks
 */
export interface StreamActionCallerResult<
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
 * Stream action caller type
 */
export type StreamActionCaller<
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
  options?: StreamActionCallerOptions<TAction>,
) => StreamActionCallerResult<TAction>;
