import { describe, expect, it } from "vitest";
import { z } from "zod";

import { IgniterAgentTool, IgniterAgentToolBuilder } from "./tool.builder";
import { IgniterAgentToolsetBuilder } from "./toolset.builder";

describe("IgniterAgentToolBuilder", () => {
  it("builds a named tool definition", () => {
    const tool = IgniterAgentToolBuilder.create("greet")
      .withDescription("Greets a user")
      .withInputSchema(z.object({ name: z.string() }))
      .withExecute(async ({ name }) => { return { greeting: `Hello, ${name}!` }; })
      .build();

    expect(tool.name).toBe("greet");
    expect(tool.description).toBe("Greets a user");
    expect(tool.inputSchema.safeParse({ name: "Ada" }).success).toBe(true);
  });

  it("adds a built tool into a toolset", () => {
    const tool = IgniterAgentTool.create("greet")
      .withDescription("Greets a user")
      .withInputSchema(z.object({ name: z.string() }))
      .withOutputSchema(z.object({ greeting: z.string() }))
      .withExecute(async ({ name }) => ({ greeting: `Hello, ${name}!` }))
      .build();

    const toolset = IgniterAgentToolsetBuilder.create("utils")
      .addTool(tool)
      .build();

    expect(toolset.name).toBe("utils");
    expect(Object.keys(toolset.tools)).toEqual(["greet"]);

    const builtTool = toolset.tools.greet as { inputSchema?: unknown };
    expect(builtTool.inputSchema).toBeDefined();
  });
});
