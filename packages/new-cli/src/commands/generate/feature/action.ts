import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import * as path from "path";
import * as p from "@clack/prompts";
import { createLogger } from "@/core/logger";
import {
  renderTemplateToFile,
  resolveTemplatePath,
} from "@/core/template-engine";
import {
  hasPrismaSchema,
  getPrismaModels,
} from "./schema-utils";
import { PrismaProvider } from "./providers/prisma";
import { toCamelCase, toKebabCase, toPascalCase, pluralize } from "@/utils/casing";

const logger = createLogger("generate:feature");

interface GenerateOptions {
  schema?: string;
}

interface SchemaTemplateContext {
  modelName: string;
  modelNamePlural: string;
  controllerVariable: string;
  procedureName: string;
  repositoryName: string;
  prismaDelegate: string;
  resourcePath: string;
  idZodType: string;
  featureName: string;
}

interface SchemaInterfaceField {
  name: string;
  zodType: string;
}

function isValidFeatureName(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value);
}

function cancelOperation(message: string): never {
  p.cancel(message);
  process.exit(0);
}

function zodTypeForField(type: string, optional: boolean): string {
  let base: string;
  switch (type) {
    case "string":
      base = "z.string()";
      break;
    case "number":
      base = "z.number()";
      break;
    case "boolean":
      base = "z.boolean()";
      break;
    case "Date":
      base = "z.date()";
      break;
    case "bigint":
      base = "z.bigint()";
      break;
    default:
      base = "z.any()";
  }

  return optional ? `${base}.nullable()` : base;
}

function zodTypeForId(type: string): string {
  switch (type) {
    case "number":
      return "z.coerce.number()";
    case "bigint":
      return "z.coerce.bigint()";
    default:
      return "z.string()";
  }
}

export async function handleGenerateFeatureAction(
  name: string | undefined,
  options: GenerateOptions,
) {
  p.intro("Generate Feature");

  let featureName = name;
  let schemaOption = options.schema;

  if (!featureName) {
    const response = await p.text({
      message: "What is the name of your feature?",
      placeholder: "users",
      validate: (value) => {
        if (!value || !value.trim()) {
          return "Feature name is required.";
        }
        if (!isValidFeatureName(value.trim())) {
          return "Use letters, numbers, hyphens, and underscores only (must start with a letter).";
        }
      },
    });
    if (p.isCancel(response)) {
      cancelOperation("Feature generation cancelled.");
    }
    featureName = response.trim();
  }

  const normalizedFeature = toKebabCase(featureName);
  const featureDir = path.join(
    process.cwd(),
    "src",
    "features",
    normalizedFeature,
  );

  if (existsSync(featureDir)) {
    p.log.error(
      `Feature '${normalizedFeature}' already exists at ${path.relative(process.cwd(), featureDir)}.`,
    );
    p.outro("Nothing to do.");
    process.exit(1);
  }

  if (!schemaOption) {
    const prismaAvailable = await hasPrismaSchema();
    if (prismaAvailable) {
      const models = await getPrismaModels();
      if (models.length > 0) {
        const useModel = await p.select({
          message: "Would you like to generate CRUD operations from a Prisma model?",
          options: [
            {
              value: "none",
              label: "No, create an empty feature",
            },
            {
              value: "select",
              label: "Yes, choose a Prisma model",
            },
          ],
          initialValue: "none",
        });
        if (p.isCancel(useModel)) {
          cancelOperation("Feature generation cancelled.");
        }

        if (useModel === "select") {
          const selectedModel = await p.select({
            message: "Pick the Prisma model to scaffold:",
            options: models.map((model) => ({
              value: model,
              label: model,
            })),
          });
          if (p.isCancel(selectedModel)) {
            cancelOperation("Feature generation cancelled.");
          }
          schemaOption = `prisma:${selectedModel}`;
        }
      }
    }
  }

  const spinner = p.spinner();
  spinner.start(`Scaffolding feature '${normalizedFeature}'...`);

  try {
    if (schemaOption) {
      await generateFeatureFromSchema({
        featureName: normalizedFeature,
        featureDir,
        schema: schemaOption,
      });
    } else {
      await generateEmptyFeature({
        featureName: normalizedFeature,
        featureDir,
      });
    }

    spinner.stop(`Feature '${normalizedFeature}' created successfully!`);
    p.log.success(
      `Scaffolded feature '${normalizedFeature}'. Remember to export the controller in your router.`,
    );
    p.outro("Feature generation complete!");
  } catch (error) {
    spinner.stop("Failed to scaffold the feature.");
    const message =
      error instanceof Error ? error.message : String(error);
    p.log.error(message);
    logger.error("Feature generation failed", { error: message });
    process.exit(1);
  }
}

