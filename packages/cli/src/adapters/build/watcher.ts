import * as fs from 'fs'
import * as path from 'path'
import { loadRouter, introspectRouter, RouterLoadError } from './introspector';
import { generateSchemaFromRouter } from './generator'
import { createChildLogger, formatError } from '../logger'
import { createDetachedSpinner } from '@/lib/spinner'
import chokidar from 'chokidar';
import { OpenAPIGenerator } from '../docs/openapi-generator';
import chalk from 'chalk';

export type IgniterBuildConfig = {
  framework?: 'nextjs' | 'vite' | 'webpack' | 'generic'
  outputDir?: string
  controllerPatterns?: string[]
  extractTypes?: boolean
  optimizeClientBundle?: boolean
  hotReload?: boolean
  debug?: boolean
  generateDocs?: boolean
  docsOutputDir?: string
}

/**
 * File watcher for Igniter controllers
 * Monitors controller files and regenerates client schema on changes
 */
export class IgniterWatcher {
  private watcher: any = null
  private config: IgniterBuildConfig
  private isGenerating = false
  private logger = createChildLogger({ component: 'watcher' })
  private watchingSpinner: any = null
  private watchingSpinnerActive = false
  private isInteractiveMode = false

  constructor(config: IgniterBuildConfig) {
    this.config = {
      extractTypes: true,
      optimizeClientBundle: true,
      outputDir: 'generated',
      framework: 'nextjs',
      hotReload: true,
      controllerPatterns: ['**/*.controller.{ts,js}'],
      debug: false,
      generateDocs: false,
      docsOutputDir: './src/docs',
      ...config
    }

    this.isInteractiveMode = !!(
      process.env.IGNITER_INTERACTIVE_MODE === 'true' ||
      process.argv.includes('--interactive')
    )

    if (this.isInteractiveMode) {
      this.logger.debug('Interactive mode detected - spinners disabled')
    }
  }

  private startWatchingSpinner() {
    if (this.isInteractiveMode) {
      this.logger.info('Watching for changes...')
      return
    }

    if (!this.watchingSpinner && !this.watchingSpinnerActive) {
      this.watchingSpinner = createDetachedSpinner('Watching for changes...')
      this.watchingSpinner.start()
      this.watchingSpinnerActive = true
    }
  }

  private pauseWatchingSpinner() {
    if (this.isInteractiveMode) return

    if (this.watchingSpinner && this.watchingSpinnerActive) {
      this.watchingSpinner.stop()
      this.watchingSpinnerActive = false
      process.stdout.write('\n')
    }
  }

  private resumeWatchingSpinner() {
    if (this.isInteractiveMode) return

    if (!this.watchingSpinnerActive && !this.isGenerating) {
      this.watchingSpinner = createDetachedSpinner('Watching for changes...')
      this.watchingSpinner.start()
      this.watchingSpinnerActive = true
    }
  }

  private stopWatchingSpinner() {
    if (this.isInteractiveMode) return

    if (this.watchingSpinner) {
      this.watchingSpinner.stop()
      this.watchingSpinner = null
      this.watchingSpinnerActive = false
      process.stdout.write('\n')
    }
  }

  async start() {
    try {
      this.logger.info('Starting file watcher', {
        output: this.config.outputDir,
        patterns: this.config.controllerPatterns?.join(', ')
      })

      this.watcher = chokidar.watch(this.config.controllerPatterns!, {
        ignored: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
        persistent: true,
        ignoreInitial: false
      })

      await new Promise<void>((resolve, reject) => {
        this.watcher.on('add', this.handleFileChange.bind(this))
        this.watcher.on('change', this.handleFileChange.bind(this))
        this.watcher.on('unlink', this.handleFileChange.bind(this))

        this.watcher.on('ready', () => {
          this.logger.success('File watcher is ready', {
            watching: this.config.controllerPatterns?.join(', ')
          })
          resolve()
        })

        this.watcher.on('error', (error: Error) => {
          this.logger.error('File watcher error', {}, error)
          reject(error)
        })
      })

      await this.regenerateSchema()
      this.startWatchingSpinner()

    } catch (error) {
      this.logger.error('Failed to start file watcher', {}, error)
      throw error
    }
  }

