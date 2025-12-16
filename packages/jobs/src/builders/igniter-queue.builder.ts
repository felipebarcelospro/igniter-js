/**
 * @fileoverview Queue builder for @igniter-js/jobs
 * @module @igniter-js/jobs/builders/igniter-queue
 */

import type {
  IgniterCronDefinition,
  IgniterJobDefinition,
  IgniterJobsQueue,
} from '../types'
import type { IgniterJobsSchema } from '../types/schema'
import { IgniterJobsError } from '../errors'

interface IgniterQueueBuilderState<
  TContext,
  TJobs extends Record<string, IgniterJobDefinition<TContext, any, any>>,
  TCron extends Record<string, IgniterCronDefinition<TContext, any>>,
  TName extends string,
> {
  name: TName
  jobs: TJobs
  crons: TCron
}

/**
 * Builder for defining queues, jobs, and cron tasks.
 *
 * @example
 * ```typescript
 * import { IgniterQueue } from '@igniter-js/jobs'
 * import { z } from 'zod'
 *
 * const emailQueue = IgniterQueue.create('email')
 *   .withContext<{ mailer: Mailer }>()
 *   .addJob('sendWelcome', {
 *     input: z.object({ email: z.string().email() }),
 *     handler: async ({ input, context }) => {
 *       await context.mailer.send(input)
 *     },
 *   })
 *   .addCron('cleanup', {
 *     cron: '0 2 * * *',
 *     handler: async ({ context }) => {
 *       await context.mailer.cleanup()
 *     },
 *   })
 *   .build()
 * ```
 */
export class IgniterQueueBuilder<
  TContext,
  TJobs extends Record<string, IgniterJobDefinition<TContext, any, any>> = {},
  TCron extends Record<string, IgniterCronDefinition<TContext, any>> = {},
  TName extends string = string,
