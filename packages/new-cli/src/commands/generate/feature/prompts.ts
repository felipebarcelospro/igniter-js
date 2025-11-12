import * as p from "@clack/prompts";
import { listFeatureDirectories } from "./feature-fs";
import { toKebabCase } from "@/utils/casing";

export function isValidName(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9-_]*$/.test(value);
}

export async function promptForName(
  message: string,
  placeholder: string,
  cancel: (message: string) => never,
  cancelMessage: string,
): Promise<string> {
  const response = await p.text({
    message,
    placeholder,
    validate: (value) => {
      if (!value || !value.trim()) {
        return "A value is required.";
      }
      if (!isValidName(value.trim())) {
        return "Use letters, numbers, hyphens, and underscores only (must start with a letter).";
      }
    },
  });

  if (p.isCancel(response)) {
    cancel(cancelMessage);
  }

  return response.trim();
}

export async function resolveFeatureSlug(
  cancel: (message: string) => never,
  initial?: string,
  cancelMessage: string = "Operation cancelled.",
): Promise<string> {
  if (initial) {
    if (!isValidName(initial)) {
      throw new Error(
        "Feature name must start with a letter and may contain letters, numbers, hyphens, or underscores.",
      );
    }
    return toKebabCase(initial);
  }

  const features = await listFeatureDirectories();

  if (features.length === 0) {
    const name = await promptForName(
      "What is the name of the feature?",
      "users",
      cancel,
      cancelMessage,
    );
    return toKebabCase(name);
  }

  const selection = await p.select({
    message: "Select the target feature:",
    options: [
      ...features.map((feature) => ({
        label: feature,
        value: feature,
      })),
      {
        label: "Create a new feature",
        value: "__new__",
      },
    ],
    initialValue: features[0],
  });

  if (p.isCancel(selection)) {
    cancel(cancelMessage);
  }

  if (selection === "__new__") {
    const name = await promptForName(
      "Name of the new feature:",
      "inventory",
      cancel,
      cancelMessage,
    );
    return toKebabCase(name);
  }

  return toKebabCase(selection);
}
