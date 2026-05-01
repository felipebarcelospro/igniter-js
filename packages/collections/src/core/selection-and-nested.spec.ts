import { describe, it, expect, vi, beforeEach } from "vitest";
import { IgniterCollectionModelManager } from "../core/model";
import { NodeFsAdapter } from "../adapters/node-fs.adapter";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdir, writeFile, rm } from "node:fs/promises";

describe("IgniterCollectionModelManager - Nested Search & Field Selection", () => {
  const basePath = join(tmpdir(), "igniter-selection-test-" + Math.random().toString(36).slice(2));
  const adapter = new NodeFsAdapter();

  beforeEach(async () => {
    await rm(basePath, { recursive: true, force: true });
    await mkdir(basePath, { recursive: true });
  });

  const createModel = () => {
    return new IgniterCollectionModelManager<{
      title: string;
      author: {
        name: string;
        details: {
          role: string;
          skills: string[];
        };
      };
      tags: {
        label: string;
        priority: number;
      }[];
    }>({
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
        patterns: ["docs/{id}.md"],
        defaultIdGenerator: () => "id-123",
        hooks: {},
        subCollections: new Map(),
      } as any,
    });
  };

  const setupDocuments = async () => {
    const docsDir = join(basePath, "docs");
    await mkdir(docsDir, { recursive: true });

    // Document with nested objects and arrays in YAML format
    await writeFile(
      join(docsDir, "d1.md"),
      `---
title: Project Alpha
author:
  name: Lia Orchestrator
  details:
    role: Agent
    skills:
      - search
      - coding
tags:
  - label: AI
    priority: 1
  - label: Automation
    priority: 2
---
Content of Alpha`
    );
  };

  describe("Nested Search", () => {
    it("should find document by term in nested object property", async () => {
      await setupDocuments();
      const model = createModel();

      const results = await model.findMany({
        where: {
          search: {
            term: "Orchestrator",
            fields: {
              author: {
                name: {
                  fuzzy: true,
                  weight: 1
                }
              }
            }
          }
        }
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("d1");
    });

    it("should find document using deep search (flattenValue) in complex fields", async () => {
      await setupDocuments();
      const model = createModel();

      // "coding" is deep inside author.details.skills
      const results = await model.findMany({
        where: {
          search: {
            term: "coding",
            fields: {
              author: {
                fuzzy: true,
                weight: 1
              }
            },
            threshold: 0.01
          }
        }
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("d1");
    });

    it("should find document by term inside an array of objects", async () => {
      await setupDocuments();
      const model = createModel();

      const results = await model.findMany({
        where: {
          search: {
            term: "Automation",
            fields: {
              tags: {
                fuzzy: true,
                weight: 1
              }
            },
            threshold: 0.01
          }
        }
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("d1");
    });

    it("should support weighted fields using configuration objects", async () => {
      await setupDocuments();
      const model = createModel();

      // High weight on a field that matches
      const results = await model.findMany({
        where: {
          search: {
            term: "Lia",
            fields: {
              author: {
                name: {
                  fuzzy: true,
                  weight: 50
                }
              }
            }
          }
        }
      });

      expect(results[0]._search!.score).toBeGreaterThan(0.4); // 50/100 = 0.5
    });
  });

  describe("Field Selection (select & exclude)", () => {
    it("should only return selected fields", async () => {
      await setupDocuments();
      const model = createModel();

      const result = await model.findUnique({
        where: { id: "d1" },
        select: {
          id: true,
          author: {
            name: true,
          }
        }
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("d1");

      // Flat access
      expect(result?.author?.name).toBe("Lia Orchestrator");

      // @ts-expect-error - title should be undefined
      expect(result?.title).toBeUndefined();
    });

    it("should support object-based selection", async () => {
      await setupDocuments();
      const model = createModel();

      const result = await model.findUnique({
        where: { id: "d1" },
        select: {
          id: true,
          author: {
            name: true,
          }
        }
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("d1");
      expect(result?.author?.name).toBe("Lia Orchestrator");
      // @ts-expect-error - details should be undefined
      expect(result?.author?.details).toBeUndefined();
      // @ts-expect-error - title should be undefined
      expect(result?.title).toBeUndefined();
    });

    it("should exclude specific fields", async () => {
      await setupDocuments();
      const model = createModel();

      const result = await model.findUnique({
        where: { id: "d1" },
        exclude: {
          content: true,
          author: {
            details: true
          }
        }
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("d1");
      expect(result?.title).toBe("Project Alpha");
      // @ts-expect-error - content should be undefined
      expect(result?.content).toBeUndefined();
      expect(result?.author?.name).toBe("Lia Orchestrator");
      // @ts-expect-error - details should be undefined
      expect(result?.author?.details).toBeUndefined();
    });

    it("should support object-based exclusion", async () => {
      await setupDocuments();
      const model = createModel();

      const result = await model.findUnique({
        where: { id: "d1" },
        exclude: {
          title: true,
          author: {
            details: true
          }
        }
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("d1");
      expect(result?.author?.name).toBe("Lia Orchestrator");
      // @ts-expect-error - details should be undefined
      expect(result?.author?.details).toBeUndefined();
      // @ts-expect-error - title should be undefined
      expect(result?.title).toBeUndefined();
    });

    it("should throw error if both select and exclude are provided", async () => {
      await setupDocuments();
      const model = createModel();

      // @ts-expect-error - select and exclude are mutually exclusive
      await expect(model.findUnique({
        where: { id: "d1" },
        select: {
          author: {
            name: true
          }
        },
        exclude: {
          content: true,
          author: {
            details: true
          }
        }
      })).rejects.toThrow("Cannot use 'select' and 'exclude' at the same time");
    });

    it("should apply selection to multiple results in findMany", async () => {
      await setupDocuments();
      const model = createModel();

      const results = await model.findMany({
        select: {
          id: true,
          title: true
        }
      });

      expect(results).toHaveLength(1);

      console.log(results)
      expect(results[0].id).toBe("d1");
      expect(results[0].title).toBe("Project Alpha");
    });
  });
});
