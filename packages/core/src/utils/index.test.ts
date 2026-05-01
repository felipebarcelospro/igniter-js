import { describe, expect, it } from "vitest";
import * as utils from "./index";

describe("utils index", () => {
  it("exports core utilities", () => {
    expect(utils).toBeDefined();
    expect(typeof utils.parseURL).toBe("function");
  });
});
