/**
 * CLI Tools - Development server management, project building, and code scaffolding.
 * This toolset provides programmatic access to the Igniter.js CLI, enabling agents to manage the development lifecycle,
 * generate boilerplate code, and maintain project structure.
 */

import { z } from "zod";
import { ToolsetContext } from "./types";

export function registerCliTools({ server, execAsync }: ToolsetContext) {
  // --- Lifecycle Tools ---

  server.registerTool("start_dev_server", {
    title: "Start Dev Server",
    description: `**What it does:** Starts the Igniter.js development server, enabling live reloading, client generation, and interactive debugging.
**When to use:** At the beginning of a development session to run the project locally. This is the primary way to test changes in real-time.
**How it works:** It programmatically runs 'npm run dev', which often starts both the web framework (like Next.js) and the Igniter.js client generator.
**Result:** A running development server, with output logs streamed to the response.`,
    inputSchema: {
      port: z.number().optional().describe("Port to run the server on. Defaults to the project's standard port (e.g., 3000)."),
      watch: z.boolean().optional().describe("Enable file watching for automatic restarts and client regeneration. Defaults to true."),
    },
  }, async ({ port, watch }: { port?: number; watch?: boolean }) => {
    try {
      const args = [];
      if (port) args.push(`--port ${port}`);
      // Note: The CLI's dev command implies watching, so we don't need a specific flag unless we want to disable it.

      const command = `npx @igniter-js/cli@latest dev ${args.join(" ")}`.trim();
      const result = await execAsync(command, { timeout: 15000 }); // Increased timeout for dev server startup

      return {
        content: [{ type: "text", text: `Development server started successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to start development server: ${error.message}` }],
      };
    }
  });

  server.registerTool("build_project", {
    title: "Build Project",
    description: `**What it does:** Compiles the project for production. This includes building the web framework and generating the final Igniter.js client.
**When to use:** Before deploying the application or when you need to test the production build locally.
**How it works:** Executes 'npm run build', which typically runs TypeScript compilation and framework-specific build commands.
**Result:** A production-ready build in the project's output directory (e.g., '.next' or 'dist').`,
    inputSchema: {
      mode: z.enum(["development", "production"]).optional().describe("Build mode. 'production' is the default and standard for builds."),
    },
  }, async ({ mode }: { mode?: "development" | "production" }) => {
    try {
      const env = mode === "production" ? "NODE_ENV=production" : "";
      const command = `${env} npm run build`.trim();
      const result = await execAsync(command, { timeout: 60000 }); // Longer timeout for production builds

      return {
        content: [{ type: "text", text: `Build completed successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Build failed: ${error.message}` }],
      };
    }
  });

  server.registerTool("run_tests", {
    title: "Run Tests",
    description: `**What it does:** Executes the project's test suite using the configured test runner (e.g., Vitest).
**When to use:** After making changes to ensure that functionality is correct and no regressions were introduced. Essential for maintaining code quality.
**How it works:** Runs 'npm test'. The '--filter' option can be used to run tests for a specific package in a monorepo.
**Result:** A test report summarizing passed and failed tests.`,
    inputSchema: {
      filter: z.string().optional().describe("Filter tests by a specific pattern or package name (e.g., '@igniter-js/core')."),
      watch: z.boolean().optional().describe("Run tests in watch mode to automatically re-run on file changes."),
    },
  }, async ({ filter, watch }: { filter?: string; watch?: boolean }) => {
    try {
      const args = [];
      if (filter) args.push(`--filter ${filter}`);
      if (watch) args.push("--watch");

      const command = `npm test ${args.join(" ")}`.trim();
      const result = await execAsync(command, { timeout: 60000 }); // Longer timeout for tests

      return {
        content: [{ type: "text", text: `Tests completed!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Tests failed: ${error.message}` }],
      };
    }
  });

  // --- Scaffolding Tools ---

  server.registerTool("generate_feature", {
    title: "Generate Feature",
    description: `**What it does:** Scaffolds a complete, new feature module according to Igniter.js conventions.
**When to use:** When starting a new, distinct area of functionality in the application (e.g., 'users', 'products', 'billing').
**How it works:** Runs 'igniter generate feature <name>'. It creates a directory with subfolders for controllers, procedures, and types.
**Result:** A new feature directory and files, ready for business logic implementation.`,
    inputSchema: {
      name: z.string().describe("The name of the feature in kebab-case (e.g., 'user-management')."),
      schema: z.string().optional().describe("EXPERIMENTAL: Generate CRUD operations from a schema provider (e.g., 'prisma:User')."),
    },
  }, async ({ name, schema }: { name: string; schema?: string }) => {
    try {
      const args = [name];
      if (schema) args.push(`--schema "${schema}"`);

      const command = `npx @igniter-js/cli@latest generate feature ${args.join(" ")}`.trim();
      const result = await execAsync(command, { timeout: 30000 });

      return {
        content: [{ type: "text", text: `Feature '${name}' generated successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to generate feature: ${error.message}` }],
      };
    }
  });

  // --- Generation & Docs Tools ---

  server.registerTool("generate_schema", {
    title: "Generate Schema",
    description: `**What it does:** Manually triggers the generation of the type-safe client schema from your API router.
**When to use:** Primarily in CI/CD environments or when you need to force a regeneration without running the dev server. The 'dev' command typically handles this automatically.
**How it works:** Runs 'igniter generate schema'. It introspects your main router file and outputs the client files.
**Result:** Updated client schema files in the specified output directory.`,
  }, async (options: { output?: string; watch?: boolean; docs?: boolean; docsOutput?: string }) => {
    try {
      const args = [];
      if (options.output) args.push(`--output ${options.output}`);
      if (options.watch) args.push("--watch");
      if (options.docs) args.push("--docs");
      if (options.docsOutput) args.push(`--docs-output ${options.docsOutput}`);

      const command = [
        `npx @igniter-js/cli@latest generate schema`.trim(),
        `npx @igniter-js/cli@latest generate docs`.trim()
      ];

      for (const cmd of command) {
        const result = await execAsync(`${cmd} ${args.join(" ")}`.trim(), { timeout: 30000 });
        if (result.stderr) {
          throw new Error(result.stderr);
        }
      }

      return {
        content: [{ type: "text", text: `Schema generated successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to generate schema: ${error.message}` }],
      };
    }
  });

  server.registerTool("add_package_dependency", {
    title: "Add Package Dependency",
    description: "Adds a new dependency to a project using the configured package manager (npm, yarn, bun).",
    inputSchema: {
      package_name: z.string().describe("The name of the package to add (e.g., axios, lodash)."),
      version: z.string().optional().describe("The specific version of the package (e.g., ^1.0.0, latest). Defaults to the latest version."),
      dev_dependency: z.boolean().optional().default(false).describe("If true, adds as a development dependency."),
    },
  }, async ({ package_name, version, dev_dependency }: { package_name: string; version?: string; dev_dependency?: boolean; }) => {
    try {
      // Simple package manager detection
      const fs = require('fs');
      const path = require('path');

      let command = '';
      if (fs.existsSync(path.join(process.cwd(), 'bun.lockb'))) {
        command = `bun add ${dev_dependency ? '-d' : ''} ${package_name}${version ? '@' + version : ''}`;
      } else if (fs.existsSync(path.join(process.cwd(), 'yarn.lock'))) {
        command = `yarn add ${dev_dependency ? '-D' : ''} ${package_name}${version ? '@' + version : ''}`;
      } else {
        command = `npm install ${dev_dependency ? '--save-dev' : ''} ${package_name}${version ? '@' + version : ''}`;
      }

      const result = await execAsync(command, { timeout: 120000 }); // Long timeout for package installation

      return {
        content: [{ type: "text", text: `Package '${package_name}' added successfully.\n\nOutput:\n${result.stdout}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to add package: ${error.message}\n\nStderr:\n${error.stderr}` }],
      };
    }
  });

  server.registerTool("remove_package_dependency", {
    title: "Remove Package Dependency",
    description: "Removes an existing dependency from a project.",
    inputSchema: {
      package_name: z.string().describe("The name of the package to remove."),
    },
  }, async ({ package_name }: { package_name: string }) => {
    try {
      // Simple package manager detection
      const fs = require('fs');
      const path = require('path');

      let command = '';
      if (fs.existsSync(path.join(process.cwd(), 'bun.lockb'))) {
        command = `bun remove ${package_name}`;
      } else if (fs.existsSync(path.join(process.cwd(), 'yarn.lock'))) {
        command = `yarn remove ${package_name}`;
      } else {
        command = `npm uninstall ${package_name}`;
      }

      const result = await execAsync(command, { timeout: 120000 }); // Long timeout for package removal

      return {
        content: [{ type: "text", text: `Package '${package_name}' removed successfully.\n\nOutput:\n${result.stdout}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to remove package: ${error.message}\n\nStderr:\n${error.stderr}` }],
      };
    }
  });
}
