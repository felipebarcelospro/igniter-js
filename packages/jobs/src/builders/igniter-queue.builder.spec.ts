import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { IgniterQueue } from '../core/igniter-queue'
import { IgniterJobsError } from '../errors/igniter-jobs.error'

describe('IgniterQueueBuilder', () => {
  it('builds a queue with jobs and crons', () => {
    const queue = IgniterQueue.create('email')
      .withContext<{ ok: true }>()
      .addJob('sendWelcome', {
        input: z.object({ email: z.string().email() }),
        handler: async ({ input }) => ({ email: input.email }),
      })
      .addCron('cleanup', {
        cron: '0 2 * * *',
        handler: async () => ({ ok: true }),
      })
      .build()

    expect(queue.name).toBe('email')
    expect(Object.keys(queue.jobs)).toEqual(['sendWelcome'])
    expect(Object.keys(queue.crons)).toEqual(['cleanup'])
  })

  it('throws on duplicate job names', () => {
    expect(() =>
      IgniterQueue.create('email').withContext<unknown>()
        .addJob('send', { handler: async () => {} })
        .addJob('send', { handler: async () => {} }),
    ).toThrow(IgniterJobsError)
  })

  it('throws on job/cron name conflicts', () => {
    expect(() =>
      IgniterQueue.create('email').withContext<unknown>()
        .addCron('cleanup', { cron: '0 2 * * *', handler: async () => {} })
        .addJob('cleanup', { handler: async () => {} }),
    ).toThrow(IgniterJobsError)
  })
})