  async stop() {
    if (this.watcher) {
      this.stopWatchingSpinner()
      const spinner = createDetachedSpinner('Stopping file watcher...')
      spinner.start()
      await this.watcher.close()
      this.watcher = null
      spinner.success('File watcher stopped')
      this.logger.groupEnd()
    }
  }

  private async handleFileChange(filePath: string) {
    if (!filePath.includes('.controller.')) return

    this.pauseWatchingSpinner()

    if (this.isGenerating) {
      this.logger.debug('Generation already in progress, skipping...')
      setTimeout(() => this.resumeWatchingSpinner(), 100)
      return
    }

    await this.regenerateSchema()
    setTimeout(() => this.resumeWatchingSpinner(), 500)
  }

  async generate() {
    return await this.regenerateSchema()
  }

  private async regenerateSchema() {
    if (this.isGenerating) return

    this.isGenerating = true
    let router: any = null;

    try {
      this.pauseWatchingSpinner()
      this.logger.separator()

      const possibleRouterPaths = [
        'src/igniter.router.ts', 'src/igniter.router.js',
        'src/router.ts', 'src/router.js',
        'igniter.router.ts', 'igniter.router.js',
        'router.ts', 'router.js'
      ]

      let foundPath: string | null = null;
      for (const routerPath of possibleRouterPaths) {
        if (fs.existsSync(routerPath)) {
          foundPath = routerPath;
          break;
        }
      }

      if (!foundPath) {
        this.logger.warn('No router file found.', {
          searched: possibleRouterPaths.join(', ')
        })
        this.isGenerating = false;
        return;
      }

      this.logger.info(`Found router at ${chalk.cyan(foundPath)}. Loading...`);
      router = await loadRouter(foundPath);

      if (!router) {
        // This case should ideally not be hit anymore due to error propagation
        this.logger.warn('Router file was loaded, but it appears to be empty or invalid.');
        this.isGenerating = false;
        return;
      }

      await generateSchemaFromRouter(router, this.config)

      if (this.config.generateDocs) {
        await this.generateOpenAPISpec(router)
      }

    } catch (error) {
      this.logger.error('Schema generation failed', { error: formatError(error) });

      if (error instanceof RouterLoadError) {
        console.error(chalk.red.bold('\n✗ Error loading your Igniter router:'));
        console.error(chalk.gray('  The router file contains an error and could not be compiled.'));
        console.error(chalk.gray(`  File: ${error.message.split(' ').pop()}`));

        // The original error from TSX is what's valuable here.
        const originalError = error.originalError;
        if (originalError) {
          console.error(chalk.yellow.bold('\n  Original Error:'));
          console.error(chalk.white(`    ${originalError.name}: ${originalError.message}`));
          if (originalError.stack) {
            // Indent and clean up the stack trace for readability
            const indentedStack = originalError.stack.split('\n').slice(1).map((line: string) => `    ${line}`).join('\n');
            console.error(chalk.gray(indentedStack));
          }
        }
        console.error(chalk.red.bold('\nPlease fix the error in your router file and save it to regenerate.'));
      } else {
        // Generic error handling
        console.error(chalk.red.bold('\n✗ An unexpected error occurred during schema generation.'));
        console.error(chalk.gray('  Run with --debug for more details.'));
      }

    } finally {
      this.isGenerating = false
    }
  }

  private async generateOpenAPISpec(router: any) {
    try {
      this.logger.info('Generating OpenAPI specification...')

      const introspectedSchema = introspectRouter(router).schema;
      const generator = new OpenAPIGenerator(introspectedSchema.docs || {})
      const openApiSpec = generator.generate(introspectedSchema)

      const outputDir = path.resolve(this.config.docsOutputDir!)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      const outputPath = path.join(outputDir, 'openapi.json')
      fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2), 'utf8')

      this.logger.success(`OpenAPI specification updated at ${outputPath}`)
    } catch (error) {
      this.logger.error('Error generating OpenAPI specification:', { error: formatError(error) })
    }
  }
}
