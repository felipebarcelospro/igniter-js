# AGENTS.md - @igniter-js/core

> Last Updated: 2025-12-29
> Version: 0.3.40
> Goal: This document is the complete operational manual for Code Agents and developers using @igniter-js/core.

---

## 0. Scope, Language, and Ground Rules

- Scope: This manual covers the @igniter-js/core package only.
- Audience: Maintainers (internal architecture) and consumers (usage in apps).
- Language: Documentation and code are English only.
- Grounding: Everything in this document maps to real code in packages/core.
- Non-negotiables:
  - Do not invent APIs. Search the code before documenting behavior.
  - Preserve public APIs unless explicitly asked to change them.
  - Prefer minimal, correct changes over refactors.
  - Avoid PII in telemetry or logs.

## 1. Package Vision and Context

Igniter Core is the heart of the Igniter.js framework. It provides:

- Builder-first developer experience (IgniterBuilder).
- Type-safe action definitions for queries and mutations.
- Controllers, routers, and request processing pipeline.
- Response building utilities with typed responses.
- Realtime (SSE) infrastructure and client hooks.
- Plugin system with self-referential actions.
- Jobs service and job routing utilities.
- First-class adapters for Next.js and Express.
- Standardized type system for routing, schemas, and client hooks.

This package is intended to be the foundation for building type-safe HTTP APIs
and for powering framework integrations (Next.js, Express, TanStack Start).

## 2. How to Read This Document

- Section I (Maintainer Guide) explains how core is built and how to change it.
- Section II (Consumer Guide) explains how developers use @igniter-js/core.
- Section III (Technical Reference) lists public APIs, telemetry, and errors.

---

# I. MAINTAINER GUIDE (Internal Architecture)

## 3. Repository Placement and Build Output

- Package root: packages/core
- Source directory: packages/core/src
- Build output: packages/core/dist
- Root entrypoint re-export: packages/core/index.ts -> packages/core/src/index.ts
- Subpath exports: 
  - @igniter-js/core/client
  - @igniter-js/core/adapters
  - @igniter-js/core/plugins

Build configuration:

- packages/core/tsup.config.ts
  - Builds src/index.ts (main entry).
  - Builds client entry points and browser/server variants.
  - Builds adapters and plugins subpaths.
- packages/core/scripts/add-use-client.js
  - Post-build script that injects "use client" into client chunks when needed.

## 4. FileSystem Topology (Maintenance)

Use this map to find the correct file quickly. Every file listed exists in the repo.

### 4.1 Root Files

- packages/core/AGENTS.md
  - Current core agent manual (older). This new file supersedes it when adopted.
- packages/core/README.md
  - Public-facing overview and quick-start for the core package.
- packages/core/package.json
  - Package exports, dependencies, scripts, and subpaths.
- packages/core/tsup.config.ts
  - Build entrypoints and output directories.
- packages/core/vitest.config.ts
  - Test configuration for core (Vitest).
- packages/core/scripts/add-use-client.js
  - Post-build script that adds "use client" to some client chunks.

### 4.2 src/index.ts (Public Barrel)

- packages/core/src/index.ts
  - Re-exports errors, processors, services, types, utils.
  - Also exports DocsConfig type from types/builder.interface.ts.

### 4.3 src/error

- packages/core/src/error/index.ts
  - Exports IgniterError.
- packages/core/src/error/igniter.error.ts
  - Custom error class used by core.

### 4.4 src/services (Builder and Core Services)

- packages/core/src/services/index.ts
  - Barrel for services.
- packages/core/src/services/builder.service.ts
  - IgniterBuilder and Igniter factory instance.
- packages/core/src/services/action.service.ts
  - createIgniterQuery and createIgniterMutation.
- packages/core/src/services/controller.service.ts
  - createIgniterController.
- packages/core/src/services/router.service.ts
  - createIgniterRouter (router factory).
- packages/core/src/services/procedure.service.ts
  - createIgniterProcedure (legacy) and enhanced procedure builders/factories.
- packages/core/src/services/cache.processor.ts
  - IgniterStoreCacheProcessor (response + geo caching helper).
- packages/core/src/services/cookie.service.ts
  - IgniterCookie (signed cookies, parsing, serialization).
- packages/core/src/services/logger.service.ts
  - IgniterConsoleLogger implementation.
- packages/core/src/services/realtime.service.ts
  - IgniterStoreRealtimeProcessor (Store-backed realtime + connections API).
- packages/core/src/services/caller.server.service.ts
  - createServerCaller (server-only action caller).
- packages/core/src/services/jobs.service.ts
  - IgniterJobsService, createIgniterJobsService, createJobsRouter,
    createJobsRegistry, createJobsProxy.
- packages/core/src/services/plugin.service.ts
  - IgniterPluginManager (plugin registry, events, actions).
- packages/core/src/services/playground.service.ts
  - OpenAPI playground HTML and request handler.

### 4.5 src/processors (Request Pipeline)

- packages/core/src/processors/index.ts
  - Barrel for processors.
- packages/core/src/processors/request.processor.ts
  - Main HTTP request pipeline and router integration.
- packages/core/src/processors/route-resolver.processor.ts
  - Route resolution from router and telemetry hooks.
- packages/core/src/processors/context-builder.processor.ts
  - Builds ProcessedContext from Request and config.
- packages/core/src/processors/body-parser.processor.ts
  - Parses request bodies by content type.
- packages/core/src/processors/middleware-executor.processor.ts
  - Executes global and action middlewares.
- packages/core/src/processors/response.processor.ts
  - IgniterResponseProcessor (builder for responses).
- packages/core/src/processors/error-handler.processor.ts
  - Central error handling (validation, IgniterError, generic).
- packages/core/src/realtime/transports/sse.transport.ts
  - IgniterSSETransport (local SSE delivery for realtime).

### 4.6 src/adapters

- packages/core/src/adapters/index.ts
  - Barrel for adapters (public exports).
- packages/core/src/adapters/nextjs.ts
  - Next.js adapter utilities: nextRouteHandlerAdapter, withIgniter, getHeadersSafe.
- packages/core/src/adapters/expressjs.ts
  - Express adapter for Fetch-based handler.
- packages/core/src/adapters/tanstack-start.ts
  - TanStack Start route handler adapter (internal, not re-exported by adapters barrel).

### 4.7 src/client (Client-Side Runtime)

- packages/core/src/client/index.ts
  - Client barrel for React hooks and createIgniterClient (browser).
