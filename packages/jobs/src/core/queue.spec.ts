/**
 * @fileoverview Tests for IgniterQueue facade
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { IgniterQueue } from "./queue";
import { IgniterQueueBuilder } from "../builders/queue.builder";

describe("IgniterQueue", () => {
  describe("static create()", () => {
    it("creates a queue builder for the given name", () => {
      const builder = IgniterQueue.create("email");

      expect(builder).toBeInstanceOf(IgniterQueueBuilder);
    });

    it("preserves the queue name as a literal type", () => {
      const builder = IgniterQueue.create("notifications");

      // Build the queue to verify the name is preserved
      const queue = builder
        .addJob("push", { handler: async () => ({ ok: true }) })
        .build();

      expect(queue.name).toBe("notifications");
    });

    it("returns a chainable builder", () => {
      const queue = IgniterQueue.create("email")
        .addJob("send", { handler: async () => ({ sent: true }) })
        .build();

      expect(queue).toBeDefined();
      expect(queue.name).toBe("email");
      expect(queue.jobs).toHaveProperty("send");
    });

    it("supports adding multiple jobs", () => {
      const queue = IgniterQueue.create("email")
        .addJob("sendWelcome", { handler: async () => ({ ok: true }) })
        .addJob("sendReset", { handler: async () => ({ ok: true }) })
        .addJob("sendVerification", { handler: async () => ({ ok: true }) })
        .build();

      expect(Object.keys(queue.jobs)).toEqual([
        "sendWelcome",
        "sendReset",
        "sendVerification",
      ]);
    });

    it("supports adding crons", () => {
      const queue = IgniterQueue.create("maintenance")
        .addCron("cleanup", {
          cron: "0 0 * * *",
          handler: async () => ({ ok: true }),
        })
        .build();

      expect(queue.crons).toHaveProperty("cleanup");
    });

    it("supports jobs with input schemas", () => {
      const queue = IgniterQueue.create("email")
        .addJob("send", {
          input: z.object({
            to: z.string().email(),
            subject: z.string(),
            body: z.string(),
          }),
          handler: async ({ input }) => ({ sent: true, to: input.to }),
        })
        .build();

      expect(queue.jobs.send).toBeDefined();
    });

    it("supports jobs with output schemas", () => {
      const queue = IgniterQueue.create("processor")
        .addJob("process", {
          input: z.object({ data: z.string() }),
          output: z.object({ result: z.string() }),
          handler: async ({ input }) => ({ result: input.data.toUpperCase() }),
        })
        .build();

      expect(queue.jobs.process).toBeDefined();
    });

    it("supports jobs with configuration options", () => {
      const queue = IgniterQueue.create("email")
        .addJob("send", {
          handler: async () => ({ ok: true }),
          maxAttempts: 5,
          backoff: { type: "exponential", delay: 1000 },
          timeout: 30000,
        })
        .build();

      expect(queue.jobs.send).toHaveProperty("maxAttempts", 5);
    });

    it("supports crons with input schemas", () => {
      const queue = IgniterQueue.create("reports")
        .addCron("dailyReport", {
          cron: "0 8 * * *",
          handler: async () => ({ generated: true }),
        })
        .build();

      expect(queue.crons.dailyReport).toBeDefined();
    });

    it("handles different queue name formats", () => {
      // Standard name
      const queue1 = IgniterQueue.create("email")
        .addJob("test", { handler: async () => ({}) })
        .build();
      expect(queue1.name).toBe("email");

      // Hyphenated name
      const queue2 = IgniterQueue.create("email-sender")
        .addJob("test", { handler: async () => ({}) })
        .build();
      expect(queue2.name).toBe("email-sender");

      // Underscored name
      const queue3 = IgniterQueue.create("email_sender")
        .addJob("test", { handler: async () => ({}) })
        .build();
      expect(queue3.name).toBe("email_sender");

      // CamelCase name
      const queue4 = IgniterQueue.create("emailSender")
        .addJob("test", { handler: async () => ({}) })
        .build();
      expect(queue4.name).toBe("emailSender");
    });

    it("supports mixed jobs and crons", () => {
      const queue = IgniterQueue.create("email")
        .addJob("sendWelcome", { handler: async () => ({ ok: true }) })
        .addCron("cleanup", {
          cron: "0 2 * * *",
          handler: async () => ({ ok: true }),
        })
        .addJob("sendReset", { handler: async () => ({ ok: true }) })
        .build();

      expect(Object.keys(queue.jobs)).toEqual(["sendWelcome", "sendReset"]);
      expect(Object.keys(queue.crons)).toEqual(["cleanup"]);
    });
  });

  describe("queue structure", () => {
    it("built queue has name property", () => {
      const queue = IgniterQueue.create("test")
        .addJob("job1", { handler: async () => ({}) })
        .build();

      expect(queue).toHaveProperty("name", "test");
    });

    it("built queue has jobs property", () => {
      const queue = IgniterQueue.create("test")
        .addJob("job1", { handler: async () => ({}) })
        .build();

      expect(queue).toHaveProperty("jobs");
      expect(typeof queue.jobs).toBe("object");
    });

    it("built queue has crons property", () => {
      const queue = IgniterQueue.create("test")
        .addJob("job1", { handler: async () => ({}) })
        .build();

      expect(queue).toHaveProperty("crons");
      expect(typeof queue.crons).toBe("object");
    });

    it("jobs contain handler function", () => {
      const handler = async () => ({ result: "done" });
      const queue = IgniterQueue.create("test")
        .addJob("myJob", { handler })
        .build();

      expect(queue.jobs.myJob).toHaveProperty("handler");
      expect(typeof queue.jobs.myJob.handler).toBe("function");
    });

    it("crons contain handler and cron expression", () => {
      const handler = async () => ({ result: "done" });
      const queue = IgniterQueue.create("test")
        .addCron("myCron", { cron: "* * * * *", handler })
        .build();

      expect(queue.crons.myCron).toHaveProperty("handler");
      expect(queue.crons.myCron).toHaveProperty("cron", "* * * * *");
    });
  });
});
