/**
 * @fileoverview Bun Redis adapter for @igniter-js/collections
 * @module @igniter-js/collections/adapters/bun-redis
 */

import { RedisClient } from "bun";
import type {
  IgniterCollectionAdapter,
  IgniterCollectionWatchCallback,
  IgniterCollectionWatchEvent,
} from "../types/adapter";

/**
 * Options for BunRedisAdapter.
 */
export interface BunRedisAdapterOptions {
  /**
   * Redis connection URL.
   * Defaults to REDIS_URL environment variable or "redis://localhost:6379".
   */
  url?: string;
  /**
   * Existing Bun Redis client instance.
   */
  redis?: RedisClient;
  /**
   * Prefix for all keys to avoid collisions.
   * @default "igniter:collections:"
   */
  prefix?: string;
  /**
   * Default TTL for written keys in seconds.
   * If not set, keys won't expire.
   */
  ttl?: number;
}

/**
 * Redis adapter using Bun's native Redis client.
 *
 * This adapter is optimized for Bun runtime and uses native Redis client
 * for high performance. It stores files as string values and supports
 * watching via Redis Pub/Sub.
 *
 * @example
 * ```typescript
 * import { BunRedisAdapter } from '@igniter-js/collections/adapters';
 *
 * const adapter = new BunRedisAdapter({
 *   url: "redis://localhost:6379",
 *   prefix: "my-app:docs:",
 *   ttl: 3600 // 1 hour
 * });
 * ```
 */
export class BunRedisAdapter implements IgniterCollectionAdapter {
  private readonly redis: RedisClient;
  private readonly prefix: string;
  private readonly ttl?: number;
  private subRedis?: RedisClient;
  private readonly watchers = new Map<string, Set<IgniterCollectionWatchCallback>>();

  constructor(private readonly options: BunRedisAdapterOptions = {}) {
    this.redis = options.redis ?? new RedisClient(options.url);
    this.prefix = options.prefix ?? "igniter:collections:";
    this.ttl = options.ttl;
  }

  /**
   * Initialize the adapter.
   * Verifies connection with a PING.
   */
  async initialize(): Promise<void> {
    await this.redis.ping();
  }

  /**
   * Dispose the adapter and close connections.
   */
  async dispose(): Promise<void> {
    if (this.subRedis) {
      this.subRedis.close();
    }
    this.redis.close();
  }

  /**
   * Internal helper to build the full Redis key.
   */
  private getKey(path: string): string {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.prefix}${normalizedPath}`;
  }

  /**
   * Internal helper to get the path from a full Redis key.
   */
  private getPath(key: string): string {
    if (key.startsWith(this.prefix)) {
      return key.slice(this.prefix.length);
    }
    return key;
  }

  /**
   * Read file contents from Redis.
   *
   * @param path - File path
   * @returns Content or null if not found
   */
  async read(path: string): Promise<string | null> {
    return await this.redis.get(this.getKey(path));
  }

  /**
   * Write content to Redis.
   *
   * @param path - File path
   * @param content - Content to write
   * @param options - Optional write options
   */
  async write(
    path: string,
    content: string,
    options?: { ttl?: number }
  ): Promise<void> {
    const key = this.getKey(path);
    const ttl = options?.ttl ?? this.ttl;

    await this.redis.set(key, content);
    if (ttl) {
      await this.redis.expire(key, ttl);
    }
    
    await this.notify("change", path);
  }

  /**
   * Delete a file from Redis.
   *
   * @param path - File path
   */
  async delete(path: string): Promise<void> {
    await this.redis.del(this.getKey(path));
    await this.notify("delete", path);
  }

  /**
   * Check if a path exists in Redis.
   *
   * @param path - Path to check
   * @returns True if exists
   */
  async exists(path: string): Promise<boolean> {
    const exists = await this.redis.exists(this.getKey(path));
    // Bun's RedisClient returns boolean for exists
    return typeof exists === "boolean" ? exists : !!exists;
  }

  /**
   * Create directory.
   * For Redis, this is a no-op as keys are flat.
   */
  async mkdir(_path: string): Promise<void> {
    return Promise.resolve();
  }

  /**
   * List keys in Redis using SCAN.
   *
   * @param directory - Directory prefix
   * @param pattern - Optional pattern matching
   * @returns Array of relative paths
   */
  async list(directory: string, pattern?: string): Promise<string[]> {
    const dirPrefix = directory === "" || directory === "/" 
      ? "" 
      : directory.endsWith("/") ? directory : `${directory}/`;
    
    const searchPrefix = this.getKey(dirPrefix);
    
    // Redis SCAN MATCH supports simple glob-style patterns
    let match = `${searchPrefix}*`;
    if (pattern) {
      match = `${searchPrefix}${pattern}`;
    }

    const keys: string[] = [];
    let cursor = "0";

    do {
      const result = await this.redis.send("SCAN", [cursor, "MATCH", match, "COUNT", "100"]);
      const [nextCursor, batch] = result as [string, string[]];
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== "0");

    return keys.map((key) => this.getPath(key));
  }

  /**
   * Watch for changes using Redis Pub/Sub.
   *
   * @param path - Path to watch
   * @param callback - Change callback
   * @returns Unsubscribe function
   */
  watch(path: string, callback: IgniterCollectionWatchCallback): () => void {
    const channel = `${this.prefix}events`;
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

    if (!this.subRedis) {
      this.subRedis = new RedisClient(this.options.url);
      this.subRedis.subscribe(channel, (message) => {
        try {
          const { event, path: eventPath } = JSON.parse(message);
          for (const [watchedPath, callbacks] of this.watchers) {
            // Trigger if the event path is within the watched directory
            if (eventPath === watchedPath || eventPath.startsWith(`${watchedPath}/`)) {
              callbacks.forEach((cb) => cb(event, eventPath));
            }
          }
        } catch {
          // Ignore malformed messages
        }
      });
    }

    let callbacks = this.watchers.get(normalizedPath);
    if (!callbacks) {
      callbacks = new Set();
      this.watchers.set(normalizedPath, callbacks);
    }
    callbacks.add(callback);

    return () => {
      const currentCallbacks = this.watchers.get(normalizedPath);
      if (currentCallbacks) {
        currentCallbacks.delete(callback);
        if (currentCallbacks.size === 0) {
          this.watchers.delete(normalizedPath);
        }
      }
    };
  }

  /**
   * Internal helper to publish change notifications.
   */
  private async notify(event: IgniterCollectionWatchEvent, path: string): Promise<void> {
    const channel = `${this.prefix}events`;
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    try {
      await this.redis.publish(
        channel,
        JSON.stringify({ event, path: normalizedPath })
      );
    } catch {
      // Ignore publish errors (best effort)
    }
  }
}
