/**
 * @fileoverview Tests for IgniterJobsTelemetryUtils
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { IgniterJobsTelemetryUtils } from "./telemetry";
import type { IgniterJobsTelemetry } from "../types/events";

describe("IgniterJobsTelemetryUtils", () => {
  describe("emitTelemetry()", () => {
    let mockTelemetry: IgniterJobsTelemetry;

    beforeEach(() => {
      mockTelemetry = {
        service: "test-service",
        environment: "test-env",
        emit: vi.fn(),
      };
    });

    it("does nothing when telemetry is undefined", () => {
      expect(() => {
        IgniterJobsTelemetryUtils.emitTelemetry(
          undefined,
          "test.event",
          { key: "value" }
        );
      }).not.toThrow();
    });

    it("emits telemetry event with attributes", () => {
      const attributes = {
        "ctx.job.id": "job_123",
        "ctx.job.name": "send",
        "ctx.job.queue": "email",
      };

      IgniterJobsTelemetryUtils.emitTelemetry(
        mockTelemetry,
        "igniter.jobs.job.enqueued",
        attributes
      );

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        "igniter.jobs.job.enqueued",
        {
          attributes,
          level: "info",
        }
      );
    });

    it("uses default level of 'info'", () => {
      IgniterJobsTelemetryUtils.emitTelemetry(
        mockTelemetry,
        "test.event",
        { key: "value" }
      );

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        "test.event",
        expect.objectContaining({ level: "info" })
      );
    });

    it("supports 'error' level", () => {
      IgniterJobsTelemetryUtils.emitTelemetry(
        mockTelemetry,
        "igniter.jobs.job.failed",
        { "ctx.job.error.message": "Something went wrong" },
        "error"
      );

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        "igniter.jobs.job.failed",
        expect.objectContaining({ level: "error" })
      );
    });

    it("supports string attributes", () => {
      const attributes = {
        "ctx.job.id": "job_123",
        "ctx.job.name": "process",
      };

      IgniterJobsTelemetryUtils.emitTelemetry(
        mockTelemetry,
        "test.event",
        attributes
      );

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        "test.event",
        expect.objectContaining({ attributes })
      );
    });

    it("supports number attributes", () => {
      const attributes = {
        "ctx.job.duration": 1234,
        "ctx.job.attempt": 3,
        "ctx.job.maxAttempts": 5,
      };

      IgniterJobsTelemetryUtils.emitTelemetry(
        mockTelemetry,
        "test.event",
        attributes
      );

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        "test.event",
        expect.objectContaining({ attributes })
      );
    });

    it("supports boolean attributes", () => {
      const attributes = {
        "ctx.job.isFinalAttempt": true,
        "ctx.job.success": false,
      };

      IgniterJobsTelemetryUtils.emitTelemetry(
        mockTelemetry,
        "test.event",
        attributes
      );

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        "test.event",
        expect.objectContaining({ attributes })
      );
    });

    it("supports null attributes", () => {
      const attributes = {
        "ctx.job.id": "job_123",
        "ctx.job.result": null,
      };

      IgniterJobsTelemetryUtils.emitTelemetry(
        mockTelemetry,
        "test.event",
        attributes
      );

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        "test.event",
        expect.objectContaining({ attributes })
      );
    });

    it("supports mixed attribute types", () => {
      const attributes = {
        "ctx.job.id": "job_123",
        "ctx.job.duration": 500,
        "ctx.job.success": true,
        "ctx.job.error": null,
      };

      IgniterJobsTelemetryUtils.emitTelemetry(
        mockTelemetry,
        "test.event",
        attributes
      );

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        "test.event",
        expect.objectContaining({ attributes })
      );
    });

    it("silently ignores telemetry errors", () => {
      const errorTelemetry: IgniterJobsTelemetry = {
        service: "test-service",
        environment: "test-env",
        emit: vi.fn().mockImplementation(() => {
          throw new Error("Telemetry failure");
        }),
      };

      expect(() => {
        IgniterJobsTelemetryUtils.emitTelemetry(
          errorTelemetry,
          "test.event",
          { key: "value" }
        );
      }).not.toThrow();
    });

    it("does not propagate telemetry errors to callers", () => {
      const errorTelemetry: IgniterJobsTelemetry = {
        service: "test-service",
        environment: "test-env",
        emit: vi.fn().mockImplementation(() => {
          throw new Error("Network error");
        }),
      };

      const result = IgniterJobsTelemetryUtils.emitTelemetry(
        errorTelemetry,
        "test.event",
        { key: "value" }
      );

      // Should return undefined without throwing
      expect(result).toBeUndefined();
    });

    it("handles empty attributes", () => {
      IgniterJobsTelemetryUtils.emitTelemetry(
        mockTelemetry,
        "test.event",
        {}
      );

      expect(mockTelemetry.emit).toHaveBeenCalledWith(
        "test.event",
        { attributes: {}, level: "info" }
      );
    });

    describe("event name formats", () => {
      it("handles namespaced event names", () => {
        IgniterJobsTelemetryUtils.emitTelemetry(
          mockTelemetry,
          "igniter.jobs.job.enqueued",
          { "ctx.job.id": "job_123" }
        );

        expect(mockTelemetry.emit).toHaveBeenCalledWith(
          "igniter.jobs.job.enqueued",
          expect.any(Object)
        );
      });

      it("handles simple event names", () => {
        IgniterJobsTelemetryUtils.emitTelemetry(
          mockTelemetry,
          "test",
          { key: "value" }
        );

        expect(mockTelemetry.emit).toHaveBeenCalledWith(
          "test",
          expect.any(Object)
        );
      });

      it("handles deeply nested event names", () => {
        IgniterJobsTelemetryUtils.emitTelemetry(
          mockTelemetry,
          "org.company.product.module.action.state",
          { key: "value" }
        );

        expect(mockTelemetry.emit).toHaveBeenCalledWith(
          "org.company.product.module.action.state",
          expect.any(Object)
        );
      });
    });

    describe("real-world scenarios", () => {
      it("emits job.enqueued event", () => {
        IgniterJobsTelemetryUtils.emitTelemetry(
          mockTelemetry,
          "igniter.jobs.job.enqueued",
          {
            "ctx.job.id": "job_abc123",
            "ctx.job.name": "sendWelcome",
            "ctx.job.queue": "email",
            "ctx.job.priority": 10,
          }
        );

        expect(mockTelemetry.emit).toHaveBeenCalledWith(
          "igniter.jobs.job.enqueued",
          {
            attributes: {
              "ctx.job.id": "job_abc123",
              "ctx.job.name": "sendWelcome",
              "ctx.job.queue": "email",
              "ctx.job.priority": 10,
            },
            level: "info",
          }
        );
      });

      it("emits job.completed event", () => {
        IgniterJobsTelemetryUtils.emitTelemetry(
          mockTelemetry,
          "igniter.jobs.job.completed",
          {
            "ctx.job.id": "job_abc123",
            "ctx.job.name": "sendWelcome",
            "ctx.job.queue": "email",
            "ctx.job.duration": 1500,
          }
        );

        expect(mockTelemetry.emit).toHaveBeenCalledWith(
          "igniter.jobs.job.completed",
          {
            attributes: {
              "ctx.job.id": "job_abc123",
              "ctx.job.name": "sendWelcome",
              "ctx.job.queue": "email",
              "ctx.job.duration": 1500,
            },
            level: "info",
          }
        );
      });

      it("emits job.failed event with error level", () => {
        IgniterJobsTelemetryUtils.emitTelemetry(
          mockTelemetry,
          "igniter.jobs.job.failed",
          {
            "ctx.job.id": "job_abc123",
            "ctx.job.name": "sendWelcome",
            "ctx.job.queue": "email",
            "ctx.job.error.message": "SMTP connection failed",
            "ctx.job.attempt": 3,
            "ctx.job.maxAttempts": 3,
            "ctx.job.isFinalAttempt": true,
          },
          "error"
        );

        expect(mockTelemetry.emit).toHaveBeenCalledWith(
          "igniter.jobs.job.failed",
          {
            attributes: {
              "ctx.job.id": "job_abc123",
              "ctx.job.name": "sendWelcome",
              "ctx.job.queue": "email",
              "ctx.job.error.message": "SMTP connection failed",
              "ctx.job.attempt": 3,
              "ctx.job.maxAttempts": 3,
              "ctx.job.isFinalAttempt": true,
            },
            level: "error",
          }
        );
      });

      it("emits worker.started event", () => {
        IgniterJobsTelemetryUtils.emitTelemetry(
          mockTelemetry,
          "igniter.jobs.worker.started",
          {
            "ctx.worker.id": "worker_xyz789",
            "ctx.worker.queues": "email,notifications",
            "ctx.worker.concurrency": 5,
          }
        );

        expect(mockTelemetry.emit).toHaveBeenCalledWith(
          "igniter.jobs.worker.started",
          {
            attributes: {
              "ctx.worker.id": "worker_xyz789",
              "ctx.worker.queues": "email,notifications",
              "ctx.worker.concurrency": 5,
            },
            level: "info",
          }
        );
      });
    });
  });
});