> {
  private readonly state: IgniterQueueBuilderState<TContext, TJobs, TCron, TName>

  private constructor(state: IgniterQueueBuilderState<TContext, TJobs, TCron, TName>) {
    this.state = state
  }

  /**
   * Creates a new queue builder for the given queue name.
   */
  public static create<const TName extends string>(
    name: TName,
  ): IgniterQueueBuilder<unknown, {}, {}, TName> {
    if (!name || typeof name !== 'string') {
      throw new IgniterJobsError({
        code: 'JOBS_CONFIGURATION_INVALID',
        message: 'Queue name must be a non-empty string.',
      })
    }

    return new IgniterQueueBuilder<unknown, {}, {}, TName>({
      name,
      jobs: {} as Record<string, any>,
      crons: {} as Record<string, any>,
    })
  }

  /**
   * Re-types this builder with the application context type.
   *
   * This is a type-level helper; it does not mutate runtime state.
   *
   * @example
   * ```typescript
   * const queue = IgniterQueue.create('email')
   *   .withContext<AppContext>()
   *   .addJob('send', { handler: async ({ context }) => context.mailer.send() })
   * ```
   */
  public withContext<TNewContext>(
    this: IgniterQueueBuilder<unknown, {}, {}, TName>,
  ): IgniterQueueBuilder<TNewContext, {}, {}, TName> {
    return this as unknown as IgniterQueueBuilder<TNewContext, {}, {}, TName>
  }

  private clone<
    TNewJobs extends Record<string, IgniterJobDefinition<TContext, any, any>> = TJobs,
    TNewCron extends Record<string, IgniterCronDefinition<TContext, any>> = TCron,
  >(
    patch: Partial<IgniterQueueBuilderState<TContext, TNewJobs, TNewCron, TName>>,
  ): IgniterQueueBuilder<TContext, TNewJobs, TNewCron, TName> {
    return new IgniterQueueBuilder<TContext, TNewJobs, TNewCron, TName>({
      ...(this.state as unknown as IgniterQueueBuilderState<TContext, TNewJobs, TNewCron, TName>),
      ...patch,
    })
  }

  /**
   * Registers a job on the queue.
   *
   * @param jobName - Unique name of the job inside the queue.
   * @param definition - Job definition (handler, schemas, options, hooks).
   */
  public addJob<
    TJobName extends string,
    TInput extends IgniterJobsSchema | unknown,
    TResult = unknown,
  >(
    jobName: TJobName,
    definition: IgniterJobDefinition<TContext, TInput, TResult>,
  ): IgniterQueueBuilder<
    TContext,
    TJobs & Record<TJobName, IgniterJobDefinition<TContext, TInput, TResult>>,
    TCron,
    TName
  > {
    if (!jobName || typeof jobName !== 'string') {
      throw new IgniterJobsError({
        code: 'JOBS_INVALID_DEFINITION',
        message: 'Job name must be a non-empty string.',
      })
    }

    if ((this.state.jobs as Record<string, unknown>)[jobName]) {
      throw new IgniterJobsError({
        code: 'JOBS_DUPLICATE_JOB',
        message: `Job "${jobName}" is already registered in queue "${this.state.name}".`,
      })
    }

    if ((this.state.crons as Record<string, unknown>)[jobName]) {
      throw new IgniterJobsError({
        code: 'JOBS_DUPLICATE_JOB',
        message: `Job "${jobName}" conflicts with an existing cron in queue "${this.state.name}".`,
      })
    }

    if (!definition || typeof definition !== 'object') {
      throw new IgniterJobsError({
        code: 'JOBS_INVALID_DEFINITION',
        message: `Job "${jobName}" definition must be an object.`,
      })
    }

    if (!definition.handler || typeof definition.handler !== 'function') {
      throw new IgniterJobsError({
        code: 'JOBS_HANDLER_REQUIRED',
        message: `Job "${jobName}" handler is required and must be a function.`,
      })
    }

    const nextJobs = {
      ...(this.state.jobs as Record<string, any>),
      [jobName]: definition,
    } as TJobs & Record<TJobName, IgniterJobDefinition<TContext, TInput, TResult>>

    return this.clone<TJobs & Record<TJobName, IgniterJobDefinition<TContext, TInput, TResult>>>({
      jobs: nextJobs,
    })
  }

  /**
   * Registers a cron task on the queue.
   *
   * @param cronName - Unique name of the cron task inside the queue.
   * @param definition - Cron definition (cron string, tz, handler, options).
   */
  public addCron<TCronName extends string, TResult = unknown>(
    cronName: TCronName,
    definition: IgniterCronDefinition<TContext, TResult>,
  ): IgniterQueueBuilder<
    TContext,
    TJobs,
    TCron & Record<TCronName, IgniterCronDefinition<TContext, TResult>>,
    TName
  > {
    if (!cronName || typeof cronName !== 'string') {
      throw new IgniterJobsError({
        code: 'JOBS_INVALID_CRON',
        message: 'Cron name must be a non-empty string.',
      })
    }

    if ((this.state.crons as Record<string, unknown>)[cronName]) {
      throw new IgniterJobsError({
        code: 'JOBS_INVALID_CRON',
        message: `Cron "${cronName}" is already registered in queue "${this.state.name}".`,
      })
    }

    if ((this.state.jobs as Record<string, unknown>)[cronName]) {
      throw new IgniterJobsError({
        code: 'JOBS_INVALID_CRON',
        message: `Cron "${cronName}" conflicts with an existing job in queue "${this.state.name}".`,
      })
    }

    if (!definition || typeof definition !== 'object') {
      throw new IgniterJobsError({
        code: 'JOBS_INVALID_CRON',
        message: `Cron "${cronName}" definition must be an object.`,
      })
    }

    if (!definition.cron || typeof definition.cron !== 'string') {
      throw new IgniterJobsError({
        code: 'JOBS_INVALID_CRON',
        message: `Cron "${cronName}" must include a valid cron expression string.`,
      })
    }

    if (!definition.handler || typeof definition.handler !== 'function') {
      throw new IgniterJobsError({
        code: 'JOBS_HANDLER_REQUIRED',
        message: `Cron "${cronName}" handler is required and must be a function.`,
      })
    }

    const nextCrons = {
      ...(this.state.crons as Record<string, any>),
      [cronName]: definition,
    } as TCron & Record<TCronName, IgniterCronDefinition<TContext, TResult>>

    return this.clone<TJobs, TCron & Record<TCronName, IgniterCronDefinition<TContext, TResult>>>({
      crons: nextCrons,
    })
  }

  /**
   * Finalizes the queue definition.
   */
  public build(): IgniterJobsQueue<TContext, TJobs, TCron> & { name: TName } {
    return {
      name: this.state.name,
      jobs: this.state.jobs,
      crons: this.state.crons,
    } as IgniterJobsQueue<TContext, TJobs, TCron> & { name: TName }
  }
}
