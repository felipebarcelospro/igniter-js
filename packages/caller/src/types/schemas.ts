import type { StandardSchemaV1 } from '@igniter-js/core'

/**
 * HTTP methods supported for schema mapping.
 */
export type IgniterCallerSchemaMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Schema definition for a single endpoint.
 *
 * Maps status codes to response schemas with optional request schema.
 */
export type IgniterCallerEndpointSchema<
  TRequest extends StandardSchemaV1 = any,
  TResponses extends Record<number, StandardSchemaV1> = Record<number, StandardSchemaV1>,
> = {
  /** Request body schema (optional) */
  request?: TRequest
  /** Response schemas by status code */
  responses: TResponses
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
  Status extends number,
> = T extends IgniterCallerEndpointSchema<any, infer Responses>
  ? Status extends keyof Responses
    ? Responses[Status] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<Responses[Status]>
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
  ? Responses extends Record<number, StandardSchemaV1>
    ? {
        [K in keyof Responses]: Responses[K] extends StandardSchemaV1
          ? { status: K; data: StandardSchemaV1.InferOutput<Responses[K]> }
          : never
      }[keyof Responses]
    : never
  : never

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
