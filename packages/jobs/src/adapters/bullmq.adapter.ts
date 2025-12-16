/**
 * @fileoverview BullMQ adapter for @igniter-js/jobs (wraps @igniter-js/adapter-bullmq)
 * @module @igniter-js/jobs/adapters/bullmq
 */

import type { Redis } from 'ioredis'
import type {
  AdvancedScheduleOptions,
  IgniterJobQueueAdapter,
  JobsRouter,
  JobDefinition as CoreJobDefinition,
  JobExecutionContext as CoreJobExecutionContext,
  JobWorkerConfig,
} from '@igniter-js/core'
import { createBullMQAdapter } from '@igniter-js/adapter-bullmq'
import type {
  IgniterCronDefinition,
  IgniterJobDefinition,
  IgniterJobSearchResult,
  IgniterJobStatus,
  IgniterJobsAdapter,
  IgniterJobsAdapterDispatchParams,
  IgniterJobsAdapterScheduleParams,
  IgniterJobsBullMQAdapterOptions,
  IgniterJobsEventHandler,
  IgniterJobsJobLog,
  IgniterJobsQueueCleanOptions,
  IgniterJobsQueueInfo,
  IgniterJobsQueueManager,
  IgniterJobsWorkerBuilderConfig,
  IgniterJobsWorkerHandle,
  IgniterJobsWorkerMetrics,
} from '../types'
import { IgniterJobsPrefix } from '../utils/prefix'
import { IgniterJobsError } from '../errors'

type CoreMergedExecutor = ReturnType<IgniterJobQueueAdapter<any>['merge']>

function toDateArray(values?: Array<string | Date>): Date[] | undefined {
  if (!values) return undefined
  return values.map((v) => (v instanceof Date ? v : new Date(v)))
}

/**
 * BullMQ adapter facade.
 *
 * It reuses the mature BullMQ integration from `@igniter-js/adapter-bullmq` to keep
 * feature parity (workers, queue/job management, advanced scheduling, hooks).
 */
export class IgniterJobsBullMQAdapter implements IgniterJobsAdapter {
  public readonly client: unknown

  private readonly redis: Redis
  private readonly publisher: Redis
  private readonly subscriber: Redis
  private readonly subscribers = new Map<string, Set<(payload: any) => void>>()

  private coreAdapter: IgniterJobQueueAdapter<any> | null = null
  private coreExecutor: CoreMergedExecutor | null = null
  private executorDirty = true

  private readonly jobsByQueue = new Map<string, Map<string, IgniterJobDefinition<any, any, any>>>()
  private readonly cronsByQueue = new Map<string, Map<string, IgniterCronDefinition<any, any>>>()

  public readonly queues: IgniterJobsQueueManager

  private constructor(options: IgniterJobsBullMQAdapterOptions) {
    this.redis = options.redis
    this.publisher = this.redis
    this.subscriber = this.redis.duplicate()
    this.client = { redis: this.redis }

    this.subscriber.on('message', (channel: string, message: string) => {
      const set = this.subscribers.get(channel)
      if (!set || set.size === 0) return
      let payload: any = message
      try {
        payload = JSON.parse(message)
      } catch {
        // ignore, treat as raw
      }
      for (const handler of set) handler(payload)
    })

    this.queues = {
      list: async () => this.listQueues(),
      get: async (name) => this.getQueueInfo(name),
      getJobCounts: async (name) => this.getQueueJobCounts(name),
      getJobs: async (name, filter) => {
        const full = this.toCoreQueueName(name)
        return this.core().queues.getJobs(full, filter as any) as any
      },
      pause: async (name) => this.pauseQueue(name),
      resume: async (name) => this.resumeQueue(name),
      isPaused: async (name) => {
        const full = this.toCoreQueueName(name)
        return this.core().queues.isPaused(full)
      },
      drain: async (name) => this.drainQueue(name),
      clean: async (name, options) => this.cleanQueue(name, options),
      obliterate: async (name, options) => this.obliterateQueue(name, options),
    }
  }

  public static create(options: IgniterJobsBullMQAdapterOptions): IgniterJobsAdapter {
    return new IgniterJobsBullMQAdapter(options)
  }

  public registerJob(queueName: string, jobName: string, definition: IgniterJobDefinition<any, any, any>): void {
    const map = this.jobsByQueue.get(queueName) ?? new Map()
    if (map.has(jobName)) {
      throw new IgniterJobsError({
        code: 'JOBS_DUPLICATE_JOB',
        message: `Job "${jobName}" is already registered in queue "${queueName}".`,
      })
    }
    map.set(jobName, definition)
    this.jobsByQueue.set(queueName, map)
    this.executorDirty = true
  }

