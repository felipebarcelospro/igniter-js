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
    > **Purpose**: A collection of utility functions used throughout the core package, such as URL parsers, response helpers, and logging utilities.
    *   `logger.ts`: Contains centralized logging utilities (`resolveLogLevel`, `createLoggerContext`) that provide consistent logging behavior across all processors and services. These utilities handle environment variable resolution (`IGNITER_LOG_LEVEL`) with proper fallbacks and context creation for structured logging.

*   `src/adapters/`
    > **Purpose**: Contains built-in adapter implementations that don't require external dependencies.
    *   `telemetry.console.ts`: The default console-based telemetry adapter that implements `IgniterTelemetryProvider`. Uses the centralized logging system for consistent output formatting.

---

## 4. Logging System Architecture

### 4.1. Centralized Logging Philosophy

The Igniter.js core implements a centralized logging system designed for consistency, maintainability, and AI-friendly debugging. All logging throughout the framework follows these principles:

*   **Single Source of Truth**: All logging configuration is controlled by the `IGNITER_LOG_LEVEL` environment variable
*   **Consistent Context**: Every log message includes structured context (component name, request ID when available)
*   **Appropriate Levels**: Log levels are used consistently across all components (ERROR for failures, WARN for recoverable issues, INFO for important events, DEBUG for detailed tracing)
*   **No Console Pollution**: Direct `console.*` calls are avoided in favor of the centralized logger

### 4.2. Core Logging Utilities (`src/utils/logger.ts`)

#### `resolveLogLevel(): IgniterLogLevel`
Resolves the logging level from environment variables with proper fallbacks:
- Reads `IGNITER_LOG_LEVEL` environment variable
- Validates and normalizes the value
- Falls back to `WARN` level if invalid or missing
- Handles case-insensitive input ("debug", "DEBUG", "Debug")

#### `createLoggerContext(component: string, additionalContext?: Record<string, any>): Record<string, any>`
Creates structured logging context for consistent message formatting:
- Always includes the component name for easy filtering
- Optionally includes additional context (requestId, route, etc.)
- Returns a context object that can be passed to `IgniterConsoleLogger`

### 4.3. Logging Standards by Component Type

#### Services (`src/services/`)
Services use logging primarily for:
- **ERROR**: Configuration failures, plugin loading errors, critical service failures
- **WARN**: Deprecated usage, fallback behaviors, non-critical issues
- **INFO**: Service initialization, important state changes
- **DEBUG**: Detailed configuration, plugin registration, internal state

**Example Pattern:**
```typescript
const logger = new IgniterConsoleLogger(
  resolveLogLevel(),
  createLoggerContext('PluginManager')
);

logger.info('[PluginManager] Initialized with 5 plugins');
logger.debug('[PluginManager] Registered plugin: authentication');
```

#### Processors (`src/processors/`)
Processors handle request lifecycle and use logging for:
- **ERROR**: Request processing failures, unhandled exceptions
- **WARN**: Invalid requests, fallback behaviors, recoverable errors
- **INFO**: Rarely used (only for significant events like server startup)
- **DEBUG**: Request flow, middleware execution, route resolution
- **TRACE**: Detailed request/response data, performance metrics

**Example Pattern:**
```typescript
const logger = new IgniterConsoleLogger(
  resolveLogLevel(),
  createLoggerContext('RouteResolver', { requestId: context.requestId })
);

logger.debug('[RouteResolver] Resolving route for GET /api/users');
logger.error('[RouteResolver] No route found for GET /invalid-path');
```

### 4.4. Logging Maintenance Guidelines

#### When Adding New Components:
1. **Always use centralized utilities**: Import `resolveLogLevel` and `createLoggerContext` from `../utils/logger`
2. **Create component-specific context**: Use a descriptive component name (e.g., 'MiddlewareExecutor', 'BodyParser')
3. **Include request context when available**: Add `requestId`, `route`, or other relevant context
4. **Follow message formatting**: Use `[ComponentName]` prefix for easy filtering

