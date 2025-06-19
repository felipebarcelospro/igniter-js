import * as fs from 'fs'
import * as path from 'path'
import { generateSchemaFromRouter } from './generator'
import type { IgniterBuildConfig } from '../types'

/**
 * File watcher for Igniter controllers
 * Monitors controller files and regenerates client schema on changes
 */
export class IgniterWatcher {
  private watcher: any = null
  private config: IgniterBuildConfig
  private isGenerating = false

  constructor(config: IgniterBuildConfig) {
    this.config = {
      extractTypes: true,
      optimizeClientBundle: true,
      outputDir: 'generated',
      framework: 'nextjs',
      hotReload: true,
      controllerPatterns: ['**/*.controller.{ts,js}'],
      debug: false,
      ...config
    }
  }

  /**
   * Start watching controller files
   */
  async start() {
    try {
      // Dynamic import of chokidar to avoid bundling issues
      const chokidar = await import('chokidar')
      
      if (this.config.debug) {
        console.log('🔍 Starting Igniter file watcher...')
        console.log('📁 Output directory:', this.config.outputDir)
        console.log('👀 Watching patterns:', this.config.controllerPatterns)
      }

      // Setup file watcher
      this.watcher = chokidar.watch(this.config.controllerPatterns!, {
        ignored: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
        persistent: true,
        ignoreInitial: false
      })

      // Handle file changes
      this.watcher.on('add', this.handleFileChange.bind(this))
      this.watcher.on('change', this.handleFileChange.bind(this))
      this.watcher.on('unlink', this.handleFileChange.bind(this))

      // Handle watcher ready
      this.watcher.on('ready', () => {
        if (this.config.debug) {
          console.log('✅ File watcher is ready')
        }
      })

      // Handle errors
      this.watcher.on('error', (error: Error) => {
        console.error('❌ File watcher error:', error)
      })

      // Initial generation
      await this.regenerateSchema()

    } catch (error) {
      console.error('❌ Failed to start file watcher:', error)
      throw error
    }
  }

  /**
   * Stop watching files
   */
  async stop() {
    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
      
      if (this.config.debug) {
        console.log('🛑 File watcher stopped')
      }
    }
  }

  /**
   * Handle file change events
   */
  private async handleFileChange(filePath: string) {
    if (!filePath.includes('.controller.')) {
      return
    }

    if (this.config.debug) {
      console.log('📝 Controller file changed:', filePath)
    }

    // Debounce rapid changes
    if (this.isGenerating) {
      return
    }

    await this.regenerateSchema()
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
      if (this.config.debug) {
        console.log('🔄 Regenerating client schema...')
      }

      // Load current router
      const router = await this.loadRouter()
      if (!router) {
        console.warn('⚠️  Could not load router for schema generation')
        return
      }

      // Generate client files
      await generateSchemaFromRouter(router, this.config)

      if (this.config.debug) {
        console.log('✅ Client schema regenerated successfully')
      }

    } catch (error) {
      console.error('❌ Schema generation failed:', error)
      
      if (this.config.debug) {
        console.error('Full error:', error)
      }
    } finally {
      this.isGenerating = false
    }
  }

  /**
   * Load the current router for schema extraction
   */
  private async loadRouter() {
    try {
      // Try to find and load the main router file
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

      for (const routerPath of possibleRouterPaths) {
        if (fs.existsSync(routerPath)) {
          if (this.config.debug) {
            console.log('📂 Loading router from:', routerPath)
          }

          // Clear require cache to get fresh router
          const fullPath = path.resolve(routerPath)
          delete require.cache[fullPath]

          // Dynamic import to avoid bundling issues
          const routerModule = await import(fullPath)
          const router = routerModule.AppRouter || routerModule.default || routerModule.router

          if (router) {
            return router
          }
        }
      }

      // If no router found, try to detect from package.json or other hints
      console.warn('⚠️  Could not auto-detect router file. Please ensure your router is exported as AppRouter.')
      return null

    } catch (error) {
      if (this.config.debug) {
        console.error('Error loading router:', error)
      }
      return null
    }
  }
} 