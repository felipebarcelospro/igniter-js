import { describe, test, expect, vi, beforeEach } from "vitest";
import { MiddlewareExecutorProcessor } from "../middleware-executor.processor";
import { IgniterResponseProcessor } from "../response.processor";
import { IgniterCookie } from "../../services/cookie.service";
import type {
  ProcessedContext,
  ProcessedRequest,
} from "../context-builder.processor";
import type { IgniterProcedure } from "../../types/procedure.interface";

// Mock logger for testing
const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock IgniterCookie
const createMockCookie = (): IgniterCookie => {
  const mockHeaders = new Headers();
  const cookie = new IgniterCookie(mockHeaders);
  vi.spyOn(cookie, "get").mockReturnValue("test-value");
  return cookie;
};

// Mock ProcessedRequest factory
const createMockProcessedRequest = (
  overrides: Partial<ProcessedRequest> = {},
): ProcessedRequest => ({
  url: "http://localhost:3000/api/test",
  method: "POST",
  path: "/api/test",
  params: { id: "123" },
  headers: new Headers({
    "content-type": "application/json",
    authorization: "Bearer token123",
    cookie: "auth-token=jwt123; session=abc",
  }),
  cookies: createMockCookie(),
  body: { test: "data" },
  query: { filter: "active" },
  // Add all required Request properties
  cache: "default",
  credentials: "same-origin",
  destination: "",
  integrity: "",
  keepalive: false,
  mode: "cors",
  redirect: "follow",
  referrer: "",
  referrerPolicy: "",
  signal: new AbortController().signal,
  arrayBuffer: vi.fn(),
  blob: vi.fn(),
  clone: vi.fn(),
  formData: vi.fn(),
  json: vi.fn(),
  text: vi.fn(),
  bytes: vi.fn(),
  bodyUsed: false,
  ...overrides,
});

// Mock ProcessedContext factory
const createMockContext = (
  overrides: Partial<ProcessedContext> = {},
): ProcessedContext => ({
  request: createMockProcessedRequest(),
  response: new IgniterResponseProcessor(),
  $context: {
    db: { user: { findUnique: vi.fn() } },
    logger: mockLogger,
  },
  $plugins: {
    store: { get: vi.fn(), set: vi.fn() },
    logger: mockLogger,
  },
  ...overrides,
});

// Mock procedures for testing
const createMockProcedure = (
  name: string,
  handler: IgniterProcedure<unknown, unknown, unknown>["handler"],
  options: Partial<IgniterProcedure<unknown, unknown, unknown>> = {},
): IgniterProcedure<unknown, unknown, unknown> => ({
  name,
  handler,
  ...options,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Replace logger in MiddlewareExecutorProcessor with our mock
  MiddlewareExecutorProcessor["logger"] = mockLogger as any;
});

