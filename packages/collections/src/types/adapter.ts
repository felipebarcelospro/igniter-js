/**
 * Event types for file watching.
 */
export type IgniterCollectionWatchEvent = "add" | "change" | "delete";

/**
 * Callback type for file watch events.
 */
export type IgniterCollectionWatchCallback = (
  event: IgniterCollectionWatchEvent,
  filePath: string
) => void;

/**
 * Adapter interface for markdown storage operations.
 */
export interface IgniterCollectionAdapter {
  /** Reads a file and returns its contents or null when missing. */
  read(path: string): Promise<string | null>;
  /** Writes the file contents to the given path. */
  write(
    path: string,
    content: string,
    options?: { ttl?: number }
  ): Promise<void>;
  /** Deletes a file at the given path. */
  delete(path: string): Promise<void>;
  /**
   * List files or directories inside a directory, optionally filtered by pattern.
   *
   * @param directory - Directory path
   * @param pattern - Optional glob pattern (e.g., "*.mdx")
   * @param options - Optional configuration for listing
   * @returns Array of paths
   */
  list(
    directory: string,
    pattern?: string,
    options?: { type?: "file" | "directory" | "both" }
  ): Promise<string[]>;
  /** Checks if a path exists. */
  exists(path: string): Promise<boolean>;
  /** Ensures a directory exists. */
  mkdir(path: string): Promise<void>;

  /**
   * Watch a directory for file changes.
   *
   * This method is optional - not all adapters support watching.
   * When implemented, it monitors a directory for file changes and
   * invokes the callback when files are added, changed, or deleted.
   *
   * @param path - Directory path to watch
   * @param callback - Called when files change with event type and file path
   * @returns A function to stop watching (cleanup function)
   *
   * @example
   * ```typescript
   * const unwatch = adapter.watch?.('/path/to/schemas', (event, filePath) => {
   *   console.log(`File ${event}: ${filePath}`);
   * });
   *
   * // Later, stop watching
   * unwatch?.();
   * ```
   */
  watch?(
    path: string,
    callback: IgniterCollectionWatchCallback
  ): () => void;
}
