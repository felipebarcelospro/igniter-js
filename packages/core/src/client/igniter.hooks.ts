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
import { IgniterConsoleLogger } from "../services/logger.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";
import { mergeQueryParams } from "../utils/deepMerge";
import { normalizeResponseData } from "../utils/response";

type InferIgniterResponse<T> = T extends { data: infer TData, error: infer TError } ? { data: TData | null, error: TError | null } : { data: null, error: null };

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


/**
 * Normalizes input parameters to ensure consistent query key generation
 * Converts undefined query/params to empty objects to avoid inconsistencies
 */
function normalizeInputParams<T extends { query?: any, params?: any, body?: any }>(
  input: T | undefined
): T {
  if (!input) {
    return { query: {}, params: {}, body: {} } as T;
  }

  return {
    ...input,
    query: input.query || {},
    params: input.params || {},
    body: input.body || {}
  } as T;
}

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
        // Normalize params before generating query key to ensure consistency
        const normalizedParams = normalizeInputParams(params);
        return generateQueryKey(controller, action, normalizedParams);
      },
      [controller, action],
    );

    // Initialize lastUsedParamsRef synchronously with initial parameters
    const initialParams = useMemo(() => {
      return normalizeInputParams({
        query: options?.query,
        params: options?.params,
      } as TAction["$Infer"]["$Input"]);
    }, [options?.query, options?.params]);

    const lastUsedParamsRef = useRef<TAction["$Infer"]["$Input"]>(initialParams);

    // Update lastUsedParamsRef reactively when options change
    useEffect(() => {
      const newParams = normalizeInputParams({
        query: options?.query,
        params: options?.params,
      } as TAction["$Infer"]["$Input"]);
      lastUsedParamsRef.current = newParams;
    }, [options?.query, options?.params]);

    // Estabilizar parâmetros para evitar recriação desnecessária da função execute
    const stableOptions = useMemo(() => ({
      enabled: options?.enabled,
      staleTime: options?.staleTime,
      query: options?.query,
      params: options?.params
    }), [options?.enabled, options?.staleTime, JSON.stringify(options?.query), JSON.stringify(options?.params)]);

    const execute = useCallback(
      async (params?: TAction["$Infer"]["$Input"], force = false) => {
        if (stableOptions.enabled === false) return;

        // Use deep merge for proper parameter combination
        const mergedParams = mergeQueryParams(lastUsedParamsRef.current, params);
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
          if (stableOptions.staleTime) {
            const cachedData = ClientCache.get(queryKey, stableOptions.staleTime);
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

          if (stableOptions.staleTime) {
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
      [getQueryKey, fetcher, stableOptions],
    );

    const refetch = useCallback((invalidate = true) => {
      execute(lastUsedParamsRef.current, invalidate);
    }, [execute]);

    // Register query with reactive query key that updates when parameters change - usar queryKey estável
    const currentQueryKey = useMemo(() => getQueryKey(lastUsedParamsRef.current), [getQueryKey, stableOptions.query, stableOptions.params]);

    useEffect(() => {
      register(currentQueryKey, refetch);
      return () => unregister(currentQueryKey, refetch);
    }, [register, unregister, refetch, currentQueryKey]);

    // Automatic refetching side effects - separar lógica de intervalo
    useEffect(() => {
      if (stableOptions.enabled === false) return;

      if (optionsRef.current?.refetchInterval) {
        const interval = setInterval(() => {
          if (!optionsRef.current?.refetchIntervalInBackground && document.hidden) return;
          execute();
        }, optionsRef.current.refetchInterval);
        return () => clearInterval(interval);
      }
    }, [execute, stableOptions.enabled]);

    useEffect(() => {
        if (stableOptions.enabled === false) return;

        if (optionsRef.current?.refetchOnWindowFocus !== false) {
            const handleFocus = () => execute();
            window.addEventListener("focus", handleFocus);
            return () => window.removeEventListener("focus", handleFocus);
        }
    }, [execute, stableOptions.enabled]);

    useEffect(() => {
        if (stableOptions.enabled === false) return;

        if (optionsRef.current?.refetchOnReconnect !== false) {
            const handleOnline = () => execute();
            window.addEventListener("online", handleOnline);
            return () => window.removeEventListener("online", handleOnline);
        }
    }, [execute, stableOptions.enabled]);

    // Initial fetch - usar ref para evitar loop infinito
    const hasExecutedRef = useRef(false);

    useEffect(() => {
        if (stableOptions.enabled !== false && optionsRef.current?.refetchOnMount !== false && !hasExecutedRef.current) {
            hasExecutedRef.current = true;
            execute();
        }
    }, [execute, stableOptions.enabled]);

    // Reset execution flag when params change significantly
    useEffect(() => {
        hasExecutedRef.current = false;
    }, [currentQueryKey]);

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
      // Use deep merge for mutation parameters as well
       const baseParams = {
         query: optionsRef.current?.query || {},
         params: optionsRef.current?.params || {},
       } as TAction["$Infer"]["$Input"];

       const mergedParams = mergeQueryParams(baseParams, params);
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
        const logger = IgniterConsoleLogger.create({
          level: resolveLogLevel(),
          context: createLoggerContext('IgniterHooks')
        });
        logger.error("Cannot retry mutation: no parameters were provided in the last call.");
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
