import * as fs from 'fs'
import * as path from 'path'
import { loadRouter, introspectRouter } from './introspector';
import { generateSchemaFromRouter } from './generator'
import { createChildLogger } from '../logger'
import { createDetachedSpinner } from '@/lib/spinner'
import chokidar from 'chokidar';
import { OpenAPIGenerator } from '../docs/openapi-generator';

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
  private watchingSpinner: any = null // Spinner permanente para "watching"
  private watchingSpinnerActive = false // Track spinner state
  private isInteractiveMode = false // Detect interactive mode

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

    // Detect if we're in interactive mode
    this.isInteractiveMode = !!(
      process.env.IGNITER_INTERACTIVE_MODE === 'true' ||
      process.argv.includes('--interactive')
    )

    if (this.isInteractiveMode) {
      this.logger.debug('Interactive mode detected - spinners disabled')
    }
  }

  /**
   * Start the permanent "watching" spinner with proper management
   */
  private startWatchingSpinner() {
    // Skip spinners in interactive mode
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

  /**
   * Pause the watching spinner to allow other messages
   */
  private pauseWatchingSpinner() {
    // Skip spinners in interactive mode
    if (this.isInteractiveMode) {
      return
    }

    if (this.watchingSpinner && this.watchingSpinnerActive) {
      this.watchingSpinner.stop()
      this.watchingSpinnerActive = false
      // Add a small delay to ensure terminal is clear
      process.stdout.write('\n')
    }
  }

  /**
   * Resume the watching spinner after other messages
   */
  private resumeWatchingSpinner() {
    // Skip spinners in interactive mode
    if (this.isInteractiveMode) {
      return
    }

    if (!this.watchingSpinnerActive && !this.isGenerating) {
      // Create a new spinner instance for clean resume
      this.watchingSpinner = createDetachedSpinner('Watching for changes...')
      this.watchingSpinner.start()
      this.watchingSpinnerActive = true
    }
  }

  /**
   * Stop the permanent "watching" spinner completely
   */
  private stopWatchingSpinner() {
    // Skip spinners in interactive mode
    if (this.isInteractiveMode) {
      return
    }

    if (this.watchingSpinner) {
      this.watchingSpinner.stop()
      this.watchingSpinner = null
      this.watchingSpinnerActive = false
      // Clear the line and add spacing
      process.stdout.write('\n')
    }
  }

  

  /**
   * Start watching controller files
   */
  async start() {
    try {


      this.logger.info('Starting file watcher', {
        output: this.config.outputDir,
        patterns: this.config.controllerPatterns?.join(', ')
      })

      // Setup file watcher
      this.watcher = chokidar.watch(this.config.controllerPatterns!, {
        ignored: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
        persistent: true,
        ignoreInitial: false
      })

      // Wait for watcher to be ready
      await new Promise<void>((resolve, reject) => {
        // Handle file changes
        this.watcher.on('add', this.handleFileChange.bind(this))
        this.watcher.on('change', this.handleFileChange.bind(this))
        this.watcher.on('unlink', this.handleFileChange.bind(this))

        // Handle watcher ready
        this.watcher.on('ready', () => {
          this.logger.success('File watcher is ready', {
            watching: this.config.controllerPatterns?.join(', ')
          })
          resolve()
        })

        // Handle errors
        this.watcher.on('error', (error: Error) => {
          this.logger.error('File watcher error', {}, error)
          reject(error)
        })
      })

      // Initial generation after watcher is ready
      await this.regenerateSchema()

      // Start the permanent watching spinner after initial generation
      this.startWatchingSpinner()

    } catch (error) {
      this.logger.error('Failed to start file watcher', {}, error)
      throw error
    }
  }

  /**
   * Stop watching files
   */
  async stop() {
    if (this.watcher) {
      // Stop the watching spinner first
      this.stopWatchingSpinner()

      const spinner = createDetachedSpinner('Stopping file watcher...')
      spinner.start()

      await this.watcher.close()
      this.watcher = null

      spinner.success('File watcher stopped')
      this.logger.groupEnd()
    }
  }

  /**
   * Handle file change events
   */
  private async handleFileChange(filePath: string) {
    if (!filePath.includes('.controller.')) {
      return
    }

    // Pause the watching spinner to allow clean message display
    this.pauseWatchingSpinner()

    // Debounce rapid changes
    if (this.isGenerating) {
      this.logger.debug('Generation already in progress, skipping...')
      // Resume watching spinner after a brief delay
      setTimeout(() => this.resumeWatchingSpinner(), 100)
      return
    }

    await this.regenerateSchema()

    // Resume the watching spinner after regeneration with a small delay
    setTimeout(() => this.resumeWatchingSpinner(), 500)
  }

  /**
   * Generate client schema once (useful for CI/CD)
   */
  async generate() {
    return await this.regenerateSchema()
  }

  /**
   * Regenerate client schema from current controllers
   */
  private async regenerateSchema() {
    if (this.isGenerating) {
      return
    }

    this.isGenerating = true

    try {
      // Ensure spinner is paused during generation
      this.pauseWatchingSpinner()

      this.logger.separator()

      // Find router file automatically
      const possibleRouterPaths = [
        'src/igniter.router.ts',
        'src/igniter.router.js',
        'src/router.ts',
        'src/router.js',
        'igniter.router.ts',
        'igniter.router.js',
        'router.ts',
        'router.js'
      ]

      let router: any = null

      for (const routerPath of possibleRouterPaths) {
        if (fs.existsSync(routerPath)) {
          router = await loadRouter(routerPath)
          if (router) {
            break
          } else {
            this.logger.debug('Router loading returned null', { path: routerPath })
          }
        }
      }

      if (!router) {
        this.logger.warn('No router found', {
          searched: possibleRouterPaths
        })
        return
      }

      // Generate client files (the generator will handle its own logging)
      await generateSchemaFromRouter(router, this.config)

      // Generate OpenAPI docs if enabled
      if (this.config.generateDocs) {
        await this.generateOpenAPISpec(router)
      }

    } catch (error) {
      this.logger.error('Schema generation failed', {}, error)
    } finally {
      this.isGenerating = false
      // Don't resume spinner here - let handleFileChange or start() handle it
    }
  }

  /**
   * Generate OpenAPI specification from router
   */
  private async generateOpenAPISpec(router: any) {
    try {
      this.logger.info('Generating OpenAPI specification...')
      
      const introspected = introspectRouter(router)
      const generator = new OpenAPIGenerator(introspected.schema.docs || {})
      const openApiSpec = generator.generate(introspected.schema)

      const outputDir = path.resolve(this.config.docsOutputDir!)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }
      
      const outputPath = path.join(outputDir, 'openapi.json')
      fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2), 'utf8')
      
      this.logger.success(`OpenAPI specification updated at ${outputPath}`)
    } catch (error) {
      this.logger.error('Error generating OpenAPI specification:', error)
    }
  }
}