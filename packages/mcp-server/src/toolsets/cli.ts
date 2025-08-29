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

      const command = `npm run dev ${args.join(" ")}`.trim();
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

      const command = `npx igniter generate feature ${args.join(" ")}`.trim();
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

  server.registerTool("generate_controller", {
    title: "Generate Controller",
    description: `**What it does:** Scaffolds a new controller file within an existing feature.
**When to use:** To group a set of related API actions (queries and mutations) under a common path. For example, within a 'user' feature, you might have a 'profile' controller.
**How it works:** Runs 'igniter generate controller <name> --feature <feature>'.
**Result:** A new controller file (e.g., 'profile.controller.ts') inside the specified feature's 'controllers' directory.`,
    inputSchema: {
      name: z.string().describe("The name of the controller (e.g., 'profile', 'settings')."),
      feature: z.string().describe("The parent feature name where the controller will be created."),
    },
  }, async ({ name, feature }: { name: string; feature: string }) => {
    try {
      const command = `npx igniter generate controller ${name} --feature ${feature}`.trim();
      const result = await execAsync(command, { timeout: 30000 });

      return {
        content: [{ type: "text", text: `Controller '${name}' in feature '${feature}' generated successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to generate controller: ${error.message}` }],
      };
    }
  });

  server.registerTool("generate_procedure", {
    title: "Generate Procedure",
    description: `**What it does:** Scaffolds a new procedure (middleware) file within an existing feature.
**When to use:** To create reusable logic that runs before your action handlers, such as authentication checks, logging, or role validation.
**How it works:** Runs 'igniter generate procedure <name> --feature <feature>'.
**Result:** A new procedure file (e.g., 'auth.procedure.ts') inside the specified feature's 'procedures' directory.`,
    inputSchema: {
      name: z.string().describe("The name of the procedure (e.g., 'auth', 'isAdmin')."),
      feature: z.string().describe("The parent feature name where the procedure will be created."),
    },
  }, async ({ name, feature }: { name: string; feature: string }) => {
    try {
      const command = `npx igniter generate procedure ${name} --feature ${feature}`.trim();
      const result = await execAsync(command, { timeout: 30000 });

      return {
        content: [{ type: "text", text: `Procedure '${name}' in feature '${feature}' generated successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to generate procedure: ${error.message}` }],
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
    inputSchema: {
      output: z.string().optional().describe("Output directory for the generated client. Defaults to 'src/'."),
      watch: z.boolean().optional().describe("Watch for changes and regenerate automatically. Defaults to false for manual runs."),
      docs: z.boolean().optional().describe("Also generate OpenAPI documentation. Defaults to false."),
      docsOutput: z.string().optional().describe("Output directory for OpenAPI docs if --docs is enabled."),
    },
  }, async (options: { output?: string; watch?: boolean; docs?: boolean; docsOutput?: string }) => {
    try {
      const args = [];
      if (options.output) args.push(`--output ${options.output}`);
      if (options.watch) args.push("--watch");
      if (options.docs) args.push("--docs");
      if (options.docsOutput) args.push(`--docs-output ${options.docsOutput}`);

      const command = `npx igniter generate schema ${args.join(" ")}`.trim();
      const result = await execAsync(command, { timeout: 30000 });

      return {
        content: [{ type: "text", text: `Schema generated successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to generate schema: ${error.message}` }],
      };
    }
  });

  server.registerTool("generate_docs", {
    title: "Generate API Docs",
    description: `**What it does:** Generates an OpenAPI specification file from your API router. Can also create a self-contained HTML UI for browsing the API.
**When to use:** To create or update your API documentation for internal teams or external consumers.
**How it works:** Runs 'igniter generate docs'. It introspects the router and generates a JSON file based on your controllers, actions, and Zod schemas.
**Result:** An 'openapi.json' file and optionally an 'index.html' file in the specified output directory.`,
    inputSchema: {
      output: z.string().optional().describe("Output directory for the OpenAPI spec. Defaults to './src/docs'."),
      ui: z.boolean().optional().describe("If true, generates a self-contained HTML file with the Scalar UI for interactive documentation."),
    },
  }, async ({ output, ui }: { output?: string; ui?: boolean }) => {
    try {
      const args = [];
      if (output) args.push(`--output ${output}`);
      if (ui) args.push("--ui");

      const command = `npx igniter generate docs ${args.join(" ")}`.trim();
      const result = await execAsync(command, { timeout: 30000 });

      return {
        content: [{ type: "text", text: `API documentation generated successfully!\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}` }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Failed to generate API docs: ${error.message}` }],
      };
    }
  });
}
