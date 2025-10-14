/**
 * Documentation Tools - External documentation access and parsing
 */

import { z } from "zod";
import axios from "axios";
import { ToolsetContext } from "./types";

export function registerDocumentationTools({ server, turndownService }: ToolsetContext) {
  // --- Documentation Tools ---
  server.registerTool("read_as_markdown", {
    title: "Read as Markdown",
    description: "Fetch and read a URL page as markdown",
    inputSchema: {
      url: z.string().describe("Custom URL for documentation (when source is 'custom')"),
    },
  }, async ({ url }: { source: string; topic: string; url?: string }) => {
    try {
      if (!url) {
        throw new Error("No URL provided for custom documentation source");
      }

      const response = await axios.get(url);

      const markdown = turndownService.turndown(response.data as string);

      if(!response.data) {
        throw new Error(response.statusText || "Failed to fetch documentation");
      }

      return {
        content: [
          {
            type: "text",
            text: `# Page result\n\n${markdown}`,
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
