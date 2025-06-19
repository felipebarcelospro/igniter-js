import * as fs from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { generateSchemaFromRouter } from './generator'

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
   * Load router from file with simplified approach
   */
  private async loadRouter(routerPath: string): Promise<any> {
    const fullPath = path.resolve(process.cwd(), routerPath)
    
    if (this.config.debug) {
      console.log('routerPath', routerPath)
      console.log('fullPath', fullPath)
    }
    
    try {
      if (this.config.debug) {
        console.log('🔧 Attempting to load router with TypeScript support...')
      }
      
      // Try using tsx or ts-node if available
      const module = await this.loadWithTypeScriptSupport(fullPath)
      
      if (module) {
        // Check if it's already a router object (TSX returns direct router data)
        if (module?.config && module?.controllers) {
          if (this.config.debug) {
            console.log('✅ Router loaded successfully (direct structure)')
          }
          return module
        }
        
        // Otherwise look for exported router
        const router = module?.AppRouter || module?.default || module?.router
        
        if (router && typeof router === 'object') {
          if (this.config.debug) {
            console.log('✅ Router loaded successfully (exported property)')
          }
          return router
        } else if (this.config.debug) {
          console.log('⚠️  Module loaded but no router found:', Object.keys(module || {}))
        }
      } else if (this.config.debug) {
        console.log('⚠️  TypeScript loading failed, trying import resolution...')
      }
      
      // Fallback: Try with import resolution
      const fallbackModule = await this.loadRouterWithIndexResolution(fullPath)
      
      if (fallbackModule) {
        // Check if it's already a router object (TSX returns direct router data)
        if (fallbackModule?.config && fallbackModule?.controllers) {
          if (this.config.debug) {
            console.log('✅ Router loaded successfully (fallback direct structure)')
          }
          return fallbackModule
        }
        
        // Otherwise look for exported router
        const router = fallbackModule?.AppRouter || fallbackModule?.default || fallbackModule?.router
        
        if (router && typeof router === 'object') {
          if (this.config.debug) {
            console.log('✅ Router loaded successfully (fallback exported property)')
          }
          return router
        }
      }
      
    } catch (error) {
      console.log(`💥 Error loading router:`, (error as Error)?.message || error)
      
      if (this.config.debug) {
        console.error('🔍 Full error details:', error)
        console.error('   Router path:', routerPath) 
        console.error('   Full path:', fullPath)
      }
    }
    
    return null
  }

  /**
   * Load TypeScript files using TSX runtime loader
   * This is the NEW robust approach that replaces the problematic transpilation
   */
  private async loadWithTypeScriptSupport(filePath: string): Promise<any> {
    // Method 1: Try to find and use compiled JS version first (faster)
    const jsPath = filePath.replace(/\.ts$/, '.js')
    if (fs.existsSync(jsPath)) {
      try {
        if (this.config.debug) {
          console.log('🔧 Found compiled JS version, loading...')
        }
        
        delete require.cache[jsPath]
        const module = require(jsPath)
        
        if (this.config.debug) {
          console.log('✅ Compiled JS loaded:', Object.keys(module || {}))
        }
        
        return module
      } catch (error) {
        if (this.config.debug) {
          console.log('⚠️  Compiled JS loading failed:', (error as Error).message)
        }
      }
    }
    
    // Method 2: Use TSX runtime loader (MAIN STRATEGY)
    if (filePath.endsWith('.ts')) {
      try {
        if (this.config.debug) {
          console.log('🔧 Trying TSX runtime loader...')
        }
        
        const { spawn } = require('child_process')
        
        // First, check if TSX is available
        const tsxCheckResult = await new Promise<boolean>((resolve) => {
          if (this.config.debug) {
            console.log('🔍 Checking if TSX is available...')
          }
          
          const checkChild = spawn('npx', ['tsx', '--version'], {
            stdio: 'pipe',
            cwd: process.cwd()
          })
          
          checkChild.on('close', (code) => {
            if (this.config.debug) {
              console.log('TSX check result code:', code)
            }
            resolve(code === 0)
          })
          
          checkChild.on('error', (error) => {
            if (this.config.debug) {
              console.log('TSX check error:', error.message)
            }
            resolve(false)
          })
          
          setTimeout(() => {
            checkChild.kill()
            resolve(false)
          }, 5000)
        })
        
        if (!tsxCheckResult) {
          if (this.config.debug) {
            console.log('⚠️  TSX not available, cannot use runtime loader')
          }
          throw new Error('TSX not available')
        }
        
        if (this.config.debug) {
          console.log('✅ TSX is available')
        }
        
        const result = await new Promise<any>((resolve, reject) => {
          // Create a TSX script that loads the module and extracts router info
          const tsxScript = `
            async function loadRouter() {
              try {
                const module = await import('${pathToFileURL(filePath).href}');
                const router = module?.AppRouter || module?.default || module?.router;
                
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
          
          if (this.config.debug) {
            console.log('🔧 About to spawn TSX process...')
            console.log('   Command: npx tsx -e [script]')
            console.log('   CWD:', process.cwd())
            console.log('   File path:', filePath)
          }

          const child = spawn('npx', ['tsx', '-e', tsxScript], {
            stdio: 'pipe',
            cwd: process.cwd(),
            env: { ...process.env, NODE_NO_WARNINGS: '1' }
          })
          
          if (this.config.debug) {
            console.log('✅ TSX process spawned, PID:', child.pid)
          }
          
          let output = ''
          let errorOutput = ''
          
          child.stdout?.on('data', (data) => {
            output += data.toString()
            if (this.config.debug) {
              console.log('📤 TSX stdout:', data.toString().trim())
            }
          })
          
          child.stderr?.on('data', (data) => {
            errorOutput += data.toString()
            if (this.config.debug) {
              console.log('📤 TSX stderr:', data.toString().trim())
            }
          })
          
          child.on('close', (code) => {
            if (this.config.debug) {
              console.log('🏁 TSX process closed with code:', code)
              console.log('📊 Total output length:', output.length)
              console.log('📊 Total error length:', errorOutput.length)
              console.log('TSX execution output:', output)
              console.log('TSX execution errors:', errorOutput)
            }
            
            if (output.includes('__ROUTER_SUCCESS__')) {
              const resultLine = output.split('\n').find(line => line.includes('__ROUTER_SUCCESS__'))
              if (resultLine) {
                try {
                  const routerData = JSON.parse(resultLine.replace('__ROUTER_SUCCESS__', ''))
                  if (this.config.debug) {
                    console.log('🎯 About to resolve with router data...')
                    console.log('   Controllers count:', Object.keys(routerData?.controllers || {}).length)
                  }
                  resolve(routerData)
                  if (this.config.debug) {
                    console.log('✅ Router data resolved successfully!')
                  }
                } catch (e) {
                  if (this.config.debug) {
                    console.log('💥 JSON parse error:', e.message)
                    console.log('   Raw line:', resultLine.substring(0, 200) + '...')
                  }
                  reject(new Error('Failed to parse router data: ' + e.message))
                }
              } else {
                if (this.config.debug) {
                  console.log('⚠️  Router success marker found but no result line')
                }
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
          
          child.on('error', (error) => {
            if (this.config.debug) {
              console.log('💥 TSX process error:', error.message)
            }
            reject(new Error('Failed to spawn TSX process: ' + error.message))
          })
          
          setTimeout(() => {
            if (this.config.debug) {
              console.log('⏰ TSX process timeout after 30s, killing...')
            }
            child.kill()
            reject(new Error('Timeout loading TypeScript file with TSX'))
          }, 30000) // Increased timeout for TSX
        })
        
        if (this.config.debug) {
          console.log('✅ TSX runtime loader succeeded')
        }
        
        return result
        
      } catch (error) {
        if (this.config.debug) {
          console.log('⚠️  TSX runtime loader failed:', (error as Error).message)
        }
        // Don't throw, let it fall back to the old method
      }
    }
    
    return null
  }

  /**
   * Load router by resolving directory imports to index files
   */
  private async loadRouterWithIndexResolution(routerPath: string): Promise<any> {
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
          if (this.config.debug) {
            console.log(`🔍 Processing import: ${importPath}`)
            console.log(`   Resolved to: ${resolvedPath}`)
          }
        } else if (importPath.startsWith('./')) {
          // Relative import from current directory
          resolvedPath = path.resolve(basePath, importPath)
          if (this.config.debug) {
            console.log(`🔍 Processing import: ${importPath}`)
            console.log(`   Resolved to: ${resolvedPath}`)
          }
        } else {
          // Direct path relative to current directory
          resolvedPath = path.resolve(basePath, importPath)
          if (this.config.debug) {
            console.log(`🔍 Processing import: ${importPath}`)
            console.log(`   Resolved to: ${resolvedPath}`)
          }
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
              
              if (this.config.debug) {
                console.log(`✅ Found file: ${filePath}`)
                console.log(`🔄 Resolved file import: ${importPath} -> ${finalPath}`)
              }
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
                
                if (this.config.debug) {
                  console.log(`✅ Found index file: ${indexFile}`)
                  console.log(`🔄 Resolved directory import: ${importPath} -> ${finalPath}`)
                }
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
        
        if (this.config.debug) {
          console.log('🔧 Loading resolved module via TSX...')
        }
        
        // Use TSX to load the resolved TypeScript file
        const { spawn } = require('child_process')
        
        const result = await new Promise<any>((resolve, reject) => {
          const tsxScript = `
            async function loadResolvedRouter() {
              try {
                const module = await import('${pathToFileURL(tempFilePath).href}');
                const router = module?.AppRouter || module?.default || module?.router;
                
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
          
          child.stdout?.on('data', (data) => {
            output += data.toString()
          })
          
          child.stderr?.on('data', (data) => {
            errorOutput += data.toString()
          })
          
          child.on('close', (code) => {
            if (this.config.debug) {
              console.log('TSX resolved module output:', output)
              console.log('TSX resolved module errors:', errorOutput)
            }
            
            if (output.includes('__ROUTER_SUCCESS__')) {
              const resultLine = output.split('\n').find(line => line.includes('__ROUTER_SUCCESS__'))
              if (resultLine) {
                try {
                  const routerData = JSON.parse(resultLine.replace('__ROUTER_SUCCESS__', ''))
                  resolve(routerData)
                } catch (e) {
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
          
          child.on('error', (error) => {
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
      if (this.config.debug) {
        console.error('❌ Error in index resolution:', error)
        console.error('   Router path:', routerPath)
      }
      throw error
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
          if (this.config.debug) {
            console.log('📂 Loading router from:', routerPath)
          }
          
          router = await this.loadRouter(routerPath)
          if (router) {
            if (this.config.debug) {
              console.log('✅ Router loaded successfully!')
              console.log('   Router type:', typeof router)
              console.log('   Router keys:', Object.keys(router || {}))
              console.log('   Controllers found:', Object.keys(router?.controllers || {}).length)
            }
            break
          } else {
            if (this.config.debug) {
              console.log('⚠️  Router loading returned null for:', routerPath)
            }
          }
        }
      }
      
      if (!router) {
        console.warn('⚠️  Could not load router for schema generation')
        return
      }

      if (this.config.debug) {
        console.log('🚀 About to call generateSchemaFromRouter...')
      }

      // Generate client files
      await generateSchemaFromRouter(router, this.config)
      
      if (this.config.debug) {
        console.log('✅ generateSchemaFromRouter completed!')
      }

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
} 