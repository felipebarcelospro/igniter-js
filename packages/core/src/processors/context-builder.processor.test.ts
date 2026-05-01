import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContextBuilderProcessor } from "./context-builder.processor";
import { IgniterCookie } from "../services/cookie.service";
import { IgniterResponseProcessor } from "./response.processor";
import { BodyParserProcessor } from "./body-parser.processor";
import { IgniterPluginManager } from "../services/plugin.service";
import * as geoUtils from "../utils/geo";
import { createTelemetrySpy, validateTelemetryEvents } from "../test/telemetry";

vi.mock("./body-parser.processor", () => ({
  BodyParserProcessor: {
    parse: vi.fn().mockResolvedValue({ data: "mocked-body" }),
  },
}));

vi.mock("../services/cookie.service");
vi.mock("./response.processor");

describe("ContextBuilderProcessor", () => {
  const mockRequest = new Request("http://localhost:3000/api/test?query=value", {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json",
      Cookie: "session=123",
    }),
    body: JSON.stringify({ test: "data" }),
  });

  const mockRouteParams = { id: "123" };
  const mockUrl = new URL("http://localhost:3000/api/test?query=value");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds context with function-based context config", async () => {
    const mockContextFn = vi.fn().mockResolvedValue({ user: { id: 1 } });
    const config = { context: mockContextFn };

    const result = await ContextBuilderProcessor.build(
      config as any,
      mockRequest,
      mockRouteParams,
      mockUrl,
      true,
    );

    expect(result).toEqual(
      expect.objectContaining({
        request: expect.objectContaining({
          path: "/api/test",
          method: "POST",
          params: mockRouteParams,
          query: { query: "value" },
        }),
        response: expect.any(IgniterResponseProcessor),
        $context: { user: { id: 1 } },
        $plugins: {},
      }),
    );
    expect(mockContextFn).toHaveBeenCalled();
  });

  it("builds context with object-based context config", async () => {
    const mockContext = { user: { id: 1 } };
    const config = { context: mockContext };

    const result = await ContextBuilderProcessor.build(
      config as any,
      mockRequest,
      mockRouteParams,
      mockUrl,
      true,
    );

    expect(result.$context).toEqual({ user: { id: 1 } });
    expect(result.$plugins).toEqual({});
  });

  it("parses request components correctly", async () => {
    const result = await ContextBuilderProcessor.build(
      {} as any,
      mockRequest,
      mockRouteParams,
      mockUrl,
      true,
    );

    expect(result.request).toEqual(
      expect.objectContaining({
        path: "/api/test",
        method: "POST",
        params: mockRouteParams,
        headers: expect.any(Headers),
        cookies: expect.any(IgniterCookie),
        body: { data: "mocked-body" },
        query: { query: "value" },
      }),
    );
  });

  it("injects plugin proxies when plugin manager is provided", async () => {
    const mockPluginManager = {
      getAllPluginProxies: vi.fn().mockReturnValue({
        testPlugin: {
          method: vi.fn(),
          context: null,
        },
      }),
      emit: vi.fn(),
    } as unknown as IgniterPluginManager<any>;

    const result = await ContextBuilderProcessor.enhanceWithPlugins(
      {
        request: {} as any,
        response: {} as any,
        $context: {},
        $plugins: {},
      },
      mockPluginManager,
    );

    expect(result.$context.plugins).toBeDefined();
    expect(result.$context.plugins.testPlugin).toBeDefined();
    expect(result.$context.plugins.testPlugin.emit).toBeDefined();
  });

  it("handles plugin proxy injection failure gracefully", async () => {
    const mockPluginManager = {
      getAllPluginProxies: vi.fn().mockImplementation(() => {
        throw new Error("Plugin proxy creation failed");
      }),
      emit: vi.fn(),
    } as unknown as IgniterPluginManager<any>;

    const result = await ContextBuilderProcessor.enhanceWithPlugins(
      {
        request: {} as any,
        response: {} as any,
        $context: {},
        $plugins: {},
      },
      mockPluginManager,
    );

    expect(result.$context).toEqual({});
  });

  it("emits telemetry for context build failures", async () => {
    const { telemetry, events } = createTelemetrySpy();
    const geoSpy = vi
      .spyOn(geoUtils, "resolveGeo")
      .mockRejectedValueOnce(new Error("geo failed"));

    await expect(
      ContextBuilderProcessor.build(
        {} as any,
        mockRequest,
        mockRouteParams,
        mockUrl,
        true,
        undefined,
        telemetry,
      ),
    ).rejects.toThrow("geo failed");

    const names = events.map((event) => event.name);
    expect(names).toEqual(
      expect.arrayContaining(["igniter.core.context.build.error"]),
    );

    const failures = await validateTelemetryEvents(events);
    expect(failures).toEqual([]);

    geoSpy.mockRestore();
  });
});
