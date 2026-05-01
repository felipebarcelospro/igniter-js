import { describe, it, expect } from "vitest";
import { IgniterCollectionViewJSONPointer } from "./view-json-pointer";

describe("IgniterCollectionViewJSONPointer", () => {
  const data = {
    stats: {
      totalCount: 42,
      deep: {
        value: "nested",
      },
    },
    items: [{ id: 1, name: "Item 1" }, { id: 2, name: "Item 2" }],
    "complex/path": "slashes",
    "tilde~value": "tildes",
  };

  describe("resolve", () => {
    it("should resolve root object with empty pointer", () => {
      expect(IgniterCollectionViewJSONPointer.resolve(data, "")).toBe(data);
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/")).toBe(data);
    });

    it("should resolve top-level properties", () => {
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/stats")).toBe(data.stats);
    });

    it("should resolve nested properties", () => {
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/stats/totalCount")).toBe(42);
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/stats/deep/value")).toBe("nested");
    });

    it("should resolve array indices", () => {
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/items/0")).toBe(data.items[0]);
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/items/1/name")).toBe("Item 2");
    });

    it("should handle escaped characters (~1 for /, ~0 for ~)", () => {
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/complex~1path")).toBe("slashes");
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/tilde~0value")).toBe("tildes");
    });

    it("should return undefined for non-existent paths", () => {
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/non/existent")).toBeUndefined();
      expect(IgniterCollectionViewJSONPointer.resolve(data, "/items/5")).toBeUndefined();
    });

    it("should return undefined for invalid pointers", () => {
      expect(IgniterCollectionViewJSONPointer.resolve(data, "no-slash")).toBeUndefined();
    });
  });

  describe("set", () => {
    it("should set top-level properties", () => {
      const target: any = {};
      IgniterCollectionViewJSONPointer.set(target, "/newProp", "value");
      expect(target.newProp).toBe("value");
    });

    it("should set nested properties and create intermediate objects", () => {
      const target: any = {};
      IgniterCollectionViewJSONPointer.set(target, "/a/b/c", 123);
      expect(target.a.b.c).toBe(123);
    });

    it("should set array elements and create arrays", () => {
      const target: any = {};
      IgniterCollectionViewJSONPointer.set(target, "/items/0/id", 1);
      expect(Array.isArray(target.items)).toBe(true);
      expect(target.items[0].id).toBe(1);
    });

    it("should handle escaped characters when setting", () => {
      const target: any = {};
      IgniterCollectionViewJSONPointer.set(target, "/complex~1path", "val");
      expect(target["complex/path"]).toBe("val");
    });

    it("should throw error when setting root", () => {
      expect(() => IgniterCollectionViewJSONPointer.set({}, "/", "val")).toThrow("Cannot set root object");
    });
  });
});
