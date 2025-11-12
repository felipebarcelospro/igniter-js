import type {
  AddOnOption,
  RegistryAssetDependency,
  RegistryAssetDockerService,
  RegistryAssetEnvVar,
  RegistryAssetTemplate,
} from "@/registry/types";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import handlebars from "handlebars";
import { registerHandlebarsHelpers } from "../../handlebars-helpers";
import type { ProjectSetupConfig } from "@/commands/init/types";

type SetupFunction = (
  projectDir: string,
  config: ProjectSetupConfig,
) => Promise<void>;

// Export the new class
export abstract class BaseAddOn {
  abstract name: string;
  abstract description: string;
  abstract value: string;
  abstract hint?: string;
  templates?: RegistryAssetTemplate[];
  dependencies?: RegistryAssetDependency[];
  dockerServices?: RegistryAssetDockerService[];
  envVars?: RegistryAssetEnvVar[];
  options?: AddOnOption[];


  public async runSetup(
    projectDir: string,
    config: ProjectSetupConfig,
  ): Promise<void> {
    // Orchestrate only: each method self-collects its required assets
    await this.addToPackageJson(projectDir, config);
    await this.addToDockerCompose(projectDir, config);
    await this.addToEnvFile(projectDir, config);
    await this.renderTemplates(projectDir, config);
  }

