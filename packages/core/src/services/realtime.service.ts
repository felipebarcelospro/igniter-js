import { SSEProcessor, type SSEChannel } from "../processors/sse.processor";
import { generateQueryKey } from "../utils/queryKey";
import type {
  IgniterRealtimeService as IgniterRealtimeServiceType,
  RealtimeBuilder,
  RealtimeEventPayload,
  RevalidationTarget,
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
   * Triggers a refetch on the client for one or more queries.
   * This is the primary mechanism for keeping client-side data in sync
   * with server-side changes.
   *
   * @param targets - A single revalidation target or an array of them.
   * @returns A promise that resolves when the revalidation event is published.
   */
  async revalidate(
    targets: RevalidationTarget | RevalidationTarget[],
  ): Promise<void> {
    const targetsArray = Array.isArray(targets) ? targets : [targets];

    const eventsToPublish = new Map<string, { queryKeys: string[], data?: unknown }>();

    for (const target of targetsArray) {
      const { path, params, query, scopes, data } = target;
      const [controller, action] = path.split('.');

      if (!controller || !action) {
        // Potentially log this error, but don't throw, to allow other valid targets to proceed
        console.error(`[IgniterRealtimeService] Invalid path format in revalidate target: "${path}"`);
        continue;
      }

      const input = {
        ...(params && { params }),
        ...(query && { query }),
      };

      const queryKey = generateQueryKey(controller, action, Object.keys(input).length > 0 ? input : undefined);

      // Group by scopes to send minimal number of events
      const scopeKey = (scopes || []).sort().join(',');

      if (!eventsToPublish.has(scopeKey)) {
        eventsToPublish.set(scopeKey, { queryKeys: [] });
      }

      const eventData = eventsToPublish.get(scopeKey)!;
      eventData.queryKeys.push(queryKey);

      // If data is provided, attach it. We'll use the data from the first target with data for a given scope group.
      if (data !== undefined && eventData.data === undefined) {
        eventData.data = data;
      }
    }

    // Register revalidation channel if it doesn't exist
    if (!SSEProcessor.channelExists('revalidation')) {
      SSEProcessor.registerChannel({
        id: 'revalidation',
        description: 'Channel for query revalidation events',
      });
    }

    // Publish one event per scope group
    for (const [scopeKey, eventPayload] of eventsToPublish.entries()) {
      const scopes = scopeKey ? scopeKey.split(',') : undefined;

      SSEProcessor.publishEvent({
        channel: 'revalidation',
        type: 'revalidate',
        scopes: scopes,
        data: {
          queryKeys: eventPayload.queryKeys,
          data: eventPayload.data,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
