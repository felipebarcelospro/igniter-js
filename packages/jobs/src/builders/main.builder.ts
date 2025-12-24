/**
 * @fileoverview Builder for creating IgniterJobs instances
 * @module @igniter-js/jobs/builders/main
 *
 * @description
 * Provides a fluent builder API for configuring and creating IgniterJobs instances.
 * Supports adapter configuration, service naming, environment settings, queues,
 * scopes, telemetry, and more.
 *
 * @example
 * ```typescript
 * import { IgniterJobs, IgniterQueue } from '@igniter-js/jobs'
 * import { IgniterJobsMemoryAdapter } from '@igniter-js/jobs/adapters'
 * import { z } from 'zod'
 *
 * const emailQueue = IgniterQueue.create('email')
 *   .addJob('sendWelcome', {
 *     input: z.object({ to: z.string(), name: z.string() }),
 *     handler: async (ctx) => {
 *       await sendEmail(ctx.input.to, `Welcome ${ctx.input.name}!`)
 *     },
 *   })
 *   .build()
 *
 * const jobs = IgniterJobs.create()
 *   .withAdapter(IgniterJobsMemoryAdapter.create())
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .withContext(async () => ({ db }))
 *   .addQueue(emailQueue)
 *   .build()
 * ```
 */

import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterJobsConfig } from "../types/config";
import type { IgniterJobsRuntime } from "../types/runtime";
import type { IgniterJobsAdapter } from "../types/adapter";
import type { IgniterJobsQueue } from "../types/queue";
import type { IgniterJobsTelemetry } from "../types/events";
import type { IgniterJobsScopeOptions } from "../types/scope";
import type { IgniterJobsScopeDefinition } from "../types/scope";
import type { IgniterJobDefinition, IgniterJobsLimiter } from "../types/job";
import type { IgniterJobsWorkerBuilderConfig } from "../types/worker";
import { IgniterJobsError } from "../errors";
import { IgniterJobsManager } from "../core/manager";

interface IgniterJobsBuilderState<
  TContext,
  TQueues extends Record<string, IgniterJobsQueue<TContext, any, any>>,
  TScope extends string,
> {
  adapter?: IgniterJobsAdapter;
  service?: string;
  environment?: string;
  contextFactory?: () => TContext | Promise<TContext>;
  queues: TQueues;
  scope?: { name: TScope; options?: IgniterJobsScopeOptions };
  queueDefaults?: Partial<IgniterJobDefinition<TContext, any, any>>;
  workerDefaults?: Partial<IgniterJobsWorkerBuilderConfig>;
  autoStartWorker?: {
    queues: (keyof TQueues)[];
    concurrency?: number;
    limiter?: IgniterJobsLimiter;
  };
  logger?: IgniterLogger;
  telemetry?: IgniterJobsTelemetry;
}

/**
 * Fluent builder responsible for configuring and constructing an `IgniterJobs` instance.
 *
 * The builder follows the immutable pattern used across Igniter packages: each
 * method returns a new builder with refined types. Only a single scope is
 * supported per the current specification (no actor support).
 */
export class IgniterJobsBuilder<
  TContext,
  TQueues extends Record<string, IgniterJobsQueue<TContext, any, any>> = {},
  TScope extends string = never,
