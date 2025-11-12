import { tool } from "ai";
import { z } from "zod";

/**
 * Tool: Get Page Content
 * 
 * Retrieves the full content of a specific documentation page
 */
export const getPageContentTool = tool({
  description: `Get the full content of a specific Igniter.js documentation page.
Use this when you need detailed information about a specific topic or when the user asks about a particular page.`,

  inputSchema: z.object({
    path: z
      .string()
      .describe(
        "The path to the documentation page (e.g., '/docs/core/getting-started', '/docs/adapters/redis')"
      ),
  }),

  execute: async ({ path }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      
      // Construct the llms.mdx URL for the specific path
      const mdxUrl = `${baseUrl}/llms.mdx${path}`;
      const response = await fetch(mdxUrl);
      
      if (!response.ok) {
        return {
          found: false,
          message: `Page not found: ${path}`,
        };
      }

      const content = await response.text();
      
      return {
        found: true,
        path,
        content,
        url: `${baseUrl}${path}`,
      };
    } catch (error) {
      console.error("Error fetching page content:", error);
      return {
        found: false,
        error: "Failed to fetch page content",
      };
    }
  },
});




