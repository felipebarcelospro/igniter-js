import { database } from "@/services/database"

/**
 * @description Create the context of the Igniter.js application
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const createIgniterAppContext = () => {
  return {
    database,
  }
}

/**
 * @description The context of the Igniter.js application
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export type IgniterAppContext = Awaited<ReturnType<typeof createIgniterAppContext>>
