/**
 * Path manipulation utilities for `@igniter-js/storage`.
 *
 * Provides cloud-friendly path joining, splitting, and extension extraction.
 * All paths are treated as URL-like (forward slashes only, no drive letters).
 *
 * @group Utilities
 */
export class IgniterStoragePath {
  /**
   * Normalizes and joins multiple path segments into a single storage key.
   *
   * Automatically handles leading/trailing slashes and empty segments.
   *
   * @param segments - Array of segments to join.
   * @returns A normalized path string without leading/trailing slashes.
   *
   * @example
   * ```typescript
   * IgniterStoragePath.join('uploads/', '/images', 'avatar.png'); // 'uploads/images/avatar.png'
   * ```
   */
  static join(...segments: Array<string | null | undefined | false>): string {
    const normalized = segments
      .flatMap((segment) => {
        if (!segment) {
          return [];
        }

        const raw = String(segment);
        return raw
          .split("/")
          .map((part) => part.trim())
          .filter(Boolean);
      })
      .map((part) => part.replace(/^\/+|\/+$/g, ""))
      .filter(Boolean);

    return normalized.join("/");
  }

  /**
   * Splits a path into its directory and basename components.
   *
   * @param path - The full storage key.
   * @returns An object with `dir` and `base`.
   *
   * @example
   * ```typescript
   * IgniterStoragePath.split('a/b/c.txt'); // { dir: 'a/b', base: 'c.txt' }
   * ```
   */
  static split(path: string): { dir: string; base: string } {
    const normalized = path.replace(/^\/+/, "");
    const idx = normalized.lastIndexOf("/");
    if (idx === -1) {
      return { dir: "", base: normalized };
    }

    return {
      dir: normalized.slice(0, idx),
      base: normalized.slice(idx + 1),
    };
  }

  /**
   * Extracts the file extension (without dot) from a filename or path.
   *
   * @param filename - Filename or full path.
   * @returns Lowercase extension or empty string if none found.
   */
  static getExtension(filename: string): string {
    const last = filename.split("/").pop() || "";
    const idx = last.lastIndexOf(".");
    if (idx <= 0 || idx === last.length - 1) {
      return "";
    }

    return last.slice(idx + 1).toLowerCase();
  }

  /**
   * Extracts the basename (filename with extension) from a path.
   *
   * @param path - Full storage path.
   */
  static getBasename(path: string): string {
    const normalized = path.replace(/\/+$/g, "");
    return normalized.split("/").pop() || "";
  }
}
