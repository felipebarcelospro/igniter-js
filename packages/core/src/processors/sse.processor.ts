import type { IgniterLogger } from "../types";
import { IgniterError } from "../error";
import type {
  IgniterTelemetryProvider,
  IgniterTelemetrySpan,
} from "../types/telemetry.interface";
import { TelemetryManagerProcessor } from "./telemetry-manager.processor";

/**
 * Structure defining an SSE channel
 */
export interface SSEChannel {
  /**
   * Unique identifier for the channel
   */
  id: string;

  /**
   * Human-readable description of the channel's purpose
   */
  description?: string;
}

/**
 * Structure for an SSE event
 */
export interface SSEEvent {
  /**
   * Channel the event belongs to
   */
  channel: string;

  /**
   * Data payload for the event
   */
  data: any;

  /**
   * Optional unique identifier for the event
   */
  id?: string;

  /**
   * Optional event type
   */
  type?: string;

  /**
   * Optional list of IDs of subscribers (For multi-tenant applications)
   */
  scopes?: string[];
}

/**
 * Type definition for an SSE connection handler
 */
type SSEConnectionHandler = {
  handler: (event: SSEEvent) => void;
  scopes?: string[];
  metadata?: {
    connectedAt: number;
  };
};

/**
 * Options for creating an SSE stream
 */
export interface SSEStreamOptions {
  /**
   * Channels to subscribe to
   */
  channels: string[];

  /**
   * Keep-alive interval in milliseconds
   * @default 30000 (30 seconds)
   */
  keepAliveInterval?: number;

  /**
   * Headers to include in the SSE response
   */
  headers?: Record<string, string>;

  /**
   * Scopes to filter events by
   */
  scopes?: string[];
}

/**
 * Central processor for Server-Sent Events (SSE)
 * Manages event channels, connections, and message distribution
 */
export class SSEProcessor {
  /**
   * Map of registered channels and their metadata
   * @private
   */
  private static channels: Map<string, SSEChannel> = new Map();

  /**
   * Map of active connections per channel
   * @private
   */
  private static connections: Map<string, Set<SSEConnectionHandler>> =
    new Map();

  /**
   * Track active streams for cleanup
   * @private
   */
  private static activeStreams: Set<ReadableStream> = new Set();

  /**
   * Register a new channel for SSE events
   *
   * @param channel - Channel configuration
   * @param logger - Optional logger instance
   */
  static registerChannel(channel: SSEChannel, logger?: IgniterLogger): void {
    const childLogger = logger?.child("RouteResolverProcessor");

    if (this.channels.has(channel.id)) {
      childLogger?.warn("Channel already exists", { channelId: channel.id });
    }

    childLogger?.debug("Channel registered", {
      channelId: channel.id,
      description: channel.description,
    });
    this.channels.set(channel.id, channel);

    // Initialize connection set if it doesn't exist
    if (!this.connections.has(channel.id)) {
      this.connections.set(channel.id, new Set());
    }
  }

