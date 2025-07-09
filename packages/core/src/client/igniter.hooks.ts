"use client";

import type {
  IgniterAction,
  IgniterRouter,
  MutationActionCallerOptions,
  MutationActionCallerResult,
  QueryActionCallerOptions,
  QueryActionCallerResult,
  RealtimeActionCallerOptions,
  RealtimeActionCallerResult,
} from "../types";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useIgniterQueryClient } from "./igniter.context";
import { ClientCache } from "../utils/cache";

type InferIgniterResponse<T> = T extends { data: infer TData, error: infer TError } ? { data: TData | null, error: TError | null } : { data: null, error: null };

/**
 * Creates a useQueryClient hook for a specific router
 * @returns A React hook for querying data
 */
export const createUseQueryClient = <
  TRouter extends IgniterRouter<any, any, any, any>,
>() => {
  return () => {
    const { register, unregister, invalidate } = useIgniterQueryClient();

    return {
      register,
      unregister,
      invalidate,
    };
  };
};

/**
 * Creates a useQuery hook for a specific action
 * @param controller The name of the controller
 * @param action The name of the action
 * @param fetcher The function that calls the server action
 * @returns A React hook for querying data
 */
export const createUseQuery = <
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any, any>,
>(
  controller: string,
  action: string,
  fetcher: (input: TAction['$Infer']['$Input']) => Promise<Awaited<TAction["$Infer"]["$Output"]>>,
) => {
  return (
    options?: QueryActionCallerOptions<TAction>,
  ): QueryActionCallerResult<TAction> => {
    const { register, unregister, invalidate } = useIgniterQueryClient();

    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
    const [isFetching, setIsFetching] = useState(false);
    const [response, setResponse] = useState<{
      data: TAction["$Infer"]["$Response"]["data"] | null;
      error: TAction["$Infer"]["$Response"]["error"] | null;
    }>({
      data: options?.initialData?.data || null,
      error: options?.initialData?.error || null,
    });

    const isInitialLoadRef = useRef(true);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const actionPath = useMemo(() => `${controller}.${action}`, [controller, action]);
    const regKey = useMemo(() => actionPath, [actionPath]);

    const getCacheKey = useCallback(
      (params?: TAction["$Infer"]["$Input"]) => {
        return `${actionPath}:${JSON.stringify(params || {})}`;
      },
      [actionPath],
    );

    const lastUsedParamsRef = useRef<TAction["$Infer"]["$Input"]>({
      query: options?.query,
      params: options?.params,
    } as TAction["$Infer"]["$Input"]);

    const execute = useCallback(
      async (params?: TAction["$Infer"]["$Input"]) => {
        if (optionsRef.current?.enabled === false) return;

        const mergedParams = {
            ...lastUsedParamsRef.current,
            ...params,
        };
        lastUsedParamsRef.current = mergedParams;

        setIsFetching(true);
        if (isInitialLoadRef.current) {
          setStatus('loading');
        }
        optionsRef.current?.onLoading?.(true);

        const cacheKey = getCacheKey(mergedParams);
        let settledData: Awaited<TAction["$Infer"]["$Output"]> | null = null;
        let settledError: Awaited<TAction["$Infer"]["$Errors"]> | null = null;

        try {
          if (optionsRef.current?.staleTime) {
            const cachedData = ClientCache.get(cacheKey, optionsRef.current.staleTime);
            if (cachedData) {
              setResponse(cachedData);
              setStatus('success');
              optionsRef.current?.onSuccess?.(cachedData);
              return cachedData;
            }
          }

          const result = await fetcher(mergedParams);
          settledData = result;

          setResponse(result);
          setStatus('success');
          optionsRef.current?.onRequest?.(result);
          optionsRef.current?.onSuccess?.(result);

          if (optionsRef.current?.staleTime) {
            ClientCache.set(cacheKey, result);
          }
          return result;
        } catch (error) {
          const errorResponse = { data: null, error: error as TAction["$Infer"]["$Output"]["error"] };
          // @ts-expect-error - Ignore type error for now
          settledError = errorResponse;
          setResponse(errorResponse);
          setStatus('error');
          optionsRef.current?.onError?.(errorResponse.error);
        } finally {
          setIsFetching(false);
          isInitialLoadRef.current = false;
          optionsRef.current?.onLoading?.(false);
          optionsRef.current?.onSettled?.(settledData as any, settledError as any);
        }
      },
      [getCacheKey, regKey, fetcher],
    );

    const refetch = useCallback(() => {
      execute(lastUsedParamsRef.current);
    }, [execute]);

    useEffect(() => {
      register(regKey, refetch);
      return () => unregister(regKey, refetch);
    }, [regKey, register, unregister, refetch]);

    // Automatic refetching side effects
    useEffect(() => {
      if (options?.enabled === false) return;

      if (options?.refetchInterval) {
        const interval = setInterval(() => {
          if (!options.refetchIntervalInBackground && document.hidden) return;
          execute();
        }, options.refetchInterval);
        return () => clearInterval(interval);
      }
    }, [execute, options?.refetchInterval, options?.refetchIntervalInBackground, options?.enabled]);

    useEffect(() => {
        if (options?.enabled === false) return;

        if (options?.refetchOnWindowFocus !== false) {
            const handleFocus = () => execute();
            window.addEventListener("focus", handleFocus);
            return () => window.removeEventListener("focus", handleFocus);
        }
    }, [execute, options?.refetchOnWindowFocus, options?.enabled]);

    useEffect(() => {
        if (options?.enabled === false) return;

        if (options?.refetchOnReconnect !== false) {
            const handleOnline = () => execute();
            window.addEventListener("online", handleOnline);
            return () => window.removeEventListener("online", handleOnline);
        }
    }, [execute, options?.refetchOnReconnect, options?.enabled]);

    // Initial fetch
    useEffect(() => {
        if (options?.enabled !== false && options?.refetchOnMount !== false) {
            execute();
        }
    }, [execute, options?.refetchOnMount, options?.enabled]);

    const isLoading = status === 'loading';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    return {
      data: response.data,
      error: response.error,
      isLoading,
      isFetching,
      isSuccess,
      isError,
      status,
      refetch,
      execute: execute as TAction["$Infer"]["$Caller"],
      // Deprecated
      loading: isLoading,
      // @ts-expect-error - Ignore type error for now
      invalidate: () => invalidate([actionPath]),
    };
  };
};

