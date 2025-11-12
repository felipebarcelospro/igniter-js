import { mkdirSync, existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import handlebars from "handlebars";
import { fileURLToPath } from "url";
import { registerHandlebarsHelpers } from "./handlebars-helpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Abstract template engine used to render Handlebars templates within the CLI.
 * Concrete implementations can customise discovery or rendering behaviour while
 * callers depend on the abstract API only.
 */
export abstract class TemplateEngine {
  protected constructor() {}

  /**
   * Creates the default template engine.
   */
  public static create(): TemplateEngine {
    return new DefaultTemplateEngine();
  }

  /**
   * Resolves a template path relative to the CLI template root.
   */
  public abstract resolvePath(...segments: string[]): string;

  /**
   * Renders a template and returns its content as a string.
   */
  public abstract render(
    templatePath: string,
    context: Record<string, unknown>,
  ): Promise<string>;

  /**
   * Renders a template and writes the result to the provided output path.
   */
  public abstract renderToFile(
    templatePath: string,
    context: Record<string, unknown>,
    outputPath: string,
  ): Promise<void>;
}

class DefaultTemplateEngine extends TemplateEngine {
  private readonly templateRoot: string;
  private helpersRegistered = false;

  private static readonly TEMPLATE_CANDIDATES = [
    path.resolve(__dirname, "..", "..", "templates"),
    path.resolve(__dirname, "..", "..", "..", "templates"),
    path.resolve(__dirname, "..", "templates"),
    path.resolve(__dirname, "..", "..", "..", "templates"),
    path.resolve(
      process.cwd(),
      "node_modules",
      "@igniter-js",
      "new-cli",
      "templates",
    ),
    path.resolve(process.cwd(), "templates"),
  ];

  constructor() {
    super();
    this.templateRoot = this.resolveTemplateRoot();
  }

  public resolvePath(...segments: string[]): string {
    return path.join(this.templateRoot, ...segments);
  }

  public async render(
    templatePath: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    this.ensureHelpersRegistered();
    const templateContent = await readFile(templatePath, "utf-8");
    const compiled = handlebars.compile(templateContent);
    return compiled(context);
  }

  public async renderToFile(
    templatePath: string,
    context: Record<string, unknown>,
    outputPath: string,
  ): Promise<void> {
    const rendered = await this.render(templatePath, context);
    const outputDir = path.dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    await writeFile(outputPath, rendered, "utf-8");
  }

  private resolveTemplateRoot(): string {
    for (const candidate of DefaultTemplateEngine.TEMPLATE_CANDIDATES) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      [
        "Could not locate the CLI templates directory.",
        "Looked in the following locations:",
        ...DefaultTemplateEngine.TEMPLATE_CANDIDATES.map(
          (candidate) => `- ${candidate}`,
        ),
      ].join("\n"),
    );
  }

  private ensureHelpersRegistered(): void {
    if (!this.helpersRegistered) {
      registerHandlebarsHelpers();
      this.helpersRegistered = true;
    }
  }
}
