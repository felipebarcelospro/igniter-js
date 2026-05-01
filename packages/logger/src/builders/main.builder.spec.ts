import { describe, expect, expectTypeOf, it } from "vitest";
import { IgniterLogLevel } from "../types/level";
import { IgniterLoggerBuilder, IgniterLogger } from "./main.builder";

const getConfig = (manager: unknown) => (manager as { config: any }).config;

describe("IgniterLoggerBuilder", () => {
  describe("create()", () => {
    it("returns a builder instance", () => {
      const builder = IgniterLoggerBuilder.create();
      expect(builder).toBeInstanceOf(IgniterLoggerBuilder);
    });

    it("exposes IgniterLogger.create()", () => {
      const builder = IgniterLogger.create();
      expect(builder).toBeInstanceOf(IgniterLoggerBuilder);
    });
  });

  describe("immutability", () => {
    it("returns a new instance for each builder method", () => {
      const base = IgniterLoggerBuilder.create();
      const withLevel = base.withLevel(IgniterLogLevel.Info);
      const withAppName = withLevel.withAppName("api");
      const withComponent = withAppName.withComponent("worker");
      const withContext = withComponent.withContext({ region: "us-east" });
      const withTransport = withContext.addTransport({
        target: "console",
        options: { pretty: true },
      });

      expect(base).not.toBe(withLevel);
      expect(withLevel).not.toBe(withAppName);
      expect(withAppName).not.toBe(withComponent);
      expect(withComponent).not.toBe(withContext);
      expect(withContext).not.toBe(withTransport);
    });
  });

  describe("method chaining", () => {
    it("supports chaining and preserves config", () => {
      const logger = IgniterLoggerBuilder.create()
        .withLevel(IgniterLogLevel.Debug)
        .withAppName("api")
        .withComponent("http")
        .withContext({ region: "eu", env: "staging" })
        .addTransport({ target: "console", options: { pretty: false } })
        .build();

      const config = getConfig(logger);
      expect(config.level).toBe(IgniterLogLevel.Debug);
      expect(config.appName).toBe("api");
      expect(config.component).toBe("http");
      expect(config.context).toEqual({ region: "eu", env: "staging" });
      expect(config.transports).toEqual([
        { target: "console", options: { pretty: false } },
      ]);
    });

    it("merges context across calls", () => {
      const logger = IgniterLoggerBuilder.create()
        .withContext({ region: "us-east" })
        .withContext({ traceId: "trace-123" })
        .build();

      const config = getConfig(logger);
      expect(config.context).toEqual({
        region: "us-east",
        traceId: "trace-123",
      });
    });
  });

  describe("default transport", () => {
    it("defaults to console with pretty formatting", () => {
      const logger = IgniterLoggerBuilder.create().build();
      const config = getConfig(logger);

      expect(config.transports).toEqual([
        { target: "console", options: { pretty: true } },
      ]);
    });
  });

  describe("transport accumulation", () => {
    it("appends transports in order", () => {
      const logger = IgniterLoggerBuilder.create()
        .addTransport({ target: "console", options: { pretty: false } })
        .addTransport({ target: "http", options: { url: "https://log" } })
        .build();

      const config = getConfig(logger);
      expect(config.transports).toEqual([
        { target: "console", options: { pretty: false } },
        { target: "http", options: { url: "https://log" } },
      ]);
    });
  });

  describe("defineScopes()", () => {
    it("infers scoped types", () => {
      const builder = IgniterLoggerBuilder.create().defineScopes<{
        tenantId: string;
        workspaceId: string;
      }>();

      expectTypeOf(builder).toEqualTypeOf<
        IgniterLoggerBuilder<{
          tenantId: string;
          workspaceId: string;
        }>
      >();
    });
  });
});
