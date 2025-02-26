import { subtle } from "uncrypto";
import type { CookieOptions } from "../types";

/**
 * A class for managing HTTP cookies with support for signed cookies and various cookie options.
 * 
 * @example
 * // Create a new cookie manager
 * const cookies = new IgniterCookie(headers);
 * 
 * // Basic cookie operations
 * cookies.set('user', 'john');
 * const value = cookies.get('user'); // 'john'
 * 
 * // Using cookie options
 * cookies.set('session', 'abc123', {
 *   httpOnly: true,
 *   secure: true,
 *   sameSite: 'strict',
 *   maxAge: 3600 // 1 hour
 * });
 * 
 * // Working with signed cookies
 * await cookies.setSigned('token', 'sensitive-data', 'secret-key');
 * const data = await cookies.getSigned('token', 'secret-key');
 * 
 * // Cookie prefixes
 * cookies.set('id', '12345', { prefix: 'secure' }); // Sets __Secure-id
 * cookies.set('session', 'xyz789', { prefix: 'host' }); // Sets __Host-session
 */
export class IgniterCookie {
  private headers: Headers;
  private cookies: Map<string, string> = new Map();
  private readonly HMAC_ALGORITHM = { name: "HMAC", hash: "SHA-256" };

  /**
   * Creates a new IgniterCookie instance.
   * 
   * @param headers - The Headers object containing the cookie information
   */
  constructor(headers: Headers) {
    this.headers = headers;
    this.parse(headers);
  }
  
  /**
   * Parses cookies from the request headers.
   * 
   * @param headers - The Headers object containing the cookie information
   * @private
   */
  private parse(headers: Headers) {
    const cookieHeader = headers.get("cookie");
    if (!cookieHeader) return;

    const cookies = cookieHeader.split(";");
    for (const cookie of cookies) {
      const [key, value] = cookie.split("=");
      this.cookies.set(key, value);
    }
  }

  /**
   * Serializes a cookie with its options into a string.
   * 
   * @param key - The cookie name
   * @param value - The cookie value
   * @param opt - Cookie options
   * @returns The serialized cookie string
   * @private
   */
  private serialize(key: string, value: string, opt: CookieOptions = {}) {
    let cookie: string;

    if (opt?.prefix === "secure") {
      cookie = `${`__Secure-${key}`}=${value}`;
    } else if (opt?.prefix === "host") {
      cookie = `${`__Host-${key}`}=${value}`;
    } else {
      cookie = `${key}=${value}`;
    }

    if (key.startsWith("__Secure-") && !opt.secure) {
      opt.secure = true;
    }

    if (key.startsWith("__Host-")) {
      if (!opt.secure) {
        opt.secure = true;
      }

      if (opt.path !== "/") {
        opt.path = "/";
      }

      if (opt.domain) {
        opt.domain = undefined;
      }
    }

    if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
      if (opt.maxAge > 34560000) {
        throw new Error(
          "Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.",
        );
      }
      cookie += `; Max-Age=${Math.floor(opt.maxAge)}`;
    }

    if (opt.domain && opt.prefix !== "host") {
      cookie += `; Domain=${opt.domain}`;
    }

    if (opt.path) {
      cookie += `; Path=${opt.path}`;
    }

    if (opt.expires) {
      if (opt.expires.getTime() - Date.now() > 34560000_000) {
        throw new Error(
          "Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.",
        );
      }
      cookie += `; Expires=${opt.expires.toUTCString()}`;
    }

    if (opt.httpOnly) {
      cookie += "; HttpOnly";
    }

    if (opt.secure) {
      cookie += "; Secure";
    }

    if (opt.sameSite) {
      cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
    }

    if (opt.partitioned) {
      if (!opt.secure) {
        opt.secure = true;
      }
      cookie += "; Partitioned";
    }