  public registerCron(queueName: string, cronName: string, definition: IgniterCronDefinition<any, any>): void {
    const map = this.cronsByQueue.get(queueName) ?? new Map()
    if (map.has(cronName)) {
      throw new IgniterJobsError({
        code: 'JOBS_INVALID_CRON',
        message: `Cron "${cronName}" is already registered in queue "${queueName}".`,
      })
    }
    map.set(cronName, definition)
    this.cronsByQueue.set(queueName, map)
    this.executorDirty = true
  }

  public async dispatch(params: IgniterJobsAdapterDispatchParams): Promise<string> {
    const executor = await this.executor()
    const namespace = (executor as any)[params.queue]
    if (!namespace) {
      throw new IgniterJobsError({
        code: 'JOBS_QUEUE_NOT_FOUND',
        message: `Queue "${params.queue}" is not registered in the adapter.`,
      })
    }
    return namespace.enqueue({
      task: params.jobName,
      input: params.input,
      jobId: params.jobId,
      delay: params.delay,
      priority: params.priority,
      attempts: params.attempts,
      metadata: params.metadata as any,
      removeOnComplete: params.removeOnComplete as any,
      removeOnFail: params.removeOnFail as any,
      limiter: params.limiter as any,
    })
  }

  public async schedule(params: IgniterJobsAdapterScheduleParams): Promise<string> {
    const executor = await this.executor()
    const namespace = (executor as any)[params.queue]
    if (!namespace) {
      throw new IgniterJobsError({
        code: 'JOBS_QUEUE_NOT_FOUND',
        message: `Queue "${params.queue}" is not registered in the adapter.`,
      })
    }

    const schedule: AdvancedScheduleOptions = {
      jobId: params.jobId,
      delay: params.delay,
      priority: params.priority,
      attempts: params.attempts,
      metadata: params.metadata as any,
      removeOnComplete: params.removeOnComplete as any,
      removeOnFail: params.removeOnFail as any,
      limiter: params.limiter as any,
      at: params.at,
      repeat:
        params.cron ||
        params.every ||
        params.maxExecutions ||
        params.skipWeekends ||
        params.onlyBusinessHours ||
        params.businessHours ||
        params.onlyWeekdays ||
        params.skipDates
        ? {
            cron: params.cron,
            every: params.every,
            times: params.maxExecutions,
            skipWeekends: params.skipWeekends,
            onlyBusinessHours: params.onlyBusinessHours,
            businessHours: params.businessHours,
            onlyWeekdays: params.onlyWeekdays,
            skipDates: toDateArray(params.skipDates),
          }
        : undefined,
    }

    return namespace.schedule({
      task: params.jobName,
      input: params.input,
      ...schedule,
    })
  }

  public async getJob(jobId: string, queue?: string): Promise<IgniterJobSearchResult | null> {
    const result = await this.core().job.get(jobId, queue ? this.toCoreQueueName(queue) : undefined)
    return result ? this.mapJob(result, queue) : null
  }

  public async getJobState(jobId: string, queue?: string): Promise<IgniterJobStatus | null> {
    const state = await this.core().job.getState(jobId, queue ? this.toCoreQueueName(queue) : undefined)
    return state as any
  }

  public async getJobLogs(jobId: string, queue?: string): Promise<IgniterJobsJobLog[]> {
    const logs = await this.core().job.getLogs(jobId, queue ? this.toCoreQueueName(queue) : undefined)
    return logs as any
  }

  public async getJobProgress(jobId: string, queue?: string): Promise<number> {
    return this.core().job.getProgress(jobId, queue ? this.toCoreQueueName(queue) : undefined)
  }

  public async retryJob(jobId: string, queue?: string): Promise<void> {
    await this.core().job.retry(jobId, queue ? this.toCoreQueueName(queue) : undefined)
  }

  public async removeJob(jobId: string, queue?: string): Promise<void> {
    await this.core().job.remove(jobId, queue ? this.toCoreQueueName(queue) : undefined)
  }

  public async promoteJob(jobId: string, queue?: string): Promise<void> {
    await this.core().job.promote(jobId, queue ? this.toCoreQueueName(queue) : undefined)
  }

  public async moveJobToFailed(jobId: string, reason: string, queue?: string): Promise<void> {
    await this.core().job.moveToFailed(jobId, reason, queue ? this.toCoreQueueName(queue) : undefined)
  }

  public async retryManyJobs(jobIds: string[], queue?: string): Promise<void> {
    await this.core().job.retryMany(jobIds, queue ? this.toCoreQueueName(queue) : undefined)
  }

