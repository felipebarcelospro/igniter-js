import { IgniterStorageError } from "../errors/storage.error";

/**
 * URL and Hostname utilities for `@igniter-js/storage`.
 *
 * Helps with validating and stripping base URLs from input paths to ensure
 * cross-provider compatibility and security.
 *
 * @group Utilities
 */
export class IgniterStorageUrl {
  /**
   * Ensures a string ends with a trailing slash.
   *
   * @param url - The URL to normalize.
   */
  static ensureTrailingSlash(url: string): string {
    return url.endsWith("/") ? url : `${url}/`;
  }

  /**
   * Strips the configured `baseUrl` from an absolute URL to get the relative storage key.
   *
   * If the input is not a URL, it is returned as a normalized relative path.
   * If the input is a URL with a different hostname, an error is thrown.
   *
   * @param params - Input path/URL and the target baseUrl.
   * @returns The relative storage key.
   *
   * @throws IgniterStorageError if the hostname does not match.
   */
  static stripBaseUrlOrThrow(params: {
    input: string;
    baseUrl: string;
  }): string {
    const { input, baseUrl } = params;

    let parsed: URL;
    try {
      parsed = new URL(input);
    } catch {
      // Not a URL, treat as relative path
      return input.replace(/^\/+/, "");
    }

    const base = new URL(baseUrl);

    if (parsed.hostname !== base.hostname) {
      throw new IgniterStorageError({
        code: "IGNITER_STORAGE_INVALID_PATH_HOST",
        operation: "path",
        message:
          "The provided URL has a different hostname than the configured baseUrl.",
        data: {
          input,
          baseUrl,
          inputHost: parsed.hostname,
          baseHost: base.hostname,
        },
      });
    }

    const basePathname = base.pathname.replace(/\/+$/g, "");
    const inputPathname = parsed.pathname;

    const relative = basePathname
      ? inputPathname.replace(
          new RegExp(`^${IgniterStorageUrl.escapeRegExp(basePathname)}`),
          "",
        )
      : inputPathname;

    return relative.replace(/^\/+/, "");
  }

  /** @internal */
  private static escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
