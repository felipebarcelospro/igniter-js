import type Stream from "node:stream";
import {
  IgniterStorageAdapter,
  type IgniterStoragePutOptions,
} from "./storage.adapter";

/**
 * A simple in-memory mock adapter for `@igniter-js/storage`.
 *
 * Use this in your unit tests to avoid real cloud provider calls.
 * It tracks uploaded files in an internal Map.
 *
 * @example
 * ```typescript
 * const mock = new MockStorageAdapter();
 * const storage = IgniterStorage.create().withAdapter(mock).build();
 * ```
 *
 * @group Testing
 */
export class MockStorageAdapter extends IgniterStorageAdapter {
  /**
   * Creates a new mock adapter instance.
   */
  static create(): MockStorageAdapter {
    return new MockStorageAdapter();
  }

  /**
   * Internal storage map representing the remote filesystem.
   */
  public readonly files = new Map<
    string,
    { body: any; options: IgniterStoragePutOptions }
  >();

  /**
   * Tracks how many times each method was called.
   */
  public readonly calls = {
    put: 0,
    delete: 0,
    list: 0,
    exists: 0,
    stream: 0,
    copy: 0,
    move: 0,
  };

  /**
   * Stores an object in memory.
   *
   * @param key - The object key to store.
   * @param body - The object payload.
   * @param options - Metadata for the object.
   */
  async put(
    key: string,
    body: any,
    options: IgniterStoragePutOptions,
  ): Promise<void> {
    this.calls.put++;
    this.files.set(this.normalizeKey(key), { body, options });
  }

  /**
   * Removes an object by key.
   *
   * @param key - The object key to delete.
   */
  async delete(key: string): Promise<void> {
    this.calls.delete++;
    this.files.delete(this.normalizeKey(key));
  }

  /**
   * Lists stored keys under the provided prefix.
   *
   * @param prefix - Optional prefix to filter keys.
   * @returns A list of matching keys.
   */
  async list(prefix?: string): Promise<string[]> {
    this.calls.list++;
    const keys = Array.from(this.files.keys());
    if (!prefix) {
      return keys;
    }
    const normalizedPrefix = this.normalizeKey(prefix);
    return keys.filter((k) => k.startsWith(normalizedPrefix));
  }

  /**
   * Checks if a key exists in memory.
   *
   * @param key - The object key to look up.
   * @returns True if the key exists.
   */
  async exists(key: string): Promise<boolean> {
    this.calls.exists++;
    return this.files.has(this.normalizeKey(key));
  }

  /**
   * Returns a readable stream for the requested key.
   *
   * @param key - The object key to stream.
   * @returns A readable stream.
   * @throws If the key does not exist.
   */
  async stream(key: string): Promise<Stream.Readable> {
    this.calls.stream++;
    if (!this.files.has(this.normalizeKey(key))) {
      throw new Error("File not found");
    }
    // Return empty stream for mock
    const { Readable } = await import("node:stream");
    return Readable.from([]);
  }

  /**
   * Copies a stored object to a new key.
   *
   * @param fromKey - The source key.
   * @param toKey - The destination key.
   */
  async copy(fromKey: string, toKey: string): Promise<void> {
    this.calls.copy++;
    const file = this.files.get(this.normalizeKey(fromKey));
    if (file) {
      this.files.set(this.normalizeKey(toKey), file);
    }
  }

  /**
   * Moves a stored object to a new key.
   *
   * @param fromKey - The source key.
   * @param toKey - The destination key.
   */
  async move(fromKey: string, toKey: string): Promise<void> {
    this.calls.move++;
    await this.copy(fromKey, toKey);
    await this.delete(fromKey);
  }

  /**
   * Clears all internal state.
   */
  clear(): void {
    this.files.clear();
    Object.keys(this.calls).forEach(
      (k) => (this.calls[k as keyof typeof this.calls] = 0),
    );
  }
}
