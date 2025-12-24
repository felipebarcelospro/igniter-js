/**
 * @fileoverview Schema builder for @igniter-js/caller.
 * @module @igniter-js/caller/builders/schema
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import { IgniterCallerError } from '../errors/caller.error'
import type {
  IgniterCallerEndpointSchema,
  IgniterCallerSchemaMap,
  IgniterCallerSchemaMethod,
} from '../types/schemas'
import type {
  IgniterCallerSchemaBuildResult,
  IgniterCallerSchemaGetters,
  IgniterCallerSchemaInfer,
  IgniterCallerSchemaRegistry,
} from '../types/schema-builder'
import { IgniterCallerSchemaPathBuilder } from './schema-path.builder'

/**
 * Path-first builder for caller schemas with registry support.
 */
export class IgniterCallerSchema<
  TSchemas extends IgniterCallerSchemaMap = {},
  TRegistry extends IgniterCallerSchemaRegistry = {},
> {
  private readonly schemas: TSchemas
  private readonly registry: TRegistry

  private constructor(schemas: TSchemas, registry: TRegistry) {
    this.schemas = schemas
    this.registry = registry
  }

  /**
   * Creates a new empty schema builder.
   */
  static create(): IgniterCallerSchema<{}, {}> {
    return new IgniterCallerSchema({}, {})
  }

  /**
   * Registers a reusable schema in the registry.
   */
  schema<TKey extends string, TSchema extends StandardSchemaV1>(
    key: TKey,
    schema: TSchema,
    options?: { internal?: boolean },
  ): IgniterCallerSchema<TSchemas, TRegistry & { [K in TKey]: TSchema }> {
    ensureValidSchemaKey(key)

    if (key in this.registry) {
      throw new IgniterCallerError({
        code: 'IGNITER_CALLER_SCHEMA_DUPLICATE',
        operation: 'buildSchema',
        message: `Schema registry key "${key}" is already defined.`,
        statusCode: 400,
        metadata: { key },
      })
    }

    const nextRegistry = {
      ...this.registry,
      [key]: schema,
    } as TRegistry & { [K in TKey]: TSchema }

    void options?.internal

    return new IgniterCallerSchema(this.schemas, nextRegistry)
  }

  /**
   * Defines a path with its methods using a fluent builder.
   */
  path<
    TPath extends string,
    TMethods extends Partial<
      Record<IgniterCallerSchemaMethod, IgniterCallerEndpointSchema<any, any>>
    >,
  >(
    path: TPath,
    builder: (
      pathBuilder: IgniterCallerSchemaPathBuilder<{}, TRegistry>,
    ) => IgniterCallerSchemaPathBuilder<TMethods, TRegistry>,
  ): IgniterCallerSchema<TSchemas & { [K in TPath]: TMethods }, TRegistry> {
    ensureValidPath(path)

    const pathBuilder = IgniterCallerSchemaPathBuilder.create(this.registry)
    const builtMethods = builder(pathBuilder).build()

    const existing = (this.schemas as IgniterCallerSchemaMap)[path] ?? {}
    for (const method of Object.keys(
      builtMethods,
    ) as IgniterCallerSchemaMethod[]) {
      if (method in existing) {
        throw new IgniterCallerError({
          code: 'IGNITER_CALLER_SCHEMA_DUPLICATE',
          operation: 'buildSchema',
          message: `Schema for "${path}" with method "${method}" is already defined.`,
          statusCode: 400,
          metadata: { path, method },
        })
      }
    }

    const merged = {
      ...existing,
      ...builtMethods,
    } as TMethods

    const nextSchemas = {
      ...(this.schemas as IgniterCallerSchemaMap),
      [path]: merged,
    } as TSchemas & { [K in TPath]: TMethods }

    return new IgniterCallerSchema(nextSchemas, this.registry)
  }

  /**
   * Builds the schema map and attaches inference + runtime helpers.
   */
  build(): IgniterCallerSchemaBuildResult<TSchemas, TRegistry> {
    const result = {
      ...(this.schemas as IgniterCallerSchemaMap),
    } as IgniterCallerSchemaBuildResult<TSchemas, TRegistry>

    const inferHelpers = createInferHelpers<TSchemas, TRegistry>()
    const getHelpers = createGetHelpers(this.schemas, this.registry)

    Object.defineProperty(result, '$Infer', {
      value: inferHelpers,
      enumerable: false,
    })

    Object.defineProperty(result, 'get', {
      value: getHelpers,
      enumerable: false,
    })

    return result
  }
}

function createInferHelpers<
  TSchemas extends IgniterCallerSchemaMap,
  TRegistry extends IgniterCallerSchemaRegistry,
>(): IgniterCallerSchemaInfer<TSchemas, TRegistry> {
  return {
    Path: undefined as unknown as IgniterCallerSchemaInfer<TSchemas, TRegistry>['Path'],
    Endpoint: (() => undefined) as unknown as IgniterCallerSchemaInfer<
      TSchemas,
      TRegistry
    >['Endpoint'],
    Request: (() => undefined) as unknown as IgniterCallerSchemaInfer<
      TSchemas,
      TRegistry
    >['Request'],
    Response: (() => undefined) as unknown as IgniterCallerSchemaInfer<
      TSchemas,
      TRegistry
    >['Response'],
    Responses: (() => undefined) as unknown as IgniterCallerSchemaInfer<
      TSchemas,
      TRegistry
    >['Responses'],
    Schema: (() => undefined) as unknown as IgniterCallerSchemaInfer<
      TSchemas,
      TRegistry
    >['Schema'],
  }
}

function createGetHelpers<
  TSchemas extends IgniterCallerSchemaMap,
  TRegistry extends IgniterCallerSchemaRegistry,
>(schemas: TSchemas, registry: TRegistry): IgniterCallerSchemaGetters<TSchemas, TRegistry> {
  return {
    path: (path) => schemas[path],
    endpoint: (path, method) => schemas[path][method],
    request: (path, method) => schemas[path][method]?.request,
    response: (path, method, status) => schemas[path][method]?.responses?.[status],
    schema: (key) => registry[key],
  }
}

function ensureValidPath(path: string): void {
  if (!path || path.trim().length === 0) {
    throw new IgniterCallerError({
      code: 'IGNITER_CALLER_SCHEMA_INVALID',
      operation: 'buildSchema',
      message: 'Path cannot be empty.',
      statusCode: 400,
    })
  }

  if (!path.startsWith('/')) {
    throw new IgniterCallerError({
      code: 'IGNITER_CALLER_SCHEMA_INVALID',
      operation: 'buildSchema',
      message: `Path "${path}" must start with "/".`,
      statusCode: 400,
      metadata: { path },
    })
  }
}

function ensureValidSchemaKey(key: string): void {
  if (!key || key.trim().length === 0) {
    throw new IgniterCallerError({
      code: 'IGNITER_CALLER_SCHEMA_INVALID',
      operation: 'buildSchema',
      message: 'Schema registry key cannot be empty.',
      statusCode: 400,
    })
  }
}
