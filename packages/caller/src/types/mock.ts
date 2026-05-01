/**
 * @fileoverview Mock types for @igniter-js/caller.
 * @module @igniter-js/caller/types/mock
 */

import type { StandardSchemaV1 } from '@igniter-js/common'
import type { z } from 'zod'
import type {
  EndpointInfo,
  IgniterCallerSchemaMap,
  IgniterCallerSchemaMethod,
  SchemaMapMethods,
  SchemaMapPaths,
  SchemaMapRequestType,
  SchemaMapResponseType,
} from './schemas'
import type { SchemaMapResponses } from './schema-builder'

/**
 * Resolves valid status codes for a mocked path+method based on the schema map.
 */
export type IgniterCallerMockStatus<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath>,
> = keyof SchemaMapResponses<TSchemas, TPath, TMethod> & (number | string)

/**
 * Picks the default success status for a mocked path+method.
 * Prefers 200, then 201, then the first available status.
 */
export type IgniterCallerMockDefaultStatus<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath>,
> = 200 extends IgniterCallerMockStatus<TSchemas, TPath, TMethod>
  ? 200
  : 201 extends IgniterCallerMockStatus<TSchemas, TPath, TMethod>
    ? 201
    : IgniterCallerMockStatus<TSchemas, TPath, TMethod>

type IgniterCallerMockRequestBodyField<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath>,
> = [SchemaMapRequestType<TSchemas, TPath, TMethod>] extends [never]
  ? { body?: undefined }
  : { body: SchemaMapRequestType<TSchemas, TPath, TMethod> }

/**
 * Full request context passed to mock handlers.
 */
export type IgniterCallerMockRequest<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath>,
> = {
  method: TMethod
  path: TPath
  url: string
  safeUrl: string
  baseURL?: string
  headers: Record<string, string>
  query: Record<string, string | number | boolean>
  params: EndpointInfo<TSchemas, TPath, TMethod>['params']
  timeoutMs?: number
  cache?: RequestCache
  cacheKey?: string
  staleTime?: number
  responseTypeSchema?: StandardSchemaV1 | z.ZodSchema<any>
} & IgniterCallerMockRequestBodyField<TSchemas, TPath, TMethod>

/**
 * Resolved mock handler for a given request path+method.
 */
export interface IgniterCallerMockResolvedHandler<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas> = SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath> = SchemaMapMethods<
    TSchemas,
    TPath
  >,
> {
  handler: IgniterCallerMockHandlerDefinition<TSchemas, TPath, TMethod>
  params: Record<string, string>
  path: TPath
  method: TMethod
}

/**
 * Contract for the mock manager used by the request builder.
 */
export interface IIgniterCallerMockManager<
  TSchemas extends IgniterCallerSchemaMap,
> {
  resolve(
    path: string,
    method: IgniterCallerSchemaMethod,
  ): IgniterCallerMockResolvedHandler<TSchemas> | null
}

/**
 * Mock response payload for a specific status code.
 */
export type IgniterCallerMockResponseForStatus<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath>,
  TStatus extends IgniterCallerMockStatus<TSchemas, TPath, TMethod>,
> = {
  status: TStatus
  response: SchemaMapResponseType<TSchemas, TPath, TMethod, TStatus>
  headers?: Record<string, string>
  delayMs?: number
  errorMessage?: string
}

/**
 * Mock response payload when status is omitted (uses default success status).
 */
export type IgniterCallerMockResponseDefault<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath>,
> = {
  response: SchemaMapResponseType<
    TSchemas,
    TPath,
    TMethod,
    IgniterCallerMockDefaultStatus<TSchemas, TPath, TMethod>
  >
  status?: undefined
  headers?: Record<string, string>
  delayMs?: number
  errorMessage?: string
}

/**
 * Union of all supported mock response payloads for a path+method.
 */
export type IgniterCallerMockResponse<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath>,
> =
  | IgniterCallerMockResponseDefault<TSchemas, TPath, TMethod>
  | {
      [TStatus in IgniterCallerMockStatus<
        TSchemas,
        TPath,
        TMethod
      >]: IgniterCallerMockResponseForStatus<TSchemas, TPath, TMethod, TStatus>
    }[IgniterCallerMockStatus<TSchemas, TPath, TMethod>]

/**
 * Mock handler signature (receives full request context).
 */
export type IgniterCallerMockHandler<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath>,
> = (
  request: IgniterCallerMockRequest<TSchemas, TPath, TMethod>,
) =>
  | IgniterCallerMockResponse<TSchemas, TPath, TMethod>
  | Promise<IgniterCallerMockResponse<TSchemas, TPath, TMethod>>

/**
 * Either a static mock response or a handler callback.
 */
export type IgniterCallerMockHandlerDefinition<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
  TMethod extends SchemaMapMethods<TSchemas, TPath>,
> =
  | IgniterCallerMockResponse<TSchemas, TPath, TMethod>
  | IgniterCallerMockHandler<TSchemas, TPath, TMethod>

/**
 * Mock definitions for a single path (method -> handler/response).
 */
export type IgniterCallerMockPathDefinition<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends SchemaMapPaths<TSchemas>,
> = Partial<{
  [TMethod in SchemaMapMethods<TSchemas, TPath>]: IgniterCallerMockHandlerDefinition<
    TSchemas,
    TPath,
    TMethod
  >
}>

/**
 * Registry of mocked paths for a schema map.
 */
export type IgniterCallerMockRegistry<
  TSchemas extends IgniterCallerSchemaMap,
> = Partial<{
  [TPath in SchemaMapPaths<TSchemas>]: IgniterCallerMockPathDefinition<TSchemas, TPath>
}>

/**
 * Mock configuration passed to the caller builder.
 */
export interface IgniterCallerMockConfig<
  TSchemas extends IgniterCallerSchemaMap = IgniterCallerSchemaMap,
> {
  enabled: boolean
  delay?: number
  mock: IIgniterCallerMockManager<TSchemas>
}
