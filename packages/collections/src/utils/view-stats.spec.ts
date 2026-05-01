import { describe, it, expect, vi } from "vitest";
import { IgniterCollectionViewStatsCalculator } from "./view-stats";
import { IgniterCollectionError } from "../errors/collection.error";

describe("IgniterCollectionViewStatsCalculator", () => {
  const items = [
    { id: 1, status: "active", views: 100, metadata: { score: 10, author: { name: "John" } }, tags: ["tech"] },
    { id: 2, status: "inactive", views: 200, metadata: { score: 20, author: { name: "Jane" } }, tags: ["tutorial"] },
    { id: 3, status: "active", views: 300, metadata: { score: 30, author: { name: "John" } }, tags: ["tech", "tutorial"] },
    { id: 4, status: "active", views: 400, metadata: { score: 40, author: { name: "Bob" } }, tags: ["news"] },
  ];

  describe("calculate", () => {
    it("should calculate multiple stats in a single pass", () => {
      const statsDef = {
        total: { type: "count" },
        activeCount: { type: "count", where: { status: "active" } },
        totalViews: { type: "sum", field: "views" },
        avgScore: { type: "avg", field: "metadata.score" },
        minViews: { type: "min", field: "views" },
        maxViews: { type: "max", field: "views" },
      };

      const result = IgniterCollectionViewStatsCalculator.calculate(items, statsDef as any);

      expect(result.total).toBe(4);
      expect(result.activeCount).toBe(3);
      expect(result.totalViews).toBe(1000);
      expect(result.avgScore).toBe(25);
      expect(result.minViews).toBe(100);
      expect(result.maxViews).toBe(400);
    });

    it("should handle empty items array", () => {
      const statsDef = {
        total: { type: "count" },
        avgScore: { type: "avg", field: "metadata.score" },
        minViews: { type: "min", field: "views" },
      };

      const result = IgniterCollectionViewStatsCalculator.calculate([], statsDef as any);

      expect(result.total).toBe(0);
      expect(result.avgScore).toBe(0);
      expect(result.minViews).toBe(0);
    });

    it("should apply where filter correctly", () => {
      const statsDef = {
        johnsViews: { 
          type: "sum", 
          field: "views", 
          where: { "metadata.author.name": "John" } 
        },
      };

      const result = IgniterCollectionViewStatsCalculator.calculate(items, statsDef as any);
      expect(result.johnsViews).toBe(400); // 100 + 300
    });
  });

  describe("custom expressions", () => {
    it("should evaluate custom expressions correctly", () => {
      const statsDef = {
        ratio: { 
          type: "custom", 
          expression: "items.filter(i => i.status === 'active').length / items.length" 
        },
      };

      const result = IgniterCollectionViewStatsCalculator.calculate(items, statsDef as any);
      expect(result.ratio).toBe(0.75);
    });

    it("should throw IgniterCollectionError for invalid expressions", () => {
      const statsDef = {
        invalid: { 
          type: "custom", 
          expression: "some_invalid_code" 
        },
      };

      expect(() => 
        IgniterCollectionViewStatsCalculator.calculate(items, statsDef as any)
      ).toThrow(IgniterCollectionError);
    });
  });

  describe("performance warning", () => {
    it("should log warning for datasets > 1000 items", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const largeItems = new Array(1001).fill({ views: 1 });
      
      IgniterCollectionViewStatsCalculator.calculate(largeItems, { total: { type: "count" } });
      
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("may be slow"));
      warnSpy.mockRestore();
    });
  });

  describe("nested fields", () => {
    it("should support deep nested fields", () => {
      const result = IgniterCollectionViewStatsCalculator.calculate(items, {
        sum: { type: "sum", field: "metadata.score" }
      } as any);
      expect(result.sum).toBe(100);
    });

    it("should return 0 for missing fields in aggregations", () => {
      const result = IgniterCollectionViewStatsCalculator.calculate(items, {
        sum: { type: "sum", field: "metadata.missing" }
      } as any);
      expect(result.sum).toBe(0);
    });
  });
  
  describe("filtering operators", () => {
    it("should support scalar operators", () => {
      const result = IgniterCollectionViewStatsCalculator.calculate(items, {
        active: { type: "count", where: { status: { in: ["active"] } } },
        highViews: { type: "count", where: { views: { gt: 250 } } },
        jane: { type: "count", where: { "metadata.author.name": { contains: "ane" } } }
      } as any);
      
      expect(result.active).toBe(3);
      expect(result.highViews).toBe(2);
      expect(result.jane).toBe(1);
    });

    it("should support array operators", () => {
      const result = IgniterCollectionViewStatsCalculator.calculate(items, {
        tech: { type: "count", where: { tags: { has: "tech" } } },
        both: { type: "count", where: { tags: { hasEvery: ["tech", "tutorial"] } } },
        any: { type: "count", where: { tags: { hasSome: ["news", "tech"] } } },
        length: { type: "count", where: { tags: { length: 2 } } }
      } as any);
      
      expect(result.tech).toBe(2);
      expect(result.both).toBe(1);
      expect(result.any).toBe(3);
      expect(result.length).toBe(1);
    });
  });
});
