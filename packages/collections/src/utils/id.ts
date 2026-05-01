/**
 * @fileoverview ID generation utilities for @igniter-js/collections
 * @module @igniter-js/collections/utils/id
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Static utility class for ID generation.
 *
 * Provides multiple strategies for generating document IDs.
 *
 * @example Using different ID generators
 * ```typescript
 * IgniterCollectionId.uuid();     // "550e8400-e29b-41d4-a716-446655440000"
 * IgniterCollectionId.slug("Hello World!"); // "hello-world"
 * IgniterCollectionId.dateSlug(); // "2024-01-15-abc123"
 * ```
 */
export class IgniterCollectionId {
  private constructor() {}

  /**
   * Generate a UUID v4.
   *
   * @returns UUID string
   */
  static uuid(): string {
    return uuidv4();
  }

  /**
   * Convert text to a URL-safe slug.
   *
   * @param text - Text to slugify
   * @returns Slugified string
   *
   * @example
   * ```typescript
   * IgniterCollectionId.slug("Hello World!") // "hello-world"
   * IgniterCollectionId.slug("Café & Código") // "cafe-codigo"
   * ```
   */
  static slug(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
      .replace(/^-+|-+$/g, "") // Trim dashes
      .replace(/-+/g, "-"); // Collapse multiple dashes
  }

  /**
   * Generate a date-prefixed slug.
   *
   * @param date - Date to use (defaults to now)
   * @param suffix - Optional suffix (defaults to short random string)
   * @returns Date slug like "2024-01-15-abc123"
   */
  static dateSlug(date?: Date, suffix?: string): string {
    const d = date ?? new Date();
    const dateStr = d.toISOString().split("T")[0];
    const suffixStr = suffix ?? IgniterCollectionId.shortId();
    return `${dateStr}-${suffixStr}`;
  }

  /**
   * Generate a short random ID.
   *
   * @param length - Length of ID (default 6)
   * @returns Short random string
   */
  static shortId(length = 6): string {
    return uuidv4().replace(/-/g, "").slice(0, length);
  }

  /**
   * Generate a timestamp-based ID.
   *
   * @returns Timestamp ID like "1705334400000-abc123"
   */
  static timestampId(): string {
    return `${Date.now()}-${IgniterCollectionId.shortId()}`;
  }

  /**
   * Create a custom ID generator function.
   *
   * @param prefix - Prefix for generated IDs
   * @returns Generator function
   *
   * @example
   * ```typescript
   * const generator = IgniterCollectionId.createGenerator('post');
   * generator(); // "post-abc123"
   * generator(); // "post-def456"
   * ```
   */
  static createGenerator(prefix: string): () => string {
    return () => `${prefix}-${IgniterCollectionId.shortId()}`;
  }
}
