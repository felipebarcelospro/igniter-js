import { store } from '@/services/store'
import { createBullMQAdapter } from '@igniter-js/adapter-bullmq'
import { z } from 'zod'

/**
 * Job queue adapter for background processing.
 *
 * @remarks
 * Handles asynchronous job processing with BullMQ.
 *
 * @see https://github.com/felipebarcelospro/igniter-js/tree/main/packages/adapter-bullmq
 */
export const jobs = createBullMQAdapter({
  store,
  autoStartWorker: {
    concurrency: 1,
    queues: ['*']
  }
})

export const REGISTERED_JOBS = jobs.merge({
  system: jobs.router({
    jobs: {
      sampleJob: jobs.register({
        name: 'sampleJob',
        input: z.object({
          message: z.string()
        }),
        handler: async ({ input }) => {
          console.log(input.message)
        }
      })
    }
  })
})
