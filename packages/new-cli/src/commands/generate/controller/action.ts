import * as path from "path";
import * as p from "@clack/prompts";
import { createLogger } from "@/core/logger";
import { ensureFeatureStructure, getFeatureDir, fileExists } from "@/commands/generate/feature/feature-fs";
import { ensureIndexExport } from "@/commands/generate/feature/index-manager";
import { renderTemplateToFile, resolveTemplatePath } from "@/core/template-engine";
import { toCamelCase, toKebabCase, toPascalCase } from "@/utils/casing";
import { isValidName, promptForName, resolveFeatureSlug } from "@/commands/generate/feature/prompts";

const logger = createLogger("generate:controller");

interface ControllerOptions {
  feature?: string;
}

function cancel(message: string): never {
  p.cancel(message);
  process.exit(0);
}

export async function handleGenerateControllerAction(
  name: string | undefined,
  options: ControllerOptions,
): Promise<void> {
  p.intro("Generate Controller");

  let controllerName = name;
  if (!controllerName) {
    controllerName = await promptForName(
      "What is the name of the controller?",
      "profile",
      cancel,
      "Controller generation cancelled.",
    );
  } else {
    if (!isValidName(controllerName)) {
      p.log.error(
        "Controller name must start with a letter and may contain letters, numbers, hyphens, or underscores.",
      );
      process.exit(1);
    }
  }

  const controllerSlug = toKebabCase(controllerName);
  const controllerVariable = `${toCamelCase(controllerSlug)}Controller`;
  const controllerDisplay = toPascalCase(controllerSlug);

  let featureSlug: string;
  try {
    featureSlug = await resolveFeatureSlug(
      cancel,
      options.feature,
      "Controller generation cancelled.",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(message);
    process.exit(1);
  }

  const featureDir = getFeatureDir(featureSlug);
  await ensureFeatureStructure(featureDir);

  const controllerTemplate = resolveTemplatePath(
    "generate",
    "feature",
    "empty.controller.hbs",
  );
  const controllerPath = path.join(
    featureDir,
    "controllers",
    `${controllerSlug}.controller.ts`,
  );

  if (await fileExists(controllerPath)) {
    p.log.error(
      `Controller '${controllerSlug}' already exists at ${path.relative(process.cwd(), controllerPath)}.`,
    );
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start(
    `Creating controller '${controllerSlug}' inside feature '${featureSlug}'...`,
  );

  try {
    await renderTemplateToFile(
      controllerTemplate,
      {
        controllerVariable,
        controllerName: controllerDisplay,
        controllerRoute: controllerSlug,
      },
      controllerPath,
    );

    await ensureIndexExport(
      featureDir,
      "controller",
      `${controllerSlug}.controller`,
    );

    spinner.stop("Controller created successfully!");
    p.log.success(
      `Created controller '${controllerSlug}' in feature '${featureSlug}'.`,
    );
    p.outro("Controller generation complete!");
  } catch (error) {
    spinner.stop("Failed to create the controller.");
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Controller generation failed", { error: message });
    p.log.error(message);
    process.exit(1);
  }
}
