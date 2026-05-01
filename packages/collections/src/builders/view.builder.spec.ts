import { describe, it, expect } from "vitest";
import { IgniterCollectionViewBuilder, IgniterCollectionView } from "./view.builder";

describe("IgniterCollectionViewBuilder", () => {
  const getData = async ({ manager }: any) => ({ items: [] });

  it("should create a builder with create()", () => {
    const builder = IgniterCollectionViewBuilder.create("dashboard");
    expect(builder).toBeInstanceOf(IgniterCollectionViewBuilder);
  });

  it("should be immutable (withTitle returns new instance)", () => {
    const b1 = IgniterCollectionViewBuilder.create("dashboard");
    const b2 = b1.withTitle("Dashboard");

    expect(b1).not.toBe(b2);
  });

  it("should chain multiple with* methods", () => {
    const view = IgniterCollectionViewBuilder.create("dashboard")
      .withTitle("Analytics Dashboard")
      .withDescription("Overview")
      .withGetData(getData)
      .withTree([{ component: "Metric" }])
      .build();

    expect(view.name).toBe("dashboard");
    expect(view.title).toBe("Analytics Dashboard");
    expect(view.description).toBe("Overview");
    expect(view.tree).toHaveLength(1);
  });

  it("should accumulate transforms", () => {
    const view = IgniterCollectionViewBuilder.create("dashboard")
      .withGetData(getData)
      .withTransform({ type: "group", field: "category" })
      .withTransform({ type: "flatten" })
      .build();

    expect(view.transforms).toHaveLength(2);
    expect(view.transforms![0].type).toBe("group");
    expect(view.transforms![1].type).toBe("flatten");
  });

  it("should accumulate actions", () => {
    const view = IgniterCollectionViewBuilder.create("dashboard")
      .withGetData(getData)
      .addAction("export", {
        description: "Export data",
        handler: async () => ({ success: true }),
      })
      .addAction("delete", {
        description: "Delete data",
        handler: async () => ({ success: true }),
      })
      .build();

    expect(Object.keys(view.actions!)).toHaveLength(2);
    expect(view.actions!).toHaveProperty("export");
    expect(view.actions!).toHaveProperty("delete");
  });

  it("should throw if getData is missing on build", () => {
    expect(() =>
      IgniterCollectionViewBuilder.create("dashboard")
        .withTitle("Dashboard")
        .build()
    ).toThrow("missing required getData hook");
  });

  it("should use name as default title", () => {
    const view = IgniterCollectionViewBuilder.create("dashboard")
      .withGetData(getData)
      .build();

    expect(view.title).toBe("dashboard");
  });

  it("should work with IgniterCollectionView alias", () => {
    const view = IgniterCollectionView.create("dashboard")
      .withGetData(getData)
      .build();

    expect(view.name).toBe("dashboard");
  });
});
