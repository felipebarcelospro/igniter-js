/**
 * @fileoverview Type definitions for IgniterAgent memory adapters.
 * This module contains interfaces for implementing storage backends.
 * 
 * @module types/adapter
 * @packageDocumentation
 */

import type {
  IgniterAgentMemoryProvider,
  IgniterAgentWorkingMemory,
  IgniterAgentConversationMessage,
  IgniterAgentChatSession,
  IgniterAgentWorkingMemoryParams,
  IgniterAgentUpdateWorkingMemoryParams,
  IgniterAgentGetMessagesParams,
  IgniterAgentGetChatsParams,
  IgniterAgentUIMessage,
} from "./memory";

/* =============================================================================
 * ADAPTER BASE TYPES
 * ============================================================================= */

/**
 * Base options for adapter configuration.
 * 
 * @description
 * Common configuration options shared by all adapter implementations.
 * 
 * @example
 * ```typescript
 * const baseOptions: IgniterAgentAdapterOptions = {
 *   namespace: 'myapp',
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentAdapterOptions {
  /**
   * Optional namespace prefix for all keys.
   * 
   * @description
   * Useful for multi-tenant applications or to avoid key collisions.
   * The namespace is prepended to all storage keys.
   * 
   * @example
   * ```typescript
   * // With namespace 'myapp', keys become:
   * // 'myapp:memory:chat:123'
   * // 'myapp:messages:chat:123'
   * ```
   */
  namespace?: string;
}

/* =============================================================================
 * IN-MEMORY ADAPTER TYPES
 * ============================================================================= */

/**
 * Configuration options for the in-memory adapter.
 * 
 * @description
 * The in-memory adapter stores all data in JavaScript Maps.
 * Useful for development, testing, or short-lived applications.
 * 
 * @remarks
 * Data is lost when the process restarts. For production use,
 * consider using a persistent adapter like Redis or PostgreSQL.
 * 
 * @example
 * ```typescript
 * const options: IgniterAgentInMemoryAdapterOptions = {
 *   namespace: 'test',
 *   debug: true,
 *   maxMessages: 1000,
 *   maxChats: 100
 * };
 * 
 * const adapter = new IgniterAgentInMemoryAdapter(options);
 * ```
 * 
 * @public
 */
export interface IgniterAgentInMemoryAdapterOptions extends IgniterAgentAdapterOptions {
  /**
   * Maximum number of messages to store per chat.
   * 
   * @description
   * Limits memory usage by capping the number of messages.
   * Oldest messages are removed when the limit is exceeded.
   * 
   * @defaultValue 1000
   */
  maxMessages?: number;

  /**
   * Maximum number of chat sessions to store.
   * 
   * @description
   * Limits memory usage by capping the number of chats.
   * Oldest chats are removed when the limit is exceeded.
   * 
   * @defaultValue 100
   */
  maxChats?: number;
}

/* =============================================================================
 * REDIS ADAPTER TYPES
 * ============================================================================= */

/**
 * Configuration options for the Redis adapter.
 * 
 * @description
 * The Redis adapter provides persistent, high-performance storage
 * suitable for production deployments.
 * 
 * @example
 * ```typescript
 * import Redis from 'ioredis';
 * 
 * const redis = new Redis({
 *   host: 'localhost',
 *   port: 6379
 * });
 * 
 * const options: IgniterAgentRedisAdapterOptions = {
 *   client: redis,
 *   namespace: 'igniter',
 *   ttl: 86400 * 30, // 30 days
 *   debug: false
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentRedisAdapterOptions extends IgniterAgentAdapterOptions {
  /**
   * Redis client instance.
   * 
   * @description
   * An initialized Redis client (e.g., from ioredis or redis package).
   * The adapter expects the client to be already connected.
   */
  client: unknown;

  /**
   * Time-to-live for stored data in seconds.
   * 
   * @description
   * Sets an expiration time for all stored data. Useful for
   * automatic cleanup of old conversations.
   * 
   * @defaultValue undefined (no expiration)
   */
  ttl?: number;

  /**
   * Redis key prefix.
   * 
   * @description
   * All keys are prefixed with this value. If not specified,
   * falls back to the namespace option.
   * 
   * @defaultValue 'igniter:agent'
   */
  keyPrefix?: string;
}

/* =============================================================================
 * ABSTRACT ADAPTER TYPE
 * ============================================================================= */

