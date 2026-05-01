/**
 * @fileoverview Browser shim for @igniter-js/logger (server-only package)
 */

throw new Error(
  '@igniter-js/logger is a server-only package and cannot be used in browser environments. ' +
    'Logging in browsers should use console.* methods or browser-specific logging libraries.'
);
