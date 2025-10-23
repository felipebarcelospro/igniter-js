# @igniter-js/adapter-mcp-server

## 0.3.0 (Unreleased)

### Major Changes

- **API Refactoring for Improved Type Safety and Developer Experience**

  The API has been refactored to provide better type inference and a cleaner developer experience.

  #### Breaking Changes

  1. **New Function Signature**: Changed from `createMcpAdapter(router, options)` to `createMcpAdapter(options)` where `router` is now a required property in the options object.

  2. **Automatic Context Inference**: The `context` function option has been removed. Context is now automatically inferred from the router's built-in context, eliminating the need for manual context creation.

  **Migration:**

  ```typescript
  // Before (v0.2.x)
  const handler = createMcpAdapter(AppRouter, {
    serverInfo: { name: 'My Server', version: '1.0.0' },
    context: (req) => ({
      context: { user: 'test' },
      tools: [],
      request: req,
      timestamp: Date.now()
    })
  });

  // After (v0.3.x)
  const handler = createMcpAdapter({
    router: AppRouter,
    serverInfo: { name: 'My Server', version: '1.0.0' },
    // context is automatically inferred!
  });
  ```

#### New Features

  - **Custom Prompts**: Register prompts that AI agents can use to guide interactions
    ```typescript
    prompts: {
      custom: [{
        name: 'debugUser',
        description: 'Debug user account issues',
        handler: async (args, context) => ({ /* ... */ })
      }]
    }
    ```

  - **Custom Resources**: Expose resources that AI agents can read
    ```typescript
    resources: {
      custom: [{
        uri: 'config://app/settings',
        name: 'Application Settings',
        handler: async (context) => ({ /* ... */ })
      }]
    }
    ```

  - **OAuth Authorization**: First-class support for OAuth-based authorization
    ```typescript
    oauth: {
      issuer: 'https://auth.example.com',
      resourceMetadataPath: '/.well-known/oauth-protected-resource',
      scopes: ['mcp:read', 'mcp:write'],
      verifyToken: async (token, context) => ({ valid: true })
    }
    ```
    - Automatic Bearer token verification
    - Protected resource metadata endpoint exposure
    - Proper 401 responses with WWW-Authenticate headers

  #### Improvements

  - **Enhanced Type Inference**: All handlers (prompts, resources, oauth.verifyToken, events) now automatically receive the correctly typed context from the router
  - **Reduced Boilerplate**: No need to manually create and return context objects
  - **Better Documentation**: Comprehensive examples showing all new features
  - **Cleaner API**: Single configuration object is more intuitive and easier to understand

## 0.2.0

### Minor Changes

