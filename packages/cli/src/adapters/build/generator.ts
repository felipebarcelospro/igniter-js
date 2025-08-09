import * as fs from 'fs'
import * as path from 'path'
import type { IgniterBuildConfig } from './watcher'
import { createChildLogger } from '../logger'
import { createDetachedSpinner } from '@/lib/spinner'

type IgniterRouterSchema = {
  config: {
    baseURL: string
    basePATH: string
  }
  controllers: Record<string, any>
  processor: any
  handler: any
  $context: any
  $plugins: any
  $caller: any
}

type IgniterRouter = {
  config: {
    baseURL: string
    basePATH: string
  }
  controllers: Record<string, any>
  processor: any
  handler: any
  $context: any
  $plugins: any
  $caller: any
}

/**
 * Get file size in a human-readable format
 */
function getFileSize(filePath: string): string {
  try {
    const stats = fs.statSync(filePath)
    const bytes = stats.size

    if (bytes < 1024) return `${bytes}b`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`
    return `${(bytes / (1024 * 1024)).toFixed(1)}mb`
  } catch {
    return '0b'
  }
}

/**
 * Extracts a clean schema from router for client-side usage.
 * Removes all server-side logic (handlers, middleware, adapters).
 */
function extractRouterSchema(router: IgniterRouter): { schema: IgniterRouterSchema, stats: { controllers: number, actions: number } } {
  const controllersSchema: Record<string, any> = {};
  let totalActions = 0;

  for (const [controllerName, controller] of Object.entries(router.controllers)) {
    const actionsSchema: Record<string, any> = {};

    // Correctly access actions from controller
    if (controller && controller.actions) {
      for (const [actionName, action] of Object.entries(controller.actions)) {
        // Extract only safe properties
        actionsSchema[actionName] = {
          name: (action as any)?.name || actionName,
          description: (action as any)?.description || '',
          path: (action as any)?.path || '',
          method: (action as any)?.method || 'GET',
        };
        totalActions++;
      }
    }

    controllersSchema[controllerName] = {
      name: (controller as any)?.name || controllerName,
      description: (controller as any)?.description || '',
      path: (controller as any)?.path || '',
      actions: actionsSchema,
    };
  }

  // @ts-expect-error - Expected
  const schema: IgniterRouterSchema = {
    controllers: controllersSchema,
  };

  return {
    schema,
    stats: {
      controllers: Object.keys(controllersSchema).length,
      actions: totalActions
    }
  };
}

/**
 * Generate client files from Igniter router
 */
export async function generateSchemaFromRouter(
  router: IgniterRouter,
  config: IgniterBuildConfig
) {
  const logger = createChildLogger({ component: 'generator' })
  const startTime = performance.now()

  // Detect if we're in interactive mode
  const isInteractiveMode = !!(
    process.env.IGNITER_INTERACTIVE_MODE === 'true' ||
    process.argv.includes('--interactive')
  )

  try {
    // Step 1: Extract router schema
    let extractSpinner: any = null

    if (isInteractiveMode) {
      logger.info('Extracting router schema...')
    } else {
      extractSpinner = createDetachedSpinner('Extracting router schema...')
      extractSpinner.start()
    }

    // Extract schema (always needed)
    const { schema, stats } = extractRouterSchema(router)

    if (isInteractiveMode) {
      logger.success(`Schema extracted - ${stats.controllers} controllers, ${stats.actions} actions`)
    } else if (extractSpinner) {
      extractSpinner.success(`Schema extracted - ${stats.controllers} controllers, ${stats.actions} actions`)
    }

    // Step 2: Prepare output directory
    let dirSpinner: any = null

    if (isInteractiveMode) {
      logger.info('Preparing output directory...')
    } else {
      dirSpinner = createDetachedSpinner('Preparing output directory...')
      dirSpinner.start()
    }

    // Prepare directory (always needed)
    const outputDir = config.outputDir || 'generated'
    await ensureDirectoryExists(outputDir)
    const outputPath = path.resolve(outputDir)

    if (isInteractiveMode) {
      logger.success(`Output directory ready ${outputPath}`)
    } else if (dirSpinner) {
      dirSpinner.success(`Output directory ready ${outputPath}`)
    }

    // Step 3: Generate all files
    let filesSpinner: any = null

    if (isInteractiveMode) {
      logger.info('Generating client files...')
    } else {
      filesSpinner = createDetachedSpinner('Generating client files...')
      filesSpinner.start()
    }

    // Generate files (always needed)
    const filePaths = await Promise.all([
      generateSchemaFile(schema, outputDir, config),
      generateClientFile(schema, outputDir, config),
    ])

    if (isInteractiveMode) {
      logger.success('Files generated successfully')
    } else if (filesSpinner) {
      filesSpinner.success('Files generated successfully')
    }

    // Step 4: Show file details (only in non-interactive mode to avoid clutter)
    if (!isInteractiveMode) {
      const files = [
        { name: 'igniter.schema.ts', path: filePaths[0] },
        { name: 'igniter.client.ts', path: filePaths[1] },
      ]

      let totalSize = 0
      files.forEach(file => {
        const size = getFileSize(file.path)
        totalSize += fs.statSync(file.path).size
        logger.info(`Generated ${file.name}`, { size, path: path.relative(process.cwd(), file.path) })
      })

      // Final summary (only in non-interactive mode)
      const duration = ((performance.now() - startTime) / 1000).toFixed(2)
      const totalSizeFormatted = totalSize < 1024
        ? `${totalSize}b`
        : totalSize < 1024 * 1024
          ? `${(totalSize / 1024).toFixed(1)}kb`
          : `${(totalSize / (1024 * 1024)).toFixed(1)}mb`

      logger.separator()
      logger.success('Igniter.js development server is up and running')
      logger.info('Press Ctrl+C to stop')
      logger.info('Summary', {
        output: outputPath,
        files: files.length,
        totalSize: totalSizeFormatted,
        controllers: stats.controllers,
        actions: stats.actions,
        duration: `${duration}s`,
        timestamp: new Date().toISOString()
      })

      logger.groupEnd()
    } else {
      // Simplified summary for interactive mode
      const duration = ((performance.now() - startTime) / 1000).toFixed(2)
      logger.success(`Client generated successfully - ${stats.controllers} controllers, ${stats.actions} actions (${duration}s)`)
    }

  } catch (error) {
    logger.error('Client generation failed', {}, error)
    throw error
  }
}

/**
 * Generate schema TypeScript file
 */
async function generateSchemaFile(
  schema: IgniterRouterSchema,
  outputDir: string,
  config: IgniterBuildConfig
): Promise<string> {
  const content = `// Generated by @igniter-js/cli - DO NOT EDIT

export const AppRouterSchema = ${JSON.stringify(schema, null, 2)} as const

export type AppRouterSchemaType = typeof AppRouterSchema
`

  const filePath = path.join(outputDir, 'igniter.schema.ts')
  await writeFileWithHeader(filePath, content, config)

  return filePath
}

/**
 * Generate client TypeScript file
 */
async function generateClientFile(
  schema: IgniterRouterSchema,
  outputDir: string,
  config: IgniterBuildConfig
): Promise<string> {
  const filePath = path.join(outputDir, 'igniter.client.ts')

  // Only generate the client file if it doesn't already exist
  if (fs.existsSync(filePath)) {
    const logger = createChildLogger({ component: 'generator' })
    logger.info('Skipping client file generation, already exists', { path: filePath })
    return filePath
  }

  const content = `* eslint-disable */
/* prettier-ignore */

import { createIgniterClient, useIgniterQueryClient } from '@igniter-js/core/client'
import type { AppRouterType } from './igniter.router'

/**
* Type-safe API client generated from your Igniter router
*
* Usage in Server Components:
* const users = await api.users.list.query()
*
* Usage in Client Components:
* const { data } = api.users.list.useQuery()
*
* Note: Adjust environment variable prefixes (e.g., NEXT_PUBLIC_, BUN_PUBLIC_, DENO_PUBLIC_, REACT_APP_)
*       according to your project's framework/runtime (Next.js, Bun, Deno, React/Vite, etc.).
*/
export const api = createIgniterClient<AppRouterType>({
baseURL: process.env.NEXT_PUBLIC_IGNITER_API_URL, // Adapt for your needs
basePath: process.env.NEXT_PUBLIC_IGNITER_API_BASE_PATH,
router: () => {
  if (typeof window === 'undefined') {
    return require('./igniter.router').AppRouter
  }

  return require('./igniter.schema').AppRouterSchema
},
})

/**
  * Type-safe API client generated from your Igniter router
  *
  * Usage in Server Components:
  * const users = await api.users.list.query()
  *
  * Usage in Client Components:
  * const { data } = api.users.list.useQuery()
  */
export type ApiClient = typeof api

/**
  * Type-safe query client generated from your Igniter router
  *
  * Usage in Client Components:
  * const { invalidate } = useQueryClient()
  */
export const useQueryClient = useIgniterQueryClient<AppRouterType>;
`
  await writeFileWithHeader(filePath, content, config)

  return filePath
}

/**
 * Write file with generation header
 */
async function writeFileWithHeader(
  filePath: string,
  content: string,
  config: IgniterBuildConfig
) {
  const header = generateFileHeader(config)
  const fullContent = header + '\n\n' + content

  await fs.promises.writeFile(filePath, fullContent, 'utf8')
}

/**
 * Generate file header with metadata
 */
function generateFileHeader(config: IgniterBuildConfig): string {
  const timestamp = new Date().toISOString()

  return `/* eslint-disable */
/* prettier-ignore */

/**
 * Generated by @igniter-js/cli
 *
 * WARNING: DO NOT EDIT THIS FILE MANUALLY
 *
 * This file was automatically generated from your Igniter router.
 * Any changes made to this file will be overwritten when the CLI regenerates it.
 *
 * To modify the client API, update your controller files instead.
 *
 * Generated: ${timestamp}
 * Framework: ${config.framework}
 * Output: ${config.outputDir}
 */`
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.promises.access(dirPath)
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.promises.mkdir(dirPath, { recursive: true })
  }
}