/**
 * Abstract base class interface for memory adapters.
 * 
 * @description
 * Defines the contract that all memory adapters must implement.
 * Extends the MemoryProvider interface with additional lifecycle methods.
 * 
 * @typeParam TOptions - The adapter-specific options type
 * 
 * @example
 * ```typescript
 * class CustomAdapter implements IgniterAgentMemoryAdapter<CustomAdapterOptions> {
 *   private options: CustomAdapterOptions;
 *   
 *   constructor(options: CustomAdapterOptions) {
 *     this.options = options;
 *   }
 *   
 *   async connect(): Promise<void> {
 *     // Initialize connection
 *   }
 *   
 *   async disconnect(): Promise<void> {
 *     // Cleanup
 *   }
 *   
 *   // ... implement MemoryProvider methods
 * }
 * ```
 * 
 * @public
 */
export interface IgniterAgentMemoryAdapter<
  TOptions extends IgniterAgentAdapterOptions = IgniterAgentAdapterOptions
> extends IgniterAgentMemoryProvider {
  /**
   * The adapter configuration options.
   */
  readonly options: TOptions;

  /**
   * Establishes connection to the storage backend.
   * 
   * @description
   * Called during adapter initialization. For adapters that
   * maintain persistent connections (e.g., Redis), this establishes
   * the connection. For in-memory adapters, this may be a no-op.
   * 
   * @throws {IgniterAgentAdapterConnectionError} If connection fails
   * 
   * @example
   * ```typescript
   * const adapter = new RedisAdapter(options);
   * await adapter.connect();
   * console.log('Connected to Redis');
   * ```
   */
  connect?(): Promise<void>;

  /**
   * Closes connection to the storage backend.
   * 
   * @description
   * Called during cleanup. Should release all resources and
   * close any open connections.
   * 
   * @example
   * ```typescript
   * await adapter.disconnect();
   * console.log('Disconnected from Redis');
   * ```
   */
  disconnect?(): Promise<void>;

  /**
   * Checks if the adapter is connected and ready.
   * 
   * @description
   * Returns true if the adapter is ready to handle operations.
   * 
   * @returns Whether the adapter is connected
   */
  isConnected?(): boolean;

  /**
   * Clears all data from the adapter.
   * 
   * @description
   * Removes all stored data. Use with caution in production.
   * Primarily useful for testing and development.
   * 
   * @example
   * ```typescript
   * // Clear all test data
   * await adapter.clear();
   * ```
   */
  clear?(): Promise<void>;
}

/* =============================================================================
 * ADAPTER FACTORY TYPES
 * ============================================================================= */

/**
 * Factory function type for creating memory adapters.
 * 
 * @description
 * Used for dependency injection and adapter configuration.
 * 
 * @typeParam TOptions - The adapter options type
 * @typeParam TAdapter - The adapter type returned
 * 
 * @example
 * ```typescript
 * const createRedisAdapter: IgniterAgentAdapterFactory<
 *   IgniterAgentRedisAdapterOptions,
 *   RedisAdapter
 * > = (options) => {
 *   return new RedisAdapter(options);
 * };
 * ```
 * 
 * @public
 */
export type IgniterAgentAdapterFactory<
  TOptions extends IgniterAgentAdapterOptions = IgniterAgentAdapterOptions,
  TAdapter extends IgniterAgentMemoryAdapter<TOptions> = IgniterAgentMemoryAdapter<TOptions>
> = (options: TOptions) => TAdapter;

/* =============================================================================
 * ADAPTER RESULT TYPES
 * ============================================================================= */

/**
 * Result of a batch operation.
 * 
 * @description
 * Used when performing operations that affect multiple records.
 * 
 * @example
 * ```typescript
 * const result: IgniterAgentAdapterBatchResult = {
 *   success: true,
 *   affected: 42,
 *   errors: []
 * };
 * ```
 * 
 * @public
 */
export interface IgniterAgentAdapterBatchResult {
  /**
   * Whether the batch operation completed successfully.
   */
  success: boolean;

  /**
   * Number of records affected by the operation.
   */
  affected: number;

  /**
   * Any errors that occurred during the batch operation.
   */
  errors: Error[];
}

/**
 * Statistics about adapter storage usage.
 * 
 * @description
 * Provides insight into the adapter's current state and usage.
 * 
 * @example
 * ```typescript
 * const stats = await adapter.getStats();
 * console.log(`Storing ${stats.messageCount} messages`);
 * console.log(`Across ${stats.chatCount} chats`);
 * ```
 * 
 * @public
 */
export interface IgniterAgentAdapterStats {
  /**
   * Total number of working memory entries.
   */
  workingMemoryCount: number;

  /**
   * Total number of stored messages.
   */
  messageCount: number;

  /**
   * Total number of chat sessions.
   */
  chatCount: number;

  /**
   * Storage size in bytes (if available).
   */
  storageBytes?: number;

  /**
   * When the stats were collected.
   */
  timestamp: Date;
}
