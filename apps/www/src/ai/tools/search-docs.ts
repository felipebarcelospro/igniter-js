import { tool } from "ai";
import { z } from "zod";

import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/app/docs/source';

const { search } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});

/**
 * Tool: Search Documentation
 * 
 * Searches through the llms.txt content to find relevant information
 */
export const searchDocsTool = tool({
  description: `Search through Igniter.js documentation to find relevant information.
Use this when the user asks about features, concepts, or how to do something with Igniter.js.
The search will look through all documentation pages and return relevant content.`,

  inputSchema: z.object({
    query: z.string().describe("The search query to find in the documentation"),
  }),

  execute: async ({ query }) => {
    try {
      const results = await search(query);
      return results;
    } catch (error) {
      console.error("Error searching docs:", error);
      return {
        found: false,
        error: "Failed to search documentation",
      };
    }
  },
});




