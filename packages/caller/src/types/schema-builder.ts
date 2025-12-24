/**
 * @fileoverview Schema builder helper types for @igniter-js/caller.
 * @module @igniter-js/caller/types/schema-builder
 */

import type { StandardSchemaV1 } from '@igniter-js/core'
import type {
  EndpointInfo,
  IgniterCallerEndpointSchema,
  IgniterCallerSchemaMap,
  ResolveStatusKey,
  SchemaMapEndpoint,
  SchemaMapMethods,
  SchemaMapPaths,
  SchemaMapRequestType,
  SchemaMapResponseType,
} from './schemas'

/**
 * Registry of reusable schemas keyed by name.
 */
export type IgniterCallerSchemaRegistry = Record<string, StandardSchemaV1>

/**
 * Configuration payload for a single endpoint method in the schema builder.
 */
export type IgniterCallerSchemaEndpointConfig<
  TRequest extends StandardSchemaV1 | undefined = undefined,
  TResponses extends Record<number | string, StandardSchemaV1> = Record<
    number | string,
    StandardSchemaV1
  >,
> = {
  request?: TRequest
  responses: TResponses
  doc?: string
  tags?: string[]
  operationId?: string
}

/**
 * Helper type for array wrappers on StandardSchemaV1.
 */
export type SchemaArray<TSchema extends StandardSchemaV1> = StandardSchemaV1<
  Array<StandardSchemaV1.InferInput<TSchema>>,
  Array<StandardSchemaV1.InferOutput<TSchema>>
>

/**
 * Helper type for nullable wrappers on StandardSchemaV1.
 */
export type SchemaNullable<TSchema extends StandardSchemaV1> = StandardSchemaV1<
  StandardSchemaV1.InferInput<TSchema> | null,
  StandardSchemaV1.InferOutput<TSchema> | null
>

/**
 * Helper type for optional wrappers on StandardSchemaV1.
 */
export type SchemaOptional<TSchema extends StandardSchemaV1> = StandardSchemaV1<
  StandardSchemaV1.InferInput<TSchema> | undefined,
  StandardSchemaV1.InferOutput<TSchema> | undefined
>

/**
 * Helper type for record wrappers on StandardSchemaV1.
 */
export type SchemaRecord<TSchema extends StandardSchemaV1> = StandardSchemaV1<
  Record<string, StandardSchemaV1.InferInput<TSchema>>,
  Record<string, StandardSchemaV1.InferOutput<TSchema>>
>

/**
 * Extracts the raw responses map (schemas) from a schema map.
 */
export type SchemaMapResponses<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends keyof TSchemas,
  TMethod extends keyof TSchemas[TPath],
> = TSchemas[TPath][TMethod] extends IgniterCallerEndpointSchema<any, infer Responses>
  ? Responses
  : never

/**
 * Infers the response output types for every status in a responses map.
 */
export type SchemaMapResponsesType<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends keyof TSchemas,
  TMethod extends keyof TSchemas[TPath],
> = SchemaMapResponses<TSchemas, TPath, TMethod> extends Record<
  number | string,
  StandardSchemaV1
>
  ? {
      [K in keyof SchemaMapResponses<TSchemas, TPath, TMethod>]: SchemaMapResponses<
        TSchemas,
        TPath,
        TMethod
      >[K] extends StandardSchemaV1
        ? StandardSchemaV1.InferOutput<
            SchemaMapResponses<TSchemas, TPath, TMethod>[K]
          >
        : never
    }
  : never

/**
 * Extracts the request schema for a path + method.
 */
export type SchemaMapRequestSchema<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends keyof TSchemas,
  TMethod extends keyof TSchemas[TPath],
> = TSchemas[TPath][TMethod] extends IgniterCallerEndpointSchema<
  infer Request,
  any
>
  ? Request
  : never

/**
 * Extracts the response schema for a path + method + status code.
 */
export type SchemaMapResponseSchema<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends keyof TSchemas,
  TMethod extends keyof TSchemas[TPath],
  TStatus extends number | string,
> = SchemaMapResponses<TSchemas, TPath, TMethod> extends Record<
  number | string,
  StandardSchemaV1
