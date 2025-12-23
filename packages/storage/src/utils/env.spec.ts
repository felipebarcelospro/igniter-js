import { describe, expect, it } from "vitest";
import { IgniterStorageEnv } from "./env";

describe("IgniterStorageEnv", () => {
  it("should read environment variables correctly", () => {
    const env = {
      IGNITER_STORAGE_ADAPTER: "s3",
      IGNITER_STORAGE_URL: "https://env.com",
      IGNITER_STORAGE_MAX_FILE_SIZE: "1024",
      IGNITER_STORAGE_ALLOWED_EXTENSIONS: "jpg,png",
      // Needed for NodeJS.ProcessEnv compatibility in testing environments
      NODE_ENV: "test",
    };

    const config = IgniterStorageEnv.read(env as unknown as NodeJS.ProcessEnv);

    expect(config.adapter).toBe("s3");
    expect(config.url).toBe("https://env.com");
    expect(config.policies?.maxFileSize).toBe(1024);
    expect(config.policies?.allowedExtensions).toEqual(["jpg", "png"]);
  });
});
