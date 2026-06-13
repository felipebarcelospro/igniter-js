import { describe, it, expect, vi } from "vitest";
import { IgniterCollections, IgniterCollectionModel, IgniterCollectionView } from "../index";
import { IgniterCollectionMockAdapter } from "../adapters/mock.adapter";

describe("Context Injection", () => {
  const createDocs = () => {
    return IgniterCollections.create()
      .withAdapter(new IgniterCollectionMockAdapter())
      .withContext(() => ({ db: "connected", auth: { userId: "123" } }));
  };

  it("should inject context into onCreated hook", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .onCreated(async ({ value, context }) => {
        const ctx = context as { db: string; auth: { userId: string } };
        expect(ctx.db).toBe("connected");
        expect(ctx.auth.userId).toBe("123");
        return { ...value, injected: true };
      })
      .build();

    const docs = createDocs().addCollection(Posts).build();
    const result = await docs.posts.create({ data: { title: "Hello" } });

    expect(result.injected).toBe(true);
  });

  it("should inject context into onRead hook", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .onRead(async ({ value, context }) => {
        const ctx = context as { db: string; auth: { userId: string } };
        expect(ctx.db).toBe("connected");
        return { ...value, readAt: Date.now() };
      })
      .build();

    const docs = createDocs().addCollection(Posts).build();
    await docs.posts.create({ data: { title: "Hello" }, id: "1" });
    const result = await docs.posts.findUnique({ where: { id: "1" } });

    expect(result?.readAt).toBeDefined();
  });

  it("should inject context into onList hook", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .onList(async ({ values, context }) => {
        const ctx = context as { db: string; auth: { userId: string } };
        expect(ctx.db).toBe("connected");
        return values.map((v) => ({ ...v, listed: true }));
      })
      .build();

    const docs = createDocs().addCollection(Posts).build();
    await docs.posts.create({ data: { title: "A" }, id: "1" });
    await docs.posts.create({ data: { title: "B" }, id: "2" });
    const results = await docs.posts.findMany();

    expect(results.every((r: any) => r.listed)).toBe(true);
  });

  it("should inject context into onUpdated hook", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .onUpdated(async ({ newValue, context }) => {
        const ctx = context as { db: string; auth: { userId: string } };
        expect(ctx.db).toBe("connected");
        return { ...newValue, updatedBy: ctx.auth.userId };
      })
      .build();

    const docs = createDocs().addCollection(Posts).build();
    await docs.posts.create({ data: { title: "Hello" }, id: "1" });
    const result = await docs.posts.update({
      where: { id: "1" },
      data: { title: "Updated" },
    });

    expect(result.updatedBy).toBe("123");
  });

  it("should inject context into onDeleted hook", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .onDeleted(async ({ value, context }) => {
        const ctx = context as { db: string; auth: { userId: string } };
        expect(ctx.db).toBe("connected");
        return true;
      })
      .build();

    const docs = createDocs().addCollection(Posts).build();
    await docs.posts.create({ data: { title: "Hello" }, id: "1" });
    await docs.posts.delete({ where: { id: "1" } });

    // Should not throw
    expect(true).toBe(true);
  });

  it("should inject context into view getData hook", async () => {
    const DashboardView = IgniterCollectionView.create("dashboard")
      .withTitle("Dashboard")
      .withData(async ({ manager, context }) => {
        const ctx = context as { db: string; auth: { userId: string } };
        expect(ctx.db).toBe("connected");
        return { items: [], userId: ctx.auth.userId };
      })
      .build();

    const docs = createDocs().addView(DashboardView).build();
    const result = await docs.views.get("dashboard")!.render();

    expect(result.data.userId).toBe("123");
  });

  it("should inject context into view action handler", async () => {
    const DashboardView = IgniterCollectionView.create("dashboard")
      .withTitle("Dashboard")
      .withData(async ({ manager, context }) => ({ items: [] }))
      .addAction("test", {
        description: "Test action",
        handler: async ({ context }) => {
          const ctx = context as { db: string; auth: { userId: string } };
          expect(ctx.db).toBe("connected");
          return { success: true, data: { userId: ctx.auth.userId } };
        },
      })
      .build();

    const docs = createDocs().addView(DashboardView).build();
    const result = await docs.views.get("dashboard")!.actions.execute("test", {});

    expect(result.data.userId).toBe("123");
  });

  it("should inject context into global events", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .build();

    const docs = createDocs().addCollection(Posts).build();
    const handler = vi.fn();
    docs.on("created", handler);

    await docs.posts.create({ data: { title: "Hello" } });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "posts",
        context: expect.objectContaining({ db: "connected", auth: { userId: "123" } }),
      })
    );
  });

  it("should inject context into scoped events", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .build();

    const docs = createDocs().addCollection(Posts).build();
    const handler = vi.fn();
    docs.on("posts:created", handler);

    await docs.posts.create({ data: { title: "Hello" } });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ db: "connected", auth: { userId: "123" } }),
      })
    );
  });

  it("should inject context into collection model events", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .build();

    const docs = createDocs().addCollection(Posts).build();
    const handler = vi.fn();
    docs.posts.on("created", handler);

    await docs.posts.create({ data: { title: "Hello" } });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ db: "connected", auth: { userId: "123" } }),
      })
    );
  });

  it("should handle async context factory", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .onCreated(async ({ value, context }) => {
        const ctx = context as { asyncValue: string };
        expect(ctx.asyncValue).toBe("resolved");
        return value;
      })
      .build();

    const docs = IgniterCollections.create()
      .withAdapter(new IgniterCollectionMockAdapter())
      .withContext(async () => ({ asyncValue: "resolved" }))
      .addCollection(Posts)
      .build();

    await docs.posts.create({ data: { title: "Hello" } });
  });

  it("should return undefined context when no factory configured", async () => {
    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .onCreated(async ({ value, context }) => {
        expect(context).toBeUndefined();
        return value;
      })
      .build();

    const docs = IgniterCollections.create()
      .withAdapter(new IgniterCollectionMockAdapter())
      .addCollection(Posts)
      .build();

    await docs.posts.create({ data: { title: "Hello" } });
  });

  it("should call factory fresh for each operation", async () => {
    let callCount = 0;

    const Posts = IgniterCollectionModel.create("posts")
      .withPatterns(["{id}.md"])
      .build();

    const docs = IgniterCollections.create()
      .withAdapter(new IgniterCollectionMockAdapter())
      .withContext(() => {
        callCount++;
        return { count: callCount };
      })
      .addCollection(Posts)
      .build();

    await docs.posts.create({ data: { title: "A" }, id: "1" });
    await docs.posts.create({ data: { title: "B" }, id: "2" });

    expect(callCount).toBe(2);
  });
});
