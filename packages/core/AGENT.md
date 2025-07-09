# AI Agent Maintenance Manual: `@igniter-js/core`

**Version:** 1.0.0
**For AI Agent:** You are an expert TypeScript software engineer. This document is your primary technical guide to the `@igniter-js/core` package. Read and understand it thoroughly before attempting any modifications. Your goal is to perform maintenance tasks accurately, respecting the architectural principles outlined here.

---

## 1. Package Overview

### 1.1. Package Name
`@igniter-js/core`

### 1.2. Purpose
This package is the heart of the Igniter.js framework. It contains all the essential, non-adapter-specific logic for building, configuring, and running a type-safe API. It provides the foundational building blocks, including the main builder, the request processing pipeline, all core TypeScript interfaces, and the client-side hooks. This package is a required dependency for any application built with Igniter.js.

---

## 2. Architecture & Key Concepts

Understanding the core architecture is critical for successful maintenance. The framework is built on several key principles and patterns.

### 2.1. The Builder Pattern: `IgniterBuilder`

The entire application is constructed using a fluent (chainable) builder API, starting with the `Igniter` object exported from `builder.service.ts`.

*   **Why it's used:** This pattern enforces a structured and guided setup process. It allows the framework to build up its type system dynamically. As you chain methods like `.store(redisAdapter)` or `.jobs(bullmqAdapter)`, the builder not only registers the functionality but also injects the corresponding types into the global `igniter` instance and the request `context`.
*   **The Flow:**
    1.  `Igniter.context<T>()`: **Always the first call.** It sets the base type for the application's global context.
    2.  `.logger()`, `.store()`, `.jobs()`, `.plugins()`: These methods attach modules and extend the framework's capabilities and types.
    3.  `.create()`: **Always the final call.** It consumes the entire configuration and returns a fully-typed, immutable `igniter` instance. This instance holds the factory functions (`.query()`, `.mutation()`, `.controller()`, etc.) that you use to build your API.

### 2.2. The Request Processing Lifecycle

When an HTTP `Request` arrives, it's processed through a pipeline of specialized "processors". Understanding this flow is essential for debugging and adding new features.

1.  **Entry Point (`RequestProcessor.process`)**: The `handler` method of your `AppRouter` calls `RequestProcessor.process(request)`. This is the orchestrator for the entire lifecycle.

2.  **Route Resolution (`RouteResolverProcessor`)**: The processor first matches the incoming request's method (`GET`, `POST`, etc.) and path (`/users/123`) to a specific `IgniterAction` that you defined in a controller. If no route is found, a `404 Not Found` response is returned immediately.

3.  **Context Building (`ContextBuilderProcessor`)**: Once a route is matched, the `ContextBuilderProcessor` creates the initial `ProcessedContext`. This involves:
    *   Parsing the request `URL` to extract query parameters.
    *   Parsing the request `body` based on the `Content-Type` header (`BodyParserProcessor`).
    *   Creating the base application context by calling your `createIgniterAppContext` function.
    *   Attaching core services (logger, store, etc.) and registered plugins to the context.

4.  **Middleware Execution (`MiddlewareExecutorProcessor`)**: This processor executes all `Procedures` (middleware) associated with the action in sequence. This is a critical step:
    *   Each procedure receives the current, up-to-date context.
    *   If a procedure returns an object, that object's properties are **deeply merged** into the context.
    *   This dynamically and safely extends the context, making new data (e.g., an authenticated `user` object) available to subsequent procedures and the final action handler.
    *   The type system tracks these changes, ensuring type safety throughout the chain.
    *   If a procedure returns a `Response` object, the request is "short-circuited," and the response is sent immediately.

5.  **Action Handler Execution**: The `handler` function of the matched `IgniterAction` is finally executed. It receives the fully-enriched `IgniterActionContext`, which contains the request details, the extended application context, response helpers, and plugin accessors.

6.  **Response Processing (`ResponseProcessor`)**: The value returned by your action handler is processed. If you return a plain object, it's converted into a standard JSON `Response`. If you use the `response` helpers (e.g., `response.success()`, `response.unauthorized()`), the `IgniterResponseProcessor` constructs the appropriate HTTP `Response` with the correct status code and headers.

7.  **Error Handling (`ErrorHandlerProcessor`)**: If an error is thrown at *any point* in this lifecycle, it is caught by the `ErrorHandlerProcessor`. This processor normalizes the error and converts it into a standardized JSON error `Response`, ensuring that clients always receive a consistent error format.

### 2.3. Dependency Injection via Context

The **Context** is the sole dependency injection (DI) mechanism in Igniter.js.
*   **Global Context**: Contains singleton services (like a database client) that are available application-wide.
*   **Request-Scoped Context**: The global context is cloned for each request and then dynamically extended by procedures. This is how request-specific data, like session information, is passed to your business logic without using global variables, ensuring proper isolation between requests.

---

## 3. File & Directory Map

This map outlines the purpose of each key file and directory within `packages/core/src`.

