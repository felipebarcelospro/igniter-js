import { describe, expect, it } from "vitest";
import * as processors from "./index";

describe("processors index", () => {
  it("exports processor utilities", () => {
    expect(processors).toBeDefined();
    expect(typeof processors.RequestProcessor).toBe("function");
  });
});
