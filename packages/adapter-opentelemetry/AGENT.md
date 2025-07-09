# AI Agent Maintenance Manual: `@igniter-js/adapter-opentelemetry`

**Version:** 1.0.0
**For AI Agent Use Only.**

This document provides a comprehensive technical guide for Large Language Model (LLM) based AI agents responsible for maintaining, debugging, and extending the `@igniter-js/adapter-opentelemetry` package. You are an expert TypeScript software engineer; this manual is your single source of truth for this package. Adherence to these instructions is critical.

---

## 1. Package Overview

### 1.1. Package Name
`@igniter-js/adapter-opentelemetry`

### 1.2. Purpose
This package is an **Adapter**. Its sole responsibility is to implement the `IgniterTelemetryProvider` interface (defined in `@igniter-js/core`) using the **OpenTelemetry** standard. It provides a production-ready solution for observability, enabling distributed tracing, metrics collection, and structured event logging for Igniter.js applications. This adapter makes it possible to monitor, debug, and analyze the performance of applications in complex, distributed environments.

---

## 2. Architecture & Key Concepts

To effectively maintain this package, you must understand its role as a sophisticated wrapper around the OpenTelemetry SDKs, tailored to the Igniter.js lifecycle.

### 2.1. The Adapter Pattern and the Core Contract

The `IgniterTelemetryProvider` interface, located in `packages/core/src/types/telemetry.interface.ts`, is the **canonical contract** for this package. The object returned by `createOpenTelemetryAdapter` must fully implement this interface. The key methods this adapter provides are:
- `startSpan`: To begin a new tracing span.
- `timing`: To record a duration-based metric (histogram).
- `increment`: To increment a counter metric.
- `event`: To record a structured log or event.

### 2.2. OpenTelemetry SDK Integration

This adapter abstracts away the significant complexity of setting up the OpenTelemetry Node.js SDK (`@opentelemetry/sdk-node`).
- **Initialization:** The `createOpenTelemetryAdapter` function is the main entry point. It programmatically configures and starts the `NodeSDK`.
- **Exporters:** A key responsibility is to configure and register **exporters**. Exporters are responsible for sending telemetry data to a backend system. This adapter supports multiple exporters (Console, Jaeger, OTLP, Prometheus) and can be configured to use several simultaneously via a `MultiSpanExporter`.
- **Resource Attributes:** It sets OpenTelemetry `Resource` attributes, which are metadata tags (e.g., `service.name`, `deployment.environment`) attached to all telemetry emitted by the application.
- **Sampling:** It configures tracing sampling (e.g., `TraceIdRatioBasedSampler`) to control the volume of traces sent in high-traffic environments.

### 2.3. Integration with the Igniter.js Request Lifecycle

The true power of this adapter is unlocked when it's registered with the Igniter Builder via the `.telemetry()` method. This allows it to hook into the core `RequestProcessor`.
1.  **Span Creation:** For every incoming HTTP request, the `RequestProcessor` calls this adapter's `startSpan` method. This creates a root "span" for the entire request, capturing details like the HTTP method and path.
2.  **Context Injection:** This is a critical step. The adapter injects the created OpenTelemetry `span` and its `traceContext` directly into the Igniter.js `context`. This makes the current span available inside every `Procedure` and `Action` handler via `context.span`.
3.  **Child Spans:** Developers can then use `context.span.child('my-operation')` within their handlers to create nested, child spans for fine-grained tracing of specific operations, such as a database query or a call to an external API.
4.  **Span Finalization:** The `RequestProcessor` ensures that the root span is correctly finalized (finished) at the end of the request, recording its total duration and status (success or error). The `ErrorHandlerProcessor` specifically calls `finishSpanError` to correctly tag failed requests.

### 2.4. Developer Experience Wrappers

To simplify the use of OpenTelemetry APIs, this adapter provides custom wrapper classes:
-   **`IgniterSpan` (`span.ts`):** A wrapper around the OTel `Span` object. It provides a more fluent and convenient API for developers, such as `.setTag()`, `.setError()`, and `.child()`.
-   **`IgniterTimer` (`timer.ts`):** A utility class returned by the `telemetry.timer()` method. It simplifies the process of measuring the duration of an operation and recording it as a histogram metric upon calling `.finish()`.

---

## 3. File & Directory Map (`src/`)

*   `src/index.ts`
    > **Purpose**: The public entry point of the package. It exports the primary factory functions (`createOpenTelemetryAdapter`, `createProductionOpenTelemetryAdapter`, etc.) and the core `OpenTelemetryConfig` type.
    > **Maintenance**: This file should only be modified if a new public factory or type is introduced.

*   `src/opentelemetry.adapter.ts`
    > **Purpose**: **This is the most critical file.** It contains the implementation of the main `createOpenTelemetryAdapter` factory. All the complex logic for initializing the `NodeSDK`, configuring exporters based on the provided options, and returning an object that implements the `IgniterTelemetryProvider` interface resides here.
    > **Maintenance**: Any task involving a change to the adapter's core behavior, such as supporting a new exporter or adding a new top-level configuration, will be implemented in this file.

*   `src/factory.ts`
    > **Purpose**: This file contains the high-level, opinionated factory functions like `createProductionOpenTelemetryAdapter` and `createSimpleOpenTelemetryAdapter`. These are convenience wrappers that call the main `createOpenTelemetryAdapter` with pre-defined, sensible configurations for specific environments.
    > **Maintenance**: If a new "preset" configuration is needed (e.g., `createDatadogAdapter`), it should be added here.

*   `src/span.ts`
    > **Purpose**: Defines the `IgniterSpan` wrapper class. This class provides a developer-friendly API over the standard OpenTelemetry `Span` interface.
    > **Maintenance**: If a new helper method for interacting with spans is needed (e.g., a shortcut for adding a specific type of event), it should be added to this class.

