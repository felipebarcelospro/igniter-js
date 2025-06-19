#!/usr/bin/env node

import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'

const program = new Command()

program
  .name('igniter')
  .description('CLI for Igniter.js type-safe client generation')
  .version('1.0.0')

program
  .command('dev')
  .description('Start development mode with file watching')
  .option('--framework <type>', 'Framework type', 'nextjs')
  .option('--output <dir>', 'Output directory', 'lib')
  .option('--debug', 'Enable debug mode')
  .action(async (options) => {
    console.log('🚀 Starting Igniter CLI in development mode...')
    console.log('📦 Framework:', options.framework)
    console.log('📁 Output:', options.output)
    console.log('👀 Watching: **/*.controller.{ts,js}')
    
    const { IgniterWatcher } = await import('./adapters/build/watcher')
    
    const watcher = new IgniterWatcher({
      framework: options.framework,
      outputDir: options.output,
      debug: options.debug,
      controllerPatterns: ['**/*.controller.{ts,js}'],
      extractTypes: true,
      optimizeClientBundle: true,
      hotReload: true
    })
    
    await watcher.start()
    
    console.log('✅ Igniter CLI is ready!')
    console.log('   Changes to controllers will automatically regenerate the client')
    console.log('   Press Ctrl+C to stop')
    
    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      console.log('\\n🛑 Stopping Igniter CLI...')
      await watcher.stop()
      console.log('✅ Igniter CLI stopped')
      process.exit(0)
    })
  })

program
  .command('generate')
  .description('Generate client once (useful for CI/CD)')
  .option('--framework <type>', 'Framework type', 'nextjs')
  .option('--output <dir>', 'Output directory', 'lib')
  .option('--debug', 'Enable debug mode')
  .action(async (options) => {
    console.log('🔄 Generating Igniter client...')
    
    const { IgniterWatcher } = await import('./adapters/build/watcher')
    
    const watcher = new IgniterWatcher({
      framework: options.framework,
      outputDir: options.output,
      debug: options.debug,
      controllerPatterns: ['**/*.controller.{ts,js}'],
      extractTypes: true,
      optimizeClientBundle: true,
      hotReload: false
    })
    
    await watcher.generate()
    console.log('✅ Client generated successfully!')
  })

program.parse() 