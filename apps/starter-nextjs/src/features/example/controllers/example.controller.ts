import { igniter } from '@/igniter'
import { z } from 'zod'

/**
 * @description Example controller demonstrating Igniter.js features
 * @see https://github.com/felipebarcelospro/igniter-js
 */
export const exampleController = igniter.controller({
  name: 'Example',
  path: '/example',
  actions: {
    // Health check action
    health: igniter.query({
      path: '/health',
      handler: async ({ response }) => {
        igniter.logger.info('Health check requested')
        return response.success({
          status: 'ok',
          timestamp: new Date().toISOString(),
          features: {
            store: true,
            jobs: true,
            mcp: true,
            logging: true
          }
        })
      }
    }),
  }
})
