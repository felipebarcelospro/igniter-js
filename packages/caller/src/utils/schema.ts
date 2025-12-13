import type { IgniterLogger, StandardSchemaV1 } from '@igniter-js/core'
import { IgniterCallerError } from '../errors/igniter-caller.error'
import type {
  IgniterCallerEndpointSchema,
  IgniterCallerSchemaMap,
  IgniterCallerSchemaMethod,
  IgniterCallerSchemaValidationOptions,
} from '../types/schemas'

/**
 * Utilities for schema matching and validation.
 *
 * @internal
 */
export class IgniterCallerSchemaUtils {
  /**
   * Matches a URL path against schema map paths (supports path parameters).
   *
   * @example
   * ```ts
   * matchPath('/users/123', '/users/:id') // { matched: true, params: { id: '123' } }
   * matchPath('/users', '/users/:id')     // { matched: false }
   * ```
   */
  static matchPath(
    actualPath: string,
    schemaPath: string,
  ): { matched: boolean; params?: Record<string, string> } {
    // Exact match (no params)
    if (actualPath === schemaPath) {
      return { matched: true, params: {} }
    }

    // Build regex from schema path pattern
    const paramNames: string[] = []
    const regexPattern = schemaPath
      .replace(/:[^/]+/g, (match) => {
        paramNames.push(match.slice(1)) // Remove ':'
        return '([^/]+)'
      })
      .replace(/\//g, '\\/')

    const regex = new RegExp(`^${regexPattern}$`)
    const match = actualPath.match(regex)

    if (!match) {
      return { matched: false }
    }

    // Extract params
    const params: Record<string, string> = {}
    for (let i = 0; i < paramNames.length; i++) {
      params[paramNames[i]] = match[i + 1]
    }

    return { matched: true, params }
  }

  /**
   * Finds the schema for a given path and method from the schema map.
   */
  static findSchema(
    schemaMap: IgniterCallerSchemaMap | undefined,
    path: string,
    method: string,
  ): {
    schema: IgniterCallerEndpointSchema | undefined
    params: Record<string, string>
  } {
    if (!schemaMap) {
      return { schema: undefined, params: {} }
    }

    // Try exact match first
    const exactMatch = schemaMap[path]?.[method as IgniterCallerSchemaMethod]
    if (exactMatch) {
      return { schema: exactMatch, params: {} }
    }

    // Try pattern matching with path params
    for (const [schemaPath, methods] of Object.entries(schemaMap)) {
      const matchResult = IgniterCallerSchemaUtils.matchPath(path, schemaPath)
      if (matchResult.matched) {
        const schema = methods?.[method as IgniterCallerSchemaMethod]
        if (schema) {
          return { schema, params: matchResult.params || {} }
        }
      }
    }

    return { schema: undefined, params: {} }
  }

  /**
   * Validates input using StandardSchemaV1.
   *
   * If the schema provides `~standard.validate`, it will be used.
   * Otherwise, returns the input as-is.
   */
  private static async validateWithStandardSchema<
    TSchema extends StandardSchemaV1,
  >(
    schema: TSchema,
    input: unknown,
  ): Promise<StandardSchemaV1.InferInput<TSchema>> {
    const standard = (schema as any)?.['~standard'] as
      | {
          validate: (
            value: unknown,
          ) =>
            | { value?: unknown; issues?: unknown[] }
            | Promise<{ value?: unknown; issues?: unknown[] }>
        }
      | undefined

    if (!standard?.validate) {
      return input as StandardSchemaV1.InferInput<TSchema>
    }

    const result = await standard.validate(input)

    if ((result as any)?.issues?.length) {
      throw {
        issues: (result as any).issues,
        _standardSchemaValidationError: true,
      }
    }

    return ((result as any)?.value ??
      input) as StandardSchemaV1.InferInput<TSchema>
  }

  /**
   * Validates request body against schema.
   *
   * @returns Validated data or throws/logs error based on validation mode
   */
  static async validateRequest<T>(
    data: unknown,
    schema: StandardSchemaV1 | undefined,
    options: IgniterCallerSchemaValidationOptions | undefined,
    context: { url: string; method: string },
    logger?: IgniterLogger,
  ): Promise<T> {
    if (!schema || options?.mode === 'off') {
      return data as T
    }

    try {
      const validated =
        await IgniterCallerSchemaUtils.validateWithStandardSchema(schema, data)
      return validated as T
    } catch (error: any) {
      // Handle validation error
      if (options?.onValidationError && error?._standardSchemaValidationError) {
        options.onValidationError(error, { ...context, statusCode: 0 })
      }

      if (options?.mode === 'soft') {
        logger?.warn('Request validation failed (soft mode)', {
          url: context.url,
          method: context.method,
          errors: error?.issues,
        })
        return data as T
      }

      // Strict mode: throw
      throw new IgniterCallerError({
        code: 'IGNITER_CALLER_REQUEST_VALIDATION_FAILED',
        message: `Request validation failed for ${context.method} ${context.url}`,
        statusCode: 400,
        details: error?.issues,
        operation: 'validateRequest',
      })
    }
  }

  /**
   * Validates response data against schema.
   *
   * @returns Validated data or throws/logs error based on validation mode
   */
  static async validateResponse<T>(
    data: unknown,
    schema: StandardSchemaV1 | undefined,
    statusCode: number,
    options: IgniterCallerSchemaValidationOptions | undefined,
    context: { url: string; method: string },
    logger?: IgniterLogger,
  ): Promise<T> {
    if (!schema || options?.mode === 'off') {
      return data as T
    }

    try {
      const validated =
        await IgniterCallerSchemaUtils.validateWithStandardSchema(schema, data)
      return validated as T
    } catch (error: any) {
      // Handle validation error
      if (options?.onValidationError && error?._standardSchemaValidationError) {
        options.onValidationError(error, { ...context, statusCode })
      }

      if (options?.mode === 'soft') {
        logger?.warn('Response validation failed (soft mode)', {
          url: context.url,
          method: context.method,
          statusCode,
          errors: error?.issues,
        })
        return data as T
      }

      // Strict mode: throw
      throw new IgniterCallerError({
        code: 'IGNITER_CALLER_RESPONSE_VALIDATION_FAILED',
        message: `Response validation failed for ${context.method} ${context.url} (${statusCode})`,
        statusCode,
        details: error?.issues,
        operation: 'validateResponse',
      })
    }
  }
}
