import type { StandardSchemaV1 } from '@igniter-js/core'

/**
 * HTTP methods supported for schema mapping.
 */
export type IgniterCallerSchemaMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'

/**
 * Schema definition for a single endpoint.
 *
 * Maps status codes to response schemas with optional request schema.
 */
export type IgniterCallerEndpointSchema<
  TRequest extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
  TResponses extends Record<number | string, StandardSchemaV1> = Record<
    number | string,
    StandardSchemaV1
  >,
> = {
  /** Request body schema (optional) */
  request?: TRequest
  /** Response schemas by status code */
  responses: TResponses
  /** Optional summary or description for docs */
  doc?: string
  /** Optional tags for grouping */
  tags?: string[]
  /** Optional operation identifier */
  operationId?: string
}

/**
 * Schema map for multiple endpoints.
 *
 * Structure: { [path]: { [method]: EndpointSchema } }
 *
 * @example
 * ```ts
 * const schemas = {
 *   '/users': {
 *     GET: {
 *       responses: {
 *         200: z.array(UserSchema),
 *         401: z.object({ error: z.string() }),
 *       },
 *     },
 *     POST: {
 *       request: CreateUserSchema,
 *       responses: {
 *         201: UserSchema,
 *         400: z.object({ errors: z.array(z.string()) }),
 *       },
 *     },
 *   },
 *   '/users/:id': {
 *     GET: {
 *       responses: {
 *         200: UserSchema,
 *         404: z.object({ error: z.string() }),
 *       },
 *     },
 *   },
 * }
 * ```
 */
export type IgniterCallerSchemaMap = Record<
  string,
  Partial<Record<IgniterCallerSchemaMethod, IgniterCallerEndpointSchema<any, any>>>
>

/**
 * Resolves a status key against a response map.
 */
export type ResolveStatusKey<
  TResponses extends Record<number | string, StandardSchemaV1>,
  TStatus extends number | string,
> = Extract<keyof TResponses, TStatus | `${TStatus}`>

/**
 * Extract path parameters from a URL pattern.
 *
 * @example
 * ```ts
 * type Params = ExtractPathParams<'/users/:id/posts/:postId'>
 * // { id: string; postId: string }
 * ```
 */
export type ExtractPathParams<T extends string> =
  T extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractPathParams<`/${Rest}`>]: string }
    : T extends `${infer _Start}:${infer Param}`
      ? { [K in Param]: string }
      : Record<never, never>

/**
 * Infer request type from endpoint schema.
 */
export type InferRequestType<T> = T extends IgniterCallerEndpointSchema<infer R, any>
  ? R extends StandardSchemaV1
    ? StandardSchemaV1.InferInput<R>
    : never
  : never

/**
 * Infer response type by status code from endpoint schema.
 */
export type InferResponseType<
  T,
  Status extends number | string,
> = T extends IgniterCallerEndpointSchema<any, infer Responses>
  ? ResolveStatusKey<Responses, Status> extends keyof Responses
    ? Responses[ResolveStatusKey<Responses, Status>] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<
          Responses[ResolveStatusKey<Responses, Status>]
        >
      : never
    : never
  : never

/**
 * Infer the success response type (status 200 or 201) from endpoint schema.
 */
export type InferSuccessResponseType<T> = T extends IgniterCallerEndpointSchema<any, infer Responses>
  ? ResolveStatusKey<Responses, 200> extends keyof Responses
    ? Responses[ResolveStatusKey<Responses, 200>] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<
          Responses[ResolveStatusKey<Responses, 200>]
        >
      : never
    : ResolveStatusKey<Responses, 201> extends keyof Responses
      ? Responses[ResolveStatusKey<Responses, 201>] extends StandardSchemaV1
        ? StandardSchemaV1.InferOutput<
            Responses[ResolveStatusKey<Responses, 201>]
          >
        : never
      : never
  : never

/**
 * Infer all possible response types (union) from endpoint schema.
 */
export type InferAllResponseTypes<T> = T extends IgniterCallerEndpointSchema<
  any,
  infer Responses
>
  ? Responses extends Record<number | string, StandardSchemaV1>
    ? {
        [K in keyof Responses]: Responses[K] extends StandardSchemaV1
          ? { status: K; data: StandardSchemaV1.InferOutput<Responses[K]> }
          : never
      }[keyof Responses]
    : never
  : never

/**
 * Get all available paths from a schema map.
 */
export type SchemaMapPaths<TSchemas extends IgniterCallerSchemaMap> = keyof TSchemas & string

