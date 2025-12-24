/**
 * @fileoverview Tests for IgniterJobsError
 */

import { describe, it, expect } from "vitest";
import {
  IgniterJobsError,
  IGNITER_JOBS_ERROR_CODES,
  type IgniterJobsErrorCode,
} from "./jobs.error";

describe("IgniterJobsError", () => {
  describe("constructor", () => {
    it("should create an error with required properties", () => {
      const error = new IgniterJobsError({
        code: "JOBS_ADAPTER_REQUIRED",
        message: "Adapter is required",
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(IgniterJobsError);
      // IgniterJobsError extends IgniterError which sets name to "IgniterError"
      expect(error.name).toBe("IgniterError");
      expect(error.code).toBe("JOBS_ADAPTER_REQUIRED");
      expect(error.message).toBe("Adapter is required");
      expect(error.statusCode).toBe(500); // Default
    });

    it("should create an error with all properties", () => {
      const cause = new Error("Original error");
      const error = new IgniterJobsError({
        code: "JOBS_EXECUTION_FAILED",
        message: "Failed to execute job",
        statusCode: 503,
        cause,
        details: { jobId: "job_123" },
        metadata: { operation: "execute", queue: "email" },
      });

      expect(error.code).toBe("JOBS_EXECUTION_FAILED");
      expect(error.statusCode).toBe(503);
      expect(error.cause).toBe(cause);
      expect(error.details).toEqual({ jobId: "job_123" });
      expect(error.metadata).toEqual({
        operation: "execute",
        queue: "email",
      });
    });

    it("should include details when no cause is provided", () => {
      const error = new IgniterJobsError({
        code: "JOBS_VALIDATION_FAILED",
        message: "Input validation failed",
        details: { field: "email", reason: "invalid format" },
      });

      expect(error.details).toEqual({
        field: "email",
        reason: "invalid format",
      });
    });

    it("should use custom statusCode", () => {
      const error = new IgniterJobsError({
        code: "JOBS_INVALID_INPUT",
        message: "Invalid input",
        statusCode: 400,
      });

      expect(error.statusCode).toBe(400);
    });

    it("should include causer when provided", () => {
      const error = new IgniterJobsError({
        code: "JOBS_WORKER_FAILED",
        message: "Worker failed",
        causer: "IgniterWorkerBuilder",
      });

      expect(error.causer).toBe("IgniterWorkerBuilder");
    });
  });

  describe("instanceof checks", () => {
    it("should be instanceof IgniterJobsError", () => {
      const error = new IgniterJobsError({
        code: "JOBS_ADAPTER_REQUIRED",
        message: "Adapter required",
      });

      expect(error instanceof IgniterJobsError).toBe(true);
    });

    it("should be instanceof Error", () => {
      const error = new IgniterJobsError({
        code: "JOBS_ADAPTER_REQUIRED",
        message: "Adapter required",
      });

      expect(error instanceof Error).toBe(true);
    });
  });

  describe("error codes", () => {
    it("should have all expected error codes", () => {
      const expectedCodes: IgniterJobsErrorCode[] = [
        "JOBS_ADAPTER_REQUIRED",
        "JOBS_SERVICE_REQUIRED",
        "JOBS_CONTEXT_REQUIRED",
        "JOBS_CONFIGURATION_INVALID",
        "JOBS_QUEUE_NOT_FOUND",
        "JOBS_QUEUE_DUPLICATE",
        "JOBS_QUEUE_OPERATION_FAILED",
        "JOBS_INVALID_DEFINITION",
        "JOBS_HANDLER_REQUIRED",
        "JOBS_DUPLICATE_JOB",
        "JOBS_NOT_FOUND",
        "JOBS_NOT_REGISTERED",
        "JOBS_EXECUTION_FAILED",
        "JOBS_TIMEOUT",
        "JOBS_CONTEXT_FACTORY_FAILED",
        "JOBS_VALIDATION_FAILED",
        "JOBS_INVALID_INPUT",
        "JOBS_INVALID_CRON",
        "JOBS_INVALID_SCHEDULE",
        "JOBS_SCOPE_ALREADY_DEFINED",
        "JOBS_WORKER_FAILED",
        "JOBS_ADAPTER_ERROR",
        "JOBS_ADAPTER_CONNECTION_FAILED",
        "JOBS_SUBSCRIBE_FAILED",
      ];

      for (const code of expectedCodes) {
        expect(IGNITER_JOBS_ERROR_CODES).toHaveProperty(code);
        expect(IGNITER_JOBS_ERROR_CODES[code]).toBe(code);
      }
    });

    it("should have error codes as const values", () => {
      expect(IGNITER_JOBS_ERROR_CODES.JOBS_ADAPTER_REQUIRED).toBe(
        "JOBS_ADAPTER_REQUIRED",
      );
      expect(IGNITER_JOBS_ERROR_CODES.JOBS_SERVICE_REQUIRED).toBe(
        "JOBS_SERVICE_REQUIRED",
      );
      expect(IGNITER_JOBS_ERROR_CODES.JOBS_VALIDATION_FAILED).toBe(
        "JOBS_VALIDATION_FAILED",
      );
    });
  });

  describe("toJSON", () => {
    it("should serialize error to JSON", () => {
      const error = new IgniterJobsError({
        code: "JOBS_EXECUTION_FAILED",
        message: "Test error",
        metadata: { queue: "email" },
      });

      const json = error.toJSON();

      // IgniterError base class sets name to "IgniterError"
      expect(json).toHaveProperty("name", "IgniterError");
      expect(json).toHaveProperty("message", "Test error");
      expect(json).toHaveProperty("code", "JOBS_EXECUTION_FAILED");
    });

    it("should include details in JSON", () => {
      const error = new IgniterJobsError({
        code: "JOBS_INVALID_INPUT",
        message: "Invalid input",
        details: { field: "email" },
      });

      const json = error.toJSON();
      expect(json).toHaveProperty("details");
      expect(json.details).toEqual({ field: "email" });
    });

    it("should include metadata in JSON", () => {
      const error = new IgniterJobsError({
        code: "JOBS_EXECUTION_FAILED",
        message: "Failed",
        metadata: { queue: "email", jobId: "job_123" },
      });

      const json = error.toJSON();
      expect(json).toHaveProperty("metadata");
      expect(json.metadata).toEqual({ queue: "email", jobId: "job_123" });
    });
  });

  describe("error categories", () => {
    it("should create configuration errors", () => {
      const error = new IgniterJobsError({
        code: "JOBS_CONFIGURATION_INVALID",
        message: "Invalid configuration",
        details: { field: "concurrency", reason: "must be positive" },
      });

      expect(error.code).toBe("JOBS_CONFIGURATION_INVALID");
    });

    it("should create queue errors", () => {
      const error = new IgniterJobsError({
        code: "JOBS_QUEUE_NOT_FOUND",
        message: 'Queue "unknown" not found',
        details: { queue: "unknown" },
      });

      expect(error.code).toBe("JOBS_QUEUE_NOT_FOUND");
    });

    it("should create job execution errors", () => {
      const originalError = new Error("Handler threw");
      const error = new IgniterJobsError({
        code: "JOBS_EXECUTION_FAILED",
        message: "Job execution failed",
        cause: originalError,
        details: { jobId: "job_123", queue: "email", name: "send" },
      });

      expect(error.code).toBe("JOBS_EXECUTION_FAILED");
      expect(error.cause).toBe(originalError);
    });

    it("should create validation errors", () => {
      const error = new IgniterJobsError({
        code: "JOBS_VALIDATION_FAILED",
        message: "Input validation failed",
        statusCode: 400,
        details: {
          issues: [{ path: ["email"], message: "Invalid email format" }],
        },
      });

      expect(error.code).toBe("JOBS_VALIDATION_FAILED");
      expect(error.statusCode).toBe(400);
    });

    it("should create adapter errors", () => {
      const error = new IgniterJobsError({
        code: "JOBS_ADAPTER_CONNECTION_FAILED",
        message: "Failed to connect to Redis",
        statusCode: 503,
        details: { host: "localhost", port: 6379 },
      });

      expect(error.code).toBe("JOBS_ADAPTER_CONNECTION_FAILED");
      expect(error.statusCode).toBe(503);
    });

    it("should create worker errors", () => {
      const error = new IgniterJobsError({
        code: "JOBS_WORKER_FAILED",
        message: "Worker crashed unexpectedly",
        details: { workerId: "worker_123", queues: ["email", "notifications"] },
      });

      expect(error.code).toBe("JOBS_WORKER_FAILED");
    });

    it("should create scope errors", () => {
      const error = new IgniterJobsError({
        code: "JOBS_SCOPE_ALREADY_DEFINED",
        message: 'Scope "organization" is already defined',
        details: { scope: "organization" },
      });

      expect(error.code).toBe("JOBS_SCOPE_ALREADY_DEFINED");
    });
  });
});