  /**
   * Unregister a channel and close all its connections
   *
   * @param channelId - ID of the channel to unregister
   * @param logger - Optional logger instance
   */
  static unregisterChannel(channelId: string, logger?: IgniterLogger): void {
    const childLogger = logger?.child("RouteResolverProcessor");

    if (!this.channels.has(channelId)) {
      childLogger?.warn("Channel not found for unregister", { channelId });
      return;
    }

    childLogger?.debug("Channel unregistered", { channelId });

    // Notify all connections about channel closure
    const connections = this.connections.get(channelId);
    if (connections && connections.size > 0) {
      const closeEvent: SSEEvent = {
        channel: channelId,
        type: "channel.close",
        data: {
          message: "Channel has been closed by the server.",
          timestamp: new Date().toISOString(),
        },
      };

      childLogger?.debug("Channel closure notified", {
        channelId,
        connectionCount: connections.size,
      });
      connections.forEach((handler) => {
        try {
          handler.handler(closeEvent);
        } catch (error) {
          childLogger?.error("Channel closure notification failed", {
            channelId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });
    }

    // Remove channel and its connections
    this.channels.delete(channelId);
    this.connections.delete(channelId);
  }

  /**
   * Get information about registered channels
   *
   * @returns Array of registered channel information
   */
  static getRegisteredChannels(): SSEChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get connection count for a specific channel
   *
   * @param channelId - ID of the channel
   * @returns Number of active connections
   */
  static getConnectionCount(channelId: string): number {
    const connections = this.connections.get(channelId);
    return connections ? connections.size : 0;
  }

  /**
   * Get total connection count across all channels
   *
   * @returns Total number of active connections
   */
  static getTotalConnectionCount(): number {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.size;
    }
    return total;
  }

  /**
   * Check if a channel exists
   *
   * @param channelId - ID of the channel to check
   * @returns True if the channel exists
   */
  static channelExists(channelId: string): boolean {
    return this.channels.has(channelId);
  }

  /**
   * Handle a new SSE connection request
   *
   * @param request - The incoming HTTP request
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @param parentSpan - Optional parent span for tracing
   * @returns SSE response stream
   * @throws {IgniterError} When channel validation fails
   */
  static async handleConnection(
    request: Request,
    logger?: IgniterLogger,
    telemetry?: IgniterTelemetryProvider | null,
    parentSpan?: IgniterTelemetrySpan,
  ): Promise<Response> {
    const childLogger = logger?.child("SSEProcessor");

    const url = new URL(request.url);
    const channelsParam = url.searchParams.get("channels");
    const channels = channelsParam ? channelsParam.split(",") : [];
    const scopesParam = url.searchParams.get("scopes");
    const scopes = scopesParam ? scopesParam.split(",") : [];
    const connectionId = crypto.randomUUID();

    // Create telemetry span for SSE connection
    const span = TelemetryManagerProcessor.createSSESpan(
      telemetry,
      connectionId,
      channels,
      parentSpan,
      logger,
    );

    childLogger?.debug("SSE connection requested", {
      connection_id: connectionId,
      requested_channels: channels,
      requested_scopes: scopes,
      from_ip: request.headers.get("x-forwarded-for"),
    });

    // Validate that requested channels exist
    for (const channel of channels) {
      if (!this.channelExists(channel)) {
        childLogger?.error("SSE connection refused", {
          requestedChannel: channel,
          availableChannels: this.getRegisteredChannels().map((c) => c.id),
          reason: "channel not registered",
        });

        // Record connection failure metric
        TelemetryManagerProcessor.recordSSEConnection(
          telemetry,
          channel,
          "disconnect",
          this.getTotalConnectionCount(),
          logger,
        );

        // Finish span with error
        if (span) {
          span.setTag("sse.error", "invalid_channel");
          span.finish();
        }

        throw new IgniterError({
          code: "INVALID_SSE_CHANNEL",
          message: `Channel '${channel}' is not registered`,
          logger: logger,
          details: {
            requestedChannel: channel,
            availableChannels: this.getRegisteredChannels().map((c) => c.id),
          },
        });
      }
    }

    // If no specific channels requested, use all available channels
    const targetChannels =
      channels.length > 0 ? channels : Array.from(this.channels.keys());

    // Record successful connection metric for each channel
    for (const channel of targetChannels) {
      TelemetryManagerProcessor.recordSSEConnection(
        telemetry,
        channel,
        "connect",
        this.getTotalConnectionCount() + 1,
        logger,
      );
    }

    // Finish span - connection established (span will live as long as the connection)
    if (span) {
      span.setTag("sse.channels_count", targetChannels.length);
      span.setTag("sse.connection_id", connectionId);
    }

    // Create and return the SSE stream
    return this.createSSEStream(
      {
        channels: targetChannels,
        keepAliveInterval: 30000, // 30 seconds default
        scopes,
      },
      logger,
      telemetry,
      connectionId,
    );
  }

  /**
   * Create an SSE stream for specific channels
   *
   * @param options - Stream configuration options
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @param connectionId - Optional connection ID for tracking
   * @returns Response object with SSE stream
   */
  private static createSSEStream(
    options: SSEStreamOptions,
    logger?: IgniterLogger,
    telemetry?: IgniterTelemetryProvider | null,
    connectionId?: string,
  ): Response {
    const childLogger = logger?.child("SSEProcessor");

    const {
      channels,
      keepAliveInterval = 30000,
      headers = {},
      scopes,
    } = options;
    const encoder = new TextEncoder();
    const connId = connectionId || crypto.randomUUID();

    // Create a new ReadableStream for SSE
    const stream = new ReadableStream({
      start: (controller) => {
        childLogger?.debug("SSE stream initialized", {
          connectionId: connId,
          channels: channels.join(", "),
          scopes: scopes?.join(", "),
          keep_alive_ms: keepAliveInterval,
        });

        // Send initial connection message
        const initialMessage = this.encodeSSEMessage({
          event: "connected",
          data: JSON.stringify({
            connected: true,
            channels,
            timestamp: new Date().toISOString(),
          }),
        });
        controller.enqueue(initialMessage);

        // Create a handler for this connection
        const connectionHandler = (event: SSEEvent) => {
          try {
            // Only handle events for subscribed channels
            if (!channels.includes(event.channel)) {
              return;
            }

            // Check if controller is still active before enqueueing
            if (controller.desiredSize === null) {
              throw new Error("Controller is closed");
            }

            // Scope filtering - if event has scopes, check if connection matches
            if (event.scopes && event.scopes.length > 0) {
              if (
                !scopes ||
                !event.scopes.some((scope) => scopes.includes(scope))
              ) {
                childLogger?.debug("Event scope filtering applied", {
                  connectionId: connId,
                  channel: event.channel,
                  event_scopes: event.scopes,
                  connection_scopes: scopes,
                });
                return; // Don't send if client is not in the scope list
              }
            }

            const message = this.encodeSSEMessage({
              id: event.id || crypto.randomUUID(),
              event: event.type || "message",
              data: JSON.stringify({
                scopes: event.scopes,
                channel: event.channel,
                data: event.data,
                timestamp: new Date().toISOString(),
              }),
            });

            childLogger?.debug("Event sent", {
              connectionId: connId,
              channel: event.channel,
              event_type: event.type,
              event_id: event.id,
            });
            controller.enqueue(message);
          } catch (error) {
            childLogger?.warn("Event delivery failed", { connectionId: connId, error });
            // Connection might be closed - cleanup will happen elsewhere
          }
        };

        // Register this connection handler with each requested channel
        for (const channel of channels) {
          if (this.connections.has(channel)) {
            const channelConnections = this.connections.get(channel)!;
            channelConnections.add({
              handler: connectionHandler,
              scopes,
              metadata: { connectedAt: Date.now() },
            });
            childLogger?.debug("Client subscribed", {
              channel,
              connectionCount: channelConnections.size,
            });
          }
        }

        // Set up keep-alive interval
        const keepAliveTimer = setInterval(() => {
          try {
            // Check if controller is still active
            if (controller.desiredSize === null) {
              childLogger?.debug("Controller closed, stopping keep-alive", {
                connectionId: connId,
              });
              clearInterval(keepAliveTimer);
              return;
            }

            // Send comment as keep-alive to prevent connection timeout
            childLogger?.debug("Keep-alive ping sent", { connectionId: connId });
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          } catch (error) {
            // Connection might be closed already, clear interval
            childLogger?.warn("Keep-alive failed, cleaning up timer", {
              connectionId: connId,
              error,
            });
            clearInterval(keepAliveTimer);
          }
        }, keepAliveInterval);

        // Return cleanup function
        return () => {
          childLogger?.debug("Closing SSE connection", {
            connectionId: connId,
            channels: channels.join(", "),
          });
          clearInterval(keepAliveTimer);

          // Unregister this connection handler from all channels
          for (const channel of channels) {
            if (this.connections.has(channel)) {
              const channelConnections = this.connections.get(channel)!;
              channelConnections.delete({
                handler: connectionHandler,
                scopes,
                metadata: { connectedAt: Date.now() },
              });
              childLogger?.debug(
                `Client unsubscribed from channel '${channel}' (${channelConnections.size} connections remaining)`,
              );
            }
          }
        };
      },
    });

    // Track this stream for potential cleanup
    this.activeStreams.add(stream);

    // Create and return the Response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
        ...headers,
      },
    });
  }

  /**
   * Publish an event to a specific channel
   *
   * @param event - The event to publish
   * @param logger - Optional logger instance
   * @param telemetry - Optional telemetry provider for metrics
   * @returns Number of clients the event was sent to
   */
  static publishEvent(
    event: SSEEvent,
    logger?: IgniterLogger,
    telemetry?: IgniterTelemetryProvider | null,
  ): number {
    const childLogger = logger?.child("SSEProcessor");

    const { channel } = event;

    // Validate channel exists
    if (!this.channelExists(channel)) {
      childLogger?.warn("Channel not found for publish", { channel });
      return 0;
    }

    const connections = this.connections.get(channel);
    if (!connections || connections.size === 0) {
      childLogger?.debug("No connections, event skipped", { channel });
      // No active connections for this channel
      return 0;
    }

    childLogger?.debug("Event published", {
      channel,
      connectionCount: connections.size,
      event_type: event.type,
      event_id: event.id,
      has_scopes: !!event.scopes && event.scopes.length > 0,
    });

    // Add timestamp if not present
    if (
      typeof event.data === "object" &&
      event.data !== null &&
      !("timestamp" in event.data)
    ) {
      event.data.timestamp = new Date().toISOString();
    }

    // Add unique ID if not provided
    if (!event.id) {
      event.id = crypto.randomUUID();
    }

    // Create a copy of the connections to avoid concurrent modification issues
    const connectionsToNotify = [...connections];

    // Send to all connections subscribed to this channel
    let sentCount = 0;
    const deadConnections: SSEConnectionHandler[] = [];

    for (const connection of connectionsToNotify) {
      try {
        connection.handler(event);
        sentCount++;
      } catch (error) {
        childLogger?.warn("Event send failed", { error });

        // Check if error is related to closed controller
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("closed") ||
          errorMessage.includes("Invalid state")
        ) {
          childLogger?.debug("Connection closed, removing", { channel });
          deadConnections.push(connection);
        }
      }
    }

    // Clean up dead connections
    if (deadConnections.length > 0) {
      for (const deadConnection of deadConnections) {
        connections.delete(deadConnection);
      }
      childLogger?.debug("Dead connections removed", {
        channel,
        removedCount: deadConnections.length,
        remainingCount: connections.size,
      });
    }

    // Record SSE event metrics
    TelemetryManagerProcessor.recordSSEEvent(
      telemetry,
      channel,
      event.type || "message",
      sentCount,
      logger,
    );

    return sentCount;
  }

  /**
   * Broadcast an event to multiple channels
   *
   * @param event - Base event to broadcast
   * @param channels - Channel IDs to broadcast to
   * @param logger - Optional logger instance
   * @returns Total number of clients the event was sent to
   */
  static broadcastEvent(
    event: Omit<SSEEvent, "channel">,
    channels: string[],
    logger?: IgniterLogger,
  ): number {
    let totalSent = 0;

    for (const channel of channels) {
      totalSent += this.publishEvent(
        {
          ...event,
          channel,
        },
        logger,
      );
    }

    return totalSent;
  }

  /**
   * Close all connections and cleanup resources
   * @param logger - Optional logger instance
   */
  static closeAllConnections(logger?: IgniterLogger): void {
    const childLogger = logger?.child("RouteResolverProcessor");

    childLogger?.debug("All SSE connections closing");

    // Get connection counts before cleanup
    const channelCounts = Array.from(this.connections.entries()).map(
      ([channel, conns]) => `${channel}: ${conns.size}`,
    );
    childLogger?.debug("Current connections before cleanup", {
      channelCounts: channelCounts.join(", "),
    });

    // Clear all connection handlers
    this.connections.clear();

    // Close all active streams
    let closedCount = 0;
    this.activeStreams.forEach((stream) => {
      try {
        if (stream.locked && "cancel" in stream) {
          // @ts-ignore - TypeScript doesn't recognize cancel method but it exists
          stream.cancel("Server is shutting down all connections.");
          closedCount++;
        }
      } catch (error) {
        childLogger?.error("SSE stream closure failed", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    childLogger?.debug("Closed active streams", { closedCount });
    this.activeStreams.clear();
  }

  /**
   * Cleanup dead connections for all channels
   * This method can be called periodically to remove closed connections
   * @param logger - Optional logger instance
   */
  static cleanupDeadConnections(logger?: IgniterLogger): number {
    const childLogger = logger?.child("RouteResolverProcessor");

    let totalRemoved = 0;

    childLogger?.debug("Dead connection cleanup started");
    for (const [channel, connections] of this.connections.entries()) {
      const beforeCount = connections.size;

      // Test each connection with a harmless ping event
      const deadConnections: SSEConnectionHandler[] = [];
      connections.forEach((connection) => {
        try {
          // Create a ping event just to test the connection
          const pingEvent: SSEEvent = {
            channel,
            type: "ping",
            data: { timestamp: new Date().toISOString() },
          };

          // Try to send it - this will throw if the connection is dead
          connection.handler(pingEvent);
        } catch {
          deadConnections.push(connection);
        }
      });

      // Remove dead connections
      deadConnections.forEach((connection) => {
        connections.delete(connection);
      });

      const removed = beforeCount - connections.size;
      if (removed > 0) {
        childLogger?.debug("Dead connections cleaned up", {
          channel,
          removedCount: removed,
        });
        totalRemoved += removed;
      }
    }

    childLogger?.debug("Dead connection cleanup completed", { totalRemoved });
    return totalRemoved;
  }

  /**
   * Encode an SSE message in the proper format
   *
   * @param options - Message options
   * @returns Encoded message as Uint8Array
   */
  public static encodeSSEMessage(options: {
    id?: string;
    event?: string;
    data?: string;
    retry?: number;
  }): Uint8Array {
    const encoder = new TextEncoder();
    let message = "";

    // Add ID field if provided
    if (options.id) {
      message += `id: ${options.id}\n`;
    }

    // Add event type if provided
    if (options.event) {
      message += `event: ${options.event}\n`;
    }

    // Add retry interval if provided
    if (options.retry) {
      message += `retry: ${options.retry}\n`;
    }

    // Add data if provided
    if (options.data) {
      // Split data by newlines and prefix each line with "data: "
      const lines = options.data.split("\n");
      for (const line of lines) {
        message += `data: ${line}\n`;
      }
    }

    // End message with a blank line
    message += "\n";

    return encoder.encode(message);
  }
}

/**
 * Re-export the encodeSSEMessage function for external use
 */
export function encodeSSEMessage(options: {
  id?: string;
  event?: string;
  data?: any;
  retry?: number;
}): Uint8Array {
  // Ensure data is stringified if it's an object
  const processedOptions = { ...options };
  if (
    typeof processedOptions.data === "object" &&
    processedOptions.data !== null
  ) {
    processedOptions.data = JSON.stringify(processedOptions.data);
  }

  return SSEProcessor.encodeSSEMessage(processedOptions);
}
