import type { Queue, Worker, Job, QueueOptions, WorkerOptions } from "bullmq";
import type { IgniterLogger, IgniterStoreAdapter } from "@igniter-js/core";

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
  contextFactory?: () => any | Promise<any>;

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
  };
}

/**
 * Internal BullMQ instances managed by the adapter.
 */
export interface BullMQInstances {
  /**
   * Map of active queues.
   */
  queues: Map<string, Queue>;
  /**
   * Map of active workers.
   */
  workers: Map<string, Worker>;
  /**
   * Registered jobs in the system.
   */
  registeredJobs: Map<string, any>;
}

/**
 * BullMQ-specific types for better integration.
 */
export type BullMQJob = Job;
export type BullMQQueue = Queue;
export type BullMQWorker = Worker;