  /**
   * Add dependencies to package.json file
   */
  private async addToPackageJson(
    projectDir: string,
    config: ProjectSetupConfig,
  ): Promise<void> {
    // Collect dependencies from base add-on and selected options
    const selectedOptions = config.addOnOptions?.[this.value] || {};
    const collectDependencies = (options: AddOnOption[] = []): RegistryAssetDependency[] => {
      const out: RegistryAssetDependency[] = [];
      for (const option of options) {
        const selectedValue = selectedOptions[option.key];
        if (!selectedValue) continue;
        if (option.setup) {
          // setup functions are handled elsewhere
        }
        const selectedChoices = Array.isArray(selectedValue)
          ? selectedValue
          : [selectedValue];
        for (const value of selectedChoices) {
          const choice = option.choices.find((c) => c.value === value);
          if (!choice) continue;
          if (choice.dependencies) out.push(...choice.dependencies);
          if (choice.subOptions) out.push(...collectDependencies(choice.subOptions));
        }
      }
      return out;
    };

    const dependencies: RegistryAssetDependency[] = [
      ...(this.dependencies || []),
      ...collectDependencies(this.options || []),
    ];
    const packageJsonPath = join(projectDir, "package.json");

    let packageJson: any = {};
    if (existsSync(packageJsonPath)) {
      const content = await readFile(packageJsonPath, "utf-8");
      packageJson = JSON.parse(content);
    }

    const deps = dependencies.filter((d) => d.type === "dependency");
    const devDeps = dependencies.filter((d) => d.type === "devDependency");

    // Add regular dependencies (avoid duplicates)
    if (deps.length > 0) {
      packageJson.dependencies = packageJson.dependencies || {};
      deps.forEach((dep) => {
        if (!packageJson.dependencies[dep.name]) {
          packageJson.dependencies[dep.name] = dep.version;
        }
      });
    }

    // Add dev dependencies (avoid duplicates)
    if (devDeps.length > 0) {
      packageJson.devDependencies = packageJson.devDependencies || {};
      devDeps.forEach((dep) => {
        if (!packageJson.devDependencies[dep.name]) {
          packageJson.devDependencies[dep.name] = dep.version;
        }
      });
    }

    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  /**
   * Add services to docker-compose.yml file
   */
  private async addToDockerCompose(
    projectDir: string,
    config: ProjectSetupConfig,
  ): Promise<void> {
    // Collect docker services and env vars from base and selected options
    const selectedOptions = config.addOnOptions?.[this.value] || {};
    const collectDocker = (options: AddOnOption[] = []): {
      services: RegistryAssetDockerService[];
      envVars: RegistryAssetEnvVar[];
    } => {
      const services: RegistryAssetDockerService[] = [];
      const envVars: RegistryAssetEnvVar[] = [];
      for (const option of options) {
        const selectedValue = selectedOptions[option.key];
        if (!selectedValue) continue;
        const selectedChoices = Array.isArray(selectedValue)
          ? selectedValue
          : [selectedValue];
        for (const value of selectedChoices) {
          const choice = option.choices.find((c) => c.value === value);
          if (!choice) continue;
          if (choice.dockerServices) services.push(...choice.dockerServices);
          if (choice.envVars) envVars.push(...choice.envVars);
          if (choice.subOptions) {
            const sub = collectDocker(choice.subOptions);
            services.push(...sub.services);
            envVars.push(...sub.envVars);
          }
        }
      }
      return { services, envVars };
    };

    const fromOptions = collectDocker(this.options || []);
    const dockerServices: RegistryAssetDockerService[] = [
      ...(this.dockerServices || []),
      ...fromOptions.services,
    ];
    const envVars: RegistryAssetEnvVar[] = [
      ...(this.envVars || []),
      ...fromOptions.envVars,
    ];
    const dockerComposePath = join(projectDir, "docker-compose.yml");

    let dockerCompose: any = {};
    if (existsSync(dockerComposePath)) {
      const content = await readFile(dockerComposePath, "utf-8");
      try {
        dockerCompose = JSON.parse(content);
      } catch {
        // If it's not JSON, assume it's YAML and parse it
        // For now, we'll recreate the file if it exists
        dockerCompose = {};
      }
    }

    const services = dockerServices;
    const resolvedEnvVars = envVars?.reduce(
      (acc, envVar) => {
        acc[envVar.key] = envVar.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    if (services.length > 0) {
      dockerCompose.services = dockerCompose.services || {};

      services.forEach((service) => {
        // Skip if service already exists
        if (dockerCompose.services[service.name]) {
          return;
        }

        // Replace environment variable placeholders with actual values
        const processedEnvironment = { ...service.environment };
        Object.keys(processedEnvironment).forEach((key) => {
          const value = processedEnvironment[key];
          // Replace ${VAR_NAME} with actual env var value
          if (
            typeof value === "string" &&
            value.startsWith("${") &&
            value.endsWith("}")
          ) {
            const envVarName = value.slice(2, -1); // Remove ${}
            if (resolvedEnvVars && resolvedEnvVars[envVarName]) {
              processedEnvironment[key] = resolvedEnvVars[envVarName];
            }
          }
        });

        dockerCompose.services[service.name] = {
          image: service.image,
          ports: service.ports,
          environment: processedEnvironment,
          volumes: service.volumes,
        };
      });

      // Add volumes if any service defines them
      const volumes = services
        .filter((s) => s.volumes)
        .flatMap((s) => s.volumes)
        .filter((volume) => !volume.startsWith("/")) // Exclude host mounts
        .map((volume) => volume.split(":")[0])
        .filter((volume, index, arr) => arr.indexOf(volume) === index); // Unique

      if (volumes.length > 0) {
        dockerCompose.volumes = dockerCompose.volumes || {};
        volumes.forEach((volume) => {
          if (!dockerCompose.volumes[volume]) {
            dockerCompose.volumes[volume] = {};
          }
        });
      }
    }

    // Write the docker-compose file as YAML
    let yamlContent = "version: '3.8'\n\n";
    if (
      dockerCompose.services &&
      Object.keys(dockerCompose.services).length > 0
    ) {
      yamlContent += "services:\n";
      Object.entries(dockerCompose.services).forEach(
        ([name, service]: [string, any]) => {
          yamlContent += `  ${name}:\n`;
          yamlContent += `    image: ${service.image}\n`;
          if (service.ports && service.ports.length > 0) {
            yamlContent += `    ports:\n`;
            service.ports.forEach((port: string) => {
              yamlContent += `      - "${port}"\n`;
            });
          }
          if (
            service.environment &&
            Object.keys(service.environment).length > 0
          ) {
            yamlContent += `    environment:\n`;
            Object.entries(service.environment).forEach(([key, value]) => {
              yamlContent += `      ${key}: ${value}\n`;
            });
          }
          if (service.volumes && service.volumes.length > 0) {
            yamlContent += `    volumes:\n`;
            service.volumes.forEach((volume: string) => {
              yamlContent += `      - ${volume}\n`;
            });
          }
          yamlContent += "\n";
        },
      );
    }

    if (
      dockerCompose.volumes &&
      Object.keys(dockerCompose.volumes).length > 0
    ) {
      yamlContent += "volumes:\n";
      Object.keys(dockerCompose.volumes).forEach((volume) => {
        yamlContent += `  ${volume}:\n`;
      });
    }

    await writeFile(dockerComposePath, yamlContent);
  }

  /**
   * Add environment variables to .env file
   */
  private async addToEnvFile(
    projectDir: string,
    config: ProjectSetupConfig,
  ): Promise<void> {
    // Collect env vars from base and selected options
    const selectedOptions = config.addOnOptions?.[this.value] || {};
    const collectEnvVars = (options: AddOnOption[] = []): RegistryAssetEnvVar[] => {
      const out: RegistryAssetEnvVar[] = [];
      for (const option of options) {
        const selectedValue = selectedOptions[option.key];
        if (!selectedValue) continue;
        const selectedChoices = Array.isArray(selectedValue)
          ? selectedValue
          : [selectedValue];
        for (const value of selectedChoices) {
          const choice = option.choices.find((c) => c.value === value);
          if (!choice) continue;
          if (choice.envVars) out.push(...choice.envVars);
          if (choice.subOptions) out.push(...collectEnvVars(choice.subOptions));
        }
      }
      return out;
    };

    const envVars: RegistryAssetEnvVar[] = [
      ...(this.envVars || []),
      ...collectEnvVars(this.options || []),
    ];
    const envPath = join(projectDir, ".env");

    let envContent = "";
    if (existsSync(envPath)) {
      envContent = await readFile(envPath, "utf-8");
    }

    // Parse existing env vars to avoid duplicates
    const existingVars = new Set<string>();
    const lines = envContent.split("\n");
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const key = trimmed.split("=")[0];
        existingVars.add(key);
      }
    });

    if (envVars.length > 0) {
      // Only add new env vars
      const newVars = envVars.filter((envVar) => !existingVars.has(envVar.key));

      if (newVars.length > 0) {
        if (envContent && !envContent.endsWith("\n\n")) {
          envContent += "\n";
        }

        newVars.forEach((envVar) => {
          if (envVar.description) {
            envContent += `# ${envVar.description}\n`;
          }
          envContent += `${envVar.key}=${envVar.value}\n\n`;
        });
      }
    }

    if (envContent.trim()) {
      await writeFile(envPath, envContent);
    }
  }

