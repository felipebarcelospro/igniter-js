import type { IgniterLogger } from '@igniter-js/core'
import type { IgniterJobsAdapter } from './adapter'
import type { IgniterJobsQueue } from './queue'
import type { IgniterJobsScopeDefinition } from './scope'
import type { IgniterJobsWorkerBuilderConfig } from './worker'
import type { IgniterJobsTelemetry } from './events'
import type { IgniterJobDefinition } from './job'

/**
 * Configuration used to build the jobs runtime.
 */
export interface IgniterJobsConfig<
  TContext = unknown,
  TQueues extends Record<string, IgniterJobsQueue<TContext, any, any>> = {},
  TScope extends string = never,
> {
  adapter: IgniterJobsAdapter
  service: string
  environment: string
  contextFactory: () => TContext | Promise<TContext>
  queues: TQueues
  scopeDefinition?: IgniterJobsScopeDefinition<TScope>
  queueDefaults?: Partial<IgniterJobDefinition<TContext, any, any>>
  workerDefaults?: Partial<IgniterJobsWorkerBuilderConfig>
  autoStartWorker?: {
    queues: (keyof TQueues)[]
    concurrency?: number
    limiter?: IgniterJobsWorkerBuilderConfig['limiter']
  }
  logger?: IgniterLogger
  telemetry?: IgniterJobsTelemetry
}

/**
 * Builder interface placeholder to help fluent APIs type-infer.
 */
export interface IgniterJobsBuilderState<
  TContext,
  TQueues extends Record<string, IgniterJobsQueue<TContext, any, any>>,
  TScope extends string,
> {
  adapter?: IgniterJobsAdapter
  service?: string
  environment?: string
  contextFactory?: () => TContext | Promise<TContext>
  queues: TQueues
  scopeDefinition?: IgniterJobsScopeDefinition<TScope>
  queueDefaults?: Partial<IgniterJobDefinition<TContext, any, any>>
  workerDefaults?: Partial<IgniterJobsWorkerBuilderConfig>
  autoStartWorker?: {
    queues: (keyof TQueues)[]
    concurrency?: number
    limiter?: IgniterJobsWorkerBuilderConfig['limiter']
  }
}
