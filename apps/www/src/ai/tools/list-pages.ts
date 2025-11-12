import { tool } from "ai";
import { z } from "zod";

/**
 * Tool: List Available Pages
 * 
 * Lists all available documentation pages
 */
export const listPagesTool = tool({
  description: `List all available documentation pages in Igniter.js.
Use this when the user asks what documentation is available or wants to explore topics.`,

  inputSchema: z.object({
    category: z
      .string()
      .optional()
      .describe("Filter by category (e.g., 'core', 'adapters', 'guides')"),
  }),

  execute: async ({ category }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/llms.txt`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documentation: ${response.statusText}`);
      }

      const content = await response.text();
      
      // Extract page URLs from the content
      // llms.txt includes URLs in the format: https://igniterjs.com/docs/...
      const urlRegex = /https?:\/\/[^\s]+\/docs\/[^\s)]+/g;
      const urls = Array.from(new Set(content.match(urlRegex) || []));
      
      const pages = urls
        .map(url => {
          const path = url.replace(/https?:\/\/[^\/]+/, '');
          const parts = path.split('/').filter(Boolean);
          const pageCategory = parts[1]; // docs/[category]/...
          
          if (category && pageCategory !== category) {
            return null;
          }
          
          return {
            path,
            category: pageCategory,
            title: parts[parts.length - 1]
              .split('-')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
          };
        })
        .filter(Boolean);
      
      return {
        found: true,
        pages,
        totalCount: pages.length,
        categories: Array.from(new Set(pages.map(p => p!.category))),
      };
    } catch (error) {
      console.error("Error listing pages:", error);
      return {
        found: false,
        error: "Failed to list pages",
      };
    }
  },
});




