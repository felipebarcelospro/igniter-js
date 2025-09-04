/**
 * Memory Management Tools - MDX-based knowledge storage and retrieval
 */

import { z } from "zod";
import { MEMORY_TYPES, REL_TYPES } from "../constants";
import { ToolsetContext } from "./types";

function getMemoryTypes() {
  return [
    "code_pattern", 
    "architectural_decision", 
    "user_preference", 
    "insight", 
    "relationship_map", 
    "reflection", 
    "bug_pattern", 
    "performance_insight", 
    "api_mapping", 
    "requirement", 
    "design", 
    "bug_report"
  ] as const;
}

export function registerMemoryTools({ server, memoryManager }: ToolsetContext) {
  // --- Memory Tools ---
  server.registerTool("store_memory", {
    title: "Create Memory",
    description: "ALWAYS use this tool to store something that you want to remember (Except Tasks, for tasks you need to use create_task tool). You can check your memories in the .github/lia/memories/",
    inputSchema: {
      type: z.enum(getMemoryTypes()).optional(),
      title: z.string(),
      content: z.string(),
      category: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
      tags: z.array(z.string()).optional(),
      related_memories: z.array(z.string()).optional(),
    },
  }, async (input: any) => {
    await memoryManager.initializeProject();
    const filePath = await memoryManager.store({
      type: input.type,
      title: input.title,
      content: input.content,
      frontmatter: {
        category: input.category,
        confidence: input.confidence,
        tags: input.tags,
        related_memories: input.related_memories,
      },
    });
    return {
      content: [
        {
          type: "text",
          text: `Memory stored successfully at ${filePath}`,
        },
      ],
    };
  });

  server.registerTool("search_memories", {
    title: "Search Memories",
    description: "Search through stored memories using text, tags, or filters",
    inputSchema: {
      text: z.string().optional(),
      tags: z.array(z.string()).optional(),
      type: z.enum(MEMORY_TYPES).optional(),
      confidence_min: z.number().min(0).max(1).optional(),
      confidence_max: z.number().min(0).max(1).optional(),
      include_sensitive: z.boolean().optional(),
    },
  }, async (input: any) => {
    await memoryManager.initializeProject();
    const results = await memoryManager.searchByContent({
      text: input.text,
      tags: input.tags,
      type: input.type,
      confidence: input.confidence_min || input.confidence_max ? [input.confidence_min || 0, input.confidence_max || 1] : undefined,
      includeSensitive: input.include_sensitive,
    });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  });

  server.registerTool("relate_memories", {
    title: "Relate Memories",
    description: "Create relationships between memories",
    inputSchema: {
      from_type: z.enum(MEMORY_TYPES),
      from_id: z.string(),
      to_type: z.enum(MEMORY_TYPES),
      to_id: z.string(),
      relationship_type: z.enum(REL_TYPES),
      strength: z.number().min(0).max(1).optional(),
      confidence: z.number().min(0).max(1).optional(),
    },
  }, async (input: any) => {
    await memoryManager.initializeProject();
    await memoryManager.addRelationship(
      { type: input.from_type, id: input.from_id },
      { type: input.to_type, id: input.to_id },
      {
        type: input.relationship_type,
        strength: input.strength || 0.8,
        confidence: input.confidence || 0.9,
      }
    );
    
    return {
      content: [
        {
          type: "text",
          text: `Relationship created: ${input.from_id} ${input.relationship_type} ${input.to_id}`,
        },
      ],
    };
  });

  server.registerTool("visualize_memory_graph", {
    title: "Visualize Memory Graph",
    description: "Generate a Mermaid diagram of memory relationships",
    inputSchema: {
      center_type: z.enum(MEMORY_TYPES),
      center_id: z.string(),
      depth: z.number().min(1).max(3).optional(),
    },
  }, async (input: any) => {
    await memoryManager.initializeProject();
    const mermaidGraph = await memoryManager.generateRelationshipGraph(
      { type: input.center_type, id: input.center_id },
      input.depth || 1
    );
    
    return {
      content: [
        {
          type: "text",
          text: `\`\`\`mermaid\n${mermaidGraph}\`\`\``,
        },
      ],
    };
  });

  server.registerTool("reflect_on_memories", {
    title: "Create Reflection on Memories",
    description: "Creates a periodic reflection memory summarizing insights and patterns from recent work.",
    inputSchema: {
      title: z.string().default("Periodic Reflection"),
      content: z.string().optional().describe("Custom reflection content. If not provided, generates automatic summary."),
      tags: z.array(z.string()).default(["reflection", "learning"])
    },
  }, async (input: any) => {
    await memoryManager.initializeProject();
    
    let reflectionContent = input.content;
    
    if (!reflectionContent) {
      // Generate automatic reflection
      const filePath = await memoryManager.createPeriodicReflection();
      return {
        content: [
          {
            type: "text",
            text: `Automatic reflection created at ${filePath}`,
          },
        ],
      };
    }
    
    // Store custom reflection
    const filePath = await memoryManager.store({
      type: 'reflection',
      title: input.title,
      content: reflectionContent,
      frontmatter: {
        tags: input.tags,
        confidence: 0.8,
      },
    });
    
    return {
      content: [
        {
          type: "text",
          text: `Reflection stored at ${filePath}`,
        },
      ],
    };
  });
}
