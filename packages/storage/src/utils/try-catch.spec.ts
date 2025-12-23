import { describe, expect, it } from "vitest";
import { IgniterStorageTryCatch } from "./try-catch";

describe("IgniterStorageTryCatch", () => {
  it("returns data when promise resolves", async () => {
    const result = await IgniterStorageTryCatch.run(Promise.resolve("ok"));
    expect(result).toEqual({ data: "ok" });
  });

  it("returns error when promise rejects", async () => {
    const error = new Error("boom");
    const result = await IgniterStorageTryCatch.run(Promise.reject(error));
    expect(result).toEqual({ error });
  });
});
