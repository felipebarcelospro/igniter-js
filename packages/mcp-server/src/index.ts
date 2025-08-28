#!/usr/bin/env node
/**
 * MCP Server Main Entry Point
 * Lightweight initialization that delegates tool registration to organized toolsets
 */
import TurndownService from "turndown";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from "child_process";
import { promisify } from "util";
import { Octokit } from "@octokit/rest";
import { createDefaultMemoryManager } from "./memory/factories";
import { registerAllToolsets } from "./toolsets";
import { ToolsetContext } from "./toolsets/types";

// Initialize dependencies
const execAsync = promisify(exec);
const turndownService = new TurndownService();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const memoryManager = createDefaultMemoryManager();

// Create MCP server
const server = new McpServer({
  name: "igniter-mcp-server",
  version: "0.0.1",
});

// Prepare toolset context
const toolsetContext: ToolsetContext = {
  server,
  memoryManager,
  execAsync,
  turndownService,
  octokit
};

// Register all toolsets
registerAllToolsets(toolsetContext);

/**
 * Main server function - initializes memory manager and starts the server.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Initialize memory manager
  try {
    await memoryManager.initializeProject();
  } catch (err) {
    console.warn("Memory initialization warning:", err);
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
