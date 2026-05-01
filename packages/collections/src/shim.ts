/**
 * @fileoverview Server-only shim for @igniter-js/collections
 * @module @igniter-js/collections/shim
 *
 * @description
 * This file is used to prevent the package from being imported in client-side
 * (browser) environments. It is mapped in package.json under the "browser" field
 * and will throw an error if someone attempts to import the package in a browser.
 *
 * The markdown package requires filesystem access which is only available
 * in server environments (Node.js, Deno, Bun).
 */

const message =
  "@igniter-js/collections is a server-only package and cannot be imported in client-side environments. " +
  "This package requires filesystem access which is not available in browsers.";

/**
 * @throws Always throws an error when imported in browser environments
 */
throw new Error(message);
