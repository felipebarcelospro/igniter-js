import * as path from "path";
import * as p from "@clack/prompts";
import { createLogger } from "@/core/logger";
import { FeatureWorkspace } from "@/commands/generate/feature/feature";
import { FeaturePrompts } from "@/commands/generate/feature/prompts";
import { TemplateEngine } from "@/core/template-engine";
import { Casing } from "@/utils/casing";

const logger = createLogger("generate:controller");

interface ControllerOptions {
  feature?: string;
}

export async function handleGenerateControllerAction(
  name: string | undefined,
  options: ControllerOptions,
): Promise<void> {
  p.intro("Generate Controller");

  const controllerInput =
    name ??
    (await FeaturePrompts.askForEntityName({
      message: "What is the name of the controller?",
      placeholder: "profile",
      cancelMessage: "Controller generation cancelled.",
    }));

  const controllerSlug = Casing.toKebabCase(controllerInput);
  const controllerExport = `${Casing.toPascalCase(controllerSlug)}Controller`;
  const controllerDisplay = Casing.toPascalCase(controllerSlug);

  let featureSlug: string;
  try {
    featureSlug = Casing.toKebabCase(
      await FeaturePrompts.resolveFeatureSlug(
        "Controller generation cancelled.",
        options.feature,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(message);
    process.exit(1);
  }

  const featureDir = FeatureWorkspace.featureDir(featureSlug);
  await FeatureWorkspace.ensureStructure(featureDir);

  const controllerPath = path.join(
    featureDir,
    "controllers",
    `${featureSlug}.controller.ts`,
  );

  if (await FeatureWorkspace.fileExists(controllerPath)) {
    p.log.error(
      `Controller '${controllerSlug}' already exists at ${path.relative(process.cwd(), controllerPath)}.`,
    );
    process.exit(1);
  }

  const templateEngine = TemplateEngine.create();
  const controllerTemplate = templateEngine.resolvePath(
    "generate",
    "feature",
    "empty.controller.hbs",
  );

  const spinner = p.spinner();
  spinner.start(
    `Creating controller '${controllerSlug}' inside feature '${featureSlug}'...`,
  );

  try {
    await templateEngine.renderToFile(
      controllerTemplate,
      {
        controllerExport,
        controllerDisplayName: controllerDisplay,
        controllerRoute: featureSlug,
      },
      controllerPath,
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
