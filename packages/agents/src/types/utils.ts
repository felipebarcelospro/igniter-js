/**
 * Shared type utilities for `@igniter-js/agents`.
 */

import type { z } from "zod";

/**
 * Extracts the inferred type from a Zod schema.
 *
 * @public
 */
export type InferZodSchema<T extends z.ZodSchema> = z.infer<T>;

/**
 * Makes all properties in T optional recursively.
 *
 * @public
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes all properties in T required recursively.
 *
 * @public
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extracts keys from T that have values of type V.
 *
 * @public
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];
