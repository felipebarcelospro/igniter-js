import { describe, it, expect } from 'vitest'
import { IgniterJobs } from './igniter-jobs'
import { IgniterQueue } from './igniter-queue'
import { IgniterJobsMemoryAdapter } from '../adapters/memory.adapter'

describe('IgniterJobs runtime', () => {
  it('exposes queue management APIs', async () => {
    const queue = IgniterQueue.create('email')
      .withContext<{ ok: true }>()
      .addJob('send', { handler: async () => ({ ok: true }) })
      .build()

    const jobs = IgniterJobs.create<{ ok: true }>()
      .withAdapter(IgniterJobsMemoryAdapter.create())
      .withService('svc')
      .withEnvironment('test')
      .withContext(async () => ({ ok: true }))
      .addQueue(queue)
      .build()

    await jobs.worker.create().addQueue('email').start()

    await jobs.email.send.dispatch({ input: {} })
    await new Promise((r) => setTimeout(r, 10))

    const info = await jobs.email.get().retrieve()
    expect(info?.name).toBe('email')
    expect(info?.jobCounts.completed).toBeGreaterThanOrEqual(1)

    const list = await jobs.email.list({ status: ['completed'], limit: 10 })
    expect(list.length).toBeGreaterThanOrEqual(1)
  })
})
