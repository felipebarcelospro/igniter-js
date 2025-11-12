import type { ProjectSetupConfig } from "@/commands/init/types";
import { BaseAddOn } from "@/core/registry/add-ons/base-addon";
import path from "path";
import { z } from "zod";

export class McpServerAddOn extends BaseAddOn {
  name = "MCP Server";
  description = "AI assistant integration with Model Context Protocol";
  value = "mcp";
  hint = "For AI integration";
  templates = [
    {
      template: path.resolve(
        process.cwd(),
        "templates/add-ons/mcp/mcp.ts.hbs",
      ),
      outputPath: "src/igniter.mcp.ts",
    },
    {
      template: (data: ProjectSetupConfig) => {
        const templates = {
          nextjs: path.resolve(
            process.cwd(),
            "templates/add-ons/mcp/nextjs/route-handler.hbs",
          ),
          "tanstack-start": path.resolve(
            process.cwd(),
            "templates/add-ons/mcp/tanstack-start/route-handler.hbs",
          ),
        };

        return templates[data.starter as keyof typeof templates] || "";
      },
      outputPath: (data: ProjectSetupConfig) => {
        const outputPaths = {
          nextjs: "src/app/api/mcp/[...transport]/route.ts",
          "tanstack-start": "src/routes/mcp/$.ts",
        };

        return outputPaths[data.starter as keyof typeof outputPaths] || "";
      },
    },
  ];
  dependencies = [
    {
      name: "@igniter-js/adapter-mcp-server",
      version: "latest",
      type: "dependency",
    },
    {
      name: "ioredis",
      version: "5.6.1",
      type: "dependency",
    },
    {
      name: "@types/ioredis",
      version: "4.28.10",
      type: "devDependency",
    },
  ];
  dockerServices = [
    {
      name: "redis",
      image: "redis:7-alpine",
      ports: ["6379:6379"],
      environment: {
        REDIS_PASSWORD: "${REDIS_PASSWORD}",
      },
      volumes: ["redis_data:/data"],
    },
  ];
  envVars = [
    {
      key: "IGNITER_MCP_SERVER_BASE_PATH",
      value: "/mcp",
      description: "MCP server base path",
    },
    {
      key: "IGNITER_MCP_SERVER_TIMEOUT",
      value: "3600000",
      description: "MCP session timeout in ms",
    },
    {
      key: "REDIS_URL",
      value: "redis://localhost:6379",
      description: "Redis connection URL",
    },
    {
      key: "REDIS_HOST",
      value: "localhost",
      description: "Redis host",
    },
    {
      key: "REDIS_PORT",
      value: "6379",
      description: "Redis port",
    },
    {
      key: "REDIS_PASSWORD",
      value: "",
      description: "Redis password (leave empty for no password)",
    },
  ];
}
