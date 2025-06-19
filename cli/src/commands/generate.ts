import { IgniterWatcher, detectFramework, getDefaultOutputPath } from '@igniter-js/core/adapters/build/cli'

interface GenerateOptions {
  input?: string[]
  output?: string
  framework?: string
  debug?: boolean
}

/**
 * Generate command - one-time generation for CI/CD
 */
export async function generateCommand(options: GenerateOptions) {
  try {
    console.log('🔄 Generating Igniter client...')
    
    // Auto-detect framework if not specified
    const framework = options.framework || detectFramework()
    const outputPath = options.output || getDefaultOutputPath(framework)
    const inputPatterns = options.input || ['**/*.controller.{ts,js}']
    
    console.log(`📦 Framework: ${framework}`)
    console.log(`📁 Output: ${outputPath}`)
    console.log(`📂 Input: ${inputPatterns.join(', ')}`)
    
    if (options.debug) {
      console.log('🐛 Debug mode enabled')
    }
    
    // Create watcher (but don't start watching, just generate once)
    const watcher = new IgniterWatcher({
      extractTypes: true,
      optimizeClientBundle: true,
      outputDir: outputPath,
      framework: framework as any,
      hotReload: false,  // Disable hot reload for one-time generation
      controllerPatterns: inputPatterns,
      debug: options.debug || false
    })
    
    // Trigger one-time generation
    await watcher.generate()
    
    console.log('✅ Client generation completed!')
    console.log(`   Generated files in: ${outputPath}`)
    
  } catch (error) {
    console.error('❌ Failed to generate client:', error)
    process.exit(1)
  }
} 