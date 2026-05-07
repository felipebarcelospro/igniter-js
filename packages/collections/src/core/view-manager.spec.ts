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
        { component: "Metric", props: { title: "Total" }, valuePath: "/totalCount" }
      ],
      getData: async ({ manager }) => ({
        posts: [{ id: "1", val: 10 }, { id: "2", val: 20 }],
        totalCount: 2
      }),
      metadata: { icon: "chart", order: 1 }
    },
    {
      name: "custom-shape",
      title: "Custom Shape",
      tree: [],
      getData: async ({ manager }) => ({
        title: "Hello",
        items: ["a", "b", "c"]
      })
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

  it("should get a specific view instance", () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const view = manager.get("dashboard");
    expect(view).toBeDefined();
    expect(view?.definition.name).toBe("dashboard");
  });

  it("should include metadata in view definitions", () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const view = manager.get("dashboard");
    expect(view?.definition.metadata).toEqual({ icon: "chart", order: 1 });
  });

  it("should render a view with getData hook", async () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const result = await manager.render("dashboard");

    expect(result.data.posts).toHaveLength(2);
    expect(result.data.totalCount).toBe(2);
    expect(result.renderedAt).toBeDefined();
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.render.started", expect.any(Object));
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.render.success", expect.any(Object));
  });

  it("should pass manager to getData hook", async () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const result = await manager.render("dashboard");

    expect(result.data.posts).toHaveLength(2);
  });

  it("should return custom data shapes from getData", async () => {
    const manager = new IgniterCollectionViewManager({ views, manager: mockManager });
    const result = await manager.render("custom-shape");

    expect(result.data.title).toBe("Hello");
    expect(result.data.items).toEqual(["a", "b", "c"]);
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
