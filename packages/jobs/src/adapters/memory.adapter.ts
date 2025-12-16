/**
 * @fileoverview In-memory adapter for @igniter-js/jobs (tests/dev only)
 * @module @igniter-js/jobs/adapters/memory
 */

import type {
  IgniterCronDefinition,
  IgniterJobCounts,
  IgniterJobDefinition,
  IgniterJobSearchResult,
  IgniterJobStatus,
  IgniterJobsAdapter,
  IgniterJobsAdapterDispatchParams,
  IgniterJobsAdapterScheduleParams,
  IgniterJobsEventHandler,
  IgniterJobsJobLog,
  IgniterJobsQueueCleanOptions,
  IgniterJobsQueueInfo,
  IgniterJobsQueueManager,
  IgniterJobsWorkerBuilderConfig,
  IgniterJobsWorkerHandle,
  IgniterJobsWorkerMetrics,
} from '../types'
import { IgniterJobsIdGenerator } from '../utils/id-generator'
import { IgniterJobsError } from '../errors/igniter-jobs.error'

type MemoryJob = {
  id: string
  name: string
  queue: string
  input: unknown
  status: IgniterJobStatus
  progress: number
  attemptsMade: number
  maxAttempts: number
  priority: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: unknown
  error?: string
  metadata?: Record<string, unknown>
  scope?: unknown
  logs: IgniterJobsJobLog[]
}

type MemoryWorkerState = {
  id: string
  queues: string[]
  concurrency: number
  paused: boolean
  closed: boolean
  startedAt: Date
  metrics: {
    processed: number
    failed: number
    totalDuration: number
  }
  handlers?: IgniterJobsWorkerBuilderConfig['handlers']
}

/**
 * Lightweight in-memory adapter used for unit tests and local development.
 *
 * This adapter is not suitable for production use.
 */
export class IgniterJobsMemoryAdapter implements IgniterJobsAdapter {
  public readonly client = {
    type: 'memory' as const,
  }

  private readonly jobsById = new Map<string, MemoryJob>()
  private readonly jobsByQueue = new Map<string, string[]>()
  private readonly registeredJobs = new Map<string, Map<string, IgniterJobDefinition<any, any, any>>>()
  private readonly registeredCrons = new Map<string, Map<string, IgniterCronDefinition<any, any>>>()

  private readonly workers = new Map<string, MemoryWorkerState>()

  private readonly subscribers = new Map<string, Set<IgniterJobsEventHandler>>()

  public readonly queues: IgniterJobsQueueManager = {
    list: async () => this.listQueues(),
    get: async (name) => this.getQueueInfo(name),
    getJobCounts: async (name) => this.getQueueJobCounts(name),
    getJobs: async (name, filter) => {
      const statuses = filter?.status
      const limit = filter?.limit ?? 100
      const offset = filter?.offset ?? 0
      const results = await this.searchJobs({
        queue: name,
        status: statuses,
        limit,
        offset,
      } as any)
      return results
    },
    pause: async (name) => this.pauseQueue(name),
    resume: async (name) => this.resumeQueue(name),
    isPaused: async (name) => {
      // Queue-level pause is stored as a special marker job list state.
      // For memory adapter, we model it by a metadata flag in queue info.
      const info = await this.getQueueInfo(name)
      return info?.isPaused ?? false
    },
    drain: async (name) => this.drainQueue(name),
    clean: async (name, options) => this.cleanQueue(name, options),
    obliterate: async (name, options) => this.obliterateQueue(name, options),
  }

  private readonly pausedQueues = new Set<string>()

  public static create(): IgniterJobsAdapter {
    return new IgniterJobsMemoryAdapter()
  }

  public registerJob(queueName: string, jobName: string, definition: IgniterJobDefinition<any, any, any>): void {
    const queueJobs = this.registeredJobs.get(queueName) ?? new Map<string, IgniterJobDefinition<any, any, any>>()
    if (queueJobs.has(jobName)) {
      throw new IgniterJobsError({
        code: 'JOBS_DUPLICATE_JOB',
        message: `Job "${jobName}" already registered for queue "${queueName}".`,
      })
    }
    queueJobs.set(jobName, definition)
    this.registeredJobs.set(queueName, queueJobs)
  }

