import * as fs from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { generateSchemaFromRouter } from './generator'
import { createChildLogger } from '../logger'
import { createDetachedSpinner } from '@/lib/spinner'
import chokidar from 'chokidar';

export type IgniterBuildConfig = {
  framework?: 'nextjs' | 'vite' | 'webpack' | 'generic'
  outputDir?: string
  controllerPatterns?: string[]
  extractTypes?: boolean
  optimizeClientBundle?: boolean
  hotReload?: boolean
  debug?: boolean
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
   * Load router from file with simplified approach
   */
  private async loadRouter(routerPath: string): Promise<any> {
    const logger = createChildLogger({ component: 'router-loader' })
    const fullPath = path.resolve(process.cwd(), routerPath)

    logger.debug('Loading router', { path: routerPath })

    try {
      // const spinner = logger.spinner('Loading router with TypeScript support...')
      // spinner.start()

      // Try using tsx or ts-node if available
      const module = await this.loadWithTypeScriptSupport(fullPath)

      if (module) {
        // Check if it's already a router object (TSX returns direct router data)
        if (module?.config && module?.controllers) {
          const controllerCount = Object.keys(module.controllers || {}).length
          // spinner.success(`Router loaded successfully - ${controllerCount} controllers`)
          return module
        }

                        // Otherwise look for exported router
                const router = module?.AppRouter || module?.default?.AppRouter || module?.default || module?.router

        if (router && typeof router === 'object') {
          const controllerCount = Object.keys(router.controllers || {}).length
          // spinner.success(`Router loaded successfully - ${controllerCount} controllers`)
          return router
        } else {
          // spinner.warn('Module loaded but no router found')
          logger.debug('Available exports', {
            exports: Object.keys(module || {})
          })
        }
      } else {
        // spinner.warn('TypeScript loading failed, trying fallback...')
      }

      // Fallback: Try with import resolution
      const fallbackSpinner = createDetachedSpinner('Trying fallback loading method...')
      fallbackSpinner.start()

      const fallbackModule = await this.loadRouterWithIndexResolution(fullPath)

      if (fallbackModule) {
        // Check if it's already a router object (TSX returns direct router data)
        if (fallbackModule?.config && fallbackModule?.controllers) {
          const controllerCount = Object.keys(fallbackModule.controllers || {}).length
          fallbackSpinner.success(`Router loaded successfully - ${controllerCount} controllers`)
          return fallbackModule
        }

        // Otherwise look for exported router
        const router = fallbackModule?.AppRouter || fallbackModule?.default?.AppRouter || fallbackModule?.default || fallbackModule?.router

        if (router && typeof router === 'object') {
          const controllerCount = Object.keys(router.controllers || {}).length
          fallbackSpinner.success(`Router loaded successfully - ${controllerCount} controllers`)
          return router
        }
      }

      fallbackSpinner.error('Could not load router')

    } catch (error) {
      logger.error('Failed to load router', { path: routerPath }, error)
    }

    return null
  }

  /**
   * Load TypeScript files using TSX runtime loader
   * This is the NEW robust approach that replaces the problematic transpilation
   */
  private async loadWithTypeScriptSupport(filePath: string): Promise<any> {
    const logger = createChildLogger({ component: 'tsx-loader' })

    // Method 1: Try to find and use compiled JS version first (faster)
    const jsPath = filePath.replace(/\.ts$/, '.js')
    if (fs.existsSync(jsPath)) {
      try {
        logger.debug('Using compiled JS version')

        delete require.cache[jsPath]
        const module = require(jsPath)

        return module
      } catch (error) {
        logger.debug('Compiled JS loading failed, trying TypeScript...')
      }
    }

    // Method 2: Use TSX runtime loader (MAIN STRATEGY)
    if (filePath.endsWith('.ts')) {
      try {
        logger.debug('Using TSX runtime loader')

        const { spawn } = require('child_process')

        // First, check if TSX is available
        const tsxCheckResult = await new Promise<boolean>((resolve) => {
          const checkChild = spawn('npx', ['tsx', '--version'], {
            stdio: 'pipe',
            cwd: process.cwd()
          })

          checkChild.on('close', (code: number | null) => {
            resolve(code === 0)
          })

          checkChild.on('error', () => {
            resolve(false)
          })

          setTimeout(() => {
            checkChild.kill()
            resolve(false)
          }, 5000)
        })

        if (!tsxCheckResult) {
          throw new Error('TSX not available')
        }

        const result = await new Promise<any>((resolve, reject) => {
          // Create a TSX script that loads the module and extracts router info
          const tsxScript = `
            async function loadRouter() {
              try {
                const module = await import('${pathToFileURL(filePath).href}');
                const router = module?.AppRouter || module?.default?.AppRouter || module?.default || module?.router;

                if (router && typeof router === 'object') {
                  // Extract safe metadata for CLI use
                  const safeRouter = {
                    config: {
                      baseURL: router.config?.baseURL || '',
                      basePATH: router.config?.basePATH || ''
                    },
                    controllers: {}
                  };

                  // Extract controller metadata (no handlers/functions)
                  if (router.controllers && typeof router.controllers === 'object') {
                    for (const [controllerName, controller] of Object.entries(router.controllers)) {
                      if (controller && typeof controller === 'object' && (controller as any).actions) {
                        const safeActions: Record<string, any> = {};

                        for (const [actionName, action] of Object.entries((controller as any).actions)) {
                          if (action && typeof action === 'object') {
                            // Extract only metadata, no functions
                            safeActions[actionName] = {
                              path: (action as any).path || '',
                              method: (action as any).method || 'GET',
                              description: (action as any).description,
                              // Keep type inference data if available
                              $Infer: (action as any).$Infer
                            };
                          }
                        }

                        safeRouter.controllers[controllerName] = {
                          name: (controller as any).name || controllerName,
                          path: (controller as any).path || '',
                          actions: safeActions
                        };
                      }
                    }
                  }

                  console.log('__ROUTER_SUCCESS__' + JSON.stringify(safeRouter));
                  process.exit(0); // Force exit after success
                } else {
                  console.log('__ROUTER_ERROR__No router found in module');
                  process.exit(1); // Force exit after error
                }
              } catch (error) {
                console.log('__ROUTER_ERROR__' + error.message);
                process.exit(1); // Force exit after error
              }
            }

            loadRouter();
          `;

          const child = spawn('npx', ['tsx', '-e', tsxScript], {
            stdio: 'pipe',
            cwd: process.cwd(),
            env: { ...process.env, NODE_NO_WARNINGS: '1' }
          })

          let output = ''
          let errorOutput = ''

          child.stdout?.on('data', (data: Buffer) => {
            output += data.toString()
          })

          child.stderr?.on('data', (data: Buffer) => {
            errorOutput += data.toString()
          })

          child.on('close', (code: number | null) => {
            if (output.includes('__ROUTER_SUCCESS__')) {
              const resultLine = output.split('\n').find(line => line.includes('__ROUTER_SUCCESS__'))
              if (resultLine) {
                try {
                  const routerData = JSON.parse(resultLine.replace('__ROUTER_SUCCESS__', ''))
                  resolve(routerData)
                } catch (e: any) {
                  reject(new Error('Failed to parse router data: ' + e.message))
                }
              } else {
                reject(new Error('Router success marker found but no data'))
              }
            } else if (output.includes('__ROUTER_ERROR__')) {
              const errorLine = output.split('\n').find(line => line.includes('__ROUTER_ERROR__'))
              const errorMsg = errorLine ? errorLine.replace('__ROUTER_ERROR__', '') : 'Unknown error'
              reject(new Error('Router loading failed: ' + errorMsg))
            } else {
              reject(new Error(`TSX execution failed with code ${code}: ${errorOutput || 'No output'}`))
            }
          })

          child.on('error', (error: any) => {
            reject(new Error('Failed to spawn TSX process: ' + error.message))
          })

          setTimeout(() => {
            child.kill()
            reject(new Error('Timeout loading TypeScript file with TSX'))
          }, 30000) // Increased timeout for TSX
        })

        return result

      } catch (error) {
        logger.debug('TSX runtime loader failed', {}, error)
        // Don't throw, let it fall back to the old method
      }
    }

    return null
  }

  /**
   * Load router by resolving directory imports to index files
   */
  private async loadRouterWithIndexResolution(routerPath: string): Promise<any> {
    const logger = createChildLogger({ component: 'index-resolver' })

    try {
      // Read the router file content
      const routerContent = fs.readFileSync(routerPath, 'utf8')

      // Find all imports that might need resolution
      const importRegex = /from\s+['\"]([^'\"]+)['\"]/g
      let resolvedContent = routerContent

      const matches = Array.from(routerContent.matchAll(importRegex))

      for (const [fullMatch, importPath] of matches) {
        // Skip external packages (but allow relative paths and @scoped packages within project)
        if (!importPath.startsWith('.') && !importPath.startsWith('@')) {
          continue
        }

        const basePath = path.dirname(routerPath)
        let resolvedPath: string

        // Handle @scoped paths by resolving from project root
        if (importPath.startsWith('@/')) {
          // @/something maps to src/something
          resolvedPath = path.resolve(process.cwd(), 'src', importPath.substring(2))
        } else if (importPath.startsWith('./')) {
          // Relative import from current directory
          resolvedPath = path.resolve(basePath, importPath)
        } else {
          // Direct path relative to current directory
          resolvedPath = path.resolve(basePath, importPath)
        }

        // Check if it's a directory import or needs extension
        let finalPath = importPath

        // If path doesn't have extension, try to find the actual file
        if (!importPath.match(/\\.(js|ts|tsx|jsx)$/)) {
          // Try as file with extensions
          const possibleFiles = [
            resolvedPath + '.ts',
            resolvedPath + '.tsx',
            resolvedPath + '.js',
            resolvedPath + '.jsx'
          ]

          let fileFound = false
          for (const filePath of possibleFiles) {
            if (fs.existsSync(filePath)) {
              const ext = path.extname(filePath)
              finalPath = importPath + ext
              fileFound = true
              break
            }
          }

          // If no file found, try as directory with index
          if (!fileFound) {
            const possibleIndexFiles = [
              path.join(resolvedPath, 'index.ts'),
              path.join(resolvedPath, 'index.tsx'),
              path.join(resolvedPath, 'index.js'),
              path.join(resolvedPath, 'index.jsx')
            ]

            for (const indexFile of possibleIndexFiles) {
              if (fs.existsSync(indexFile)) {
                const ext = path.extname(indexFile)
                finalPath = importPath + '/index' + ext
                break
              }
            }
          }
        }

        // Replace the import in the content - use absolute path for safety
        const absolutePath = path.resolve(basePath, finalPath)
        if (fs.existsSync(absolutePath)) {
          // Use file URL for absolute imports
          const fileUrl = pathToFileURL(absolutePath).href
          resolvedContent = resolvedContent.replace(fullMatch, `from '${fileUrl}'`)
        } else {
          // Fallback to relative path
          resolvedContent = resolvedContent.replace(fullMatch, `from '${finalPath}'`)
        }
      }

      // Save resolved content to temporary file and load with TSX
      const tempFileName = `igniter-temp-${Date.now()}.ts`
      const tempFilePath = path.join(process.cwd(), tempFileName)

      try {
        // Write the resolved TypeScript content (no conversion needed!)
        fs.writeFileSync(tempFilePath, resolvedContent)

        logger.debug('Loading resolved module via TSX')

        // Use TSX to load the resolved TypeScript file
        const { spawn } = require('child_process')

        const result = await new Promise<any>((resolve, reject) => {
          const tsxScript = `
            async function loadResolvedRouter() {
              try {
                const module = await import('${pathToFileURL(tempFilePath).href}');
                const router = module?.AppRouter || module?.default?.AppRouter || module?.default || module?.router;

                if (router && typeof router === 'object') {
                  // Extract safe metadata
                  const safeRouter = {
                    config: {
                      baseURL: router.config?.baseURL || '',
                      basePATH: router.config?.basePATH || ''
                    },
                    controllers: {}
                  };

                  if (router.controllers && typeof router.controllers === 'object') {
                    for (const [controllerName, controller] of Object.entries(router.controllers)) {
                      if (controller && typeof controller === 'object' && (controller as any).actions) {
                        const safeActions: Record<string, any> = {};

                        for (const [actionName, action] of Object.entries((controller as any).actions)) {
                          if (action && typeof action === 'object') {
                            safeActions[actionName] = {
                              path: (action as any).path || '',
                              method: (action as any).method || 'GET',
                              description: (action as any).description,
                              $Infer: (action as any).$Infer
                            };
                          }
                        }

                        safeRouter.controllers[controllerName] = {
                          name: (controller as any).name || controllerName,
                          path: (controller as any).path || '',
                          actions: safeActions
                        };
                      }
                    }
                  }

                  console.log('__ROUTER_SUCCESS__' + JSON.stringify(safeRouter));
                  process.exit(0); // Force exit after success
                } else {
                  console.log('__ROUTER_ERROR__No router found in resolved module');
                  process.exit(1); // Force exit after error
                }
              } catch (error) {
                console.log('__ROUTER_ERROR__' + error.message);
                process.exit(1); // Force exit after error
              }
            }

            loadResolvedRouter();
          `;

          const child = spawn('npx', ['tsx', '-e', tsxScript], {
            stdio: 'pipe',
            cwd: process.cwd(),
            env: { ...process.env, NODE_NO_WARNINGS: '1' }
          })

          let output = ''
          let errorOutput = ''

          child.stdout?.on('data', (data: Buffer) => {
            output += data.toString()
          })

          child.stderr?.on('data', (data: Buffer) => {
            errorOutput += data.toString()
          })

          child.on('close', (code: number | null) => {
            if (output.includes('__ROUTER_SUCCESS__')) {
              const resultLine = output.split('\n').find(line => line.includes('__ROUTER_SUCCESS__'))
              if (resultLine) {
                try {
                  const routerData = JSON.parse(resultLine.replace('__ROUTER_SUCCESS__', ''))
                  resolve(routerData)
                } catch (e: any) {
                  reject(new Error('Failed to parse resolved router data: ' + e.message))
                }
              } else {
                reject(new Error('Router success marker found but no data'))
              }
            } else if (output.includes('__ROUTER_ERROR__')) {
              const errorLine = output.split('\n').find(line => line.includes('__ROUTER_ERROR__'))
              const errorMsg = errorLine ? errorLine.replace('__ROUTER_ERROR__', '') : 'Unknown error'
              reject(new Error('Router loading failed: ' + errorMsg))
            } else {
              reject(new Error(`TSX execution failed with code ${code}: ${errorOutput || 'No output'}`))
            }
          })

          child.on('error', (error: any) => {
            reject(new Error('Failed to spawn TSX process for resolved module: ' + error.message))
          })

          setTimeout(() => {
            child.kill()
            reject(new Error('Timeout loading resolved TypeScript file with TSX'))
          }, 30000)
        })

        return result

      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath)
        }
      }

    } catch (error) {
      logger.error('Index resolution failed', { path: routerPath }, error)
      throw error
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
          router = await this.loadRouter(routerPath)
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

    } catch (error) {
      this.logger.error('Schema generation failed', {}, error)
    } finally {
      this.isGenerating = false
      // Don't resume spinner here - let handleFileChange or start() handle it
    }
  }
}
