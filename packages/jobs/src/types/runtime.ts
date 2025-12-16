/**
 * @fileoverview Runtime surface types for @igniter-js/jobs
 * @module @igniter-js/jobs/types/runtime
 */

import type { IgniterJobsConfig } from './config'
import type { IgniterJobsEvent, IgniterJobsEventHandler } from './events'
import type { IgniterJobsScopeEntry } from './scope'
import type {
  IgniterCronDefinition,
  IgniterJobCounts,
  IgniterJobDefinition,
  IgniterJobSearchResult,
  IgniterJobStatus,
  IgniterJobsDispatchParams,
  IgniterJobsScheduleParams,
} from './job'
import type { IgniterJobsInferSchemaInput } from './schema'
import type { IgniterJobsQueueCleanOptions, IgniterJobsQueueInfo } from './queue'
import type { IgniterJobsWorkerHandle, IgniterJobsWorkerHandlers } from './worker'
import type { IgniterJobsLimiter as IgniterJobsLimiterFromJob } from './job'

export type IgniterJobsInferInput<TInput> = IgniterJobsInferSchemaInput<TInput>

export type IgniterJobsInferJobInput<TDef> = TDef extends IgniterJobDefinition<any, infer TInput, any>
  ? IgniterJobsInferInput<TInput>
  : unknown

export type IgniterJobsInferCronResult<TDef> = TDef extends IgniterCronDefinition<any, infer TResult>
  ? TResult
  : unknown

export interface IgniterJobsJobInstanceAccessor {
  retrieve(): Promise<IgniterJobSearchResult | null>
  retry(): Promise<void>
  remove(): Promise<void>
  promote(): Promise<void>
  move(state: 'failed', reason: string): Promise<void>
  state(): Promise<IgniterJobStatus | null>
  progress(): Promise<number>
  logs(): Promise<{ timestamp: Date; message: string; level: 'info' | 'warn' | 'error' }[]>
}

export interface IgniterJobsJobManyAccessor {
  retry(): Promise<void>
  remove(): Promise<void>
}

export interface IgniterJobsJobAccessor<TInput = unknown, TResult = unknown> {
  dispatch(params: IgniterJobsDispatchParams<TInput>): Promise<string>
  schedule(params: IgniterJobsScheduleParams<TInput>): Promise<string>
  get(id: string): IgniterJobsJobInstanceAccessor
  many(ids: string[]): IgniterJobsJobManyAccessor
  pause(): Promise<void>
  resume(): Promise<void>
  subscribe(handler: IgniterJobsEventHandler): Promise<() => Promise<void>>
}

export interface IgniterJobsQueueManagerAccessor {
  retrieve(): Promise<IgniterJobsQueueInfo | null>
  pause(): Promise<void>
  resume(): Promise<void>
  drain(): Promise<number>
  clean(options: IgniterJobsQueueCleanOptions): Promise<number>
  obliterate(options?: { force?: boolean }): Promise<void>
  retryAll(): Promise<number>
}

export type IgniterJobsQueueAccessor<TJobs extends Record<string, IgniterJobDefinition<any, any, any>> = {}> = {
  get(): IgniterJobsQueueManagerAccessor
  list(filter?: { status?: IgniterJobStatus[]; limit?: number; offset?: number }): Promise<IgniterJobSearchResult[]>
  subscribe(handler: IgniterJobsEventHandler): Promise<() => Promise<void>>
  readonly jobs: {
    [K in keyof TJobs]: IgniterJobsJobAccessor<IgniterJobsInferJobInput<TJobs[K]>, any>
  }
} & {
  [K in keyof TJobs]: IgniterJobsJobAccessor<IgniterJobsInferJobInput<TJobs[K]>, any>
}

export interface IgniterJobsWorkerBuilderAccessor<TQueueNames extends string> {
  create(): IgniterJobsWorkerFluentBuilder<TQueueNames>
}

export interface IgniterJobsWorkerFluentBuilder<TQueueNames extends string> {
  addQueue(queue: TQueueNames): IgniterJobsWorkerFluentBuilder<TQueueNames>
  withConcurrency(concurrency: number): IgniterJobsWorkerFluentBuilder<TQueueNames>
  withLimiter(limiter: IgniterJobsLimiterFromJob): IgniterJobsWorkerFluentBuilder<TQueueNames>
  onActive(handler: NonNullable<IgniterJobsWorkerHandlers['onActive']>): IgniterJobsWorkerFluentBuilder<TQueueNames>
  onSuccess(handler: NonNullable<IgniterJobsWorkerHandlers['onSuccess']>): IgniterJobsWorkerFluentBuilder<TQueueNames>
  onFailure(handler: NonNullable<IgniterJobsWorkerHandlers['onFailure']>): IgniterJobsWorkerFluentBuilder<TQueueNames>
  onIdle(handler: NonNullable<IgniterJobsWorkerHandlers['onIdle']>): IgniterJobsWorkerFluentBuilder<TQueueNames>
  start(): Promise<IgniterJobsWorkerHandle>
}

export interface IgniterJobsBaseRuntime<
  TConfig extends IgniterJobsConfig<any, any, any> = IgniterJobsConfig<any, any, any>,
> {
  readonly config: TConfig
  subscribe(handler: IgniterJobsEventHandler): Promise<() => Promise<void>>
  search(target: 'jobs', filter: Record<string, unknown>): Promise<IgniterJobSearchResult[]>
  search(target: 'queues', filter: Record<string, unknown>): Promise<IgniterJobsQueueInfo[]>
  search(target: 'workers', filter: Record<string, unknown>): Promise<IgniterJobsWorkerHandle[]>
  shutdown(): Promise<void>
  readonly worker: IgniterJobsWorkerBuilderAccessor<keyof TConfig['queues'] & string>
  scope: TConfig extends IgniterJobsConfig<any, any, infer TScope>
    ? (TScope extends string ? (type: TScope, id: string | number, tags?: Record<string, unknown>) => IgniterJobsRuntime<TConfig> : never)
    : never
}

export type IgniterJobsRuntime<
  TConfig extends IgniterJobsConfig<any, any, any> = IgniterJobsConfig<any, any, any>,
> =
  IgniterJobsBaseRuntime<TConfig> & {
    [Q in keyof TConfig['queues']]: TConfig['queues'][Q] extends { jobs: infer TJobs extends Record<string, IgniterJobDefinition<any, any, any>> }
      ? IgniterJobsQueueAccessor<TJobs>
      : IgniterJobsQueueAccessor
  }
