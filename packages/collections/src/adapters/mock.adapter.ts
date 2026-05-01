/**
 * @fileoverview Mock adapter for @igniter-js/collections testing
 * @module @igniter-js/collections/adapters/mock
 */

import type { IgniterCollectionAdapter } from "../types/adapter";

/**
 * In-memory mock adapter for testing.
 *
 * Stores all files in a Map and tracks method calls for assertions.
 *
 * @example Testing with mock adapter
 * ```typescript
 * import { IgniterCollections, IgniterCollectionMockAdapter } from '@igniter-js/collections';
 *
 * const mock = new IgniterCollectionMockAdapter();
 * const docs = IgniterCollections.create()
 *   .withAdapter(mock)
 *   .addCollection(Posts)
 *   .build();
 *
 * // After operations, inspect mock state
 * console.log(mock.files); // Map of path -> content
 * console.log(mock.calls); // Array of method calls
 * ```
 */
export class IgniterCollectionMockAdapter implements IgniterCollectionAdapter {
  /** In-memory file storage */
  public readonly files: Map<string, string> = new Map();

  /** Tracked method calls for testing */
  public readonly calls: Array<{
    method: string;
    args: unknown[];
    timestamp: number;
  }> = [];

  /**
   * Create a new mock adapter.
   *
   * @param initialFiles - Optional initial files to populate
   */
  constructor(initialFiles?: Record<string, string>) {
    if (initialFiles) {
      for (const [path, content] of Object.entries(initialFiles)) {
        this.files.set(path, content);
      }
    }
  }

  /**
   * Create a new mock adapter instance.
   */
  static create(initialFiles?: Record<string, string>): IgniterCollectionMockAdapter {
    return new IgniterCollectionMockAdapter(initialFiles);
  }

  private trackCall(method: string, args: unknown[]): void {
    this.calls.push({ method, args, timestamp: Date.now() });
  }

  /**
   * Read file contents.
   */
  async read(path: string): Promise<string | null> {
    this.trackCall("read", [path]);
    return this.files.get(path) ?? null;
  }

  /**
   * Write content to file.
   */
  async write(
    path: string,
    content: string,
    options?: { ttl?: number }
  ): Promise<void> {
    this.trackCall("write", [path, content, options]);
    this.files.set(path, content);
  }

  /**
   * Delete a file.
   */
  async delete(path: string): Promise<void> {
    this.trackCall("delete", [path]);
    this.files.delete(path);
  }

  /**
   * Seed multiple files into the mock storage.
   */
  async seed(path: string, files: Array<Record<string, any>>): Promise<void> {
    this.trackCall("seed", [files]);
    for (const file of files) {
      const filePath = `${path}/${file.id}.json`;
      this.files.set(filePath, JSON.stringify(file, null, 2));
    }
  }

  /**
   * List files or directories in directory.
   */
  async list(
    directory: string,
    pattern?: string,
    options?: { type?: "file" | "directory" | "both" }
  ): Promise<string[]> {
    this.trackCall("list", [directory, pattern, options]);

    const type = options?.type ?? "file";
    const normalizedDir = directory.endsWith("/") ? directory : `${directory}/`;
    const results = new Set<string>();
    const regex = pattern ? this.patternToRegex(pattern) : null;

    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(normalizedDir)) {
        const relativePath = filePath.slice(normalizedDir.length);
        const parts = relativePath.split("/");

        // File handling
        if (type === "file" || type === "both") {
          // If the pattern has no slashes or wildcards that imply recursion, we only look at immediate files
          const isRecursive = pattern?.includes("/") || pattern?.includes("**") || pattern?.includes("{");

          if (isRecursive || parts.length === 1) {
            const matchTarget = isRecursive ? relativePath : parts[0];
            if (!regex || regex.test(matchTarget)) {
              results.add(filePath);
            }
          }
        }

        // Directory handling
        if (type === "directory" || type === "both") {
          if (parts.length > 1) {
            const dirName = parts[0];
            const dirPath = `${normalizedDir}${dirName}`;
            if (!regex || regex.test(dirName)) {
              results.add(dirPath);
            }
          }
        }
      }
    }

    return Array.from(results).sort();
  }

  /**
   * Check if path exists.
   */
  async exists(path: string): Promise<boolean> {
    this.trackCall("exists", [path]);

    // Check if it's a file
    if (this.files.has(path)) return true;

    // Check if it's a directory (is a prefix of any file path)
    const normalizedDir = path.endsWith("/") ? path : `${path}/`;
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(normalizedDir)) return true;
    }

    return false;
  }

  /**
   * Create directory (no-op for mock).
   */
  async mkdir(path: string): Promise<void> {
    this.trackCall("mkdir", [path]);
    // No-op in mock - directories are implicit
  }

  /**
   * Remove directory.
   */
  async rmdir(path: string): Promise<void> {
    this.trackCall("rmdir", [path]);
    const normalizedDir = path.endsWith("/") ? path : `${path}/`;
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(normalizedDir)) {
        this.files.delete(filePath);
      }
    }
  }

  // ==========================================================================
  // TEST HELPERS
  // ==========================================================================

  /**
   * Clear all files and call history.
   */
  reset(): void {
    this.files.clear();
    this.calls.length = 0;
  }

  /**
   * Get calls for a specific method.
   */
  getCallsFor(method: string): Array<{ args: unknown[]; timestamp: number }> {
    return this.calls
      .filter((c) => c.method === method)
      .map(({ args, timestamp }) => ({ args, timestamp }));
  }

  /**
   * Check if a method was called with specific args.
   */
  wasCalledWith(method: string, ...args: unknown[]): boolean {
    return this.calls.some(
      (c) => c.method === method && JSON.stringify(c.args) === JSON.stringify(args)
    );
  }

  /**
   * Convert glob pattern to regex.
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*\*/g, "(.+)") // Recursive wildcard
      .replace(/\*/g, "([^/]+)") // Single level wildcard
      .replace(/\?/g, ".")
      .replace(/\\\{[^}]+\\\}/g, "([^/]+)"); // Handle {id} etc as wildcards
    return new RegExp(`^${escaped}$`);
  }
}