*   `src/index.ts`
    > **Purpose**: The public entry point of the `@igniter-js/core` package. It exports the primary `Igniter` builder, the `createIgniterPlugin` factories, and all essential types that developers need to interact with the framework.
    > **Maintenance**: When adding a new high-level exportable, add it here.

*   `src/services/`
    > **Purpose**: This directory contains the "factory" services. These are classes and functions responsible for **creating and configuring** the core components of the framework. You interact with these services to *build* your application.
    *   `builder.service.ts`: Contains the `IgniterBuilder` class. **This is the most important file in this directory.** It is the starting point of every application. Any new chainable method on the `Igniter` object (like a future `.cache()` method) would be added here.
    *   `action.service.ts`: Exports `createIgniterQuery` and `createIgniterMutation`. These factories produce the `IgniterAction` objects that define your API endpoints.
    *   `controller.service.ts`: Exports `createIgniterController`. A very simple factory that structures and groups a collection of actions under a common path.
    *   `procedure.service.ts`: Exports `createIgniterProcedure` and the enhanced builder/factories. This is where the logic for creating middleware resides.
    *   `router.service.ts`: Exports `createIgniterRouter`. This factory takes the final configuration (controllers, context, plugins) and produces the `AppRouter`, which is used by the `RequestProcessor`.
    *   `cookie.service.ts`: Contains the `IgniterCookie` class, a helper for parsing and serializing request/response cookies in a standardized way.
    *   `jobs.service.ts`: Defines the **structure** and **abstractions** for the Igniter.js Queues system (e.g., `JobsRegistry`, `JobsRouter`). The concrete implementation is provided by an adapter like `@igniter-js/adapter-bullmq`.
    *   `plugin.service.ts`: Contains the `IgniterPluginManager`. This is a sophisticated service that handles plugin registration, dependency resolution, lifecycle hook execution, and event bus management.
    *   `realtime.service.ts`: Implements the `IgniterRealtimeService`, providing the high-level API (`.publish()`, `.to()`, `.broadcast()`) for interacting with the SSE system.

*   `src/processors/`
    > **Purpose**: This directory contains the "worker" classes. These processors are internal to the framework and are responsible for **executing the steps of the request lifecycle**. You generally don't interact with these directly, but they are critical to how the framework operates.
    *   `request.processor.ts`: The primary orchestrator. Its `process` method takes an incoming `Request` and manages its flow through all other processors.
    *   `route-resolver.processor.ts`: Contains the logic to match a request's method and path against the registered routes.
    *   `context-builder.processor.ts`: Responsible for creating the `ProcessedContext` for a request.
    *   `middleware-executor.processor.ts`: Responsible for executing the `use` array of procedures for a given action.
    *   `body-parser.processor.ts`: A utility processor for parsing different `Content-Type` request bodies.
    *   `error-handler.processor.ts`: The centralized error handler for the entire request pipeline.
    *   `sse.processor.ts`: The low-level engine for managing Server-Sent Events (SSE) connections and channels. `IgniterRealtimeService` is a high-level API over this processor.
    *   `telemetry-manager.processor.ts`: Manages the creation and lifecycle of OpenTelemetry spans.

*   `src/types/`
    > **Purpose**: The "constitution" of the framework. This directory contains all core TypeScript `interface` and `type` definitions. **This is the most critical directory for understanding the framework's data structures.** Any change here has wide-ranging effects.
    *   `action.interface.ts`: Defines `IgniterAction`, `IgniterActionContext`, `IgniterQueryOptions`, `InferEndpoint`, etc. **This is arguably the most important type definition file.** It defines the shape of the `ctx` object passed to every handler.
    *   `client.interface.ts`: Defines all types related to the client-side hooks (`useQuery`, `useMutation`, `useRealtime`).
    *   `controller.interface.ts`: Defines `IgniterControllerConfig`.
    *   `procedure.interface.ts`: Defines `IgniterProcedure` and the types for the enhanced builder.
    *   `jobs.interface.ts`: Defines the canonical shapes for job queue adapters, routers, and job definitions (`IgniterJobQueueAdapter`, `JobsRouter`, `JobDefinition`).
    *   `store.interface.ts`: Defines the `IgniterStoreAdapter` interface, which is the contract for all store adapters (e.g., Redis).
    *   `plugin.interface.ts`: Defines the comprehensive `IgniterPlugin` interface and its related types.
    *   (and others...)

*   `src/client/`
    > **Purpose**: Contains code that is specifically intended for the client-side (frontend) portion of the Igniter.js ecosystem.
    *   `igniter.hooks.ts`: The React hook implementations for `useQuery`, `useMutation`, and `useRealtime`. This file is marked with `"use client";`.

*   `src/error/`
    > **Purpose**: Defines custom error classes for the framework.
    *   `index.ts`: Contains the `IgniterError` class, used for throwing structured, standardized errors within the framework.

*   `src/utils/`
    > **Purpose**: A collection of utility functions used throughout the core package, such as URL parsers and response helpers.

---

## 4. Common Maintenance Tasks (Instructions for AI Agent)

