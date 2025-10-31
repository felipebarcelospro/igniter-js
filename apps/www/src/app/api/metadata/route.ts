import { liaAgent } from "@/ai/agents/lia";
import { liaTools } from "@/ai/tools";

interface ToolMetadata {
  name: string;
  description: string;
}

interface AgentMetadata {
  name: string;
  description: string;
  tools: string[];
}

interface MetadataResponse {
  agents: AgentMetadata[];
  tools: ToolMetadata[];
}

/**
 * Get tool names from liaTools configuration
 */
function getToolNames(): string[] {
  return Object.keys(liaTools);
}

export async function GET() {
  try {
    const toolNames = getToolNames();

    // Create metadata for Lia agent
    const agents: AgentMetadata[] = [
      {
        name: "lia",
        description: "AI Assistant for Igniter.js documentation and support",
        tools: toolNames,
      },
    ];

    // Create metadata for tools
    const tools: ToolMetadata[] = toolNames.map((toolName) => ({
      name: toolName,
      description: `${toolName} tool from Lia agent`,
    }));

    const response: MetadataResponse = {
      agents,
      tools,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate metadata" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}




