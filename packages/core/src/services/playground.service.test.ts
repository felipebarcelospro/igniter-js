import { describe, expect, it } from "vitest";
import { initializeIgniterPlayground } from "./playground.service";
import type { DocsConfig } from "../types";

describe("initializeIgniterPlayground", () => {
  it("serves OpenAPI JSON", async () => {
    const docs: DocsConfig = {
      openapi: { openapi: "3.0.0" },
      info: { title: "Test", version: "1.0.0" },
    };

    const playground = initializeIgniterPlayground(docs, "/api");
    const response = await playground.process(
      new Request("http://localhost/api/docs/openapi.json"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/json",
    );
    await expect(response.json()).resolves.toEqual({ openapi: "3.0.0" });
  });

  it("serves HTML for the playground UI", async () => {
    const docs: DocsConfig = {
      openapi: { openapi: "3.0.0" },
      info: { title: "Test", version: "1.0.0" },
    };

    const playground = initializeIgniterPlayground(docs, "/api");
    const response = await playground.process(
      new Request("http://localhost/api/docs"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    await expect(response.text()).resolves.toContain("Igniter Studio");
  });

  it("blocks access in production when security rejects", async () => {
    const previousEnv = process.env.NODE_ENV;

    // @ts-expect-error - testing internal property
    process.env.NODE_ENV = "production";

    const docs: DocsConfig = {
      openapi: { openapi: "3.0.0" },
      info: { title: "Test", version: "1.0.0" },
      playground: {
        security: () => false,
      },
    };

    const playground = initializeIgniterPlayground(docs, "/api");
    const response = await playground.process(
      new Request("http://localhost/api/docs"),
    );

    expect(response.status).toBe(403);

    // @ts-expect-error - testing internal property
    process.env.NODE_ENV = previousEnv;
  });
});
