/**
 * @fileoverview Path-first schema builder for @igniter-js/caller.
 * @module @igniter-js/caller/builders/schema-path
 */

import { z } from 'zod'
import { IgniterCallerError } from '../errors/caller.error'
import type { StandardSchemaV1 } from '@igniter-js/core'
import type {
  IgniterCallerEndpointSchema,
  IgniterCallerSchemaMethod,
} from '../types/schemas'
import type {
  IgniterCallerSchemaEndpointConfig,
  IgniterCallerSchemaRegistry,
  SchemaArray,
  SchemaNullable,
  SchemaOptional,
  SchemaRecord,
} from '../types/schema-builder'

/**
 * Builder for schema methods within a single path.
 */
export class IgniterCallerSchemaPathBuilder<
  TMethods extends Partial<
    Record<IgniterCallerSchemaMethod, IgniterCallerEndpointSchema<any, any>>
  > = {},
  TRegistry extends IgniterCallerSchemaRegistry = {},
> {
  private readonly methods: TMethods
  private readonly registry: TRegistry

  private constructor(methods: TMethods, registry: TRegistry) {
    this.methods = methods
    this.registry = registry
  }

  /**
   * Creates a new path builder for the provided registry.
   */
  static create<TRegistry extends IgniterCallerSchemaRegistry>(
    registry: TRegistry,
  ): IgniterCallerSchemaPathBuilder<{}, TRegistry> {
    return new IgniterCallerSchemaPathBuilder({}, registry)
  }

  /**
   * Returns a registry reference helper for a given key.
   * The helper exposes optional Zod-based wrappers (array/optional/nullable/record).
   */
  ref<TKey extends keyof TRegistry>(key: TKey): {
    schema: TRegistry[TKey]
    array: () => SchemaArray<TRegistry[TKey]>
    nullable: () => SchemaNullable<TRegistry[TKey]>
    optional: () => SchemaOptional<TRegistry[TKey]>
    record: (keyType?: StandardSchemaV1) => SchemaRecord<TRegistry[TKey]>
  } {
    const schema = this.registry[key]
    const zodSchema = schema as unknown as z.ZodTypeAny

    return {
      schema,
      array: () => z.array(zodSchema) as unknown as SchemaArray<TRegistry[TKey]>,
      nullable: () =>
        zodSchema.nullable() as unknown as SchemaNullable<TRegistry[TKey]>,
      optional: () =>
        zodSchema.optional() as unknown as SchemaOptional<TRegistry[TKey]>,
      // TODO: Fix DTS build error: ZodType<unknown> is not assignable to $ZodRecordKey in z.record.
      record: (keyType?: StandardSchemaV1) =>
        z.record(
          // @ts-expect-error - Fix DTS build error
          (keyType ?? z.string()) as unknown as z.ZodTypeAny,
          zodSchema,
        ) as unknown as SchemaRecord<TRegistry[TKey]>,
    }
  }

  /**
   * Defines a GET endpoint.
   */
  get<TRequest extends StandardSchemaV1 | undefined, TResponses extends Record<number | string, StandardSchemaV1>>(
    config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>,
  ): IgniterCallerSchemaPathBuilder<
    TMethods & { GET: IgniterCallerEndpointSchema<TRequest, TResponses> },
    TRegistry
  > {
    return this.addMethod('GET', config)
  }

  /**
   * Defines a POST endpoint.
   */
  post<TRequest extends StandardSchemaV1 | undefined, TResponses extends Record<number | string, StandardSchemaV1>>(
    config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>,
  ): IgniterCallerSchemaPathBuilder<
    TMethods & { POST: IgniterCallerEndpointSchema<TRequest, TResponses> },
    TRegistry
  > {
    return this.addMethod('POST', config)
  }

  /**
   * Defines a PUT endpoint.
   */
  put<TRequest extends StandardSchemaV1 | undefined, TResponses extends Record<number | string, StandardSchemaV1>>(
    config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>,
  ): IgniterCallerSchemaPathBuilder<
    TMethods & { PUT: IgniterCallerEndpointSchema<TRequest, TResponses> },
    TRegistry
  > {
    return this.addMethod('PUT', config)
  }

  /**
   * Defines a PATCH endpoint.
   */
  patch<TRequest extends StandardSchemaV1 | undefined, TResponses extends Record<number | string, StandardSchemaV1>>(
    config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>,
  ): IgniterCallerSchemaPathBuilder<
    TMethods & { PATCH: IgniterCallerEndpointSchema<TRequest, TResponses> },
    TRegistry
  > {
    return this.addMethod('PATCH', config)
  }

  /**
   * Defines a DELETE endpoint.
   */
  delete<TRequest extends StandardSchemaV1 | undefined, TResponses extends Record<number | string, StandardSchemaV1>>(
    config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>,
  ): IgniterCallerSchemaPathBuilder<
    TMethods & { DELETE: IgniterCallerEndpointSchema<TRequest, TResponses> },
    TRegistry
  > {
    return this.addMethod('DELETE', config)
  }

  /**
   * Defines a HEAD endpoint.
   */
  head<TRequest extends StandardSchemaV1 | undefined, TResponses extends Record<number | string, StandardSchemaV1>>(
    config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>,
  ): IgniterCallerSchemaPathBuilder<
    TMethods & { HEAD: IgniterCallerEndpointSchema<TRequest, TResponses> },
    TRegistry
  > {
    return this.addMethod('HEAD', config)
  }

  /**
   * Builds the accumulated method map for the path.
   */
  build(): TMethods {
    return this.methods
  }

  private addMethod<
    TMethod extends IgniterCallerSchemaMethod,
    TRequest extends StandardSchemaV1 | undefined,
    TResponses extends Record<number | string, StandardSchemaV1>,
  >(
    method: TMethod,
    config: IgniterCallerSchemaEndpointConfig<TRequest, TResponses>,
  ): IgniterCallerSchemaPathBuilder<
    TMethods & { [K in TMethod]: IgniterCallerEndpointSchema<TRequest, TResponses> },
    TRegistry
  > {
    if (method in this.methods) {
      throw new IgniterCallerError({
        code: 'IGNITER_CALLER_SCHEMA_DUPLICATE',
        operation: 'buildSchema',
        message: `Schema for method "${method}" is already defined on this path.`,
        statusCode: 400,
        metadata: { method },
      })
    }

    return new IgniterCallerSchemaPathBuilder(
      {
        ...this.methods,
        [method]: {
          ...config,
        },
      } as TMethods & { [K in TMethod]: IgniterCallerEndpointSchema<TRequest, TResponses> },
      this.registry,
    )
  }
}