/**
 * Creates a useMutation hook for a specific action
 * @param controller The name of the controller
 * @param action The name of the action
 * @param fetcher The function that calls the server action
 * @returns A React hook for mutating data
 */
export const createUseMutation = <
  TAction extends IgniterAction<any, any, any, any, any, any, any, any, any, any>,
>(
  controller: string,
  action: string,
  fetcher: (input: TAction['$Infer']['$Input']) => Promise<TAction["$Infer"]["$Output"]>,
) => {
  return (
    options?: MutationActionCallerOptions<TAction>,
  ): MutationActionCallerResult<TAction> => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [response, setResponse] = useState<{
      data: TAction["$Infer"]["$Response"]["data"] | null;
      error: TAction["$Infer"]["$Response"]["error"] | null;
    }>({
      data: null,
      error: null,
    });

    const optionsRef = useRef(options);
    optionsRef.current = options;
    // @ts-expect-error - Ignore type error for now
    const lastUsedParamsRef = useRef<TAction["$Infer"]["$Input"]>();

    const mutate = useCallback(async (params: TAction["$Infer"]["$Input"]) => {
      const mergedParams = {
        query: { ...optionsRef.current?.query, ...params?.query },
        params: { ...optionsRef.current?.params, ...params?.params },
        body: { ...optionsRef.current?.body, ...params?.body },
      } as TAction["$Infer"]["$Input"];

      lastUsedParamsRef.current = mergedParams;

      let settledData: Awaited<TAction["$Infer"]["$Output"]> | null = null;
      let settledError: Awaited<TAction["$Infer"]["$Errors"]> | null = null;

      setStatus('loading');
      optionsRef.current?.onLoading?.(true);

      try {
        const result = await fetcher(mergedParams);
        settledData = result;
        setResponse(result);
        setStatus('success');
        optionsRef.current?.onRequest?.(result);
        optionsRef.current?.onSuccess?.(result);
        return result;
      } catch (error) {
        const errorResponse = { data: null, error: error as TAction["$Infer"]["$Output"]["error"] };
        // @ts-expect-error - Ignore type error for now
        settledError = errorResponse;
        setResponse(errorResponse);
        setStatus('error');
        optionsRef.current?.onError?.(errorResponse as any);
        return errorResponse;
      } finally {
        optionsRef.current?.onLoading?.(false);
        optionsRef.current?.onSettled?.(settledData as any, settledError as any);
      }
    }, [fetcher]);

    const retry = useCallback(() => {
      if (lastUsedParamsRef.current) {
        mutate(lastUsedParamsRef.current);
      } else {
        console.error("[Igniter] Cannot retry mutation: no parameters were provided in the last call.");
      }
    }, [mutate]);

    const isLoading = status === 'loading';
    const isSuccess = status === 'success';
    const isError = status === 'error';

    return {
      mutate,
      data: response.data,
      error: response.error,
      isLoading,
      isSuccess,
      isError,
      status: status === 'idle' ? 'loading' : status, // For backward compatibility
      retry,
      // Deprecated
      loading: isLoading,
    } as unknown as MutationActionCallerResult<TAction>;
  };
};