#### When Refactoring Existing Code:
1. **Replace console.* calls**: Convert all direct console usage to logger calls
2. **Standardize log levels**: Review and adjust log levels according to the guidelines above
3. **Add structured context**: Ensure all log messages include relevant context
4. **Remove conditional logging**: Let the centralized system handle level filtering

#### Common Anti-Patterns to Avoid:
- ❌ `if (config.debug) console.log(...)` - Use `logger.debug()` instead
- ❌ `console.error('Error:', error)` - Use `logger.error('[Component] Description', error)` instead
- ❌ Mixing `NODE_ENV` with logging levels - Use only `IGNITER_LOG_LEVEL`
- ❌ Inconsistent message formatting - Always use `[ComponentName]` prefix

---

## 5. Processors & Services Deep Dive

### 5.1. Request Processing Pipeline Architecture

The request processing pipeline is the heart of Igniter.js. Understanding the flow and responsibilities of each processor is crucial for maintenance and debugging.

#### Pipeline Flow:
```
HTTP Request → RequestProcessor → RouteResolverProcessor → ContextBuilderProcessor → MiddlewareExecutorProcessor → Action Handler → ResponseProcessor → HTTP Response
                     ↓ (on error at any step)
                ErrorHandlerProcessor → Error Response
```

#### Processor Responsibilities:

**RequestProcessor** (`src/processors/request.processor.ts`):
- **Primary Role**: Orchestrates the entire request lifecycle
- **Logging**: Uses `[RequestProcessor]` context with requestId
- **Key Methods**: `process(request)` - main entry point
- **Error Handling**: Catches all errors and delegates to ErrorHandlerProcessor
- **Maintenance Notes**: This is the central coordinator; changes here affect the entire pipeline

**RouteResolverProcessor** (`src/processors/route-resolver.processor.ts`):
- **Primary Role**: Matches incoming requests to registered actions
- **Logging**: Uses `[RouteResolver]` context with requestId and route info
- **Key Methods**: `resolve(method, pathname, routes)` - returns matched action or null
- **Performance**: Critical for request latency; route matching algorithm should be optimized
- **Maintenance Notes**: When adding new route features (wildcards, parameters), modify this processor

**ContextBuilderProcessor** (`src/processors/context-builder.processor.ts`):
- **Primary Role**: Creates the initial ProcessedContext for the request
- **Logging**: Uses `[ContextBuilder]` context with requestId
- **Key Responsibilities**: URL parsing, body parsing delegation, context initialization
- **Integration Points**: Calls BodyParserProcessor, integrates with plugin system
- **Maintenance Notes**: Context shape changes require updates here

**MiddlewareExecutorProcessor** (`src/processors/middleware-executor.processor.ts`):
- **Primary Role**: Executes procedure chains (middleware) in sequence
- **Logging**: Uses `[MiddlewareExecutor]` context with requestId and procedure info
- **Key Features**: Context merging, short-circuiting on Response returns
- **Type Safety**: Maintains type safety through procedure chain execution
- **Maintenance Notes**: Critical for procedure system; changes affect all middleware

**BodyParserProcessor** (`src/processors/body-parser.processor.ts`):
- **Primary Role**: Parses request bodies based on Content-Type
- **Logging**: Uses `[BodyParser]` context with requestId and content type
- **Supported Types**: JSON, form-urlencoded, multipart/form-data, text, buffer
- **Error Handling**: Graceful handling of malformed bodies
- **Maintenance Notes**: Add new content type support here

**ResponseProcessor** (`src/processors/response.processor.ts`):
- **Primary Role**: Converts action handler returns into HTTP Responses
- **Logging**: Uses `[ResponseProcessor]` context with requestId
- **Key Features**: JSON serialization, response helper integration, header management
- **Maintenance Notes**: Response format changes require updates here

**ErrorHandlerProcessor** (`src/processors/error-handler.processor.ts`):
- **Primary Role**: Normalizes all errors into consistent JSON responses
- **Logging**: Uses `[ErrorHandler]` context with requestId and error details
- **Error Types**: Handles IgniterError, validation errors, generic errors
- **Security**: Sanitizes error messages in production
- **Maintenance Notes**: Error format standardization happens here

