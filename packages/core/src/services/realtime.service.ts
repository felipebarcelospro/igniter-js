import { SSEProcessor, type SSEChannel } from "../processors/sse.processor";
import type {
  IgniterRealtimeService as IgniterRealtimeServiceType,
  RealtimeBuilder,
  RealtimeEventPayload,
} from "../types";
import type { IgniterStoreAdapter } from "../types/store.interface";
import { IgniterError } from "../error";

/**
 * Type-safe, fluent RealtimeBuilder implementation for Igniter.js.
 *
 * @typeParam TContext - The context type available to event scopes.
 *
 * @example
 * // Basic usage: send a message to a channel
 * await realtime.to("chat:room-123")
 *   .withType("message")
 *   .withData({ text: "Hello world!" })
 *   .publish();
 *
 * @example
 * // Add a custom event ID and description
 * await realtime.to("notifications")
 *   .withId("evt-001")
 *   .withType("user-joined")
 *   .withDescription("A user joined the room")
 *   .withData({ userId: "abc" })
 *   .publish();
 *
 * @example
 * // Use dynamic scopes for fine-grained delivery
 * await realtime.to("secure-channel")
 *   .withScopes(async (ctx) => ctx.user?.roles ?? [])
 *   .withData({ secret: "42" })
 *   .publish();
 */
class RealtimeBuilderImpl<TContext = unknown> implements RealtimeBuilder<TContext> {
  private payload: RealtimeEventPayload;
  private readonly store: IgniterStoreAdapter;

  /**
   * @param store - The store adapter for event publishing (reserved for future use).
   * @param initial - The initial payload for the realtime event.
   */
  constructor(store: IgniterStoreAdapter, initial: RealtimeEventPayload) {
    this.store = store;
    this.payload = { ...initial };
  }

  /**
   * Set the data payload for the event.
   *
   * @param data - Any serializable data to send.
   * @returns A new builder instance with the updated data.
   *
   * @example
   * realtime.to("updates").withData({ foo: 1 })
   */
  withData(data: unknown): RealtimeBuilder<TContext> {
    return new RealtimeBuilderImpl(this.store, { ...this.payload, data });
  }

  /**
   * Set the event type (e.g., "message", "update").
   *
   * @param type - The event type string.
   * @returns A new builder instance with the updated type.
   *
   * @example
   * realtime.to("chat").withType("message")
   */
  withType(type: string): RealtimeBuilder<TContext> {
    return new RealtimeBuilderImpl(this.store, { ...this.payload, type });
  }

  /**
   * Set a custom event ID.
   *
   * @param id - The unique event identifier.
   * @returns A new builder instance with the updated ID.
   *
   * @example
   * realtime.to("log").withId("evt-123")
   */
  withId(id: string): RealtimeBuilder<TContext> {
    return new RealtimeBuilderImpl(this.store, { ...this.payload, id });
  }

  /**
   * Change the target channel for this event.
   *
   * @param channel - The channel name.
   * @returns A new builder instance with the updated channel.
   *
   * @example
   * realtime.to("foo").withChannel("bar")
   */
  withChannel(channel: string): RealtimeBuilder<TContext> {
    return new RealtimeBuilderImpl(this.store, { ...this.payload, channel });
  }

  /**
   * Set a human-readable description for the event.
   *
   * @param description - The event description.
   * @returns A new builder instance with the updated description.
   *
   * @example
   * realtime.to("alerts").withDescription("Critical system alert")
   */
  withDescription(description: string): RealtimeBuilder<TContext> {
    return new RealtimeBuilderImpl(this.store, { ...this.payload, description });
  }

  /**
   * Set dynamic scopes for the event, restricting delivery to certain users/contexts.
   *
   * @param scopes - A function that returns a list of scopes (sync or async).
   * @returns A new builder instance with the updated scopes.
   *
   * @example
   * realtime.to("private")
   *   .withScopes(ctx => [ctx.user.id])
   *   .withData({ secret: "shh" })
   */
  withScopes(
    scopes: (context: TContext) => Promise<string[]> | string[]
  ): RealtimeBuilder<TContext> {
    return new RealtimeBuilderImpl(this.store, { ...this.payload, scopes });
  }

  /**
   * Publish the constructed event to the specified channel.
   *
   * - Registers the channel if it does not exist.
   * - Throws if the channel is not set.
   *
   * @returns Promise that resolves when the event is published.
   *
   * @throws Error if the channel is not set.
   *
   * @example
   * await realtime.to("news").withData({ headline: "..." }).publish();
   */
  async publish(): Promise<void> {
    if (!this.payload.channel) {
      throw new Error("[RealtimeBuilder] Channel is required to publish an event.");
    }
    if (!SSEProcessor.channelExists(this.payload.channel)) {
      SSEProcessor.registerChannel({
        id: this.payload.channel,
        description: this.payload.description || `Realtime events for ${this.payload.channel}`,
      });
    }
    SSEProcessor.publishEvent({
      channel: this.payload.channel,
      data: this.payload.data,
      type: this.payload.type,
      id: this.payload.id,
    });
  }
}

/**
 * IgniterRealtimeService provides a type-safe, developer-friendly API for realtime event publishing.
 *
 * @typeParam TContext - The context type available to event scopes.
 *
 * @example
 * // Create the service (usually injected via builder)
 * const realtime = new IgniterRealtimeService(store);
 *
 * // Publish a simple event
 * await realtime.publish("chat:room-1", { text: "Hi!" });
 *
 * // Use the fluent builder for more control
 * await realtime
 *   .to("chat:room-1")
 *   .withType("message")
 *   .withData({ text: "Hello" })
 *   .publish();
 *
 * // Broadcast to all channels
 * await realtime.broadcast({ system: "maintenance" });
 */
