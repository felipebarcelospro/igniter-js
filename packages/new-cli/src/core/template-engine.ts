import { mkdirSync, existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import handlebars from "handlebars";
import { registerHandlebarsHelpers } from "./handlebars-helpers";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let helpersRegistered = false;
let cachedTemplateRoot: string | null = null;

const TEMPLATE_CANDIDATES = [
  // When running from the transpiled dist directory
  path.resolve(__dirname, "..", "..", "templates"),
  path.resolve(__dirname, "..", "..", "..", "templates"),
  // When running from the TypeScript source directory
  path.resolve(__dirname, "..", "templates"),
  path.resolve(__dirname, "..", "..", "..", "templates"),
  // When the CLI is installed as a dependency (e.g. npx)
  path.resolve(
    process.cwd(),
    "node_modules",
    "@igniter-js",
    "new-cli",
    "templates",
  ),
  // Fallback to current working directory (useful during development)
  path.resolve(process.cwd(), "templates"),
];

function ensureHelpersRegistered(): void {
  if (!helpersRegistered) {
    registerHandlebarsHelpers();
    helpersRegistered = true;
  }
}

function resolveTemplateRoot(): string {
  if (cachedTemplateRoot) {
    return cachedTemplateRoot;
  }

  for (const candidate of TEMPLATE_CANDIDATES) {
    if (existsSync(candidate)) {
      cachedTemplateRoot = candidate;
      return candidate;
    }
  }

  throw new Error(
    [
      "Could not locate the CLI templates directory.",
      "Looked in the following locations:",
      ...TEMPLATE_CANDIDATES.map((candidate) => `- ${candidate}`),
    ].join("\n"),
  );
}

export function resolveTemplatePath(...segments: string[]): string {
  const root = resolveTemplateRoot();
  return path.join(root, ...segments);
}

export async function renderTemplate(
  templatePath: string,
  context: Record<string, unknown>,
): Promise<string> {
  ensureHelpersRegistered();
  const templateContent = await readFile(templatePath, "utf-8");
  const compiled = handlebars.compile(templateContent);
  return compiled(context);
}

export async function renderTemplateToFile(
  templatePath: string,
  context: Record<string, unknown>,
  outputPath: string,
): Promise<void> {
  const content = await renderTemplate(templatePath, context);
  const outputDir = path.dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  await writeFile(outputPath, content, "utf-8");
}