This section provides step-by-step guides for performing common maintenance and enhancement tasks on the `@igniter-js/core` package.

### Task 1: Add a New Option to `igniter.query()`
**Scenario:** We want to add a new top-level option to all query actions, for example, `cacheTTL: number`.

1.  **Objective:** Modify the `createIgniterQuery` factory to accept and process a new option.
2.  **Locate Type Definition:** Open `packages/core/src/types/action.interface.ts`.
3.  **Modify Interface:** Add the new optional property to the `IgniterQueryOptions` type definition.
    ```typescript
    // In IgniterQueryOptions
    export type IgniterQueryOptions<...> = {
      // ... existing options
      cacheTTL?: number; // Add the new option here
    };
    ```
4.  **Locate Implementation:** Open `packages/core/src/services/action.service.ts`.
5.  **Update Factory Function:** In the `createIgniterQuery` function, access the new option from the `options` object and include it in the returned action object.
    ```typescript
    // In createIgniterQuery
    return {
      ...options,
      method: 'GET' as const,
      cacheTTL: options.cacheTTL, // Pass the new option through
      $Infer: {} as TQueryInfer
    } as TQuery;
    ```
6.  **Update Processor:** The logic that *uses* this option would likely reside in the `RequestProcessor`. Open `packages/core/src/processors/request.processor.ts`. In the `executeAction` or `handleSuccessfulResponse` method, you would add logic like:
    ```typescript
    // In RequestProcessor
    if (action.cacheTTL) {
      // Logic to set cache headers on the response
      // e.g., response.headers.set('Cache-Control', `max-age=${action.cacheTTL}`);
    }
    ```
7.  **Write/Update Tests:** Navigate to `packages/core/src/services/__tests__/action.service.test.ts` and add a new test case to verify that the `cacheTTL` option is correctly passed through by the `createIgniterQuery` factory. If applicable, add tests to the `request.processor.test.ts` to verify the new caching behavior.

### Task 2: Add a New Lifecycle Hook to the Request Processor
**Scenario:** We need to add a `beforeRouteResolution` hook that runs before the router tries to find a matching action.

1.  **Objective:** Introduce a new hook into the main request processing pipeline.
2.  **Define Hook Type:** Open `packages/core/src/types/request.processor.ts` (or a more appropriate location like a new `hooks.interface.ts`). Define the function signature for the new hook.
    ```typescript
    // Example hook type definition
    export type BeforeRouteResolutionHook = (request: Request) => Promise<void> | void;
    ```
3.  **Update Router/Builder Configuration:** The hook needs to be configured. Decide where it should be passed. A logical place is in the main `igniter.router()` configuration. Open `packages/core/src/types/router.interface.ts` and add the hook to `IgniterRouterConfig`.
    ```typescript
    // In IgniterRouterConfig
    export interface IgniterRouterConfig<...> {
      // ... existing properties
      beforeRouteResolution?: BeforeRouteResolutionHook;
    }
    ```
4.  **Locate Execution Point:** Open `packages/core/src/processors/request.processor.ts`.
5.  **Implement Hook Execution:** Inside the `process` method, at the very beginning before the call to `RouteResolverProcessor.resolve`, add the logic to execute the hook if it exists on the config.
    ```typescript
    // In RequestProcessor.process
    public async process(request: Request): Promise<Response> {
      // ...
      try {
        // Execute the new hook here
        if (this.config.beforeRouteResolution) {
          await this.config.beforeRouteResolution(request);
        }

        // Step 1: Resolve route (existing logic)
        const routeResult = RouteResolverProcessor.resolve(...);
        // ... rest of the method
    ```
6.  **Write/Update Tests:** Add or modify tests in `packages/core/src/processors/__tests__/request.processor.test.ts` to verify that the hook is called correctly and at the right time. Use `vi.fn()` to mock the hook and assert that it has been called.

### Task 3: Modify the `IgniterCookie` Service
**Scenario:** We need to add a new method, `.toJSON()`, to the `IgniterCookie` class that returns all cookies as a plain object.

1.  **Objective:** Add a new public method to the `IgniterCookie` service.
2.  **Locate Service:** Open `packages/core/src/services/cookie.service.ts`.
3.  **Add New Method:** Add the `toJSON` method to the `IgniterCookie` class.
    ```typescript
    // In IgniterCookie class
    /**
     * Returns all cookies as a plain JavaScript object.
     */
    public toJSON(): Record<string, string> {
      return Object.fromEntries(this.cookies.entries());
    }
    ```
4.  **Write/Update Tests:** Open `packages/core/src/services/__tests__/cookie.service.test.ts`. Add a new `describe` block or `it` block to specifically test the `.toJSON()` method.
    ```typescript
    // In cookie.service.test.ts
    it('should return all cookies as a plain object with toJSON', () => {
      cookies.set('user', 'john');
      cookies.set('theme', 'dark');
      const json = cookies.toJSON();
      expect(json).toEqual({ user: 'john', theme: 'dark' });
    });
    ```
5.  **Final Verification:** Run the entire test suite for the `core` package to ensure your change has not introduced any regressions.
