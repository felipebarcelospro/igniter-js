/**
 * Options for setting a key-value pair in the store.
 */
export interface KeyValueOptions {
  /**
   * Time-to-live for the key, in seconds.
   */
  ttl?: number;
}

/**
 * Callback function for handling messages from a subscribed channel.
 * @param message The message received from the channel, automatically parsed.
 */
export type EventCallback = (message: any) => void | Promise<void>;

/**
 * Defines the contract for a Store Adapter in Igniter.
 * A Store Adapter provides a unified interface for various storage backends (e.g., Redis, Memcached, in-memory)
 * to handle key-value caching, atomic operations, and Pub/Sub messaging.
 */
export interface IgniterStoreAdapter<TClient extends unknown = unknown> {
  /**
   * The underlying client instance (e.g., Redis client).
   * Can be used for advanced operations not covered by the adapter.
   */
  readonly client: TClient;

  // --- Key-Value Operations ---

  /**
   * Retrieves a value from the store by its key.
   * @param key The key to retrieve.
   * @returns The value if found (auto-deserialized), otherwise null.
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Stores a value in the store.
   * @param key The key to store the value under.
   * @param value The value to store (will be auto-serialized).
   * @param options Configuration options, such as TTL.
   */
  set(key: string, value: any, options?: KeyValueOptions): Promise<void>;

  /**
   * Deletes a key from the store.
   * @param key The key to delete.
   */
  delete(key: string): Promise<void>;

  /**
   * Checks if a key exists in the store.
   * @param key The key to check.
   * @returns `true` if the key exists, otherwise `false`.
   */
  has(key: string): Promise<boolean>;

  // --- Atomic Operations ---

  /**
   * Atomically increments a numeric value stored at a key.
   * If the key does not exist, it is set to 0 before incrementing.
   * @param key The key to increment.
   * @returns The new value after incrementing.
   */
  increment(key: string): Promise<number>;

  /**
   * Sets a time-to-live (TTL) on a key, in seconds.
   * @param key The key to set the expiration on.
   * @param ttl The TTL in seconds.
   */
  expire(key: string, ttl: number): Promise<void>;


  // --- Pub/Sub Operations ---

  /**
   * Publishes a message to a specific channel.
   * @param channel The channel to publish the message to.
   * @param message The message to publish (will be auto-serialized).
   */
  publish(channel: string, message: any): Promise<void>;

  /**
   * Subscribes to a channel to receive messages.
   * @param channel The channel to subscribe to.
   * @param callback The function to execute when a message is received.
   */
  subscribe(channel: string, callback: EventCallback): Promise<void>;

  /**
   * Unsubscribes from a channel.
   * If a callback is provided, only that specific callback is removed.
   * Otherwise, all callbacks for that channel are removed.
   * @param channel The channel to unsubscribe from.
   * @param callback Optional specific callback to remove.
   */
  unsubscribe(channel: string, callback?: EventCallback): Promise<void>;
} 