import type { TemplateEngine } from "@/core/template-engine";

export interface SchemaProviderOptions {
  schemaPath?: string;
}

export interface SchemaPromptContext extends SchemaProviderOptions {
  cancel: (message: string) => never;
}

export interface SchemaProviderSelection {
  providerId: string;
  modelName: string;
  schemaPath: string;
}

export interface SchemaGenerationContext {
  featureName: string;
  featureDir: string;
  templateEngine: TemplateEngine;
}

/**
 * Base class for schema-aware feature generators. Providers are responsible for
 * validating their schema sources, collecting interactive input (when needed),
 * and generating feature files.
 */
export abstract class SchemaProvider {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly defaultSchemaPath: string;

  public matchesSchemaOption(option: string): boolean {
    return option.startsWith(`${this.id}:`);
  }

  public parseSchemaOption(
    option: string,
    options: SchemaProviderOptions = {},
  ): SchemaProviderSelection {
    if (!this.matchesSchemaOption(option)) {
      throw new Error(
        `Schema option '${option}' does not match provider '${this.id}'.`,
      );
    }

    const [, rawModel] = option.split(":");
    if (!rawModel || !rawModel.trim()) {
      throw new Error(
        `Missing model name in schema option '${option}'. Use the format '${this.id}:ModelName'.`,
      );
    }

    return {
      providerId: this.id,
      modelName: rawModel.trim(),
      schemaPath: this.resolveSchemaPath(options.schemaPath),
    };
  }

  public resolveSchemaPath(schemaPath?: string): string {
    return schemaPath ?? this.defaultSchemaPath;
  }

  public async isAvailable(options: SchemaProviderOptions = {}): Promise<boolean> {
    try {
      await this.validateSchemaPath(this.resolveSchemaPath(options.schemaPath));
      return true;
    } catch {
      return false;
    }
  }

  public async validateSelection(
    selection: SchemaProviderSelection,
  ): Promise<void> {
    await this.validateSchemaPath(selection.schemaPath);
    const models = await this.listModels(selection.schemaPath);
    if (!models.includes(selection.modelName)) {
      throw new Error(
        `Model '${selection.modelName}' not found for provider '${this.name}'.`,
      );
    }
  }

  public async promptForSelection(
    _context: SchemaPromptContext,
  ): Promise<SchemaProviderSelection | null> {
    return null;
  }

  public abstract validateSchemaPath(schemaPath?: string): Promise<void>;

  public abstract listModels(schemaPath?: string): Promise<string[]>;

  public abstract generateFeature(
    selection: SchemaProviderSelection,
    context: SchemaGenerationContext,
  ): Promise<void>;
}