  /**
   * Render and create template files
   */
  private async renderTemplates(
    projectDir: string,
    config: ProjectSetupConfig,
  ): Promise<void> {
    // Collect templates from base and selected options
    const selectedOptions = config.addOnOptions?.[this.value] || {};
    const collectTemplates = (options: AddOnOption[] = []): RegistryAssetTemplate[] => {
      const out: RegistryAssetTemplate[] = [];
      for (const option of options) {
        const selectedValue = selectedOptions[option.key];
        if (!selectedValue) continue;
        const selectedChoices = Array.isArray(selectedValue)
          ? selectedValue
          : [selectedValue];
        for (const value of selectedChoices) {
          const choice = option.choices.find((c) => c.value === value);
          if (!choice) continue;
          if (choice.templates) out.push(...choice.templates);
          if (choice.subOptions) out.push(...collectTemplates(choice.subOptions));
        }
      }
      return out;
    };

    const templates: RegistryAssetTemplate[] = [
      ...(this.templates || []),
      ...collectTemplates(this.options || []),
    ];
    // Register Handlebars helpers
    registerHandlebarsHelpers();

    // Create enhanced template context with add-on options
    const templateData = {
      ...config,
      enabledAddOns: config.addOns || [],
      addOnOptions: config.addOnOptions || {},
    };

    for (const template of templates) {
      try {
        // If template.template is a function, call it with the data
        if (typeof template.template === "function") {
          template.template = template.template(config);
        }

        if (!template.template) continue;

        // Read template file
        const templateContent = await readFile(template.template, "utf-8");

        // Compile and render template
        const compiledTemplate = handlebars.compile(templateContent);
        const renderedContent = compiledTemplate(templateData);

        // Write to output path
        if (typeof template.outputPath === "function") {
          template.outputPath = template.outputPath(config);
        }

        const outputPath = join(projectDir, template.outputPath);
        const outputDir = join(outputPath, "..");

        // Ensure output directory exists
        await import("fs").then((fs) => {
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
        });

        // Always overwrite the file if it already exists
        await writeFile(outputPath, renderedContent); // writeFile will overwrite by default
      } catch (error) {
        console.error(error);
        throw new Error(
          `Failed to render template ${template.template}: ${error}`,
        );
      }
    }
  }

  private _collectSetupSteps(
    options: AddOnOption[],
    selectedOptions: Record<string, string[] | string | undefined>,
  ): SetupFunction[] {
    const steps: SetupFunction[] = [];
    for (const option of options) {
      const selectedValue = selectedOptions[option.key];
      if (selectedValue) {
        if (option.setup) {
          steps.push(option.setup);
        }
        const selectedChoices = Array.isArray(selectedValue)
          ? selectedValue
          : [selectedValue];
        for (const value of selectedChoices) {
          const choice = option.choices.find((c) => c.value === value);
          if (choice?.subOptions) {
            steps.push(
              ...this._collectSetupSteps(choice.subOptions, selectedOptions),
            );
          }
        }
      }
    }
    return steps;
  }

  /**
   * Execute all setup functions from selected add-on options.
   */
  public async runPostInstall(
    projectDir: string,
    config: ProjectSetupConfig,
  ): Promise<void> {
    const selectedOptions = config.addOnOptions?.[this.value] || {};
    const setups = this._collectSetupSteps(this.options || [], selectedOptions);
    for (const setup of setups) {
      await setup(projectDir, config);
    }
  }
}
