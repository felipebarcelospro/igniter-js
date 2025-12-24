import { describe, expect, it } from "vitest";
import { z } from "zod";
import { IgniterAgentToolsetBuilder } from "./toolset.builder";
import { IgniterAgentToolBuilder } from "./tool.builder";

describe("IgniterAgentToolsetBuilder", () => {
  it("adds tools built with the tool builder", () => {
    const tool = IgniterAgentToolBuilder.create("echo")
      .withDescription("Echoes input")
      .withInput(z.object({ message: z.string() }))
      .withExecute(async ({ message }) => ({ message }))
      .build();

    const toolset = IgniterAgentToolsetBuilder.create("utils")
      .addTool(tool)
      .build();

    expect(toolset.name).toBe("utils");
    expect(Object.keys(toolset.tools)).toEqual(["echo"]);
  });

  it("renames toolsets", () => {
    const tool = IgniterAgentToolBuilder.create("ping")
      .withDescription("Ping")
      .withInput(z.object({})) 
      .withExecute(async () => "pong")
      .build();

    const toolset = IgniterAgentToolsetBuilder.create("network")
      .addTool(tool)
      .withName("networking")
      .build();

    expect(toolset.name).toBe("networking");
    expect(Object.keys(toolset.tools)).toEqual(["ping"]);
  });
});
