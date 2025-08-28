/**
 * CLI Tools - Development server management and project building
 */

import { z } from "zod";
import { ToolsetContext } from "./types";

export function registerCliTools({ server, execAsync }: ToolsetContext) {
  // --- CLI Tools ---
  server.registerTool("dev", {
    title: "Start Dev Server",
    description: "Start the Igniter.js development server",
    inputSchema: {
      port: z.number().optional().describe("Port to run the server on"),
      watch: z.boolean().optional().describe("Enable file watching"),
    },
  }, async ({ port, watch }: { port?: number; watch?: boolean }) => {
    try {
      const args = [];
      if (port) args.push(`--port ${port}`);
      if (watch !== false) args.push("--watch");
      
      const command = `npm run dev ${args.join(" ")}`.trim();
      const result = await execAsync(command, { timeout: 5000 });
      
      return {
        content: [
          {
            type: "text",
            text: `Development server started successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text", 
            text: `Failed to start development server: ${error.message}`,
          },
        ],
      };
    }
  });

  server.registerTool("build", {
    title: "Build Project",
    description: "Build the Igniter.js project",
    inputSchema: {
      mode: z.enum(["development", "production"]).optional().describe("Build mode"),
    },
  }, async ({ mode }: { mode?: "development" | "production" }) => {
    try {
      const env = mode === "production" ? "NODE_ENV=production" : "";
      const command = `${env} npm run build`.trim();
      const result = await execAsync(command, { timeout: 30000 });
      
      return {
        content: [
          {
            type: "text",
            text: `Build completed successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Build failed: ${error.message}`,
          },
        ],
      };
    }
  });

  server.registerTool("test", {
    title: "Run Tests",
    description: "Run the project test suite",
    inputSchema: {
      filter: z.string().optional().describe("Filter tests by pattern"),
      watch: z.boolean().optional().describe("Run tests in watch mode"),
    },
  }, async ({ filter, watch }: { filter?: string; watch?: boolean }) => {
    try {
      const args = [];
      if (filter) args.push(`--filter ${filter}`);
      if (watch) args.push("--watch");
      
      const command = `npm test ${args.join(" ")}`.trim();
      const result = await execAsync(command, { timeout: 30000 });
      
      return {
        content: [
          {
            type: "text",
            text: `Tests completed!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Tests failed: ${error.message}`,
          },
        ],
      };
    }
  });
}
