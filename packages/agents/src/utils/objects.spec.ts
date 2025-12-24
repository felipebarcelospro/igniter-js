import { describe, expect, it } from "vitest";
import { IgniterAgentObjectUtils } from "./objects";

describe("IgniterAgentObjectUtils", () => {
  it("deep merges nested objects", () => {
    const result = IgniterAgentObjectUtils.deepMerge(
      { a: 1, nested: { value: 2 } },
      { nested: { other: 3 } },
    );

    expect(result).toEqual({ a: 1, nested: { value: 2, other: 3 } });
  });

  it("picks keys from an object", () => {
    const result = IgniterAgentObjectUtils.pick({ a: 1, b: 2, c: 3 }, ["a", "c"]);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it("omits keys from an object", () => {
    const result = IgniterAgentObjectUtils.omit({ a: 1, b: 2, c: 3 }, ["b"]);
    expect(result).toEqual({ a: 1, c: 3 });
  });
});