    return cookie;
  }

  /**
   * Gets a cookie value by its key.
   * 
   * @param key - The cookie name
   * @returns The cookie value or undefined if not found
   * 
   * @example
   * const userId = cookies.get('user_id');
   */
  get(key: string) {
    return this.cookies.get(key);
  }

  /**
   * Sets a cookie with the specified key, value, and options.
   * 
   * @param key - The cookie name
   * @param value - The cookie value
   * @param options - Cookie options
   * @returns The serialized cookie string
   * 
   * @example
   * // Set a basic cookie
   * cookies.set('theme', 'dark');
   * 
   * // Set a secure cookie with options
   * cookies.set('session', 'abc123', {
   *   secure: true,
   *   httpOnly: true,
   *   maxAge: 3600,
   *   sameSite: 'strict'
   * });
   */
  set(key: string, value: string, options?: CookieOptions) {
    const cookie = this.serialize(key, value, options);
    this.headers.set("Set-Cookie", cookie);
    this.cookies.set(key, value);
    return cookie
  }

  /**
   * Gets a signed cookie value and verifies its signature.
   * 
   * @param key - The cookie name
   * @param secret - The secret key used for signing
   * @returns The verified cookie value or null if invalid
   * 
   * @example
   * const value = await cookies.getSigned('token', 'your-secret-key');
   * if (value) {
   *   // Cookie is valid and signature verified
   *   console.log('Verified value:', value);
   * }
   */
  async getSigned(key: string, secret: string) {
    const value = this.cookies.get(key);
    if (!value) return null;

    const [content, signature] = decodeURIComponent(value).split('.');
    if (!content || !signature) return null;

    const encodedSecret = new TextEncoder().encode(secret);

    const cryptoKey = await subtle.importKey("raw", encodedSecret, this.HMAC_ALGORITHM, false, ["verify"]);
    const binarySignature = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    const isValid = await subtle.verify(this.HMAC_ALGORITHM, cryptoKey, binarySignature, new TextEncoder().encode(content));

    return isValid ? content : null;
  }

  /**
   * Sets a signed cookie with HMAC signature.
   * 
   * @param key - The cookie name
   * @param value - The cookie value to sign
   * @param secret - The secret key for signing
   * @param options - Cookie options
   * @returns The serialized cookie string
   * 
   * @example
   * // Set a signed cookie
   * await cookies.setSigned('auth_token', 'user-data', 'secret-key', {
   *   httpOnly: true,
   *   secure: true
   * });
   */
  async setSigned(key: string, value: string, secret: string, options?: CookieOptions) {
    const encodedSecret = new TextEncoder().encode(secret);

    const cryptoKey = await subtle.importKey("raw", encodedSecret, this.HMAC_ALGORITHM, false, ["sign"]);
    const signature = await subtle.sign(this.HMAC_ALGORITHM, cryptoKey, new TextEncoder().encode(value));

    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const signedValue = `${value}.${base64Signature}`;
    const encodedSignedValue = encodeURIComponent(signedValue);

    const cookie = this.serialize(key, encodedSignedValue, options);

    this.headers.set("Set-Cookie", cookie);
    this.cookies.set(key, encodedSignedValue);

    return cookie;
  }

  /**
   * Gets all cookies as a Map.
   * 
   * @returns A Map containing all cookie key-value pairs
   * 
   * @example
   * const allCookies = cookies.getAll();
   * for (const [key, value] of allCookies) {
   *   console.log(`${key}: ${value}`);
   * }
   */
  getAll() {
    return this.cookies;
  }

  /**
   * Checks if a cookie exists.
   * 
   * @param key - The cookie name
   * @returns True if the cookie exists, false otherwise
   * 
   * @example
   * if (cookies.has('session')) {
   *   console.log('Session cookie exists');
   * }
   */
  has(key: string) {
    return this.cookies.has(key);
  }

  /**
   * Deletes a cookie.
   * 
   * @param key - The cookie name to delete
   * 
   * @example
   * cookies.delete('session');
   */
  delete(key: string) {
    this.cookies.delete(key);
  }

  /**
   * Clears all cookies.
   * 
   * @example
   * cookies.clear();
   */
  clear() {
    this.cookies.clear();
  }

  /**
   * Converts all cookies to a string representation.
   * 
   * @returns A string containing all cookies in key=value format
   * 
   * @example
   * const cookieString = cookies.toString();
   * console.log(cookieString); // "name=value; session=123"
   */
  toString() {
    return Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }
}
