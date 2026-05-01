import type { IgniterLogger } from "../../types";
import type { IgniterRealtimeEvent, IgniterRealtimeTransport } from "../../types/realtime.interface";

export interface SSEChannel {
  id: string;
  description?: string;
}

type SSEConnectionHandler = {
  connectionId: string;
  handler: (event: IgniterRealtimeEvent) => void;
  channels: string[];
};

export class IgniterSSETransport implements IgniterRealtimeTransport {
  public readonly name = "sse" as const;

  private readonly connections: Map<string, Set<SSEConnectionHandler>> = new Map();
  private readonly activeStreams: Set<ReadableStream> = new Set();
  private readonly logger?: IgniterLogger;

  constructor(logger?: IgniterLogger) {
    this.logger = logger?.child("IgniterSSETransport");
  }

  async openConnection(
    request: Request,
    options: {
      connectionId: string;
      channels: string[];
      scopes?: string[];
      headers?: Record<string, string>;
      keepAliveInterval?: number;
      onClose?: (reason?: string) => void;
      onKeepAlive?: () => void;
    },
  ): Promise<Response> {
    const {
      connectionId,
      channels,
      headers = {},
      keepAliveInterval = 30000,
      onClose,
      onKeepAlive,
    } = options;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start: (controller) => {
        const initialMessage = encodeSSEMessage({
          event: "connected",
          data: JSON.stringify({
            connected: true,
            channels,
            timestamp: new Date().toISOString(),
          }),
        });
        controller.enqueue(initialMessage);

        const connectionHandler = (event: IgniterRealtimeEvent) => {
          try {
            if (!channels.includes(event.channel)) {
              return;
            }

            const message = encodeSSEMessage({
              id: event.id || crypto.randomUUID(),
              event: event.type || "message",
              data: JSON.stringify({
                channel: event.channel,
                data: event.data,
                timestamp: event.timestamp || new Date().toISOString(),
              }),
            });

            controller.enqueue(message);
          } catch (error) {
            this.logger?.warn("Event delivery failed", { connectionId, error });
          }
        };

        for (const channel of channels) {
          if (!this.connections.has(channel)) {
            this.connections.set(channel, new Set());
          }
          this.connections.get(channel)!.add({
            connectionId,
            handler: connectionHandler,
            channels,
          });
        }

        const keepAliveTimer = setInterval(() => {
          if (controller.desiredSize === null) {
            clearInterval(keepAliveTimer);
            return;
          }

          onKeepAlive?.();
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        }, keepAliveInterval);

        const cleanup = () => {
          clearInterval(keepAliveTimer);
          onClose?.();
          for (const channel of channels) {
            const handlers = this.connections.get(channel);
            if (!handlers) continue;
            for (const handler of handlers) {
              if (handler.connectionId === connectionId) {
                handlers.delete(handler);
              }
            }
            if (handlers.size === 0) {
              this.connections.delete(channel);
            }
          }
        };

        return cleanup;
      },
      cancel: (reason) => {
        onClose?.(String(reason));
        for (const channel of channels) {
          const handlers = this.connections.get(channel);
          if (!handlers) continue;
          for (const handler of handlers) {
            if (handler.connectionId === connectionId) {
              handlers.delete(handler);
            }
          }
          if (handlers.size === 0) {
            this.connections.delete(channel);
          }
        }
      },
    });

    this.activeStreams.add(stream);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        ...headers,
      },
    });
  }

  publish(event: IgniterRealtimeEvent): number {
    const handlers = this.connections.get(event.channel);
    if (!handlers || handlers.size === 0) {
      return 0;
    }

    let sent = 0;
    for (const handler of handlers) {
      try {
        handler.handler(event);
        sent += 1;
      } catch (error) {
        this.logger?.warn("Event send failed", { error });
      }
    }

    return sent;
  }

  closeAll(): void {
    this.connections.clear();
    for (const stream of this.activeStreams) {
      try {
        if (stream.locked && "cancel" in stream) {
          stream.cancel?.("Closing all SSE connections.");
        }
      } catch (error) {
        this.logger?.warn("Failed to close SSE stream", { error });
      }
    }
    this.activeStreams.clear();
  }
}

export function encodeSSEMessage(options: {
  id?: string;
  event?: string;
  data?: string;
  retry?: number;
}): Uint8Array {
  const encoder = new TextEncoder();
  let message = "";

  if (options.id) {
    message += `id: ${options.id}\n`;
  }

  if (options.event) {
    message += `event: ${options.event}\n`;
  }

  if (options.retry) {
    message += `retry: ${options.retry}\n`;
  }

  if (options.data) {
    const lines = options.data.split("\n");
    for (const line of lines) {
      message += `data: ${line}\n`;
    }
  }

  message += "\n";
  return encoder.encode(message);
}
