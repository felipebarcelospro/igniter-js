import { Igniter } from '@igniter-js/core'
import { createIgniterAppContext } from "./igniter.context"
import { logger } from "@/services/logger"
import { telemetry } from "@/services/telemetry"
import { store } from './services/store'

/**
 * @description Initialize the Igniter.js
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const igniter = Igniter
  .context(createIgniterAppContext())
  .store(store)
  .logger(logger)
  .telemetry(telemetry)
  .config({
    baseURL: process.env.NEXT_PUBLIC_IGNITER_API_URL || 'http://localhost:3000',
    basePath: process.env.NEXT_PUBLIC_IGNITER_API_BASE_PATH || '/api/v1',
  })
  .create()
