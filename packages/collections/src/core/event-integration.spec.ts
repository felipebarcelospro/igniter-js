import { describe, it, expect, vi } from "vitest";
import { IgniterCollectionManager } from "./manager";
import type { IgniterCollectionAdapter } from "../types/adapter";
import type { IIgniterCollectionsManager } from "../types/manager";

describe("Event Integration", () => {
  const mockAdapter: IgniterCollectionAdapter = {
    read: vi.fn(),
    write: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    mkdir: vi.fn(),
  };

  const createManager = (): IIgniterCollectionsManager<any> => {
    const postsDefinition = {
      name: "posts",
      patterns: ["{id}.md"],
      schema: null as any,
      hooks: {},
      defaultIdGenerator: () => "id-123",
      subCollections: new Map(),
    };

    return new IgniterCollectionManager({
      basePath: "/base",
      adapter: mockAdapter,
      collections: {
        posts: postsDefinition,
      },
    }) as unknown as IIgniterCollectionsManager<any>;
  };

  it("should fulfill all event acceptance criteria", async () => {
    const docs = createManager();
    const globalCreated = vi.fn();
    const scopedUpdated = vi.fn();
    const globalRead = vi.fn();
    const globalDeleted = vi.fn();

    // 1. .on('created', callback) works
    docs.on("created", globalCreated);

    // 2. .on('posts:updated', callback) works
    docs.on("posts:updated" as any, scopedUpdated);

    docs.on("read", globalRead);
    docs.on("deleted", globalDeleted);

    vi.mocked(mockAdapter.write).mockResolvedValue();
    vi.mocked(mockAdapter.exists).mockResolvedValue(true);
    vi.mocked(mockAdapter.read).mockResolvedValue("---\ntitle: Original\n---\nContent");
    vi.mocked(mockAdapter.list).mockResolvedValue(["/base/id-123.md"]);
    vi.mocked(mockAdapter.delete).mockResolvedValue();

    // Test Create
    const post = await (docs as any).posts.create({ data: { title: "New Post" } });
    expect(globalCreated).toHaveBeenCalledWith(expect.objectContaining({
      collection: "posts",
      value: post
    }));

    // Test Read
    await (docs as any).posts.findUnique({ where: { id: "id-123" } });
    expect(globalRead).toHaveBeenCalledWith(expect.objectContaining({
      collection: "posts",
      value: expect.objectContaining({ id: "id-123" })
    }));

    // Test Update
    const updatedPost = await (docs as any).posts.update({
      where: { id: "id-123" },
      data: { title: "Updated Title" }
    });
    expect(scopedUpdated).toHaveBeenCalledWith(expect.objectContaining({
      newValue: updatedPost,
      previousValue: expect.objectContaining({ title: "Original" })
    }));

    // Test Delete
    await (docs as any).posts.delete({ where: { id: "id-123" } });
    expect(globalDeleted).toHaveBeenCalledWith(expect.objectContaining({
      collection: "posts",
      value: expect.objectContaining({ id: "id-123" })
    }));
  });

  it("should emit events after hooks", async () => {
    const hookCalled = vi.fn();
    const eventCalled = vi.fn();

    const postsDefinition = {
      name: "posts",
      patterns: ["{id}.md"],
      schema: null as any,
      hooks: {
        onCreated: async ({ value }: any) => {
          hookCalled();
          return value;
        }
      },
      defaultIdGenerator: () => "id-123",
      subCollections: new Map(),
    };

    const docs = new IgniterCollectionManager({
      basePath: "/base",
      adapter: mockAdapter,
      collections: { posts: postsDefinition },
    }) as any;

    docs.on("created", () => {
      eventCalled();
      // Ensure hook was called before event
      expect(hookCalled).toHaveBeenCalled();
    });

    vi.mocked(mockAdapter.write).mockResolvedValue();

    await docs.posts.create({ data: { title: "Hook Test" } });
    expect(eventCalled).toHaveBeenCalled();
  });
});
