/**
 * Check if code is running in a server environment
 */
/**
 * Boolean flag indicating whether the code is running in a server-side environment.
 * 
 * This constant evaluates to:
 * - `true` when running on the server (Node.js environment)
 * - `false` when running in a browser environment
 * 
 * This can be useful for conditional logic that needs to behave differently
 * between client-side and server-side execution contexts.
 * 
 * @constant
 * @type {boolean}
 * 
 * @example
 * if (isServer) {
 *   // Server-only code
 * } else {
 *   // Browser-only code
 * }
 */
export const isServer = typeof window === 'undefined';

/**
 * Check if code is running in a client environment
 */
/**
 * A boolean flag indicating whether the current environment is a client-side environment.
 * 
 * This constant is the inverse of `isServer` flag. When `isServer` is false,
 * `isClient` will be true and vice versa.
 * 
 * @constant
 * @type {boolean}
 * 
 * @example
 * ```typescript
 * if (isClient) {
 *   // Execute client-side only code
 * }
 * ```
 */
export const isClient = !isServer;