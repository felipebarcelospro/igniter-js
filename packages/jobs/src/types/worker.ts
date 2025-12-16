import type { IgniterJobsLimiter, IgniterJobSearchResult } from './job'

/**
 * Metrics reported by a worker.
 */
export interface IgniterJobsWorkerMetrics {
  processed: number
  failed: number
  avgDuration: number
  concurrency: number
  uptime: number
}

/**
 * Handlers invoked during worker lifecycle.
 */
export interface IgniterJobsWorkerHandlers {
  onActive?: (ctx: { job: IgniterJobSearchResult }) => void | Promise<void>
  onSuccess?: (ctx: { job: IgniterJobSearchResult; result: unknown }) => void | Promise<void>
  onFailure?: (ctx: { job: IgniterJobSearchResult; error: Error }) => void | Promise<void>
  onIdle?: () => void | Promise<void>
}

/**
 * Worker configuration passed to adapters.
 */
export interface IgniterJobsWorkerBuilderConfig {
  queues: string[]
  concurrency?: number
  limiter?: IgniterJobsLimiter
  handlers?: IgniterJobsWorkerHandlers
}

/**
 * Handle returned by adapter worker creation.
 */
export interface IgniterJobsWorkerHandle {
  readonly id: string
  readonly queues: string[]

  pause(): Promise<void>
  resume(): Promise<void>
  close(): Promise<void>

  isRunning(): boolean
  isPaused(): boolean
  isClosed(): boolean

  getMetrics(): Promise<IgniterJobsWorkerMetrics>
}
