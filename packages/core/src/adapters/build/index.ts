// Build adapters temporarily disabled
// Will be moved to separate CLI package

export type IgniterBuildConfig = {
  framework?: 'nextjs' | 'vite' | 'webpack' | 'generic'
  outputDir?: string
  controllerPatterns?: string[]
  extractTypes?: boolean
  optimizeClientBundle?: boolean
  hotReload?: boolean
  debug?: boolean
}

export function generateSchemaFromRouter() {
  throw new Error('Build adapters moved to @igniter-js/cli package')
} 