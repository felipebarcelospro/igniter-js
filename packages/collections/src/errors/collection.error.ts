/**
 * @fileoverview Error class and codes for @igniter-js/collections
 * @module @igniter-js/collections/errors
 */

import { IgniterError, type IgniterLogger } from "@igniter-js/common";

/**
 * All possible error codes for IgniterCollection.
 * Use these codes for programmatic error handling.
 */
export const IGNITER_COLLECTION_ERROR_CODES = {
  /** Adapter is required but not provided */
  ADAPTER_REQUIRED: "COLLECTION_ADAPTER_REQUIRED",
  /** Collection not found in registry */
  COLLECTION_NOT_FOUND: "COLLECTION_NOT_FOUND",
  /** Document not found at path */
  DOCUMENT_NOT_FOUND: "COLLECTION_DOCUMENT_NOT_FOUND",
  /** Schema validation failed */
  VALIDATION_ERROR: "COLLECTION_VALIDATION_ERROR",
  /** Hook returned false, cancelling operation */
  HOOK_CANCELLED: "COLLECTION_HOOK_CANCELLED",
  /** Failed to parse frontmatter */
  PARSE_ERROR: "COLLECTION_PARSE_ERROR",
  /** Failed to write document */
  WRITE_ERROR: "COLLECTION_WRITE_ERROR",
  /** Failed to delete document */
  DELETE_ERROR: "COLLECTION_DELETE_ERROR",
  /** Invalid file pattern */
  INVALID_PATTERN: "COLLECTION_INVALID_PATTERN",
  /** Base path not configured */
  BASE_PATH_REQUIRED: "COLLECTION_BASE_PATH_REQUIRED",
  /** Schema registry load failed */
  REGISTRY_ERROR: "COLLECTION_REGISTRY_ERROR",
  /** View not found */
  VIEW_NOT_FOUND: "COLLECTION_VIEW_NOT_FOUND",
  /** Hook execution failed */
  HOOK_EXECUTION_FAILED: "COLLECTION_HOOK_EXECUTION_FAILED",
  /** Transform error */
  TRANSFORM_ERROR: "COLLECTION_TRANSFORM_ERROR",
  /** Stat expression error */
  STAT_EXPRESSION_ERROR: "COLLECTION_STAT_EXPRESSION_ERROR",
  /** Hook is invalid */
  HOOK_INVALID: "COLLECTION_HOOK_INVALID",
  /** Unknown transform type */
  TRANSFORM_UNKNOWN: "COLLECTION_TRANSFORM_UNKNOWN",
  /** Action not found */
  ACTION_NOT_FOUND: "COLLECTION_ACTION_NOT_FOUND",
  /** Invalid action parameters */
  ACTION_INVALID_PARAMS: "COLLECTION_ACTION_INVALID_PARAMS",
} as const;

/**
 * Error code type union.
 */
export type IgniterCollectionErrorCode =
  (typeof IGNITER_COLLECTION_ERROR_CODES)[keyof typeof IGNITER_COLLECTION_ERROR_CODES];

/**
 * Error details for markdown operations.
 */
export interface IgniterCollectionErrorDetails {
  /** Package context */
  "ctx.package": "@igniter-js/collections";
  /** Operation that failed */
  "ctx.operation": string;
  /** Collection name if applicable */
  "ctx.collection"?: string;
  /** Document ID if applicable */
  "ctx.document_id"?: string;
  /** File path if applicable */
  "ctx.path"?: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Custom error class for @igniter-js/collections.
 *
 * @example Handling markdown errors
 * ```typescript
 * try {
 *   await docs.posts.findUnique({ where: { id: 'missing' } });
 * } catch (error) {
 *   if (error instanceof IgniterCollectionError) {
 *     switch (error.code) {
 *       case 'MARKDOWN_DOCUMENT_NOT_FOUND':
 *         console.log('Document not found');
 *         break;
 *       case 'MARKDOWN_VALIDATION_ERROR':
 *         console.log('Invalid data:', error.details);
 *         break;
 *     }
 *   }
 * }
 * ```
 */
export class IgniterCollectionError extends IgniterError {
  constructor({
    message,
    code,
    statusCode = 500,
    details,
    cause,
    logger,
  }: {
    message: string;
    code: IgniterCollectionErrorCode;
    statusCode?: number;
    details?: IgniterCollectionErrorDetails;
    cause?: Error;
    logger?: IgniterLogger;
  }) {
    super({
      message,
      code,
      statusCode,
      details,
      cause,
      causer: "@igniter-js/collections",
      logger,
    });
  }
}
