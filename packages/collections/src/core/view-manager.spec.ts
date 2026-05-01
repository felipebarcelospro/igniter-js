import { describe, it, expect, vi, beforeEach } from "vitest";
import { IgniterCollectionViewManager } from "./view-manager";
import type { IgniterCollectionViewDefinition } from "../types/view";
import { z } from "zod";

describe("IgniterCollectionViewManager", () => {
  let mockCollection: any;
  let mockTelemetry: any;
  let mockManager: any;

  const views: IgniterCollectionViewDefinition[] = [
    {
      name: "dashboard",
      title: "Dashboard",
      tree: [
        { component: "Metric", props: { title: "Total" }, valuePath: "/stats/count" }
      ],
      stats: {
        count: { type: "count" }
      }
    },
    {
      name: "with-hook",
      title: "With Hook",
      tree: [],
      getData: async ({ items }) => ({
        items: items!.map(i => ({ ...i, hooked: true })),
        stats: { hookStat: 42 }
      })
    },
    {
      name: "with-actions",
      title: "With Actions",
      tree: [],
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
      telemetry: mockTelemetry
    };
    mockCollection = {
      definition: { name: "posts", patterns: ["{id}.mdx"] },
      manager: mockManager,
      telemetry: mockTelemetry,
      findMany: vi.fn().mockResolvedValue([
        { id: "1", data: { val: 10 } },
        { id: "2", data: { val: 20 } }
      ])
    };
  });

  it("should list all views", () => {
    const manager = new IgniterCollectionViewManager({ views, collection: mockCollection });
    expect(manager.list()).toHaveLength(3);
    expect(manager.list()[0].name).toBe("dashboard");
  });

  it("should get a specific view", () => {
    const manager = new IgniterCollectionViewManager({ views, collection: mockCollection });
    const view = manager.get("dashboard");
    expect(view).toBeDefined();
    expect(view?.name).toBe("dashboard");
  });

  it("should render a standard view", async () => {
    const manager = new IgniterCollectionViewManager({ views, collection: mockCollection });
    const result = await manager.render("dashboard");

    expect(result.data.items).toHaveLength(2);
    expect(result.data.stats.count).toBe(2);
    expect(result.renderedAt).toBeDefined();
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.render.started", expect.any(Object));
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.render.success", expect.any(Object));
  });

  it("should render a view with a data hook", async () => {
    const manager = new IgniterCollectionViewManager({ views, collection: mockCollection });
    const result = await manager.render("with-hook");

    expect(result.data.items[0].hooked).toBe(true);
    expect(result.data.stats.hookStat).toBe(42);
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.hook.executed", expect.any(Object));
  });

  it("should list available actions", () => {
    const manager = new IgniterCollectionViewManager({ views, collection: mockCollection });
    const actions = manager.listActions("with-actions");
    expect(actions).toEqual(["test-action"]);
  });

  it("should execute an action with validation", async () => {
    const manager = new IgniterCollectionViewManager({ views, collection: mockCollection });
    const result = await manager.executeAction("with-actions", "test-action", { id: "123" });

    expect(result.success).toBe(true);
    expect(result.data.receivedId).toBe("123");
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.action.started", expect.any(Object));
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.action.success", expect.any(Object));
  });

  it("should throw error if action parameters are invalid", async () => {
    const manager = new IgniterCollectionViewManager({ views, collection: mockCollection });
    
    await expect(manager.executeAction("with-actions", "test-action", { id: 123 }))
      .rejects.toThrow("Invalid action parameters");
    
    expect(mockTelemetry.emit).toHaveBeenCalledWith("igniter.collections.view.action.error", expect.any(Object));
  });

  it("should throw error if view not found", async () => {
    const manager = new IgniterCollectionViewManager({ views, collection: mockCollection });
    
    await expect(manager.render("unknown" as any))
      .rejects.toThrow("View not found");
  });
});
