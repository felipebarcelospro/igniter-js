/**
 * @fileoverview Server-only protection shim for @igniter-js/telemetry
 * @module @igniter-js/telemetry/shim
 *
 * @description
 * This file ensures that the telemetry package is only used in server-side
 * environments. It throws an error if imported in a browser environment.
 */

const isBrowser =
  typeof globalThis !== 'undefined' &&
  'window' in globalThis &&
  'document' in (globalThis as any).window

if (isBrowser) {
  throw new Error(
    '[IgniterTelemetry] This package is server-only and cannot be used in the browser. ' +
    'Please ensure you are not importing @igniter-js/telemetry in client-side code.'
  )
}

export {}