async function generateEmptyFeature(params: {
  featureName: string;
  featureDir: string;
}): Promise<void> {
  const { featureName, featureDir } = params;

  const controllerVariable = `${toCamelCase(featureName)}Controller`;
  const controllerTemplate = resolveTemplatePath(
    "generate",
    "feature",
    "empty.controller.hbs",
  );
  const interfacesTemplate = resolveTemplatePath(
    "generate",
    "feature",
    "empty.interfaces.hbs",
  );
  const indexTemplate = resolveTemplatePath(
    "generate",
    "feature",
    "index.hbs",
  );

  const controllerPath = path.join(
    featureDir,
    "controllers",
    `${featureName}.controller.ts`,
  );
  const interfacesPath = path.join(
    featureDir,
    `${featureName}.interfaces.ts`,
  );
  const indexPath = path.join(featureDir, "index.ts");
  const proceduresDir = path.join(featureDir, "procedures");

  await renderTemplateToFile(controllerTemplate, {
    controllerVariable,
    controllerName: toPascalCase(featureName),
    controllerRoute: featureName,
  }, controllerPath);

  await renderTemplateToFile(
    interfacesTemplate,
    { featureName: toPascalCase(featureName) },
    interfacesPath,
  );

  await renderTemplateToFile(
    indexTemplate,
    {
      hasController: true,
      controllerFile: `${featureName}.controller`,
      hasProcedure: false,
      procedureFile: "",
      hasInterfaces: true,
      interfacesFile: `${featureName}.interfaces`,
    },
    indexPath,
  );

  await mkdir(proceduresDir, { recursive: true });
}

async function generateFeatureFromSchema(params: {
  featureName: string;
  featureDir: string;
  schema: string;
}): Promise<void> {
  const { featureName, featureDir, schema } = params;
  const [providerName, modelName] = schema.split(":");

  if (!providerName || !modelName) {
    throw new Error(
      "Invalid schema option. Use the format '<provider>:<ModelName>' (e.g., 'prisma:User').",
    );
  }

  if (providerName !== "prisma") {
    throw new Error(
      `Schema provider '${providerName}' is not supported yet.`,
    );
  }

  const provider = new PrismaProvider();
  const model = await provider.getModel(modelName);
  if (!model) {
    throw new Error(
      `Model '${modelName}' not found in Prisma schema.`,
    );
  }

  const modelNamePascal = toPascalCase(model.name);
  const modelNameCamel = toCamelCase(model.name);
  const modelPluralPascal = pluralize(modelNamePascal);
  const resourcePath = pluralize(modelNameCamel);

  const controllerVariable = `${modelNameCamel}Controller`;
  const procedureName = `${modelNameCamel}Procedure`;
  const repositoryName = `${modelNameCamel}Repository`;
  const prismaDelegate = modelNameCamel;

  const idField =
    model.fields.find((field) => field.isId) ??
    model.fields.find((field) => field.isUnique);

  if (!idField) {
    throw new Error(
      `Model '${model.name}' does not have an identifiable id field.`,
    );
  }

  const interfaceFields: SchemaInterfaceField[] = model.fields
    .filter((field) => !field.isRelation)
    .map((field) => ({
      name: field.name,
      zodType: zodTypeForField(field.type, !field.isRequired),
    }));

  const createOmitFields = model.fields
    .filter((field) => field.isId || field.isAutoGenerated || field.hasDefault)
    .map((field) => field.name);

  const schemaInterfacesTemplate = resolveTemplatePath(
    "generate",
    "feature",
    "schema.interfaces.hbs",
  );
  const schemaProcedureTemplate = resolveTemplatePath(
    "generate",
    "feature",
    "schema.procedure.hbs",
  );
  const schemaControllerTemplate = resolveTemplatePath(
    "generate",
    "feature",
    "schema.controller.hbs",
  );
  const indexTemplate = resolveTemplatePath(
    "generate",
    "feature",
    "index.hbs",
  );

  const controllerPath = path.join(
    featureDir,
    "controllers",
    `${featureName}.controller.ts`,
  );
  const procedurePath = path.join(
    featureDir,
    "procedures",
    `${featureName}.procedure.ts`,
  );
  const interfacesPath = path.join(
    featureDir,
    `${featureName}.interfaces.ts`,
  );
  const indexPath = path.join(featureDir, "index.ts");

  await renderTemplateToFile(
    schemaInterfacesTemplate,
    {
      modelName: modelNamePascal,
      fields: interfaceFields,
      createOmitFields,
    },
    interfacesPath,
  );

  await renderTemplateToFile(
    schemaProcedureTemplate,
    {
      modelName: modelNamePascal,
      procedureName,
      repositoryName,
      prismaDelegate,
      featureName,
      idType: idField.type,
    },
    procedurePath,
  );

  const controllerContext: SchemaTemplateContext = {
    modelName: modelNamePascal,
    modelNamePlural: modelPluralPascal,
    controllerVariable,
    procedureName,
    repositoryName,
    prismaDelegate,
    resourcePath,
    idZodType: zodTypeForId(idField.type),
    featureName,
  };

  await renderTemplateToFile(
    schemaControllerTemplate,
    controllerContext,
    controllerPath,
  );

  await renderTemplateToFile(
    indexTemplate,
    {
      hasController: true,
      controllerFile: `${featureName}.controller`,
      hasProcedure: true,
      procedureFile: `${featureName}.procedure`,
      hasInterfaces: true,
      interfacesFile: `${featureName}.interfaces`,
    },
    indexPath,
  );
}
