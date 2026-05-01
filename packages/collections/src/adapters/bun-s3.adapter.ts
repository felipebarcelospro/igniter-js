/**
 * @fileoverview Bun S3 adapter for @igniter-js/collections
 * @module @igniter-js/collections/adapters/bun-s3
 */

import { S3Client, write, Glob } from "bun";
import type {
  IgniterCollectionAdapter,
  IgniterCollectionWatchCallback,
} from "../types/adapter";

/**
 * Configuration for Bun S3 adapter.
 * Extends Bun's S3Client configuration.
 */
export interface BunS3AdapterConfig {
  /** S3 bucket name */
  bucket: string;
  /** S3 region (default: us-east-1) */
  region?: string;
  /** Custom endpoint (required for R2, MinIO, DigitalOcean) */
  endpoint?: string;
  /** AWS Access Key ID (can also be set via S3_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID env var) */
  accessKeyId?: string;
  /** AWS Secret Access Key (can also be set via S3_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY env var) */
  secretAccessKey?: string;
  /** AWS Session Token (optional) */
  sessionToken?: string;
  /** Whether to use virtual hosted-style endpoints */
  virtualHostedStyle?: boolean;
  /** Custom options for Bun S3 client */
  [key: string]: any;
}

/**
 * Bun S3 adapter using Bun's native S3 client.
 *
 * This adapter is highly optimized for Bun runtime and supports
 * S3-compatible providers like Cloudflare R2, MinIO, and DigitalOcean Spaces.
 *
 * @example Cloudflare R2
 * ```typescript
 * import { BunS3Adapter } from '@igniter-js/collections/adapters';
 *
 * const adapter = new BunS3Adapter({
 *   bucket: 'my-bucket',
 *   endpoint: 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
 *   accessKeyId: process.env.R2_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
 * });
 * ```
 */
export class BunS3Adapter implements IgniterCollectionAdapter {
  private readonly client: S3Client;

  constructor(config: BunS3AdapterConfig) {
    this.client = new S3Client(config);
  }

  /**
   * Read file contents.
   *
   * @param path - Object key
   * @returns File contents or null if not found
   */
  async read(path: string): Promise<string | null> {
    try {
      const file = this.client.file(path);
      if (!(await file.exists())) {
        return null;
      }
      return await file.text();
    } catch (error) {
      // Bun S3 might throw if credentials or bucket are invalid
      return null;
    }
  }

  /**
   * Write content to object.
   *
   * @param path - Object key
   * @param content - Content to write
   * @param _options - Optional write options (ignored for S3)
   */
  async write(
    path: string, 
    content: string, 
    _options?: { ttl?: number }
  ): Promise<void> {
    const file = this.client.file(path);
    await write(file, content);
  }

  /**
   * Delete an object.
   *
   * @param path - Object key
   */
  async delete(path: string): Promise<void> {
    try {
      await this.client.delete(path);
    } catch (error) {
      // Ignore if already deleted or other non-critical errors
    }
  }

  /**
   * List objects with prefix and optional glob filtering.
   * Implements pagination internally to return all matching keys.
   *
   * @param directory - Prefix/Directory
   * @param pattern - Optional glob pattern for filtering
   * @param options - Optional configuration for listing
   * @returns Array of object keys
   */
  async list(
    directory: string,
    pattern?: string,
    options?: { type?: "file" | "directory" | "both" }
  ): Promise<string[]> {
    const prefix =
      directory === "" || directory === "."
        ? ""
        : directory.endsWith("/")
          ? directory
          : `${directory}/`;
    
    const results: string[] = [];
    const folders = new Set<string>();
    let isTruncated = true;
    let startAfter: string | undefined = undefined;

    const type = options?.type ?? "file";
    // We use delimiter if we only want shallow listing of directories
    const delimiter = type === "directory" ? "/" : undefined;

    while (isTruncated) {
      // @ts-ignore - Bun's S3Client list options
      const response = await this.client.list({
        prefix,
        startAfter,
        delimiter,
      });

      if (response.contents) {
        for (const item of response.contents) {
          results.push(item.key);
        }
      }

      // @ts-ignore - commonPrefixes is supported by S3-compatible APIs
      if (response.commonPrefixes) {
        // @ts-ignore
        for (const commonPrefix of response.commonPrefixes) {
          folders.add(commonPrefix.prefix);
        }
      }

      isTruncated = !!response.isTruncated;
      if (isTruncated) {
        if (response.contents && response.contents.length > 0) {
          startAfter = response.contents[response.contents.length - 1].key;
        } else {
          isTruncated = false;
        }
      }
    }

    let finalResults: string[] = [];
    
    if (type === "file") {
      finalResults = results;
    } else if (type === "directory") {
      finalResults = Array.from(folders);
    } else {
      finalResults = [...results, ...Array.from(folders)];
    }

    // Filter by glob pattern if provided
    if (pattern) {
      const glob = new Glob(pattern);
      finalResults = finalResults.filter((key) => {
        // Match against the relative path from the directory
        const relativePath = key.startsWith(prefix) ? key.slice(prefix.length) : key;
        // Normalize for matching (remove trailing slash for folders)
        const matchPath = relativePath.endsWith("/") ? relativePath.slice(0, -1) : relativePath;
        if (!matchPath) return false;
        return glob.match(matchPath);
      });
    }

    return finalResults;
  }

  /**
   * Check if object exists.
   *
   * @param path - Object key
   * @returns True if exists
   */
  async exists(path: string): Promise<boolean> {
    return await this.client.exists(path);
  }

  /**
   * No-op for S3 as directories are virtual.
   *
   * @param _path - Directory path
   */
  async mkdir(_path: string): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Not supported for Bun S3 adapter.
   *
   * @returns No-op cleanup function
   */
  watch(
    _directory: string,
    _callback: IgniterCollectionWatchCallback
  ): () => void {
    // S3 does not support local file watching in this adapter
    return () => {};
  }
}
