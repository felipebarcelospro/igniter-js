import { describe, it, expect, vi, beforeEach } from "vitest";
import { IgniterCollectionModelManager } from "../core/model";
import { NodeFsAdapter } from "../adapters/node-fs.adapter";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdir, writeFile, rm } from "node:fs/promises";

describe("IgniterCollectionModelManager - Full-Text Search (FTS)", () => {
  const basePath = join(tmpdir(), "igniter-fts-test-" + Math.random().toString(36).slice(2));
  const adapter = new NodeFsAdapter();

  beforeEach(async () => {
    await rm(basePath, { recursive: true, force: true });
    await mkdir(basePath, { recursive: true });
  });

  const createModel = () => {
    return new IgniterCollectionModelManager({
      basePath,
      adapter,
      manager: {
        emit: vi.fn().mockResolvedValue(undefined),
        telemetry: {
          emit: vi.fn().mockResolvedValue(undefined),
        },
      } as any,
      definition: {
        name: "posts",
        patterns: ["posts/{id}.md"],
        defaultIdGenerator: () => "id-123",
        hooks: {},
        subCollections: new Map(),
      } as any,
    });
  };

  const setupDocuments = async () => {
    const postsDir = join(basePath, "posts");
    await mkdir(postsDir, { recursive: true });

    await writeFile(
      join(postsDir, "p1.md"),
      "---\ntitle: TypeScript Tutorial\ndescription: Learn TypeScript from scratch\ntags: [js, ts, tutorial]\n---\nThis is a comprehensive guide to TypeScript programming."
    );
    await writeFile(
      join(postsDir, "p2.md"),
      "---\ntitle: JavaScript Basics\ndescription: Getting started with JS\ntags: [js, beginner]\n---\nJavaScript is the language of the web."
    );
    await writeFile(
      join(postsDir, "p3.md"),
      "---\ntitle: Advanced Node.js\ndescription: Backend development with Node\ntags: [node, backend]\n---\nLearn how to build scalable backend systems with Node.js."
    );
  };

  it("should find documents by search term in default fields", async () => {
    await setupDocuments();
    const model = createModel();

    const results = await model.findMany({
      where: {
        search: { term: "typescript" }
      }
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("p1");
    expect(results[0]._search?.matches).toContain("title");
    expect(results[0]._search?.matches).toContain("content");
  });

  it("should rank title matches higher than content matches by default", async () => {
    const postsDir = join(basePath, "posts");
    await mkdir(postsDir, { recursive: true });

    // p1 has "node" in title
    await writeFile(
      join(postsDir, "p1.md"),
      "---\ntitle: Node.js Guide\n---\nContent"
    );
    // p2 has "node" only in content
    await writeFile(
      join(postsDir, "p2.md"),
      "---\ntitle: JavaScript\n---\nNode.js is cool"
    );

    const model = createModel();
    const results = await model.findMany({
      where: {
        search: {
          term: "node",
          threshold: 0.01 // Lower threshold to ensure content matches (score 0.01) are included
        }
      }
    });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("p1"); // Title match (weight 10) > Content match (weight 1)
    expect(results[1].id).toBe("p2");
    expect(results[0]._search!.score).toBeGreaterThan(results[1]._search!.score);
  });

  it("should support custom weights in the search query", async () => {
    const postsDir = join(basePath, "posts");
    await mkdir(postsDir, { recursive: true });

    // p1 has "node" in title
    await writeFile(
      join(postsDir, "p1.md"),
      "---\ntitle: Node.js Guide\n---\nContent"
    );
    // p2 has "node" in content
    await writeFile(
      join(postsDir, "p2.md"),
      "---\ntitle: JavaScript\n---\nNode.js is cool"
    );

    const model = createModel();

    // Custom weight: content is 100, title is 1
    // This should invert the natural ranking
    const results = await model.findMany({
      where: {
        search: {
          term: "node",
          threshold: 0.01,
          fields: {
            content: { weight: 100 },
            title: { weight: 1 }
          }
        }
      }
    });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("p2"); // Content match now much heavier
    expect(results[1].id).toBe("p1");
  });

  it("should respect the threshold filter", async () => {
    await setupDocuments();
    const model = createModel();

    // High threshold should exclude weak matches
    const results = await model.findMany({
      where: {
        search: {
          term: "programming", // only in p1 content (weight 1)
          threshold: 1.5 // score will be 1, so it should be excluded by 1.5
        }
      }
    });

    expect(results).toHaveLength(0);

    const lowResults = await model.findMany({
      where: {
        search: {
          term: "programming",
          threshold: 0.01
        }
      }
    });

    expect(lowResults).toHaveLength(1);
    expect(lowResults[0].id).toBe("p1");
  });

  it("should search only in specified fields if provided", async () => {
    await setupDocuments();
    const model = createModel();

    // "Tutorial" is in title and tags of p1
    // If we only search in "description", it should find nothing
    const results = await model.findMany({
      where: {
        search: {
          term: "tutorial",
          fields: {
            description: { weight: 1 }
          }
        }
      }
    });

    expect(results).toHaveLength(0);

    const titleResults = await model.findMany({
      where: {
        search: {
          term: "tutorial",
          fields: {
            title: { weight: 1 }
          }
        }
      }
    });

    expect(titleResults).toHaveLength(1);
    expect(titleResults[0].id).toBe("p1");
  });

  it("should handle multi-term search (OR behavior)", async () => {
    await setupDocuments();
    const model = createModel();

    const results = await model.findMany({
      where: {
        search: {
          term: ["typescript", "beginner"],
          threshold: 0.01
        }
      }
    });

    expect(results).toHaveLength(2);
    expect(results.map(r => r.id)).toContain("p1");
    expect(results.map(r => r.id)).toContain("p2");
  });

  it("should match documents by prefix", async () => {
    const postsDir = join(basePath, "posts");
    await mkdir(postsDir, { recursive: true });

    await writeFile(
      join(postsDir, "p1.md"),
      "---\ntitle: TypeScript Tutorial\n---\nContent"
    );

    const model = createModel();
    const results = await model.findMany({
      where: {
        search: { term: "typ" }
      }
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("p1");
  });

  it("should rank documents with higher term frequency higher", async () => {
    const postsDir = join(basePath, "posts");
    await mkdir(postsDir, { recursive: true });

    // p1: "typescript" appears 1 time
    await writeFile(
      join(postsDir, "p1.md"),
      "---\ntitle: TypeScript Intro\n---\nTypeScript is great."
    );

    // p2: "typescript" appears 5 times
    await writeFile(
      join(postsDir, "p2.md"),
      "---\ntitle: TypeScript Deep Dive\n---\nTypeScript TypeScript TypeScript TypeScript TypeScript."
    );

    const model = createModel();
    const results = await model.findMany({
      where: {
        search: {
          term: "typescript",
          threshold: 0.01
        }
      }
    });

    expect(results).toHaveLength(2);
    // p2 should rank higher due to higher term frequency
    expect(results[0].id).toBe("p2");
    expect(results[0]._search!.score).toBeGreaterThan(results[1]._search!.score);
  });

  it("should calculate higher scores for multi-term matches", async () => {
    await setupDocuments();
    const model = createModel();

    // p1 matches both "typescript" and "tutorial"
    // p3 matches only "node"
    const results = await model.findMany({
      where: {
        search: { term: ["typescript", "tutorial", "node"] }
      }
    });

    const p1 = results.find(r => r.id === "p1");
    const p3 = results.find(r => r.id === "p3");

    expect(p1!._search!.score).toBeGreaterThan(p3!._search!.score);
  });
});
