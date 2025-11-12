import * as p from "@clack/prompts";
import { FeatureWorkspace } from "./feature";

/**
 * Encapsulates all interactive prompts required for feature generation.
 */
export abstract class FeaturePrompts {
  protected constructor() {}

  /**
   * Asks the user to confirm or supply a feature name.
   */
  public static async askForFeatureName(cancelMessage: string, initial?: string): Promise<string> {
    return this.askForEntityName({
      message: "What is the name of your feature?",
      placeholder: initial || "users",
      cancelMessage,
    });
  }

  /**
   * Resolves the feature slug either from user input or from available features.
   */
  public static async resolveFeatureSlug(
    cancelMessage: string,
    initial?: string,
  ): Promise<string> {
    if (initial) {
      const validation = this.validateSlug(initial);
      if (validation === true) {
        return initial.trim().toLowerCase();
      }
      throw new Error(typeof validation === "string" ? validation : "Invalid feature name.");
    }

    const existing = await FeatureWorkspace.listFeatures();
    if (existing.length === 0) {
      return this.askForFeatureName(cancelMessage);
    }

    const selection = await p.select({
      message: "Select the target feature:",
      options: [
        ...existing.map((feature) => ({
          label: feature,
          value: feature,
        })),
        { label: "Create a new feature", value: "__new__" },
      ],
      initialValue: existing[0],
    });

    if (p.isCancel(selection)) {
      this.cancel(cancelMessage);
    }

    if (selection === "__new__") {
      return this.askForFeatureName(cancelMessage);
    }

    return String(selection);
  }

  /**
   * Generic helper for asking an entity name while applying the standard validation.
   */
  public static async askForEntityName({
    message,
    placeholder,
    cancelMessage,
  }: {
    message: string;
    placeholder: string;
    cancelMessage: string;
  }): Promise<string> {
    const response = await p.text({
      message,
      placeholder,
      validate: (value) => {
        const validation = this.validateSlug(value);
        if (validation === true) {
          return undefined;
        }
        return validation;
      },
    });

    if (p.isCancel(response)) {
      this.cancel(cancelMessage);
    }

    return String(response).trim();
  }

  private static validateSlug(value: string | undefined): true | string {
    if (!value || !value.trim()) {
      return "A value is required.";
    }
    if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value.trim())) {
      return "Use letters, numbers, hyphens, and underscores only (must start with a letter).";
    }
    return true;
  }

  private static cancel(message: string): never {
    p.cancel(message);
    process.exit(0);
  }
}
