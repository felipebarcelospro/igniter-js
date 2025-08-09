import { Igniter } from '@igniter-js/core'
import { createIgniterAppContext } from "./igniter.context"
import { store } from "@/services/store"
import { REGISTERED_JOBS } from "@/services/jobs"
import { logger } from "@/services/logger"
import { telemetry } from "@/services/telemetry"

/**
 * @description Initialize the Igniter.js
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const igniter = Igniter
  .context(createIgniterAppContext())
  .store(store)
  .jobs(REGISTERED_JOBS)
  .logger(logger)
  .telemetry(telemetry)
  .config({
    baseURL: process.env.NEXT_PUBLIC_IGNITER_API_URL || 'http://localhost:3000',
    basePATH: process.env.NEXT_PUBLIC_IGNITER_API_BASE_PATH || '/api/v1',
  })
  .create()
