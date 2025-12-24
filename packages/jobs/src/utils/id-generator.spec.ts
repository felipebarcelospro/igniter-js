/**
 * @fileoverview Tests for IgniterJobsIdGenerator
 */

import { describe, it, expect } from "vitest";
import { IgniterJobsIdGenerator } from "./id-generator";

describe("IgniterJobsIdGenerator", () => {
  describe("generate()", () => {
    it("generates a string id with the given prefix", () => {
      const id = IgniterJobsIdGenerator.generate("job");

      expect(typeof id).toBe("string");
      expect(id.startsWith("job_")).toBe(true);
    });

    it("generates unique ids on each call", () => {
      const id1 = IgniterJobsIdGenerator.generate("job");
      const id2 = IgniterJobsIdGenerator.generate("job");
      const id3 = IgniterJobsIdGenerator.generate("job");

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it("generates ids with different prefixes", () => {
      const jobId = IgniterJobsIdGenerator.generate("job");
      const workerId = IgniterJobsIdGenerator.generate("worker");
      const scheduleId = IgniterJobsIdGenerator.generate("schedule");

      expect(jobId.startsWith("job_")).toBe(true);
      expect(workerId.startsWith("worker_")).toBe(true);
      expect(scheduleId.startsWith("schedule_")).toBe(true);
    });

    it("generates ids with expected format (prefix_timestamp_random)", () => {
      const id = IgniterJobsIdGenerator.generate("test");
      const parts = id.split("_");

      // Format: prefix_timestamp_random
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe("test");
      // Timestamp part should be a base36 string
      expect(parts[1]).toMatch(/^[a-z0-9]+$/);
      // Random part should be a base36 string
      expect(parts[2]).toMatch(/^[a-z0-9]+$/);
    });

    it("generates ids with reasonable length", () => {
      const id = IgniterJobsIdGenerator.generate("job");

      // Should be reasonably short but informative
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(50);
    });

    it("handles empty prefix", () => {
      const id = IgniterJobsIdGenerator.generate("");

      expect(typeof id).toBe("string");
      expect(id.startsWith("_")).toBe(true);
    });

    it("handles special characters in prefix", () => {
      const id = IgniterJobsIdGenerator.generate("my-prefix");

      expect(id.startsWith("my-prefix_")).toBe(true);
    });

    it("generates many unique ids without collision", () => {
      const ids = new Set<string>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        ids.add(IgniterJobsIdGenerator.generate("job"));
      }

      expect(ids.size).toBe(count);
    });

    it("includes timestamp component that increases over time", async () => {
      const id1 = IgniterJobsIdGenerator.generate("job");

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 2));

      const id2 = IgniterJobsIdGenerator.generate("job");

      const timestamp1 = id1.split("_")[1];
      const timestamp2 = id2.split("_")[1];

      // Timestamps should be different (or at least not less)
      const ts1Value = parseInt(timestamp1!, 36);
      const ts2Value = parseInt(timestamp2!, 36);

      expect(ts2Value).toBeGreaterThanOrEqual(ts1Value);
    });
  });
});
