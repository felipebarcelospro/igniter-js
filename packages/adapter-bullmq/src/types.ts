import type { Queue, Worker, Job, QueueOptions, WorkerOptions } from "bullmq";
import type {
  IgniterLogger,
  IgniterStoreAdapter,
  WorkerHandle,
  WorkerMetrics,
  JobDefinition,
  JobLimiter,
} from "@igniter-js/core";

/**
 * Options for configuring the BullMQ Adapter.
 */
export interface BullMQAdapterOptions {
  /**
   * Store adapter (Redis) to use with BullMQ.
   * If not provided, a separate Redis connection configuration will be required.
   */
  store?: IgniterStoreAdapter;

  /**
   * Context factory to use with BullMQ.
   * If not provided, a separate context factory will be required.
   */
  logger?: IgniterLogger;

  /**
   * Custom configuration for BullMQ queues.
   * If not provided, the default configuration will be used.
   */
  queueOptions?: Partial<QueueOptions>;

  /**
   * Custom configuration for BullMQ workers.
   * If not provided, the default configuration will be used.
   */
  workerOptions?: Partial<WorkerOptions>;

  /**
   * Global prefix for all queues.
   * Useful for separating environments (e.g., dev, staging, prod).
   */
  globalPrefix?: string;

  /**
   * Factory function to create application context for job execution.
   * This function will be called for each job to provide the runtime context.
   */
  context?: () => any | Promise<any>;

  /**
   * Auto-start worker configuration.
   * If provided, workers will be automatically started when jobs are registered.
   */
  autoStartWorker?: {
    /** Queues to process (defaults to all discovered queues) */
    queues?: string[];
    /** Worker concurrency (defaults to 1) */
    concurrency?: number;
    /** Enable debug logging */
    debug?: boolean;
    /**
     * Rate limiter configuration for auto-started workers.
     * Limits the number of jobs processed within a time window.
     *
     * @example
     * ```typescript
     * // Process maximum 1 job every 30 seconds (useful for API rate limits)
     * limiter: {
     *   max: 1,
     *   duration: 30000,
     * }
     * ```
     */
    limiter?: JobLimiter;
  };
}

/**
 * Internal BullMQ instances managed by the adapter.
 */
export interface BullMQInstances {
  /**
   * Map of active queues (queueName -> Queue).
   */
  queues: Map<string, Queue>;
  /**
   * Map of active worker handles (workerKey -> BullMQWorkerHandle).
   */
  workerHandles: Map<string, BullMQWorkerHandle>;
  /**
   * Map of raw BullMQ worker instances (workerKey -> Worker).
   * Used internally for direct BullMQ operations.
   */
  workers: Map<string, Worker>;
  /**
   * Registered jobs in the system.
   */
  registeredJobs: Map<string, JobDefinition<any, any, any>>;
}

/**
 * BullMQ-specific types for better integration.
 */
export type BullMQJob = Job;
export type BullMQQueue = Queue;
export type BullMQWorker = Worker;

/**
 * Extended WorkerHandle implementation for BullMQ.
 * Includes BullMQ-specific properties and methods.
 */
export interface BullMQWorkerHandle extends WorkerHandle {
  /** The underlying BullMQ Worker instance */
  readonly worker: Worker;
  /** Configuration used to create this worker */
  readonly config: {
    concurrency: number;
    queues: string[];
  };
  /** Timestamp when the worker was started */
  readonly startedAt: Date;
}

/**
 * Internal state for tracking worker metrics.
 */
export interface BullMQWorkerMetricsState {
  /** Total jobs processed */
  processed: number;
  /** Total jobs failed */
  failed: number;
  /** Total processing time in ms (for averaging) */
  totalDuration: number;
  /** Worker start time */
  startedAt: Date;
}

/**
 * Factory function type for creating worker handles.
 */
export type WorkerHandleFactory = (
  worker: Worker,
  queueName: string,
  config: { concurrency: number; queues: string[] },
) => BullMQWorkerHandle;
