import type { IgniterLogger } from "@igniter-js/common";
import type { IgniterTelemetryManager } from '@igniter-js/telemetry'
import type { IgniterCallerBuilderState } from '../types/builder'
import type { IgniterCallerMockConfig } from '../types/mock'
import type {
  IgniterCallerRequestInterceptor,
  IgniterCallerResponseInterceptor,
} from '../types/interceptors'
import type {
  IgniterCallerSchemaMap,
  IgniterCallerSchemaValidationOptions,
} from '../types/schemas'
import type {
  IgniterCallerSchemaBuildResult,
  IgniterCallerSchemaInput,
  IgniterCallerSchemaMapFrom,
  IgniterCallerSchemaRegistry,
} from '../types/schema-builder'
import type {
  IgniterCallerStoreAdapter,
  IgniterCallerStoreOptions,
} from '../types/store'
import { IgniterCallerCacheUtils } from '../utils/cache'
import { IgniterCallerManager } from '../core/manager'

/**
 * Builder used by developers to initialize the `IgniterCaller` client.
 *
 * This API is designed to remain stable when extracted to `@igniter-js/caller`.
 */
export class IgniterCallerBuilder<
  TSchemas extends IgniterCallerSchemaMap = IgniterCallerSchemaMap,
> {
  private readonly state: IgniterCallerBuilderState<TSchemas>;

  private constructor(state: IgniterCallerBuilderState<TSchemas>) {
    this.state = state;
  }

  /**
   * Creates a new builder instance.
   *
   * @returns New builder instance with empty state.
   */
  static create(): IgniterCallerBuilder<{}> {
    return new IgniterCallerBuilder<{}>({});
  }

  /**
   * Sets the base URL for all requests.
   *
   * @param baseURL - Base URL prefix for outgoing requests.
   */
  withBaseUrl(baseURL: string): IgniterCallerBuilder<TSchemas> {
    return new IgniterCallerBuilder({ ...this.state, baseURL });
  }

  /**
   * Merges default headers for all requests.
   *
   * @param headers - Header map merged into every request.
   */
  withHeaders(headers: Record<string, string>): IgniterCallerBuilder<TSchemas> {
    return new IgniterCallerBuilder({ ...this.state, headers });
  }

  /**
   * Sets default cookies (sent as the `Cookie` header).
   *
   * @param cookies - Cookie key/value pairs.
   */
  withCookies(cookies: Record<string, string>): IgniterCallerBuilder<TSchemas> {
    return new IgniterCallerBuilder({ ...this.state, cookies });
  }

  /**
   * Attaches a logger instance.
   *
   * @param logger - Logger implementation from `@igniter-js/common`.
   */
  withLogger(logger: IgniterLogger): IgniterCallerBuilder<TSchemas> {
    return new IgniterCallerBuilder({ ...this.state, logger });
  }

  /**
   * Adds a request interceptor that runs before each request.
   *
   * @param interceptor - Interceptor called with request options.
   */
  withRequestInterceptor(
    interceptor: IgniterCallerRequestInterceptor,
  ): IgniterCallerBuilder<TSchemas> {
    const requestInterceptors = [
      ...(this.state.requestInterceptors || []),
      interceptor,
    ];
    return new IgniterCallerBuilder({ ...this.state, requestInterceptors });
  }

  /**
   * Adds a response interceptor that runs after each request.
   *
   * @param interceptor - Interceptor called with the response result.
   */
  withResponseInterceptor(
    interceptor: IgniterCallerResponseInterceptor,
  ): IgniterCallerBuilder<TSchemas> {
    const responseInterceptors = [
      ...(this.state.responseInterceptors || []),
      interceptor,
    ];
    return new IgniterCallerBuilder({ ...this.state, responseInterceptors });
  }

  /**
   * Configures a persistent store adapter for caching.
   *
   * When configured, cache operations will use the store (e.g., Redis)
   * instead of in-memory cache, enabling persistent cache across deployments.
   *
   * @param store - Store adapter implementation.
   * @param options - Store options (ttl, keyPrefix, fallback).
   */
  withStore(
    store: IgniterCallerStoreAdapter,
    options?: IgniterCallerStoreOptions,
  ): IgniterCallerBuilder<TSchemas> {
    return new IgniterCallerBuilder({
      ...this.state,
      store,
      storeOptions: options,
    })
  }

  /**
   * Configures schema-based type safety and validation.
   *
   * Enables automatic type inference for requests/responses based on
   * route and method, with optional runtime validation via StandardSchemaV1
   * (Zod is supported).
   *
   * @param schemas - Schema map keyed by URL path and method.
   * @param validation - Validation options for request/response checks.
   *
   * @example
   * ```ts
   * const api = IgniterCaller.create()
   *   .withSchemas({
   *     '/users': {
   *       GET: {
   *         responses: {
   *           200: z.array(UserSchema),
   *           401: ErrorSchema,
   *         },
   *       },
   *       POST: {
   *         request: CreateUserSchema,
   *         responses: {
   *           201: UserSchema,
   *           400: ValidationErrorSchema,
   *         },
   *       },
   *     },
   *   })
   *   .build()
   * ```
   */
  withSchemas<TNewSchemas extends IgniterCallerSchemaMap>(
    schemas: TNewSchemas,
    validation?: IgniterCallerSchemaValidationOptions,
  ): IgniterCallerBuilder<TNewSchemas>
  withSchemas<
    TNewSchemas extends IgniterCallerSchemaMap,
    TRegistry extends IgniterCallerSchemaRegistry,
  >(
    schemas: IgniterCallerSchemaBuildResult<TNewSchemas, TRegistry>,
    validation?: IgniterCallerSchemaValidationOptions,
  ): IgniterCallerBuilder<TNewSchemas>
  withSchemas<TNewSchemas extends IgniterCallerSchemaInput>(
    schemas: TNewSchemas,
    validation?: IgniterCallerSchemaValidationOptions,
  ): IgniterCallerBuilder<IgniterCallerSchemaMapFrom<TNewSchemas>> {
    type ExtractedSchemas = IgniterCallerSchemaMapFrom<TNewSchemas>;

    // When schemas change, we need to reset the mock to avoid type incompatibility
    // The mock should be configured AFTER setting schemas using withMock()
    const { mock: _removedMock, ...stateWithoutMock } = this.state;

    const nextState: IgniterCallerBuilderState<ExtractedSchemas> = {
      ...stateWithoutMock,
      schemas: schemas as ExtractedSchemas,
      schemaValidation: validation,
    };

    return new IgniterCallerBuilder<ExtractedSchemas>(nextState);
  }

  /**
   * Attaches telemetry for request monitoring and observability.
   *
   * Telemetry is optional and only emits events when a manager is provided.
   *
   * Telemetry events emitted by the caller package include:
   * - `request.execute.started`
   * - `request.execute.success`
   * - `request.execute.error`
   * - `request.timeout.error`
   * - `cache.read.hit`
   * - `retry.attempt.started`
   * - `validation.request.error`
   * - `validation.response.error`
   *
   * @param telemetry - Telemetry manager instance.
   *
   * @example
   * ```ts
   * import { IgniterTelemetry } from '@igniter-js/telemetry'
   * import { IgniterCallerTelemetryEvents } from '@igniter-js/caller/telemetry'
   *
   * const telemetry = IgniterTelemetry.create()
   *   .withService('my-api')
   *   .addEvents(IgniterCallerTelemetryEvents)
   *   .build()
   *
   * const api = IgniterCaller.create()
   *   .withBaseUrl('https://api.example.com')
   *   .withTelemetry(telemetry)
   *   .build()
   * ```
   */
  withTelemetry(
    telemetry: IgniterTelemetryManager<any>,
  ): IgniterCallerBuilder<TSchemas> {
    return new IgniterCallerBuilder({ ...this.state, telemetry });
  }

  /**
   * Enables request mocking using a mock registry.
   *
   * When enabled, matching requests are routed to the mock handlers instead of fetch.
   *
   * @param config - Mock configuration with registry and enable flag.
   */
  withMock(
    config: IgniterCallerMockConfig<TSchemas>,
  ): IgniterCallerBuilder<TSchemas> {
    return new IgniterCallerBuilder({ ...this.state, mock: config })
  }

  /**
   * Builds the `IgniterCaller` instance.
   *
   * @returns Configured manager instance.
   */
  build(): IgniterCallerManager<TSchemas> {
    if (this.state.store) {
      IgniterCallerCacheUtils.setStore(this.state.store, this.state.storeOptions);
    }

    const manager = new IgniterCallerManager<TSchemas>(this.state.baseURL, {
      headers: this.state.headers,
      cookies: this.state.cookies,
      logger: this.state.logger,
      telemetry: this.state.telemetry,
      requestInterceptors: this.state.requestInterceptors,
      responseInterceptors: this.state.responseInterceptors,
      schemas: this.state.schemas,
      schemaValidation: this.state.schemaValidation,
      mock: this.state.mock,
    });

    this.state.logger?.info('IgniterCaller initialized', {
      baseURL: this.state.baseURL,
      hasTelemetry: Boolean(this.state.telemetry),
      hasStore: Boolean(this.state.store),
      hasSchemas: Boolean(this.state.schemas),
    });

    return manager;
  }
}

/**
 * Main entrypoint for the caller builder.
 *
 * @example
 * ```ts
 * const api = IgniterCaller.create().withBaseUrl('https://api.example.com').build()
 * ```
 */
export const IgniterCaller = {
  create: IgniterCallerBuilder.create,
};