- packages/core/src/client/index.browser.ts
  - Browser-specific barrel.
- packages/core/src/client/index.server.ts
  - Server-specific barrel (uses router.caller).
- packages/core/src/client/igniter.client.browser.ts
  - Browser client implementation (fetch-based).
- packages/core/src/client/igniter.client.server.ts
  - Server client implementation (router.caller).
- packages/core/src/client/igniter.hooks.ts
  - React hooks for query, mutation, realtime.
- packages/core/src/client/igniter.context.tsx
  - React provider, SSE connection, cache invalidation.

### 4.8 src/plugins

- packages/core/src/plugins/index.ts
  - Barrel for built-in plugins.
- packages/core/src/plugins/ensure.plugin.ts
  - Ensure validation utility and plugin wrapper.
- packages/core/src/plugins/audit.plugin.ts
  - Audit plugin example (actions, controllers, hooks).

### 4.9 src/types

- packages/core/src/types/index.ts
  - Barrel for all type interfaces.
- packages/core/src/types/action.interface.ts
  - Action, handler, and inference types.
- packages/core/src/types/builder.interface.ts
  - Builder config and DocsConfig definitions.
- packages/core/src/types/client.interface.ts
  - Client hooks and caller types.
- packages/core/src/types/controller.interface.ts
  - Controller config types and validation.
- packages/core/src/types/context.interface.ts
  - Context and plugins configuration types.
- packages/core/src/types/cookie.interface.ts
  - Cookie options and prefix types.
- packages/core/src/types/jobs.interface.ts
  - Large, rich jobs system types.
- packages/core/src/types/logger.interface.ts
  - Logger interfaces and levels.
- packages/core/src/types/next.interface.ts
  - Middleware "next" function types.
- packages/core/src/types/plugin.interface.ts
  - Plugin system types and factories.
- packages/core/src/types/procedure.interface.ts
  - Procedure types (legacy and enhanced).
- packages/core/src/types/request.processor.ts
  - RequestProcessor types.
- packages/core/src/types/response.interface.ts
  - Response envelope types and error class.
- packages/core/src/types/router.interface.ts
  - Router types and server caller inference.
- packages/core/src/types/schema.interface.ts
  - StandardSchemaV1 and StandardTyped types.
- packages/core/src/types/store.interface.ts
  - Store manager types (re-exports from @igniter-js/store).
- packages/core/src/types/realtime.interface.ts
  - Realtime service and builder types.
- packages/core/src/types/utils.interface.ts
  - Core type utilities.

### 4.10 src/telemetry

- packages/core/src/telemetry/index.ts
  - Telemetry event registry (IgniterCoreTelemetryEvents).

### 4.11 src/utils

- packages/core/src/utils/index.ts
  - Barrel for utils.
- packages/core/src/utils/url.ts
  - parseURL path merge helper.
- packages/core/src/utils/response.ts
  - parseResponse, preserveUnion, conditionalResponse, normalizeResponseData.
- packages/core/src/utils/queryKey.ts
  - generateQueryKey for client cache keys.
- packages/core/src/utils/deepMerge.ts
  - deepMerge and mergeQueryParams.
- packages/core/src/utils/logger.ts
  - resolveLogLevel and createLoggerContext.
- packages/core/src/utils/cache.ts
  - ClientCache (simple in-memory cache).
- packages/core/src/utils/try-catch.ts
  - tryCatch helper.
- packages/core/src/utils/client.ts
  - isServer and isClient flags.
- packages/core/src/utils/envronment.ts
  - isServerEnvironment and isClientEnvironment.

### 4.12 src/test

- packages/core/src/test/setup.ts
  - Test setup (global hooks or test utilities).

### 4.12 Test Files (src/*/__tests__)

- packages/core/src/services/__tests__/action.service.test.ts
- packages/core/src/services/__tests__/controller.service.test.ts
- packages/core/src/services/__tests__/cookie.service.test.ts
- packages/core/src/services/__tests__/jobs.service.test.ts
- packages/core/src/services/__tests__/logger.service.test.ts
- packages/core/src/services/__tests__/procedure.service.test.ts
- packages/core/src/services/__tests__/realtime.service.test.ts
- packages/core/src/processors/__tests__/context-builder.processor.test.ts
- packages/core/src/processors/__tests__/error-handler.processor.test.ts
- packages/core/src/processors/__tests__/middleware-executor.processor.test.ts
- packages/core/src/processors/__tests__/response.processor.test.ts
- packages/core/src/utils/response.test.ts

---

## 5. Architecture Deep-Dive

This section explains the core architecture and how files interact.

### 5.1 High-Level Data Flow

1. The developer configures Igniter via IgniterBuilder.
2. IgniterBuilder.create() returns factories (query, mutation, controller, router).
3. Controller configs collect actions created by query/mutation.
4. createIgniterRouter builds RequestProcessor.
5. RequestProcessor registers routes into rou3.
6. RequestProcessor.process handles every incoming Request.
7. The pipeline is:
   - RouteResolverProcessor.resolve
   - ContextBuilderProcessor.build
   - ContextBuilderProcessor.enhanceWithPlugins
   - Telemetry events emitted per phase (if telemetry configured)
   - MiddlewareExecutorProcessor.executeGlobal
   - MiddlewareExecutorProcessor.executeAction
   - Execute action handler
   - IgniterResponseProcessor.toResponse
   - ErrorHandlerProcessor.handleError on failures

### 5.2 Builder to Router Architecture

- IgniterBuilder is a fluent configuration container.
- Each configuration call returns a new builder instance.
- create() returns a set of factories and resolved adapters:
  - query and mutation factories (action definitions)
  - controller factory (group actions)
  - router factory (RequestProcessor wrapper)
  - procedure factory (middleware definitions)
  - store, logger, jobs, telemetry, realtime

### 5.3 Processor Layer

- RequestProcessor is the orchestration layer.
- Processors are focused and stateless:
  - RouteResolverProcessor resolves and validates routes.
  - BodyParserProcessor parses request bodies.
  - ContextBuilderProcessor builds action context.
  - MiddlewareExecutorProcessor runs procedures safely.
  - Telemetry emits are performed within each processor (optional).
  - ErrorHandlerProcessor turns errors into responses.

### 5.4 Client Runtime Layer

- createIgniterClient is split into browser and server versions.
- Browser uses fetch and React hooks.
- Server uses router.caller for direct invocation.
- IgniterProvider manages SSE connection and cache invalidation.

### 5.5 Plugin System Layer

