import * as p from "@clack/prompts";
import * as path from "path";
import { runInitPrompts } from "./prompts";
import { ProjectGenerator } from "./generator";

export interface InitPromptsOptions {
  projectName?: string;
  useCurrentDir?: boolean;
  mode?: "install" | "new-project";
  packageManager?: string;
  starter?: string;
  addOns?: string[];
  git?: boolean;
  install?: boolean;
}

export async function handleInitAction(
  projectName: string,
  options: InitPromptsOptions,
) {
  try {
    p.intro("Welcome to Igniter.js!");

    options.projectName = projectName;

    const config = await runInitPrompts({
      projectName: options.projectName,
      mode: options.mode,
      useCurrentDir: options.useCurrentDir,
      packageManager: options.packageManager,
      starter: options.starter,
      addOns: options.addOns,
      git: options.git,
      install: options.install,
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
