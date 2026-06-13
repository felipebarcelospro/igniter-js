import { describe, it, expect, vi, beforeEach } from "vitest";
import { IgniterCollectionModelManager } from "../core/model";
import { NodeFsAdapter } from "../adapters/node-fs.adapter";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdir, writeFile, rm } from "node:fs/promises";

describe("IgniterCollectionModelManager - Multi-Pattern", () => {
  const basePath = join(tmpdir(), "igniter-test-" + Math.random().toString(36).slice(2));
  const adapter = new NodeFsAdapter();

  beforeEach(async () => {
    await rm(basePath, { recursive: true, force: true });
    await mkdir(basePath, { recursive: true });
  });

  const createModel = (patterns: string[]): IgniterCollectionModelManager<{
    title: string;
    agent?: string;
    content: any;
  }> => {
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
        name: "test",
        patterns: patterns.map(p => "content/" + p),
        defaultIdGenerator: () => "id-123",
        hooks: {},
        subCollections: new Map(),
      } as any,
    });
  };

  it("should find documents across multiple patterns and extract variables", async () => {
    const model = createModel([
      "memories/{id}.md",
      "agents/{agent}/{id}.md"
    ]);

    const contentDir = join(basePath, "content");
    await mkdir(join(contentDir, "memories"), { recursive: true });
    await mkdir(join(contentDir, "agents", "lia"), { recursive: true });

    await writeFile(join(contentDir, "memories", "m1.md"), "---\ntitle: M1\n---\nContent 1");
    await writeFile(join(contentDir, "agents", "lia", "a1.md"), "---\ntitle: A1\n---\nContent 2");

    const docs = await model.findMany();

    expect(docs).toHaveLength(2);

    const m1 = docs.find(d => d.id === "m1");
    expect(m1?.title).toBe("M1");

    const a1 = docs.find(d => d.id === "a1");
    expect(a1?.title).toBe("A1");
    expect(a1?.agent).toBe("lia");
  });

  it("should create document in the best matching pattern", async () => {
    const model = createModel([
      "memories/{id}.md",
      "agents/{agent}/{id}.md"
    ]);

    // Create with agent -> should go to agents/lia/
    const doc = await model.create({
      id: "new-agent-doc",
      data: {
        agent: "lia",
        title: "Lia Memory",
        content: "Search text"
      },
    });

    expect(doc.path).toContain("agents/lia/new-agent-doc.md");

    const exists = await adapter.exists(doc.path!);
    expect(exists).toBe(true);
  });

});