- IgniterPluginManager registers plugins and resolves dependencies.
- Plugin proxies allow self-referential actions in plugins.
- ContextBuilderProcessor.enhanceWithPlugins injects proxies into context.

### 5.6 Jobs System Layer

- IgniterJobsService wraps a queue adapter and provides type-safe APIs.
- JobsRouter groups job definitions and merges options and hooks.
- JobsRegistry provides fast lookup by namespace path.
- createJobsProxy creates a proxy-based API for job namespaces.

---

## 6. Operational Flow Mapping (Pipelines)

Every public method below includes a step-by-step flow.

### 6.1 IgniterBuilder (builder.service.ts)

#### Method: IgniterBuilder.context(contextFn)

1. Accepts a context object or function.
2. Creates a new IgniterBuilder with updated config.
3. Returns new builder instance (does not mutate the previous).

#### Method: IgniterBuilder.config(routerConfig)

1. Accepts a base config (baseURL, basePATH).
2. Creates a new builder with config updated.
3. Returns new builder instance.

#### Method: IgniterBuilder.store(storeManager)

1. Accepts an IgniterStoreManager.
2. Creates IgniterStoreCacheProcessor and IgniterStoreRealtimeProcessor.
3. Returns a new builder with store + realtime + cache set.

#### Method: IgniterBuilder.logger(loggerAdapter)

1. Accepts an IgniterLogger.
2. Returns a new builder with logger updated.

#### Method: IgniterBuilder.jobs(jobsAdapter)

1. Accepts a MergedJobsExecutor adapter.
2. Calls jobsAdapter.createProxy().
3. Returns a new builder with jobs proxy set.

#### Method: IgniterBuilder.telemetry(telemetryProvider)

1. Accepts an IgniterTelemetryManager from `@igniter-js/telemetry`.
2. Returns a new builder with telemetry set.

#### Method: IgniterBuilder.plugins(pluginsRecord)

1. Accepts a record of plugin instances.
2. Stores plugins on config for RequestProcessor access.
3. Returns a new builder with plugins set.

#### Method: IgniterBuilder.docs(docsConfig)

1. Accepts DocsConfig (OpenAPI, playground).
2. Returns a new builder with docs config set.

#### Method: IgniterBuilder.create()

1. Computes inferred context type (sync or async).
2. Returns an object with factories:
   - query
   - mutation
   - controller
   - router
   - procedure
3. Also exposes resolved adapters and metadata:
   - store, logger, jobs, telemetry, realtime, plugins
   - $Infer (context, config, store, logger, jobs, telemetry, realtime, plugins, docs)

### 6.2 Action Factories (action.service.ts)

#### Method: createIgniterQuery(options)

1. Accepts IgniterQueryOptions (path, query schema, middlewares, handler).
2. Returns an IgniterAction with method GET and type "query".
3. Adds $Infer type placeholder for inference.

#### Method: createIgniterMutation(options)

1. Accepts mutation options (path, method, body schema, query, handler).
2. Returns an IgniterAction with method set to provided method.
3. Adds $Infer type placeholder for inference.

### 6.3 Controller Factory (controller.service.ts)

#### Method: createIgniterController(config)

1. Accepts a controller config with path and actions.
2. Returns the config directly (typed).

### 6.4 Router Factory (router.service.ts)

#### Method: igniter.router.create()

1. Returns a new `IgniterRouterBuilder` instance.
2. Builder stores controllers, middlewares, CORS, rate limiting, and lifecycle hooks.

#### Method: IgniterRouterBuilder (Fluent API)

1. `addController(key, controller)`: Adds a controller to the router.
2. `withCors(options)`: Configures global CORS.
3. `withRateLimit(options)`: Configures global rate limiting.
4. `withHealthCheck(path)`: Enables a health check endpoint.
5. `addMiddleware(middleware)`: Adds global builder-level middleware.
6. `onRequest(hook)`: Registers a global request hook.
7. `onResponse(hook)`: Registers a global response hook.
8. `onError(handler)`: Registers a global custom error handler.

#### Method: IgniterRouterBuilder.build()

1. Instantiates `RequestProcessor` with the collected builder state.
2. Creates server-side caller proxy via `createServerCaller`.
3. Returns an `IgniterRouter` object.

#### Method: router.listen(options)

1. Detects runtime (Bun, Deno, Node.js).
2. Selects appropriate server adapter (BunAdapter, DenoAdapter, or NodeAdapter).
3. Starts HTTP server and handles requests using `router.handler`.
4. Returns a server instance with a `.stop()` method.

### 6.5 Server Caller (caller.server.service.ts)

#### Method: createServerCaller(controllers, processor)

1. Returns a proxy object shaped like router.controllers.
2. For each action:
   - If method GET, returns a query caller.
   - Else returns a mutation caller.
3. Each caller builds a synthetic Request and passes to processor.call.

### 6.6 Procedures (procedure.service.ts)

#### Method: createIgniterProcedure(Procedure)

1. Accepts a legacy procedure definition.
2. Returns a factory function (options -> procedure).
3. The handler wraps Procedure.handler and injects options.

#### Method: createEnhancedProcedureBuilder()

1. Returns an object with fluent builder methods.
2. Builder supports name(), options(schema), handler().
3. Handler validates options with schema.parse if available.

#### Method: createEnhancedProcedureFactories()

1. Returns factory methods for common patterns:
   - simple(handler)
   - withSchema({ optionsSchema, handler })
   - fromConfig(config)
2. Validates options via schema.parse if available.

### 6.7 Cookies (cookie.service.ts)

#### Method: new IgniterCookie(headers)

1. Parses the Cookie header into a Map.
2. Stores headers reference for Set-Cookie.

#### Method: get(key)

1. Returns the cookie value or undefined.

#### Method: set(key, value, options)

1. Serializes cookie with prefixes and options.
2. Sets "Set-Cookie" header.
3. Updates internal Map.

#### Method: getSigned(key, secret)

1. Reads value from Map.
2. Splits content and signature.
3. Verifies HMAC signature.
4. Returns content if valid, else null.

#### Method: setSigned(key, value, secret, options)

1. Creates HMAC signature over value.
2. Encodes value.signature as cookie value.
3. Serializes and sets cookie.

#### Method: getAll()

1. Returns the Map of cookies.

#### Method: has(key)

1. Returns boolean if key exists.

#### Method: delete(key)

1. Deletes key from Map.

#### Method: clear()

1. Clears the Map.

#### Method: toString()

