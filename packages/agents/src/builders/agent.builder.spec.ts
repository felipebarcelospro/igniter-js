import { describe, expect, it } from "vitest";
import { z } from "zod";
import { IgniterAgent } from "./agent.builder";
import { IgniterAgentToolset } from "./toolset.builder";
import { IgniterAgentTool } from "./tool.builder";
import { IgniterAgentPrompt } from "./prompt.builder";

const createToolset = () =>
  IgniterAgentToolset.create("utils")
    .addTool(
      IgniterAgentTool.create("echo")
        .withDescription("Echo")
        .withInput(z.object({ message: z.string() }))
        .withExecute(async ({ message }) => message)
        .build(),
    )
    .build();

describe("IgniterAgentBuilder", () => {
  it("builds an agent with configured pieces", () => {
    const prompt = IgniterAgentPrompt.create("Hello {{user}}!");
    const toolset = createToolset();
    const model = { provider: "test" } as unknown;

    const agent = IgniterAgent.create("assistant")
      .withModel(model as any)
      .withPrompt(prompt)
      .withContextSchema(z.object({ user: z.string() }))
      .addToolset(toolset)
      .build();

    expect(agent.getName()).toBe("assistant");
    expect(agent.getModel()).toBe(model);
    expect(Object.keys(agent.getToolsets())).toEqual(["utils"]);
    expect(agent.getInstructions().build({ user: "Ada" })).toBe("Hello Ada!");
  });
});
