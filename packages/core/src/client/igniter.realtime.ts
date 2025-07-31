"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RealtimeSubscriberFn } from "../types";

/**
 * Options for the useRealtimeConnectionManager hook.
 */
interface UseRealtimeConnectionManagerOptions {
  /** The URL for the Server-Sent Events endpoint. */
  url?: string;
  /** Whether to automatically attempt reconnection on failure. Defaults to true. */
  autoReconnect?: boolean;
  /** Initial delay in milliseconds before the first reconnection attempt. Defaults to 2000. */
  reconnectDelay?: number;
  /** Maximum number of reconnection attempts. Defaults to 5. */
  maxReconnectAttempts?: number;
  /** A Map where keys are channel IDs and values are a Set of subscriber callbacks. */
  subscribers: Map<string, Set<RealtimeSubscriberFn>>;
  /** An optional logger instance for debugging. */
  logger?: {
    log: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  /** The function to call to invalidate queries. */
  invalidate: (...args: any[]) => void;
}

/**
 * Result returned by the useRealtimeConnectionManager hook.
 */
interface UseRealtimeConnectionManagerResult {
  /** True if the SSE connection is currently active. */
  isConnected: boolean;
  /** True if the hook is currently attempting to reconnect. */
  isReconnecting: boolean;
  /** The raw EventSource instance, or null if not connected. */
  eventSource: EventSource | null;
}

/**
 * A React hook to manage a single, shared Server-Sent Events (SSE) connection.
 * It handles connection lifecycle, automatic reconnection with exponential backoff,
 * and dispatching messages to subscribed components.
 *
 * @param options - Configuration for the connection manager.
 * @returns The current state of the SSE connection.
 */
export function useRealtimeConnectionManager({
  url,
  autoReconnect = true,
  reconnectDelay = 2000,
  maxReconnectAttempts = 5,
  subscribers,
  logger = { log: () => {}, warn: () => {}, error: () => {} },
  invalidate,
}: UseRealtimeConnectionManagerOptions): UseRealtimeConnectionManagerResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // Do not connect if URL is not provided or if already connected/connecting
    if (!url || (eventSourceRef.current && eventSourceRef.current.readyState < 2)) {
      return;
    }

    logger.log(`Attempting to connect to SSE URL: ${url}`);
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      logger.log("Realtime connection established.");
      setIsConnected(true);
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    eventSource.onmessage = (event) => {
      try {
        // Standard SSE event from Igniter server
        const message = JSON.parse(event.data);
        const { channel, payload } = message;

        if (channel && subscribers.has(channel)) {
          const channelSubscribers = subscribers.get(channel);
          logger.log(`Dispatching message on channel "${channel}" to ${channelSubscribers?.size} subscribers.`);
          channelSubscribers?.forEach((callback) => {
            try {
              callback(payload);
            } catch (e) {
              logger.error(`Error in realtime subscriber for channel "${channel}":`, e);
            }
          });
        }
      } catch (error) {
        logger.error("Failed to parse realtime event:", error, "Data:", event.data);
      }
    };

    eventSource.addEventListener("revalidate", (event) => {
      try {
        const data = JSON.parse(event.data);
        const queryKeys: string[] = data.queryKeys || [];

        if (queryKeys.length > 0) {
          logger.log(`Received revalidation event for keys:`, queryKeys);
          invalidate(queryKeys);
        }
      } catch (error) {
        logger.error("Failed to parse revalidate event:", error, "Raw Data:", event.data);
      }
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close(); // Close the failed connection before reconnecting

      if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
        setIsReconnecting(true);
        reconnectAttemptsRef.current += 1;
        // Exponential backoff with jitter
        const delay = Math.min(
          reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1) + Math.random() * 1000,
          30000
        );
        logger.warn(`Realtime connection error. Reconnecting in ${Math.round(delay / 1000)}s... (Attempt ${reconnectAttemptsRef.current})`);
        reconnectTimerRef.current = setTimeout(connect, delay);
      } else {
        setIsReconnecting(false);
        logger.error(`Realtime connection failed after ${maxReconnectAttempts} attempts. Won't reconnect.`);
      }
    };
  }, [url, autoReconnect, maxReconnectAttempts, reconnectDelay, subscribers, logger, invalidate]);

  // Effect to manage the connection lifecycle
  useEffect(() => {
    // Force cleanup of existing connections before creating new ones
    if (eventSourceRef.current) {
      logger.log("Closing existing realtime connection before creating new one.");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      setIsReconnecting(false);
    }
    
    // Clear any pending reconnection timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    // Reset reconnection attempts for new URL
    reconnectAttemptsRef.current = 0;

    if (url) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        logger.log("Closing realtime connection.");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setIsConnected(false);
      setIsReconnecting(false);
    };
  }, [url, connect]);

  return {
    isConnected,
    isReconnecting,
    eventSource: eventSourceRef.current,
  };
}
