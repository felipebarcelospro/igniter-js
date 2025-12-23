import { extension as mimeExtension, lookup as mimeLookup } from "mime-types";

/**
 * MIME type utilities for `@igniter-js/storage`.
 *
 * Provides helpers for content-type inference, extension mapping, and normalization.
 *
 * @group Utilities
 */
export class IgniterStorageMime {
  /**
   * Infers a Content-Type (MIME type) from a filename.
   *
   * @param filename - The name of the file (e.g., 'image.png').
   * @returns The detected MIME type or `null` if unknown.
   *
   * @example
   * ```typescript
   * IgniterStorageMime.inferContentType('resume.pdf'); // 'application/pdf'
   * ```
   */
  static inferContentType(filename: string): string | null {
    const guessed = mimeLookup(filename);
    return typeof guessed === "string" && guessed ? guessed : null;
  }

  /**
   * Infers a file extension (without dot) from a Content-Type string.
   *
   * @param contentType - The MIME type (e.g., 'image/jpeg').
   * @returns The extension or `null` if unknown.
   *
   * @example
   * ```typescript
   * IgniterStorageMime.inferExtension('image/png'); // 'png'
   * ```
   */
  static inferExtension(contentType: string): string | null {
    const normalized = contentType.split(";")[0]?.trim();
    if (!normalized) {
      return null;
    }

    const ext = mimeExtension(normalized);
    return typeof ext === "string" && ext ? ext : null;
  }

  /**
   * Normalizes a Content-Type string for comparison and storage.
   *
   * Trims parameters, converts to lowercase, and handles empty values.
   *
   * @param contentType - The raw content-type header or string.
   */
  static normalize(contentType: string): string {
    return contentType.split(";")[0]?.trim().toLowerCase() || contentType;
  }
}