> {
  private readonly state: IgniterJobsBuilderState<TContext, TQueues, TScope>;

  private constructor(
    state?: Partial<IgniterJobsBuilderState<TContext, TQueues, TScope>>,
  ) {
    this.state = {
      queues: (state?.queues ?? ({} as TQueues)) as TQueues,
      ...state,
    } as IgniterJobsBuilderState<TContext, TQueues, TScope>;
  }

  /**
   * Creates the initial builder with no configuration.
   *
   * Context type is inferred from `withContext()` - no explicit generic needed.
   *
   * @example
   * ```typescript
   * // Context is inferred from the factory return type
   * const jobs = IgniterJobs.create()
   *   .withContext(async () => ({ db: prisma, cache: redis }))
   *   // TContext is now { db: PrismaClient, cache: Redis }
   *   .build()
   * ```
   */
  public static create(): IgniterJobsBuilder<unknown> {
    return new IgniterJobsBuilder<unknown>({
      queues: {} as Record<string, any>,
    });
  }

  /**
   * Returns a new builder with updated state while preserving generics.
   */
  private clone<
    TNewQueues extends Record<string, IgniterJobsQueue<TContext, any, any>> =
      TQueues,
    TNewScope extends string = TScope,
  >(
    patch: Partial<IgniterJobsBuilderState<TContext, any, any>>,
  ): IgniterJobsBuilder<TContext, TNewQueues, TNewScope> {
    return new IgniterJobsBuilder<TContext, TNewQueues, TNewScope>({
      ...(this.state as any),
      ...(patch as any),
      queues: ((patch as any).queues ??
        (this.state.queues as unknown as TNewQueues)) as TNewQueues,
      scope: (patch as any).scope ?? (this.state.scope as any),
    });
  }

  /**
   * Attaches the jobs adapter.
   *
   * @param adapter - Backend adapter implementation (BullMQ, memory, etc.).
   */
  public withAdapter(
    adapter: IgniterJobsAdapter,
  ): IgniterJobsBuilder<TContext, TQueues, TScope> {
    return this.clone({ adapter });
  }

  /**
   * Sets the service identifier for telemetry and metrics.
   *
   * @param service - Service name (e.g., "my-api").
   */
  public withService(
    service: string,
  ): IgniterJobsBuilder<TContext, TQueues, TScope> {
    return this.clone({ service });
  }

  /**
   * Sets the environment name (e.g., development, staging, production).
   */
  public withEnvironment(
    environment: string,
  ): IgniterJobsBuilder<TContext, TQueues, TScope> {
    return this.clone({ environment });
  }

  /**
   * Provides a context factory used when executing jobs.
   *
   * The context type is inferred from the factory return type, eliminating
   * the need for explicit generics on `IgniterJobs.create()`.
   *
   * **Note:** This must be called before adding any queues, as the context
   * type affects queue type compatibility.
   *
   * @param factory - Function that returns the context (sync or async)
   * @returns A new builder with the inferred context type
   *
   * @example
   * ```typescript
   * // Context type is inferred as { db: PrismaClient, cache: Redis }
   * const jobs = IgniterJobs.create()
   *   .withContext(async () => ({
   *     db: new PrismaClient(),
   *     cache: new Redis(),
   *   }))
   *   .addQueue(emailQueue)
   *   .build()
   * ```
   */
  public withContext<TNewContext>(
    this: IgniterJobsBuilder<unknown, {}, TScope>,
    factory: () => TNewContext | Promise<TNewContext>,
  ): IgniterJobsBuilder<TNewContext, {}, TScope> {
    return new IgniterJobsBuilder<TNewContext, {}, TScope>({
      ...(this.state as any),
      contextFactory: factory,
      queues: {},
    });
  }

  /**
   * Adds a scope definition (single scope supported).
   */
  public addScope<TNewScope extends string>(
    name: TNewScope,
    options?: IgniterJobsScopeOptions,
  ): IgniterJobsBuilder<TContext, TQueues, TScope | TNewScope> {
    if (this.state.scope) {
      throw new IgniterJobsError({
        code: "JOBS_SCOPE_ALREADY_DEFINED",
        message: "Only one scope can be defined for IgniterJobs.",
      });
    }
    return this.clone({ scope: { name: name as TScope | TNewScope, options } });
  }

  /**
   * Registers a queue definition on the builder.
   */
  public addQueue<
    TName extends string,
    TQueue extends IgniterJobsQueue<TContext, any, any>,
  >(
    queue: TQueue & { name: TName },
  ): IgniterJobsBuilder<TContext, TQueues & Record<TName, TQueue>, TScope> {
    if ((this.state.queues as Record<string, unknown>)[queue.name]) {
      throw new IgniterJobsError({
        code: "JOBS_QUEUE_DUPLICATE",
        message: `Queue "${queue.name}" is already registered.`,
      });
    }
    const nextQueues = {
      ...(this.state.queues as unknown as Record<string, TQueue>),
      [queue.name]: queue,
    } as TQueues & Record<TName, TQueue>;

    return this.clone<TQueues & Record<TName, TQueue>>({ queues: nextQueues });
  }

  /**
   * Applies default job options to all queues.
   */
  public withQueueDefaults(
    defaults: Partial<IgniterJobDefinition<TContext, any, any>>,
  ): IgniterJobsBuilder<TContext, TQueues, TScope> {
    return this.clone({ queueDefaults: defaults });
  }

  /**
   * Applies default worker options.
   */
  public withWorkerDefaults(
    defaults: Partial<IgniterJobsWorkerBuilderConfig>,
  ): IgniterJobsBuilder<TContext, TQueues, TScope> {
    return this.clone({ workerDefaults: defaults });
  }

  /**
   * Configures automatic worker startup.
   */
  public withAutoStartWorker(config: {
    queues: (keyof TQueues)[];
    concurrency?: number;
    limiter?: IgniterJobsLimiter;
  }): IgniterJobsBuilder<TContext, TQueues, TScope> {
    return this.clone({ autoStartWorker: config });
  }

  /**
   * Attaches telemetry support.
   */
  public withTelemetry(
    telemetry: IgniterJobsTelemetry,
  ): IgniterJobsBuilder<TContext, TQueues, TScope> {
    return this.clone({ telemetry });
  }

  /**
   * Attaches a custom logger.
   */
  public withLogger(
    logger: IgniterLogger,
  ): IgniterJobsBuilder<TContext, TQueues, TScope> {
    return this.clone({ logger });
  }

  /**
   * Finalizes the configuration and returns the runtime instance.
   */
  public build(): IgniterJobsRuntime<
    IgniterJobsConfig<TContext, TQueues, TScope>
  > {
    if (!this.state.adapter) {
      throw new IgniterJobsError({
        code: "JOBS_ADAPTER_REQUIRED",
        message: "Jobs adapter is required. Call withAdapter() before build().",
      });
    }

    if (!this.state.service) {
      throw new IgniterJobsError({
        code: "JOBS_SERVICE_REQUIRED",
        message: "Service name is required. Call withService() before build().",
      });
    }

    if (!this.state.environment) {
      throw new IgniterJobsError({
        code: "JOBS_CONFIGURATION_INVALID",
        message:
          "Environment is required. Call withEnvironment() before build().",
      });
    }

    if (!this.state.contextFactory) {
      throw new IgniterJobsError({
        code: "JOBS_CONTEXT_REQUIRED",
        message:
          "Context factory is required. Call withContext() before build().",
      });
    }

    const config: IgniterJobsConfig<TContext, TQueues, TScope> = {
      adapter: this.state.adapter,
      service: this.state.service,
      environment: this.state.environment,
      contextFactory: this.state.contextFactory,
      queues: this.state.queues,
      scopeDefinition: this.state.scope
        ? ({
            [this.state.scope.name]: (this.state.scope.options ??
              {}) as IgniterJobsScopeOptions,
          } as IgniterJobsScopeDefinition<TScope>)
        : undefined,
      queueDefaults: this.state.queueDefaults,
      workerDefaults: this.state.workerDefaults,
      autoStartWorker: this.state.autoStartWorker,
      logger: this.state.logger,
      telemetry: this.state.telemetry,
    };

    return new IgniterJobsManager(config).toRuntime();
  }
}

