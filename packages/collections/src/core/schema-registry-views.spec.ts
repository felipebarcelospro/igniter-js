import { describe, it, expect } from "vitest";
import { IgniterCollectionSchemaRegistry } from "./schema-registry";
import { IgniterCollectionMockAdapter } from "../adapters/mock.adapter";
import { IgniterCollectionPath } from "../utils/path";

describe("IgniterCollectionSchemaRegistry Views", () => {
  const basePath = "/base";
  
  it("should load views from schema file", async () => {
    const adapter = IgniterCollectionMockAdapter.create({
      "/base/schemas/posts.schema.json": JSON.stringify({
        collectionName: "posts",
        schema: { title: "string" },
        views: [
          {
            name: "analytics",
            title: "Analytics View",
            tree: [{ component: "Metric", props: { label: "Total Posts" } }],
            getData: "./hooks/analytics.ts"
          }
        ]
      }),
    });

    const registry = new IgniterCollectionSchemaRegistry(
      {
        basePath,
        registryPath: "schemas",
      },
      adapter
    );

    const collections = await registry.loadSchemas();
    const posts = collections.get("posts");

    expect(posts).toBeDefined();
    expect(posts?.views).toBeDefined();
    expect(posts?.views?.length).toBe(1);
    expect(posts?.views?.[0].name).toBe("analytics");
    expect(posts?.views?.[0].title).toBe("Analytics View");
    
    // Path should be resolved correctly (as a string since we can't load module in mock)
    const expectedPath = IgniterCollectionPath.resolve(basePath, "schemas", "./hooks/analytics.ts");
    expect(posts?.views?.[0].getData).toBe(expectedPath);
  });

  it("should load view actions from schema file", async () => {
    const adapter = IgniterCollectionMockAdapter.create({
      "/base/schemas/posts.schema.json": JSON.stringify({
        collectionName: "posts",
        schema: { title: "string" },
        views: [
          {
            name: "analytics",
            title: "Analytics View",
            tree: [],
            actions: {
              publish: {
                description: "Publish all posts",
                handler: "./actions/publish.ts"
              }
            }
          }
        ]
      }),
    });

    const registry = new IgniterCollectionSchemaRegistry(
      {
        basePath,
        registryPath: "schemas",
      },
      adapter
    );

    const collections = await registry.loadSchemas();
    const posts = collections.get("posts");

    expect(posts?.views?.[0].actions).toBeDefined();
    expect(posts?.views?.[0].actions?.publish).toBeDefined();
    expect(posts?.views?.[0].actions?.publish.description).toBe("Publish all posts");
    
    // Path should be resolved correctly
    const expectedPath = IgniterCollectionPath.resolve(basePath, "schemas", "./actions/publish.ts");
    expect(posts?.views?.[0].actions?.publish.handler).toBe(expectedPath);
  });
});
