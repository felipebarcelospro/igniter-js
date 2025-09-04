#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";

import {
  detectFramework,
  getFrameworkList,
  isFrameworkSupported,
} from "./adapters/framework";
import { logger, createChildLogger, setupCliLogger, formatError } from "./adapters/logger";
import {
  validateProjectName,
  showInitHelp
} from "./adapters/setup";
import { runSetupPrompts, confirmOverwrite } from './adapters/setup/prompts'
import { generateProject } from './adapters/setup/generator'
import { createDetachedSpinner } from "./lib/spinner";
import { createTimelineManager } from "./lib/timeline-manager";
import {
  handleGenerateFeature,
  handleGenerateController,
  handleGenerateProcedure
} from './adapters/scaffold';
import { IgniterRouter } from "@igniter-js/core";
import { killProcessOnPort } from "./lib/port-manager";

const program = new Command();

program
  .name("igniter")
  .description("CLI for Igniter.js type-safe client generation")
  .version("1.0.0")
  .option('--debug', 'Enable debug mode for detailed logging', false)
  .hook('preAction', (thisCommand) => {
    // This hook executes after options are parsed, but before the action handler.
    // It's the perfect place to set up global configurations like logging.
    setupCliLogger(thisCommand.optsWithGlobals());
  });

// Init command
program
  .command("init")
  .description("Create a new Igniter.js project with interactive setup")
  .argument("[project-name]", "Name of the project directory")
  .option("--force", "Skip confirmation prompts and overwrite existing files")
  .option("--pm, --package-manager <manager>", "Package manager to use (npm, yarn, pnpm, bun)")
  .option("--template <template>", "Use a specific template (e.g., starter-nextjs, starter-express-rest-api)")
  .option("-f, --framework <framework>", "Target framework (nextjs, vite, etc.)")
  .option("--features <features>", "Comma-separated list of features (store,jobs,mcp,logging,telemetry)")
  .option("--database <database>", "Database provider (none, postgresql, mysql, sqlite)")
  .option("--orm <orm>", "ORM provider (prisma, drizzle)")
  .option("--no-git", "Skip git repository initialization")
  .option("--no-install", "Skip automatic dependency installation")
  .option("--no-docker", "Skip Docker Compose setup")
  .action(async (projectName: string | undefined, options) => {
    const initLogger = createChildLogger({ component: 'init-command' });
    try {
      if (!projectName) {
        showInitHelp();
        return;
      }
      if (projectName !== '.') {
        const validation = validateProjectName(projectName);
        if (!validation.valid) {
          initLogger.error('Invalid project name', { projectName, reason: validation.message });
          console.error(`✗ ${validation.message}`);
          process.exit(1);
        }
      }
      const targetDir = projectName === '.' ? process.cwd() : path.resolve(projectName!);
      const isExistingProject = (await fs.promises.stat(path.join(targetDir, 'package.json')).catch(() => null)) !== null;

      if (!options.force) {
        try {
          const stats = await fs.promises.stat(targetDir);
          if (stats.isDirectory()) {
            const files = await fs.promises.readdir(targetDir);
            const nonEmptyFiles = files.filter(file => !file.startsWith('.'));
            if (nonEmptyFiles.length > 0 && !isExistingProject) {
              const shouldOverwrite = await confirmOverwrite(`Directory '${projectName}' is not empty. Continue?`);
              if (!shouldOverwrite) {
                console.log('Setup cancelled.');
                process.exit(0);
              }
            }
          }
        } catch (error) {
          // Directory doesn't exist, which is fine
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error;
          }
        }
      }

      const config = await runSetupPrompts(targetDir, isExistingProject, options);

      const validation = validateConfig(config);
      if (!validation.isValid) {
        console.error(`✗ ${validation.message}`);
        process.exit(1);
      }

      await generateProject(config, targetDir, isExistingProject);
    } catch (error) {
      initLogger.error('Init command failed unexpectedly', {
        error: error instanceof Error ? formatError(error) : error,
      });
      console.error(`✗ Failed to initialize project. Run with --debug for more details.`);
      process.exit(1);
    }
  });

