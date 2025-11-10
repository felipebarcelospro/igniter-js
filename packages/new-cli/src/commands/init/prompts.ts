import * as p from "@clack/prompts";
import * as path from "path";
import { detectPackageManager } from "@/core/package-manager";
import { ProjectSetupConfig } from "@/commands/init/types";
import { starterRegistry } from "@/registry/starters";
import { addOnRegistry } from "@/registry/add-ons";
import type { InitPromptsOptions } from "./action";
import { isPathEmpty } from "@/core/file-system";
import { detectFramework } from "@/core/framework";
import type { AddOnOption } from "@/registry/types";

async function processAddOnOptions(
  options: AddOnOption[],
): Promise<Record<string, string[] | string | undefined>> {
  const selectedOptions: Record<string, string[] | string | undefined> = {};

  for (const option of options) {
    let selectedValues: string[] | string | undefined = undefined;

    if (option.multiple) {
      const values = await p.multiselect({
        message: option.message,
        options: option.choices.map((choice: any) => ({
          value: choice.value,
          label: choice.label,
          hint: choice.hint,
        })),
      });
      selectedValues = values as unknown as string[];
    } else {
      const value = await p.select({
        message: option.message,
        options: option.choices.map((choice) => ({
          value: choice.value,
          label: choice.label,
          hint: choice.hint,
        })),
      });
      selectedValues = value as string | undefined;
    }

    selectedOptions[option.key] = selectedValues;

    // Process sub-options if they exist for the selected choice(s)
    const valuesToProcess = Array.isArray(selectedValues)
      ? selectedValues
      : selectedValues
        ? [selectedValues]
        : [];

    for (const value of valuesToProcess) {
      const choice = option.choices.find((c) => c.value === value);
      if (choice?.subOptions && choice.subOptions.length > 0) {
        const subOptionsResult = await processAddOnOptions(choice.subOptions);
        Object.assign(selectedOptions, subOptionsResult);
      }
    }
  }

  return selectedOptions;
}

export async function runInitPrompts(
  options: InitPromptsOptions,
): Promise<ProjectSetupConfig> {
  const detectedPackageManager = detectPackageManager();

  const config = await p.group(
    {
      useCurrentDir: async () => {
        if (options.projectName) return false;
        return p.confirm({
          message: `Do you want to use current folder as a project directory?`,
          initialValue: false,
        });
      },
      projectName: async ({ results }) => {
        if (options.projectName) return options.projectName;
        if (results.useCurrentDir) return path.basename(process.cwd());
        const projectName = await p.text({
          message: "What will your project be called?",
          validate: (value) => {
            if (!value.trim()) return "Project name is required";
            if (!/^[a-z0-9-_]+$/i.test(value.trim())) {
              return "Project name can only contain letters, numbers, hyphens, and underscores";
            }
            return;
          },
        });
        return projectName as string;
      },
      mode: async ({ results }) => {
        const projectName = results.projectName as string;

        const targetDir = path.resolve(projectName);
        const isEmpty = await isPathEmpty(targetDir);

        if (!isEmpty) {
          return await p.select({
            message: `Directory '${projectName}' is not empty. Do you want to overwrite with starter ou just install Igniter.js?`,
            options: [
              { value: "new-project", label: "Overwrite and select a starter" },
              { value: "install", label: "Just install Igniter.js" },
            ],
          });
        }

        return "new-project";
      },
      starter: async ({ results }) => {
        if (results.mode !== "new-project") {
          const targetDir = path.resolve(results.projectName as string);
          const framework = detectFramework(targetDir);
          if (framework === "nextjs") {
            return "nextjs";
          } else if (framework === "tanstack-start") {
            return "tanstack-start";
          } else {
            return "generic";
          }
        }

        return await p.select({
          message: "Which starter would you like to use?",
          options: starterRegistry.getAll().map((s) => ({
            value: s.id,
            label: s.name,
            hint: s.hint,
          })),
        });
      },
      addOns: async () => {
        const addOnResult = await p.multiselect({
          message: "What add-ons would you like for your project?",
          options: addOnRegistry.getAll().map((f) => ({
            value: f.value,
            label: f.name,
            hint: f.hint,
          })),
        });

        return addOnResult as unknown as string[];
      },
      addOnOptions: async ({ results }) => {
        const addOnOptions: Record<
          string,
          Record<string, string[] | string | undefined>
        > = {};
        for (const addOnValue of results.addOns || []) {
          const addOn = addOnRegistry.get(addOnValue);
          if (addOn?.options && addOn.options.length > 0) {
            addOnOptions[addOnValue] = await processAddOnOptions(addOn.options);
          }
        }
        return addOnOptions;
      },
      packageManager: () =>
        p.select({
          message: "Which package manager?",
          initialValue: detectedPackageManager,
          options: [
            { value: "npm", label: "npm" },
            { value: "yarn", label: "yarn" },
            { value: "pnpm", label: "pnpm" },
            { value: "bun", label: "bun" },
          ],
        }),
      initDocker: ({ results }) => {
        const hasAnyAddOn = results.addOns && results.addOns.length > 0;

        if (!hasAnyAddOn) return;
        return p.confirm({
          message: "Setup Docker services for development?",
          initialValue: true,
        });
      },
      initGit: () =>
        p.confirm({
          message: "Initialize Git repository?",
          initialValue: true,
        }),
      installDependencies: () =>
        p.confirm({
          message: "Install dependencies automatically?",
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        p.cancel("Operation cancelled.");
        process.exit(0);
      },
    },
  );

  return {
    projectName: config.projectName,
    mode: config.mode,
    starter: config.starter,
    packageManager: config.packageManager,
    initGit: config.initGit,
    addOns: config.addOns,
    addOnOptions: config.addOnOptions,
    initDocker: config.initDocker,
    installDependencies: config.installDependencies,
  } as ProjectSetupConfig;
}
