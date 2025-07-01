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
import { generateProject } from './adapters/setup/generator'
import { createDetachedSpinner } from "./lib/spinner";

const program = new Command();

program
  .name("igniter")
  .description("CLI for Igniter.js type-safe client generation")
  .version("1.0.0");

// Init command - Create new Igniter.js projects
program
  .command("init")
  .description("Create a new Igniter.js project with interactive setup")
  .argument("[project-name]", "Name of the project directory")
  .option("--force", "Skip confirmation prompts and overwrite existing files")
  .option("--pm, --package-manager <manager>", "Package manager to use (npm, yarn, pnpm, bun)")
  .option("--template <template>", "Use a specific template (coming soon)")
  .option("-f, --framework <framework>", "Target framework (nextjs, vite, etc.)")
  .option("--no-git", "Skip git repository initialization")
  .option("--no-install", "Skip automatic dependency installation")
  .action(async (projectName: string | undefined, options) => {
    const initLogger = createChildLogger({ component: 'init-command' });
    
    try {
      // Handle help request
      if (options.help) {
        showInitHelp();
        return;
      }

      // If no project name provided, show help and examples
      if (!projectName) {
        console.log("Welcome to Igniter.js!");
        console.log();
        console.log("To create a new project:");
        console.log("  igniter init my-awesome-api");
        console.log();
        console.log("To initialize in current directory:");
        console.log("  igniter init .");
        console.log();
        console.log("For more options:");
        console.log("  igniter init --help");
        return;
      }

      // Validate project name if not current directory
      if (projectName !== '.') {
        const validation = validateProjectName(projectName);
        if (!validation.valid) {
          initLogger.error('Invalid project name', { 
            projectName, 
            reason: validation.message 
          });
          console.error(`✗ ${validation.message}`);
          process.exit(1);
        }
      }

      initLogger.info('Starting init command', { 
        projectName, 
        options 
      });

      // Setup project directory
      const targetDir = projectName ? path.resolve(projectName) : process.cwd()
      
      // Check if directory exists and is not empty (only if --force is not used)
      if (!options.force) {
        try {
          const stats = await fs.promises.stat(targetDir)
          if (stats.isDirectory()) {
            const files = await fs.promises.readdir(targetDir)
            // Filter out hidden files and common non-conflicting files
            const nonEmptyFiles = files.filter(file => 
              !file.startsWith('.') && 
              !['README.md', 'LICENSE', 'package.json'].includes(file.toUpperCase())
            )
            
            if (nonEmptyFiles.length > 0) {
              const shouldOverwrite = await confirmOverwrite(targetDir)
              if (!shouldOverwrite) {
                console.log('Setup cancelled')
                process.exit(0)
              }
            }
          }
        } catch (error) {
          // Directory doesn't exist, which is fine
        }
      }

      // Run setup prompts
      const config = await runSetupPrompts(projectName)
      
      // Validate configuration
      const validation = validateConfig(config)
      if (!validation.isValid) {
        console.error(`✗ ${validation.message}`);
        process.exit(1);
      }

      // Generate project
      await generateProject(config, targetDir)
      
      initLogger.info('Project generated successfully', { 
        project: config.projectName,
        targetDir 
      })
      
    } catch (error) {
      initLogger.error('Init command failed', { error });
      console.error('✗ Failed to initialize project:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command("dev")
  .description("Start development mode with framework and Igniter (interactive dashboard by default)")
  .option(
    "--framework <type>",
    `Framework type (${getFrameworkList()}, generic)`,
  )
  .option("--output <dir>", "Output directory", "src")
  .option("--debug", "Enable debug mode")
  .option("--port <number>", "Port for the dev server", "3000")
  .option("--cmd <command>", "Custom command to start dev server")
  .option("--no-framework", "Disable framework dev server (Igniter only)")
  .option("--no-interactive", "Disable interactive mode (use regular concurrent mode)")
  .action(async (options) => {
    // Auto-detect framework if not specified
    const detectedFramework = detectFramework();
    const framework = options.framework
      ? isFrameworkSupported(options.framework)
        ? options.framework
        : "generic"
      : detectedFramework;

    const cmdLogger = createChildLogger({ command: "dev" });

    // Igniter.js style welcome message
    logger.group("Igniter.js");
    
    // Interactive mode is now the default (unless --no-interactive is used)
    const useInteractive = options.interactive !== false;
    
    if (useInteractive) {
      logger.info("Starting interactive development mode", {
        framework,
        output: options.output,
        port: options.port,
        withFramework: !options.noFramework
      });
      
      // Import interactive concurrent processes
      const { runInteractiveProcesses } = await import("./adapters/framework/concurrent-processes");
      
      // Create process configs for interactive mode
      const processes = [];
      
      // Add framework dev server first (if not disabled)
      if (!options.noFramework && framework !== 'generic') {
        const frameworkCommands = {
          nextjs: "npm run dev --turbo",
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
            name: framework === 'nextjs' ? 'Next.js' : 
                  framework === 'sveltekit' ? 'SvelteKit' :
                  framework === 'tanstack-start' ? 'TanStack Start' :
                  framework.charAt(0).toUpperCase() + framework.slice(1),
            command: frameworkCommand,
            color: framework === 'nextjs' ? 'green' : 
                   framework === 'vite' ? 'yellow' :
                   framework === 'nuxt' ? 'cyan' :
                   framework === 'sveltekit' ? 'magenta' :
                   framework === 'remix' ? 'red' :
                   framework === 'astro' ? 'white' :
                   framework === 'express' ? 'blue' :
                   framework === 'tanstack-start' ? 'purple' : 'gray',
            cwd: process.cwd(),
            env: {
              PORT: options.port.toString(),
              NODE_ENV: 'development'
            }
          });
        }
      }
      
      // Add Igniter watcher
      processes.push({
        name: "Igniter.js",
        command: `igniter generate --framework ${framework} --output ${options.output}${options.debug ? ' --debug' : ''}`,
        color: "blue",
        cwd: process.cwd()
      });
      
      // Start interactive mode
      await runInteractiveProcesses(processes);
      
    } else {
      // Non-interactive concurrent mode
      logger.info("Starting concurrent development mode", {
        framework,
        output: options.output,
        port: options.port,
        withFramework: !options.noFramework
      });

      // Use concurrent processes without interactive switching
      const { runConcurrentProcesses } = await import("./adapters/framework/concurrent-processes");
      
      const processes = [];
      
      // Add framework dev server first (if not disabled)
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
            name: framework === 'nextjs' ? 'Next.js' : 
                  framework === 'sveltekit' ? 'SvelteKit' :
                  framework === 'tanstack-start' ? 'TanStack Start' :
                  framework.charAt(0).toUpperCase() + framework.slice(1),
            command: frameworkCommand,
            color: framework === 'nextjs' ? 'green' : 
                   framework === 'vite' ? 'yellow' :
                   framework === 'nuxt' ? 'cyan' :
                   framework === 'sveltekit' ? 'magenta' :
                   framework === 'remix' ? 'red' :
                   framework === 'astro' ? 'white' :
                   framework === 'express' ? 'blue' :
                   framework === 'tanstack-start' ? 'purple' : 'gray',
            cwd: process.cwd(),
            env: {
              PORT: options.port.toString(),
              NODE_ENV: 'development'
            }
          });
        }
      }
      
      // Add Igniter watcher
      processes.push({
        name: "Igniter.js",
        command: `igniter generate --framework ${framework} --output ${options.output}${options.debug ? ' --debug' : ''}`,
        color: "blue",
        cwd: process.cwd()
      });

      await runConcurrentProcesses({
        processes,
        killOthers: true,
        prefixFormat: 'name',
        prefixColors: true,
        prefixLength: 10
      });
    }
  });

