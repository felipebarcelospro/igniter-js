import type {
  IgniterCallerMockHandlerDefinition,
  IgniterCallerMockRegistry,
  IgniterCallerMockResolvedHandler,
  IIgniterCallerMockManager,
} from '../types/mock'
import type {
  IgniterCallerSchemaMap,
  IgniterCallerSchemaMethod,
} from '../types/schemas'
import { IgniterCallerSchemaUtils } from '../utils/schema'

/**
 * Runtime mock registry resolver for caller requests.
 */
export class IgniterCallerMockManager<
  TSchemas extends IgniterCallerSchemaMap,
> implements IIgniterCallerMockManager<TSchemas> {
  private readonly registry: IgniterCallerMockRegistry<TSchemas>

  constructor(registry: IgniterCallerMockRegistry<TSchemas>) {
    this.registry = registry
  }

  /**
   * Resolves a mock handler for a path+method pair.
   *
   * @param path - Request path (normalized).
   * @param method - HTTP method.
   * @returns Resolved handler info or null when no match is found.
   */
  resolve(
    path: string,
    method: IgniterCallerSchemaMethod,
  ): IgniterCallerMockResolvedHandler<TSchemas> | null {
    const direct = this.registry[path as keyof TSchemas]?.[method] as
      | IgniterCallerMockHandlerDefinition<TSchemas, any, any>
      | undefined

    if (direct) {
      return {
        handler: direct as any,
        params: {},
        path: path as any,
        method: method as any,
      }
    }

    for (const [registeredPath, methods] of Object.entries(this.registry)) {
      if (!methods) continue
      const match = IgniterCallerSchemaUtils.matchPath(path, registeredPath)
      if (!match.matched) continue
      const handler = (methods as any)[method] as
        | IgniterCallerMockHandlerDefinition<TSchemas, any, any>
        | undefined
      if (!handler) continue

      return {
        handler: handler as any,
        params: match.params || {},
        path: registeredPath as any,
        method: method as any,
      }
    }

    return null
  }
}
