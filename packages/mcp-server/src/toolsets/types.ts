/**
 * Common types and interfaces for toolsets
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MemoryManager } from "../memory/manager";
import TurndownService from "turndown";
import { Octokit } from "@octokit/rest";

export interface ToolsetContext {
  server: McpServer;
  memoryManager: MemoryManager;
  execAsync: (command: string, options?: any) => Promise<{ stdout: string; stderr: string }>;
  turndownService: TurndownService;
  octokit: Octokit;
}

export type ToolsetRegistrar = (context: ToolsetContext) => void;
