import { describe, expect, it } from "vitest";
import { deepMerge, mergeQueryParams } from "./deepMerge";

describe("deepMerge", () => {
  it("merges nested objects and overrides primitives", () => {
    const result = deepMerge(
      { a: 1, nested: { a: 1, b: 2 } },
      { b: 2, nested: { b: 3, c: 4 } },
    );

    expect(result).toEqual({
      a: 1,
      b: 2,
      nested: { a: 1, b: 3, c: 4 },
    });
  });

  it("replaces arrays instead of merging", () => {
    const result = deepMerge({ list: [1, 2] }, { list: [3] });

    expect(result.list).toEqual([3]);
  });

  it("handles null or undefined inputs", () => {
    const result = deepMerge(null, undefined, { ok: true });

    expect(result).toEqual({ ok: true });
  });
});

describe("mergeQueryParams", () => {
  it("merges query params separately", () => {
    const result = mergeQueryParams(
      { query: { page: 1 }, params: { id: "1" } },
      { query: { page: 2 }, body: { ok: true } },
    );

    expect(result).toEqual({
      query: { page: 2 },
      params: { id: "1" },
      body: { ok: true },
    });
  });

  it("returns empty object when both inputs are missing", () => {
    const result = mergeQueryParams(undefined, undefined);

    expect(result).toEqual({});
  });
});
