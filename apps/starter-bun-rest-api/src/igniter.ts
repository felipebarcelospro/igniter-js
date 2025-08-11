import { Igniter } from '@igniter-js/core'
import { createIgniterAppContext } from "./igniter.context"
import { store } from "@/services/store"
import { REGISTERED_JOBS } from "@/services/jobs"
import { logger } from "@/services/logger"
import { telemetry } from "@/services/telemetry"

import openapi from './docs/openapi.json'

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
    baseURL: process.env.IGNITER_API_URL || 'http://localhost:3000',
    basePATH: process.env.IGNITER_API_BASE_PATH || '/api/v1',
  })
  .docs({
    openapi,
    info: {
      title: 'Igniter.js Starter (Bun REST API)',
      version: '1.0.0',
      description: 'A sample Bun REST API built with Igniter.js',
    }
  })
  .create()
