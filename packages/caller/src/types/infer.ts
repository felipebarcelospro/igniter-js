/**
 * @fileoverview Type inference helpers for @igniter-js/caller.
 * @module @igniter-js/caller/types/infer
 */

import type { StandardSchemaV1 } from "@igniter-js/core";
import type {
  EndpointInfo,
  IgniterCallerEndpointSchema,
  IgniterCallerSchemaMap,
  IgniterCallerSchemaMethod,
} from "./schemas";
import type { IgniterCallerMethodRequestBuilder } from "./builder";

/**
 * Infer success response type from endpoint schema (200 or 201).
 */
export type InferSuccessResponse<T> = T extends IgniterCallerEndpointSchema<
  any,
  infer R
>
  ? 200 extends keyof R
    ? R[200] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<R[200]>
      : unknown
    : 201 extends keyof R
      ? R[201] extends StandardSchemaV1
        ? StandardSchemaV1.InferOutput<R[201]>
        : unknown
      : unknown
  : unknown;

/**
 * Get the endpoint schema for a path and method from a schema map.
 */
export type GetEndpoint<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends IgniterCallerSchemaMethod,
> = TPath extends keyof TSchemas
  ? TMethod extends keyof TSchemas[TPath]
    ? TSchemas[TPath][TMethod]
    : undefined
  : undefined;

/**
 * Infer the response type for a given path and method.
 * Returns `unknown` if the path/method is not in the schema.
 */
export type InferResponse<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends IgniterCallerSchemaMethod,
> = InferSuccessResponse<GetEndpoint<TSchemas, TPath, TMethod>>;

/**
 * Typed request builder with inferred body and params types.
 */
export type TypedRequestBuilder<
  TSchemas extends IgniterCallerSchemaMap,
  TPath extends string,
  TMethod extends IgniterCallerSchemaMethod,
> = Omit<
  IgniterCallerMethodRequestBuilder<
    EndpointInfo<TSchemas, TPath, TMethod>["response"]
  >,
  "body" | "params"
> & {
  /**
   * Sets the request body with type inference from schema.
   */
  body: EndpointInfo<TSchemas, TPath, TMethod>["request"] extends never
    ? <TBody>(body: TBody) => TypedRequestBuilder<TSchemas, TPath, TMethod>
    : (
        body: EndpointInfo<TSchemas, TPath, TMethod>["request"]
      ) => TypedRequestBuilder<TSchemas, TPath, TMethod>;

  /**
   * Sets URL path parameters with type inference from URL pattern.
   */
  params: keyof EndpointInfo<TSchemas, TPath, TMethod>["params"] extends never
    ? (
        params: Record<string, string | number | boolean>
      ) => TypedRequestBuilder<TSchemas, TPath, TMethod>
    : (
        params: EndpointInfo<TSchemas, TPath, TMethod>["params"] &
          Record<string, string | number | boolean>
      ) => TypedRequestBuilder<TSchemas, TPath, TMethod>;
};
