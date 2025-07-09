import type { Redis } from "ioredis";
import { type EventCallback, type KeyValueOptions, type IgniterStoreAdapter, isServer } from "@igniter-js/core";

/**
 * Creates a Store Adapter for Redis.
 * This adapter provides a unified interface for Igniter to interact with a Redis instance,
 * handling key-value storage, atomic operations, and Pub/Sub messaging.
 *
 * It uses separate clients for commands and subscriptions as required by Redis.
 *
 * @param redisClient - An initialized `ioredis` client instance.
 * @returns A `StoreAdapter` object for Redis.
 */
export function createRedisStoreAdapter(redisClient: Redis): IgniterStoreAdapter<Redis> {
  if (!isServer) {
    return {} as IgniterStoreAdapter<Redis>;
  }
    
  // A dedicated client for subscriptions is required by Redis design.
  const subscriberClient = redisClient.duplicate();
  const subscribers = new Map<string, Set<EventCallback>>();

  // Centralized message handler for the subscriber client.
  subscriberClient.on('message', (channel, message) => {
    const callbacks = subscribers.get(channel);
    if (callbacks) {
      try {
        const parsedMessage = JSON.parse(message);
        callbacks.forEach(cb => cb(parsedMessage));
      } catch (error) {
        console.error(`[RedisStoreAdapter] Failed to parse message from channel "${channel}":`, error);
      }
    }
  });

  return {
    client: redisClient,

    async get<T>(key: string): Promise<T | null> {
      const value = await redisClient.get(key);
      if (value === null) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        // If parsing fails, return the raw value.
        return value as unknown as T;
      }
    },

    async set(key: string, value: any, options?: KeyValueOptions): Promise<void> {
      const serializedValue = JSON.stringify(value);
      if (options?.ttl) {
        await redisClient.set(key, serializedValue, 'EX', options.ttl);
      } else {
        await redisClient.set(key, serializedValue);
      }
    },

    async delete(key: string): Promise<void> {
      await redisClient.del(key);
    },

    async has(key: string): Promise<boolean> {
      const result = await redisClient.exists(key);
      return result === 1;
    },

    async increment(key: string): Promise<number> {
      return redisClient.incr(key);
    },
    
    async expire(key: string, ttl: number): Promise<void> {
      await redisClient.expire(key, ttl);
    },

    async publish(channel: string, message: any): Promise<void> {
      await redisClient.publish(channel, JSON.stringify(message));
    },

    async subscribe(channel: string, callback: EventCallback): Promise<void> {
      let callbackSet = subscribers.get(channel);
      if (!callbackSet) {
        callbackSet = new Set();
        subscribers.set(channel, callbackSet);
        await subscriberClient.subscribe(channel);
      }
      callbackSet.add(callback);
    },

    async unsubscribe(channel: string, callback?: EventCallback): Promise<void> {
      const callbackSet = subscribers.get(channel);
      if (!callbackSet) {
        return;
      }

      if (callback) {
        callbackSet.delete(callback);
      } else {
        subscribers.delete(channel);
      }
      
      if (callbackSet.size === 0) {
        subscribers.delete(channel);
        await subscriberClient.unsubscribe(channel);
      }
    },
  };
} 