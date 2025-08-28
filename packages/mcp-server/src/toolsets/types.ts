/**
 * Common types and interfaces for toolsets
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ToolsetContext {
  server: McpServer;
  memoryManager: any;
  execAsync: (command: string, options?: any) => Promise<{ stdout: string; stderr: string }>;
  turndownService: any;
  octokit: any;
}

export type ToolsetRegistrar = (context: ToolsetContext) => void;
