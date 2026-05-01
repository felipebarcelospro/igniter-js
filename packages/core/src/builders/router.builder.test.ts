import { describe, expect, it, vi } from "vitest";
import { createRouterBuilder } from "./router.builder";
import { createIgniterController } from "../services/controller.service";
import { createIgniterQuery } from "../services/action.service";

describe("IgniterRouterBuilder Integration", () => {
  const helloAction = createIgniterQuery({
    path: "hello",
    handler: async ({ response }) => response.success({ ok: true }),
  });

  const userController = createIgniterController({
    name: "users",
    path: "users",
    actions: {
      hello: helloAction,
    },
  });

  it("should handle health check", async () => {
    const router = createRouterBuilder()
      .withHealthCheck("/healthz")
      .build();

    const response = await router.handler(
      new Request("http://localhost/api/v1/healthz")
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ok");
  });

  it("should execute global middlewares", async () => {
    const middlewareHandler = vi.fn(async ({ response, next }) => {
      response.setHeader("X-Middleware", "true");
      next();
    });

    const middleware = {
      name: "test-middleware",
      handler: middlewareHandler,
    };

    const router = createRouterBuilder()
      .addController("users", userController)
      .addMiddleware(middleware as any)
      .build();

    const response = await router.handler(
      new Request("http://localhost/api/v1/users/hello")
    );

    expect(middlewareHandler).toHaveBeenCalled();
    expect(response.headers.get("X-Middleware")).toBe("true");
  });

  it("should handle CORS", async () => {
    const router = createRouterBuilder()
      .addController("users", userController)
      .withCors({ origins: "http://example.com" })
      .build();

    // Preflight
    const preflight = await router.handler(
      new Request("http://localhost/api/v1/users/hello", {
        method: "OPTIONS",
        headers: {
          Origin: "http://example.com",
          "Access-Control-Request-Method": "GET",
        },
      })
    );

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com");

    // Actual request
    const response = await router.handler(
      new Request("http://localhost/api/v1/users/hello", {
        headers: { Origin: "http://example.com" },
      })
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com");
  });

  it("should handle lifecycle hooks", async () => {
    const onRequest = vi.fn();
    const onResponse = vi.fn();

    const router = createRouterBuilder()
      .addController("users", userController)
      .onRequest(onRequest)
      .onResponse(onResponse)
      .build();

    await router.handler(new Request("http://localhost/api/v1/users/hello"));

    expect(onRequest).toHaveBeenCalled();
    expect(onResponse).toHaveBeenCalled();
  });

  it("should use custom error handler", async () => {
    const errorHandler = vi.fn(async (error, ctx, req) => {
      return new Response(JSON.stringify({ custom: true }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    });

    const errorAction = createIgniterQuery({
      path: "boom",
      handler: async () => {
        throw new Error("Boom");
      },
    });

    const errorController = createIgniterController({
      name: "errors",
      path: "errors",
      actions: { boom: errorAction },
    });

    const router = createRouterBuilder()
      .addController("errors", errorController)
      .onError(errorHandler)
      .build();

    const response = await router.handler(
      new Request("http://localhost/api/v1/errors/boom")
    );

    expect(errorHandler).toHaveBeenCalled();
    const data = await response.json();
    expect(data.custom).toBe(true);
  });

  it("should handle rate limiting", async () => {
    const router = createRouterBuilder()
      .addController("users", userController)
      .withRateLimit({
        max: 2,
        windowSeconds: 60,
      })
      .build();

    // Request 1
    const res1 = await router.handler(new Request("http://localhost/api/v1/users/hello"));
    expect(res1.status).toBe(200);
    expect(res1.headers.get("X-RateLimit-Remaining")).toBe("1");

    // Request 2
    const res2 = await router.handler(new Request("http://localhost/api/v1/users/hello"));
    expect(res2.status).toBe(200);
    expect(res2.headers.get("X-RateLimit-Remaining")).toBe("0");

    // Request 3 (Limited)
    const res3 = await router.handler(new Request("http://localhost/api/v1/users/hello"));
    expect(res3.status).toBe(429);
    const data = await res3.json();
    expect(data.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});