1. Returns "k=v; k2=v2" string representation.

### 6.8 Logger (logger.service.ts)

#### Method: new IgniterConsoleLogger(options)

1. Stores log level, context, formatting options.
2. Computes column widths for output alignment.

#### Method: IgniterConsoleLogger.log(level, message, context, error)

1. Checks log level.
2. Formats message with context.
3. Writes to console method based on level.

#### Method: child(component, context)

1. Returns a new IgniterConsoleLogger with merged context.

### 6.9 Realtime (realtime.service.ts)

#### Method: IgniterStoreRealtimeProcessor.publish(eventName, payload)

1. Uses store.events.publish with typed payload.
2. Publishes through Store-backed event bus.

#### Method: IgniterStoreRealtimeProcessor.subscribe(eventName, handler)

1. Uses store.events.subscribe for typed events.
2. Returns Store unsubscribe function.

#### Method: IgniterStoreRealtimeProcessor.scope(key, id)

1. Creates a scoped Store instance.
2. Returns a new realtime processor with scope chain applied.

#### Method: IgniterStoreRealtimeProcessor.openConnection(request)

1. Parses channels + scopes from query params.
2. Persists connection metadata in Store (kv:sse:connections).
3. Subscribes to Store events and bridges to transport.
4. Returns transport.openConnection response.

### 6.10 Jobs (jobs.service.ts)

#### Method: new IgniterJobsService(config)

1. Stores adapter and context factory.
2. Prepares registeredJobs map.

#### Method: register(config)

1. Validates name, input schema, handler.
2. Returns job definition.

#### Method: bulkRegister(jobs)

1. Wraps handlers to inject context.
2. Calls adapter.bulkRegister.
3. Returns a new IgniterJobsService with merged jobs.

#### Method: invoke(params)

1. Delegates to adapter.invoke.
2. Returns job ID.

#### Method: invokeMany(jobs)

1. Delegates to adapter.invoke for each.
2. Returns list of job IDs.

#### Method: search(params)

1. Delegates to adapter.search.

#### Method: worker(config)

1. Delegates to adapter.worker.

#### Method: shutdown()

1. Delegates to adapter.shutdown.

#### Method: getRegisteredJobs()

1. Returns keys of registeredJobs.

#### Method: getJobInfo(jobId)

1. Returns job definition for a job ID.

#### Method: createJobsRouter(config)

1. Validates unique job IDs and namespace format.
2. Merges default options with job-specific options.
3. Merges router hooks with job hooks (router first).
4. Returns JobsRouter with register() for extension.

#### Method: createJobsRegistry(jobs, options)

1. Builds JobsRegistry with caching.
2. Provides getJobByPath and namespace APIs.

#### Method: createJobsProxy(mergedJobs, registry, invokeFunction, managementApi)

1. Returns nested proxy for namespace access.
2. Resolves job definitions via registry.
3. Supports fallback methods enqueue/schedule/bulk.
4. Exposes management API via $queues, $job, $workers.

### 6.11 Plugin Manager (plugin.service.ts)

#### Method: new IgniterPluginManager({ store, logger, config })

1. Initializes plugin registry, dependency graph, metrics.
2. Stores store adapter and logger.

#### Method: register(plugin)

1. Validates plugin definition (name, registration, dependencies).
2. Checks conflicts with existing plugins.
3. Builds dependency graph.
4. Registers event listeners.
5. Creates self-reference proxies.

#### Method: loadAll()

1. Resolves dependency order.
2. Executes init hooks in order.
3. Sets status to loaded.

#### Method: executeAction(pluginName, actionName, args, context)

1. Validates plugin and action exist.
2. Validates input with schema if enabled.
3. Executes action with timeout.
4. Returns PluginExecutionResult.

#### Method: emit(eventName, payload, context)

1. Executes local listeners with schema validation.
2. Publishes to store channel igniter:plugin:events:{eventName}.

#### Method: enrichContext(baseContext)

1. Runs extendContext hook for each plugin.
2. Merges returned extensions into a single object.

### 6.12 Request Processing (request.processor.ts)

#### Method: new RequestProcessor(config)

1. Stores config and logger.
2. Initializes plugin manager if plugins exist.
3. Creates rou3 router context.
4. Calls initializeAsync() to register plugins and routes.

#### Method: process(request)

1. Checks for SSE central endpoint and delegates to realtime.openConnection().
2. Resolves route via RouteResolverProcessor.
3. Builds context via ContextBuilderProcessor.build.
4. Enhances context via ContextBuilderProcessor.enhanceWithPlugins.
5. Emits telemetry events per phase (session started in router.service.ts).
6. Executes global middlewares.
7. Executes action middlewares.
8. Executes action handler.
9. Handles response via handleSuccessfulResponse.
10. On error, delegates to ErrorHandlerProcessor.

#### Method: call(controllerKey, actionKey, input)

1. Locates controller and action.
2. Builds URL from baseURL/basePATH and params.
3. Extracts headers (Next.js server headers if available).
4. Builds Request and calls process().
5. Parses response via parseResponse.

### 6.13 Route Resolver (route-resolver.processor.ts)

#### Method: RouteResolverProcessor.resolve(router, method, path)

1. Validates path.
2. Uses findRoute from rou3.
3. Emits telemetry events for resolution outcome.
4. Returns RouteResult with action and params.

### 6.14 Context Builder (context-builder.processor.ts)

#### Method: ContextBuilderProcessor.build(config, request, params, url, hasBodySchema)

1. Resolves base context (function or object).
2. Parses body via BodyParserProcessor.parse.
3. Creates IgniterCookie from request headers.
4. Creates IgniterResponseProcessor.
5. Enriches request with ip, device, geo (cached + fallback).
6. Returns ProcessedContext with $context and $plugins.

#### Method: ContextBuilderProcessor.enhanceWithPlugins(context, pluginManager)

1. Injects plugin proxies into context.plugins.
2. Returns enhanced ProcessedContext.

### 6.15 Body Parser (body-parser.processor.ts)

#### Method: BodyParserProcessor.parse(request, hasBodySchema)

1. If no schema or no body, returns undefined.
2. Parses based on content-type:
   - application/json -> JSON.parse
   - form-urlencoded -> formData
   - multipart/form-data -> formData
   - text/plain -> text
   - octet-stream -> arrayBuffer
   - images/pdf/video -> blob
   - streams -> request.body
3. Records telemetry metrics.
4. Throws IgniterError with code BODY_PARSE_ERROR on failure.