  public registerCron(queueName: string, cronName: string, definition: IgniterCronDefinition<any, any>): void {
    const queueCrons = this.registeredCrons.get(queueName) ?? new Map<string, IgniterCronDefinition<any, any>>()
    if (queueCrons.has(cronName)) {
      throw new IgniterJobsError({
        code: 'JOBS_INVALID_CRON',
        message: `Cron "${cronName}" already registered for queue "${queueName}".`,
      })
    }
    queueCrons.set(cronName, definition)
    this.registeredCrons.set(queueName, queueCrons)
  }

  public async dispatch(params: IgniterJobsAdapterDispatchParams): Promise<string> {
    const jobId = params.jobId ?? IgniterJobsIdGenerator.generate('job')
    const maxAttempts = params.attempts ?? 1

    const metadata = params.metadata ?? {}

    const job: MemoryJob = {
      id: jobId,
      name: params.jobName,
      queue: params.queue,
      input: params.input,
      status: this.pausedQueues.has(params.queue) ? 'paused' : (params.delay && params.delay > 0 ? 'delayed' : 'waiting'),
      progress: 0,
      attemptsMade: 0,
      maxAttempts,
      priority: params.priority ?? 0,
      createdAt: new Date(),
      metadata: metadata as Record<string, unknown>,
      scope: params.scope,
      logs: [],
    }

    this.jobsById.set(jobId, job)
    const queueList = this.jobsByQueue.get(params.queue) ?? []
    queueList.push(jobId)
    this.jobsByQueue.set(params.queue, queueList)

    if (params.delay && params.delay > 0) {
      setTimeout(() => {
        const stored = this.jobsById.get(jobId)
        if (!stored) return
        if (!this.pausedQueues.has(params.queue)) stored.status = 'waiting'
        void this.kickWorkers(params.queue)
      }, params.delay)
      return jobId
    }

    void this.kickWorkers(params.queue)
    return jobId
  }

  public async schedule(params: IgniterJobsAdapterScheduleParams): Promise<string> {
    if (params.at) {
      const delay = params.at.getTime() - Date.now()
      if (delay <= 0) {
        throw new IgniterJobsError({
          code: 'JOBS_INVALID_SCHEDULE',
          message: 'Scheduled time must be in the future.',
        })
      }
      return this.dispatch({ ...params, delay })
    }
    if (params.cron || params.every) {
      // Memory adapter does not implement a cron engine. It stores the job as delayed and relies on tests
      // to invoke dispatch manually if needed.
      return this.dispatch({ ...params, delay: params.delay ?? 0 })
    }
    return this.dispatch(params)
  }

  public async getJob(jobId: string, queue?: string): Promise<IgniterJobSearchResult | null> {
    const job = this.jobsById.get(jobId)
    if (!job) return null
    if (queue && job.queue !== queue) return null
    return this.toSearchResult(job)
  }

  public async getJobState(jobId: string, queue?: string): Promise<IgniterJobStatus | null> {
    const job = this.jobsById.get(jobId)
    if (!job) return null
    if (queue && job.queue !== queue) return null
    return job.status
  }

  public async getJobLogs(jobId: string, queue?: string): Promise<IgniterJobsJobLog[]> {
    const job = this.jobsById.get(jobId)
    if (!job) return []
    if (queue && job.queue !== queue) return []
    return job.logs
  }

  public async getJobProgress(jobId: string, queue?: string): Promise<number> {
    const job = this.jobsById.get(jobId)
    if (!job) return 0
    if (queue && job.queue !== queue) return 0
    return job.progress
  }

  public async retryJob(jobId: string, queue?: string): Promise<void> {
    const job = this.jobsById.get(jobId)
    if (!job) {
      throw new IgniterJobsError({ code: 'JOBS_NOT_FOUND', message: `Job "${jobId}" not found.` })
    }
    if (queue && job.queue !== queue) {
      throw new IgniterJobsError({ code: 'JOBS_NOT_FOUND', message: `Job "${jobId}" not found in queue "${queue}".` })
    }
    job.status = 'waiting'
    job.error = undefined
    job.completedAt = undefined
    job.progress = 0
    void this.kickWorkers(job.queue)
  }