describe("MiddlewareExecutorProcessor", () => {
  describe("buildProcedureContext", () => {
    test("should build correct procedure context from ProcessedContext", () => {
      const context = createMockContext();

      // Use reflection to access private method for testing
      const buildProcedureContext = (MiddlewareExecutorProcessor as any)
        .buildProcedureContext;
      const procedureContext = buildProcedureContext(context);

      expect(procedureContext).toEqual({
        request: {
          path: "/api/test",
          params: { id: "123" },
          body: { test: "data" },
          query: { filter: "active" },
          method: "POST",
          headers: expect.any(Headers),
          cookies: expect.any(IgniterCookie),
        },
        context: context.$context,
        response: expect.any(IgniterResponseProcessor),
        next: expect.any(Function),
      });
    });

    test("should create fallback cookies when missing", () => {
      const context = createMockContext({
        request: createMockProcessedRequest({ cookies: undefined as any }),
      });

      const buildProcedureContext = (MiddlewareExecutorProcessor as any)
        .buildProcedureContext;
      const procedureContext = buildProcedureContext(context);

      expect(procedureContext.request.cookies).toBeDefined();
      expect(procedureContext.request.cookies).toBeInstanceOf(IgniterCookie);
    });

    test("should handle missing request gracefully", () => {
      const context = createMockContext({ request: undefined as any });

      const buildProcedureContext = (MiddlewareExecutorProcessor as any)
        .buildProcedureContext;

      expect(() => buildProcedureContext(context)).toThrow(
        "Request is missing from processed context",
      );
    });

    test("should provide fallback values for missing request properties", () => {
      const context = createMockContext({
        request: createMockProcessedRequest({
          path: undefined as any,
          params: undefined as any,
          body: undefined as any,
          query: undefined as any,
          headers: undefined as any,
        }),
      });

      const buildProcedureContext = (MiddlewareExecutorProcessor as any)
        .buildProcedureContext;
      const procedureContext = buildProcedureContext(context);

      expect(procedureContext.request.path).toBe("");
      expect(procedureContext.request.params).toEqual({});
      expect(procedureContext.request.body).toBe(null);
      expect(procedureContext.request.query).toEqual({});
      expect(procedureContext.request.headers).toEqual(new Headers());
    });

    test("should return context with all required properties", () => {
      const context = createMockContext();

      const buildProcedureContext = (MiddlewareExecutorProcessor as any)
        .buildProcedureContext;
      const procedureContext = buildProcedureContext(context);

      expect(procedureContext.request).toBeDefined();
      expect(procedureContext.context).toBeDefined();
      expect(procedureContext.response).toBeDefined();
      expect(procedureContext.request.cookies).toBeDefined();
      expect(procedureContext.request.path).toBe("/api/test");
      expect(procedureContext.request.method).toBe("POST");
    });
  });

  describe("executeGlobal", () => {
    test("should execute global middlewares with correct context", async () => {
      const context = createMockContext();
      const procedureHandler = vi
        .fn()
        .mockResolvedValue({ userId: "123", role: "admin" });

      const middleware = createMockProcedure("auth", procedureHandler);

      const result = await MiddlewareExecutorProcessor.executeGlobal(context, [
        middleware,
      ]);

      expect(result.success).toBe(true);
      expect(procedureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            path: "/api/test",
            method: "POST",
            cookies: expect.any(IgniterCookie),
          }),
          context: context.$context,
          response: expect.any(IgniterResponseProcessor),
        }),
      );
    });

    test("should merge procedure results into context", async () => {
      const context = createMockContext();
      const procedureHandler = vi
        .fn()
        .mockResolvedValue({ user: { id: "123", email: "test@test.com" } });

      const middleware = createMockProcedure("auth", procedureHandler);

      const result = await MiddlewareExecutorProcessor.executeGlobal(context, [
        middleware,
      ]);

      expect(result.success).toBe(true);
      expect(result.updatedContext.$context).toEqual(
        expect.objectContaining({
          ...context.$context,
          user: { id: "123", email: "test@test.com" },
        }),
      );
    });

    test("should handle early return with Response", async () => {
      const context = createMockContext();
      const response = new Response("Unauthorized", { status: 401 });
      const procedureHandler = vi.fn().mockResolvedValue(response);

      const middleware = createMockProcedure("auth", procedureHandler);

      const result = await MiddlewareExecutorProcessor.executeGlobal(context, [
        middleware,
      ]);

      expect(result.success).toBe(false);
      expect(result.earlyReturn).toBe(response);
    });

    test("should handle early return with ResponseProcessor", async () => {
      const context = createMockContext();
      const responseProcessor = new IgniterResponseProcessor().unauthorized(
        "Access denied",
      );
      const procedureHandler = vi.fn().mockResolvedValue(responseProcessor);

      const middleware = createMockProcedure("auth", procedureHandler);

      const result = await MiddlewareExecutorProcessor.executeGlobal(context, [
        middleware,
      ]);

      expect(result.success).toBe(false);
      expect(result.earlyReturn).toBeInstanceOf(Response);
    });

    test("should execute multiple middlewares in sequence", async () => {
      const context = createMockContext();

      const authHandler = vi.fn().mockResolvedValue({ user: { id: "123" } });
      const logHandler = vi.fn().mockResolvedValue({ requestId: "req-456" });

      const authMiddleware = createMockProcedure("auth", authHandler);
      const logMiddleware = createMockProcedure("logger", logHandler);

      const result = await MiddlewareExecutorProcessor.executeGlobal(context, [
        authMiddleware,
        logMiddleware,
      ]);

      expect(result.success).toBe(true);
      expect(authHandler).toHaveBeenCalled();
      expect(logHandler).toHaveBeenCalled();

      // Should merge results from both middlewares
      expect(result.updatedContext.$context).toEqual(
        expect.objectContaining({
          ...context.$context,
          user: { id: "123" },
          requestId: "req-456",
        }),
      );
    });

    test("should protect core providers from being overwritten", async () => {
      const context = createMockContext();
      const procedureHandler = vi.fn().mockResolvedValue({
        store: { malicious: "override" },
        logger: { malicious: "override" },
        user: { id: "123" },
      });

      const middleware = createMockProcedure("malicious", procedureHandler);

      const result = await MiddlewareExecutorProcessor.executeGlobal(context, [
        middleware,
      ]);

      expect(result.success).toBe(true);
      expect(result.updatedContext.$context.user).toEqual({ id: "123" });
      expect(result.updatedContext.$context.store).toEqual(
        context.$context.store,
      ); // Original preserved
      expect(result.updatedContext.$context.logger).toEqual(
        context.$context.logger,
      ); // Original preserved

      // Protected keys are blocked silently (logging removed for testing simplicity)
    });

    test("should skip middleware with invalid handler", async () => {
      const context = createMockContext();
      const validHandler = vi.fn().mockResolvedValue({ user: { id: "1" } });

      const invalidMiddleware = createMockProcedure(
        "invalid",
        undefined as any,
      );
      const validMiddleware = createMockProcedure("valid", validHandler);

      const result = await MiddlewareExecutorProcessor.executeGlobal(context, [
        invalidMiddleware,
        validMiddleware,
      ]);

      expect(result.success).toBe(true);
      // Logger is now optional, so we just verify the valid handler was called
      expect(validHandler).toHaveBeenCalled();
    });

    test("should handle middleware errors", async () => {
      const context = createMockContext();
      const error = new Error("Middleware failed");
      const procedureHandler = vi.fn().mockRejectedValue(error);

      const middleware = createMockProcedure("failing", procedureHandler);

      await expect(
        MiddlewareExecutorProcessor.executeGlobal(context, [middleware]),
      ).rejects.toThrow("Middleware failed");

      // Logger is now optional, error is still thrown correctly
    });

    test("should handle non-object procedure results", async () => {
      const context = createMockContext();
      const procedureHandler = vi.fn().mockResolvedValue("string result");

      const middleware = createMockProcedure("string-result", procedureHandler);

      const result = await MiddlewareExecutorProcessor.executeGlobal(context, [
        middleware,
      ]);

      expect(result.success).toBe(true);
      expect(result.updatedContext.$context).toEqual(context.$context); // No changes
    });

    test("should handle null/undefined procedure results", async () => {
      const context = createMockContext();
      const procedureHandler = vi.fn().mockResolvedValue(null);

      const middleware = createMockProcedure("null-result", procedureHandler);

      const result = await MiddlewareExecutorProcessor.executeGlobal(context, [
        middleware,
      ]);

      expect(result.success).toBe(true);
      expect(result.updatedContext.$context).toEqual(context.$context); // No changes
    });
  });

  describe("executeAction", () => {
    test("should execute action middlewares with correct context", async () => {
      const context = createMockContext();
      const procedureHandler = vi.fn().mockResolvedValue({ validated: true });

      const middleware = createMockProcedure("validation", procedureHandler);

      const result = await MiddlewareExecutorProcessor.executeAction(context, [
        middleware,
      ]);

      expect(result.success).toBe(true);
      expect(procedureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            path: "/api/test",
            method: "POST",
            cookies: expect.any(IgniterCookie),
          }),
          context: context.$context,
          response: expect.any(IgniterResponseProcessor),
        }),
      );
    });

    test("should merge action procedure results into context", async () => {
      const context = createMockContext();
      const procedureHandler = vi.fn().mockResolvedValue({
        validation: { passed: true, rules: ["required"] },
      });

      const middleware = createMockProcedure("validation", procedureHandler);

      const result = await MiddlewareExecutorProcessor.executeAction(context, [
        middleware,
      ]);

      expect(result.success).toBe(true);
      expect(result.updatedContext.$context).toEqual(
        expect.objectContaining({
          ...context.$context,
          validation: { passed: true, rules: ["required"] },
        }),
      );
    });

    test("should work with enhanced procedure API (options + context destructuring)", async () => {
      const context = createMockContext();

      // Simulate enhanced procedure that expects destructured context
      const enhancedHandler = vi.fn().mockImplementation((ctx) => {
        // Enhanced procedures expect destructured context
        expect(ctx.request).toBeDefined();
        expect(ctx.request.cookies).toBeDefined();
        expect(ctx.context).toBeDefined();
        expect(ctx.response).toBeDefined();

        return Promise.resolve({
          enhanced: true,
          requestPath: ctx.request.path,
        });
      });

      const middleware = createMockProcedure("enhanced", enhancedHandler);

      const result = await MiddlewareExecutorProcessor.executeAction(context, [
        middleware,
      ]);

      expect(result.success).toBe(true);
      expect(enhancedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            cookies: expect.any(IgniterCookie),
            path: "/api/test",
          }),
          context: context.$context,
          response: expect.any(IgniterResponseProcessor),
        }),
      );

      expect(result.updatedContext.$context).toEqual(
        expect.objectContaining({
          enhanced: true,
          requestPath: "/api/test",
        }),
      );
    });

    test("should work with legacy procedure API", async () => {
      const context = createMockContext();

      // Simulate legacy procedure that expects ctx format
      const legacyHandler = vi.fn().mockImplementation((ctx) => {
        // Legacy procedures expect full context structure
        expect(ctx.request).toBeDefined();
        expect(ctx.context).toBeDefined();
        expect(ctx.response).toBeDefined();

        // Test the specific cookies access that was failing
        const token = ctx.request.cookies.get("auth-token");

        return Promise.resolve({ legacy: true, token });
      });

      const middleware = createMockProcedure("legacy", legacyHandler);

      const result = await MiddlewareExecutorProcessor.executeAction(context, [
        middleware,
      ]);

      expect(result.success).toBe(true);
      expect(legacyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            cookies: expect.any(IgniterCookie),
          }),
          context: context.$context,
          response: expect.any(IgniterResponseProcessor),
        }),
      );
    });
  });

  describe("mergeContextSafely", () => {
    test("should merge safe properties and block protected ones", () => {
      const context = createMockContext();
      const result = {
        user: { id: "123" },
        store: { malicious: "override" },
        session: { token: "abc" },
      };

      const mergeContextSafely = (MiddlewareExecutorProcessor as any)
        .mergeContextSafely;
      const updatedContext = mergeContextSafely(
        context,
        result,
        "test-middleware",
      );

      expect(updatedContext.$context.user).toEqual({ id: "123" });
      expect(updatedContext.$context.session).toEqual({ token: "abc" });
      expect(updatedContext.$context.store).toEqual(context.$context.store); // Original preserved - protected key blocked
    });
  });

  describe("Integration Tests", () => {
    test("should replicate the authProcedure scenario that was failing", async () => {
      // Simulate the exact scenario from authProcedure
      const context = createMockContext({
        request: createMockProcessedRequest({
          headers: new Headers({
            cookie: "auth-token=jwt123; session=abc",
          }),
        }),
        $context: {
          db: {
            user: {
              findUnique: vi.fn().mockResolvedValue({
                id: "user123",
                email: "test@test.com",
                role: "admin",
              }),
            },
          },
        },
      });

      // Simulate authProcedure handler
      const authHandler = vi.fn().mockImplementation(async (ctx) => {
        // This is the line that was failing: ctx.request.cookies.get('auth-token')
        const token = ctx.request.cookies.get("auth-token");
        expect(token).toBe("test-value"); // Our mock returns 'test-value'

        if (!token) {
          return ctx.response.unauthorized("Authentication token required");
        }

        // Simulate JWT verification and user lookup
        const decoded = { userId: "user123", email: "test@test.com" };
        const user = await ctx.context.db.user.findUnique({
          where: { id: decoded.userId },
        });

        return { user: { id: user.id, email: user.email, role: user.role } };
      });

      const authMiddleware = createMockProcedure("authentication", authHandler);

      const result = await MiddlewareExecutorProcessor.executeAction(context, [
        authMiddleware,
      ]);

      expect(result.success).toBe(true);
      expect(result.updatedContext.$context.user).toEqual({
        id: "user123",
        email: "test@test.com",
        role: "admin",
      });

      // Verify no errors were thrown
      expect(authHandler).toHaveBeenCalled();
      expect(context.$context.db.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user123" },
      });
    });
  });
});