- 3e7fb94: feat!: Next alpha update — major enhancements: modular adapters, advanced type-safe realtime and job systems, robust store layer, and extensible architecture for scalable, modern TypeScript backends

  Igniter.js is now a fully modular, type-safe backend framework. This alpha release debuts a robust architecture with first-class type safety, powerful built-in features, and standalone adapters for extensibility and flexibility.

  ### Breaking Changes

  - New modular package architecture
  - Adapters extracted into standalone packages
  - Updated import paths and API patterns

  ### Core Features

  - **Type-Safe Router**
    - Procedure-based routing system
    - Middleware chain with execution control
    - Context injection and type inference
    - Built-in request/response processors
    - Advanced error handling
  - **Realtime System**
    - Type-safe, context-aware event publishing and subscription
    - Built-in Server-Sent Events (SSE) processor with automatic client management
    - Channel-based, namespaced communication with fine-grained access control
    - Seamless integration with application context for per-user or per-session scoping
    - Automatic reconnection and event replay for reliable delivery
    - Strongly-typed event payloads and handler signatures
    - Extensible hooks for connection lifecycle, authentication, and custom event processing
  - **Job System** (`@igniter-js/adapter-bullmq`)
    - Strongly-typed job definitions and payloads
    - Flexible, cron-like job scheduling and delayed jobs
    - Automatic retries, exponential backoff, and failure handling
    - Centralized job registry with in-memory and persistent caching
    - Namespaced queues for multi-tenant and modular applications
    - Lifecycle hooks for job creation, progress, completion, and failure
    - Atomic job state transitions and concurrency control
    - Built-in event emitters for job and queue events
    - Pluggable middleware for job processing and context injection
    - Type-safe job result and error propagation
  - **Store Layer** (`@igniter-js/adapter-redis`)
    - Strongly-typed, generic key-value store interface
    - Type-safe CRUD operations with schema validation
    - Atomic and transactional operations (multi, pipeline)
    - Advanced caching strategies with TTL and invalidation
    - Publish/Subscribe (Pub/Sub) with type-safe channels and payloads
    - Connection pooling and robust reconnection logic
    - Namespaced keys and pattern-based operations
    - Extensible serialization/deserialization (custom codecs)
    - Event hooks for store and Pub/Sub lifecycle events
  - **Telemetry** (`@igniter-js/adapter-opentelemetry`)
    - Distributed request tracing with automatic span creation for HTTP, jobs, and realtime events
    - Performance monitoring with customizable span attributes and duration metrics
    - Flexible metric collection for application and system-level insights
    - Context propagation across async boundaries and between adapters
    - Seamless integration with OpenTelemetry exporters and observability backends
    - Middleware for automatic instrumentation and custom trace enrichment
  - **MCP Server Integration** (`@igniter-js/adapter-mcp`)
    - Full MCP protocol support for seamless integration with MCP-compatible clients and services
    - Define type-safe MCP procedures using a declarative API, with automatic context injection for each request
    - Built-in support for context-aware AI operations, allowing you to handle AI-driven tasks and workflows with access to user/session context
    - Native streaming responses: easily implement streaming data or AI-generated content over MCP channels
    - Customizable authentication and authorization hooks for secure, multi-tenant environments
    - Automatic serialization and deserialization of MCP messages, with type inference for request and response payloads
    - Lifecycle hooks for connection, message, and error handling, enabling advanced control and observability
    - Works seamlessly with the core router and middleware system, so you can share logic and context between HTTP and MCP endpoints
  - **Plugin Management**
    - Centralized plugin management for modular application extension
    - Type-safe registration and discovery of plugins at runtime
    - Lifecycle hooks for plugin initialization, activation, and teardown
    - Context-aware dependency injection for plugins
    - Supports both synchronous and asynchronous plugin loading
    - Enables dynamic feature toggling and hot-reloading of plugins
    - Strongly-typed plugin interfaces for safe integration and extension
    - Seamless integration with the core application context and other adapters

  ### Installation

  ```bash
  # Core framework
  npm install @igniter-js/core

  # Choose the adapters you need
  npm install @igniter-js/adapter-redis ioredis
  npm install @types/ioredis --save-dev

  npm install @igniter-js/adapter-bullmq bullmq

  npm install @igniter-js/adapter-opentelemetry

  npm install @igniter-js/adapter-mcp @vercel/mcp-adapter @modelcontextprotocol/sdk
  ```

  ### Key Benefits

  - Full type safety across all features
  - Modular architecture - install only what you need
  - Built-in realtime capabilities
  - Advanced job processing
  - Robust error handling
  - Performance monitoring
  - AI-ready infrastructure

  This is an alpha release focused on gathering feedback. While the core architecture is stable, APIs might be refined based on community input.

  ### Next Steps

  We're currently focused on:

  - Completing the new Igniter.js CLI for improved developer experience
  - Finalizing comprehensive unit and integration test coverage
  - Expanding and refining documentation with more examples
  - Developing additional adapters for popular third-party services
  - Implementing further performance enhancements
  - Actively incorporating feedback from the community

  Follow our GitHub repository for updates and to contribute feedback.
