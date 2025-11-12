import * as path from "path";
import * as p from "@clack/prompts";
import { FeatureWorkspace } from "@/commands/generate/feature/feature";
import { FeaturePrompts } from "@/commands/generate/feature/prompts";
import { TemplateEngine } from "@/core/template-engine";
import { Casing } from "@/utils/casing";
import { tryCatch } from "@/utils/try-catch";
import { rm } from "fs/promises";

interface ProcedureOptions {
  feature?: string;
}

export async function handleGenerateProcedureAction(
  name: string | undefined,
  options: ProcedureOptions,
): Promise<void> {
  p.intro("Generate Procedure");

  let procedureInput =
    name

  if (!procedureInput) {
    procedureInput = await FeaturePrompts.askForEntityName({
      message: "What is the name of the procedure?",
      placeholder: "profile",
      cancelMessage: "Procedure generation cancelled.",
    });
  }

  const procedureSlug = Casing.toKebabCase(procedureInput);
  const procedureExport = `${Casing.toPascalCase(procedureSlug)}Procedure`;
  const procedureDisplay = Casing.toPascalCase(procedureSlug);

  const selectedFeature = await tryCatch(FeaturePrompts.resolveFeatureSlug(
    "Procedure generation cancelled.",
    options.feature,
  ));

  if (selectedFeature.error) {
    p.log.error(`Procedure generation failed: ${selectedFeature.error.message}`);
    process.exit(1);
  }

  const featureSlug = Casing.toKebabCase(selectedFeature.data);

  const featureDir = FeatureWorkspace.featureDir(featureSlug);
  await FeatureWorkspace.ensureStructure(featureDir);

  const procedurePath = path.join(
    featureDir,
    "procedures",
    `${procedureSlug}.procedure.ts`,
  );

  if (await FeatureWorkspace.fileExists(procedurePath)) {
    p.log.error(
      `Procedure '${procedureSlug}' already exists at ${path.relative(process.cwd(), procedurePath)}.`,
    );
    process.exit(1);
  }

  const templateEngine = TemplateEngine.create();
  const procedureTemplate = templateEngine.resolvePath(
    "generate",
    "feature",
    "procedure.hbs",
  );

  const spinner = p.spinner();
  spinner.start(
    `Creating procedure '${procedureSlug}' inside feature '${featureSlug}'...`,
  );

  if (await FeatureWorkspace.fileExists(path.join(featureDir, "procedures", ".gitkeep"))) {
    await rm(path.join(featureDir, "procedures", ".gitkeep"));
  }

  try {
    await templateEngine.renderToFile(
      procedureTemplate,
      {
        procedureExport,
        procedureDisplayName: procedureDisplay,
        featureName: Casing.toKebabCase(featureSlug),
      },
      procedurePath,
    );

    spinner.stop("Procedure created successfully!");
    p.log.success(
      `Created procedure '${procedureSlug}' in feature '${featureSlug}'.`,
    );
    p.outro("Procedure generation complete!");
  } catch (error) {
    spinner.stop("Failed to create the procedure.");
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(`Procedure generation failed: ${message}`);
    process.exit(1);
  }
}