  public async removeManyJobs(jobIds: string[], queue?: string): Promise<void> {
    await this.core().job.removeMany(jobIds, queue ? this.toCoreQueueName(queue) : undefined)
  }

  public async getQueueInfo(queue: string): Promise<IgniterJobsQueueInfo | null> {
    const info = await this.core().queues.get(this.toCoreQueueName(queue))
    if (!info) return null
    return this.mapQueueInfo(info)
  }

  public async getQueueJobCounts(queue: string): Promise<any> {
    const counts = await this.core().queues.getJobCounts(this.toCoreQueueName(queue))
    return counts as any
  }

  public async listQueues(): Promise<IgniterJobsQueueInfo[]> {
    const list = await this.core().queues.list()
    return list.map((q) => this.mapQueueInfo(q))
  }

  public async pauseQueue(queue: string): Promise<void> {
    await this.core().queues.pause(this.toCoreQueueName(queue))
  }

  public async resumeQueue(queue: string): Promise<void> {
    await this.core().queues.resume(this.toCoreQueueName(queue))
  }

  public async drainQueue(queue: string): Promise<number> {
    return this.core().queues.drain(this.toCoreQueueName(queue))
  }

  public async cleanQueue(queue: string, options: IgniterJobsQueueCleanOptions): Promise<number> {
    return this.core().queues.clean(this.toCoreQueueName(queue), options as any)
  }

  public async obliterateQueue(queue: string, options?: { force?: boolean }): Promise<void> {
    await this.core().queues.obliterate(this.toCoreQueueName(queue), options)
  }

  public async retryAllInQueue(queue: string): Promise<number> {
    const jobs = await this.core().queues.getJobs(this.toCoreQueueName(queue), { status: ['failed'], limit: 1000 } as any)
    await Promise.all(jobs.map((j) => this.core().job.retry(j.id, this.toCoreQueueName(queue))))
    return jobs.length
  }

  public async pauseJobType(queue: string, jobName: string): Promise<void> {
    void queue
    void jobName
    throw new IgniterJobsError({
      code: 'JOBS_QUEUE_OPERATION_FAILED',
      message: 'BullMQ backend does not support pausing a single job type; pause the queue or adjust worker filters.',
    })
  }

  public async resumeJobType(queue: string, jobName: string): Promise<void> {
    void queue
    void jobName
    throw new IgniterJobsError({
      code: 'JOBS_QUEUE_OPERATION_FAILED',
      message: 'BullMQ backend does not support resuming a single job type; resume the queue or adjust worker filters.',
    })
  }

  public async searchJobs(filter: any): Promise<IgniterJobSearchResult[]> {
    // Minimal implementation: list jobs from a specific queue when provided, otherwise aggregate known queues.
    const queue = filter?.queue as string | undefined
    const status = filter?.status as IgniterJobStatus[] | undefined
    const limit = filter?.limit ?? 100
    const offset = filter?.offset ?? 0

    if (queue) {
      const jobs = await this.core().queues.getJobs(this.toCoreQueueName(queue), { status, limit, offset } as any)
      return jobs.map((j) => this.mapJob(j as any, queue))
    }

    const queues = await this.listQueues()
    const results: IgniterJobSearchResult[] = []
    for (const q of queues) {
      const jobs = await this.core().queues.getJobs(this.toCoreQueueName(q.name), { status, limit, offset } as any)
      results.push(...jobs.map((j) => this.mapJob(j as any, q.name)))
      if (results.length >= limit) break
    }
    return results.slice(0, limit)
  }

  public async searchQueues(filter: any): Promise<IgniterJobsQueueInfo[]> {
    const all = await this.listQueues()
    const name = filter?.name as string | undefined
    const isPaused = filter?.isPaused as boolean | undefined
    return all
      .filter((q) => (name ? q.name.includes(name) : true))
      .filter((q) => (typeof isPaused === 'boolean' ? q.isPaused === isPaused : true))
  }

  public async searchWorkers(filter: any): Promise<IgniterJobsWorkerHandle[]> {
    const queue = filter?.queue as string | undefined
    const isRunning = filter?.isRunning as boolean | undefined

    const all = Array.from(this.core().getWorkers().values())
    return all
      .filter((w) => {
        if (!queue) return true
        const coreQueue = this.toCoreQueueName(queue)
        const queues = (w as any).config?.queues ?? [(w as any).queueName]
        return Array.isArray(queues) ? queues.includes(coreQueue) : false
      })
      .filter((w) => (typeof isRunning === 'boolean' ? (isRunning ? w.isRunning() : !w.isRunning()) : true))
      .map((w) => this.mapWorker(w))
  }

