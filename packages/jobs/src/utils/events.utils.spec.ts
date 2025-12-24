/**
 * @fileoverview Tests for IgniterJobsEventsUtils
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { IgniterJobsEventsUtils } from "./events.utils";
import { IgniterJobsPrefix } from "./prefix";
import type { IgniterJobsAdapter } from "../types/adapter";
import type { IgniterJobsEvent } from "../types/events";
import type { IgniterJobsScopeEntry } from "../types/scope";

describe("IgniterJobsEventsUtils", () => {
  describe("buildJobEventType()", () => {
    it("builds event type string from queue, job name, and event", () => {
      const eventType = IgniterJobsEventsUtils.buildJobEventType(
        "email",
        "send",
        "started"
      );

      expect(eventType).toBe("email:send:started");
    });

    it("builds different event types for different events", () => {
      const started = IgniterJobsEventsUtils.buildJobEventType(
        "email",
        "send",
        "started"
      );
      const completed = IgniterJobsEventsUtils.buildJobEventType(
        "email",
        "send",
        "completed"
      );
      const failed = IgniterJobsEventsUtils.buildJobEventType(
        "email",
        "send",
        "failed"
      );

      expect(started).toBe("email:send:started");
      expect(completed).toBe("email:send:completed");
      expect(failed).toBe("email:send:failed");
    });

    it("builds event type for different queues", () => {
      const emailEvent = IgniterJobsEventsUtils.buildJobEventType(
        "email",
        "process",
        "enqueued"
      );
      const notificationsEvent = IgniterJobsEventsUtils.buildJobEventType(
        "notifications",
        "process",
        "enqueued"
      );

      expect(emailEvent).toBe("email:process:enqueued");
      expect(notificationsEvent).toBe("notifications:process:enqueued");
    });

    it("builds event type for different job names", () => {
      const sendEvent = IgniterJobsEventsUtils.buildJobEventType(
        "email",
        "send",
        "started"
      );
      const receiveEvent = IgniterJobsEventsUtils.buildJobEventType(
        "email",
        "receive",
        "started"
      );

      expect(sendEvent).toBe("email:send:started");
      expect(receiveEvent).toBe("email:receive:started");
    });

    it("handles hyphenated names", () => {
      const eventType = IgniterJobsEventsUtils.buildJobEventType(
        "email-queue",
        "send-welcome",
        "job-started"
      );

      expect(eventType).toBe("email-queue:send-welcome:job-started");
    });

    it("handles underscored names", () => {
      const eventType = IgniterJobsEventsUtils.buildJobEventType(
        "email_queue",
        "send_welcome",
        "job_started"
      );

      expect(eventType).toBe("email_queue:send_welcome:job_started");
    });

    it("handles empty strings", () => {
      const eventType = IgniterJobsEventsUtils.buildJobEventType("", "", "");

      expect(eventType).toBe("::");
    });
  });

  describe("publishJobsEvent()", () => {
    let mockAdapter: IgniterJobsAdapter;

    beforeEach(() => {
      mockAdapter = {
        publishEvent: vi.fn().mockResolvedValue(undefined),
      } as unknown as IgniterJobsAdapter;
    });

    it("publishes event to base channel without scope", async () => {
      const event: IgniterJobsEvent = {
        type: "email:send:started",
        timestamp: new Date().toISOString(),
      };

      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: mockAdapter,
        service: "my-service",
        environment: "production",
        event,
      });

      expect(mockAdapter.publishEvent).toHaveBeenCalledTimes(1);
      expect(mockAdapter.publishEvent).toHaveBeenCalledWith(
        IgniterJobsPrefix.buildEventsChannel({
          service: "my-service",
          environment: "production",
        }),
        event
      );
    });

    it("publishes event to both base and scope channels when scope is provided", async () => {
      const event: IgniterJobsEvent = {
        type: "email:send:completed",
        timestamp: new Date().toISOString(),
      };
      const scope: IgniterJobsScopeEntry = { type: "organization", id: "org_123" };

      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: mockAdapter,
        service: "my-service",
        environment: "production",
        scope,
        event,
      });

      expect(mockAdapter.publishEvent).toHaveBeenCalledTimes(2);

      // First call - base channel
      expect(mockAdapter.publishEvent).toHaveBeenNthCalledWith(
        1,
        IgniterJobsPrefix.buildEventsChannel({
          service: "my-service",
          environment: "production",
        }),
        event
      );

      // Second call - scope channel
      expect(mockAdapter.publishEvent).toHaveBeenNthCalledWith(
        2,
        IgniterJobsPrefix.buildEventsChannel({
          service: "my-service",
          environment: "production",
          scope: { type: "organization", id: "org_123" },
        }),
        event
      );
    });

    it("publishes to correct channels for different environments", async () => {
      const event: IgniterJobsEvent = {
        type: "test:event",
        timestamp: new Date().toISOString(),
      };

      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: mockAdapter,
        service: "api",
        environment: "development",
        event,
      });

      expect(mockAdapter.publishEvent).toHaveBeenCalledWith(
        "igniter:jobs:events:development:api",
        event
      );
    });

    it("publishes to correct channels for different services", async () => {
      const event: IgniterJobsEvent = {
        type: "test:event",
        timestamp: new Date().toISOString(),
      };

      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: mockAdapter,
        service: "worker",
        environment: "production",
        event,
      });

      expect(mockAdapter.publishEvent).toHaveBeenCalledWith(
        "igniter:jobs:events:production:worker",
        event
      );
    });

    it("publishes to scope channel with numeric id", async () => {
      const event: IgniterJobsEvent = {
        type: "test:event",
        timestamp: new Date().toISOString(),
      };
      const scope: IgniterJobsScopeEntry = { type: "tenant", id: 12345 };

      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: mockAdapter,
        service: "api",
        environment: "prod",
        scope,
        event,
      });

      expect(mockAdapter.publishEvent).toHaveBeenNthCalledWith(
        2,
        "igniter:jobs:events:prod:api:scope:tenant:12345",
        event
      );
    });

    it("handles different scope types", async () => {
      const event: IgniterJobsEvent = {
        type: "test:event",
        timestamp: new Date().toISOString(),
      };

      // Organization scope
      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: mockAdapter,
        service: "api",
        environment: "prod",
        scope: { type: "organization", id: "org_1" },
        event,
      });

      expect(mockAdapter.publishEvent).toHaveBeenCalledWith(
        "igniter:jobs:events:prod:api:scope:organization:org_1",
        event
      );

      vi.mocked(mockAdapter.publishEvent).mockClear();

      // User scope
      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: mockAdapter,
        service: "api",
        environment: "prod",
        scope: { type: "user", id: "user_1" },
        event,
      });

      expect(mockAdapter.publishEvent).toHaveBeenCalledWith(
        "igniter:jobs:events:prod:api:scope:user:user_1",
        event
      );
    });

    it("passes event object unchanged", async () => {
      const event: IgniterJobsEvent = {
        type: "email:send:completed",
        timestamp: "2024-01-01T00:00:00.000Z",
        payload: {
          jobId: "job_123",
          result: { sent: true },
        },
      };

      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: mockAdapter,
        service: "my-service",
        environment: "production",
        event,
      });

      expect(mockAdapter.publishEvent).toHaveBeenCalledWith(
        expect.any(String),
        event
      );
    });

    it("does not publish to scope channel when scope is undefined", async () => {
      const event: IgniterJobsEvent = {
        type: "test:event",
        timestamp: new Date().toISOString(),
      };

      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: mockAdapter,
        service: "api",
        environment: "production",
        scope: undefined,
        event,
      });

      expect(mockAdapter.publishEvent).toHaveBeenCalledTimes(1);
    });

    it("awaits both publish calls", async () => {
      const callOrder: string[] = [];

      const slowAdapter = {
        publishEvent: vi
          .fn()
          .mockImplementationOnce(async () => {
            await new Promise((r) => setTimeout(r, 10));
            callOrder.push("base");
          })
          .mockImplementationOnce(async () => {
            callOrder.push("scope");
          }),
      } as unknown as IgniterJobsAdapter;

      const event: IgniterJobsEvent = {
        type: "test:event",
        timestamp: new Date().toISOString(),
      };

      await IgniterJobsEventsUtils.publishJobsEvent({
        adapter: slowAdapter,
        service: "api",
        environment: "prod",
        scope: { type: "org", id: "1" },
        event,
      });

      expect(callOrder).toEqual(["base", "scope"]);
    });
  });
});
