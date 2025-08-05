#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import {
  detectFramework,
  startDevServer,
  getFrameworkList,
  isFrameworkSupported,
  type SupportedFramework,
} from "./adapters/framework";
import { logger, createChildLogger } from "./adapters/logger";
import {
  validateProjectName,
  showInitHelp
} from "./adapters/setup";
import { runSetupPrompts, confirmOverwrite } from './adapters/setup/prompts'
import { generateProject, ProjectGenerator } from './adapters/setup/generator'
import { createDetachedSpinner } from "./lib/spinner";
import {
  handleGenerateFeature,
  handleGenerateController,
  handleGenerateProcedure
} from './adapters/scaffold';

const program = new Command();

program
  .name("igniter")
  .description("CLI for Igniter.js type-safe client generation")
  .version("1.0.0");

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
      initLogger.error('Init command failed', { error });
      console.error('✗ Failed to initialize project:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Dev command
program
  .command("dev")
  .description("Start development mode with framework and Igniter (interactive dashboard by default)")
  .option("--framework <type>", `Framework type (${getFrameworkList()}, generic)`)
  .option("--output <dir>", "Output directory for generated client files", "src/")
  .option("--debug", "Enable debug mode")
  .option("--port <number>", "Port for the dev server", "3000")
  .option("--cmd <command>", "Custom command to start dev server")
  .option("--no-framework", "Disable framework dev server (Igniter only)")
  .option("--no-interactive", "Disable interactive mode (use regular concurrent mode)")
  .action(async (options) => {
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
          env: { PORT: options.port.toString(), NODE_ENV: 'development' }
        });
      }
    }
    processes.push({
      name: "Igniter",
      command: `igniter generate schema --watch --framework ${framework} --output ${options.output}${options.debug ? ' --debug' : ''}`,
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
  .option("--debug", "Enable debug mode")
  .option("--watch", "Watch for changes and regenerate automatically")
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
      debug: options.debug,
      controllerPatterns: ["**/*.controller.{ts,js}"],
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

// Generate Feature subcommand
generate
  .command("feature")
  .description("Scaffold a new feature module")
  .argument("<name>", "The name of the feature (e.g., 'user', 'products')")
  .option("--schema <value>", "Generate from a schema provider (e.g., 'prisma:User')")
  .action(async (name: string, options: { schema?: string }) => {
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
