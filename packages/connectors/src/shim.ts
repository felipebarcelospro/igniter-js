/**
 * @fileoverview Client-side shim for IgniterConnector
 * @module @igniter-js/connectors/shim
 *
 * @description
 * This file provides a safety mechanism to prevent server-side code
 * from being accidentally bundled into client-side applications.
 * It exports Proxy objects that throw errors when accessed.
 */

export const IgniterConnectorManager = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'IgniterConnectorManager is server-only and cannot be imported in client-side code.'
      )
    },
  }
)

export const IgniterConnector = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'IgniterConnector is server-only and cannot be imported in client-side code.'
      )
    },
  }
)

export const IgniterConnectorPrismaAdapter = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'IgniterConnectorPrismaAdapter is server-only and cannot be imported in client-side code.'
      )
    },
  }
)