export class IgniterRealtimeService<TContext = any>
  implements IgniterRealtimeServiceType<TContext>
{
  private readonly store: IgniterStoreAdapter;

  /**
   * Construct a new IgniterRealtimeService.
   *
   * @param store - The store adapter for event publishing (reserved for future use).
   *
   * @example
   * const realtime = new IgniterRealtimeService(store);
   */
  constructor(store: IgniterStoreAdapter) {
    this.store = store;
  }

  /**
   * Publish an event to a specific channel.
   *
   * - Registers the channel if it does not exist.
   * - You can provide additional event metadata (type, id, description, scopes).
   *
   * @param channel - The channel to publish the event to.
   * @param data - The data payload of the event.
   * @param options - Optional event metadata (excluding channel and data).
   * @returns Promise that resolves when the event is published.
   *
   * @example
   * await realtime.publish("chat:room-1", { text: "Hello" });
   *
   * @example
   * await realtime.publish("alerts", { msg: "!" }, { type: "warning", id: "evt-42" });
   */
  async publish(
    channel: string,
    data: unknown,
    options?: Omit<RealtimeEventPayload<TContext>, "channel" | "data">
  ): Promise<void> {
    if (!SSEProcessor.channelExists(channel)) {
      SSEProcessor.registerChannel({
        id: channel,
        description: options?.description || `Realtime events for ${channel}`,
      });
    }
    SSEProcessor.publishEvent({
      channel,
      data: data,
      type: options?.type,
      id: options?.id,
    });
  }

  /**
   * Create a fluent RealtimeBuilder for a specific channel.
   *
   * - Allows chaining methods to set event properties before publishing.
   * - Encouraged for advanced use cases and best DX.
   *
   * @param channel - The channel to target for the realtime event.
   * @returns A RealtimeBuilder instance for chaining event properties and publishing.
   *
   * @example
   * await realtime
   *   .to("chat:room-1")
   *   .withType("message")
   *   .withData({ text: "Hello" })
   *   .publish();
   */
  to(channel: string): RealtimeBuilder<TContext> {
    return new RealtimeBuilderImpl(this.store, { channel });
  }

  /**
   * Broadcast data to all registered channels.
   *
   * - Useful for system-wide notifications or global events.
   *
   * @param data - The data payload to broadcast.
   * @returns Promise that resolves when the broadcast is complete.
   *
   * @example
   * await realtime.broadcast({ system: "maintenance" });
   */
  async broadcast(data: unknown): Promise<void> {
    const channels = SSEProcessor.getRegisteredChannels() || [];
    await Promise.all(
      channels.map((channel: SSEChannel) => this.publish(channel.id, data))
    );
  }

  /**
   * Revalidate data for a specific query key.
   *
   * @param queryKeys - The query key to revalidate.
   * @param scopes - The scopes to revalidate.
   * @param data - The data to revalidate.
   */
  async revalidate(params: {
    queryKeys: string | string[],
    scopes?: string[],
    data?: unknown
  }): Promise<void> {
    // Use IgniterError for validation errors
    if (!params || typeof params !== 'object') {
      throw new IgniterError({
        message: 'revalidate: params must be an object',
        code: 'REVALIDATE_INVALID_PARAMS',
      });
    }

    if (
      !('queryKeys' in params) ||
      params.queryKeys === undefined ||
      params.queryKeys === null ||
      (typeof params.queryKeys !== 'string' && !Array.isArray(params.queryKeys))
    ) {
      throw new IgniterError({
        message: 'revalidate: params.queryKeys must be a string or an array of strings',
        code: 'REVALIDATE_INVALID_QUERYKEYS',
        details: { queryKeys: params.queryKeys }
      });
    }

    if (Array.isArray(params.queryKeys)) {
      if (!params.queryKeys.every(key => typeof key === 'string')) {
        throw new IgniterError({
          message: 'revalidate: all queryKeys must be strings',
          code: 'REVALIDATE_INVALID_QUERYKEYS_TYPE',
          details: { queryKeys: params.queryKeys }
        });
      }
    }

    if (params.scopes !== undefined) {
      if (!Array.isArray(params.scopes)) {
        throw new IgniterError({
          message: 'revalidate: params.scopes must be an array of strings if provided',
          code: 'REVALIDATE_INVALID_SCOPES',
          details: { scopes: params.scopes }
        });
      }
      if (!params.scopes.every(scope => typeof scope === 'string')) {
        throw new IgniterError({
          message: 'revalidate: all scopes must be strings',
          code: 'REVALIDATE_INVALID_SCOPES_TYPE',
          details: { scopes: params.scopes }
        });
      }
    }

    const keysArray = Array.isArray(params.queryKeys) ? params.queryKeys : [params.queryKeys];

    // Register revalidation channel if it doesn't exist
    if (!SSEProcessor.channelExists('revalidation')) {
      SSEProcessor.registerChannel({
        id: 'revalidation',
        description: 'Channel for query revalidation events',
      });
    }

    SSEProcessor.publishEvent({
      channel: 'revalidation',
      type: 'revalidate',
      scopes: params.scopes, // Use subscribers for scoped revalidation
      data: { 
        queryKeys: keysArray, 
        data: params.data, 
        timestamp: new Date().toISOString() 
      },
    });
  }
}