/**
 * Generic hook for subscribing to SSE events from the central connection
 * @param channelId - The channel ID to subscribe to
 * @param options - Configuration options for the subscription
 * @returns Stream data and connection status
 */
export function useRealtime<T = any>(
  channelId: string,
  options: {
    initialData?: T;
    onMessage?: (data: T) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  } = {}
): {
  data: T | null;
  isConnected: boolean;
} {
  const [data, setData] = useState<T | null>(options.initialData || null);
  const [isConnected, setIsConnected] = useState(false);
  const { subscribeToRealtime } = useIgniterQueryClient();

  const callbacksRef = useRef({
    onMessage: options.onMessage,
    onConnect: options.onConnect,
    onDisconnect: options.onDisconnect
  });

  useEffect(() => {
    callbacksRef.current = {
      onMessage: options.onMessage,
      onConnect: options.onConnect,
      onDisconnect: options.onDisconnect
    };
  }, [options.onMessage, options.onConnect, options.onDisconnect]);

  useEffect(() => {
    if (callbacksRef.current.onConnect) {
      callbacksRef.current.onConnect();
    }

    const handleMessage = (message: any) => {
      setData(message);
      if (callbacksRef.current.onMessage) {
        callbacksRef.current.onMessage(message);
      }
    };

    const unsubscribe = subscribeToRealtime(channelId, handleMessage);
    setIsConnected(true);

    return () => {
      setIsConnected(false);
      if (callbacksRef.current.onDisconnect) {
        callbacksRef.current.onDisconnect();
      }
      unsubscribe();
    };
  }, [channelId, subscribeToRealtime]);

  return {
    data,
    isConnected
  };
}

/**
 * Creates a useRealtime hook for real-time data streaming
 * @param actionPath The action path for the stream endpoint
 * @returns A React hook for subscribing to real-time updates
 */
export const createUseRealtime = <TAction extends IgniterAction<any, any, any, any, any, any, any, any, any, any>>(
  baseURL: string,
  basePATH: string,
  actionPath: string,
) => {
  return (options?: RealtimeActionCallerOptions<TAction>): RealtimeActionCallerResult<TAction> => {
    const [isReconnecting, setIsReconnecting] = useState(false);
    // @ts-expect-error - Ignore type error for now
    const [response, setResponse] = useState<InferIgniterResponse<Awaited<TAction["$Infer"]["$Output"]>>>(() => ({
      data: options?.initialData?.data || null,
      error: options?.initialData?.error || null,
    }));

    const channelId = useMemo(() => actionPath, [actionPath]);

    const streamResult = useRealtime(channelId, {
      initialData: response.data,
      onMessage: (newData) => {
        // @ts-expect-error - Ignore type error for now
        setResponse({ data: newData, error: null });
        // @ts-expect-error - Ignore type error for now
        options?.onMessage?.({ data: newData, error: null });
      },
      onConnect: () => {
        options?.onConnect?.();
      },
      onDisconnect: () => {
        setIsReconnecting(options?.autoReconnect || false);
        options?.onDisconnect?.();
      }
    });

    const disconnect = useCallback(() => {
        // This is handled by the central hook's cleanup
    }, []);

    const reconnect = useCallback(() => {
      // The actual reconnection is handled by the central SSE connection logic, not implemented here.
      setIsReconnecting(true);
    }, []);

    return {
      data: response.data,
      error: response.error,
      isConnected: streamResult.isConnected,
      isReconnecting,
      disconnect,
      reconnect,
    } as RealtimeActionCallerResult<TAction>;
  };
};
