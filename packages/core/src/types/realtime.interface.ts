/**
 * Type-safe builder for realtime events.
 * Provides a fluent API to construct and publish realtime events to a channel.
 */
export interface RealtimeBuilder<TContext = any> {
  /**
   * Sets the data payload for the realtime event.
   * @param data - The data to send with the event.
   * @returns A new RealtimeBuilder instance with the updated data.
   */
  withData(data: unknown): RealtimeBuilder<TContext>;

  /**
   * Sets the event type for the realtime event.
   * @param type - The type of the event.
   * @returns A new RealtimeBuilder instance with the updated type.
   */
  withType(type: string): RealtimeBuilder<TContext>;

  /**
   * Sets the unique identifier for the realtime event.
   * @param id - The event ID.
   * @returns A new RealtimeBuilder instance with the updated ID.
   */
  withId(id: string): RealtimeBuilder<TContext>;

  /**
   * Sets the channel for the realtime event.
   * @param channel - The channel to publish the event to.
   * @returns A new RealtimeBuilder instance with the updated channel.
   */
  withChannel(channel: string): RealtimeBuilder<TContext>;

  /**
   * Sets the description for the realtime event.
   * @param description - The description of the event.
   * @returns A new RealtimeBuilder instance with the updated description.
   */
  withDescription(description: string): RealtimeBuilder<TContext>;

  /**
   * Sets the scopes for the realtime event.
   * @param scopes - The scopes of the event.
   * @returns A new RealtimeBuilder instance with the updated scopes.
   */
  withScopes(scopes: (context: TContext) => Promise<string[]> | string[]): RealtimeBuilder;

  /**
   * Publishes the constructed event to the specified channel.
   * @throws Error if the channel is not set.
   * @returns A promise that resolves when the event is published.
   */
  publish(): Promise<void>;
}

/**
 * Realtime event payload structure.
 * Represents the data and metadata for a realtime event.
 */
export interface RealtimeEventPayload<TContext = any> {
  /** The channel to which the event will be published. */
  channel: string;
  /** The data payload of the event. */
  data?: unknown;
  /** The type of the event. */
  type?: string;
  /** The unique identifier for the event. */
  id?: string;
  /** The description of the event or channel. */
  description?: string;
  /** The list of scopes to invalidate on the client */
  scopes?: (context: TContext) => Promise<string[]> | string[];
}

/**
 * Interface for the Igniter Realtime Service.
 * Provides methods for publishing events to channels, building realtime events,
 * and broadcasting data to all channels.
 */
export interface IgniterRealtimeService<TContext = any> {
  /**
   * Publishes an event to a specific channel.
   *
   * @param channel - The channel to publish the event to.
   * @param data - The data payload of the event.
   * @param options - Optional event metadata (excluding channel and data).
   * @returns A promise that resolves when the event is published.
   */
  publish(
    channel: string,
    data: unknown,
    options?: Omit<RealtimeEventPayload<TContext>, "channel" | "data">
  ): Promise<void>;

  /**
   * Creates a RealtimeBuilder for a specific channel to fluently build and publish events.
   *
   * @param channel - The channel to target for the realtime event.
   * @returns A RealtimeBuilder instance for chaining event properties and publishing.
   */
  to(channel: string): RealtimeBuilder<TContext>;

  /**
   * Broadcasts data to all registered channels.
   *
   * @param data - The data payload to broadcast.
   * @returns A promise that resolves when the broadcast is complete.
   */
  broadcast(data: unknown): Promise<void>;


  /**
   * Revalidate data for a specific query key.
   *
   * @param queryKeys - The query key to revalidate.
   * @param scopes - The scopes to revalidate.
   * @param data - The data to revalidate.
   */
  revalidate(params: {
    queryKeys: string | string[],
    scopes?: string[],
    data?: unknown
  }): Promise<void>;
}