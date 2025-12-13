import type { IgniterLogger } from '@igniter-js/core'
import type {
  IgniterCallerRequestInterceptor,
  IgniterCallerResponseInterceptor,
} from '../types/interceptors'
import type {
  IgniterCallerSchemaMap,
  IgniterCallerSchemaValidationOptions,
} from '../types/schemas'
import type {
  IgniterCallerStoreAdapter,
  IgniterCallerStoreOptions,
} from '../types/store'

export type IgniterCallerBuilderState<
  TSchemas extends IgniterCallerSchemaMap = any,
> = {
  baseURL?: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
  logger?: IgniterLogger
  requestInterceptors?: IgniterCallerRequestInterceptor[]
  responseInterceptors?: IgniterCallerResponseInterceptor[]
  store?: IgniterCallerStoreAdapter
  storeOptions?: IgniterCallerStoreOptions
  schemas?: TSchemas
  schemaValidation?: IgniterCallerSchemaValidationOptions
}

export type IgniterCallerBuilderFactory<
  TCaller,
  TSchemas extends IgniterCallerSchemaMap = any,
> = (state: IgniterCallerBuilderState<TSchemas>) => TCaller

/**
 * Builder used by developers to initialize the `IgniterCaller` client.
 *
 * This API is designed to remain stable when extracted to `@igniter-js/caller`.
 */
export class IgniterCallerBuilder<
  TCaller = unknown,
  TSchemas extends IgniterCallerSchemaMap = any,
> {
  private readonly state: IgniterCallerBuilderState<TSchemas>
  private readonly factory: IgniterCallerBuilderFactory<TCaller, TSchemas>

  private constructor(
    state: IgniterCallerBuilderState<TSchemas>,
    factory: IgniterCallerBuilderFactory<TCaller, TSchemas>,
  ) {
    this.state = state
    this.factory = factory
  }

  /**
   * Creates a new builder instance.
   */
  static create<TCaller, TSchemas extends IgniterCallerSchemaMap = any>(
    factory: IgniterCallerBuilderFactory<TCaller, TSchemas>,
  ): IgniterCallerBuilder<TCaller, TSchemas> {
    return new IgniterCallerBuilder({}, factory)
  }

  /** Sets the base URL for all requests. */
  withBaseUrl(baseURL: string): IgniterCallerBuilder<TCaller, TSchemas> {
    return new IgniterCallerBuilder({ ...this.state, baseURL }, this.factory)
  }

  /** Merges default headers for all requests. */
  withHeaders(headers: Record<string, string>): IgniterCallerBuilder<TCaller> {
    return new IgniterCallerBuilder({ ...this.state, headers }, this.factory)
  }

  /** Sets default cookies (sent as the `Cookie` header). */
  withCookies(cookies: Record<string, string>): IgniterCallerBuilder<TCaller> {
    return new IgniterCallerBuilder({ ...this.state, cookies }, this.factory)
  }

  /** Attaches a logger instance. */
  withLogger(logger: IgniterLogger): IgniterCallerBuilder<TCaller, TSchemas> {
    return new IgniterCallerBuilder({ ...this.state, logger }, this.factory)
  }

  /** Adds a request interceptor that runs before each request. */
  withRequestInterceptor(
    interceptor: IgniterCallerRequestInterceptor,
  ): IgniterCallerBuilder<TCaller, TSchemas> {
    const requestInterceptors = [
      ...(this.state.requestInterceptors || []),
      interceptor,
    ]
    return new IgniterCallerBuilder(
      { ...this.state, requestInterceptors },
      this.factory,
    )
  }

  /** Adds a response interceptor that runs after each request. */
  withResponseInterceptor(
    interceptor: IgniterCallerResponseInterceptor,
  ): IgniterCallerBuilder<TCaller, TSchemas> {
    const responseInterceptors = [
      ...(this.state.responseInterceptors || []),
      interceptor,
    ]
    return new IgniterCallerBuilder(
      { ...this.state, responseInterceptors },
      this.factory,
    )
  }

  /**
   * Configures a persistent store adapter for caching.
   *
   * When configured, cache operations will use the store (e.g., Redis)
   * instead of in-memory cache, enabling persistent cache across deployments.
   */
  withStore(
    store: IgniterCallerStoreAdapter,
    options?: IgniterCallerStoreOptions,
  ): IgniterCallerBuilder<TCaller, TSchemas> {
    return new IgniterCallerBuilder(
      { ...this.state, store, storeOptions: options },
      this.factory,
    )
  }

  /**
   * Configures schema-based type safety and validation.
   *
   * Enables automatic type inference for requests/responses based on
   * route and method, with optional runtime validation via Zod.
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
  ): IgniterCallerBuilder<TCaller, TNewSchemas> {
    return new IgniterCallerBuilder(
      { ...this.state, schemas, schemaValidation: validation },
      this.factory as any,
    )
  }

  /**
   * Builds the `IgniterCaller` instance.
   */
  build(): TCaller {
    return this.factory(this.state)
  }
}
