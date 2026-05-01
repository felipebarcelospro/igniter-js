import { describe, expect, it } from "vitest";
import { IgniterAgentPromptBuilder } from "./prompt.builder";
import type { IgniterAgentPromptTemplate } from "../types/prompt";

describe("IgniterAgentPromptBuilder", () => {
  it("renders template placeholders", () => {
    const prompt = IgniterAgentPromptBuilder.create("Hello {{user.name}}!");
    const result = prompt.build({ user: { name: "Ada" } });

    expect(result).toBe("Hello Ada!");
    expect(prompt.getTemplate()).toBe("Hello {{user.name}}!");
  });

  it("appends templates without mutating the original instance", () => {
    const prompt = IgniterAgentPromptBuilder.create("Hello {{user}}!");
    const updated = prompt.addAppended("memory", "Memory: {{memory}}");

    expect(prompt.build({ user: "Ada", memory: "x" })).toBe("Hello Ada!");
    expect(updated.build({ user: "Ada", memory: "x" })).toBe(
      "Hello Ada!\n\nMemory: x",
    );
  });

  it("accepts custom prompt templates when appending", () => {
    const customTemplate: IgniterAgentPromptTemplate<{ name: string }> = {
      build: (context) => `Custom ${context.name}`,
      addAppended: () => customTemplate,
      removeAppended: () => customTemplate,
      getAppended: () => ({}),
      getTemplate: () => "Custom {{name}}",
    };

    const prompt = IgniterAgentPromptBuilder.create("Base {{name}}")
      .addAppended("custom", customTemplate);

    expect(prompt.build({ name: "Ada" })).toBe("Base Ada\n\nCustom Ada");
  });
});
