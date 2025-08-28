/**
 * Documentation Tools - External documentation access and parsing
 */

import { z } from "zod";
import axios from "axios";
import { ToolsetContext } from "./types";

export function registerDocumentationTools({ server, turndownService }: ToolsetContext) {
  // --- Documentation Tools ---
  server.registerTool("get_documentation", {
    title: "Get Documentation",
    description: "Fetch and parse documentation from various sources",
    inputSchema: {
      source: z.enum(["igniter", "nextjs", "react", "typescript", "custom"]),
      topic: z.string().describe("Specific topic or page to fetch"),
      url: z.string().optional().describe("Custom URL for documentation (when source is 'custom')"),
    },
  }, async ({ source, topic, url }: { source: string; topic: string; url?: string }) => {
    try {
      let docUrl: string;
      
      switch (source) {
        case "igniter":
          docUrl = `https://docs.igniterjs.com/${topic}`;
          break;
        case "nextjs":
          docUrl = `https://nextjs.org/docs/${topic}`;
          break;
        case "react":
          docUrl = `https://react.dev/learn/${topic}`;
          break;
        case "typescript":
          docUrl = `https://www.typescriptlang.org/docs/${topic}`;
          break;
        case "custom":
          docUrl = url || "";
          break;
        default:
          throw new Error(`Unknown documentation source: ${source}`);
      }
      
      if (!docUrl) {
        throw new Error("No URL provided for custom documentation source");
      }
      
      const response = await axios.get(docUrl);
      const markdown = turndownService.turndown(response.data as string);
      
      return {
        content: [
          {
            type: "text",
            text: `# Documentation: ${topic}\n\nSource: ${docUrl}\n\n${markdown}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch documentation: ${error.message}`,
          },
        ],
      };
    }
  });
}
