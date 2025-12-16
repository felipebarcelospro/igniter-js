/**
 * @fileoverview Worker builder for @igniter-js/jobs
 * @module @igniter-js/jobs/builders/igniter-worker
 */

import type { IgniterJobsAdapter } from '../types/adapter'
import type { IgniterJobsLimiter } from '../types/job'
import type { IgniterJobsWorkerHandle, IgniterJobsWorkerHandlers } from '../types/worker'
import { IgniterJobsError } from '../errors'

type IgniterJobsWorkerBuilderState<TAllowedQueues extends string> = {
  queues: TAllowedQueues[]
  concurrency?: number
  limiter?: IgniterJobsLimiter
  handlers: IgniterJobsWorkerHandlers
}

/**
 * Fluent builder for creating workers tied to registered queues.
 *
 * Instances of this builder are created by `jobs.worker.create()` so it can be
 * automatically scoped to registered queue names.
 */
export class IgniterWorkerBuilder<TAllowedQueues extends string> {
  private readonly adapter: IgniterJobsAdapter
  private readonly allowedQueues: readonly TAllowedQueues[]
  private readonly state: IgniterJobsWorkerBuilderState<TAllowedQueues>

  constructor(params: {
    adapter: IgniterJobsAdapter
    allowedQueues: readonly TAllowedQueues[]
    state?: Partial<IgniterJobsWorkerBuilderState<TAllowedQueues>>
  }) {
    this.adapter = params.adapter
    this.allowedQueues = params.allowedQueues
    this.state = {
      queues: params.state?.queues ?? [],
      concurrency: params.state?.concurrency,
      limiter: params.state?.limiter,
      handlers: params.state?.handlers ?? {},
    }
  }

  private clone(patch: Partial<IgniterJobsWorkerBuilderState<TAllowedQueues>>): IgniterWorkerBuilder<TAllowedQueues> {
    return new IgniterWorkerBuilder<TAllowedQueues>({
      adapter: this.adapter,
      allowedQueues: this.allowedQueues,
      state: { ...this.state, ...patch },
    })
  }

  /**
   * Adds a queue to the worker.
   *
   * @param queue - Queue name registered on the jobs instance.
   */
  public addQueue(queue: TAllowedQueues): IgniterWorkerBuilder<TAllowedQueues> {
    if (!this.allowedQueues.includes(queue)) {
      throw new IgniterJobsError({
        code: 'JOBS_QUEUE_NOT_FOUND',
        message: `Queue "${queue}" is not registered on this jobs instance.`,
      })
    }

    if (this.state.queues.includes(queue)) return this
    return this.clone({ queues: [...this.state.queues, queue] })
  }

  /**
   * Sets the worker concurrency.
   */
  public withConcurrency(concurrency: number): IgniterWorkerBuilder<TAllowedQueues> {
    if (!Number.isFinite(concurrency) || concurrency <= 0) {
      throw new IgniterJobsError({
        code: 'JOBS_CONFIGURATION_INVALID',
        message: 'Worker concurrency must be a positive number.',
      })
    }
    return this.clone({ concurrency })
  }

  /**
   * Sets a worker-level rate limiter.
   */
  public withLimiter(limiter: IgniterJobsLimiter): IgniterWorkerBuilder<TAllowedQueues> {
    if (!limiter || !Number.isFinite(limiter.max) || !Number.isFinite(limiter.duration) || limiter.max <= 0 || limiter.duration <= 0) {
      throw new IgniterJobsError({
        code: 'JOBS_CONFIGURATION_INVALID',
        message: 'Limiter must include positive max and duration.',
      })
    }
    return this.clone({ limiter })
  }

  public onActive(handler: NonNullable<IgniterJobsWorkerHandlers['onActive']>): IgniterWorkerBuilder<TAllowedQueues> {
    return this.clone({ handlers: { ...this.state.handlers, onActive: handler } })
  }

  public onSuccess(handler: NonNullable<IgniterJobsWorkerHandlers['onSuccess']>): IgniterWorkerBuilder<TAllowedQueues> {
    return this.clone({ handlers: { ...this.state.handlers, onSuccess: handler } })
  }

  public onFailure(handler: NonNullable<IgniterJobsWorkerHandlers['onFailure']>): IgniterWorkerBuilder<TAllowedQueues> {
    return this.clone({ handlers: { ...this.state.handlers, onFailure: handler } })
  }

  public onIdle(handler: NonNullable<IgniterJobsWorkerHandlers['onIdle']>): IgniterWorkerBuilder<TAllowedQueues> {
    return this.clone({ handlers: { ...this.state.handlers, onIdle: handler } })
  }

  /**
   * Builds and starts the worker.
   *
   * If no queues are added explicitly, the adapter should interpret it as "all queues".
   */
  public async start(): Promise<IgniterJobsWorkerHandle> {
    const concurrency = this.state.concurrency ?? 1
    return this.adapter.createWorker({
      queues: this.state.queues,
      concurrency,
      limiter: this.state.limiter,
      handlers: this.state.handlers,
    })
  }
}

