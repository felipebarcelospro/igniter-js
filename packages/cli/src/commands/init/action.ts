import * as p from "@clack/prompts";
import * as path from "path";
import { runInitPrompts } from "./prompts";
import { ProjectGenerator } from "./generator";
import { parseAddOnsArg } from "./add-ons-parser";

/**
 * Options received from CLI command (raw strings)
 */
export interface InitActionOptions {
  projectName?: string;
  useCurrentDir?: boolean;
  mode?: "install" | "new-project";
  packageManager?: string;
  starter?: string;
  /** Raw add-ons argument from CLI (supports inline options notation: add-on:opt1:opt2+val) */
  addOns?: string;
  git?: boolean;
  install?: boolean;
  docker?: boolean;
}

export async function handleInitAction(
  projectName: string,
  options: InitActionOptions,
) {
  try {
    p.intro("Welcome to Igniter.js!");

    options.projectName = projectName;

    // Parse add-ons with inline options if provided
    const parsedAddOns = options.addOns
      ? parseAddOnsArg(options.addOns)
      : { addOns: [], addOnOptions: {} };

    const config = await runInitPrompts({
      projectName: options.projectName,
      mode: options.mode,
      useCurrentDir: options.useCurrentDir,
      packageManager: options.packageManager,
      starter: options.starter,
      addOns: parsedAddOns.addOns.length > 0 ? parsedAddOns.addOns : undefined,
      addOnOptions: Object.keys(parsedAddOns.addOnOptions).length > 0
        ? parsedAddOns.addOnOptions
        : undefined,
      git: options.git,
      install: options.install,
      docker: options.docker,
    });

    const targetDir = path.resolve(config.projectName);

    const generator = new ProjectGenerator(config, targetDir);
    await generator.generate();

    p.log.success("Project initialized successfully!");
  } catch (error) {
    p.log.error("Project initialization failed");
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