### 6.16 Middleware Executor (middleware-executor.processor.ts)

#### Method: executeGlobal(context, middlewares)

1. Iterates middlewares in order.
2. Builds procedure context with next() function.
3. Executes handler and merges context safely.
4. Supports early return via Response or IgniterResponseProcessor.
5. Records telemetry spans and metrics.

#### Method: executeAction(context, middlewares)

1. Same as executeGlobal but for action-specific middleware.

### 6.17 Response Processor (response.processor.ts)

#### Method: IgniterResponseProcessor.init(store, context, logger, telemetry)

1. Creates instance with store and context.
2. Sets logger child context.

#### Method: status(code)

1. Sets HTTP status and marks explicit.

#### Method: success(data)

1. Returns a new instance with data and error null.
2. Defaults status 200 unless explicit.

#### Method: created(data)

1. Returns a new instance with data and error null.
2. Defaults status 201 unless explicit.

#### Method: noContent()

1. Returns a new instance with data null.
2. Defaults status 204 unless explicit.

#### Method: json(data)

1. Returns a new instance with data and error null.
2. Defaults status 200 unless explicit.

#### Method: error(IgniterResponseError)

1. Sets error envelope and status based on error code.

#### Method: badRequest / unauthorized / forbidden / notFound / redirect

1. Builds IgniterResponseError with specific codes.
2. Sets status accordingly unless explicit.

#### Method: setHeader(name, value)

1. Sets response header.

#### Method: setCookie(name, value, options)

1. Builds cookie string and appends to Set-Cookie.

#### Method: stream(options)

1. Configures SSE response with channelId.
2. Returns a JSON response with connection info (endpoint + params).
3. Does not register channels; delivery is handled by realtime transport.

#### Method: revalidate(options)

1. Stores revalidation options for toResponse.
2. Publishes revalidation event on toResponse.

#### Method: toResponse()

1. Applies revalidation if configured.
2. If stream, returns JSON payload with connection info.
3. For 204, returns empty body.
4. Serializes response with safeStringify.
5. Returns Response with Content-Type application/json.

### 6.18 SSE Transport (realtime/transports/sse.transport.ts)

#### Method: openConnection(request, options)

1. Creates ReadableStream with connected + keepalive events.
2. Registers connection handlers per channel (in-memory).
3. Returns SSE Response with proper headers.

#### Method: publish(event)

1. Finds channel handlers.
2. Delivers event to active SSE streams.
3. Returns number of recipients.

#### Method: closeAll()

1. Clears handler registry.
2. Cancels all active streams.

### 6.19 Telemetry Events (src/telemetry/index.ts)

Core emits telemetry events directly from processors using `IgniterTelemetryManager`.
The event registry lives at `@igniter-js/core/telemetry` (namespace `igniter.core`).

---

## 7. State and Immutability

- IgniterBuilder uses an immutable builder pattern.
  - Each configuration call returns a new builder instance.
  - Internal fields are set via constructor, not mutated publicly.
- Realtime processor is immutable: scope() returns a new instance.
- IgniterResponseProcessor uses a typed state machine to gate method chaining.
  - Each method returns a new instance or the same instance with state copied.

Maintain these properties when adding features:

- Do not mutate previous builder instances.
- Use new objects for updated state.
- Keep $Infer typing consistent with actual behavior.

---

## 8. Dependency and Type Graph

### 8.1 External Runtime Dependencies

- rou3: Route matching (RequestProcessor, RouteResolverProcessor).
- chalk: Colorized logging (IgniterConsoleLogger).
- uncrypto: HMAC signing (IgniterCookie).
- zod: Schema parsing in some code paths and tests (optional).
- @scalar/core: Playground UI assets.
- lodash: Utility dependency (not used directly in core source here).
- glob: Build support (not used directly in core source here).

### 8.2 Type Graph Overview

- Types defined in src/types/ and re-exported via src/index.ts.
- IgniterAction and IgniterActionContext define the core request types.
- IgniterBuilderConfig binds context, adapters, and plugins.
- IgniterRouter binds controllers and config.
- Client types map the router to typed hooks and callers.

Key type dependencies:

- action.interface.ts depends on:
  - schema.interface.ts
  - procedure.interface.ts
  - realtime.interface.ts
  - plugin.interface.ts
  - response.interface.ts
- builder.interface.ts depends on:
  - jobs.interface.ts
  - store.interface.ts
  - logger.interface.ts
  - @igniter-js/telemetry (IgniterTelemetryManager type)
- router.interface.ts depends on:
  - controller.interface.ts
  - client.interface.ts
  - builder.interface.ts

---

## 9. Maintenance Checklist

### 9.1 Adding New Framework Features

1. Identify the canonical area (service, processor, adapter, client).
2. Update types first (src/types).
3. Update implementation (services/processors).
4. Add or update tests in matching folder.
5. Update README or docs if behavior changes.
6. Ensure exports remain consistent in src/index.ts.

### 9.2 Modifying the Request Pipeline

1. Confirm how RequestProcessor orchestrates the pipeline.
2. Update processors with telemetry parity if applicable.
3. Update ErrorHandlerProcessor if error shapes change.
4. Add tests for new pipeline steps.

### 9.3 Modifying Client Hooks

1. Update hooks in src/client/igniter.hooks.ts.
2. Update IgniterProvider if SSE behavior changes.
3. Ensure createIgniterClient behavior remains aligned.
4. Add tests or manual verification in apps.

---

## 10. Maintainer Troubleshooting

### 10.1 Request Pipeline Issues

- Symptom: 404 for known routes.
  - Check route registration in RequestProcessor.registerRoutes.
  - Ensure controller paths are correct.
  - Ensure basePATH is set in config.

- Symptom: Validation errors on correct payloads.
  - Check body schema parsing in RequestProcessor.executeAction.
  - Verify StandardSchemaV1 schema parse method.

- Symptom: Missing plugin context in actions.
  - Check ContextBuilderProcessor.enhanceWithPlugins.
  - Confirm IgniterPluginManager.getAllPluginProxies returns proxies.

### 10.2 SSE and Realtime Issues

- Symptom: Client never receives realtime events.
  - Ensure realtime connection subscribes to the correct Store event names.
  - Ensure IgniterResponseProcessor.stream returns the channelId expected by client.
  - Ensure IgniterProvider scopes match server-side scopes.

- Symptom: Revalidation not triggering refetch.
  - Check IgniterResponseProcessor.revalidate configuration.
  - Ensure IgniterProvider receives "revalidate" events for `http:revalidate:requested`.
  - Verify generateQueryKey matches server usage.

