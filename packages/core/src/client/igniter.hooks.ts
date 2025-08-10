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
import { generateQueryKey } from "../utils/queryKey";

type InferIgniterResponse<T> = T extends { data: infer TData, error: infer TError } ? { data: TData | null, error: TError | null } : { data: null, error: null };

/**
 * Normalizes response data to handle potential double-wrapping
 * If the response has the structure { data: {...}, error: null }, extracts the inner data
 * This fixes the issue where TypeScript expects data.url but receives data.data.url
 */
function normalizeResponseData<T>(response: any): { data: T | null; error: any | null } {
  // Check if response has the double-wrapped structure
  if (response && typeof response === 'object' && 'data' in response && 'error' in response) {
    // If the inner data also has data/error structure, it's double-wrapped
    if (response.data && typeof response.data === 'object' && 'data' in response.data && 'error' in response.data) {
      return response.data;
    }
    // Return the response as is if it has the correct structure
    return response;
  }
  // If response doesn't have the expected structure, wrap it
  return { data: response, error: null };
}

/**
 * Creates a useQueryClient hook for a specific router
 * @returns A React hook for querying data
 */
export const createUseQueryClient = <
  TRouter extends IgniterRouter<any, any, any, any, any>,
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

    const [variables, setVariables] = useState<TAction['$Infer']['$Input'] | undefined>();

    const isInitialLoadRef = useRef(true);
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const getQueryKey = useCallback(
      (params?: TAction["$Infer"]["$Input"]) => {
        return generateQueryKey(controller, action, params);
      },
      [controller, action],
    );
