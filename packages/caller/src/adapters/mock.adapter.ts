/**
 * @fileoverview In-memory mock store adapter for @igniter-js/caller.
 * @module @igniter-js/caller/adapters/mock
 */

import type { IgniterCallerStoreAdapter, IgniterCallerStoreOptions } from "../types/store";

/**
 * In-memory mock adapter for request caching in tests.
 */
export class MockCallerStoreAdapter
  implements IgniterCallerStoreAdapter<Map<string, unknown>>
{
  /** Creates a new mock adapter instance. */
  static create(): MockCallerStoreAdapter {
    return new MockCallerStoreAdapter();
  }

  /** Underlying in-memory store. */
  readonly client = new Map<string, unknown>();

  /** Tracks all calls for assertions. */
  readonly calls = {
    get: 0,
    set: 0,
    delete: 0,
    has: 0,
  };

  /** Captures recent operations. */
  readonly history = {
    get: [] as string[],
    set: [] as Array<{ key: string; value: unknown; options?: IgniterCallerStoreOptions }>,
    delete: [] as string[],
    has: [] as string[],
  };

  /**
   * Retrieves a cached value by key.
   *
   * @param key - Cache key (without prefix).
   * @returns Cached value or null.
   */
  async get<T = any>(key: string): Promise<T | null> {
    this.calls.get += 1;
    this.history.get.push(key);
    return (this.client.has(key) ? (this.client.get(key) as T) : null);
  }

  /**
   * Stores a cached value.
   *
   * @param key - Cache key (without prefix).
   * @param value - Value to store.
   * @param options - Cache options (ttl, etc).
   */
  async set(
    key: string,
    value: any,
    options?: IgniterCallerStoreOptions,
  ): Promise<void> {
    this.calls.set += 1;
    this.history.set.push({ key, value, options });
    this.client.set(key, value);
  }

  /**
   * Removes a cached value.
   *
   * @param key - Cache key (without prefix).
   */
  async delete(key: string): Promise<void> {
    this.calls.delete += 1;
    this.history.delete.push(key);
    this.client.delete(key);
  }

  /**
   * Checks if a cached value exists.
   *
   * @param key - Cache key (without prefix).
   * @returns True when the key exists.
   */
  async has(key: string): Promise<boolean> {
    this.calls.has += 1;
    this.history.has.push(key);
    return this.client.has(key);
  }

  /**
   * Clears all tracked state.
   *
   * @returns Nothing.
   */
  clear(): void {
    this.client.clear();
    this.calls.get = 0;
    this.calls.set = 0;
    this.calls.delete = 0;
    this.calls.has = 0;
    this.history.get = [];
    this.history.set = [];
    this.history.delete = [];
    this.history.has = [];
  }
}
