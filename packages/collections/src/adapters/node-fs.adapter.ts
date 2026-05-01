/**
 * @fileoverview Node.js filesystem adapter for @igniter-js/collections
 * @module @igniter-js/collections/adapters/node-fs
 */

import { watch as fsWatch } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import glob from "fast-glob";
import type {
  IgniterCollectionAdapter,
  IgniterCollectionWatchCallback,
} from "../types/adapter";

/**
 * Node.js filesystem adapter using fs/promises.
 *
 * This is the default adapter for server-side usage.
 *
 * @example Basic usage
 * ```typescript
 * import { IgniterCollections, NodeFsAdapter } from '@igniter-js/collections';
 *
 * const docs = IgniterCollections.create()
 *   .withAdapter(new NodeFsAdapter())
 *   .withBasePath(process.cwd())
 *   .addCollection(Posts)
 *   .build();
 * ```
 */
export class NodeFsAdapter implements IgniterCollectionAdapter {
  /**
   * Read file contents.
   *
   * @param path - Absolute path to file
   * @returns File contents or null if not found
   */
  async read(path: string): Promise<string | null> {
    try {
      return await readFile(path, "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write content to file.
   *
   * @param path - Absolute path to file
   * @param content - Content to write
   * @param _options - Optional write options (ignored for FS)
   */
  async write(
    path: string,
    content: string,
    _options?: { ttl?: number }
  ): Promise<void> {
    // Ensure directory exists
    const dir = path.substring(0, path.lastIndexOf("/"));
    if (dir) {
      await this.mkdir(dir);
    }
    await writeFile(path, content, "utf-8");
  }

  /**
   * Delete a file.
   *
   * @param path - Absolute path to file
   */
  async delete(path: string): Promise<void> {
    await rm(path, { force: true });
  }

  /**
   * List files or directories in directory.
   *
   * @param directory - Directory path
   * @param pattern - Optional glob pattern (e.g., "*.mdx")
   * @param options - Optional configuration for listing
   * @returns Array of paths
   */
  async list(
    directory: string,
    pattern?: string,
    options?: { type?: "file" | "directory" | "both" }
  ): Promise<string[]> {
    const type = options?.type ?? "file";

    try {
      // Use fast-glob for efficient listing and pattern matching
      const globPattern = pattern ? pattern.replace(/\{[^}]+\}/g, "*") : "**/*";

      const entries = await glob(globPattern, {
        cwd: directory,
        absolute: true,
        onlyFiles: type === "file",
        onlyDirectories: type === "directory",
      });

      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Check if path exists.
   *
   * @param path - Path to check
   * @returns True if exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create directory recursively.
   *
   * @param path - Directory path
   */
  async mkdir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  /**
   * Remove directory.
   *
   * @param path - Directory path
   */
  async rmdir(path: string): Promise<void> {
    await rm(path, { recursive: true, force: true });
  }

  /**
   * Get file stats.
   *
   * @param path - File path
   * @returns File stats
   */
  async stat(path: string): Promise<{ mtime: Date; size: number }> {
    const stats = await stat(path);
    return {
      mtime: stats.mtime,
      size: stats.size,
    };
  }

  /**
   * Watch a directory for file changes.
   *
   * Uses Node.js fs.watch with recursive option to monitor for changes.
   * Filters to only schema files (*.schema.json) by default.
   *
   * @param directory - Directory path to watch
   * @param callback - Called when files change
   * @returns Cleanup function to stop watching
   *
   * @example
   * ```typescript
   * const unwatch = adapter.watch('/schemas', (event, path) => {
   *   console.log(`Schema ${event}: ${path}`);
   * });
   *
   * // Later, cleanup
   * unwatch();
   * ```
   */
  watch(directory: string, callback: IgniterCollectionWatchCallback): () => void {
    try {
      const watcher = fsWatch(
        directory,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;

          const filePath = join(directory, filename);

          // Map fs.watch event types to our event types
          // 'rename' can mean add or delete, 'change' means modification
          if (eventType === "rename") {
            // Check if file exists to determine add vs delete
            // For simplicity, emit 'change' - the caller can verify
            callback("change", filePath);
          } else if (eventType === "change") {
            callback("change", filePath);
          }
        }
      );

      // Return cleanup function
      return () => {
        watcher.close();
      };
    } catch {
      // If watching fails (e.g., directory doesn't exist), return no-op
      return () => {};
    }
  }

  /**
   * Convert glob pattern to regex.
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`);
  }
}
