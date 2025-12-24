/**
 * @fileoverview Adapter exports for @igniter-js/connectors
 * @module @igniter-js/connectors/adapters
 */

// =============================================================================
// DATABASE ADAPTERS
// =============================================================================

export * from "./prisma.adapter";
export type * from "./prisma.adapter";

// =============================================================================
// BASE + MOCK ADAPTERS
// =============================================================================

export * from "./connector.adapter";
export type * from "./connector.adapter";
export * from "./mock.adapter";
export type * from "./mock.adapter";