1
    const lastUsedParamsRef = useRef<TAction["$Infer"]["$Input"]>(undefined as TAction["$Infer"]["$Input"]);
    
    // Initialize lastUsedParamsRef only once
    useEffect(() => {
      if (!lastUsedParamsRef.current) {
        lastUsedParamsRef.current = {
          query: options?.query,
          params: options?.params,
        } as TAction["$Infer"]["$Input"];
      }
    }, [options?.query, options?.params]);

    const execute = useCallback(
      async (params?: TAction["$Infer"]["$Input"], force = false) => {
        if (optionsRef.current?.enabled === false) return;

        const mergedParams = {
            ...lastUsedParamsRef.current,
            ...params,
        };
        lastUsedParamsRef.current = mergedParams;

        setVariables(mergedParams);

        setIsFetching(true);
        if (isInitialLoadRef.current) {
          setStatus('loading');
        }
        optionsRef.current?.onLoading?.(true);

        const queryKey = getQueryKey(mergedParams);
        let settledData: Awaited<TAction["$Infer"]["$Output"]> | null = null;
        let settledError: Awaited<TAction["$Infer"]["$Errors"]> | null = null;

        try {
          if (optionsRef.current?.staleTime) {
            const cachedData = ClientCache.get(queryKey, optionsRef.current.staleTime);
            if (cachedData) {
              setResponse(cachedData);
              setStatus('success');
              optionsRef.current?.onSuccess?.(cachedData);
              return cachedData;
            }
          }

          const result = await fetcher(mergedParams);
          const normalizedResult = normalizeResponseData(result) as Awaited<TAction["$Infer"]["$Output"]>;
          settledData = normalizedResult;

          setResponse(normalizedResult);
          setStatus('success');
          optionsRef.current?.onRequest?.(normalizedResult);
          optionsRef.current?.onSuccess?.(normalizedResult.data);

          if (optionsRef.current?.staleTime) {
            ClientCache.set(queryKey, result);
          }
          return result;
        } catch (error) {
          const errorResponse = { data: null, error: error as TAction["$Infer"]["$Errors"] };
          settledError = errorResponse.error;
          setResponse(errorResponse);
          setStatus('error');
          optionsRef.current?.onError?.(errorResponse.error);
        } finally {
          setIsFetching(false);
          isInitialLoadRef.current = false;
          optionsRef.current?.onLoading?.(false);
          optionsRef.current?.onSettled?.(settledData?.data ?? null, settledError);
        }
      },
      [getQueryKey, fetcher],
    );

    const refetch = useCallback((invalidate = true) => {
      execute(lastUsedParamsRef.current, invalidate);
    }, [execute]);

    useEffect(() => {
      const currentQueryKey = getQueryKey(lastUsedParamsRef.current);
      register(currentQueryKey, refetch);
      return () => unregister(currentQueryKey, refetch);
    }, [register, unregister, refetch, getQueryKey]);

    // Automatic refetching side effects
    useEffect(() => {
      if (optionsRef.current?.enabled === false) return;

      if (optionsRef.current?.refetchInterval) {
        const interval = setInterval(() => {
          if (!optionsRef.current?.refetchIntervalInBackground && document.hidden) return;
          execute();
        }, optionsRef.current.refetchInterval);
        return () => clearInterval(interval);
      }
    }, [execute]);

    useEffect(() => {
        if (optionsRef.current?.enabled === false) return;

        if (optionsRef.current?.refetchOnWindowFocus !== false) {
            const handleFocus = () => execute();
            window.addEventListener("focus", handleFocus);
            return () => window.removeEventListener("focus", handleFocus);
        }
    }, [execute]);

    useEffect(() => {
        if (optionsRef.current?.enabled === false) return;

        if (optionsRef.current?.refetchOnReconnect !== false) {
            const handleOnline = () => execute();
            window.addEventListener("online", handleOnline);
            return () => window.removeEventListener("online", handleOnline);
        }
    }, [execute]);

    // Initial fetch
    useEffect(() => {
        if (optionsRef.current?.enabled !== false && optionsRef.current?.refetchOnMount !== false) {
            execute();
        }
    }, [execute]);

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
      loading: isLoading,
      invalidate: () => invalidate([getQueryKey(lastUsedParamsRef.current) as `${string}.${string}`]),
      variables
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

    const [variables, setVariables] = useState<TAction['$Infer']['$Input'] | undefined>();

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

      setVariables(mergedParams);

      let settledData: Awaited<TAction["$Infer"]["$Output"]> | null = null;
      let settledError: Awaited<TAction["$Infer"]["$Errors"]> | null = null;

      setStatus('loading');
      optionsRef.current?.onLoading?.(true);

      try {
        const result = await fetcher(mergedParams);
        const normalizedResult = normalizeResponseData(result) as Awaited<TAction["$Infer"]["$Output"]>;
        settledData = normalizedResult;
        setResponse(normalizedResult);
        setStatus('success');
        optionsRef.current?.onRequest?.(normalizedResult);
         optionsRef.current?.onSuccess?.(normalizedResult.data);
         return normalizedResult;
      } catch (error) {
        const errorResponse = { data: null, error: error as TAction["$Infer"]["$Errors"] };
        settledError = errorResponse.error;
        setResponse(errorResponse);
        setStatus('error');
        optionsRef.current?.onError?.(errorResponse.error);
        return errorResponse;
      } finally {
        optionsRef.current?.onLoading?.(false);

        optionsRef.current?.onSettled?.(
          settledData as Awaited<TAction["$Infer"]["$Output"]>,
          settledError as Awaited<TAction["$Infer"]["$Errors"]>
        );
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
      variables,
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
  controller: string,
  action: string,
) => {
  return (options?: RealtimeActionCallerOptions<TAction>): RealtimeActionCallerResult<TAction> => {
    const [isReconnecting, setIsReconnecting] = useState(false);
    // @ts-expect-error - Ignore type error for now
    const [response, setResponse] = useState<InferIgniterResponse<Awaited<TAction["$Infer"]["$Output"]>>>(() => ({
      data: options?.initialData?.data || null,
      error: options?.initialData?.error || null,
    }));

    const channelId = useMemo(() => {
      return generateQueryKey(controller, action, {
        query: options?.query,
        params: options?.params,
      });
    }, [controller, action, JSON.stringify(options?.query), JSON.stringify(options?.params)]);

    const onMessage = useCallback((newData: any) => {
      // @ts-expect-error - Ignore type error for now
      setResponse({ data: newData, error: null });
      // @ts-expect-error - Ignore type error for now
      options?.onMessage?.({ data: newData, error: null });
    }, [options?.onMessage]);

    const onConnect = useCallback(() => {
      options?.onConnect?.();
    }, [options?.onConnect]);

    const onDisconnect = useCallback(() => {
      setIsReconnecting(options?.autoReconnect || false);
      options?.onDisconnect?.();
    }, [options?.autoReconnect, options?.onDisconnect]);

    const streamResult = useRealtime(channelId, {
      initialData: response.data,
      onMessage,
      onConnect,
      onDisconnect
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
