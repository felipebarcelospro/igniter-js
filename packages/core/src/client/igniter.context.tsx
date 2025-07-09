"use client";

import { IgniterConsoleLogger } from "../services";
import { IgniterLogLevel, type IgniterRouter } from "../types";
import type {
  IgniterContextType,
  RefetchFn,
  RealtimeSubscriberFn,
} from "../types/client.interface";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type PropsWithChildren,
} from "react";

/**
 * Igniter context provider type
 */
const IgniterContext = createContext<IgniterContextType<any> | undefined>(
  undefined,
);

/**
 * Options for the Igniter Provider
 */
export interface IgniterProviderOptions<TContext extends () => Promise<any> | any> {
  /**
   * Enable Realtime(SSE) connection for streams and revalidation
   */
  enableRealtime?: boolean;

  /**
   * Automatically reconnect on connection loss
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Maximum number of reconnection attempts
   * @default 5
   */
  maxReconnectAttempts?: number;

  /**
   * Delay between reconnection attempts (in ms)
   * Base delay that increases exponentially with each attempt
   * @default 1000
   */
  reconnectDelay?: number;

  /**
   * Enable debug mode
   * @default false
   */
  debug?: boolean;

  /**
   * Get the context for the IgniterProvider
   */
  getContext?: TContext;

  /**
   * The context to be passed to the IgniterProvider
   */
  getScopes?: (ctx: Awaited<ReturnType<TContext>>) => Promise<string[]> | string[];
}

/**
 * Provider component for the Igniter context, managing query invalidation and refetching.
 *
 * @component
 * @param {PropsWithChildren} props - The component props
 * @param {React.ReactNode} props.children - Child components to be wrapped by the provider
 * @param {IgniterProviderOptions} props.options - Configuration options
 *
 * @example
 * ```tsx
 * <IgniterProvider options={{ enableRevalidation: true }}>
 *   <App />
 * </IgniterProvider>
 * ```
 *
 * @remarks
 * The IgniterProvider manages a collection of query listeners and provides methods to:
 * - Register refetch functions for specific query keys
 * - Unregister refetch functions
 * - Invalidate queries by key(s)
 * - Automatically revalidate based on server-sent events
 *
 * @internal State
 * - listeners: Map<string, Set<RefetchFn>> - Stores refetch functions indexed by query keys
 *
 * @public Methods
 * - register(key: string, refetch: RefetchFn): () => void
 *   Registers a refetch function for a specific query key and returns cleanup function
 *
 * - unregister(key: string, refetch: RefetchFn): void
 *   Removes a refetch function registration for a specific query key
 *
 * - invalidate(keys: string | string[]): void
 *   Triggers refetch for all registered queries matching the provided key(s)
 *
 * @returns {JSX.Element} Provider component wrapping its children with Igniter context
 */
