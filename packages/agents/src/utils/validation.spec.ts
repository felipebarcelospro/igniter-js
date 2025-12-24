import { describe, expect, it } from "vitest";
import { IgniterAgentValidationUtils } from "./validation";

describe("IgniterAgentValidationUtils", () => {
  it("checks defined values", () => {
    expect(IgniterAgentValidationUtils.isDefined(0)).toBe(true);
    expect(IgniterAgentValidationUtils.isDefined("")).toBe(true);
    expect(IgniterAgentValidationUtils.isDefined(null)).toBe(false);
    expect(IgniterAgentValidationUtils.isDefined(undefined)).toBe(false);
  });

  it("checks non-empty strings", () => {
    expect(IgniterAgentValidationUtils.isNonEmptyString("hello")).toBe(true);
    expect(IgniterAgentValidationUtils.isNonEmptyString("")).toBe(false);
    expect(IgniterAgentValidationUtils.isNonEmptyString(123)).toBe(false);
  });

  it("checks plain objects", () => {
    expect(IgniterAgentValidationUtils.isPlainObject({})).toBe(true);
    expect(IgniterAgentValidationUtils.isPlainObject([])).toBe(false);
    expect(IgniterAgentValidationUtils.isPlainObject(null)).toBe(false);
  });
});
