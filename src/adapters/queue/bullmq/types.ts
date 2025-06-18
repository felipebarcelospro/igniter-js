import type { Queue, Worker, Job, QueueOptions, WorkerOptions } from "bullmq";
import type { IgniterStoreAdapter } from "../../../types/store.interface";

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