import { describe, expect, it } from "vitest";
import { IgniterAgentPromptBuilder } from "./prompt.builder";

describe("IgniterAgentPromptBuilder", () => {
  it("renders template placeholders", () => {
    const prompt = IgniterAgentPromptBuilder.create("Hello {{user.name}}!");
    const result = prompt.build({ user: { name: "Ada" } });

    expect(result).toBe("Hello Ada!");
    expect(prompt.getTemplate()).toBe("Hello {{user.name}}!");
  });
});
