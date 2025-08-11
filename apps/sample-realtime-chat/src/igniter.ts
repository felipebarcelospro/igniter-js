import { Igniter } from '@igniter-js/core'
import { createIgniterAppContext } from "./igniter.context"
import { logger } from "@/services/logger"
import { telemetry } from "@/services/telemetry"
import { store } from './services/store'

import openapi from './docs/openapi.json'

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
    basePATH: process.env.NEXT_PUBLIC_IGNITER_API_BASE_PATH || '/api/v1',
  })
  .docs({
    openapi,
    info: {
      title: 'Sample Realtime Chat',
      version: '1.0.0',
      description: 'A sample realtime chat application built with Igniter.js',
      contact: {
        name: 'Igniter.js',
        email: 'team@igniterjs.com',
        url: 'https://github.com/felipebarcelospro/igniter-js'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    }
  })
  .create()