// Dev command
program
  .command("dev")
  .description("Start development mode with framework and Igniter (interactive dashboard and OpenAPI docs by default)")
  .option("--framework <type>", `Framework type (${getFrameworkList()}, generic)`)
  .option("--output <dir>", "Output directory for generated client files", "src/")
  .option("--port <number>", "Port for the dev server", "3000")
  .option("--cmd <command>", "Custom command to start dev server")
  .option("--no-framework", "Disable framework dev server (Igniter only)")
  .option("--no-interactive", "Disable interactive mode (use regular concurrent mode)")
  .option("--docs-output <dir>", "Output directory for OpenAPI docs", "./src/docs")
  .action(async (options) => {
    // Liberar a porta antes de iniciar o servidor
    const port = parseInt(options.port) || 3000;
    logger.info(`Checking and freeing port ${port}...`);
    await killProcessOnPort(port);

    const detectedFramework = detectFramework();
    const framework = options.framework ? (isFrameworkSupported(options.framework) ? options.framework : "generic") : detectedFramework;
    const useInteractive = options.interactive !== false;
    logger.info(`Starting ${useInteractive ? 'interactive' : 'concurrent'} development mode`, { framework });
    const { runInteractiveProcesses, runConcurrentProcesses } = await import("./adapters/framework/concurrent-processes");
    const processes = [];
    if (!options.noFramework && framework !== 'generic') {
      const frameworkCommands = {
        nextjs: "npm run dev",
        vite: "npm run dev",
        nuxt: "npm run dev",
        sveltekit: "npm run dev",
        remix: "npm run dev",
        astro: "npm run dev",
        express: "npm run dev",
        'tanstack-start': "npm run dev"
      };
      const frameworkCommand = options.cmd || frameworkCommands[framework as keyof typeof frameworkCommands];
      if (frameworkCommand) {
        processes.push({
          name: framework.charAt(0).toUpperCase() + framework.slice(1),
          command: frameworkCommand,
          color: 'green',
          cwd: process.cwd(),
          env: { PORT: port.toString(), NODE_ENV: 'development' }
        });
      }
    }
    const docsFlags = ` --docs --docs-output ${options.docsOutput}`;
    
    processes.push({
      name: "Igniter",
      command: `npx @igniter-js/cli@latest generate schema --watch --framework ${framework} --output ${options.output}${docsFlags}`,
      color: "blue",
      cwd: process.cwd()
    });
    if (useInteractive) {
      await runInteractiveProcesses(processes);
    } else {
      await runConcurrentProcesses({ processes, killOthers: true });
    }
  });

// Generate command (parent for subcommands)
const generate = program
  .command("generate")
  .description("Scaffold new features or generate client schema");

// Generate Schema subcommand
generate
  .command("schema")
  .description("Generate client schema from your Igniter router (for CI/CD or manual builds)")
  .option("--framework <type>", `Framework type (${getFrameworkList()}, generic)`)
  .option("--output <dir>", "Output directory", "src/")
  .option("--watch", "Watch for changes and regenerate automatically")
  .option("--docs", "Enable automatic OpenAPI documentation generation")
  .option("--docs-output <dir>", "Output directory for OpenAPI docs", "./src/docs")
  .action(async (options) => {
    const startTime = performance.now();
    const detectedFramework = detectFramework();
    const framework = options.framework ? (isFrameworkSupported(options.framework) ? options.framework : "generic") : detectedFramework;
    logger.group("Igniter.js CLI");
    logger.info(`Starting client schema ${options.watch ? 'watching' : 'generation'}`, { framework, output: options.output });
    const watcherSpinner = createDetachedSpinner("Loading generator...");
    watcherSpinner.start();
    const { IgniterWatcher } = await import("./adapters/build/watcher");
    const watcher = new IgniterWatcher({
      framework,
      outputDir: options.output,
      debug: program.opts().debug, // Pass global debug flag to watcher
      controllerPatterns: ["**/*.controller.{ts,js}"],
      generateDocs: options.docs,
      docsOutputDir: options.docsOutput,
    });
    watcherSpinner.success("Generator loaded");
    if (options.watch) {
      await watcher.start();
    } else {
      await watcher.generate();
      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      logger.success(`Generation complete in ${duration}s`);
      logger.groupEnd();
      process.exit(0);
    }
  });

