import type { ProjectSetupConfig } from "@/commands/init/types";

/**
 * Represents an environment variable used by a registry asset.
 */
export interface RegistryAssetEnvVar {
  /** The environment variable's key. */
  key: string;
  /** The value assigned to the environment variable. */
  value: string;
  /** A description explaining the purpose of this environment variable. */
  description: string;
}

/**
 * Describes a Docker service within a registry asset, including configuration details.
 */
export interface RegistryAssetDockerService {
  /** The name of the Docker service. */
  name: string;
  /** The Docker image used for the service. */
  image: string;
  /** An array of port mappings for the service (e.g., ["6379:6379"]). */
  ports: string[];
  /** A map of environment variables to be set on the service container. */
  environment: Record<string, string>;
  /** An array of volume paths to mount into the container. */
  volumes: string[];
}

/**
 * Defines a template file used by a registry asset and the desired output path.
 */
export interface RegistryAssetTemplate {
  /** The file path to the template file. */
  template: string | undefined | ((data: ProjectSetupConfig) => string | undefined);
  /** The output path where the processed template will be written. */
  outputPath: string | ((data: ProjectSetupConfig) => string);
}

/**
 * String reference to an environment variable for linking Docker service environment variables to project-level env vars.
 *
 * Supports placeholders such as `${REDIS_URL}` which get replaced with the actual environment variable values.
 * @example
 * // Reference by placeholder
 * "${REDIS_URL}"
 * // Direct value
 * "redis://localhost:6379"
 */
export type EnvVarReference = string; // e.g., "${REDIS_URL}" or "redis://localhost:6379"

/**
 * Specifies a dependency required by a registry asset.
 */
export interface RegistryAssetDependency {
  /** The name of the dependency (e.g., "express"). */
  name: string;
  /** The version specification of the dependency (e.g., "^4.17.1"). */
  version: string;
  /**
   * The type of dependency.
   * - 'dependency': Regular dependency.
   * - 'devDependency': Used for development only.
   * - Any string for custom dependency types.
   */
  type: "dependency" | "devDependency" | string;
}

/**
 * Represents a configurable option within an add-on.
 */
export interface AddOnOption {
  /** The option key used for identification and template context. */
  key: string;
  /** Human-readable message for the option. */
  message: string;
  /** Default value if user doesn't select. */
  defaultValue?: string;
  /** Whether this option allows multiple selections. */
  multiple: boolean;
  /** List of possible values for this option. */
  choices: AddOnChoice[];
  /** Whether this option is required. */
  required?: boolean;
  /** Function to setup the add-on. */
  setup?: (projectDir: string, config: ProjectSetupConfig) => Promise<void>;
}

/**
 * Represents a single choice within an add-on option.
 */
export interface AddOnChoice {
  /** The choice value (used in template context). */
  value: string;
  /** Human-readable choice label. */
  label: string;
  /** Optional hint or description for the choice. */
  hint?: string;
  /** Dependencies for templates and packages specific to this choice. */
  templates?: RegistryAssetTemplate[];
  dependencies?: RegistryAssetDependency[];
  envVars?: RegistryAssetEnvVar[];
  dockerServices?: RegistryAssetDockerService[];

  /** Sub-choices for this choice. */
  subOptions?: AddOnOption[];
}

/**
 * Represents a step in the add-on configuration flow.
 */
export interface AddOnStep {
  /** Step identifier. */
  id: string;
  /** Step title shown to user. */
  title: string;
  /** Step description. */
  description: string;
  /** Options available in this step. */
  options: AddOnOption[];
}

/**
 * Represents a conditional dependency between add-on options.
 */
export interface AddOnDependency {
  /** The option key that triggers this dependency. */
  dependsOn: string;
  /** The value that triggers this dependency. */
  value: string;
  /** The options that become available when dependency is met. */
  enablesOptions: string[];
}

/**
 * Configuration for dynamic add-on selection and sub-options.
 */
export interface AddOnConfig {
  /** Whether this add-on supports sub-options. */
  hasSubOptions: boolean;
  /** Configuration steps for this add-on. */
  steps: AddOnStep[];
  /** Dependencies between options. */
  dependencies?: AddOnDependency[];
  /** Function to resolve templates based on selected options. */
  resolveTemplates?: (
    options: Record<string, string[]>,
  ) => RegistryAssetTemplate[];
  /** Function to resolve dependencies based on selected options. */
  resolveDependencies?: (
    options: Record<string, string[]>,
  ) => RegistryAssetDependency[];
}
