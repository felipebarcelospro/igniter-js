import { describe, expect, it } from "vitest";
import { isClientEnvironment, isServerEnvironment } from "./envronment";

describe("environment utilities", () => {
  it("detects server environment when window is undefined", () => {
    const previousWindow = (globalThis as any).window;
    (globalThis as any).window = undefined;

    expect(isServerEnvironment()).toBe(true);
    expect(isClientEnvironment()).toBe(false);

    (globalThis as any).window = previousWindow;
  });

  it("detects client environment when window is defined", () => {
    const previousWindow = (globalThis as any).window;
    (globalThis as any).window = {};

    expect(isClientEnvironment()).toBe(true);
    expect(isServerEnvironment()).toBe(false);

    (globalThis as any).window = previousWindow;
  });
});