### 10.3 Next.js Integration Issues

- Symptom: Client bundle errors for Node modules.
  - Review adapters/nextjs.ts with withIgniter config.
  - Use createEmptyJsFile to generate empty module if needed.
  - Confirm Next.js config merges serverExternalPackages.

### 10.4 Plugin System Issues

- Symptom: Plugin action not found.
  - Ensure plugin registered with IgniterBuilder.plugins.
  - Verify plugin name matches usage.

- Symptom: Plugin dependency conflicts.
  - Check PluginDependencies.conflicts and requires.
  - Validate plugin registration order.

---

# II. CONSUMER GUIDE (Developer Manual)

## 11. Distribution Anatomy (Consumption)

The build output matches package.json exports.

- Main entry: @igniter-js/core
  - dist/index.js, dist/index.mjs, dist/index.d.ts
- Client entry: @igniter-js/core/client
  - Browser: dist/client/index.browser.*
  - Server: dist/client/index.server.*
  - Default: dist/client/index.*
- Adapters entry: @igniter-js/core/adapters
  - dist/adapters/index.*
- Plugins entry: @igniter-js/core/plugins
  - dist/plugins/index.*
- Store entry: @igniter-js/core/store
  - dist/store/index.*

Build notes:

- Client files are marked "use client" where needed by scripts/add-use-client.js.
- React is externalized in tsup builds.

## 12. Quick Start and Common Patterns

### 12.1 Basic Setup

```ts
import { Igniter } from "@igniter-js/core";

export type AppContext = {
  db: { findUsers: () => Promise<{ id: string; name: string }[]> };
};

export const igniter = Igniter.create()
  .withContext<AppContext>()
  .build();
```

### 12.2 Define Actions and Controllers

```ts
import { z } from "zod";
import { igniter } from "./igniter";

export const userController = igniter.controller({
  name: "users",
  path: "/users",
  actions: {
    list: igniter.query({
      path: "/",
      handler: async ({ context, response }) => {
        const users = await context.db.findUsers();
        return response.success({ users });
      },
    }),
    create: igniter.mutation({
      path: "/",
      method: "POST",
      body: z.object({ name: z.string() }),
      handler: async ({ request, response }) => {
        return response.created({ id: "1", name: request.body.name });
      },
    }),
  },
});
```

### 12.3 Create Router

```ts
import { igniter } from "./igniter";
import { userController } from "./user.controller";

export const AppRouter = igniter.router
  .create()
  .addController("users", userController)
  .build();
```

### 12.4 Server Handler (Fetch-compatible)

```ts
import { createServer } from "http";
import { AppRouter } from "./router";

createServer(async (req, res) => {
  const request = new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers as any,
  });

  const response = await AppRouter.handler(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await response.text());
}).listen(3000);
```

### 12.5 Client Usage (Browser)

```ts
import { createIgniterClient } from "@igniter-js/core/client";
import { AppRouter } from "./router";

const client = createIgniterClient({
  router: AppRouter,
  baseURL: "http://localhost:3000",
  basePATH: "/api/v1",
});

const users = await client.users.list.query({ params: {}, query: {} });
```

---

## 13. Real-World Use Case Library

All examples are real APIs based on core behavior.

### 13.1 E-commerce Checkout API

```ts
import { z } from "zod";
import { Igniter } from "@igniter-js/core";

type Ctx = { cart: any; payments: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const checkoutController = igniter.controller({
  name: "checkout",
  path: "/checkout",
  actions: {
    createOrder: igniter.mutation({
      path: "/",
      method: "POST",
      body: z.object({ cartId: z.string(), paymentMethod: z.string() }),
      handler: async ({ request, context, response }) => {
        const order = await context.payments.charge(request.body);
        return response.created({ orderId: order.id });
      },
    }),
  },
});
```

### 13.2 Fintech Transfers API

```ts
import { z } from "zod";
import { Igniter } from "@igniter-js/core";

type Ctx = { ledger: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const transferController = igniter.controller({
  name: "transfers",
  path: "/transfers",
  actions: {
    send: igniter.mutation({
      path: "/",
      method: "POST",
      body: z.object({ from: z.string(), to: z.string(), amount: z.number() }),
      handler: async ({ request, context, response }) => {
        const receipt = await context.ledger.transfer(request.body);
        return response.success({ receipt });
      },
    }),
  },
});
```

### 13.3 Social Feed API

```ts
import { z } from "zod";
import { Igniter } from "@igniter-js/core";

type Ctx = { feed: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const feedController = igniter.controller({
  name: "feed",
  path: "/feed",
  actions: {
    list: igniter.query({
      path: "/",
      query: z.object({ page: z.number().optional() }).optional(),
      handler: async ({ request, context, response }) => {
        const posts = await context.feed.list(request.query?.page ?? 1);
        return response.success({ posts });
      },
    }),
  },
});
```

### 13.4 Healthcare Appointment API

```ts
import { z } from "zod";
import { Igniter } from "@igniter-js/core";

type Ctx = { appointments: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const appointments = igniter.controller({
  name: "appointments",
  path: "/appointments",
  actions: {
    book: igniter.mutation({
      path: "/",
      method: "POST",
      body: z.object({ patientId: z.string(), date: z.string() }),
      handler: async ({ request, context, response }) => {
        const booking = await context.appointments.book(request.body);
        return response.created(booking);
      },
    }),
  },
});
```

### 13.5 SaaS Admin API

```ts
import { z } from "zod";
import { Igniter } from "@igniter-js/core";

type Ctx = { users: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const adminController = igniter.controller({
  name: "admin",
  path: "/admin",
  actions: {
    disableUser: igniter.mutation({
      path: "/users/:id/disable",
      method: "PATCH",
      handler: async ({ request, context, response }) => {
        await context.users.disable(request.params.id);
        return response.noContent();
      },
    }),
  },
});
```

### 13.6 Logistics Tracking API

```ts
import { Igniter } from "@igniter-js/core";

type Ctx = { tracking: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const trackingController = igniter.controller({
  name: "tracking",
  path: "/tracking",
  actions: {
    status: igniter.query({
      path: "/:id",
      handler: async ({ request, context, response }) => {
        const status = await context.tracking.status(request.params.id);
        return response.success({ status });
      },
    }),
  },
});
```

### 13.7 Education Platform API

