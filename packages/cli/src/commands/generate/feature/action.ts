import * as path from "path";
import * as p from "@clack/prompts";
import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { TemplateEngine } from "@/core/template-engine";
import { FeatureWorkspace } from "./feature";
import { FeaturePrompts } from "./prompts";
import { schemaProviderRegistry } from "@/registry/schema-provider";
import { Casing } from "@/utils/casing";
import type { SchemaProvider, SchemaProviderSelection } from "@/core/registry/schema-provider/base-schema-provider";
import type { SchemaProviderRegistry } from "@/core/registry/schema-provider/schema-provider-registry";

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
  
  const { provider, selection } = await resolveSchemaProvider({
    registry: schemaProviderRegistry,
    options,
    cancel: cancelOperation,
  });

  let featureInput = name

  if (!featureInput) {
    featureInput = await FeaturePrompts.askForFeatureName("Feature generation cancelled.", selection?.modelName);
  }

  const featureSlug = Casing.toKebabCase(featureInput);
  const featureDir = FeatureWorkspace.featureDir(featureSlug);

  if (existsSync(featureDir)) {
    p.log.error(
      `Feature '${featureSlug}' already exists at ${path.relative(process.cwd(), featureDir)}.`,
    );
    p.outro("Nothing to do.");
    process.exit(1);
  }

  const spinner = p.spinner();
  spinner.start(`Scaffolding feature '${featureSlug}'...`);

  try {
    if (provider && selection) {
      await FeatureWorkspace.ensureStructure(featureDir);

      await provider.generateFeature(selection, {
        featureName: featureSlug,
        featureDir,
        templateEngine,
      });
    } else {
      await FeatureWorkspace.ensureStructure(featureDir);

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
    p.log.error(`Feature generation failed: ${message}`);
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
    throw new Error(`Schema provider '${String(choice)}' is not registered.`);
  }

  const schemaPath = provider.resolveSchemaPath(options.schemaPath);

  const selection = await provider.listModels(schemaPath);
  if (selection.length === 0) {
    return { provider: null, selection: null };
  }
  
  const modelChoice = await p.select({
    message: "Which model would you like to scaffold?",
    options: selection.map((model) => ({ value: model, label: model })),
    initialValue: selection[0],
  });

  return { provider, selection: { providerId: provider.id, modelName: String(modelChoice), schemaPath: schemaPath } };
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
  
  await writeFile(path.join(featureDir, "procedures", ".gitkeep"), "");
}
