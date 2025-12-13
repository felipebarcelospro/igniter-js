import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorHandlerProcessor } from "../error-handler.processor";
import { IgniterError } from "../../error";
import { IgniterResponseProcessor } from "../response.processor";
import { IgniterCookie } from "../../services/cookie.service";
import type {
  ProcessedContext,
  ProcessedRequest,
} from "../context-builder.processor";

// Mock logger for testing
const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock telemetry span
const mockTelemetrySpan = {
  finish: vi.fn(),
  setStatus: vi.fn(),
  setAttribute: vi.fn(),
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
  params: {},
  headers: new Headers({
    "content-type": "application/json",
    "x-request-id": "test-request-id",
  }),
  cookies: createMockCookie(),
  body: { test: "data" },
  query: {},
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
  raw: {} as any,
  ...overrides,
});

// Mock ProcessedContext factory
const createMockContext = (
  overrides: Partial<ProcessedContext> = {},
): ProcessedContext => ({
  request: createMockProcessedRequest(),
  response: new IgniterResponseProcessor(),
  $context: {
    logger: mockLogger,
  },
  $plugins: {},
  ...overrides,
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Replace logger in ErrorHandlerProcessor with our mock (legacy behavior, though we pass it explicitly now too)
  ErrorHandlerProcessor["logger"] = mockLogger as any;
});

