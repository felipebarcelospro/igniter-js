import type { Redis } from 'ioredis'
import type {
  IgniterJobCounts,
  IgniterJobDefinition,
  IgniterCronDefinition,
  IgniterJobSearchResult,
  IgniterJobStatus,
  IgniterJobsDispatchParams,
  IgniterJobsScheduleParams,
} from './job'
import type { IgniterJobsQueueInfo, IgniterJobsQueueCleanOptions, IgniterJobsQueueManager } from './queue'
import type { IgniterJobsWorkerHandle, IgniterJobsWorkerBuilderConfig } from './worker'
import type { IgniterJobsEventHandler } from './events'

/**
 * Dispatch parameters forwarded to adapters.
 */
export type IgniterJobsAdapterDispatchParams = {
  queue: string
  jobName: string
} & IgniterJobsDispatchParams

/**
 * Schedule parameters forwarded to adapters.
 */
export type IgniterJobsAdapterScheduleParams = {
  queue: string
  jobName: string
} & IgniterJobsScheduleParams

/**
 * Job log entry returned by management APIs.
 */
export interface IgniterJobsJobLog {
  timestamp: Date
  message: string
  level: 'info' | 'warn' | 'error'
}

/**
 * Adapter contract for jobs backends.
 */
export interface IgniterJobsAdapter {
  readonly client: unknown
  readonly queues: IgniterJobsQueueManager

  dispatch(params: IgniterJobsAdapterDispatchParams): Promise<string>
  schedule(params: IgniterJobsAdapterScheduleParams): Promise<string>

  getJob(jobId: string, queue?: string): Promise<IgniterJobSearchResult | null>
  getJobState(jobId: string, queue?: string): Promise<IgniterJobStatus | null>
  getJobLogs(jobId: string, queue?: string): Promise<IgniterJobsJobLog[]>
  getJobProgress(jobId: string, queue?: string): Promise<number>
  retryJob(jobId: string, queue?: string): Promise<void>
  removeJob(jobId: string, queue?: string): Promise<void>
  promoteJob(jobId: string, queue?: string): Promise<void>
  moveJobToFailed(jobId: string, reason: string, queue?: string): Promise<void>
  retryManyJobs(jobIds: string[], queue?: string): Promise<void>
  removeManyJobs(jobIds: string[], queue?: string): Promise<void>

  getQueueInfo(queue: string): Promise<IgniterJobsQueueInfo | null>
  getQueueJobCounts(queue: string): Promise<IgniterJobCounts>
  listQueues(): Promise<IgniterJobsQueueInfo[]>
  pauseQueue(queue: string): Promise<void>
  resumeQueue(queue: string): Promise<void>
  drainQueue(queue: string): Promise<number>
  cleanQueue(queue: string, options: IgniterJobsQueueCleanOptions): Promise<number>
  obliterateQueue(queue: string, options?: { force?: boolean }): Promise<void>
  retryAllInQueue(queue: string): Promise<number>

  pauseJobType(queue: string, jobName: string): Promise<void>
  resumeJobType(queue: string, jobName: string): Promise<void>

  searchJobs(filter: Record<string, unknown>): Promise<IgniterJobSearchResult[]>
  searchQueues(filter: Record<string, unknown>): Promise<IgniterJobsQueueInfo[]>
  searchWorkers(filter: Record<string, unknown>): Promise<IgniterJobsWorkerHandle[]>

  createWorker(config: IgniterJobsWorkerBuilderConfig): Promise<IgniterJobsWorkerHandle>
  getWorkers(): Map<string, IgniterJobsWorkerHandle>

  publishEvent(channel: string, payload: unknown): Promise<void>
  subscribeEvent(channel: string, handler: IgniterJobsEventHandler): Promise<() => Promise<void>>

  registerJob(queueName: string, jobName: string, definition: IgniterJobDefinition<any, any, any>): void
  registerCron(queueName: string, cronName: string, definition: IgniterCronDefinition<any, any>): void

  shutdown(): Promise<void>
}

/**
 * BullMQ adapter options - primarily Redis connection.
 */
export interface IgniterJobsBullMQAdapterOptions {
  redis: Redis
}
