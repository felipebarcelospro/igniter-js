import { igniter } from '@/igniter'
import { jobs } from '@/services/jobs'
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
      path: '/',
      handler: async ({ request, response, context }) => {
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
      handler: async ({ request, response, context }) => {
        const { key } = request.params
        const cached = await igniter.store.get(key)

        if (cached) {
          return response.success({
            ...cached,
            _source: 'cache'
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
          ...data,
          _source: 'live'
        })
      }
    }),

    listJobs: igniter.query({
      path: '/jobs',
      handler: async ({ request, response, context }) => {
        const scheduledJobs = await jobs.search()
        return response.success(scheduledJobs)
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
      handler: async ({ request, response, context }) => {
        const { message, delay = 0 } = request.body

        const jobId = await igniter.jobs.system.enqueue({
          task: 'sampleJob',
          input: {
            message,
          },
        })

        igniter.logger.info('Job scheduled', { jobId, message })

        return response.success(jobId)
      }
    })
  }
})
