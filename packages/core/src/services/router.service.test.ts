import { describe, expect, it, vi } from "vitest";
import { createIgniterRouter } from "./router.service";
import { createIgniterController } from "./controller.service";
import { createIgniterQuery } from "./action.service";

const createRouter = (withTelemetry = false, withDocs = false) => {
  const helloAction = createIgniterQuery({
    path: "hello",
    handler: async ({ response }) => response.success({ ok: true }),
  });

  const controller = createIgniterController({
    name: "users",
    path: "users",
    actions: {
      hello: helloAction,
    },
  });

  const telemetryRun = vi.fn(async (fn: () => Promise<Response>) => fn());
  const telemetry = withTelemetry
    ? {
        emit: vi.fn(),
        session: () => ({ run: telemetryRun }),
      }
    : undefined;

  const router = createIgniterRouter({
    context: () => ({}),
    controllers: { users: controller },
    config: {
      baseURL: "http://localhost",
      basePATH: "/api",
    },
    docs: withDocs
      ? { openapi: { openapi: "3.0.0" }, playground: { route: "/docs" } }
      : undefined,
    telemetry: telemetry as any,
  });

  return { router, telemetryRun };
};

describe("createIgniterRouter", () => {
  it("handles HTTP requests with the processor", async () => {
    const { router } = createRouter();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const response = await router.handler(
      new Request("http://localhost/api/users/hello", { method: "GET" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      error: null,
      data: { ok: true },
    });
  });

  it("wraps requests with telemetry sessions when provided", async () => {
    const { router, telemetryRun } = createRouter(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const response = await router.handler(
      new Request("http://localhost/api/users/hello", { method: "GET" }),
    );

    expect(response.status).toBe(200);
    expect(telemetryRun).toHaveBeenCalledTimes(1);
  });

  it("serves the playground when route matches", async () => {
    const { router } = createRouter(false, true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const response = await router.handler(
      new Request("http://localhost/api/docs", { method: "GET" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
  });
});
