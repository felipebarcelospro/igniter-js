import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { IgniterStorage, IgniterStorageBuilder } from "./main.builder";
import { MockStorageAdapter } from "../adapters/mock.adapter";
import { IgniterStorageManager } from "../core/manager";
import type { IgniterStorageScopeDefinition } from "src";

describe("IgniterStorageBuilder", () => {
  const mockAdapter = new MockStorageAdapter();
  const BASE_URL = "https://cdn.example.com";

  it("should create a builder instance", () => {
    const builder = IgniterStorageBuilder.create();
    expect(builder).toBeInstanceOf(IgniterStorageBuilder);
  });

  it("should expose IgniterStorage.create()", () => {
    const builder = IgniterStorage.create();
    expect(builder).toBeInstanceOf(IgniterStorageBuilder);
  });

  it("should build a manager with required configuration", () => {
    const storage = IgniterStorageBuilder.create()
      .withAdapter(mockAdapter)
      .withUrl(BASE_URL)
      .build();

    expect(storage).toBeInstanceOf(IgniterStorageManager);
    expect(storage.baseUrl).toBe(BASE_URL);
    expect(storage.adapter).toBe(mockAdapter);
  });

  it("should support chainable configuration", () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      success: vi.fn(),
    };

    const storage = IgniterStorageBuilder.create()
      .withAdapter(mockAdapter)
      .withUrl(BASE_URL)
      .withPath("v1")
      .withLogger(logger as any)
      .withMaxFileSize(1024)
      .withAllowedExtensions(["png", "jpg"])
      .withAllowedMimeTypes(["image/png"])
      .build();

    expect(storage.basePath).toBe("v1");
    expect(storage.logger).toBe(logger);
    expect(storage.policies?.maxFileSize).toBe(1024);
    expect(storage.policies?.allowedExtensions).toContain("png");
  });

  it("should accumulate scopes correctly", () => {
    const storage = IgniterStorageBuilder.create()
      .withAdapter(mockAdapter)
      .withUrl(BASE_URL)
      .addScope("user", "/users/[identifier]")
      .addScope("assets", "/assets")
      .build();

    expect(storage.scopes).toHaveProperty("user");
    expect(storage.scopes).toHaveProperty("assets");
    expect(storage.scopes?.user.path).toBe("/users/[identifier]");
  });

  it("should throw if build is called without baseUrl", () => {
    const builder = IgniterStorageBuilder.create().withAdapter(mockAdapter);
    expect(() => builder.build()).toThrow(/Base URL is required/);
  });

  it("should throw if build is called without adapter", () => {
    const builder = IgniterStorageBuilder.create().withUrl(BASE_URL);
    expect(() => builder.build()).toThrow(/Storage adapter is required/);
  });

  it("should register hooks successfully", async () => {
    const onUploadStarted = vi.fn();

    const storage = IgniterStorageBuilder.create()
      .withAdapter(mockAdapter)
      .withUrl(BASE_URL)
      .onUploadStarted(onUploadStarted)
      .build();

    // @ts-ignore - access internal config for test
    expect(storage.config.hooks.onUploadStarted).toBe(onUploadStarted);
  });

  describe("Type-Safety Inference", () => {
    it("should correctly infer scope arguments for required identifiers", () => {
      const storage = IgniterStorageBuilder.create()
        .addScope("user", "/users/[identifier]")
        .addScope("static", "/static")
        .withUrl(BASE_URL)
        .withAdapter(mockAdapter)
        .build();

      // ✅ These should compile correctly (Runtime check just for completeness)
      const userScope = storage.scope("user", "123");
      const staticScope = storage.scope("static");

      expect(userScope.basePath).toContain("users/123");
      expect(staticScope.basePath).toContain("static");

      expectTypeOf(userScope).toEqualTypeOf<IgniterStorageManager<{
        user: IgniterStorageScopeDefinition<"/users/[identifier]">;
      } & {
        static: IgniterStorageScopeDefinition<"/static">;
      }>>();

      // @ts-expect-error - 'user' requires identifier
      () => storage.scope("user");

      // @ts-expect-error - 'admin' scope doesn't exist
      () => storage.scope("admin", "456");
    });
  });

  describe("Environment Integration", () => {
    it("should support environment variable fallback for URL", () => {
      vi.stubEnv("IGNITER_STORAGE_URL", "https://env.example.com");
      const storage = IgniterStorageBuilder.create()
        .withAdapter(mockAdapter)
        .build();
      expect(storage.baseUrl).toBe("https://env.example.com");
      vi.unstubAllEnvs();
    });

    it("should support environment variable fallback for adapter via factory", () => {
      vi.stubEnv("IGNITER_STORAGE_ADAPTER", "s3");
      vi.stubEnv("IGNITER_STORAGE_S3_BUCKET", "my-bucket");
      vi.stubEnv("IGNITER_STORAGE_URL", BASE_URL);

      const storage = IgniterStorageBuilder.create().build();
      expect(storage.adapter.constructor.name).toBe("IgniterS3StorageAdapter");

      vi.unstubAllEnvs();
    });
  });
});
