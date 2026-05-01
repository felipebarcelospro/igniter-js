import { describe, expect, it } from "vitest";
import { tryCatch } from "./try-catch";

describe("tryCatch", () => {
  it("returns data for resolved promises", async () => {
    const result = await tryCatch(Promise.resolve("ok"));

    expect(result).toEqual({ data: "ok", error: null });
  });

  it("returns error for rejected promises", async () => {
    const result = await tryCatch(Promise.reject(new Error("fail")));

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});
