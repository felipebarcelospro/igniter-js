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

    // Cache demonstration action
    cacheDemo: igniter.query({
      path: '/cache/:key' as const,
      handler: async ({ request, response }) => {
        const { key } = request.params
        const cached = await igniter.store.get(key)

        if (cached) {
          return response.success({
            data: cached,
            source: 'cache'
          })
        }

        // Generate sample data
        const data = {
          message: `Hello from ${key}`,
          timestamp: new Date().toISOString()
        }

        // Cache for 1 hour
        await igniter.store.set(key, data, { ttl: 3600 })

        return response.success({
          data,
          source: 'generated'
        })
      }
    }),

    // Background job scheduling action
    scheduleJob: igniter.mutation({
      name: 'scheduleJob',
      description: 'Schedule a background job',
      path: '/schedule-job',
      method: 'POST',
      body: z.object({
        message: z.string(),
        delay: z.number().optional()
      }),
      handler: async ({ request, response }) => {
        const { message, delay = 0 } = request.body

        const jobId = await igniter.jobs.system.schedule({
          task: 'sampleJob',
          input: {
            message: 'Teste'
          }
        })

        igniter.logger.info('Job scheduled', { jobId, message })

        return response.success({
          jobId,
          message: 'Job scheduled successfully',
          delay
        })
      }
    })
  }
})