```ts
import { z } from "zod";
import { Igniter } from "@igniter-js/core";

type Ctx = { courses: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const coursesController = igniter.controller({
  name: "courses",
  path: "/courses",
  actions: {
    enroll: igniter.mutation({
      path: "/:id/enroll",
      method: "POST",
      body: z.object({ userId: z.string() }),
      handler: async ({ request, context, response }) => {
        const result = await context.courses.enroll(request.params.id, request.body.userId);
        return response.success({ result });
      },
    }),
  },
});
```

### 13.8 Gaming Leaderboard API

```ts
import { z } from "zod";
import { Igniter } from "@igniter-js/core";

type Ctx = { leaderboard: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const leaderboardController = igniter.controller({
  name: "leaderboard",
  path: "/leaderboard",
  actions: {
    submitScore: igniter.mutation({
      path: "/",
      method: "POST",
      body: z.object({ playerId: z.string(), score: z.number() }),
      handler: async ({ request, context, response }) => {
        const result = await context.leaderboard.submit(request.body);
        return response.success(result);
      },
    }),
  },
});
```

### 13.9 Media Streaming API

```ts
import { Igniter } from "@igniter-js/core";

type Ctx = { media: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const streamingController = igniter.controller({
  name: "streaming",
  path: "/streaming",
  actions: {
    events: igniter.query({
      path: "/events",
      stream: true,
      handler: async ({ response }) => {
        return response.stream({ channelId: "streaming.events" });
      },
    }),
  },
});
```

### 13.10 Internal Tooling API

```ts
import { Igniter } from "@igniter-js/core";

type Ctx = { audit: any };
const igniter = Igniter.create().withContext<Ctx>().build();

export const opsController = igniter.controller({
  name: "ops",
  path: "/ops",
  actions: {
    health: igniter.query({
      path: "/health",
      handler: async ({ response }) => response.success({ ok: true }),
    }),
  },
});
```

---

## 14. Domain-Specific Guidance

### 14.1 High-Throughput APIs

- Avoid heavy work in action handlers; delegate to jobs.
- Use request validation schemas to fail fast.
- Prefer response.noContent() for write-only endpoints.

### 14.2 Multi-Tenant APIs

- Use context to inject tenant info.
- Use revalidate targets with scopes for tenant-scoped events.
- Keep query params stable to avoid client cache collisions.

### 14.3 Real-Time Data

- Use response.stream for SSE handshake (returns channel + endpoint info).
- Use ctx.realtime.publish/subscribe for Store-backed events.
- Use client hook useRealtime (scopes via provider).

### 14.4 Background Jobs

- Use createJobsRouter to group jobs by domain.
- Use adapter.createProxy for easy invocation.
- Prefer schema validation in job definitions.

### 14.5 API Documentation

- Configure docs in IgniterBuilder.docs (deprecated but still supported).
- Use playground route and security in production.

---

## 15. Best Practices vs Anti-Patterns

| Practice | Why | Example |
| --- | --- | --- |
| Do define schemas for request body/query | Ensures type safety and validation | `body: z.object({ id: z.string() })` |
| Do use response.success/created/noContent | Consistent response envelopes | `return response.created(data)` |
| Do use IgniterProvider for client cache | Supports SSE revalidation | `<IgniterProvider>` |
| Do use createIgniterClient in browser | Uses fetch, no server deps | `createIgniterClient({ router })` |
| Do use router.caller on server | Avoid HTTP for internal calls | `router.caller.users.list.query()` |
| Do not parse JSON manually in handlers | BodyParserProcessor already does | `request.body` is parsed |
| Do not use direct Response unless needed | ResponseProcessor ensures consistency | `return response.success(...)` |
| Do not mutate builder instances | Builder is immutable pattern | `Igniter.create().withContext().build()` |
| Do not import from src/ in other packages | Use public exports only | `@igniter-js/core` |

---

# III. TECHNICAL REFERENCE AND RESILIENCE

## 16. Exhaustive API Reference (Public Surface)

This is a condensed but complete list of public modules and major APIs.

### 16.1 Core Exports (from @igniter-js/core)

#### Error

- IgniterError
  - Fields: code, statusCode, details, metadata, causer, cause
  - Methods: toJSON()

#### Services

- IgniterBuilder
  - context, config, store, logger, jobs, telemetry, plugins, docs, create
- Igniter (instance of IgniterBuilder)
- createIgniterQuery
- createIgniterMutation
- createIgniterController
- createIgniterRouter
- IgniterRouterBuilder
- createRouterBuilder
- createIgniterProcedure
- createEnhancedProcedureBuilder
- createEnhancedProcedureFactories
- IgniterCookie
- IgniterConsoleLogger
- createConsoleLogger
- IgniterStoreRealtimeProcessor
- IgniterStoreCacheProcessor
- IgniterSSETransport
- createIgniterJobsService
- createJobDefinition
- createJobsRouter
- createJobsRegistry
- createJobsProxy
- IgniterPluginManager
- IgniterCoreStoreEvents (exported from @igniter-js/core/store)
- IgniterServer
- IgniterServerBunAdapter
- IgniterServerDenoAdapter
- IgniterServerNodeAdapter

#### Processors

- RequestProcessor
- RouteResolverProcessor
- BodyParserProcessor
- ContextBuilderProcessor
- MiddlewareExecutorProcessor
- ErrorHandlerProcessor
- IgniterResponseProcessor

#### Types

- Action and Router Types: IgniterAction, IgniterActionContext, IgniterRouter
- Context Types: IgniterBaseContext, ContextCallback, InferIgniterContext
- Client Types: QueryActionCaller, MutationActionCaller, RealtimeActionCaller
- Jobs Types: JobDefinition, JobsRouter, JobsRegistry, JobsProxy
- Plugin Types: IgniterPlugin, PluginActionsCollection, PluginSelfContext
- Logger Types: IgniterLogger, IgniterLogLevel
- Schema Types: StandardSchemaV1

#### Utils

- ClientCache
- parseURL
- parseResponse
- preserveUnion
- conditionalResponse
- resolveLogLevel
- createLoggerContext
- isServer / isClient
- isServerEnvironment / isClientEnvironment
- tryCatch
- getRequestIp
- parseDeviceFromUserAgent
- generateRequestId
- resolveGeo

### 16.2 Client Exports (from @igniter-js/core/client)

- IgniterProvider
- useIgniterQueryClient
- useRealtime
- createIgniterClient

### 16.3 Adapters (from @igniter-js/core/adapters)

- nextRouteHandlerAdapter
- withIgniter
- getHeadersSafe
- expressAdapter

