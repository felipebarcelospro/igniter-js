/**
 * Lia's Tools
 * 
 * This file exports all tools available to Lia agent
 */

export { searchDocsTool } from "./search-docs";
export { getPageContentTool } from "./get-page-content";
export { listPagesTool } from "./list-pages";

// Export as a single object for easy import
import { searchDocsTool } from "./search-docs";
import { getPageContentTool } from "./get-page-content";
import { listPagesTool } from "./list-pages";

export const liaTools = {
  searchDocs: searchDocsTool,
  getPageContent: getPageContentTool,
  listPages: listPagesTool,
};
