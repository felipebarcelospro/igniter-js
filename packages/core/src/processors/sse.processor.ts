import { IgniterLogLevel, type IgniterLogger } from "../types";
import { IgniterError } from "../error";
import { IgniterConsoleLogger } from "../services/logger.service";

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
  private static logger: IgniterLogger = IgniterConsoleLogger.create({
    level: process.env.IGNITER_LOG_LEVEL as IgniterLogLevel || IgniterLogLevel.INFO,
    context: {
      processor: 'RequestProcessor',
      component: 'SSE'
    },
    showTimestamp: true,
  })

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
        `Channel '${channel.id}' is already registered. Metadata will be updated.`,
      );
    }

    this.logger.info(`Registering SSE channel: '${channel.id}'`, { description: channel.description });
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
        `Attempted to unregister a non-existent channel: '${channelId}'`,
      );
      return;
    }

    this.logger.info(`Unregistering channel: ${channelId}`);

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

      this.logger.info(`Notifying ${connections.size} client(s) about closure of channel '${channelId}'.`);
      connections.forEach((handler) => {
        try {
          handler.handler(closeEvent);
        } catch (error) {
          this.logger.error(
            `Error while notifying a connection about channel closure for '${channelId}'.`,
            { error },
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
    
    this.logger.info(`New SSE connection request received.`, {
      requested_channels: channels,
      requested_scopes: scopes,
      from_ip: request.headers.get('x-forwarded-for')
    });

    // Validate that requested channels exist
    for (const channel of channels) {
      if (!this.channelExists(channel)) {
        this.logger.error(`SSE connection refused: Requested channel '${channel}' is not registered.`, {
          requestedChannel: channel,
          availableChannels: this.getRegisteredChannels().map((c) => c.id),
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
        this.logger.info(
          `SSE stream started for connection '${connectionId}'.`, {
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
                this.logger.debug(`Event on channel '${event.channel}' filtered out for connection '${connectionId}' due to scope mismatch.`, {
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
            
            this.logger.debug(`Sending event to connection '${connectionId}'.`, {
              channel: event.channel,
              event_type: event.type,
              event_id: event.id
            });
            controller.enqueue(message);
          } catch (error) {
            this.logger.warn(`Failed to send event to client on connection '${connectionId}'. The connection may have been closed.`, { error });
            
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
            this.logger.info(
              `Client subscribed to channel '${channel}' (${channelConnections.size} connections)`,
            );
          }
        }

        // Set up keep-alive interval
        const keepAliveTimer = setInterval(() => {
          try {
            // Check if controller is still active
            if (controller.desiredSize === null) {
              this.logger.info(`Controller is closed, stopping keep-alive for connection '${connectionId}'.`);
              clearInterval(keepAliveTimer);
              return;
            }
            
            // Send comment as keep-alive to prevent connection timeout
            this.logger.debug(`Sending keep-alive ping to connection '${connectionId}'.`);
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          } catch (error) {
            // Connection might be closed already, clear interval
            this.logger.warn(`Error during keep-alive for connection '${connectionId}', cleaning up timer.`, { error });
            clearInterval(keepAliveTimer);
          }
        }, keepAliveInterval);

        // Return cleanup function
        return () => {
          this.logger.info(
            `Closing SSE connection '${connectionId}' for channels: ${channels.join(", ")}`,
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
              this.logger.info(
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
        `Attempting to publish to an unknown or unregistered SSE channel: '${channel}', event will be dropped.`,
      );
      return 0;
    }

    const connections = this.connections.get(channel);
    if (!connections || connections.size === 0) {
      this.logger.debug(`No active connections on channel '${channel}', event will not be sent.`);
      // No active connections for this channel
      return 0;
    }

    this.logger.info(
      `Publishing event to ${connections.size} connection(s) on channel '${channel}'.`, {
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
        this.logger.warn(`Error sending event to a client, it might have disconnected.`, { error });
        
        // Check if error is related to closed controller
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("closed") || errorMessage.includes("Invalid state")) {
          this.logger.info(`Detected closed connection, removing from channel '${channel}'`);
          deadConnections.push(connection);
        }
      }
    }
    
    // Clean up dead connections
    if (deadConnections.length > 0) {
      for (const deadConnection of deadConnections) {
        connections.delete(deadConnection);
      }
      this.logger.info(`Removed ${deadConnections.length} dead connections from channel '${channel}'. Remaining: ${connections.size}`);
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
    this.logger.info(`Closing all SSE connections and streams.`);
    
    // Get connection counts before cleanup
    const channelCounts = Array.from(this.connections.entries()).map(([channel, conns]) => 
      `${channel}: ${conns.size}`
    );
    this.logger.info(`Current connections before cleanup: ${channelCounts.join(', ')}`);
    
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
        this.logger.error(`Error while closing an active SSE stream:`, { error });
      }
    });
    
    this.logger.info(`Closed ${closedCount} active streams.`);
    this.activeStreams.clear();
  }
  
  /**
   * Cleanup dead connections for all channels
   * This method can be called periodically to remove closed connections
   */
  static cleanupDeadConnections(): number {
    let totalRemoved = 0;
    
    this.logger.debug("Starting periodic cleanup of dead SSE connections...");
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
        this.logger.info(`Cleaned up ${removed} dead connection(s) from channel '${channel}'.`);
        totalRemoved += removed;
      }
    }
    
    this.logger.debug(`Dead connection cleanup finished. Total removed: ${totalRemoved}.`);
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