  public async createWorker(config: IgniterJobsWorkerBuilderConfig): Promise<IgniterJobsWorkerHandle> {
    // Ensure jobs/crons are registered in the underlying BullMQ adapter before starting workers.
    await this.executor()

    const queuesSource =
      config.queues?.length
        ? config.queues
        : Array.from(new Set([...this.jobsByQueue.keys(), ...this.cronsByQueue.keys()]))
    const queues = queuesSource.map((q) => this.toCoreQueueName(q))
    const coreConfig: JobWorkerConfig = {
      queues,
      concurrency: config.concurrency ?? 1,
      limiter: config.limiter as any,
      onActive: config.handlers?.onActive as any,
      onSuccess: config.handlers?.onSuccess as any,
      onFailure: config.handlers?.onFailure as any,
      onIdle: config.handlers?.onIdle as any,
    }
    const handle = await (this.core() as any).worker(coreConfig)
    return this.mapWorker(handle)
  }

  public getWorkers(): Map<string, IgniterJobsWorkerHandle> {
    const out = new Map<string, IgniterJobsWorkerHandle>()
    for (const [id, handle] of this.core().getWorkers()) out.set(id, this.mapWorker(handle))
    return out
  }

  public async publishEvent(channel: string, payload: unknown): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload))
  }

  public async subscribeEvent(channel: string, handler: IgniterJobsEventHandler): Promise<() => Promise<void>> {
    const set = this.subscribers.get(channel) ?? new Set<(payload: any) => void>()
    const wrapped = (payload: any) => void handler(payload as any)
    set.add(wrapped)
    this.subscribers.set(channel, set)

    if (set.size === 1) {
      await this.subscriber.subscribe(channel)
    }

    return async () => {
      const current = this.subscribers.get(channel)
      if (!current) return
      current.delete(wrapped)
      if (current.size === 0) {
        this.subscribers.delete(channel)
        await this.subscriber.unsubscribe(channel)
      }
    }
  }

  public async shutdown(): Promise<void> {
    await this.subscriber.quit()
    // BullMQ adapter does not expose global shutdown on the core adapter in a single method;
    // queue/worker cleanup is handled by worker close and queue obliterate.
  }

  private core(): IgniterJobQueueAdapter<any> {
    if (!this.coreAdapter) {
      // We only need the Redis connection. The wrapped job handlers can create real context.
      this.coreAdapter = createBullMQAdapter<any>({
        store: ({ client: this.redis } as any),
      })
    }
    return this.coreAdapter
  }

  private async executor(): Promise<CoreMergedExecutor> {
    if (!this.executorDirty && this.coreExecutor) return this.coreExecutor

    const routers: Record<string, JobsRouter<any>> = {}
    const flattened: Record<string, CoreJobDefinition<any, any, any>> = {}

    const allQueues = new Set<string>([...this.jobsByQueue.keys(), ...this.cronsByQueue.keys()])

    for (const queueName of allQueues) {
      const coreJobs: Record<string, CoreJobDefinition<any, any, any>> = {}

      const jobs = this.jobsByQueue.get(queueName)
      if (jobs) {
        for (const [jobName, def] of jobs.entries()) {
          const queue = def.queue ? `${queueName}.${def.queue}` : queueName
          const fullQueue = IgniterJobsPrefix.buildQueueName(queue)
          coreJobs[jobName] = this.toCoreJobDefinition(queueName, jobName, def, fullQueue)
        }
      }

      const crons = this.cronsByQueue.get(queueName)
      if (crons) {
        for (const [cronName, def] of crons.entries()) {
          const fullQueue = IgniterJobsPrefix.buildQueueName(queueName)
          coreJobs[cronName] = this.toCoreCronJobDefinition(queueName, cronName, def, fullQueue)
        }
      }

      if (Object.keys(coreJobs).length === 0) continue

      routers[queueName] = this.core().router({
        jobs: coreJobs as any,
        namespace: queueName,
      })

      for (const [jobName, def] of Object.entries(coreJobs)) {
        flattened[`${queueName}.${jobName}`] = def
      }
    }

    // Register jobs in bulk so management APIs and workers can resolve handlers.
    await this.core().bulkRegister(flattened as any)

    this.coreExecutor = this.core().merge(routers as any) as any
    this.executorDirty = false
    return this.coreExecutor as CoreMergedExecutor
  }

  private toCoreQueueName(queueName: string): string {
    return IgniterJobsPrefix.buildQueueName(queueName)
  }

  private mapQueueInfo(info: any): IgniterJobsQueueInfo {
    return {
      name: this.fromCoreQueueName(info.name),
      isPaused: info.isPaused,
      jobCounts: info.jobCounts,
    }
  }

  private fromCoreQueueName(full: string): string {
    const prefix = `${IgniterJobsPrefix.BASE_PREFIX}:`
    return full.startsWith(prefix) ? full.slice(prefix.length) : full
  }

  private mapJob(job: any, queue?: string): IgniterJobSearchResult {
    const q = queue ?? this.fromCoreQueueName(job.metadata?.queue ?? job.queueName ?? '')
    const scope = (job.metadata as any)?.__igniter_jobs_scope
    return {
      id: job.id,
      name: job.name,
      queue: q,
      status: job.status,
      input: job.payload,
      result: job.result,
      error: job.error,
      progress: 0,
      attemptsMade: job.attemptsMade ?? 0,
      priority: job.priority ?? 0,
      createdAt: job.createdAt,
      startedAt: job.processedAt,
      completedAt: job.completedAt,
      metadata: job.metadata,
      scope,
    }
  }

  private mapWorker(handle: any): IgniterJobsWorkerHandle {
    const queues = (handle as any).config?.queues ?? [(handle as any).queueName]
    return {
      id: handle.id,
      queues: (queues as string[]).map((q) => this.fromCoreQueueName(q)),
      pause: () => handle.pause(),
      resume: () => handle.resume(),
      close: () => handle.close(),
      isRunning: () => handle.isRunning(),
      isPaused: () => handle.isPaused(),
      isClosed: () => handle.isClosed(),
      getMetrics: async () => handle.getMetrics() as IgniterJobsWorkerMetrics,
    }
  }

  private toCoreJobDefinition(
    queueName: string,
    jobName: string,
    def: IgniterJobDefinition<any, any, any>,
    fullQueueName: string,
  ): CoreJobDefinition<any, any, any> {
    const handler = async (ctx: CoreJobExecutionContext<any, any>) => {
      return def.handler({
        input: ctx.input as any,
        context: ctx.context as any,
        job: {
          id: ctx.job.id,
          name: jobName,
          queue: queueName,
          attemptsMade: ctx.job.attemptsMade,
          createdAt: (ctx.job as any).createdAt,
          metadata: ctx.job.metadata,
        },
        scope: (ctx.job.metadata as any)?.__igniter_jobs_scope,
      } as any)
    }

    return {
      name: jobName,
      input: def.input as any,
      handler,
      queue: { name: fullQueueName },
      attempts: def.attempts,
      priority: def.priority,
      delay: def.delay,
      removeOnComplete: def.removeOnComplete as any,
      removeOnFail: def.removeOnFail as any,
      metadata: def.metadata as any,
      limiter: def.limiter as any,
      onStart: def.onStart as any,
      onSuccess: def.onSuccess as any,
      onFailure: def.onFailure as any,
      onProgress: def.onProgress as any,
    } as any
  }

  private toCoreCronJobDefinition(
    queueName: string,
    cronName: string,
    def: IgniterCronDefinition<any, any>,
    fullQueueName: string,
  ): CoreJobDefinition<any, any, any> {
    const handler = async (ctx: CoreJobExecutionContext<any, any>) => {
      return def.handler({
        context: ctx.context as any,
        job: {
          id: ctx.job.id,
          name: cronName,
          queue: queueName,
          attemptsMade: ctx.job.attemptsMade,
          createdAt: (ctx.job as any).createdAt,
          metadata: ctx.job.metadata,
        },
        scope: (ctx.job.metadata as any)?.__igniter_jobs_scope,
      } as any)
    }

    return {
      name: cronName,
      handler,
      queue: { name: fullQueueName },
      repeat: {
        cron: def.cron,
        tz: def.tz,
        limit: def.maxExecutions,
        startDate: def.startDate,
        endDate: def.endDate,
      },
      metadata:
        def.onlyBusinessHours || def.skipWeekends || def.businessHours || def.onlyWeekdays || def.skipDates || (def.startDate && def.endDate)
          ? {
              advancedScheduling: {
                onlyBusinessHours: def.onlyBusinessHours,
                skipWeekends: def.skipWeekends,
                businessHours: def.businessHours,
                skipDates: toDateArray(def.skipDates),
                onlyWeekdays: def.onlyWeekdays,
                between: def.startDate && def.endDate ? [def.startDate, def.endDate] : undefined,
              },
            }
          : undefined,
    } as any
  }
}
