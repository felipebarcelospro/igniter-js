import { describe, it, expect, vi } from "vitest";
import { IgniterCollectionManager } from "./manager";
import type { IgniterCollectionAdapter } from "../types/adapter";

describe("IgniterCollectionManager Events", () => {
  const mockAdapter: IgniterCollectionAdapter = {
    read: vi.fn(),
    write: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    mkdir: vi.fn(),
  };

  const createManager = () => {
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
    });
  };

  it("should emit global created event", async () => {
    const manager = createManager() as any;
    const handler = vi.fn();
    manager.on("created", handler);

    vi.mocked(mockAdapter.write).mockResolvedValue();

    await manager.posts.create({ data: { title: "Hello" } });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      collection: "posts",
      value: expect.objectContaining({
        id: "id-123",
        title: "Hello"
      })
    }));
  });

  it("should emit scoped created event", async () => {
    const manager = createManager() as any;
    const handler = vi.fn();
    manager.on("posts:created", handler);

    vi.mocked(mockAdapter.write).mockResolvedValue();

    await manager.posts.create({ data: { title: "Hello" } });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      value: expect.objectContaining({
        id: "id-123"
      })
    }));
  });

  it("should emit global read event", async () => {
    const manager = createManager() as any;
    const handler = vi.fn();
    manager.on("read", handler);

    vi.mocked(mockAdapter.exists).mockResolvedValue(true);
    vi.mocked(mockAdapter.read).mockResolvedValue("---\ntitle: Hello\n---\nContent");
    vi.mocked(mockAdapter.list).mockResolvedValue(["/base/123.md"]);

    await manager.posts.findUnique({ where: { id: "123" } });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      collection: "posts",
      value: expect.objectContaining({
        id: "123"
      })
    }));
  });

  it("should emit global updated event", async () => {
    const manager = createManager() as any;
    const handler = vi.fn();
    manager.on("updated", handler);

    vi.mocked(mockAdapter.exists).mockResolvedValue(true);
    vi.mocked(mockAdapter.read).mockResolvedValue("---\ntitle: Hello\n---\nContent");
    vi.mocked(mockAdapter.list).mockResolvedValue(["/base/123.md"]);
    vi.mocked(mockAdapter.write).mockResolvedValue();

    await manager.posts.update({ where: { id: "123" }, data: { title: "Updated" } });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      collection: "posts",
      newValue: expect.objectContaining({
        title: "Updated"
      }),
      previousValue: expect.objectContaining({
        title: "Hello"
      })
    }));
  });

  it("should emit global deleted event", async () => {
    const manager = createManager() as any;
    const handler = vi.fn();
    manager.on("deleted", handler);

    vi.mocked(mockAdapter.exists).mockResolvedValue(true);
    vi.mocked(mockAdapter.read).mockResolvedValue("---\ntitle: Hello\n---\nContent");
    vi.mocked(mockAdapter.list).mockResolvedValue(["/base/123.md"]);
    vi.mocked(mockAdapter.delete).mockResolvedValue();

    await manager.posts.delete({ where: { id: "123" } });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      collection: "posts",
      value: expect.objectContaining({
        id: "123"
      })
    }));
  });
});
