import { describe, it, expect, vi, beforeEach } from "vitest";
import { IgniterCollectionViewManager } from "./view-manager";
import type { IgniterCollectionViewDefinition } from "../types/view";
import { z } from "zod";

describe("IgniterCollectionViewManager", () => {
  let mockManager: any;
  let mockTelemetry: any;

  const views: IgniterCollectionViewDefinition[] = [
    {
      name: "dashboard",
      title: "Dashboard",
      tree: [
        { component: "Metric", props: { title: "Total" }, valuePath: "/stats/count" }
      ],
      getData: async ({ manager }) => ({
        items: [{ id: "1", val: 10 }, { id: "2", val: 20 }],
        stats: { count: 2 }
      }),
      stats: {
        count: { type: "count" }
      }
    },
    {
      name: "with-transforms",
      title: "With Transforms",
      tree: [],
      getData: async ({ manager }) => ({
        items: [
          { id: "1", category: "news" },
          { id: "2", category: "tech" },
        ],
      }),
      transforms: [
        { type: "group", field: "category" }
      ]
    },
    {
      name: "with-actions",
      title: "With Actions",
      tree: [],
      getData: async ({ manager }) => ({ items: [] }),
      actions: {
        "test-action": {
          description: "A test action",
          params: z.object({ id: z.string() }) as any,
          handler: async ({ params }) => ({
            success: true,
            data: { receivedId: params.id }
          })
        }
      }
    }
  ];

  beforeEach(() => {
    mockTelemetry = {
      emit: vi.fn().mockResolvedValue(undefined)
    };
    mockManager = {
      telemetry: mockTelemetry,
      posts: {
        findMany: vi.fn().mockResolvedValue([
          { id: "1", data: { val: 10 } },
          { id: "2", data: { val: 20 } }
        ])
      }
    };
  });

  it("should list all views", () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    expect(manager.list()).toHaveLength(3);
    expect(manager.list()[0].name).toBe("dashboard");
  });

  it("should get a specific view", () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const view = manager.get("dashboard");
    expect(view).toBeDefined();
    expect(view?.name).toBe("dashboard");
  });

  it("should render a view with getData hook", async () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const result = await manager.render("dashboard");

    expect(result.data.items).toHaveLength(2);
    expect(result.data.stats.count).toBe(2);
    expect(result.renderedAt).toBeDefined();
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.render.started", expect.any(Object));
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.render.success", expect.any(Object));
  });

  it("should pass manager to getData hook", async () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const result = await manager.render("dashboard");

    // The getData hook should have received the manager
    expect(result.data.items).toHaveLength(2);
  });

  it("should apply transforms after hook", async () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const result = await manager.render("with-transforms");

    // Grouped by category
    expect(result.data.items).toHaveProperty("news");
    expect(result.data.items).toHaveProperty("tech");
  });

  it("should list available actions", () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const actions = manager.listActions("with-actions");
    expect(actions).toEqual(["test-action"]);
  });

  it("should execute an action with validation", async () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const result = await manager.executeAction("with-actions", "test-action", { id: "123" });

    expect(result.success).toBe(true);
    expect(result.data.receivedId).toBe("123");
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.action.started", expect.any(Object));
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.action.success", expect.any(Object));
  });

  it("should throw error if action parameters are invalid", async () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    
    await expect(manager.executeAction("with-actions", "test-action", { id: 123 }))
      .rejects.toThrow("Invalid action parameters");
    
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.action.error", expect.any(Object));
  });

  it("should throw error if view not found", async () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    
    await expect(manager.render("unknown"))
      .rejects.toThrow("View not found");
  });

  it("should throw error if view has no getData", async () => {
    const badViews: IgniterCollectionViewDefinition[] = [
      {
        name: "bad",
        title: "Bad View",
        tree: [],
      } as any
    ];
    const manager = new IgniterCollectionViewManager({ views: badViews, manager: mockManager });
    
    await expect(manager.render("bad"))
      .rejects.toThrow("missing required getData hook");
  });
});