describe("ErrorHandlerProcessor", () => {
  describe("normalizeError", () => {
    test("should handle undefined error", () => {
      const result = ErrorHandlerProcessor["normalizeError"](undefined);
      expect(result).toEqual({
        message: "Unknown error occurred",
        code: "UNKNOWN_ERROR",
        stack: expect.any(String),
      });
    });

    test("should handle null error", () => {
      const result = ErrorHandlerProcessor["normalizeError"](null);
      expect(result).toEqual({
        message: "Unknown error occurred",
        code: "UNKNOWN_ERROR",
        stack: expect.any(String),
      });
    });

    test("should handle string error", () => {
      const result = ErrorHandlerProcessor["normalizeError"](
        "Something went wrong",
      );
      expect(result).toEqual({
        message: "Something went wrong",
        code: "GENERIC_ERROR",
        stack: expect.any(String),
      });
    });

    test("should handle Error instance", () => {
      const error = new Error("Test error");
      const result = ErrorHandlerProcessor["normalizeError"](error);
      expect(result).toMatchObject({
        message: "Test error",
        code: "GENERIC_ERROR",
        stack: error.stack,
      });
    });

    test("should handle Error instance with custom properties", () => {
      const error = new Error("Test error") as any;
      error.code = "CUSTOM_CODE";
      error.details = { key: "value" };

      const result = ErrorHandlerProcessor["normalizeError"](error);
      expect(result).toMatchObject({
        message: "Test error",
        code: "CUSTOM_CODE",
        details: { key: "value" },
        stack: error.stack,
      });
    });

    test("should handle plain error object", () => {
      const error = {
        message: "Custom error",
        code: "CUSTOM_ERROR",
        details: { foo: "bar" },
      };

      const result = ErrorHandlerProcessor["normalizeError"](error);
      expect(result).toMatchObject({
        message: "Custom error",
        code: "CUSTOM_ERROR",
        details: { foo: "bar" },
        stack: expect.any(String),
      });
    });

    test("should handle plain object without message", () => {
      const error = { code: "NO_MESSAGE" };
      const result = ErrorHandlerProcessor["normalizeError"](error);
      expect(result).toMatchObject({
        message: "Object-based error",
        code: "NO_MESSAGE",
        details: error,
        stack: expect.any(String),
      });
    });

    test("should handle non-object primitive", () => {
      const result = ErrorHandlerProcessor["normalizeError"](42);
      expect(result).toMatchObject({
        message: "42",
        code: "UNKNOWN_ERROR",
        stack: expect.any(String),
      });
    });
  });

  describe("handleError", () => {
    test("should handle validation error", async () => {
      const validationError = {
        issues: [
          {
            path: ["field"],
            message: "Invalid field",
            code: "invalid_type",
          },
        ],
      };

      const context = createMockContext();
      const result = await ErrorHandlerProcessor.handleError(
        validationError,
        context,
        mockTelemetrySpan as any,
        Date.now(),
        mockLogger as any,
      );

      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toMatchObject({
        message: "Validation Error",
        code: "VALIDATION_ERROR",
        details: expect.any(Array),
      });
    });

    test("should handle IgniterError", async () => {
      const igniterError = new IgniterError({
        message: "Not found",
        code: "NOT_FOUND",
      });

      const context = createMockContext();
      const result = await ErrorHandlerProcessor.handleError(
        igniterError,
        context,
        mockTelemetrySpan as any,
        Date.now(),
        mockLogger as any,
      );

      expect(result.response.status).toBe(500);
      const body = await result.response.json();
      expect(body.error).toMatchObject({
        message: "Not found",
        code: "NOT_FOUND",
      });
    });

    test("should handle generic error", async () => {
      const error = new Error("Something went wrong");
      const context = createMockContext();

      const result = await ErrorHandlerProcessor.handleError(
        error,
        context,
        mockTelemetrySpan as any,
        Date.now(),
        mockLogger as any,
      );

      expect(result.response.status).toBe(500);
      const body = await result.response.json();
      expect(body.error).toMatchObject({
        message: "Something went wrong",
        code: "INTERNAL_SERVER_ERROR",
      });
    });
  });

  describe("handleValidationError", () => {
    test("should format validation error response", async () => {
      const validationError = {
        issues: [
          {
            path: ["user", "email"],
            message: "Invalid email",
            code: "invalid_string",
          },
          {
            path: ["user", "password"],
            message: "Password too short",
            code: "too_small",
          },
        ],
      };

      const context = createMockContext();
      const result = await ErrorHandlerProcessor["handleValidationError"](
        validationError as any,
        context,
        mockTelemetrySpan as any,
        Date.now(),
        mockLogger as any,
      );

      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toEqual({
        message: "Validation Error",
        code: "VALIDATION_ERROR",
        details: [
          {
            path: ["user", "email"],
            message: "Invalid email",
            code: "invalid_string",
          },
          {
            path: ["user", "password"],
            message: "Password too short",
            code: "too_small",
          },
        ],
      });
    });
  });

  describe("handleIgniterError", () => {
    test("should format IgniterError response", async () => {
      const error = new IgniterError({
        message: "Resource not found",
        code: "RESOURCE_NOT_FOUND",
        details: { resourceId: "123" },
      });

      const context = createMockContext();
      const result = await ErrorHandlerProcessor["handleIgniterError"](
        error,
        context,
        mockTelemetrySpan as any,
        Date.now(),
        mockLogger as any,
      );

      expect(result.response.status).toBe(500);
      const body = await result.response.json();
      expect(body.error).toEqual({
        message: "Resource not found",
        code: "RESOURCE_NOT_FOUND",
        details: { resourceId: "123" },
      });
    });
  });

  describe("handleGenericError", () => {
    test("should handle generic error", async () => {
      const error = new Error("Something went wrong");
      const context = createMockContext();

      const result = await ErrorHandlerProcessor["handleGenericError"](
        error,
        context,
        mockTelemetrySpan as any,
        Date.now(),
        mockLogger as any,
      );

      expect(result.response.status).toBe(500);
      const body = await result.response.json();
      expect(body.error).toMatchObject({
        message: "Something went wrong",
        code: "INTERNAL_SERVER_ERROR",
      });
    });

    test("should include details in development", async () => {
      // Use vi.stubEnv to mock NODE_ENV safely
      vi.stubEnv("NODE_ENV", "development");

      const error = new Error("Dev error");
      const context = createMockContext();

      const result = await ErrorHandlerProcessor["handleGenericError"](
        error,
        context,
        mockTelemetrySpan as any,
        Date.now(),
        mockLogger as any,
      );

      const body = await result.response.json();
      expect(body.error.details).toBeDefined();

      vi.unstubAllEnvs();
    });
  });

  describe("handleInitializationError", () => {
    test("should handle initialization error with context", async () => {
      const error = new Error("Initialization failed");
      const context = createMockContext();

      const result = await ErrorHandlerProcessor["handleInitializationError"](
        error,
        context,
        mockTelemetrySpan as any,
        Date.now(),
        mockLogger as any,
      );

      expect(result.response.status).toBe(500);
      const body = await result.response.json();
      expect(body.error).toMatchObject({
        message: "Request initialization failed",
        code: "INITIALIZATION_ERROR",
      });
    });

    test("should handle initialization error without context", async () => {
      const error = new Error("Initialization failed");

      const result = await ErrorHandlerProcessor["handleInitializationError"](
        error,
        null,
        mockTelemetrySpan as any,
        Date.now(),
        mockLogger as any,
      );

      expect(result.response.status).toBe(500);
      const body = await result.response.json();
      expect(body.error.message).toBe("Request initialization failed");
    });
  });

  describe("trackError", () => {
    test("should log error with context", async () => {
      const error = new Error("Tracking test");
      const context = createMockContext();

      await ErrorHandlerProcessor["trackError"](
        context,
        Date.now(),
        500,
        error,
        mockLogger as any,
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Error tracking completed",
        {
          error: expect.objectContaining({
            message: "Tracking test",
            code: "GENERIC_ERROR",
          }),
          statusCode: 500,
          duration_ms: expect.any(Number),
          request: expect.objectContaining({
            path: "/api/test",
            method: "POST",
            header_keys: expect.any(Array),
            has_body: true,
          }),
        },
      );
    });

    test("should handle missing context", async () => {
      const error = new Error("No context");

      await ErrorHandlerProcessor["trackError"](
        null as any,
        Date.now(),
        500,
        error,
        mockLogger as any,
      );

      expect(mockLogger.warn).toHaveBeenCalledWith("Error tracking skipped", {
        reason: "request context missing",
      });
    });
  });
});
