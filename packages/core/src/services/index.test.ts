import { describe, expect, it } from "vitest";
import * as services from "./index";

describe("services index", () => {
  it("exports core services", () => {
    expect(services).toBeDefined();
    expect(typeof services.createIgniterRouter).toBe("function");
  });
});