*   `src/timer.ts`
    > **Purpose**: Defines the `IgniterTimer` utility class, which simplifies the process of timing an operation and recording a histogram metric.
    > **Maintenance**: Changes to how timing metrics are recorded would be made in this class.

*   `src/types.ts`
    > **Purpose**: **This is a critical file.** It contains the `OpenTelemetryConfig` interface, which defines all possible configuration options that can be passed to the factory functions.
    -   **Maintenance**: When adding any new configuration option to the adapter, its type definition **must** be added to the `OpenTelemetryConfig` interface in this file first. This is non-negotiable for maintaining type safety.

---

## 4. Common Maintenance Tasks for AI Agents

This section provides explicit, step-by-step instructions for performing common maintenance tasks on this adapter.

### Task 1: Add a New OpenTelemetry Exporter

**Scenario:** The community has requested built-in support for the Zipkin exporter (`@opentelemetry/exporter-zipkin`).

1.  **Objective Analysis:** The goal is to allow developers to enable the Zipkin exporter by adding `'zipkin'` to the `exporters` array in their configuration and providing Zipkin-specific options.
2.  **Update Dependencies:** Open the `package.json` file for this package. Add `@opentelemetry/exporter-zipkin` as a new **optional peer dependency**. This ensures that users only install it if they intend to use it.
3.  **Update Type Definitions:**
    -   **File:** `packages/adapter-opentelemetry/src/types.ts`.
    -   **Action:** Modify the `OpenTelemetryConfig` interface.
        -   Add `'zipkin'` as a possible value to the `exporters` array type.
        -   Add a new optional property `zipkin?: { endpoint?: string; serviceName?: string; };` to allow for Zipkin-specific configuration.
    ```typescript
    // In types.ts
    export interface OpenTelemetryConfig {
      // ...
      exporters?: ('console' | 'jaeger' | 'otlp' | 'prometheus' | 'zipkin')[];
      // ...
      zipkin?: {
        endpoint?: string;
        serviceName?: string;
      };
      // ...
    }
    ```
4.  **Update Adapter Implementation:**
    -   **File:** `packages/adapter-opentelemetry/src/opentelemetry.adapter.ts`.
    -   **Action:** Inside the `createOpenTelemetryAdapter` function, locate the section where the `exporters` array is constructed. Add the logic to initialize and add the `ZipkinExporter`.
    ```typescript
    // In opentelemetry.adapter.ts
    import { ZipkinExporter } from '@opentelemetry/exporter-zipkin'; // 1. Add the new import

    // ... inside createOpenTelemetryAdapter ...
    const traceExporters: SpanExporter[] = []; // Assuming this array exists

    // 2. Add the logic block for the new exporter
    if (config.exporters?.includes('zipkin')) {
      traceExporters.push(new ZipkinExporter({
        url: config.zipkin?.endpoint || 'http://localhost:9411/api/v2/spans',
        serviceName: config.zipkin?.serviceName || config.serviceName,
      }));
      this.logger.info('Zipkin exporter enabled.');
    }
    // ...
    ```
5.  **Write/Update Tests:**
    -   **File:** `packages/adapter-opentelemetry/src/__tests__/opentelemetry.adapter.test.ts` (or create it).
    -   **Action:** Create a new test case that calls `createOpenTelemetryAdapter` with `'zipkin'` in the `exporters` array.
        -   Use `vi.mock` to mock the `@opentelemetry/exporter-zipkin` module.
        -   Assert that the `ZipkinExporter` constructor was called.
        -   Assert that it was called with the correct configuration options (e.g., the endpoint provided in the test config).

### Task 2: Change a Default Configuration Value

**Scenario:** The default `sampleRate` is `1.0` (100%). We need to change the default to `0.1` (10%) for the `createProductionOpenTelemetryAdapter` to reduce production telemetry costs.

1.  **Objective Analysis:** This involves changing a default parameter in one of the high-level factory functions.
2.  **Locate High-Level Factory:**
    -   **File:** `packages/adapter-opentelemetry/src/factory.ts`.
3.  **Modify the Factory Logic:** Find the `createProductionOpenTelemetryAdapter` function. Locate where the `sampleRate` is being set or defaulted.
    ```typescript
    // In factory.ts
    export async function createProductionOpenTelemetryAdapter(...) {
      // ...
      return createOpenTelemetryAdapter({
        config: {
          // ... other production defaults
          // OLD LOGIC might have been:
          // sampleRate: options.sampleRate || 1.0,
          
          // NEW LOGIC:
          sampleRate: options.sampleRate ?? 0.1, // Change default to 0.1
        },
        // ...
      });
    }
    ```
    *Self-Correction:* Using the nullish coalescing operator (`??`) is better than `||` because it allows a developer to explicitly pass `0` as a valid `sampleRate` if they want to disable tracing.
4.  **Write/Update Tests:**
    -   **File:** `packages/adapter-opentelemetry/src/__tests__/factory.test.ts` (or create it).
    -   **Action:**
        -   Write a test that calls `createProductionOpenTelemetryAdapter` **without** providing a `sampleRate`. Mock the underlying `createOpenTelemetryAdapter` and assert that it was called with a config object where `sampleRate` is `0.1`.
        -   Write another test that calls `createProductionOpenTelemetryAdapter` **with** `sampleRate: 0.5`. Assert that the underlying factory was called with `sampleRate: 0.5` (proving the override works).
        -   Write a third test that calls it with `sampleRate: 0`. Assert that the underlying factory was called with `sampleRate: 0`.

This systematic, type-first, and test-driven approach is mandatory for maintaining the quality and reliability of the Igniter.js adapters. Always consult the interfaces in `@igniter-js/core` and the types within this package before implementing changes.
