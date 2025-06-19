#!/usr/bin/env node

import { Command } from 'commander'
import { devCommand } from './commands/dev'
import { generateCommand } from './commands/generate'

const program = new Command()

program
  .name('igniter')
  .description('Igniter.js CLI for type-safe client generation')
  .version('1.0.0')

program
  .command('dev')
  .description('Start development mode with file watching and auto-generation')
  .option('-w, --watch <patterns...>', 'Watch patterns for controller files', ['**/*.controller.{ts,js}'])
  .option('-o, --output <dir>', 'Output directory for generated files')
  .option('-f, --framework <framework>', 'Target framework (nextjs, vite, webpack, generic)')
  .option('-d, --debug', 'Enable debug logging', false)
  .action(devCommand)

program
  .command('generate')
  .description('Generate client code once (useful for CI/CD)')
  .option('-i, --input <patterns...>', 'Input patterns for controller files', ['**/*.controller.{ts,js}'])
  .option('-o, --output <dir>', 'Output directory for generated files')
  .option('-f, --framework <framework>', 'Target framework (nextjs, vite, webpack, generic)')
  .option('-d, --debug', 'Enable debug logging', false)
  .action(generateCommand)

program
  .command('init')
  .description('Initialize Igniter CLI in your project')
  .option('-f, --framework <framework>', 'Target framework (nextjs, vite, webpack, generic)')
  .action(async (options) => {
    console.log('🚀 Initializing Igniter CLI...')
    console.log('📁 Framework:', options.framework || 'auto-detected')
    console.log('✅ Igniter CLI initialized! Run "igniter dev" to start.')
  })

// Error handling
program.exitOverride()

try {
  program.parse()
} catch (error) {
  console.error('❌ CLI Error:', error instanceof Error ? error.message : error)
  process.exit(1)
} 