import type { Redis } from "ioredis";
import type {
  IgniterJobCounts,
  IgniterJobDefinition,
  IgniterCronDefinition,
  IgniterJobSearchResult,
  IgniterJobStatus,
  IgniterJobsDispatchParams,
  IgniterJobsScheduleParams,
} from "./job";
import type {
  IgniterJobsQueueInfo,
  IgniterJobsQueueCleanOptions,
  IgniterJobsQueueManager,
} from "./queue";
import type {
  IgniterJobsWorkerHandle,
  IgniterJobsWorkerBuilderConfig,
} from "./worker";
import type { IgniterJobsEventHandler } from "./events";
import type {
  IgniterJobsJobStreamEvent,
  IgniterJobsJobStreamPersistenceConfig,
  IgniterJobsJobStreamReadResult,
} from "./stream";
import type { IgniterJobsScopeEntry } from "./scope";

/**
 * Dispatch parameters forwarded to adapters.
 */
export type IgniterJobsAdapterDispatchParams = {
  queue: string;
  jobName: string;
} & IgniterJobsDispatchParams;

/**
 * Schedule parameters forwarded to adapters.
 */
export type IgniterJobsAdapterScheduleParams = {
  queue: string;
  jobName: string;
} & IgniterJobsScheduleParams;

/**
 * Job log entry returned by management APIs.
 */
export interface IgniterJobsJobLog {
  timestamp: Date;
  message: string;
  level: "info" | "warn" | "error";
}

export interface IgniterJobsAdapterJobStreamWriteParams {
  queue: string;
  jobName: string;
  jobId: string;
  scope?: IgniterJobsScopeEntry;
  persistence?: IgniterJobsJobStreamPersistenceConfig;
  event: Omit<IgniterJobsJobStreamEvent<string, unknown>, "id">;
}

export interface IgniterJobsAdapterJobStreamReadParams {
  queue: string;
  jobId: string;
  after?: string;
  limit?: number;
}

export interface IgniterJobsAdapterJobStreamSubscribeParams {
  queue: string;
  jobId: string;
  handler: (
    event: IgniterJobsJobStreamEvent<string, unknown>,
  ) => void | Promise<void>;
}

/**
 * Adapter contract for jobs backends.
 */
export interface IgniterJobsAdapter {
  readonly client: unknown;
  readonly queues: IgniterJobsQueueManager;

  dispatch(params: IgniterJobsAdapterDispatchParams): Promise<string>;
  schedule(params: IgniterJobsAdapterScheduleParams): Promise<string>;

  getJob(jobId: string, queue?: string): Promise<IgniterJobSearchResult | null>;
  getJobState(jobId: string, queue?: string): Promise<IgniterJobStatus | null>;
  getJobLogs(jobId: string, queue?: string): Promise<IgniterJobsJobLog[]>;
  getJobProgress(jobId: string, queue?: string): Promise<number>;
  retryJob(jobId: string, queue?: string): Promise<void>;
  removeJob(jobId: string, queue?: string): Promise<void>;
  promoteJob(jobId: string, queue?: string): Promise<void>;
  moveJobToFailed(jobId: string, reason: string, queue?: string): Promise<void>;
  retryManyJobs(jobIds: string[], queue?: string): Promise<void>;
  removeManyJobs(jobIds: string[], queue?: string): Promise<void>;

  getQueueInfo(queue: string): Promise<IgniterJobsQueueInfo | null>;
  getQueueJobCounts(queue: string): Promise<IgniterJobCounts>;
  listQueues(): Promise<IgniterJobsQueueInfo[]>;
  pauseQueue(queue: string): Promise<void>;
  resumeQueue(queue: string): Promise<void>;
  drainQueue(queue: string): Promise<number>;
  cleanQueue(
    queue: string,
    options: IgniterJobsQueueCleanOptions,
  ): Promise<number>;
  obliterateQueue(queue: string, options?: { force?: boolean }): Promise<void>;
  retryAllInQueue(queue: string): Promise<number>;

  searchJobs(
    filter: Record<string, unknown>,
  ): Promise<IgniterJobSearchResult[]>;
  searchQueues(
    filter: Record<string, unknown>,
  ): Promise<IgniterJobsQueueInfo[]>;
  searchWorkers(
    filter: Record<string, unknown>,
  ): Promise<IgniterJobsWorkerHandle[]>;

  createWorker(
    config: IgniterJobsWorkerBuilderConfig,
  ): Promise<IgniterJobsWorkerHandle>;
  getWorkers(): Map<string, IgniterJobsWorkerHandle>;

  publishEvent(channel: string, payload: unknown): Promise<void>;
  subscribeEvent(
    channel: string,
    handler: IgniterJobsEventHandler,
  ): Promise<() => Promise<void>>;

  writeJobStreamEvent(
    params: IgniterJobsAdapterJobStreamWriteParams,
  ): Promise<string>;
  readJobStream(
    params: IgniterJobsAdapterJobStreamReadParams,
  ): Promise<
    IgniterJobsJobStreamReadResult<IgniterJobsJobStreamEvent<string, unknown>>
  >;
  subscribeJobStream(
    params: IgniterJobsAdapterJobStreamSubscribeParams,
  ): Promise<() => Promise<void>>;

  registerJob(
    queueName: string,
    jobName: string,
    definition: IgniterJobDefinition<any, any, any>,
  ): void;
  registerCron(
    queueName: string,
    cronName: string,
    definition: IgniterCronDefinition<any, any>,
  ): void;

  shutdown(): Promise<void>;
}

/**
 * BullMQ adapter options - primarily Redis connection.
 */
export interface IgniterJobsBullMQAdapterOptions {
  redis: Redis;
}

/**
 * Configuration for the Bun SQLite adapter.
 */
export interface IgniterJobsBunSQLiteAdapterOptions {
  /** SQLite file path used by the embedded runtime. */
  path: string;
  /** Forces immediate persistence for dispatched jobs. @default false */
  durable?: boolean;
  /** Worker heartbeat interval in milliseconds. @default 10000 */
  heartbeatInterval?: number;
  /** Long-poll timeout while the queue is empty. @default 0 */
  pollTimeout?: number;
  /** Number of jobs pulled per worker batch. @default 10 */
  batchSize?: number;
  /** Lock duration for active jobs in milliseconds. @default 30000 */
  lockDuration?: number;
  /** Maximum stalled detections before a job fails. @default 1 */
  maxStalledCount?: number;
}