**SSEProcessor** (`src/processors/sse.processor.ts`):
- **Primary Role**: Manages Server-Sent Events connections and channels
- **Logging**: Uses `[SSEProcessor]` context with connection and channel info
- **Key Features**: Connection management, channel subscriptions, message broadcasting
- **Integration**: Works with RealtimeService for high-level API
- **Maintenance Notes**: Real-time feature changes require updates here

**TelemetryManagerProcessor** (`src/processors/telemetry-manager.processor.ts`):
- **Primary Role**: Manages OpenTelemetry spans for request tracing
- **Logging**: Uses `[TelemetryManager]` context with span and trace info
- **Integration**: Works with telemetry adapters (OpenTelemetry, Console)
- **Performance**: Minimal overhead when telemetry is disabled
- **Maintenance Notes**: Tracing feature additions require updates here

### 5.2. Services Architecture

Services in Igniter.js are factory functions and classes that create and configure framework components. They are the "builder" layer that developers interact with.

#### Service Categories:

**Core Builder Services**:
- `builder.service.ts`: The main IgniterBuilder class with fluent API
- `action.service.ts`: Creates queries and mutations (API endpoints)
- `controller.service.ts`: Groups actions under common paths
- `procedure.service.ts`: Creates middleware/procedures
- `router.service.ts`: Assembles the final application router

**Runtime Services**:
- `plugin.service.ts`: Manages plugin lifecycle and event system
- `realtime.service.ts`: High-level API for Server-Sent Events
- `jobs.service.ts`: Job queue abstractions and registry
- `cookie.service.ts`: Cookie parsing and serialization utilities

#### Service Logging Patterns:

**Initialization Logging**:
```typescript
// Services log their initialization and configuration
logger.info('[PluginManager] Initialized with 3 plugins');
logger.debug('[PluginManager] Plugin load order: [auth, validation, cache]');
```

**Operation Logging**:
```typescript
// Services log significant operations
logger.debug('[PluginManager] Executing beforeRequest hooks');
logger.warn('[PluginManager] Plugin "deprecated-plugin" is deprecated');
```

**Error Logging**:
```typescript
// Services log errors with context
logger.error('[PluginManager] Failed to load plugin "broken-plugin"', error);
```

### 5.3. Integration Points

Understanding how processors and services interact is crucial for maintenance:

**RequestProcessor ↔ All Processors**: RequestProcessor orchestrates all other processors
**ContextBuilderProcessor ↔ PluginService**: Context building integrates plugin-provided context
**MiddlewareExecutorProcessor ↔ ProcedureService**: Middleware execution uses procedure definitions
**SSEProcessor ↔ RealtimeService**: SSE processor provides low-level API for high-level service
**TelemetryManagerProcessor ↔ Telemetry Adapters**: Processor delegates to configured adapters

---

## 6. Debugging & Troubleshooting Guide

### 6.1. Logging System Debugging

The centralized logging system provides powerful debugging capabilities when properly configured.

#### Environment Variables for Debugging:
```bash
# Enable debug logging for all components
IGNITER_LOG_LEVEL=DEBUG

# Enable trace logging for maximum verbosity
IGNITER_LOG_LEVEL=TRACE

# Enable debug logging only for specific components (if implemented)
IGNITER_LOG_LEVEL=DEBUG
IGNITER_DEBUG_COMPONENTS=RequestProcessor,RouteResolver
```

#### Common Debugging Scenarios:

**Request Pipeline Issues**:
1. Set `IGNITER_LOG_LEVEL=DEBUG` to see request flow
2. Look for `[RequestProcessor]` logs to trace request lifecycle
3. Check `[RouteResolver]` logs for routing issues
4. Monitor `[ContextBuilder]` logs for context creation problems

**Performance Issues**:
1. Set `IGNITER_LOG_LEVEL=TRACE` for detailed timing information
2. Look for `[TelemetryManager]` logs if telemetry is enabled
3. Check processor execution times in logs
4. Monitor memory usage patterns in service initialization logs