>
  ? ResolveStatusKey<
      SchemaMapResponses<TSchemas, TPath, TMethod>,
      TStatus
    > extends keyof SchemaMapResponses<TSchemas, TPath, TMethod>
    ? SchemaMapResponses<TSchemas, TPath, TMethod>[
        ResolveStatusKey<SchemaMapResponses<TSchemas, TPath, TMethod>, TStatus>
      ]
    : never
  : never

/**
 * Type-level helpers attached to schema build outputs.
 */
export type IgniterCallerSchemaInfer<
  TSchemas extends IgniterCallerSchemaMap,
  TRegistry extends IgniterCallerSchemaRegistry,
> = {
  Path: SchemaMapPaths<TSchemas>
  Endpoint: <TPath extends SchemaMapPaths<TSchemas>, TMethod extends SchemaMapMethods<TSchemas, TPath>>() => EndpointInfo<
    TSchemas,
    TPath,
    TMethod
  >
  Request: <TPath extends SchemaMapPaths<TSchemas>, TMethod extends SchemaMapMethods<TSchemas, TPath>>() => SchemaMapRequestType<
    TSchemas,
    TPath,
    TMethod
  >
  Response: <
    TPath extends SchemaMapPaths<TSchemas>,
    TMethod extends SchemaMapMethods<TSchemas, TPath>,
    TStatus extends number | string,
  >() => SchemaMapResponseType<TSchemas, TPath, TMethod, TStatus>
  Responses: <TPath extends SchemaMapPaths<TSchemas>, TMethod extends SchemaMapMethods<TSchemas, TPath>>() => SchemaMapResponsesType<
    TSchemas,
    TPath,
    TMethod
  >
  Schema: <TKey extends keyof TRegistry>() => StandardSchemaV1.InferOutput<TRegistry[TKey]>
}

/**
 * Runtime helpers attached to schema build outputs.
 */
export type IgniterCallerSchemaGetters<
  TSchemas extends IgniterCallerSchemaMap,
  TRegistry extends IgniterCallerSchemaRegistry,
> = {
  path: <TPath extends SchemaMapPaths<TSchemas>>(path: TPath) => TSchemas[TPath]
  endpoint: <TPath extends SchemaMapPaths<TSchemas>, TMethod extends SchemaMapMethods<TSchemas, TPath>>(
    path: TPath,
    method: TMethod,
  ) => SchemaMapEndpoint<TSchemas, TPath, TMethod>
  request: <TPath extends SchemaMapPaths<TSchemas>, TMethod extends SchemaMapMethods<TSchemas, TPath>>(
    path: TPath,
    method: TMethod,
  ) => SchemaMapRequestSchema<TSchemas, TPath, TMethod>
  response: <
    TPath extends SchemaMapPaths<TSchemas>,
    TMethod extends SchemaMapMethods<TSchemas, TPath>,
    TStatus extends number | string,
  >(
    path: TPath,
    method: TMethod,
    status: TStatus,
  ) => SchemaMapResponseSchema<TSchemas, TPath, TMethod, TStatus>
  schema: <TKey extends keyof TRegistry>(key: TKey) => TRegistry[TKey]
}

/**
 * Output type for IgniterCallerSchema.build().
 */
export type IgniterCallerSchemaBuildResult<
  TSchemas extends IgniterCallerSchemaMap,
  TRegistry extends IgniterCallerSchemaRegistry,
> = TSchemas & {
  $Infer: IgniterCallerSchemaInfer<TSchemas, TRegistry>
  get: IgniterCallerSchemaGetters<TSchemas, TRegistry>
}

/**
 * Accepted input types for `withSchemas`.
 */
export type IgniterCallerSchemaInput<
  TSchemas extends IgniterCallerSchemaMap = IgniterCallerSchemaMap,
  TRegistry extends IgniterCallerSchemaRegistry = IgniterCallerSchemaRegistry,
> = TSchemas | IgniterCallerSchemaBuildResult<TSchemas, TRegistry>

/**
 * Extracts the schema map from a build result or raw map.
 */
export type IgniterCallerSchemaMapFrom<T> = T extends IgniterCallerSchemaBuildResult<
  infer TMap,
  any
>
  ? TMap
  : T extends IgniterCallerSchemaMap
    ? T
    : never