  public async removeJob(jobId: string, queue?: string): Promise<void> {
    const job = this.jobsById.get(jobId)
    if (!job) return
    if (queue && job.queue !== queue) return
    this.jobsById.delete(jobId)
    const list = this.jobsByQueue.get(job.queue)
    if (list) this.jobsByQueue.set(job.queue, list.filter((id) => id !== jobId))
  }

  public async promoteJob(jobId: string, queue?: string): Promise<void> {
    const job = this.jobsById.get(jobId)
    if (!job) {
      throw new IgniterJobsError({ code: 'JOBS_NOT_FOUND', message: `Job "${jobId}" not found.` })
    }
    if (queue && job.queue !== queue) {
      throw new IgniterJobsError({ code: 'JOBS_NOT_FOUND', message: `Job "${jobId}" not found in queue "${queue}".` })
    }
    if (job.status === 'delayed' || job.status === 'paused') {
      job.status = this.pausedQueues.has(job.queue) ? 'paused' : 'waiting'
      void this.kickWorkers(job.queue)
    }
  }

  public async moveJobToFailed(jobId: string, reason: string, queue?: string): Promise<void> {
    const job = this.jobsById.get(jobId)
    if (!job) {
      throw new IgniterJobsError({ code: 'JOBS_NOT_FOUND', message: `Job "${jobId}" not found.` })
    }
    if (queue && job.queue !== queue) {
      throw new IgniterJobsError({ code: 'JOBS_NOT_FOUND', message: `Job "${jobId}" not found in queue "${queue}".` })
    }
    job.status = 'failed'
    job.error = reason
    job.completedAt = new Date()
  }

  public async retryManyJobs(jobIds: string[], queue?: string): Promise<void> {
    await Promise.all(jobIds.map((id) => this.retryJob(id, queue)))
  }

  public async removeManyJobs(jobIds: string[], queue?: string): Promise<void> {
    await Promise.all(jobIds.map((id) => this.removeJob(id, queue)))
  }

  public async getQueueInfo(queue: string): Promise<IgniterJobsQueueInfo | null> {
    const counts = await this.getQueueJobCounts(queue)
    return {
      name: queue,
      isPaused: this.pausedQueues.has(queue),
      jobCounts: counts,
    }
  }