**Plugin System Issues**:
1. Enable debug logging: `IGNITER_LOG_LEVEL=DEBUG`
2. Check `[PluginManager]` logs for plugin loading order
3. Look for plugin hook execution logs
4. Monitor plugin error logs for failures

### 6.2. Request Flow Debugging

When debugging request processing issues, follow this systematic approach:

#### Step 1: Identify the Failure Point
```typescript
// Look for these log patterns to identify where requests fail:

// Request received
"[RequestProcessor] Processing request: GET /api/users"

// Route resolution
"[RouteResolver] Matched route: GET /api/users -> getUsersAction"
"[RouteResolver] No route matched for: GET /unknown"

// Context building
"[ContextBuilder] Built context for request"
"[BodyParser] Parsing JSON body (1.2KB)"

// Middleware execution
"[MiddlewareExecutor] Executing procedure chain: [auth, validation]"
"[MiddlewareExecutor] Procedure 'auth' returned early response"

// Response processing
"[ResponseProcessor] Serializing response (application/json)"

// Error handling
"[ErrorHandler] Handling IgniterError: Validation failed"
```

#### Step 2: Analyze Context and State
```typescript
// Enable context logging in processors:
logger.debug('[ProcessorName] Context state:', {
  requestId: context.requestId,
  route: context.route,
  user: context.user?.id,
  // Add relevant context fields
});
```

#### Step 3: Check Integration Points
- Verify plugin hooks are executing correctly
- Check middleware chain execution order
- Validate context merging between processors
- Ensure telemetry spans are properly created/closed

### 6.3. Common Error Patterns

#### Type Safety Issues:
```typescript
// Symptom: TypeScript compilation errors in action handlers
// Cause: Context type mismatches between processors
// Solution: Check ContextBuilderProcessor and middleware type definitions

// Look for logs like:
"[ContextBuilder] Warning: Context type mismatch detected"
```

#### Performance Degradation:
```typescript
// Symptom: Slow request processing
// Causes: 
// 1. Inefficient route matching
// 2. Heavy middleware chains
// 3. Synchronous operations in async context

// Look for logs like:
"[RouteResolver] Route resolution took 150ms (threshold: 10ms)"
"[MiddlewareExecutor] Procedure chain execution took 500ms"
```

#### Memory Leaks:
```typescript
// Symptom: Increasing memory usage over time
// Causes:
// 1. Unclosed SSE connections
// 2. Plugin event listeners not cleaned up
// 3. Telemetry spans not properly closed

// Look for logs like:
"[SSEProcessor] Warning: 1000+ active connections detected"
"[PluginManager] Warning: Event listener count growing"
"[TelemetryManager] Warning: Unclosed spans detected"
```

### 6.4. Testing and Validation

#### Unit Testing Processors:
```typescript
// When adding new processors or modifying existing ones:
// 1. Test processor in isolation
// 2. Mock dependencies (other processors, services)
// 3. Test error conditions
// 4. Validate logging output

// Example test structure:
describe('RequestProcessor', () => {
  it('should log request processing start', async () => {
    const mockLogger = createMockLogger();
    const processor = new RequestProcessor(mockLogger);
    
    await processor.process(mockRequest);
    
    expect(mockLogger.info).toHaveBeenCalledWith(
      '[RequestProcessor] Processing request: GET /api/test'
    );
  });
});
```

#### Integration Testing:
```typescript
// Test processor interactions:
// 1. Full request pipeline tests
// 2. Error propagation tests
// 3. Context passing tests
// 4. Plugin integration tests

// Use IGNITER_LOG_LEVEL=DEBUG in tests to verify logging
process.env.IGNITER_LOG_LEVEL = 'DEBUG';
```

---

## 7. Development Best Practices & Code Patterns

### 7.1. Code Organization Patterns

#### File Naming Conventions:
```
Processors: *.processor.ts (e.g., request.processor.ts)
Services: *.service.ts (e.g., plugin.service.ts)
Utilities: *.utils.ts (e.g., logger.utils.ts)
Types: *.types.ts (e.g., context.types.ts)
Interfaces: *.interface.ts (e.g., adapter.interface.ts)
Constants: *.constants.ts (e.g., http.constants.ts)
```

