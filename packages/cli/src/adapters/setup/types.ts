import type { SupportedFramework } from '../framework/framework-detector'

/**
 * Available Igniter.js features that can be enabled
 */
export interface IgniterFeatures {
  store: boolean         // Redis Store - Caching, sessions, pub/sub
  jobs: boolean         // BullMQ Jobs - Background task processing
  mcp: boolean          // MCP Server - AI assistant integration
  logging: boolean      // Enhanced console logger
  telemetry: boolean    // Telemetry for tracking requests and errors
}

/**
 * Database options with their configurations
 */
export type DatabaseProvider = 'none' | 'postgresql' | 'mysql' | 'sqlite'

export interface DatabaseConfig {
  provider: DatabaseProvider
  url?: string
  name?: string
  port?: number
  schema?: string
}

/**
 * Package manager types
 */
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

/**
 * Project setup configuration collected from user prompts
 */
export interface ProjectSetupConfig {
  projectName: string
  framework: SupportedFramework
  features: IgniterFeatures
  database: DatabaseConfig
  packageManager: PackageManager
  initGit: boolean
  installDependencies: boolean
  dockerCompose: boolean
}

/**
 * Template file structure for code generation
 */
export interface TemplateFile {
  path: string
  content: string
  executable?: boolean
}

/**
 * Package dependency configuration
 */
export interface PackageDependency {
  name: string
  version: string
  isDev?: boolean
  isOptional?: boolean
}

/**
 * Project generation context
 */
export interface GenerationContext {
  config: ProjectSetupConfig
  targetDir: string
  templateFiles: TemplateFile[]
  dependencies: PackageDependency[]
  devDependencies: PackageDependency[]
  scripts: Record<string, string>
}

/**
 * Feature configuration for extensibility
 */
export interface FeatureDefinition {
  key: keyof IgniterFeatures
  name: string
  description: string
  dependencies: PackageDependency[]
  devDependencies?: PackageDependency[]
  templates?: TemplateFile[]
  dockerServices?: DockerService[]
  envVars?: EnvVariable[]
}

/**
 * Docker service configuration
 */
export interface DockerService {
  name: string
  image: string
  ports?: string[]
  environment?: Record<string, string>
  volumes?: string[]
  dependsOn?: string[]
}

/**
 * Environment variable configuration
 */
export interface EnvVariable {
  key: string
  value: string
  description?: string
  required?: boolean
} 