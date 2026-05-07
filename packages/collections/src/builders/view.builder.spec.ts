import { describe, it, expect } from "vitest";
import { IgniterCollectionViewBuilder, IgniterCollectionView } from "./view.builder";

describe("IgniterCollectionViewBuilder", () => {
  const getData = async ({ manager }: any) => ({ posts: [] });

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
      .withMetadata({ icon: "chart", order: 1 })
      .withData(getData)
      .withTree([{ component: "Metric" }])
      .build();

    expect(view.name).toBe("dashboard");
    expect(view.title).toBe("Analytics Dashboard");
    expect(view.description).toBe("Overview");
    expect(view.metadata).toEqual({ icon: "chart", order: 1 });
    expect(view.tree).toHaveLength(1);
  });

  it("should merge metadata across multiple withMetadata calls", () => {
    const view = IgniterCollectionViewBuilder.create("dashboard")
      .withData(getData)
      .withMetadata({ icon: "chart" })
      .withMetadata({ order: 1, color: "blue" })
      .build();

    expect(view.metadata).toEqual({ icon: "chart", order: 1, color: "blue" });
  });

  it("should accumulate actions", () => {
    const view = IgniterCollectionViewBuilder.create("dashboard")
      .withData(getData)
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
      .withData(getData)
      .build();

    expect(view.title).toBe("dashboard");
  });

  it("should work with IgniterCollectionView alias", () => {
    const view = IgniterCollectionView.create("dashboard")
      .withData(getData)
      .build();

    expect(view.name).toBe("dashboard");
  });
});
