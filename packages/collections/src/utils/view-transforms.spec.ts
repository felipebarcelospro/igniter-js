import { describe, it, expect } from "vitest";
import { IgniterCollectionViewTransformEngine } from "./view-transforms";
import { IgniterCollectionError } from "../errors/collection.error";

describe("IgniterCollectionViewTransformEngine", () => {
  const items = [
    { id: 1, category: "A", metadata: { score: 10, author: { name: "John" } } },
    { id: 2, category: "B", metadata: { score: 20, author: { name: "Jane" } } },
    { id: 3, category: "A", metadata: { score: 30, author: { name: "John" } } },
  ];

  describe("group", () => {
    it("should group items by field", () => {
      const result = IgniterCollectionViewTransformEngine.applyTransforms(items, [
        { type: "group", field: "category" },
      ]);

      expect(result).toHaveProperty("A");
      expect(result).toHaveProperty("B");
      expect(result.A).toHaveLength(2);
      expect(result.B).toHaveLength(1);
      expect(result.A[0].id).toBe(1);
      expect(result.A[1].id).toBe(3);
    });

    it("should handle missing group field", () => {
      const result = IgniterCollectionViewTransformEngine.applyTransforms(items, [
        { type: "group", field: "missing" },
      ]);
      expect(result).toHaveProperty("undefined");
      expect(result.undefined).toHaveLength(3);
    });
  });

  describe("flatten", () => {
    it("should flatten nested objects", () => {
      const result = IgniterCollectionViewTransformEngine.applyTransforms(items, [{ type: "flatten" }]);

      expect(result[0]).toEqual({
        id: 1,
        category: "A",
        "metadata.score": 10,
        "metadata.author.name": "John",
      });
    });
  });

  describe("pivot", () => {
    it("should pivot data correctly", () => {
      const salesData = [
        { month: "Jan", city: "NY", sales: 100 },
        { month: "Jan", city: "LA", sales: 80 },
        { month: "Feb", city: "NY", sales: 120 },
        { month: "Feb", city: "LA", sales: 90 },
      ];

      const result = IgniterCollectionViewTransformEngine.applyTransforms(salesData, [
        {
          type: "pivot",
          config: {
            index: "month",
            column: "city",
            value: "sales",
          },
        },
      ]);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ month: "Jan", NY: 100, LA: 80 });
      expect(result).toContainEqual({ month: "Feb", NY: 120, LA: 90 });
    });
  });

  describe("chaining", () => {
    it("should apply multiple transforms in order", () => {
      // Flatten then group by a flattened field
      const result = IgniterCollectionViewTransformEngine.applyTransforms(items, [
        { type: "flatten" },
        { type: "group", field: "metadata.author.name" },
      ]);

      expect(result).toHaveProperty("John");
      expect(result).toHaveProperty("Jane");
      expect(result.John).toHaveLength(2);
      expect(result.John[0]["metadata.author.name"]).toBe("John");
    });
  });

  describe("error handling", () => {
    it("should throw IgniterCollectionError for unknown transform", () => {
      expect(() =>
        IgniterCollectionViewTransformEngine.applyTransforms(items, [
          { type: "invalid" as any },
        ]),
      ).toThrow(IgniterCollectionError);
    });

    it("should throw error if input is not an array", () => {
      expect(() =>
        IgniterCollectionViewTransformEngine.applyTransforms({} as any, [{ type: "group", field: "id" }]),
      ).toThrow("Group transform requires an array of items");
    });
  });
});
