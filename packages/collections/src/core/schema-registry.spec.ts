import { describe, it, expect } from "vitest";
import { IgniterCollectionSchemaRegistry } from "./schema-registry";
import { IgniterCollectionMockAdapter } from "../adapters/mock.adapter";

describe("IgniterCollectionSchemaRegistry Multi-Source", () => {
  const adapter = IgniterCollectionMockAdapter.create({
    "/base/.fractal/schemas/posts.schema.json": JSON.stringify({
      collectionName: "posts",
      schema: { title: "string" },
    }),
    "/base/plugins/blog/schemas/posts.schema.json": JSON.stringify({
      collectionName: "posts",
      schema: { title: "string", tags: "array" },
    }),
    "/base/plugins/news/schemas/articles.schema.json": JSON.stringify({
      collectionName: "articles",
      schema: { headline: "string" },
    }),
  });

  it("should load schemas from multiple sources", async () => {
    const registry = new IgniterCollectionSchemaRegistry(
      {
        basePath: "/base",
        registryPath: [".fractal/schemas", "plugins/blog/schemas"],
      },
      adapter
    );

    const collections = await registry.loadSchemas();

    expect(collections.has("posts")).toBe(true);
    expect(collections.has("blog:posts")).toBe(true);
  });

  it("should expand glob patterns", async () => {
    const registry = new IgniterCollectionSchemaRegistry(
      {
        basePath: "/base",
        registryPath: ["plugins/*/schemas"],
      },
      adapter
    );

    const collections = await registry.loadSchemas();

    expect(collections.has("posts")).toBe(true);
    expect(collections.has("articles")).toBe(true);
  });

  it("should resolve conflicts with prefixes", async () => {
    const registry = new IgniterCollectionSchemaRegistry(
      {
        basePath: "/base",
        registryPath: [".fractal/schemas", "plugins/*/schemas"],
      },
      adapter
    );

    const collections = await registry.loadSchemas();

    expect(collections.has("posts")).toBe(true); // From .fractal/schemas
    expect(collections.has("blog:posts")).toBe(true); // From plugins/blog/schemas (conflict)
    expect(collections.has("articles")).toBe(true); // From plugins/news/schemas (no conflict)
  });

  it("should use the parent directory of 'schemas' as prefix", async () => {
    const adapter = IgniterCollectionMockAdapter.create({
      "/base/main/schemas/user.schema.json": JSON.stringify({
        collectionName: "user",
        schema: { name: "string" },
      }),
      "/base/addons/shop/schemas/user.schema.json": JSON.stringify({
        collectionName: "user",
        schema: { name: "string", role: "string" },
      }),
    });

    const registry = new IgniterCollectionSchemaRegistry(
      {
        basePath: "/base",
        registryPath: ["main/schemas", "addons/*/schemas"],
      },
      adapter
    );

    const collections = await registry.loadSchemas();

    expect(collections.has("user")).toBe(true); // From main/schemas
    expect(collections.has("shop:user")).toBe(true); // From addons/shop/schemas
  });
});
