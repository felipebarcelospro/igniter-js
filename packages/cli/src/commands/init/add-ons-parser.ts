import { addOnRegistry } from "@/registry/add-ons";

/**
 * Result of parsing add-ons from CLI argument
 */
export interface ParsedAddOns {
  /** List of add-on IDs */
  addOns: string[];
  /** Options for each add-on, keyed by add-on ID */
  addOnOptions: Record<string, Record<string, string | string[]>>;
}

/**
 * Parses the --add-ons CLI argument with the extended notation.
 * 
 * Format: add-on:option1:option2+value2+value3
 * 
 * Examples:
 *   - "store" → { addOns: ["store"], addOnOptions: {} }
 *   - "database:prisma:postgresql" → { addOns: ["database"], addOnOptions: { database: { orm: "prisma", provider: "postgresql" } } }
 *   - "auth:better-auth:email+two-factor" → { addOns: ["auth"], addOnOptions: { auth: { provider: "better-auth", plugins: ["email", "two-factor"] } } }
 * 
 * @param addOnsArg Comma-separated list of add-ons with optional inline options
 */
export function parseAddOnsArg(addOnsArg: string): ParsedAddOns {
  if (!addOnsArg || addOnsArg.trim() === "") {
    return { addOns: [], addOnOptions: {} };
  }

  const result: ParsedAddOns = {
    addOns: [],
    addOnOptions: {},
  };

  // Split by comma to get individual add-on declarations
  const declarations = addOnsArg.split(",").map((s) => s.trim()).filter(Boolean);

  for (const declaration of declarations) {
    // Split by ":" to get add-on ID and option values
    const parts = declaration.split(":");
    const addOnId = parts[0];
    const optionValues = parts.slice(1);

    result.addOns.push(addOnId);

    // If there are option values, map them to the add-on's option keys
    if (optionValues.length > 0) {
      const addOn = addOnRegistry.get(addOnId);

      if (addOn?.options && addOn.options.length > 0) {
        const options: Record<string, string | string[]> = {};

        // Map option values to option keys in order
        for (let i = 0; i < optionValues.length && i < addOn.options.length; i++) {
          const optionKey = addOn.options[i].key;
          const rawValue = optionValues[i];

          // Check if this option supports multiple values
          if (addOn.options[i].multiple) {
            // Split by "+" for multiple values
            options[optionKey] = rawValue.split("+").map((s) => s.trim()).filter(Boolean);
          } else {
            options[optionKey] = rawValue;
          }
        }

        // Handle nested sub-options from choices
        // For example, if user selects "prisma" for orm, check if prisma has sub-options
        for (let i = 0; i < optionValues.length && i < addOn.options.length; i++) {
          const option = addOn.options[i];
          const selectedValue = optionValues[i];

          // Find the selected choice
          const selectedChoice = option.choices?.find((c) => c.value === selectedValue);

          // If the choice has sub-options, check for more values in the declaration
          if (selectedChoice?.subOptions && selectedChoice.subOptions.length > 0) {
            const subOptionStartIndex = i + 1;

            for (let j = 0; j < selectedChoice.subOptions.length; j++) {
              const subOptionIndex = subOptionStartIndex + j;
              if (subOptionIndex < optionValues.length) {
                const subOption = selectedChoice.subOptions[j];
                const subValue = optionValues[subOptionIndex];

                if (subOption.multiple) {
                  options[subOption.key] = subValue.split("+").map((s) => s.trim()).filter(Boolean);
                } else {
                  options[subOption.key] = subValue;
                }
              }
            }
          }
        }

        result.addOnOptions[addOnId] = options;
      }
    }
  }

  return result;
}

/**
 * Generates the add-ons CLI argument from config.
 * This is the inverse of parseAddOnsArg.
 * 
 * @param addOns List of add-on IDs
 * @param addOnOptions Options for each add-on
 */
export function generateAddOnsArg(
  addOns: string[],
  addOnOptions: Record<string, Record<string, string | string[]>>
): string {
  const parts: string[] = [];

  for (const addOnId of addOns) {
    const options = addOnOptions[addOnId];

    if (!options || Object.keys(options).length === 0) {
      parts.push(addOnId);
      continue;
    }

    const addOn = addOnRegistry.get(addOnId);

    if (!addOn?.options || addOn.options.length === 0) {
      parts.push(addOnId);
      continue;
    }

    // Build the declaration with options in order
    let declaration = addOnId;

    for (const option of addOn.options) {
      const value = options[option.key];

      if (value === undefined) continue;

      if (Array.isArray(value)) {
        declaration += `:${value.join("+")}`;
      } else {
        declaration += `:${value}`;
      }

      // Check for sub-options in the selected choice
      const selectedChoice = option.choices?.find((c) => c.value === value);
      if (selectedChoice?.subOptions) {
        for (const subOption of selectedChoice.subOptions) {
          const subValue = options[subOption.key];

          if (subValue === undefined) continue;

          if (Array.isArray(subValue)) {
            declaration += `:${subValue.join("+")}`;
          } else {
            declaration += `:${subValue}`;
          }
        }
      }
    }

    parts.push(declaration);
  }

  return parts.join(",");
}