program
  .command("generate")
  .description("Generate client once (useful for CI/CD)")
  .option(
    "--framework <type>",
    `Framework type (${getFrameworkList()}, generic)`,
  )
  .option("--output <dir>", "Output directory", "src")
  .option("--debug", "Enable debug mode")
  .action(async (options) => {
    const startTime = performance.now();

    // Auto-detect framework if not specified
    const detectedFramework = detectFramework();
    const framework = options.framework
      ? isFrameworkSupported(options.framework)
        ? options.framework
        : "generic"
      : detectedFramework;

    logger.group("Igniter.js CLI");
    logger.info("Starting client generation", {
      framework,
      output: options.output,
    });

    const watcherSpinner = createDetachedSpinner("Loading generator...");
    watcherSpinner.start();

    const { IgniterWatcher } = await import("./adapters/build/watcher");

    const watcher = new IgniterWatcher({
      framework,
      outputDir: options.output,
      debug: options.debug,
      controllerPatterns: ["**/*.controller.{ts,js}"],
      extractTypes: true,
      optimizeClientBundle: true,
      hotReload: false,
    });

    watcherSpinner.success("Generator loaded");

    await watcher.generate();

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    const timestamp = new Date().toISOString();

    logger.separator();
    logger.success("Generation complete");
    logger.info("Summary", {
      output: options.output,
      framework,
      duration: `${duration}s`,
      timestamp,
    });

    logger.separator();
    logger.info("Useful links");
    logger.info(
      "Documentation: https://felipebarcelospro.github.io/igniter-js",
    );
    logger.info(
      "Issues: https://github.com/felipebarcelospro/igniter-js/issues",
    );
    logger.info(
      "Contributing: https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md",
    );

    logger.groupEnd();
    logger.separator();

    // kill the process - DON'T REMOVE THIS
    process.exit(0);
  });