/**
 * Factory for creating and configuring IgniterJobs instances.
 *
 * This is the main entry point for creating a jobs runtime with a fluent builder API.
 * It provides type-safe configuration for adapters, queues, scopes, context, and telemetry.
 *
 * @example
 * ```typescript
 * import { IgniterJobs, IgniterQueue } from '@igniter-js/jobs'
 * import { IgniterJobsMemoryAdapter } from '@igniter-js/jobs/adapters'
 * import { z } from 'zod'
 *
 * const emailQueue = IgniterQueue.create('email')
 *   .addJob('sendWelcome', {
 *     input: z.object({ to: z.string(), name: z.string() }),
 *     handler: async (ctx) => {
 *       await sendEmail(ctx.input.to, `Welcome ${ctx.input.name}!`)
 *     },
 *   })
 *   .build()
 *
 * const jobs = IgniterJobs.create()
 *   .withAdapter(IgniterJobsMemoryAdapter.create())
 *   .withService('my-api')
 *   .withEnvironment('production')
 *   .withContext(async () => ({ db }))
 *   .addQueue(emailQueue)
 *   .build()
 *
 * // Dispatch jobs
 * await jobs.email.sendWelcome.dispatch({ input: { to: 'user@example.com', name: 'Alice' } })
 *
 * // Use scopes for multi-tenancy
 * const orgJobs = jobs.scope('organization', 'org_123')
 * await orgJobs.email.sendWelcome.dispatch({ input: { to: 'user@example.com', name: 'Bob' } })
 * ```
 *
 * @see {@link IgniterJobsBuilder} for detailed method documentation
 */
export const IgniterJobs = {
  create: IgniterJobsBuilder.create,
};
