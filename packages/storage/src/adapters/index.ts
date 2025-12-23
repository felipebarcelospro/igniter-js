/**
 * @fileoverview Adapter exports for @igniter-js/storage.
 * @module @igniter-js/storage/adapters
 */

// =============================================================================
// PROVIDER ADAPTERS
// =============================================================================

export * from "./s3.adapter";
export type * from "./s3.adapter";
export * from "./google-cloud.adapter";
export type * from "./google-cloud.adapter";

// =============================================================================
// BASE + MOCK ADAPTERS
// =============================================================================

export * from "./storage.adapter";
export type * from "./storage.adapter";
export * from "./mock.adapter";
export type * from "./mock.adapter";