  public async getQueueJobCounts(queue: string): Promise<IgniterJobCounts> {
    const jobIds = this.jobsByQueue.get(queue) ?? []
    const counts: IgniterJobCounts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    }
    for (const id of jobIds) {
      const job = this.jobsById.get(id)
      if (!job) continue
      if (job.status in counts) {
        ;(counts as any)[job.status]++
      }
    }
    return counts
  }

  public async listQueues(): Promise<IgniterJobsQueueInfo[]> {
    const queues = Array.from(new Set([...this.jobsByQueue.keys(), ...this.registeredJobs.keys(), ...this.registeredCrons.keys()]))
    const result: IgniterJobsQueueInfo[] = []
    for (const q of queues) {
      result.push((await this.getQueueInfo(q))!)
    }
    return result
  }

  public async pauseQueue(queue: string): Promise<void> {
    this.pausedQueues.add(queue)
    const jobIds = this.jobsByQueue.get(queue) ?? []
    for (const id of jobIds) {
      const job = this.jobsById.get(id)
      if (!job) continue
      if (job.status === 'waiting') job.status = 'paused'
    }
  }

  public async resumeQueue(queue: string): Promise<void> {
    this.pausedQueues.delete(queue)
    const jobIds = this.jobsByQueue.get(queue) ?? []
    for (const id of jobIds) {
      const job = this.jobsById.get(id)
      if (!job) continue
      if (job.status === 'paused') job.status = 'waiting'
    }
    void this.kickWorkers(queue)
  }

  public async drainQueue(queue: string): Promise<number> {
    const jobIds = this.jobsByQueue.get(queue) ?? []
    let removed = 0
    for (const id of jobIds) {
      const job = this.jobsById.get(id)
      if (!job) continue
      if (job.status === 'waiting' || job.status === 'paused') {
        this.jobsById.delete(id)
        removed++
      }
    }
    this.jobsByQueue.set(queue, jobIds.filter((id) => this.jobsById.has(id)))
    return removed
  }

  public async cleanQueue(queue: string, options: IgniterJobsQueueCleanOptions): Promise<number> {
    const statuses = Array.isArray(options.status) ? options.status : [options.status]
    const olderThan = options.olderThan ?? 0
    const limit = options.limit ?? Number.POSITIVE_INFINITY

    const jobIds = this.jobsByQueue.get(queue) ?? []
    const now = Date.now()
    let cleaned = 0

    for (const id of [...jobIds]) {
      if (cleaned >= limit) break
      const job = this.jobsById.get(id)
      if (!job) continue
      if (!statuses.includes(job.status)) continue
      const ageMs = now - job.createdAt.getTime()
      if (ageMs < olderThan) continue
      this.jobsById.delete(id)
      cleaned++
    }

    this.jobsByQueue.set(queue, jobIds.filter((id) => this.jobsById.has(id)))
    return cleaned
  }

  public async obliterateQueue(queue: string, options?: { force?: boolean }): Promise<void> {
    void options
    const jobIds = this.jobsByQueue.get(queue) ?? []
    for (const id of jobIds) this.jobsById.delete(id)
    this.jobsByQueue.delete(queue)
    this.registeredJobs.delete(queue)
    this.registeredCrons.delete(queue)
    this.pausedQueues.delete(queue)
  }

  public async retryAllInQueue(queue: string): Promise<number> {
    const jobIds = this.jobsByQueue.get(queue) ?? []
    let retried = 0
    for (const id of jobIds) {
      const job = this.jobsById.get(id)
      if (!job) continue
      if (job.status === 'failed') {
        await this.retryJob(id, queue)
        retried++
      }
    }
    return retried
  }

  public async pauseJobType(queue: string, jobName: string): Promise<void> {
    // Memory adapter supports job-type pause by blocking processing inside workers.
    // We model it by marking matching waiting jobs as paused.
    const jobIds = this.jobsByQueue.get(queue) ?? []
    for (const id of jobIds) {
      const job = this.jobsById.get(id)
      if (!job) continue
      if (job.name === jobName && job.status === 'waiting') job.status = 'paused'
    }
  }

  public async resumeJobType(queue: string, jobName: string): Promise<void> {
    const jobIds = this.jobsByQueue.get(queue) ?? []
    for (const id of jobIds) {
      const job = this.jobsById.get(id)
      if (!job) continue
      if (job.name === jobName && job.status === 'paused') job.status = 'waiting'
    }
    void this.kickWorkers(queue)
  }

  public async searchJobs(filter: any): Promise<IgniterJobSearchResult[]> {
    const queue = filter?.queue as string | undefined
    const statuses: IgniterJobStatus[] | undefined = filter?.status
    const limit = filter?.limit ?? 100
    const offset = filter?.offset ?? 0

    const all = Array.from(this.jobsById.values())
      .filter((j) => (queue ? j.queue === queue : true))
      .filter((j) => (statuses ? statuses.includes(j.status) : true))
      .sort((a, b) => (b.priority - a.priority) || (a.createdAt.getTime() - b.createdAt.getTime()))

    return all.slice(offset, offset + limit).map((j) => this.toSearchResult(j))
  }

  public async searchQueues(filter: any): Promise<IgniterJobsQueueInfo[]> {
    const name = filter?.name as string | undefined
    const isPaused = filter?.isPaused as boolean | undefined
    const all = await this.listQueues()
    return all
      .filter((q) => (name ? q.name.includes(name) : true))
      .filter((q) => (typeof isPaused === 'boolean' ? q.isPaused === isPaused : true))
  }

  public async searchWorkers(filter: any): Promise<IgniterJobsWorkerHandle[]> {
    const queue = filter?.queue as string | undefined
    const isRunning = filter?.isRunning as boolean | undefined
    return Array.from(this.workers.values())
      .filter((w) => (queue ? w.queues.includes(queue) : true))
      .filter((w) => (typeof isRunning === 'boolean' ? (isRunning ? !w.closed : w.closed) : true))
      .map((w) => this.toWorkerHandle(w))
  }

  public async createWorker(config: IgniterJobsWorkerBuilderConfig): Promise<IgniterJobsWorkerHandle> {
    const workerId = IgniterJobsIdGenerator.generate('worker')
    const state: MemoryWorkerState = {
      id: workerId,
      queues: config.queues ?? [],
      concurrency: config.concurrency ?? 1,
      paused: false,
      closed: false,
      startedAt: new Date(),
      metrics: { processed: 0, failed: 0, totalDuration: 0 },
      handlers: config.handlers,
    }
    this.workers.set(workerId, state)

    // Kick initial processing.
    for (const q of state.queues) void this.kickWorkers(q)

    return this.toWorkerHandle(state)
  }

  public getWorkers(): Map<string, IgniterJobsWorkerHandle> {
    const out = new Map<string, IgniterJobsWorkerHandle>()
    for (const [id, state] of this.workers) out.set(id, this.toWorkerHandle(state))
    return out
  }

  public async publishEvent(channel: string, payload: unknown): Promise<void> {
    const handlers = this.subscribers.get(channel)
    if (!handlers) return
    await Promise.all(Array.from(handlers).map(async (h) => h(payload as any)))
  }

  public async subscribeEvent(channel: string, handler: IgniterJobsEventHandler): Promise<() => Promise<void>> {
    const set = this.subscribers.get(channel) ?? new Set<IgniterJobsEventHandler>()
    set.add(handler)
    this.subscribers.set(channel, set)

    return async () => {
      const current = this.subscribers.get(channel)
      if (!current) return
      current.delete(handler)
      if (current.size === 0) this.subscribers.delete(channel)
    }
  }

  public async shutdown(): Promise<void> {
    this.workers.clear()
    this.subscribers.clear()
  }

  private toSearchResult(job: MemoryJob): IgniterJobSearchResult {
    return {
      id: job.id,
      name: job.name,
      queue: job.queue,
      status: job.status,
      input: job.input,
      result: job.result,
      error: job.error,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      priority: job.priority,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      metadata: job.metadata,
      scope: job.scope as any,
    }
  }

  private toWorkerHandle(worker: MemoryWorkerState): IgniterJobsWorkerHandle {
    return {
      id: worker.id,
      queues: worker.queues,
      pause: async () => { worker.paused = true },
      resume: async () => { worker.paused = false; for (const q of worker.queues) void this.kickWorkers(q) },
      close: async () => { worker.closed = true },
      isRunning: () => !worker.closed && !worker.paused,
      isPaused: () => worker.paused,
      isClosed: () => worker.closed,
      getMetrics: async () => this.toWorkerMetrics(worker),
    }
  }

  private toWorkerMetrics(worker: MemoryWorkerState): IgniterJobsWorkerMetrics {
    const uptime = Date.now() - worker.startedAt.getTime()
    const processed = worker.metrics.processed
    return {
      processed,
      failed: worker.metrics.failed,
      avgDuration: processed > 0 ? worker.metrics.totalDuration / processed : 0,
      concurrency: worker.concurrency,
      uptime,
    }
  }

  private async kickWorkers(queue: string): Promise<void> {
    if (this.pausedQueues.has(queue)) return
    const relevant = Array.from(this.workers.values()).filter((w) => !w.closed && !w.paused && (w.queues.length === 0 || w.queues.includes(queue)))
    if (relevant.length === 0) return

    for (const w of relevant) {
      void this.processLoop(w, queue)
    }
  }

  private async processLoop(worker: MemoryWorkerState, queue: string): Promise<void> {
    if (worker.closed || worker.paused) return
    const concurrency = Math.max(1, worker.concurrency)

    const running = (worker as any).__running as number | undefined
    const currentRunning = running ?? 0
    if (currentRunning >= concurrency) return
    ;(worker as any).__running = currentRunning + 1

    try {
      const next = this.nextJob(queue)
      if (!next) return
      await this.processJob(worker, next)
    } finally {
      ;(worker as any).__running = ((worker as any).__running as number) - 1
      // Continue draining if more work exists.
      if (this.nextJob(queue)) void this.processLoop(worker, queue)
      else if (worker.handlers?.onIdle) await worker.handlers.onIdle()
    }
  }

  private nextJob(queue: string): MemoryJob | null {
    const ids = this.jobsByQueue.get(queue) ?? []
    const candidates = ids
      .map((id) => this.jobsById.get(id))
      .filter((j): j is MemoryJob => Boolean(j))
      .filter((j) => j.status === 'waiting')
      .sort((a, b) => (b.priority - a.priority) || (a.createdAt.getTime() - b.createdAt.getTime()))
    return candidates[0] ?? null
  }

  private async processJob(worker: MemoryWorkerState, job: MemoryJob): Promise<void> {
    if (this.pausedQueues.has(job.queue)) {
      job.status = 'paused'
      return
    }

    job.status = 'active'
    job.startedAt = new Date()
    job.attemptsMade += 1
    job.logs.push({ timestamp: new Date(), level: 'info', message: 'Job started' })

    if (worker.handlers?.onActive) await worker.handlers.onActive({ job: this.toSearchResult(job) })

    const start = Date.now()

    try {
      const definition = this.registeredJobs.get(job.queue)?.get(job.name)
      if (!definition) {
        throw new IgniterJobsError({
          code: 'JOBS_NOT_REGISTERED',
          message: `Job "${job.name}" is not registered for queue "${job.queue}".`,
        })
      }

      if (definition.onStart) {
        await definition.onStart({
          input: job.input as any,
          context: {} as any,
          job: { id: job.id, name: job.name, queue: job.queue, attemptsMade: job.attemptsMade, metadata: job.metadata },
          scope: job.scope as any,
          startedAt: job.startedAt,
        } as any)
      }

      const result = await definition.handler({
        input: job.input as any,
        context: {} as any,
        job: { id: job.id, name: job.name, queue: job.queue, attemptsMade: job.attemptsMade, metadata: job.metadata },
        scope: job.scope as any,
      } as any)

      const duration = Date.now() - start
      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result
      job.progress = 100
      job.logs.push({ timestamp: new Date(), level: 'info', message: `Job completed in ${duration}ms` })

      worker.metrics.processed += 1
      worker.metrics.totalDuration += duration

      if (definition.onSuccess) {
        await definition.onSuccess({
          input: job.input as any,
          context: {} as any,
          job: { id: job.id, name: job.name, queue: job.queue, attemptsMade: job.attemptsMade, metadata: job.metadata },
          scope: job.scope as any,
          result,
          duration,
        } as any)
      }

      if (worker.handlers?.onSuccess) await worker.handlers.onSuccess({ job: this.toSearchResult(job), result })
    } catch (error: any) {
      const duration = Date.now() - start
      job.error = error?.message ?? String(error)
      job.logs.push({ timestamp: new Date(), level: 'error', message: job.error ?? 'Unknown error' })

      const isFinalAttempt = job.attemptsMade >= job.maxAttempts
      if (isFinalAttempt) {
        job.status = 'failed'
        job.completedAt = new Date()
        worker.metrics.failed += 1

        const definition = this.registeredJobs.get(job.queue)?.get(job.name)
        if (definition?.onFailure) {
          await definition.onFailure({
            input: job.input as any,
            context: {} as any,
            job: { id: job.id, name: job.name, queue: job.queue, attemptsMade: job.attemptsMade, metadata: job.metadata },
            scope: job.scope as any,
            error,
            isFinalAttempt: true,
          } as any)
        }

        if (worker.handlers?.onFailure) await worker.handlers.onFailure({ job: this.toSearchResult(job), error })
      } else {
        job.status = 'waiting'
        void this.kickWorkers(job.queue)
      }
    }
  }
}