// Add a command to just start framework dev server (without Igniter)
program
  .command("server")
  .description("Start framework dev server only (no Igniter file watching)")
  .option(
    "--framework <type>",
    `Framework type (${getFrameworkList()}, generic)`,
  )
  .option("--port <number>", "Port for the dev server", "3000")
  .option("--cmd <command>", "Custom command to start dev server")
  .option("--debug", "Enable debug mode")
  .action(async (options) => {
    // Auto-detect framework if not specified
    const detectedFramework = detectFramework();
    const framework = options.framework
      ? isFrameworkSupported(options.framework)
        ? options.framework
        : "generic"
      : detectedFramework;

    const cmdLogger = createChildLogger({ command: "server" });

    logger.group("Igniter.js CLI");
    logger.info("Server mode", {
      framework,
      port: options.port,
    });

    try {
      const devServerProcess = await startDevServer({
        framework: framework as SupportedFramework,
        command: options.cmd,
        port: parseInt(options.port),
        debug: options.debug,
      });

      logger.success("Dev server started");
      logger.info("Press Ctrl+C to stop");

      // Handle shutdown gracefully
      process.on("SIGINT", () => {
        console.log("\n"); // New line for clean output

        const shutdownSpinner = createDetachedSpinner("Stopping dev server...");
        shutdownSpinner.start();

        // @ts-ignore
        devServerProcess?.kill("SIGTERM");

        setTimeout(() => {
          // @ts-ignore
          if (devServerProcess && !devServerProcess.killed) {
            // @ts-ignore
            devServerProcess.kill("SIGKILL");
          }
          shutdownSpinner.success("Dev server stopped");
          logger.groupEnd();
          process.exit(0);
        }, 3000);
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Failed to start dev server", { error: error.message });
      } else {
        logger.error("Failed to start dev server", { error });
      }
      logger.groupEnd();
      process.exit(1);
    }
  });

// Help command enhancement
program.on('--help', () => {
  console.log();
  console.log('🔥 Igniter.js - Type-safe API development');
  console.log();
  console.log('Examples:');
  console.log('  igniter init my-api              Create new project with setup wizard');
  console.log('  igniter init .                   Initialize current directory');
  console.log('  igniter dev --interactive        Start development with interactive dashboard');
  console.log('  igniter dev --framework nextjs   Start with specific framework');
  console.log('  igniter generate --watch         Generate and watch for changes');
  console.log();
  console.log('For more help with a specific command:');
  console.log('  igniter init --help');
  console.log('  igniter dev --help');
  console.log('  igniter generate --help');
  console.log();
});

program.parse();

/**
 * Validate project configuration
 */
function validateConfig(config: any): { isValid: boolean; message?: string } {
  if (!config.projectName) {
    return { isValid: false, message: 'Project name is required' }
  }
  
  if (!config.framework) {
    return { isValid: false, message: 'Framework selection is required' }
  }
  
  return { isValid: true }
}
