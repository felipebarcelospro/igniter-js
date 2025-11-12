import { existsSync } from "fs";
import * as path from "path";
import * as p from "@clack/prompts";
import { createLogger } from "@/core/logger";
import { TemplateEngine } from "@/core/template-engine";
import { FeatureWorkspace } from "./feature";
import { FeaturePrompts } from "./prompts";
import { SchemaProviderRegistry } from "./providers/registry";
import { PrismaSchemaProvider } from "./providers/prisma";
import type { SchemaProvider, SchemaProviderSelection } from "./providers/base";
import { Casing } from "@/utils/casing";

const logger = createLogger("generate:feature");

interface GenerateOptions {
  schema?: string;
  schemaPath?: string;
}

function cancelOperation(message: string): never {
  p.cancel(message);
  process.exit(0);
}

export async function handleGenerateFeatureAction(
  name: string | undefined,
  options: GenerateOptions,
): Promise<void> {
  p.intro("Generate Feature");

  const templateEngine = TemplateEngine.create();
  const registry = SchemaProviderRegistry.create()
    .register(new PrismaSchemaProvider())
    .build();

  const featureInput =
    name ??
    (await FeaturePrompts.askForFeatureName("Feature generation cancelled."));
  const featureSlug = Casing.toKebabCase(featureInput);
  const featureDir = FeatureWorkspace.featureDir(featureSlug);

  if (existsSync(featureDir)) {
    p.log.error(
      `Feature '${featureSlug}' already exists at ${path.relative(process.cwd(), featureDir)}.`,
    );
    p.outro("Nothing to do.");
    process.exit(1);
  }

  await FeatureWorkspace.ensureStructure(featureDir);

  const { provider, selection } = await resolveSchemaProvider({
    registry,
    options,
    cancel: cancelOperation,
  });

  const spinner = p.spinner();
  spinner.start(`Scaffolding feature '${featureSlug}'...`);

  try {
    if (provider && selection) {
      await provider.generateFeature(selection, {
        featureName: featureSlug,
        featureDir,
        templateEngine,
      });
    } else {
      await generateEmptyFeature(featureSlug, featureDir, templateEngine);
    }

    spinner.stop(`Feature '${featureSlug}' created successfully!`);
    p.log.success(
      `Scaffolded feature '${featureSlug}'. Remember to register the controller in your router.`,
    );
    p.outro("Feature generation complete!");
  } catch (error) {
    spinner.stop("Failed to scaffold the feature.");
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Feature generation failed", { error: message });
    p.log.error(message);
    process.exit(1);
  }
}

async function resolveSchemaProvider({
  registry,
  options,
  cancel,
}: {
  registry: SchemaProviderRegistry;
  options: GenerateOptions;
  cancel: (message: string) => never;
}): Promise<{
  provider: SchemaProvider | null;
  selection: SchemaProviderSelection | null;
}> {
  if (options.schema) {
    const provider = registry.findBySchemaOption(options.schema);
    if (!provider) {
      throw new Error(
        `No registered schema provider can handle '${options.schema}'.`,
      );
    }
    const selection = provider.parseSchemaOption(options.schema, {
      schemaPath: options.schemaPath,
    });
    await provider.validateSelection(selection);
    return { provider, selection };
  }

  const availableProviders = await registry.detectAvailableProviders({
    schemaPath: options.schemaPath,
  });

  if (availableProviders.length === 0) {
    return { provider: null, selection: null };
  }

  const choice = await p.select({
    message: "Generate from an available schema provider?",
    options: [
      { value: "none", label: "No, create an empty feature" },
      ...availableProviders.map((provider) => ({
        value: provider.id,
        label: provider.name,
      })),
    ],
    initialValue: "none",
  });

  if (p.isCancel(choice)) {
    cancel("Feature generation cancelled.");
  }

  if (choice === "none") {
    return { provider: null, selection: null };
  }

  const provider = registry.get(String(choice));
  if (!provider) {
    throw new Error(`Schema provider '${choice}' is not registered.`);
  }

  const selection = await provider.promptForSelection({
    schemaPath: options.schemaPath,
    cancel,
  });

  if (!selection) {
    return { provider: null, selection: null };
  }

  await provider.validateSelection(selection);
  return { provider, selection };
}

async function generateEmptyFeature(
  featureSlug: string,
  featureDir: string,
  templateEngine: TemplateEngine,
): Promise<void> {
  const controllerTemplate = templateEngine.resolvePath(
    "generate",
    "feature",
    "empty.controller.hbs",
  );
  const interfacesTemplate = templateEngine.resolvePath(
    "generate",
    "feature",
    "empty.interfaces.hbs",
  );

  const controllerExport = `${Casing.toPascalCase(featureSlug)}Controller`;
  const controllerDisplayName = Casing.toPascalCase(featureSlug);

  await templateEngine.renderToFile(
    controllerTemplate,
    {
      controllerExport,
      controllerDisplayName,
      controllerRoute: featureSlug,
    },
    path.join(featureDir, "controllers", `${featureSlug}.controller.ts`),
  );

  await templateEngine.renderToFile(
    interfacesTemplate,
    { featureName: Casing.toPascalCase(featureSlug) },
    path.join(featureDir, `${featureSlug}.interfaces.ts`),
  );
}
