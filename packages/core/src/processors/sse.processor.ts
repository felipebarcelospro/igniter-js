import { IgniterLogLevel, type IgniterLogger } from "../types";
import { IgniterError } from "../error";
import { IgniterConsoleLogger } from "../services/logger.service";
import { resolveLogLevel, createLoggerContext } from "../utils/logger";

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
  private static _logger: IgniterLogger;

  private static get logger(): IgniterLogger {
    if (!this._logger) {
      this._logger = IgniterConsoleLogger.create({
        level: resolveLogLevel(),
        context: createLoggerContext('SSE'),
        showTimestamp: true,
      });
    }
    return this._logger;
  }

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
   * @throws {IgniterError} When channel already exists
   */
  static registerChannel(channel: SSEChannel): void {
    if (this.channels.has(channel.id)) {
      this.logger.warn(
        "Channel already exists",
        { channelId: channel.id }
      );
    }

    this.logger.debug("Channel registered", { channelId: channel.id, description: channel.description });
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
   */
  static unregisterChannel(channelId: string): void {
    if (!this.channels.has(channelId)) {
      this.logger.warn(
        "Channel not found for unregister",
        { channelId }
      );
      return;
    }

    this.logger.debug("Channel unregistered", { channelId });

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

      this.logger.debug("Channel closure notified", { channelId, connectionCount: connections.size });
      connections.forEach((handler) => {
        try {
          handler.handler(closeEvent);
        } catch (error) {
          this.logger.error(
            "Channel closure notification failed",
            { channelId, error }
          );
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
   * @returns SSE response stream
   * @throws {IgniterError} When channel validation fails
   */
  static async handleConnection(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const channelsParam = url.searchParams.get("channels");
    const channels = channelsParam ? channelsParam.split(",") : [];
    const scopesParam = url.searchParams.get("scopes");
    const scopes = scopesParam ? scopesParam.split(",") : [];

    this.logger.debug("SSE connection requested", {
      requested_channels: channels,
      requested_scopes: scopes,
      from_ip: request.headers.get('x-forwarded-for')
    });

    // Validate that requested channels exist
    for (const channel of channels) {
      if (!this.channelExists(channel)) {
        this.logger.error("SSE connection refused", {
          requestedChannel: channel,
          availableChannels: this.getRegisteredChannels().map((c) => c.id),
          reason: "channel not registered"
        });
        throw new IgniterError({
          code: "INVALID_SSE_CHANNEL",
          message: `Channel '${channel}' is not registered`,
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

    // Create and return the SSE stream
    return this.createSSEStream({
      channels: targetChannels,
      keepAliveInterval: 30000, // 30 seconds default
      scopes,
    });
  }

  /**
   * Create an SSE stream for specific channels
   *
   * @param options - Stream configuration options
   * @returns Response object with SSE stream
   */
  private static createSSEStream(options: SSEStreamOptions): Response {
    const { channels, keepAliveInterval = 30000, headers = {}, scopes } = options;
    const encoder = new TextEncoder();
    const connectionId = crypto.randomUUID();

    // Create a new ReadableStream for SSE
    const stream = new ReadableStream({
      start: (controller) => {
        this.logger.debug(
          "SSE stream initialized", {
            connectionId,
            channels: channels.join(", "),
            scopes: scopes?.join(", "),
            keep_alive_ms: keepAliveInterval
          }
        );

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
              // This indicates the client has disconnected. The 'cancel' method will handle cleanup.
              throw new Error("Controller is closed");
            }

            // 🔥 FILTRO PRINCIPAL - Subscriber filtering
            if (event.scopes && event.scopes.length > 0) {
              // Se o evento tem lista de subscribers específicos
              if (!scopes || !event.scopes.some(scope => scopes.includes(scope))) {
                this.logger.debug("Event scope filtering applied", {
                  connectionId,
                  channel: event.channel,
                  event_scopes: event.scopes,
                  connection_scopes: scopes
                });
                return; // 🚫 Não envia se o client não está na lista
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
              })
            });

            this.logger.debug("Event sent", {
              connectionId,
              channel: event.channel,
              event_type: event.type,
              event_id: event.id
            });
            controller.enqueue(message);
          } catch (error) {
            this.logger.warn("Event delivery failed", { connectionId, error });

            // Don't rethrow the error - we'll handle cleanup elsewhere
            // This prevents the error from bubbling up
          }
        };

        // Register this connection handler with each requested channel
        for (const channel of channels) {
          if (this.connections.has(channel)) {
            const channelConnections = this.connections.get(channel)!;
            channelConnections.add({
              handler: connectionHandler,
              scopes,
              metadata: { connectedAt: Date.now() }
            });
            this.logger.debug(
              "Client subscribed",
              { channel, connectionCount: channelConnections.size }
            );
          }
        }

        // Set up keep-alive interval
        const keepAliveTimer = setInterval(() => {
          try {
            // Check if controller is still active
            if (controller.desiredSize === null) {
              this.logger.debug("Controller closed, stopping keep-alive", { connectionId });
              clearInterval(keepAliveTimer);
              return;
            }

            // Send comment as keep-alive to prevent connection timeout
            this.logger.debug("Keep-alive ping sent", { connectionId });
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          } catch (error) {
            // Connection might be closed already, clear interval
            this.logger.warn("Keep-alive failed, cleaning up timer", { connectionId, error });
            clearInterval(keepAliveTimer);
          }
        }, keepAliveInterval);

        // Return cleanup function
        return () => {
          this.logger.debug(
            "Closing SSE connection",
            { connectionId, channels: channels.join(", ") }
          );
          clearInterval(keepAliveTimer);

          // Unregister this connection handler from all channels
          for (const channel of channels) {
            if (this.connections.has(channel)) {
              const channelConnections = this.connections.get(channel)!;
              channelConnections.delete({
                handler: connectionHandler,
                scopes,
                metadata: { connectedAt: Date.now() }
              });
              this.logger.debug(
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
   * @returns Number of clients the event was sent to
   */
  static publishEvent(event: SSEEvent): number {
    const { channel } = event;

    // Validate channel exists
    if (!this.channelExists(channel)) {
      this.logger.warn(
          "Channel not found for publish",
          { channel }
        );
      return 0;
    }

    const connections = this.connections.get(channel);
    if (!connections || connections.size === 0) {
      this.logger.debug("No connections, event skipped", { channel });
      // No active connections for this channel
      return 0;
    }

    this.logger.debug(
      "Event published", {
        channel,
        connectionCount: connections.size,
        event_type: event.type,
        event_id: event.id,
        has_scopes: !!event.scopes && event.scopes.length > 0
      }
    );

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
        this.logger.warn("Event send failed", { error });

        // Check if error is related to closed controller
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("closed") || errorMessage.includes("Invalid state")) {
          this.logger.debug("Connection closed, removing", { channel });
          deadConnections.push(connection);
        }
      }
    }

    // Clean up dead connections
    if (deadConnections.length > 0) {
      for (const deadConnection of deadConnections) {
        connections.delete(deadConnection);
      }
      this.logger.debug("Dead connections removed", { 
        channel, 
        removedCount: deadConnections.length, 
        remainingCount: connections.size 
      });
    }

    return sentCount;
  }

  /**
   * Broadcast an event to multiple channels
   *
   * @param event - Base event to broadcast
   * @param channels - Channel IDs to broadcast to
   * @returns Total number of clients the event was sent to
   */
  static broadcastEvent(
    event: Omit<SSEEvent, "channel">,
    channels: string[],
  ): number {
    let totalSent = 0;

    for (const channel of channels) {
      totalSent += this.publishEvent({
        ...event,
        channel,
      });
    }

    return totalSent;
  }

  /**
   * Close all connections and cleanup resources
   */
  static closeAllConnections(): void {
    this.logger.debug("All SSE connections closing");

    // Get connection counts before cleanup
    const channelCounts = Array.from(this.connections.entries()).map(([channel, conns]) =>
      `${channel}: ${conns.size}`
    );
    this.logger.debug("Current connections before cleanup", { channelCounts: channelCounts.join(', ') });

    // Clear all connection handlers
    this.connections.clear();

    // Close all active streams
    let closedCount = 0;
    this.activeStreams.forEach(stream => {
      try {
        if (stream.locked && 'cancel' in stream) {
          // @ts-ignore - TypeScript doesn't recognize cancel method but it exists
          stream.cancel("Server is shutting down all connections.");
          closedCount++;
        }
      } catch (error) {
        this.logger.error("SSE stream closure failed", { error });
      }
    });

    this.logger.debug("Closed active streams", { closedCount });
    this.activeStreams.clear();
  }

  /**
   * Cleanup dead connections for all channels
   * This method can be called periodically to remove closed connections
   */
  static cleanupDeadConnections(): number {
    let totalRemoved = 0;

    this.logger.debug("Dead connection cleanup started");
    for (const [channel, connections] of this.connections.entries()) {
      const beforeCount = connections.size;

      // Test each connection with a harmless ping event
      const deadConnections: SSEConnectionHandler[] = [];
      connections.forEach(connection => {
        try {
          // Create a ping event just to test the connection
          const pingEvent: SSEEvent = {
            channel,
            type: 'ping',
            data: { timestamp: new Date().toISOString() }
          };

          // Try to send it - this will throw if the connection is dead
          connection.handler(pingEvent);
        } catch (error) {
          deadConnections.push(connection);
        }
      });

      // Remove dead connections
      deadConnections.forEach(connection => {
        connections.delete(connection);
      });

      const removed = beforeCount - connections.size;
      if (removed > 0) {
        this.logger.debug("Dead connections cleaned up", { channel, removedCount: removed });
        totalRemoved += removed;
      }
    }

    this.logger.debug("Dead connection cleanup completed", { totalRemoved });
    return totalRemoved;
  }

  /**
   * Encode an SSE message in the proper format
   *
   * @param options - Message options
   * @returns Encoded message as Uint8Array
   * @private
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

  return SSEProcessor.encodeSSEMessage(processedOptions as any);
}
