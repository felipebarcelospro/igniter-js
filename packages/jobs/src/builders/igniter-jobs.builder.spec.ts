import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { IgniterJobs } from '../core/igniter-jobs'
import { IgniterQueue } from '../core/igniter-queue'
import { IgniterJobsMemoryAdapter } from '../adapters/memory.adapter'
import { IgniterJobsError } from '../errors/igniter-jobs.error'

describe('IgniterJobsBuilder', () => {
  it('requires adapter/service/environment/context', () => {
    expect(() => IgniterJobs.create<any>().build()).toThrow(IgniterJobsError)

    expect(() =>
      IgniterJobs.create<any>()
        .withAdapter(IgniterJobsMemoryAdapter.create())
        .build(),
    ).toThrow(IgniterJobsError)

    expect(() =>
      IgniterJobs.create<any>()
        .withAdapter(IgniterJobsMemoryAdapter.create())
        .withService('svc')
        .build(),
    ).toThrow(IgniterJobsError)

    expect(() =>
      IgniterJobs.create<any>()
        .withAdapter(IgniterJobsMemoryAdapter.create())
        .withService('svc')
        .withEnvironment('test')
        .build(),
    ).toThrow(IgniterJobsError)
  })

  it('creates a runtime with typed queues and dispatch validates input', async () => {
    const emailQueue = IgniterQueue.create('email')
      .withContext<{ ok: true }>()
      .addJob('sendWelcome', {
        input: z.object({ email: z.string().email() }),
        handler: async ({ input }) => ({ email: input.email }),
      })
      .build()

    const jobs = IgniterJobs.create<{ ok: true }>()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService('svc')
      .withEnvironment('test')
      .withContext(async () => ({ ok: true }))
      .addQueue(emailQueue)
      .build()

    await expect(
      jobs.email.sendWelcome.dispatch({ input: { email: 'not-an-email' } }),
    ).rejects.toThrow(IgniterJobsError)

    const jobId = await jobs.email.sendWelcome.dispatch({
      input: { email: 'user@example.com' },
    })

    expect(typeof jobId).toBe('string')
  })

  it('supports subscribe + worker execution with memory adapter', async () => {
    const emailQueue = IgniterQueue.create('email')
      .withContext<{ ok: true }>()
      .addJob('sendWelcome', {
        input: z.object({ email: z.string().email() }),
        handler: async ({ input }) => ({ sent: input.email }),
      })
      .build()

    const jobs = IgniterJobs.create<{ ok: true }>()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService('svc')
      .withEnvironment('test')
      .withContext(async () => ({ ok: true }))
      .addQueue(emailQueue)
      .build()

    const events: string[] = []
    const off = await jobs.email.sendWelcome.subscribe((event) => {
      events.push(event.type)
    })

    await jobs.worker.create().addQueue('email').start()

    await jobs.email.sendWelcome.dispatch({
      input: { email: 'user@example.com' },
    })

    // Allow microtasks to run.
    await new Promise((r) => setTimeout(r, 10))

    await off()

    expect(events.some((t) => t.endsWith(':enqueued'))).toBe(true)
    expect(events.some((t) => t.endsWith(':started'))).toBe(true)
    expect(events.some((t) => t.endsWith(':completed'))).toBe(true)
  })

  it('enforces required scope when configured', async () => {
    const queue = IgniterQueue.create('email')
      .withContext<{ ok: true }>()
      .addJob('send', { handler: async () => ({ ok: true }) })
      .build()

    const jobs = IgniterJobs.create<{ ok: true }>()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService('svc')
      .withEnvironment('test')
      .withContext(async () => ({ ok: true }))
      .addScope('organization', { required: true })
      .addQueue(queue)
      .build()

    await expect(jobs.email.send.dispatch({ input: {} })).rejects.toThrow(IgniterJobsError)

    const scoped = jobs.scope('organization', 'org_1')
    await expect(scoped.email.send.dispatch({ input: {} })).resolves.toBeTypeOf('string')
  })
})
