/**
 * @fileoverview Core exports for @igniter-js/jobs
 * @module @igniter-js/jobs/core
 */

// Manager
export { IgniterJobsManager } from "./manager";

// Queue
export * from "./queue";

// Re-export IgniterJobs alias from builders for convenience
export { IgniterJobs } from "../builders/main.builder";
