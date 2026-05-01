import { describe, expect, it } from "vitest";
import * as plugins from "./index";

describe("plugins index", () => {
  it("exports built-in plugins", () => {
    expect(plugins).toBeDefined();
  });
});
