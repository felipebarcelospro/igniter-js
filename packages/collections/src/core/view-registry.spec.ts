import { describe, it, expect, vi, beforeEach } from "vitest";
import { IgniterCollectionViewRegistry } from "./view-registry";
import { IgniterCollectionMockAdapter } from "../adapters/mock.adapter";
import type { IgniterCollectionViewDefinition } from "../types/view";

describe("IgniterCollectionViewRegistry", () => {
  let mockAdapter: IgniterCollectionMockAdapter;
  let registry: IgniterCollectionViewRegistry;
  const basePath = "/test";

  beforeEach(() => {
    mockAdapter = new IgniterCollectionMockAdapter();
    registry = new IgniterCollectionViewRegistry(
      { registryPath: "/test/views", basePath },
      mockAdapter
    );
  });

  it("should load views from JSON files", async () => {
    const viewData: IgniterCollectionViewDefinition = {
      name: "dashboard",
      title: "Dashboard",
      tree: [],
      getData: "./hooks/dashboard.ts",
    };

    mockAdapter.files.set("/test/views/dashboard.view.json", JSON.stringify(viewData));
    mockAdapter.files.set("/test/views", ""); // directory marker

    const views = await registry.loadViews();

    expect(views.has("dashboard")).toBe(true);
    expect(views.get("dashboard")?.title).toBe("Dashboard");
  });

  it("should resolve getData paths relative to basePath", async () => {
    const viewData: IgniterCollectionViewDefinition = {
      name: "dashboard",
      title: "Dashboard",
      tree: [],
      getData: "./hooks/dashboard.ts",
    };

    mockAdapter.files.set("/test/views/dashboard.view.json", JSON.stringify(viewData));

    await registry.loadViews();
    const view = registry.getView("dashboard");

    expect(view?.getData).toBe("/test/hooks/dashboard.ts");
  });

  it("should detect naming conflicts and auto-prefix", async () => {
    const viewData1 = { name: "dashboard", title: "Dashboard 1", tree: [], getData: "./hooks/d1.ts" };
    const viewData2 = { name: "dashboard", title: "Dashboard 2", tree: [], getData: "./hooks/d2.ts" };

    mockAdapter.files.set("/test/views/admin/dashboard.view.json", JSON.stringify(viewData1));
    mockAdapter.files.set("/test/views/public/dashboard.view.json", JSON.stringify(viewData2));

    const nestedRegistry = new IgniterCollectionViewRegistry(
      { registryPath: "/test/views", basePath, filePattern: "**/*.view.{json,ts}" },
      mockAdapter
    );
    const views = await nestedRegistry.loadViews();

    expect(views.has("admin:dashboard")).toBe(true);
    expect(views.has("public:dashboard")).toBe(true);
    expect(views.has("dashboard")).toBe(false);
  });

  it("should refresh and reload views", async () => {
    const viewData = { name: "dashboard", title: "Dashboard", tree: [], getData: "./hooks/d.ts" };
    mockAdapter.files.set("/test/views/dashboard.view.json", JSON.stringify(viewData));

    await registry.loadViews();
    expect(registry.hasView("dashboard")).toBe(true);

    // Add new view
    const newViewData = { name: "analytics", title: "Analytics", tree: [], getData: "./hooks/a.ts" };
    mockAdapter.files.set("/test/views/analytics.view.json", JSON.stringify(newViewData));

    await registry.refresh();
    expect(registry.hasView("analytics")).toBe(true);
  });

  it("should return empty map when no views found", async () => {
    const views = await registry.loadViews();
    expect(views.size).toBe(0);
  });
});