#### Directory Structure Patterns:
```
src/
├── processors/          # Request pipeline processors
├── services/           # Builder and runtime services
├── utils/              # Shared utilities and helpers
├── types/              # Type definitions and interfaces
├── error/              # Error classes and handling
├── client/             # Client-side utilities
└── index.ts            # Public API exports
```

### 7.2. Processor Implementation Patterns

#### Standard Processor Structure:
```typescript
import { IgniterConsoleLogger } from '../utils/logger';
import { resolveLogLevel, createLoggerContext } from '../utils/logger';

export class ExampleProcessor {
  private readonly logger: IgniterConsoleLogger;

  constructor() {
    this.logger = new IgniterConsoleLogger(
      resolveLogLevel(),
      createLoggerContext('ExampleProcessor')
    );
  }

  async process(input: InputType): Promise<OutputType> {
    const requestId = input.requestId || 'unknown';
    
    this.logger.debug(`[ExampleProcessor] Starting processing for request ${requestId}`);
    
    try {
      // Main processing logic
      const result = await this.performProcessing(input);
      
      this.logger.debug(`[ExampleProcessor] Processing completed for request ${requestId}`);
      return result;
    } catch (error) {
      this.logger.error(`[ExampleProcessor] Processing failed for request ${requestId}`, error);
      throw error;
    }
  }

  private async performProcessing(input: InputType): Promise<OutputType> {
    // Implementation details
  }
}
```

#### Key Patterns:
1. **Consistent Logging**: Always use centralized logger with proper context
2. **Error Handling**: Catch, log, and re-throw errors with context
3. **Request ID Tracking**: Include requestId in all log messages
4. **Private Methods**: Separate public interface from implementation details
5. **Type Safety**: Strong typing for inputs and outputs

### 7.3. Service Implementation Patterns

#### Builder Service Pattern:
```typescript
export class ExampleService {
  private readonly logger: IgniterConsoleLogger;
  private readonly config: ExampleConfig;

  constructor(config: ExampleConfig) {
    this.config = config;
    this.logger = new IgniterConsoleLogger(
      resolveLogLevel(),
      createLoggerContext('ExampleService')
    );
    
    this.logger.info(`[ExampleService] Initialized with config`);
    this.logger.debug(`[ExampleService] Config details:`, config);
  }

  // Fluent API methods
  public withOption(option: OptionType): this {
    this.logger.debug(`[ExampleService] Adding option: ${option}`);
    // Implementation
    return this;
  }

  // Factory methods
  public create(): CreatedType {
    this.logger.debug(`[ExampleService] Creating instance`);
    // Implementation
  }
}
```

### 7.4. Error Handling Patterns

#### Custom Error Classes:
```typescript
export class IgniterProcessorError extends IgniterError {
  constructor(
    message: string,
    public readonly processor: string,
    public readonly requestId?: string,
    cause?: Error
  ) {
    super(message, 'PROCESSOR_ERROR', 500, cause);
    this.name = 'IgniterProcessorError';
  }
}
```

#### Error Logging Pattern:
```typescript
try {
  // Operation that might fail
} catch (error) {
  const processorError = new IgniterProcessorError(
    'Failed to process request',
    'ExampleProcessor',
    requestId,
    error
  );
  
  this.logger.error(
    `[ExampleProcessor] Processing failed for request ${requestId}`,
    processorError
  );
  
  throw processorError;
}
```

### 7.5. Type Safety Patterns

#### Context Type Extensions:
```typescript
// When extending context in processors
export interface ExtendedContext extends ProcessedContext {
  readonly customField: string;
  readonly computedValue: number;
}

// Type-safe context merging
function extendContext<T extends ProcessedContext>(
  context: T,
  extensions: Partial<ExtendedContext>
): T & ExtendedContext {
  return { ...context, ...extensions } as T & ExtendedContext;
}
```

#### Generic Processor Pattern:
```typescript
export abstract class BaseProcessor<TInput, TOutput> {
  protected abstract processInternal(input: TInput): Promise<TOutput>;
  
  async process(input: TInput): Promise<TOutput> {
    // Common logging and error handling
    return this.processInternal(input);
  }
}
```

