/**
 * Checks if the current environment is a server (Node.js) environment.
 *
 * @returns {boolean} Returns true if running on the server, false otherwise.
 *
 * @example
 * if (isServerEnvironment()) {
 *   // Server-side logic here
 * }
 */
export function isServerEnvironment(): boolean {
  return typeof window === 'undefined' && 
         typeof global !== 'undefined' && 
         typeof process !== 'undefined';
}

/**
 * Checks if the current environment is a client (browser) environment.
 *
 * @returns {boolean} Returns true if running in the browser, false otherwise.
 *
 * @example
 * if (isClientEnvironment()) {
 *   // Client-side logic here
 * }
 */
export function isClientEnvironment(): boolean {
  return typeof window !== 'undefined';
}