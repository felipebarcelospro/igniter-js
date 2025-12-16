import type { IgniterJobDefinition, IgniterCronDefinition, IgniterJobCounts, IgniterJobSearchResult, IgniterJobStatus } from './job'

/**
 * Queue configuration produced by `IgniterQueueBuilder`.
 */
export interface IgniterJobsQueue<
  TContext,
  TJobs extends Record<string, IgniterJobDefinition<TContext, any, any>>,
  TCron extends Record<string, IgniterCronDefinition<TContext, any>>,
> {
  name: string
  jobs: TJobs
  crons: TCron
  defaultJobOptions?: Partial<IgniterJobDefinition<TContext, any, any>>
}

/**
 * Information about a queue used by management APIs.
 */
export interface IgniterJobsQueueInfo {
  name: string
  isPaused: boolean
  jobCounts: IgniterJobCounts
}

/**
 * Filter for cleaning queues.
 */
export interface IgniterJobsQueueCleanOptions {
  status: IgniterJobStatus | IgniterJobStatus[]
  olderThan?: number
  limit?: number
}

/**
 * Queue-level management operations exposed by adapters.
 */
export interface IgniterJobsQueueManager {
  list(): Promise<IgniterJobsQueueInfo[]>
  get(name: string): Promise<IgniterJobsQueueInfo | null>
  getJobCounts(name: string): Promise<IgniterJobCounts>
  getJobs(name: string, filter?: { status?: IgniterJobStatus[]; limit?: number; offset?: number }): Promise<IgniterJobSearchResult[]>
  pause(name: string): Promise<void>
  resume(name: string): Promise<void>
  isPaused(name: string): Promise<boolean>
  drain(name: string): Promise<number>
  clean(name: string, options: IgniterJobsQueueCleanOptions): Promise<number>
  obliterate(name: string, options?: { force?: boolean }): Promise<void>
}
