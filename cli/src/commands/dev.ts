import { IgniterWatcher, detectFramework, getDefaultOutputPath } from '@igniter-js/core/adapters/build/cli'

interface DevOptions {
  watch?: string[]
  output?: string
  framework?: string
  debug?: boolean
}

/**
 * Development command - starts file watching and auto-generation
 */
export async function devCommand(options: DevOptions) {
  try {
    console.log('🚀 Starting Igniter CLI in development mode...')
    
    // Auto-detect framework if not specified
    const framework = options.framework || detectFramework()
    const outputPath = options.output || getDefaultOutputPath(framework)
    const watchPatterns = options.watch || ['**/*.controller.{ts,js}']
    
    console.log(`📦 Framework: ${framework}`)
    console.log(`📁 Output: ${outputPath}`)
    console.log(`👀 Watching: ${watchPatterns.join(', ')}`)
    
    if (options.debug) {
      console.log('🐛 Debug mode enabled')
    }
    
    // Create and start watcher
    const watcher = new IgniterWatcher({
      extractTypes: true,
      optimizeClientBundle: true,
      outputDir: outputPath,
      framework: framework as any,
      hotReload: true,
      controllerPatterns: watchPatterns,
      debug: options.debug || false
    })
    
    await watcher.start()
    
    console.log('✅ Igniter CLI is ready!')
    console.log('   Changes to controllers will automatically regenerate the client')
    console.log('   Press Ctrl+C to stop')
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping Igniter CLI...')
      await watcher.stop()
      console.log('✅ Igniter CLI stopped')
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Stopping Igniter CLI...')
      await watcher.stop()
      console.log('✅ Igniter CLI stopped')
      process.exit(0)
    })
    
    // Keep process alive
    setInterval(() => {}, 1000)
    
  } catch (error) {
    console.error('❌ Failed to start development mode:', error)
    process.exit(1)
  }
} 