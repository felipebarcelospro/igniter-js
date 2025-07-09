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
 * @param serverCaller The server action caller function
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

    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<{
      data: TAction["$Infer"]["$Output"]["data"] | null;
      error: TAction["$Infer"]["$Output"]["error"] | null;
    }>({
      data: null,
      error: null,
    });

    const optionsRef = useRef(options);
    optionsRef.current = options;

    const actionPath = useMemo(() => {
      const path = `${controller}.${action}`;
      if (!path) {
        console.warn("[Igniter] Server caller missing __actionPath property");
        // Generate a unique ID as a fallback
        return `query-${Math.random().toString(36).substr(2, 9)}`;
      }

      console.log("[Igniter] Action path:", path);
      return path;
    }, []);

    const regKey = useMemo(() => actionPath, [actionPath]);

    const getCacheKey = useCallback(
      (params?: TAction["$Infer"]["$Input"]) => {
        return `${actionPath}:${JSON.stringify(params || {})}`;
      },
      [actionPath],
    );

    const execute = useCallback(
      async (params?: TAction["$Infer"]["$Input"]) => {
        try {
          console.log(`[Igniter] Executing query for key: ${regKey}`, {
            params,
          });

          setLoading(true);
          optionsRef.current?.onLoading?.(true);

          const cacheKey = getCacheKey(params);

          if (optionsRef.current?.staleTime) {
            const cachedData = ClientCache.get(
              cacheKey,
              optionsRef.current.staleTime,
            );

            if (cachedData) {
              console.log(`[Igniter] Using cached data for key: ${regKey}`);
              setResponse(cachedData);
              optionsRef.current?.onRequest?.(cachedData);
              return cachedData;
            }
          }

          console.log(`[Igniter] Fetching fresh data for key: ${regKey}`);
          const result = await fetcher(params || options?.initialParams);
          setResponse(result);

          if (optionsRef.current?.staleTime) {
            ClientCache.set(cacheKey, result);
            console.log(`[Igniter] Cached data for key: ${regKey}`);
          }

          optionsRef.current?.onRequest?.(result);
          return result;
        } catch (error) {
          console.error(`[Igniter] Query error for key: ${regKey}:`, error);

          const errorResponse = { data: null, error: error as TAction["$Infer"]["$Output"]["error"] };
          setResponse(errorResponse);
          optionsRef.current?.onRequest?.(errorResponse as TAction["$Infer"]["$Output"]);

        } finally {
          setLoading(false);
          optionsRef.current?.onLoading?.(false);
        }
      },
      [getCacheKey, regKey],
    );

    useEffect(() => {
      console.log(`[Igniter] Registering query for key: ${regKey}`);
      register(regKey, execute);
      return () => {
        console.log(`[Igniter] Unregistering query for key: ${regKey}`);
        unregister(regKey, execute);
      };
    }, [regKey, register, unregister, execute]);

    // Set up automatic refetching
    useEffect(() => {
      if (options?.refetchInterval) {
        const interval = setInterval(() => {
          if (!options.refetchIntervalInBackground && document.hidden) {
            return;
          }
          // Using empty params, assuming that GET requests can work without body
          execute(
            options?.initialParams as unknown as TAction["$Infer"]["$Input"],
          );
        }, options.refetchInterval);

        return () => clearInterval(interval);
      }
    }, [
      execute,
      options?.refetchInterval,
      options?.refetchIntervalInBackground,
    ]);

    // Set up refetch on window focus
    useEffect(() => {
      if (options?.refetchOnWindowFocus !== false) {
        const handleFocus = () => {
          execute(
            options?.initialParams as unknown as TAction["$Infer"]["$Input"],
          );
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
      }
    }, [execute, options?.refetchOnWindowFocus]);

    // Set up refetch on reconnect
    useEffect(() => {
      if (options?.refetchOnReconnect !== false) {
        const handleOnline = () => {
          execute(
            options?.initialParams as unknown as TAction["$Infer"]["$Input"],
          );
        };

        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
      }
    }, [execute, options?.refetchOnReconnect]);

    // Initial fetch
    useEffect(() => {
      if (options?.refetchOnMount !== false) {
        if (options?.initialParams) {
          execute(
            options.initialParams as unknown as TAction["$Infer"]["$Input"],
          );
        } else {
          // Execute without params if initialParams is not provided
          execute({} as any);
        }
      }
    }, [execute, options?.refetchOnMount]);

    // @ts-ignore
    return {
      isLoading: loading,
      loading,
      execute,
      invalidate: () => invalidate([`${controller}.${action}`]),
      ...response,
    };
  };
};

