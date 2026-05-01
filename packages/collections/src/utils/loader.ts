/**
 * @fileoverview Unified file loader for @igniter-js/collections
 * @module @igniter-js/collections/utils/loader
 *
 * @description
 * Provides a unified interface for loading configuration files (.json, .ts)
 * used by SchemaRegistry and ViewRegistry.
 *
 * Uses jiti for TypeScript transpilation with cache invalidation
 * to support hot reload in development.
 */

import { createJiti } from "jiti";
import type { IgniterCollectionAdapter } from "../types/adapter";
import {
  IgniterCollectionError,
  IGNITER_COLLECTION_ERROR_CODES,
} from "../errors/collection.error";

/**
 * Unified loader for collection and view definition files.
 *
 * Supports both JSON and TypeScript files:
 * - `.json` → parsed with `JSON.parse`
 * - `.ts`  → transpiled with jiti, extracts `default` export
 *
 * jiti is initialized once per loader instance with `moduleCache: false`
 * to ensure hot reload works correctly.
 */
export class IgniterCollectionLoader {
  private readonly jiti: ReturnType<typeof createJiti>;
  private readonly adapter: IgniterCollectionAdapter;

  /**
   * Create a new loader instance.
   *
   * @param adapter - Filesystem adapter for reading files
   */
  constructor(adapter: IgniterCollectionAdapter) {
    this.adapter = adapter;
    this.jiti = createJiti(import.meta.url, {
      moduleCache: false, // Critical for hot reload
      fsCache: true,      // Cache transpiled source on disk
      tryNative: true,    // Use native import in Bun
      sourceMaps: false,  // No source maps needed for config files
      interopDefault: true, // Extract default export automatically
    });
  }

  /**
   * Load a definition file (JSON or TypeScript).
   *
   * @param filePath - Absolute path to the file
   * @returns Parsed definition object
   * @throws IgniterCollectionError if file cannot be loaded or parsed
   */
  async load(filePath: string): Promise<unknown> {
    if (filePath.endsWith(".ts")) {
      return this.loadTs(filePath);
    }

    if (filePath.endsWith(".json")) {
      return this.loadJson(filePath);
    }

    throw new IgniterCollectionError({
      message: `Unsupported file format: ${filePath}. Only .json and .ts files are supported.`,
      code: IGNITER_COLLECTION_ERROR_CODES.UNSUPPORTED_FILE_FORMAT,
      statusCode: 400,
      details: {
        "ctx.package": "@igniter-js/collections",
        "ctx.operation": "load",
        "ctx.file.path": filePath,
      },
    });
  }

  /**
   * Load a TypeScript file via jiti.
   *
   * @param filePath - Absolute path to the .ts file
   * @returns Default export from the module
   */
  private async loadTs(filePath: string): Promise<unknown> {
    try {
      const module = await this.jiti.import(filePath, { default: true });
      return module;
    } catch (error) {
      throw new IgniterCollectionError({
        message: `Failed to transpile ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        code: IGNITER_COLLECTION_ERROR_CODES.TRANSPILE_FAILED,
        statusCode: 500,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "loadTs",
          "ctx.file.path": filePath,
          "ctx.error.message": error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Load a JSON file via the adapter.
   *
   * @param filePath - Absolute path to the .json file
   * @returns Parsed JSON object
   */
  private async loadJson(filePath: string): Promise<unknown> {
    const content = await this.adapter.read(filePath);

    if (content === null) {
      throw new IgniterCollectionError({
        message: `File not found: ${filePath}`,
        code: IGNITER_COLLECTION_ERROR_CODES.DOCUMENT_NOT_FOUND,
        statusCode: 404,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "loadJson",
          "ctx.file.path": filePath,
        },
      });
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      throw new IgniterCollectionError({
        message: `Failed to parse JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        code: IGNITER_COLLECTION_ERROR_CODES.PARSE_ERROR,
        statusCode: 400,
        details: {
          "ctx.package": "@igniter-js/collections",
          "ctx.operation": "loadJson",
          "ctx.file.path": filePath,
          "ctx.error.message": error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