export function IgniterProvider<TContext extends () => Promise<any> | any>({
  children,
  getContext,
  getScopes,
  debug,
  enableRealtime = true,
  autoReconnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000,
}: PropsWithChildren & IgniterProviderOptions<TContext>) {
  // Maps para armazenar os listeners de queries e streams
  const [listeners] = useState(() => new Map<string, Set<RefetchFn>>());
  const [streamSubscribers] = useState(
    () => new Map<string, Set<RealtimeSubscriberFn>>(),
  );
  const sseConnectionRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sseEndpoint = '/api/v1/sse/events'

  const logger = useMemo(() => {
    return IgniterConsoleLogger.create({
      level: debug ? IgniterLogLevel.DEBUG : IgniterLogLevel.INFO,
      context: {
        provider: 'IgniterProvider',
        package: 'core'
      }
    });
  }, []);

  // Registra uma função de refetch para uma queryKey específica
  const register = useCallback(
    (key: string, refetch: RefetchFn) => {
      logger.debug(`Registering refetch function for key: ${key}`);

      const current = listeners.get(key) || new Set();
      current.add(refetch);
      listeners.set(key, current);

      logger.debug(`Current listeners for ${key}:`, current.size);

      return () => {
        const listenerSet = listeners.get(key);
        if (listenerSet) {
          listenerSet.delete(refetch);
          if (listenerSet.size === 0) {
            listeners.delete(key);
          }
          logger.debug(
            `Unregistered refetch function for key: ${key}`,
          );
        }
      };
    },
    [listeners],
  );

  // Remove o registro de uma função de refetch
  const unregister = useCallback(
    (key: string, refetch: RefetchFn) => {
      logger.debug(`Unregistering refetch function for key: ${key}`);

      const current = listeners.get(key);
      if (current) {
        current.delete(refetch);
        if (current.size === 0) {
          listeners.delete(key);
        }
        logger.debug(`Current listeners for ${key}:`, current.size);
      }
    },
    [listeners],
  );

  // Trigger the refetch for all registered queries with the specified queryKey
  const invalidate = useCallback(
    (keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];

      keysArray.forEach((key) => {
        logger.debug(`Invalidating query for key: ${key}`);
        const registered = listeners.get(key);

        if (registered) {
          logger.debug(
            `Found ${registered.size} listeners for key: ${key}`,
          );
          registered.forEach((refetch) => {
            try {
              logger.debug(`Executing refetch for key: ${key}`);
              refetch();
            } catch (err) {
              logger.error(
                `Error refetching query for key '${key}':`,
                err,
              );
            }
          });
        } else {
          logger.debug(`No listeners found for key: ${key}`);
        }
      });
    },
    [listeners],
  );

  // Track channels that need reconnection to avoid frequent reconnects
  const pendingChannelChangesRef = useRef<{
    channelsAdded: Set<string>;
    channelsRemoved: Set<string>;
    timeoutId: NodeJS.Timeout | null;
  }>({
    channelsAdded: new Set(),
    channelsRemoved: new Set(),
    timeoutId: null,
  });

  // Function to batch channel changes and reconnect only once
  const scheduleReconnect = useCallback(() => {
    if (pendingChannelChangesRef.current.timeoutId) {
      clearTimeout(pendingChannelChangesRef.current.timeoutId);
    }

    pendingChannelChangesRef.current.timeoutId = setTimeout(() => {
      if (
        sseConnectionRef.current &&
        (pendingChannelChangesRef.current.channelsAdded.size > 0 ||
          pendingChannelChangesRef.current.channelsRemoved.size > 0)
      ) {
        logger.debug(
          `Reconnecting due to channel changes: added=${Array.from(
            pendingChannelChangesRef.current.channelsAdded,
          ).join(",")}, removed=${Array.from(
            pendingChannelChangesRef.current.channelsRemoved,
          ).join(",")}`,
        );

        sseConnectionRef.current.close();
        connectSSE();

        // Clear pending changes
        pendingChannelChangesRef.current.channelsAdded.clear();
        pendingChannelChangesRef.current.channelsRemoved.clear();
      }

      pendingChannelChangesRef.current.timeoutId = null;
    }, 300); // Debounce reconnection by 300ms
  }, []);

  // Subscribe to a specific stream channel
  const subscribeToRealtime = useCallback(
    (channelId: string, callback: RealtimeSubscriberFn) => {
      logger.debug(`Subscribing to stream channel: ${channelId}`);

      // Add the subscriber to the channel
      const subscribers = streamSubscribers.get(channelId) || new Set();
      const isFirstSubscriber = subscribers.size === 0;

      subscribers.add(callback);
      streamSubscribers.set(channelId, subscribers);

      logger.debug(
        `Current subscribers for channel ${channelId}: ${subscribers.size}`,
      );

      // If this is the first subscriber, schedule reconnection
      if (isFirstSubscriber && sseConnectionRef.current) {
        logger.debug(
          `First subscriber for channel ${channelId}, scheduling reconnect`,
        );
        pendingChannelChangesRef.current.channelsAdded.add(channelId);
        scheduleReconnect();
      }

      // Return cleanup function
      return () => {
        logger.debug(
          `Unsubscribing from stream channel: ${channelId}`,
        );
        const subs = streamSubscribers.get(channelId);
        if (subs) {
          subs.delete(callback);
          if (subs.size === 0) {
            streamSubscribers.delete(channelId);
            logger.debug(
              `No more subscribers for channel ${channelId}, scheduling reconnect`,
            );

            // Schedule reconnection without this channel
            if (sseConnectionRef.current) {
              pendingChannelChangesRef.current.channelsRemoved.add(channelId);
              scheduleReconnect();
            }
          }
          logger.debug(
            `Current subscribers for channel ${channelId}: ${subs.size}`,
          );
        }
      };
    },
    [streamSubscribers, scheduleReconnect],
  );

  // Handle SSE connection errors
  const handleSSEError = useCallback(() => {
    logger.warn("SSE connection error");

    if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      const delay =
        reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1); // Exponential backoff

      logger.debug(
        `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
      );

      // Clear any existing timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Set up new reconnection timeout
      reconnectTimeoutRef.current = setTimeout(() => {
        if (sseConnectionRef.current) {
          sseConnectionRef.current.close();
        }
        connectSSE();
      }, delay);
    } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      logger.error(
        `Max reconnection attempts (${maxReconnectAttempts}) reached, giving up`,
      );
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectDelay]);

  // Store current state of streamSubscribers for comparison
  const streamSubscribersRef = useRef(
    new Map<string, Set<RealtimeSubscriberFn>>(),
  );

  // Function to get channels that need subscription
  const getChannelsToSubscribe = useCallback(() => {
    const channelsToSubscribe = ["revalidation"];

    // Add channels that have active subscribers
    streamSubscribers.forEach((_, channel) => {
      if (!channelsToSubscribe.includes(channel)) {
        channelsToSubscribe.push(channel);
      }
    });

    return channelsToSubscribe;
  }, [streamSubscribers]);

  // Update the reference when streamSubscribers changes
  useEffect(() => {
    // Deep compare - check if the channels have actually changed
    const currentChannels = Array.from(streamSubscribers.keys())
      .sort()
      .join(",");
    const prevChannels = Array.from(streamSubscribersRef.current.keys())
      .sort()
      .join(",");

    if (currentChannels !== prevChannels) {
      logger.debug(
        "Stream subscribers changed, channels:",
        currentChannels,
      );

      // Clone the current subscribers map
      const newMap = new Map<string, Set<RealtimeSubscriberFn>>();
      streamSubscribers.forEach((subscribers, channel) => {
        newMap.set(channel, new Set(subscribers));
      });

      streamSubscribersRef.current = newMap;

      // Reconnect only if we already have an active connection
      if (sseConnectionRef.current) {
        logger.debug("Reconnecting due to channel changes");
        sseConnectionRef.current.close();
        connectSSE();
      }
    }
  }, [streamSubscribers]);

  // Connect to SSE endpoint
  const connectSSE = useCallback(async () => {
    if (!enableRealtime) {
      logger.debug("SSE is disabled, skipping connection");
      return;
    }

    // Close existing connection if any
    if (sseConnectionRef.current) {
      sseConnectionRef.current.close();
      sseConnectionRef.current = null;
    }

    try {
      const context = await getContext?.();
      const scopeIds = await getScopes?.(context);

      // Get channels to subscribe to
      const channelsToSubscribe = getChannelsToSubscribe();

      // Build SSE URL with channels parameter
      const url = new URL(sseEndpoint, window.location.origin);
      url.searchParams.set("channels", channelsToSubscribe.join(","));
      url.searchParams.set("scopes", scopeIds?.join(",") || "");

      logger.debug(`Connecting to SSE: ${url.toString()}`);
      logger.debug(
        `Subscribing to channels: ${channelsToSubscribe.join(", ")}`,
      );

      // Create new EventSource
      const eventSource = new EventSource(url.toString());
      sseConnectionRef.current = eventSource;

      // Set up event handlers
      eventSource.onopen = () => {
        logger.debug("SSE connection established");
        reconnectAttemptsRef.current = 0;
      };

      // Add specific event listeners for your event types
      eventSource.addEventListener("connected", (event) => {
        try {
          logger.debug(`Received connected event: ${event.data}`);
          const data = JSON.parse(event.data);
          // Process connected event data
          // Notify any relevant subscribers
        } catch (err) {
          logger.error("Failed to parse connected event:", err);
        }
      });

      eventSource.addEventListener("revalidate", (event) => {
        try {
          logger.debug(`Received revalidate event: ${event.data}`);
          const data = JSON.parse(event.data) as { channel: string, data: { queryKeys: string[] } };

          const queryKeys: string[] = data.data.queryKeys || [];

          // Handle revalidation using queryKeys
          if (queryKeys.length > 0) {
            logger.debug(
              `Processing revalidation for keys: ${queryKeys}`,
            );
            invalidate(queryKeys);
          }

          // Also notify any channel subscribers that might be listening for this data
          // This is critical for useStream to work
          queryKeys.forEach((queryKey) => {
            if (streamSubscribers.has(queryKey)) {
              const subscribers = streamSubscribers.get(queryKey)!;
              logger.debug(
                `Dispatching to ${subscribers.size} subscribers for channel ${queryKey}`,
              );

              subscribers.forEach((callback) => {
                try {
                  callback(data.data); // Pass the actual data payload to subscribers
                } catch (err) {
                  logger.error(
                    `Error in stream subscriber for channel '${queryKey}':`,
                    err,
                  );
                }
              });
            }
          });
        } catch (err) {
          logger.error("Failed to parse revalidate event:", err);
        }
      });

      // Keep the generic onmessage handler for other events
      eventSource.onmessage = (event) => {
        try {
          logger.debug(`Received generic SSE event: ${event.data}`);

          // ✅ ADICIONAR ESTA LÓGICA:
          const eventData = JSON.parse(event.data);

          logger.debug("Event data:", {
            event,
            eventData,
          });

          // Check if this is a channel-specific message
          if (eventData.channel && streamSubscribers.has(eventData.channel)) {
            const subscribers = streamSubscribers.get(eventData.channel)!;
            logger.debug(
              `Dispatching generic event to ${subscribers.size} subscribers for channel ${eventData.channel}`,
            );

            subscribers.forEach((callback) => {
              try {
                callback(eventData.data || eventData); // Pass the data payload
              } catch (err) {
                logger.error(
                  `Error in stream subscriber for channel '${eventData.channel}':`,
                  err,
                );
              }
            });
          }
        } catch (err) {
          logger.error("Failed to parse SSE message:", err);
        }
      };

      eventSource.onerror = handleSSEError;

      return () => {
        logger.debug("Cleaning up SSE connection");
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        eventSource.close();
        sseConnectionRef.current = null;
      };
    } catch (err) {
      logger.error("Failed to establish SSE connection:", err);
      handleSSEError();
      return () => {};
    }
  }, [
    enableRealtime,
    sseEndpoint,
    getChannelsToSubscribe,
    invalidate,
    handleSSEError,
  ]);

  // Setup SSE connection - with debounce to prevent rapid reconnections
  useEffect(() => {
    // Don't connect immediately, wait a bit to allow initial state setup
    const initialConnectTimeout = setTimeout(async () => {
      const cleanup = await connectSSE();

      // Store cleanup function for later
      return () => {
        cleanup?.();
      };
    }, 100); // Small delay for initial connection

    // Handle visibility change (reconnect when tab becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden && !sseConnectionRef.current && enableRealtime) {
        logger.debug("Page became visible, reconnecting SSE");

        // Add small delay to prevent rapid reconnections
        setTimeout(() => {
          if (!sseConnectionRef.current) {
            connectSSE();
          }
        }, 300);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialConnectTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Clean up any pending reconnect timeouts
      if (pendingChannelChangesRef.current.timeoutId) {
        clearTimeout(pendingChannelChangesRef.current.timeoutId);
        pendingChannelChangesRef.current.timeoutId = null;
      }
    };
  }, [connectSSE, enableRealtime]);

  // Memoizando o valor do contexto para evitar re-renders desnecessários
  const contextValue = useMemo(
    () => ({
      register,
      unregister,
      invalidate,
      subscribeToRealtime,
      listeners,
      streamSubscribers,
    }),
    [register, unregister, invalidate, subscribeToRealtime],
  );

  useEffect(() => {
    logger.debug("Provider mounted");
    logger.debug(
      "Current listeners:",
      Array.from(listeners.entries()).map(([key, set]) => ({
        key,
        listeners: set.size,
      })),
    );

    return () => {
      logger.debug("Provider unmounted");
      if (sseConnectionRef.current) {
        sseConnectionRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [listeners]);

  return (
    <IgniterContext.Provider value={contextValue}>
      {children}
    </IgniterContext.Provider>
  );
}

/**
 * Hook to access the Igniter context, providing access to query registration and invalidation methods.
 *
 * @returns {IgniterContextType} Igniter context object
 *
 * @throws {IgniterError} Throws an error if the hook is used outside of an IgniterProvider
 */
export const useIgniterQueryClient = <
  TRouter extends IgniterRouter<any, any, any, any>,
>() => {
  const context = useContext(IgniterContext) as
    | IgniterContextType<TRouter>
    | undefined;

  if (!context) {
    throw new Error(
      "useIgniterQueryClient must be used within an IgniterProvider",
    );
  }

  return context;
};
