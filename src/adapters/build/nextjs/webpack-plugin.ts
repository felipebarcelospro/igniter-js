import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'
import type { Compiler } from 'webpack'
import type { 
  IgniterBuildConfig, 
  IgniterBuildContext, 
  ExtractedController,
  GeneratedClientFile 
} from '../types'

/**
 * Webpack plugin for Igniter build-time type extraction
 * Extracts controller types and generates client-safe versions
 */
export class IgniterWebpackPlugin {
  private config: IgniterBuildConfig
  private context: IgniterBuildContext
  private watchMode = false

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

    this.context = {
      cwd: process.cwd(),
      srcDir: path.join(process.cwd(), 'src'),
      outDir: path.join(process.cwd(), this.config.outputDir!),
      isDev: process.env.NODE_ENV === 'development',
      isProd: process.env.NODE_ENV === 'production',
      framework: this.config.framework || 'nextjs'
    }
  }

  apply(compiler: Compiler) {
    const pluginName = 'IgniterWebpackPlugin'

    // Check if in watch mode (development)
    compiler.hooks.watchRun.tap(pluginName, () => {
      this.watchMode = true
      this.log('Running in watch mode')
    })

    // Main plugin logic
    compiler.hooks.beforeCompile.tapAsync(pluginName, async (_, callback) => {
      try {
        if (this.config.extractTypes) {
          await this.extractAndGenerate()
        }
        callback()
      } catch (error) {
        this.log('Error during extraction:', error)
        callback(error as Error)
      }
    })

    // Hot reload support
    if (this.config.hotReload && this.watchMode) {
      compiler.hooks.invalid.tap(pluginName, (filename) => {
        if (filename && this.isControllerFile(filename)) {
          this.log(`Controller file changed: ${filename}`)
          this.extractAndGenerate().catch(console.error)
        }
      })
    }
  }

  /**
   * Main extraction and generation logic
   */
  private async extractAndGenerate(): Promise<void> {
    this.log('Starting type extraction...')

    // Find all controller files
    const controllerFiles = await this.findControllerFiles()
    this.log(`Found ${controllerFiles.length} controller files`)

    if (controllerFiles.length === 0) {
      this.log('No controller files found')
      return
    }

    // Extract metadata from each controller
    const extractedControllers: ExtractedController[] = []
    for (const filePath of controllerFiles) {
      try {
        const controller = await this.extractController(filePath)
        if (controller) {
          extractedControllers.push(controller)
        }
      } catch (error) {
        this.log(`Error extracting controller ${filePath}:`, error)
      }
    }

    // Generate client-safe files
    const generatedFiles = await this.generateClientFiles(extractedControllers)
    
    // Write files to disk
    await this.writeGeneratedFiles(generatedFiles)

    this.log(`Generated ${generatedFiles.length} client files`)
  }

  /**
   * Find all controller files matching patterns
   */
  private async findControllerFiles(): Promise<string[]> {
    const patterns = this.config.controllerPatterns!
    const files: string[] = []

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.context.srcDir,
        absolute: true
      })
      files.push(...matches)
    }

    return [...new Set(files)] // Remove duplicates
  }

  /**
   * Extract metadata from a controller file
   */
  private async extractController(filePath: string): Promise<ExtractedController | null> {
    try {
      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8')
      
      // Parse with TypeScript AST (simplified for now)
      const controller = this.parseControllerFile(content, filePath)
      
      return controller
    } catch (error) {
      this.log(`Failed to extract controller from ${filePath}:`, error)
      return null
    }
  }

  /**
   * Parse controller file and extract metadata (simplified implementation)
   * In a real implementation, this would use TypeScript's AST parser
   */
  private parseControllerFile(content: string, filePath: string): ExtractedController | null {
    // This is a simplified regex-based parser
    // In production, we'd use typescript's AST parser
    
    const controllerRegex = /export\s+const\s+(\w+)\s*=\s*\w+\.controller\s*\(\s*{([^}]+)}\s*\)/
    const match = content.match(controllerRegex)
    
    if (!match) {
      return null
    }

    const [, controllerName, configContent] = match
    
    // Extract path
    const pathMatch = configContent.match(/path:\s*['"`]([^'"`]+)['"`]/)
    const controllerPath = pathMatch ? pathMatch[1] : '/'

    // Extract actions (simplified)
    const actionsMatch = configContent.match(/actions:\s*{([^}]+)}/)
    const actions = actionsMatch ? this.parseActions(actionsMatch[1]) : []

    // Extract imports
    const imports = this.extractImports(content)

    return {
      filePath,
      name: controllerName,
      path: controllerPath,
      actions,
      imports
    }
  }

  /**
   * Parse actions from controller configuration (simplified)
   */
  private parseActions(actionsContent: string): any[] {
    // Simplified action parsing
    // In production, use proper AST parsing
    const actionRegex = /(\w+):\s*\w+\.(query|mutation)\s*\(/g
    const actions = []
    let match

    while ((match = actionRegex.exec(actionsContent)) !== null) {
      const [, actionName, actionType] = match
      actions.push({
        name: actionName,
        method: actionType === 'mutation' ? 'POST' : 'GET',
        path: '/', // Simplified
        input: {},
        output: 'any', // Would be extracted from handler
        description: undefined,
        middleware: []
      })
    }

    return actions
  }

  /**
   * Extract import statements from file content
   */
  private extractImports(content: string): string[] {
    const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g
    const imports: string[] = []
    let match

    while ((match = importRegex.exec(content)) !== null) {
      // Only include type-safe imports (no server-only packages)
      const importPath = match[1]
      if (!this.isServerOnlyImport(importPath)) {
        imports.push(match[0])
      }
    }

    return imports
  }

  /**
   * Check if an import is server-only and should be excluded
   */
  private isServerOnlyImport(importPath: string): boolean {
    const serverOnlyPackages = [
      'prisma',
      '@prisma/client',
      'ioredis',
      'bullmq',
      'nodemailer',
      'aws-sdk',
      'fs',
      'path',
      'crypto',
      'os'
    ]

    return serverOnlyPackages.some(pkg => importPath.includes(pkg))
  }

  /**
   * Generate client-safe files from extracted controllers
   */
  private async generateClientFiles(controllers: ExtractedController[]): Promise<GeneratedClientFile[]> {
    const files: GeneratedClientFile[] = []

    // Generate individual controller files
    for (const controller of controllers) {
      const clientFile = this.generateClientController(controller)
      files.push(clientFile)
    }

    // Generate router file
    const routerFile = this.generateClientRouter(controllers)
    files.push(routerFile)

    // Generate index file
    const indexFile = this.generateClientIndex(controllers)
    files.push(indexFile)

    return files
  }

  /**
   * Generate client-safe controller file
   */
  private generateClientController(controller: ExtractedController): GeneratedClientFile {
    const fileName = `${controller.name}.client.ts`
    const filePath = path.join(this.context.outDir, fileName)
    
    const content = `
// Generated by Igniter - DO NOT EDIT
// Source: ${controller.filePath}
${controller.imports.join('\n')}

export const ${controller.name}Client = {
  path: '${controller.path}',
  actions: {
${controller.actions.map(action => `
    ${action.name}: {
      method: '${action.method}' as const,
      path: '${action.path}' as const,
      // Types preserved for inference
      _inputType: {} as any, // TODO: Extract actual input type
      _outputType: {} as any, // TODO: Extract actual output type
    }`).join(',')}
  }
} as const

export type ${controller.name}ClientType = typeof ${controller.name}Client
`.trim()

    return {
      filePath,
      content,
      sourceFile: controller.filePath,
      timestamp: new Date()
    }
  }

  /**
   * Generate client router file
   */
  private generateClientRouter(controllers: ExtractedController[]): GeneratedClientFile {
    const filePath = path.join(this.context.outDir, 'router.client.ts')
    
    const imports = controllers.map(c => 
      `import { ${c.name}Client } from './${c.name}.client'`
    ).join('\n')

    const controllerEntries = controllers.map(c => {
      const key = c.name.replace(/Controller$/, '').toLowerCase()
      return `  ${key}: ${c.name}Client`
    }).join(',\n')

    const content = `
// Generated by Igniter - DO NOT EDIT
${imports}

export const AppRouterClient = {
${controllerEntries}
} as const

export type AppRouterClientType = typeof AppRouterClient
`.trim()

    return {
      filePath,
      content,
      sourceFile: 'multiple',
      timestamp: new Date()
    }
  }

  /**
   * Generate client index file
   */
  private generateClientIndex(controllers: ExtractedController[]): GeneratedClientFile {
    const filePath = path.join(this.context.outDir, 'index.ts')
    
    const exports = [
      'export * from ./router.client',
      ...controllers.map(c => `export * from './${c.name}.client'`)
    ].join('\n')

    const content = `
// Generated by Igniter - DO NOT EDIT
// Client-safe exports
${exports}
`.trim()

    return {
      filePath,
      content,
      sourceFile: 'multiple',
      timestamp: new Date()
    }
  }

  /**
   * Write generated files to disk
   */
  private async writeGeneratedFiles(files: GeneratedClientFile[]): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(this.context.outDir)) {
      fs.mkdirSync(this.context.outDir, { recursive: true })
    }

    // Write each file
    for (const file of files) {
      fs.writeFileSync(file.filePath, file.content, 'utf-8')
      this.log(`Generated: ${file.filePath}`)
    }

    // Write metadata file
    const metadataFile = path.join(this.context.outDir, '.igniter-build.json')
    const metadata = {
      timestamp: new Date().toISOString(),
      framework: this.context.framework,
      files: files.map(f => ({
        path: f.filePath,
        source: f.sourceFile,
        timestamp: f.timestamp.toISOString()
      }))
    }
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2))
  }

  /**
   * Check if a file is a controller file
   */
  private isControllerFile(filePath: string): boolean {
    return filePath.includes('.controller.') && (filePath.endsWith('.ts') || filePath.endsWith('.js'))
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[Igniter Plugin]', ...args)
    }
  }
} 