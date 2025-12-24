/**
 * @fileoverview Tests for IgniterJobsPrefix
 */

import { describe, it, expect } from "vitest";
import { IgniterJobsPrefix } from "./prefix";

describe("IgniterJobsPrefix", () => {
  describe("BASE_PREFIX", () => {
    it("has the correct base prefix value", () => {
      expect(IgniterJobsPrefix.BASE_PREFIX).toBe("igniter:jobs");
    });
  });

  describe("buildQueueName()", () => {
    it("builds queue name with base prefix", () => {
      const name = IgniterJobsPrefix.buildQueueName("email");

      expect(name).toBe("igniter:jobs:email");
    });

    it("builds queue name for different queues", () => {
      expect(IgniterJobsPrefix.buildQueueName("email")).toBe(
        "igniter:jobs:email"
      );
      expect(IgniterJobsPrefix.buildQueueName("notifications")).toBe(
        "igniter:jobs:notifications"
      );
      expect(IgniterJobsPrefix.buildQueueName("analytics")).toBe(
        "igniter:jobs:analytics"
      );
    });

    it("handles hyphenated queue names", () => {
      const name = IgniterJobsPrefix.buildQueueName("email-sender");

      expect(name).toBe("igniter:jobs:email-sender");
    });

    it("handles underscored queue names", () => {
      const name = IgniterJobsPrefix.buildQueueName("email_sender");

      expect(name).toBe("igniter:jobs:email_sender");
    });

    it("handles empty queue name", () => {
      const name = IgniterJobsPrefix.buildQueueName("");

      expect(name).toBe("igniter:jobs:");
    });
  });

  describe("buildEventsChannel()", () => {
    it("builds unscoped events channel", () => {
      const channel = IgniterJobsPrefix.buildEventsChannel({
        service: "my-service",
        environment: "production",
      });

      expect(channel).toBe(
        "igniter:jobs:events:production:my-service"
      );
    });

    it("builds scoped events channel", () => {
      const channel = IgniterJobsPrefix.buildEventsChannel({
        service: "my-service",
        environment: "production",
        scope: { type: "organization", id: "org_123" },
      });

      expect(channel).toBe(
        "igniter:jobs:events:production:my-service:scope:organization:org_123"
      );
    });

    it("builds channel for different environments", () => {
      const devChannel = IgniterJobsPrefix.buildEventsChannel({
        service: "api",
        environment: "development",
      });
      const prodChannel = IgniterJobsPrefix.buildEventsChannel({
        service: "api",
        environment: "production",
      });
      const stagingChannel = IgniterJobsPrefix.buildEventsChannel({
        service: "api",
        environment: "staging",
      });

      expect(devChannel).toBe("igniter:jobs:events:development:api");
      expect(prodChannel).toBe("igniter:jobs:events:production:api");
      expect(stagingChannel).toBe("igniter:jobs:events:staging:api");
    });

    it("builds channel for different services", () => {
      const apiChannel = IgniterJobsPrefix.buildEventsChannel({
        service: "api",
        environment: "production",
      });
      const workerChannel = IgniterJobsPrefix.buildEventsChannel({
        service: "worker",
        environment: "production",
      });

      expect(apiChannel).toBe("igniter:jobs:events:production:api");
      expect(workerChannel).toBe("igniter:jobs:events:production:worker");
    });

    it("builds channel with numeric scope id", () => {
      const channel = IgniterJobsPrefix.buildEventsChannel({
        service: "my-service",
        environment: "production",
        scope: { type: "user", id: 12345 },
      });

      expect(channel).toBe(
        "igniter:jobs:events:production:my-service:scope:user:12345"
      );
    });

    it("builds channel with different scope types", () => {
      const orgChannel = IgniterJobsPrefix.buildEventsChannel({
        service: "api",
        environment: "prod",
        scope: { type: "organization", id: "org_1" },
      });
      const userChannel = IgniterJobsPrefix.buildEventsChannel({
        service: "api",
        environment: "prod",
        scope: { type: "user", id: "user_1" },
      });
      const tenantChannel = IgniterJobsPrefix.buildEventsChannel({
        service: "api",
        environment: "prod",
        scope: { type: "tenant", id: "tenant_1" },
      });

      expect(orgChannel).toBe(
        "igniter:jobs:events:prod:api:scope:organization:org_1"
      );
      expect(userChannel).toBe(
        "igniter:jobs:events:prod:api:scope:user:user_1"
      );
      expect(tenantChannel).toBe(
        "igniter:jobs:events:prod:api:scope:tenant:tenant_1"
      );
    });

    it("returns base channel when scope is undefined", () => {
      const channelWithUndefined = IgniterJobsPrefix.buildEventsChannel({
        service: "api",
        environment: "production",
        scope: undefined,
      });

      const channelWithoutScope = IgniterJobsPrefix.buildEventsChannel({
        service: "api",
        environment: "production",
      });

      expect(channelWithUndefined).toBe(channelWithoutScope);
      expect(channelWithUndefined).toBe(
        "igniter:jobs:events:production:api"
      );
    });
  });
});
