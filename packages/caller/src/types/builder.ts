/**
 * @fileoverview Builder and request builder types for @igniter-js/caller.
 * @module @igniter-js/caller/types/builder
 */

import type { IgniterLogger } from "@igniter-js/core";
import type { IgniterTelemetryManager } from "@igniter-js/telemetry";
import type { IgniterCallerRequestInterceptor, IgniterCallerResponseInterceptor } from "./interceptors";
import type { IgniterCallerSchemaMap, IgniterCallerSchemaValidationOptions } from "./schemas";
import type { IgniterCallerStoreAdapter, IgniterCallerStoreOptions } from "./store";
import type { IgniterCallerApiResponse } from "./response";
import type { IgniterCallerRequestBuilder } from "../builders/request.builder";

/**
 * Builder state for {@link IgniterCallerBuilder}.
 */
export type IgniterCallerBuilderState<
  TSchemas extends IgniterCallerSchemaMap = IgniterCallerSchemaMap,
> = {
  /** Base URL prefix for outgoing requests. */
  baseURL?: string;
  /** Default headers merged into each request. */
  headers?: Record<string, string>;
  /** Default cookies (sent as the Cookie header). */
  cookies?: Record<string, string>;
  /** Logger instance for request lifecycle logs. */
  logger?: IgniterLogger;
  /** Telemetry manager for emitting events. */
  telemetry?: IgniterTelemetryManager;
  /** Request interceptors executed before the request. */
  requestInterceptors?: IgniterCallerRequestInterceptor[];
  /** Response interceptors executed after the request. */
  responseInterceptors?: IgniterCallerResponseInterceptor[];
  /** Store adapter for persistent cache. */
  store?: IgniterCallerStoreAdapter;
  /** Store adapter options (ttl, keyPrefix, fallback). */
  storeOptions?: IgniterCallerStoreOptions;
  /** Schema map for request/response inference. */
  schemas?: TSchemas;
  /** Validation options for schema enforcement. */
  schemaValidation?: IgniterCallerSchemaValidationOptions;
};

/**
 * Constructor params for the request builder.
 */
export interface IgniterCallerRequestBuilderParams {
  /** Base URL prefix for outgoing requests. */
  baseURL?: string;
  /** Default headers merged into each request. */
  defaultHeaders?: Record<string, string>;
  /** Default cookies (sent as the Cookie header). */
  defaultCookies?: Record<string, string>;
  /** Logger instance for request lifecycle logs. */
  logger?: IgniterLogger;
  /** Telemetry manager for emitting events. */
  telemetry?: IgniterTelemetryManager;
  /** Request interceptors executed before the request. */
  requestInterceptors?: IgniterCallerRequestInterceptor[];
  /** Response interceptors executed after the request. */
  responseInterceptors?: IgniterCallerResponseInterceptor[];
  /** Callback invoked after request completion. */
  eventEmitter?: (
    url: string,
    method: string,
    result: IgniterCallerApiResponse<unknown>,
  ) => Promise<void>;
  /** Schema map for request/response inference. */
  schemas?: IgniterCallerSchemaMap;
  /** Validation options for schema enforcement. */
  schemaValidation?: IgniterCallerSchemaValidationOptions;
}

/**
 * Request builder type without internal methods.
 * Used when creating requests via specific HTTP methods (get, post, etc.).
 */
export type IgniterCallerMethodRequestBuilder<TResponse = unknown> = Omit<
  IgniterCallerRequestBuilder<TResponse>,
  "_setMethod" | "_setUrl"
>;

/**
 * Request builder with typed response based on schema inference.
 */
export type IgniterCallerTypedRequestBuilder<TResponse = unknown> =
  IgniterCallerMethodRequestBuilder<TResponse>;