/**
 * Get available methods for a specific path.
 */
export type SchemaMapMethods<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends keyof TSchemas,
> = keyof TSchemas[TPath] & IgniterCallerSchemaMethod

/**
 * Get all paths that have a specific method defined.
 */
export type PathsForMethod<
  TSchemas extends IgniterCallerSchemaMap,
  TMethod extends IgniterCallerSchemaMethod,
> = {
  [K in keyof TSchemas]: TMethod extends keyof TSchemas[K] ? K : never
}[keyof TSchemas] & string

/**
 * Get paths available for GET method.
 */
export type GetPaths<TSchemas extends IgniterCallerSchemaMap> = PathsForMethod<TSchemas, 'GET'>

/**
 * Get paths available for POST method.
 */
export type PostPaths<TSchemas extends IgniterCallerSchemaMap> = PathsForMethod<TSchemas, 'POST'>

/**
 * Get paths available for PUT method.
 */
export type PutPaths<TSchemas extends IgniterCallerSchemaMap> = PathsForMethod<TSchemas, 'PUT'>

/**
 * Get paths available for PATCH method.
 */
export type PatchPaths<TSchemas extends IgniterCallerSchemaMap> = PathsForMethod<TSchemas, 'PATCH'>

/**
 * Get paths available for DELETE method.
 */
export type DeletePaths<TSchemas extends IgniterCallerSchemaMap> = PathsForMethod<TSchemas, 'DELETE'>

/**
 * Get paths available for HEAD method.
 */
export type HeadPaths<TSchemas extends IgniterCallerSchemaMap> = PathsForMethod<TSchemas, 'HEAD'>

/**
 * Get endpoint schema for a specific path and method.
 */
export type SchemaMapEndpoint<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends keyof TSchemas,
  TMethod extends keyof TSchemas[TPath],
> = TSchemas[TPath][TMethod]

/**
 * Infer response type from schema map for a specific path, method, and status.
 */
export type SchemaMapResponseType<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends keyof TSchemas,
  TMethod extends keyof TSchemas[TPath],
  TStatus extends number | string = 200,
> = TSchemas[TPath][TMethod] extends IgniterCallerEndpointSchema<any, infer Responses>
  ? ResolveStatusKey<Responses, TStatus> extends keyof Responses
    ? Responses[ResolveStatusKey<Responses, TStatus>] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<
          Responses[ResolveStatusKey<Responses, TStatus>]
        >
      : never
    : never
  : never

/**
 * Infer request type from schema map for a specific path and method.
 */
export type SchemaMapRequestType<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends keyof TSchemas,
  TMethod extends keyof TSchemas[TPath],
> = TSchemas[TPath][TMethod] extends IgniterCallerEndpointSchema<infer Request, any>
  ? Request extends StandardSchemaV1
    ? StandardSchemaV1.InferInput<Request>
    : never
  : never

/**
 * Infer endpoint info for a specific path and method.
 * Returns an object with response, request, and params types.
 */
export type EndpointInfo<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends IgniterCallerSchemaMethod,
> = TPath extends keyof TSchemas
  ? TMethod extends keyof TSchemas[TPath]
    ? {
        response: TSchemas[TPath][TMethod] extends IgniterCallerEndpointSchema<any, infer R>
          ? 200 extends keyof R
            ? R[200] extends StandardSchemaV1
              ? StandardSchemaV1.InferOutput<R[200]>
              : unknown
            : 201 extends keyof R
              ? R[201] extends StandardSchemaV1
                ? StandardSchemaV1.InferOutput<R[201]>
                : unknown
              : unknown
          : unknown
        request: TSchemas[TPath][TMethod] extends IgniterCallerEndpointSchema<infer Req, any>
          ? Req extends StandardSchemaV1
            ? StandardSchemaV1.InferInput<Req>
            : never
          : never
        params: ExtractPathParams<TPath & string>
      }
    : { response: unknown; request: never; params: Record<never, never> }
  : { response: unknown; request: never; params: Record<never, never> }

/**
 * Options for schema validation behavior.
 */
export interface IgniterCallerSchemaValidationOptions {
  /**
   * Validation mode:
   * - 'strict': Throw error on validation failure (default)
   * - 'soft': Log error but return raw data
   * - 'off': Skip validation entirely
   */
  mode?: 'strict' | 'soft' | 'off'

  /**
   * Custom error handler for validation failures.
   */
  onValidationError?: (error: any, context: {
    url: string
    method: string
    statusCode: number
  }) => void
}
