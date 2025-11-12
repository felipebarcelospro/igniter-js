import * as path from "path";
import * as p from "@clack/prompts";
import { createLogger } from "@/core/logger";
import { ensureFeatureStructure, getFeatureDir, fileExists } from "@/commands/generate/feature/feature-fs";
import { ensureIndexExport } from "@/commands/generate/feature/index-manager";
import { renderTemplateToFile, resolveTemplatePath } from "@/core/template-engine";
import { toCamelCase, toKebabCase, toPascalCase } from "@/utils/casing";
import { isValidName, promptForName, resolveFeatureSlug } from "@/commands/generate/feature/prompts";

const logger = createLogger("generate:procedure");

interface ProcedureOptions {
  feature?: string;
}

function cancel(message: string): never {
  p.cancel(message);
  process.exit(0);
}

export async function handleGenerateProcedureAction(
  name: string | undefined,
  options: ProcedureOptions,
): Promise<void> {
  p.intro("Generate Procedure");

  let procedureName = name;
  if (!procedureName) {
    procedureName = await promptForName(
      "What is the name of the procedure?",
      "profile",
      cancel,
      "Procedure generation cancelled.",
    );
  } else {
    if (!isValidName(procedureName)) {
      p.log.error(
        "Procedure name must start with a letter and may contain letters, numbers, hyphens, or underscores.",
      );
      process.exit(1);
    }
  }

  const procedureSlug = toKebabCase(procedureName);
  const procedureVariable = `${toCamelCase(procedureSlug)}Procedure`;
  const procedureDisplay = toPascalCase(procedureSlug);
  const procedureContextKey = toCamelCase(procedureSlug);

  let featureSlug: string;
  try {
    featureSlug = await resolveFeatureSlug(
      cancel,
      options.feature,
      "Procedure generation cancelled.",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    p.log.error(message);
    process.exit(1);
  }

  const featureDir = getFeatureDir(featureSlug);
  await ensureFeatureStructure(featureDir);

  const procedureTemplate = resolveTemplatePath(
    "generate",
    "feature",
    "procedure.hbs",
  );

  const procedurePath = path.join(
    featureDir,
    "procedures",
    `${procedureSlug}.procedure.ts`,
  );

  if (await fileExists(procedurePath)) {
    p.log.error(
      `Procedure '${procedureSlug}' already exists at ${path.relative(process.cwd(), procedurePath)}.`,
    );
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start(
    `Creating procedure '${procedureSlug}' inside feature '${featureSlug}'...`,
  );

  try {
    await renderTemplateToFile(
      procedureTemplate,
      {
        procedureVariable,
        procedureName: procedureDisplay,
        procedureContextKey,
        featureName: toPascalCase(featureSlug),
      },
      procedurePath,
    );

    await ensureIndexExport(
      featureDir,
      "procedure",
      `${procedureSlug}.procedure`,
    );

    spinner.stop("Procedure created successfully!");
    p.log.success(
      `Created procedure '${procedureSlug}' in feature '${featureSlug}'.`,
    );
    p.outro("Procedure generation complete!");
  } catch (error) {
    spinner.stop("Failed to create the procedure.");
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Procedure generation failed", { error: message });
    p.log.error(message);
    process.exit(1);
  }
}