/**
 * Creates a useMutation hook for a specific action
 * @param serverCaller The server action caller function
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
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<TAction["$Infer"]["$Output"]>(() => {
      return { data: null, error: null } as TAction["$Infer"]["$Output"];
    });

    // Keep track of the latest options for use in mutate
    const optionsRef = useRef(options);
    optionsRef.current = options;

    const mutate = useCallback(async (params: TAction["$Infer"]["$Input"]) => {
      try {
        setLoading(true);
        optionsRef.current?.onLoading?.(true);

        const mergedParams = optionsRef.current?.defaultValues
          ? { ...optionsRef.current.defaultValues, ...params }
          : params;

        // No mutate:
        const result = await fetcher(mergedParams);

        setResponse(result);

        optionsRef.current?.onRequest?.(result);

        return result;
      } catch (error) {
        const errorResponse = { data: null, error: error as TAction["$Infer"]["$Output"]["error"] };
        setResponse(errorResponse);
        optionsRef.current?.onRequest?.(errorResponse as TAction["$Infer"]["$Output"]);
        return errorResponse;
      } finally {
        setLoading(false);
        optionsRef.current?.onLoading?.(false);
      }
    }, []);

    return {
      isLoading: loading,
      // [DEPRECATED] The 'loading' property is deprecated. Please use 'isLoading' instead.
      loading,
      mutate,
      data: response.data,
      error: response.error,
    } as unknown as MutationActionCallerResult<TAction>;
  };
};

/**
 * Generic hook for subscribing to SSE events from the central connection
 *
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

  // Store callback references that shouldn't trigger effect reruns
  const callbacksRef = useRef({
    onMessage: options.onMessage,
    onConnect: options.onConnect,
    onDisconnect: options.onDisconnect
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onMessage: options.onMessage,
      onConnect: options.onConnect,
      onDisconnect: options.onDisconnect
    };
  }, [options.onMessage, options.onConnect, options.onDisconnect]);

  useEffect(() => {
    setIsConnected(true);

    if (callbacksRef.current.onConnect) {
      callbacksRef.current.onConnect();
    }

    // Callback for processing incoming messages
    const handleMessage = (message: any) => {
      setData(message);
      if (callbacksRef.current.onMessage) {
        callbacksRef.current.onMessage(message);
      }
    };

    // Subscribe to the channel
    const unsubscribe = subscribeToRealtime(channelId, handleMessage);

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
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [response, setResponse] = useState<InferIgniterResponse<Awaited<TAction["$Infer"]["$Output"]>>>(() => {
      return {
        data: null,
        error: null,
      } as InferIgniterResponse<Awaited<TAction["$Infer"]["$Output"]>>;
    });

    // Get the channel ID from the action path
    const channelId = useMemo(() => {
      return `${actionPath}`;
    }, [actionPath]);

    // Use the centralized realtime hook
    const streamResult = useRealtime(channelId, {
      initialData: options?.initialParams,
      onMessage: (newData) => {
        setResponse(newData);
        options?.onMessage?.(newData);
      },
      onConnect: () => {
        setIsConnected(true);
        setIsReconnecting(false);

        setResponse(options?.initialData || {
          data: null,
          error: null,
        } as InferIgniterResponse<Awaited<TAction["$Infer"]["$Output"]>>);

        options?.onConnect?.();
      },
      onDisconnect: () => {
        setIsConnected(false);
        options?.onDisconnect?.();
      }
    });

    // Set data from the stream result
    useEffect(() => {
      if (streamResult.data) {
        setResponse(streamResult.data);
      }
    }, [streamResult.data]);

    // For backward compatibility, provide the same interface
    const disconnect = useCallback(() => {
      setIsConnected(false);
      console.log(`[Igniter] Manually disconnecting stream: ${actionPath}`);
      options?.onDisconnect?.();
    }, [actionPath, options]);

    const reconnect = useCallback(() => {
      console.log(`[Igniter] Manually reconnecting stream: ${actionPath}`);
      setIsReconnecting(true);
      // The actual reconnection is handled by the central SSE connection
    }, [actionPath]);

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
