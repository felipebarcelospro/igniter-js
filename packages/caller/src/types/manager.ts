/**
 * @fileoverview Manager contracts for @igniter-js/caller.
 * @module @igniter-js/caller/types/manager
 */

import type { IgniterCallerApiResponse } from "./response";
import type { IgniterCallerDirectRequestOptions } from "./request";
import type { IgniterCallerSchemaMap } from "./schemas";
import type { DeletePaths, GetPaths, HeadPaths, PatchPaths, PostPaths, PutPaths } from "./schemas";
import type { IgniterCallerTypedRequestBuilder } from "./builder";
import type { InferResponse, TypedRequestBuilder } from "./infer";

/**
 * Public contract for the IgniterCaller manager runtime.
 */
export interface IIgniterCallerManager<
  TSchemas extends IgniterCallerSchemaMap = IgniterCallerSchemaMap,
> {
  /**
   * Creates a GET request.
   *
   * @param url - Optional URL for the request.
   * @returns Typed request builder.
   */
  get<TPath extends GetPaths<TSchemas>>(
    url: TPath,
  ): TypedRequestBuilder<TSchemas, TPath, "GET">;
  get<TPath extends string>(
    url?: TPath,
  ): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, "GET">>;

  /**
   * Creates a POST request.
   *
   * @param url - Optional URL for the request.
   * @returns Typed request builder.
   */
  post<TPath extends PostPaths<TSchemas>>(
    url: TPath,
  ): TypedRequestBuilder<TSchemas, TPath, "POST">;
  post<TPath extends string>(
    url?: TPath,
  ): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, "POST">>;

  /**
   * Creates a PUT request.
   *
   * @param url - Optional URL for the request.
   * @returns Typed request builder.
   */
  put<TPath extends PutPaths<TSchemas>>(
    url: TPath,
  ): TypedRequestBuilder<TSchemas, TPath, "PUT">;
  put<TPath extends string>(
    url?: TPath,
  ): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, "PUT">>;

  /**
   * Creates a PATCH request.
   *
   * @param url - Optional URL for the request.
   * @returns Typed request builder.
   */
  patch<TPath extends PatchPaths<TSchemas>>(
    url: TPath,
  ): TypedRequestBuilder<TSchemas, TPath, "PATCH">;
  patch<TPath extends string>(
    url?: TPath,
  ): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, "PATCH">>;

  /**
   * Creates a DELETE request.
   *
   * @param url - Optional URL for the request.
   * @returns Typed request builder.
   */
  delete<TPath extends DeletePaths<TSchemas>>(
    url: TPath,
  ): TypedRequestBuilder<TSchemas, TPath, "DELETE">;
  delete<TPath extends string>(
    url?: TPath,
  ): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, "DELETE">>;

  /**
   * Creates a HEAD request.
   *
   * @param url - Optional URL for the request.
   * @returns Typed request builder.
   */
  head<TPath extends HeadPaths<TSchemas>>(
    url: TPath,
  ): TypedRequestBuilder<TSchemas, TPath, "HEAD">;
  head<TPath extends string>(
    url?: TPath,
  ): IgniterCallerTypedRequestBuilder<InferResponse<TSchemas, TPath, "HEAD">>;

  /**
   * Executes a request directly with all options in one object.
   *
   * @param options - Request configuration.
   * @returns Response envelope with data or error.
   */
  request<T = unknown>(
    options: IgniterCallerDirectRequestOptions,
  ): Promise<IgniterCallerApiResponse<T>>;
}
