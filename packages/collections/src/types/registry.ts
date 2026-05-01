/**
 * @fileoverview Schema Registry types for @igniter-js/collections
 * @module @igniter-js/collections/types/registry
 *
 * @description
 * Types for the Schema Registry feature that allows defining collections
 * dynamically via JSON schema files.
 */

import type { StandardJSONSchemaV1 } from "@standard-schema/spec";
import type { IgniterCollectionViewDefinition } from "./view";

// =============================================================================
// SCHEMA DEFINITION (Forward Declaration)
// =============================================================================

/**
 * Schema definition as a record of field names to field types.
 *
 * This type is defined first to allow recursive references in field definitions.
 * It maps field names to their type specifications, supporting both simple
 * string types and advanced field definitions.
 *
 * @example Simple schema (backward compatible)
 * ```json
 * {
 *   "title": "string",
 *   "views": "number",
 *   "published": "boolean",
 *   "publishedAt": "date",
 *   "tags": "array"
 * }
 * ```
 *
 * @example Advanced schema with constraints and nesting
 * ```json
 * {
 *   "title": { "type": "string", "required": true },
 *   "status": { "type": "string", "enum": ["draft", "published"] },
 *   "tags": { "type": "array", "items": { "type": "string" } },
 *   "author": {
 *     "type": "object",
 *     "properties": {
 *       "name": { "type": "string", "required": true },
 *       "social": {
 *         "type": "object",
 *         "properties": {
 *           "twitter": { "type": "string" },
 *           "github": { "type": "string" }
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export interface IgniterCollectionSchemaDefinition extends StandardJSONSchemaV1 { }

// =============================================================================
// SCHEMA FILE TYPES
// =============================================================================

/**
 * Hook file references in a schema file.
 *
 * Each hook can reference an external file path that exports the hook function.
 * The path is relative to the schema file or absolute from the project root.
 *
 * @example
 * ```json
 * {
 *   "onCreated": "./hooks/on-created.ts",
 *   "onUpdated": "./hooks/on-updated.ts"
 * }
 * ```
 */
export interface IgniterCollectionSchemaHooksConfig {
  /** Path to file exporting onCreated function */
  onCreated?: string;
  /** Path to file exporting onUpdated function */
  onUpdated?: string;
  /** Path to file exporting onDeleted function */
  onDeleted?: string;
  /** Path to file exporting onRead function */
  onRead?: string;
  /** Path to file exporting onList function */
  onList?: string;
}

/**
 * Structure of a schema JSON file.
 *
 * Schema files define collections dynamically and are discovered
 * by the SchemaRegistry at runtime.
 *
 * @example Schema file (posts.schema.json)
 * ```json
 * {
 *   "collectionName": "posts",
 *   "patterns": [".content/posts/{id}.mdx"],
 *   "schema": {
 *     "title": "string",
 *     "description": "string",
 *     "author": "string",
 *     "publishedAt": "date",
 *     "draft": "boolean"
 *   },
 *   "hooks": {
 *     "onCreated": "./hooks/post-hooks.ts",
 *     "onUpdated": "./hooks/post-hooks.ts"
 *   }
 * }
 * ```
 */
export interface IgniterCollectionSchemaFile {
  /** Collection name (used for manager access, e.g., docs.posts) */
  collectionName: string;
  /** Multiple file patterns for flexible storage */
  patterns: string[];
  /** Path to a template file for document generation */
  template?: string;
  /** Schema definition mapping field names to types */
  schema?: IgniterCollectionSchemaDefinition;
  /** Hook file references */
  hooks?: IgniterCollectionSchemaHooksConfig;

  /** View definitions */
  views?: IgniterCollectionViewDefinition[];
}

/**
 * Configuration for the Schema Registry.
 */
export interface IgniterCollectionRegistryConfig {
  /** Path(s) to the directory containing schema JSON files */
  registryPath: string | string[];
  /** Base path for resolving collection paths */
  basePath: string;
  /** Pattern to match schema files (default: "*.schema.json") */
  filePattern?: string;
  /** Whether to watch for changes (file watching) */
  watch?: boolean;
}

/**
 * Result from loading a schema file.
 */
export interface IgniterCollectionLoadedSchema {
  /** The original schema file path */
  filePath: string;
  /** The parsed schema file content */
  schema: IgniterCollectionSchemaFile;
  /** Whether the schema was loaded successfully */
  success: boolean;
  /** Error message if loading failed */
  error?: string;
}
