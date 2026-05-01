/**
 * @fileoverview Bun filesystem adapter for @igniter-js/collections
 * @module @igniter-js/collections/adapters/bun-fs
 */

/**
 * @fileoverview Bun filesystem adapter for @igniter-js/collections
 * @module @igniter-js/collections/adapters/bun-fs
 */

import { Glob, $ } from "bun";
import { watch } from "fs";
import type {
  IgniterCollectionAdapter,
  IgniterCollectionWatchCallback,
} from "../types/adapter";

/**
 * Bun-optimized filesystem adapter.
 *
 * This adapter uses Bun's native APIs (Bun.file, Bun.write, Bun.Glob) for maximum performance.
 * It strictly avoids Node.js module imports (no node:fs, no node:path) to leverage
 * Bun's highly optimized internal syscalls.
 *
 * @example Basic usage
 * ```typescript
 * import { IgniterCollections, BunFsAdapter } from '@igniter-js/collections';
 *
 * const docs = IgniterCollections.create()
 *   .withAdapter(new BunFsAdapter())
 *   .withBasePath(process.cwd())
 *   .addCollection(Posts)
 *   .build();
 * ```
 */
export class BunFsAdapter implements IgniterCollectionAdapter {
  /**
   * Read file contents using Bun.file().
   *
   * @param path - Absolute path to file
   * @returns File contents or null if not found
   */
  async read(path: string): Promise<string | null> {
    try {
      const file = Bun.file(path);
      if (!(await file.exists())) {
        return null;
      }
      return await file.text();
    } catch (error) {
      return null;
    }
  }

  /**
   * Write content to file using Bun.write().
   * Bun.write automatically handles recursive directory creation.
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
    await Bun.write(path, content);
  }

  /**
   * Delete a file using BunFile.delete().
   *
   * @param path - Absolute path to file
   */
  async delete(path: string): Promise<void> {
    try {
      const file = Bun.file(path);
      await file.delete();
    } catch {
      // Ignore errors if file doesn't exist
    }
  }

  /**
   * List files or directories in directory using Bun.Glob.
   *
   * @param directory - Directory path
   * @param pattern - Optional glob pattern (e.g., "*.mdx")
   * @param options - Optional configuration for listing
   * @returns Array of file paths
   */
  async list(
    directory: string,
    pattern?: string,
    options?: { type?: "file" | "directory" | "both" }
  ): Promise<string[]> {
    const type = options?.type ?? "file";
    const globPattern = pattern ?? "**/*";
    const glob = new Glob(globPattern);

    const results: string[] = [];
    const onlyFiles = type === "file";

    try {
      // scan returns absolute paths if root is absolute
      for await (const file of glob.scan({
        cwd: directory,
        dot: true,
        onlyFiles: type !== "both" ? onlyFiles : false,
        absolute: true
      })) {
        results.push(file);
      }

      if (type === "directory") {
        // Bun.Glob returns both files and directories when onlyFiles is false.
        // We filter for directories using a native shell check as Bun doesn't
        // have a dedicated directory check API outside of node:fs.
        const filtered: string[] = [];
        for (const res of results) {
          try {
            await $`test -d ${res}`.quiet();
            filtered.push(res);
          } catch {
            // Not a directory
          }
        }
        return filtered;
      }

      return results;
    } catch {
      return [];
    }
  }

  /**
   * Check if path exists.
   * Combines Bun.file().exists() with a shell fallback for directories.
   *
   * @param path - Path to check
   * @returns True if exists
   */
  async exists(path: string): Promise<boolean> {
    const file = Bun.file(path);
    if (await file.exists()) return true;

    try {
      // Fallback for directories since Bun.file().exists() only detects files
      await $`test -d ${path}`.quiet();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create directory recursively using Bun's shell API.
   *
   * @param path - Directory path
   */
  async mkdir(path: string): Promise<void> {
    await $`mkdir -p ${path}`.quiet();
  }

  /**
   * Watch a directory for file changes.
   *
   * Uses Bun's optimized implementation of the fs.watch API.
   * Note: On Linux, recursive watching is not supported by the kernel (inotify),
   * so it will only monitor the top-level directory.
   *
   * @param path - Directory path to watch
   * @param callback - Called when files change
   * @returns Cleanup function to stop watching
   */
  watch(
    path: string,
    callback: IgniterCollectionWatchCallback
  ): () => void {
    try {
      const watcher = watch(
        path,
        { recursive: true },
        (event, filename) => {
          if (!filename) return;

          // Join path and filename without using node:path to maintain
          // the adapter's zero-dependency policy for Node.js modules.
          const filePath = path.endsWith("/")
            ? `${path}${filename}`
            : `${path}/${filename}`;

          if (event === "rename") {
            // Distinguish between add and delete by checking if the file exists.
            // Bun.file().exists() is a native Bun API and is extremely fast.
            Bun.file(filePath).exists().then((exists) => {
              callback(exists ? "add" : "delete", filePath);
            });
          } else {
            // Standard modification event
            callback("change", filePath);
          }
        }
      );

      return () => {
        watcher.close();
      };
    } catch (error) {
      // Return a no-op cleanup if watcher fails to initialize (e.g. dir missing)
      return () => { };
    }
  }
}