generate
  .command("docs")
  .description("Generate OpenAPI specification and/or interactive playground")
  .option("--output <dir>", "Output directory for the OpenAPI spec", "./src")
  .option("--ui", "Generate a self-contained HTML file with Scalar UI")
  .action(async (options) => {
    const startTime = performance.now();
    const docsLogger = createChildLogger({ component: 'generate-docs-command' });
    const timeline = createTimelineManager(docsLogger);
    
    try {
      timeline.start('Generating OpenAPI Documentation', 4);
      
      // Step 1: Load dependencies and locate router
      timeline.step('Loading dependencies and locating router');
      const { loadRouter, introspectRouter } = await import("./adapters/build/introspector");
      const { OpenAPIGenerator } = await import("./adapters/docs/openapi-generator");

      const possibleRouterPaths = [
        'src/igniter.router.ts',
        'src/igniter.router.js',
        'src/router.ts',
        'src/router.js',
        'igniter.router.ts',
        'igniter.router.js',
        'router.ts',
        'router.js'
      ];

      let router: IgniterRouter<any, any, any, any, any> | null = null;
      let foundRouterPath = '';
      for (const routerPath of possibleRouterPaths) {
        if (fs.existsSync(routerPath)) {
          router = await loadRouter(routerPath);
          if (router) {
            foundRouterPath = routerPath;
            break;
          }
        }
      }

      if (!router) {
        timeline.fail('No Igniter router found in your project. Please ensure you have a router file (e.g., src/igniter.router.ts).');
        process.exit(1);
      }
      
      timeline.substep(`Found router at: ${foundRouterPath}`);
      timeline.stepSuccess('Router loaded successfully');

      // Step 2: Introspect router and analyze API structure
      timeline.step('Analyzing API structure');
      const introspected = introspectRouter(router);
      const controllersCount = Object.keys(introspected.schema.controllers || {}).length;
      const endpointsCount = Object.values(introspected.schema.controllers || {})
        .reduce((total, controller: any) => total + Object.keys(controller.actions || {}).length, 0);
      
      timeline.substep(`Found ${controllersCount} controllers, ${endpointsCount} endpoints`);
      timeline.stepSuccess('API structure analyzed');

      // Step 3: Generate OpenAPI specification
      timeline.step('Generating OpenAPI specification');
      const generator = new OpenAPIGenerator(introspected.schema.docs || {});
      const openApiSpec = generator.generate(introspected.schema);
      
      const outputDir = path.resolve(options.output, 'docs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        timeline.substep(`Created output directory: ${outputDir}`);
      }
      
      const outputPath = path.join(outputDir, 'openapi.json');
      fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2), 'utf8');
      
      const specSize = (fs.statSync(outputPath).size / 1024).toFixed(1);
      timeline.substep(`OpenAPI spec: ${outputPath} (${specSize} KB)`);
      timeline.stepSuccess('OpenAPI specification generated');

      // Step 4: Generate Scalar UI (if requested)
      if (options.ui) {
        timeline.step('Generating Scalar UI');
        const scalarHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>API Reference</title>
  </head>
  <body>
    <script id="api-reference" data-url="./openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
        const uiOutputPath = path.join(outputDir, 'index.html');
        fs.writeFileSync(uiOutputPath, scalarHtml, 'utf8');
        
        const uiSize = (fs.statSync(uiOutputPath).size / 1024).toFixed(1);
        timeline.substep(`Scalar UI: ${uiOutputPath} (${uiSize} KB)`);
        timeline.stepSuccess('Interactive UI generated');
      }

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      const totalFiles = options.ui ? 2 : 1;
      timeline.complete(`Documentation generated successfully! ${totalFiles} files created in ${duration}s`);
      
      // Force exit to prevent hanging processes (esbuild cleanup)
      process.exit(0);

    } catch (error) {
      timeline.fail('Failed to generate OpenAPI documentation', error instanceof Error ? error : new Error(String(error)));
      process.exit(1);
    }
  });

// Generate Feature subcommand
generate
  .command("feature")
  .description("Scaffold a new feature module")
  .argument("[name]", "The name of the feature (e.g., 'user', 'products')")
  .option("--schema <value>", "Generate from a schema provider (e.g., 'prisma:User')")
  .action(async (name: string | undefined, options: { schema?: string }) => {
    await handleGenerateFeature(name, options);
  });

// Generate Controller subcommand
generate
  .command("controller")
  .description("Scaffold a new controller within a feature")
  .argument("<name>", "The name of the controller (e.g., 'profile')")
  .option("-f, --feature <feature>", "The parent feature name", "")
  .action(async (name: string, options: { feature: string }) => {
    await handleGenerateController(name, options.feature);
  });

// Generate Procedure subcommand
generate
  .command("procedure")
  .description("Scaffold a new procedure within a feature")
  .argument("<name>", "The name of the procedure (e.g., 'auth', 'logging')")
  .option("-f, --feature <feature>", "The parent feature name", "")
  .action(async (name: string, options: { feature: string }) => {
    await handleGenerateProcedure(name, options.feature);
  });

program.parse();

function validateConfig(config: any): { isValid: boolean; message?: string } {
  if (!config.projectName) {
    return { isValid: false, message: 'Project name is required' }
  }
  if (!config.framework) {
    return { isValid: false, message: 'Framework selection is required' }
  }
  return { isValid: true }
}