### 16.4 Plugins (from @igniter-js/core/plugins)

- ensure (Ensure plugin)
- audit (Audit plugin)

---

## 17. Telemetry and Observability Registry

Core uses `@igniter-js/telemetry`. Events are defined in
`@igniter-js/core/telemetry` (namespace `igniter.core`) and emitted directly
from processors/services. Telemetry is optional and the core runtime does not
depend on the telemetry package unless the subpath is imported.

### 17.1 Event Groups (Summary)

- `http.request.*`
- `route.resolve.*`
- `body.parse.*`
- `context.build.*`, `context.enhance.*`
- `middleware.execute.*`
- `validation.*`
- `action.execute.*`
- `response.build.*`, `response.stream.created`
- `cache.set.*`, `cache.invalidate.*`, `cache.key.resolve_failed`
- `revalidate.*`
- `realtime.connection.*`, `realtime.subscribe.*`, `realtime.unsubscribe.*`
- `realtime.event.publish.*`, `realtime.event.deliver.success`
- `error.tracked`

For the full schema, see `packages/core/src/telemetry/index.ts`.

---

## 18. Troubleshooting and Error Code Library

Each error below maps to real code paths.

### BODY_PARSE_ERROR

- Context: BodyParserProcessor.parse failed to parse body.
- Cause: Invalid JSON or incompatible content type.
- Mitigation: Ensure Content-Type is correct and body matches schema.
- Solution:
  - Validate JSON payload format.
  - Use proper content-type header.

### REALTIME_NOT_CONFIGURED (HTTP 501)

- Context: RequestProcessor.process received SSE connection without realtime configured.
- Cause: Igniter builder was not provided a Store manager.
- Mitigation: Provide Igniter.store(...) and enable realtime processor.
- Solution:
  - Configure Igniter.store(store) before create().
  - Ensure store is built with IgniterCoreStoreEvents for revalidation.

### CONTROLLER_NOT_FOUND

- Context: RequestProcessor.call could not find controller.
- Cause: Controller key not registered in router.
- Mitigation: Ensure controller name matches router config.
- Solution:
  - Verify router.controllers keys.
  - Ensure correct controller name in caller.

### ACTION_NOT_FOUND

- Context: RequestProcessor.call could not find action.
- Cause: Action key not registered in controller.
- Mitigation: Verify action name and controller config.
- Solution:
  - Check controller.actions keys.

### VALIDATION_ERROR

- Context: ErrorHandlerProcessor handled Zod-like validation error.
- Cause: Schema validation failed.
- Mitigation: Validate body/query in clients.
- Solution:
  - Fix payload to match schema.

### INTERNAL_SERVER_ERROR

- Context: ErrorHandlerProcessor handled generic errors.
- Cause: Unhandled runtime exception.
- Mitigation: Add try/catch or validate inputs.
- Solution:
  - Review logs for stack trace.
  - Add error handling in action handler.

### INITIALIZATION_ERROR

- Context: ErrorHandlerProcessor.handleInitializationError.
- Cause: Context building or initialization failed.
- Mitigation: Validate context factory and dependencies.
- Solution:
  - Ensure context factory does not throw.
  - Check required plugins/adapters.

### GENERIC_ERROR

- Context: normalizeError fallback for unknown errors.
- Cause: Error object with missing code or message.
- Mitigation: Throw proper Error or IgniterError.
- Solution:
  - Wrap errors with IgniterError where appropriate.

### UNKNOWN_ERROR

- Context: normalizeError fallback when error is null/undefined.
- Cause: Missing error object.
- Mitigation: Ensure errors are thrown with context.
- Solution:
  - Add explicit error handling.

### ERR_BAD_REQUEST

- Context: IgniterResponseProcessor.badRequest.
- Cause: Client errors or validation failure.
- Mitigation: Validate inputs.
- Solution:
  - Return response.badRequest("message").

### ERR_UNAUTHORIZED

- Context: IgniterResponseProcessor.unauthorized.
- Cause: Missing or invalid auth.
- Mitigation: Use auth middleware.
- Solution:
  - Return response.unauthorized("message").

### ERR_FORBIDDEN

- Context: IgniterResponseProcessor.forbidden.
- Cause: Access denied.
- Mitigation: Check user permissions.
- Solution:
  - Return response.forbidden("message").

### ERR_NOT_FOUND

- Context: IgniterResponseProcessor.notFound.
- Cause: Resource missing.
- Mitigation: Check IDs and data.
- Solution:
  - Return response.notFound("message").

### ERR_REDIRECT

- Context: IgniterResponseProcessor.redirect.
- Cause: Intentional redirect response.
- Mitigation: Ensure redirect destinations are correct.
- Solution:
  - Return response.redirect("/target", "replace").

### SERIALIZATION_ERROR

- Context: IgniterResponseProcessor.safeStringify.
- Cause: JSON serialization error (circular references).
- Mitigation: Avoid circular data in responses.
- Solution:
  - Remove cycles from response data.

---

## 19. Testing Guidance

### 19.1 Recommended Test Commands

- Package tests:
  - npm test --filter @igniter-js/core
- Package build:
  - npm run build --filter @igniter-js/core
- Package typecheck:
  - npm run typecheck --filter @igniter-js/core

### 19.2 Test Coverage Areas

- Services: action, controller, cookie, jobs, logger, procedure, realtime.
- Processors: context-builder, response, middleware-executor, error-handler.
- Utils: response parsing and normalization.

---

## 20. Appendix: Environment Variables

- IGNITER_LOG_LEVEL
  - Used by resolveLogLevel for logging verbosity.
- IGNITER_APP_BASE_PATH
  - Default base path for RequestProcessor.
- IGNITER_APP_BASE_URL
  - Default base URL for RequestProcessor.call.
- DISABLE_ERROR_TRACKING
  - If true, ErrorHandlerProcessor skips trackError logging.

---

## 21. Appendix: Common Extension Points

- Add a new adapter:
  - Create file in src/adapters
  - Export from src/adapters/index.ts
  - Update tsup config entry if needed

- Add a new processor:
  - Create file in src/processors
  - Export from src/processors/index.ts
  - Wire into RequestProcessor if part of pipeline

- Add a new client hook:
  - Extend src/client/igniter.hooks.ts
  - Export from src/client/index.ts and index.browser.ts

---

## 22. End of Manual

This manual is intentionally comprehensive and maps directly to the current
code. Keep it updated when behavior changes.
