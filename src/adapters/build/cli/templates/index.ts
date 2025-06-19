import type { IgniterBuildConfig } from '../../types'
import type { IgniterRouterSchema } from '../../../../types'

/**
 * Render schema template
 */
export function renderSchemaTemplate(
  schema: IgniterRouterSchema<any, any>,
  config: IgniterBuildConfig
): string {
  return `import type { IgniterRouterSchema } from '@igniter-js/core'

// Clean schema extracted from your Igniter router
export const AppRouterSchemaData: IgniterRouterSchema<any, any> = ${JSON.stringify(schema, null, 2)} as const

// Type-only export for TypeScript inference
export type AppRouterSchema = typeof AppRouterSchemaData

// Helper types for better DX
export type AppRouterControllers = AppRouterSchema['controllers']
export type AppRouterConfig = AppRouterSchema['config']
`
}

/**
 * Render client template
 */
export function renderClientTemplate(
  schema: IgniterRouterSchema<any, any>,
  config: IgniterBuildConfig
): string {
  const isNextJS = config.framework === 'nextjs'
  const baseUrl = schema.config.basePATH || '/api/v1'
  
  return `import { createIgniterSchemaClient } from '@igniter-js/core/client'
import type { AppRouterSchema } from './schema.generated'
import { AppRouterSchemaData } from './schema.generated'

${isNextJS ? generateNextJSImports() : ''}

${isNextJS ? generateServerRouterGetter() : ''}

/**
 * Type-safe Igniter client generated from your router schema
 * 
 * This client provides:
 * - Full TypeScript inference from your controllers
 * - Automatic HTTP requests to your API endpoints
 * ${isNextJS ? '- Hybrid execution (direct calls in Server Components when possible)' : ''}
 * - React hooks for Client Components (useQuery, useMutation)
 * 
 * Usage:
 * - Server Components: await api.users.list.query()
 * - Client Components: const { data } = api.users.list.useQuery()
 */
export const api = createIgniterSchemaClient<AppRouterSchema>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '${baseUrl}',
  schema: AppRouterSchemaData,${isNextJS ? '\n  getServerRouter,' : ''}
})

// Export types for advanced usage
export type ApiClient = typeof api
export type ApiRouterSchema = AppRouterSchema
`
}

/**
 * Generate Next.js specific imports
 */
function generateNextJSImports(): string {
  return `// Next.js specific imports for hybrid execution
import { cache } from 'react'
`
}

/**
 * Generate server router getter for Next.js hybrid execution
 */
function generateServerRouterGetter(): string {
  return `/**
 * Dynamic server router getter for hybrid execution
 * Only loads the full router in server environment when needed
 */
const getServerRouter = cache(async () => {
  // Only attempt to load router on server-side
  if (typeof window === 'undefined') {
    try {
      // Dynamic import prevents bundling server code in client
      const routerModule = await import('@/igniter.router')
      const router = routerModule.AppRouter || routerModule.default || routerModule.router
      
      if (router && typeof router.processor?.call === 'function') {
        return router
      }
    } catch (error) {
      // Silently fall back to HTTP requests if router can't be loaded
      console.warn('Could not load server router for direct calls, using HTTP fallback:', error.message)
    }
  }
  
  return null
})
`
}

/**
 * Generate controller-specific client code
 */
export function generateControllerClient(
  controllerName: string,
  controller: any,
  config: IgniterBuildConfig
): string {
  const actions = Object.entries(controller.actions).map(([actionName, action]: [string, any]) => {
    const methodType = action.method === 'GET' ? 'query' : 'mutate'
    const hookType = action.method === 'GET' ? 'useQuery' : 'useMutation'
    
    return `    ${actionName}: {
      ${methodType}: createAction('${controllerName}', '${actionName}', ${JSON.stringify(action)}),
      ${hookType}: createHook('${controllerName}', '${actionName}', ${JSON.stringify(action)})
    }`
  }).join(',\n')

  return `  ${controllerName}: {
${actions}
  }`
}

/**
 * Generate type definitions for actions
 */
export function generateActionTypes(
  schema: IgniterRouterSchema<any, any>
): string {
  const controllerTypes = Object.entries(schema.controllers).map(([controllerName, controller]) => {
    const actionTypes = Object.entries((controller as any).actions).map(([actionName, action]) => {
      return `      ${actionName}: {
        query: (input?: any) => Promise<any>
        useQuery: () => any
      }`
    }).join('\n')

    return `    ${controllerName}: {
${actionTypes}
    }`
  }).join('\n')

  return `export interface GeneratedApiClient {
${controllerTypes}
  }`
} 