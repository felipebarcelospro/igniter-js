import { describe, it, expect, beforeEach } from "vitest";
import { IgniterCollectionLoader } from "../utils/loader";
import { IgniterCollectionMockAdapter } from "../adapters/mock.adapter";
import { IgniterCollectionError } from "../errors/collection.error";

describe("IgniterCollectionLoader", () => {
  let mockAdapter: IgniterCollectionMockAdapter;
  let loader: IgniterCollectionLoader;

  beforeEach(() => {
    mockAdapter = new IgniterCollectionMockAdapter();
    loader = new IgniterCollectionLoader(mockAdapter);
  });

  it("should load JSON files", async () => {
    const data = { name: "posts", patterns: ["{id}.mdx"] };
    mockAdapter.files.set("/test/schema.json", JSON.stringify(data));

    const result = await loader.load("/test/schema.json");
    expect(result).toEqual(data);
  });

  it("should throw on unsupported file format", async () => {
    await expect(loader.load("/test/schema.yaml")).rejects.toThrow(
      IgniterCollectionError
    );
  });

  it("should throw on invalid JSON", async () => {
    mockAdapter.files.set("/test/schema.json", "not valid json");

    await expect(loader.load("/test/schema.json")).rejects.toThrow(
      IgniterCollectionError
    );
  });

  it("should throw on missing JSON file", async () => {
    await expect(loader.load("/test/missing.json")).rejects.toThrow(
      IgniterCollectionError
    );
  });
});