### 7.6. Testing Patterns

#### Processor Testing:
```typescript
describe('ExampleProcessor', () => {
  let processor: ExampleProcessor;
  let mockLogger: jest.Mocked<IgniterConsoleLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    processor = new ExampleProcessor();
    // Inject mock logger if needed
  });

  it('should process input successfully', async () => {
    const input = createMockInput();
    const result = await processor.process(input);
    
    expect(result).toBeDefined();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('[ExampleProcessor] Starting processing')
    );
  });

  it('should handle errors gracefully', async () => {
    const input = createInvalidInput();
    
    await expect(processor.process(input)).rejects.toThrow();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

### 7.7. Performance Patterns

#### Lazy Initialization:
```typescript
export class ExampleService {
  private _expensiveResource?: ExpensiveResource;
  
  private get expensiveResource(): ExpensiveResource {
    if (!this._expensiveResource) {
      this.logger.debug('[ExampleService] Initializing expensive resource');
      this._expensiveResource = new ExpensiveResource();
    }
    return this._expensiveResource;
  }
}
```

#### Caching Pattern:
```typescript
export class ExampleProcessor {
  private readonly cache = new Map<string, CachedResult>();
  
  async process(input: InputType): Promise<OutputType> {
    const cacheKey = this.generateCacheKey(input);
    
    if (this.cache.has(cacheKey)) {
      this.logger.debug(`[ExampleProcessor] Cache hit for key: ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }
    
    const result = await this.performProcessing(input);
    this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

---

## 8. Lessons Learned & Framework Evolution Insights

### 8.1. Logging System Refactoring Insights (2024)

During the comprehensive logging system refactoring, several key insights were gained about the framework's architecture and maintenance patterns:

#### Key Discoveries:

**1. Centralized Logging Benefits:**
- **Consistency**: Unified logging approach across all processors and services
- **Configurability**: Single environment variable (`IGNITER_LOG_LEVEL`) controls entire system
- **Debugging**: Easier to trace request flows and identify issues
- **Performance**: Controlled log levels prevent verbose logging in production

**2. Processor Architecture Strengths:**
- **Modularity**: Each processor has a single, well-defined responsibility
- **Composability**: Processors can be easily added, removed, or reordered
- **Testability**: Individual processors can be tested in isolation
- **Type Safety**: Strong typing maintained throughout the pipeline

**3. Service Layer Patterns:**
- **Builder Pattern**: Fluent APIs provide excellent developer experience
- **Factory Functions**: Clean separation between configuration and runtime
- **Plugin System**: Event-driven architecture enables extensibility
- **Context Management**: Centralized context building ensures consistency

#### Anti-Patterns Identified and Resolved:

**1. Inconsistent Logging:**
```typescript
// BEFORE (Anti-pattern)
console.log('Processing request'); // No context, wrong level
if (config.debug) logger.debug('Debug info'); // Conditional logging

// AFTER (Best practice)
logger.info('[RequestProcessor] Processing request for requestId: 123');
logger.debug('[RequestProcessor] Request details:', requestData);
```

**2. Environment Variable Fragmentation:**
```typescript
// BEFORE (Anti-pattern)
const logLevel = process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO';
const enableDebug = process.env.ENABLE_DEBUG === 'true';

// AFTER (Best practice)
const logLevel = resolveLogLevel(); // Centralized resolution
const logger = new IgniterConsoleLogger(logLevel, createLoggerContext('Component'));
```

**3. Context Inconsistency:**
```typescript
// BEFORE (Anti-pattern)
logger.debug('Route matched'); // No context about which route

// AFTER (Best practice)
logger.debug('[RouteResolver] Matched route: GET /api/users -> getUsersAction');
```

### 8.2. Framework Evolution Patterns

#### Successful Refactoring Strategies:

**1. Incremental Changes:**
- Start with utility functions (`resolveLogLevel`, `createLoggerContext`)
- Update processors one by one
- Maintain backward compatibility during transition
- Test each change thoroughly before proceeding

**2. Centralization Before Optimization:**
- First, centralize all logging to use the same system
- Then, optimize log levels and messages
- Finally, add advanced features (filtering, formatting)

**3. Documentation-Driven Development:**
- Update `AGENTS.md` with new patterns as they emerge
- Document anti-patterns to prevent regression
- Provide clear examples for future contributors

#### Future Evolution Considerations:

**1. Telemetry Integration:**
```typescript
// Future enhancement: Structured logging with telemetry
logger.info('[RequestProcessor] Processing request', {
  requestId,
  traceId: telemetry.getTraceId(),
  spanId: telemetry.getSpanId(),
  duration: performance.now() - startTime
});
```

**2. Log Aggregation:**
```typescript
// Future enhancement: Log aggregation support
logger.info('[RequestProcessor] Processing request', {
  '@timestamp': new Date().toISOString(),
  '@level': 'info',
  '@component': 'RequestProcessor',
  '@requestId': requestId,
  message: 'Processing request'
});
```

**3. Performance Monitoring:**
```typescript
// Future enhancement: Built-in performance monitoring
const timer = logger.startTimer('[RequestProcessor] Request processing');
// ... processing logic ...
timer.end(); // Automatically logs duration
```

### 8.3. Maintenance Guidelines for Future AI Agents

#### When Adding New Processors:

1. **Follow the Standard Pattern:**
   - Use centralized logger with `resolveLogLevel()` and `createLoggerContext()`
   - Include requestId in all log messages
   - Use consistent error handling and logging
   - Add comprehensive tests

2. **Integration Checklist:**
   - [ ] Logger initialized with proper context
   - [ ] Error handling follows established patterns
   - [ ] Log messages include relevant context
   - [ ] Tests cover logging behavior
   - [ ] Documentation updated in `AGENTS.md`

3. **Performance Considerations:**
   - Use appropriate log levels (DEBUG for detailed info, INFO for significant events)
   - Avoid logging large objects at INFO level
   - Consider lazy evaluation for expensive log message generation

#### When Modifying Existing Code:

1. **Logging Consistency Check:**
   - Ensure all log messages follow the `[ComponentName]` prefix pattern
   - Verify log levels are appropriate for the message content
   - Check that error logging includes sufficient context

2. **Backward Compatibility:**
   - Maintain existing public APIs
   - Deprecate old patterns gradually
   - Provide migration guides for breaking changes

3. **Testing Requirements:**
   - Update tests to verify logging behavior
   - Test error conditions and their logging
   - Ensure log level changes don't break functionality

### 8.4. Framework Health Indicators

#### Positive Indicators:
- Consistent logging patterns across all components
- Clear separation of concerns between processors
- Strong type safety maintained throughout
- Comprehensive test coverage
- Clear documentation and examples

#### Warning Signs:
- Inconsistent logging patterns emerging
- Direct `console.*` usage in new code
- Processors taking on multiple responsibilities
- Type safety being compromised for convenience
- Lack of tests for new features

#### Critical Issues:
- Breaking changes without migration path
- Performance regressions in core processors
- Security vulnerabilities in error handling
- Memory leaks in long-running processes
- Loss of type safety in public APIs

---

## 9. Common Maintenance Tasks (Instructions for AI Agent)

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

### Task 4: Adding New Logging Capabilities

When extending the centralized logging system with new features:

**Steps:**
1. **Extend Core Utilities:** Modify `src/utils/logger.ts` to add new functionality
2. **Update Logger Interface:** Extend `IgniterConsoleLogger` if needed
3. **Maintain Backward Compatibility:** Ensure existing logging calls continue to work
4. **Update All Components:** Apply new logging patterns consistently across processors and services
5. **Add Tests:** Test new logging functionality and edge cases
6. **Update Documentation:** Document new logging capabilities and usage patterns

**Example - Adding Structured Logging:**
```typescript
// In logger.ts
export function createStructuredLogger(component: string, metadata?: Record<string, any>) {
  const baseContext = createLoggerContext(component);
  return new IgniterConsoleLogger(resolveLogLevel(), {
    ...baseContext,
    ...metadata
  });
}

// Usage in processors
const logger = createStructuredLogger('RequestProcessor', {
  version: '1.0.0',
  environment: process.env.NODE_ENV
});
```

### Task 5: Refactoring Legacy Code

When updating older code to follow current patterns:

**Steps:**
1. **Identify Anti-Patterns:** Look for direct `console.*` usage, inconsistent error handling, or fragmented configuration
2. **Plan Migration:** Create a step-by-step plan to update the code incrementally
3. **Update Dependencies:** Ensure the code uses centralized utilities (`resolveLogLevel`, `createLoggerContext`)
4. **Standardize Patterns:** Apply consistent logging, error handling, and type safety patterns
5. **Test Thoroughly:** Verify that refactored code maintains the same functionality
6. **Update Documentation:** Reflect changes in `AGENTS.md` and inline comments

**Refactoring Checklist:**
- [ ] Replace `console.*` with centralized logger
- [ ] Use `resolveLogLevel()` for log level configuration
- [ ] Apply consistent error handling patterns
- [ ] Add proper TypeScript types
- [ ] Include comprehensive tests
- [ ] Update documentation

---

## 10. Continuous Evolution & Future Roadmap

### 10.1. Framework Maturity Indicators

The Igniter.js framework has evolved significantly, particularly in its logging and architecture patterns. Key maturity indicators include:

**Technical Maturity:**
- Centralized, configurable logging system
- Consistent processor architecture
- Strong type safety throughout
- Comprehensive error handling
- Modular, testable components

**Developer Experience Maturity:**
- Clear documentation and examples
- Consistent API patterns
- Helpful error messages
- Easy debugging and troubleshooting
- AI-friendly architecture and documentation

**Operational Maturity:**
- Production-ready logging levels
- Performance monitoring capabilities
- Telemetry integration
- Scalable architecture patterns
- Maintainable codebase

### 10.2. Next Evolution Steps

**Short-term (Next Release):**
1. Complete logging system documentation and guidelines
2. Add comprehensive tests for logging behavior
3. Implement structured logging support
4. Add performance monitoring utilities

**Medium-term (Next 2-3 Releases):**
1. Enhanced telemetry integration with logging
2. Log aggregation and analysis tools
3. Advanced debugging utilities
4. Performance optimization based on logging insights

**Long-term (Future Versions):**
1. AI-powered log analysis and insights
2. Automatic performance optimization
3. Self-healing capabilities based on error patterns
4. Advanced monitoring and alerting systems

### 10.3. Knowledge Preservation

This `AGENTS.md` document serves as a living knowledge base that should be continuously updated as the framework evolves. Key principles for maintaining this knowledge:

**Documentation Principles:**
- Document patterns as they emerge
- Record anti-patterns and their solutions
- Provide concrete examples for all concepts
- Maintain historical context for major changes
- Keep examples up-to-date with current patterns

**Knowledge Transfer:**
- Each major refactoring should update this document
- New patterns should be documented immediately
- Legacy patterns should be marked as deprecated
- Migration guides should be provided for breaking changes
- Examples should reflect current best practices

**Continuous Improvement:**
- Regular reviews of documentation accuracy
- Updates based on real-world usage patterns
- Integration of community feedback
- Alignment with framework evolution
- Maintenance of AI-friendly structure and language

### 10.4. Final Notes for Future AI Agents

This comprehensive refactoring of the logging system demonstrates the framework's commitment to:

1. **Consistency**: Unified patterns across all components
2. **Maintainability**: Clear, documented, and testable code
3. **Developer Experience**: Easy to understand and use APIs
4. **AI Friendliness**: Well-documented, predictable patterns
5. **Evolution**: Ability to adapt and improve over time

When working with this codebase, remember that every change should enhance these qualities. The patterns established here should serve as a foundation for future development, ensuring that the framework continues to provide an excellent developer experience while maintaining its technical excellence.

**Remember**: The goal is not just to write code that works, but to write code that is maintainable, understandable, and enhances the overall developer experience. This documentation is your guide to achieving that goal.
