# AI Agent Maintenance Manual: `@igniter-js/adapter-bullmq`

**Version:** 1.0.0
**For Agent Use Only.**

This document provides a comprehensive technical guide for Large Language Model (LLM) based AI agents responsible for maintaining, debugging, and extending the `@igniter-js/adapter-bullmq` package. You are an expert TypeScript engineer; this manual is your single source of truth for this package. Adherence to these instructions is critical.

---

## 1. Package Overview

### 1.1. Package Name
`@igniter-js/adapter-bullmq`

### 1.2. Purpose
This package serves as a concrete **Adapter** that connects the abstract **Igniter.js Queues** system (defined in `@igniter-js/core`) to the [BullMQ](https://bullmq.io/) library. Its sole responsibility is to implement the `IgniterJobQueueAdapter` interface, providing a robust, production-ready solution for background job processing using Redis as the backend.

---

## 2. Architecture & Key Concepts

To effectively maintain this package, you must understand its role as a "bridge" between the Igniter.js framework and the BullMQ library.

### 2.1. The Adapter Pattern
This package is a classic example of the **Adapter Pattern**. `@igniter-js/core` defines a standard interface for what a job queue system should do (`IgniterJobQueueAdapter` in `packages/core/src/types/jobs.interface.ts`). This adapter provides the concrete implementation of that interface. This decouples the core framework from the specific queueing technology, meaning another adapter (e.g., for RabbitMQ) could be created without changing the core framework.

### 2.2. Interaction with BullMQ
This adapter is essentially a sophisticated wrapper around the BullMQ library. When you use the functions provided by this adapter, it translates those calls into the corresponding BullMQ operations:

*   **`jobs.router()` and `jobs.register()`**: These functions from the adapter do **not** immediately interact with BullMQ. They are configuration helpers that allow developers to define their job structures, payloads (with Zod), and handlers in a declarative, type-safe way.
*   **`jobs.merge()`**: This function consolidates all the defined job routers into a single, structured configuration object.
*   **`igniter.jobs.<namespace>.schedule()`**: When this method is called from the application, the adapter's `invoke` or `schedule` logic is triggered. This is where a **`Queue`** instance from BullMQ is used to add a new job to Redis via `queue.add()`.
*   **Worker Process**: The adapter can optionally start a BullMQ **`Worker`** instance. This worker listens to the Redis queue, picks up jobs as they become available, and executes the corresponding `handler` function that you defined in `jobs.register()`.

### 2.3. Redis Connection
BullMQ requires a Redis connection to operate. To promote efficiency, this adapter does **not** create its own Redis connection. Instead, it **requires an existing Redis connection** to be passed in during initialization, typically from an instance of the `@igniter-js/adapter-redis` store adapter. This allows the Store and Queues systems to share a single connection pool.

---

## 3. File & Directory Map (`src/`)

The package has a minimal and focused file structure.

*   `src/index.ts`
    > **Purpose**: The public entry point of the package. It exports the primary factory function, `createBullMQAdapter`.
    > **Maintenance**: This file should rarely change unless the main export's signature is modified.

*   `src/bullmq.adapter.ts`
    > **Purpose**: **This is the most critical file.** It contains the entire implementation of the `createBullMQAdapter` function. All logic for creating routers, registering jobs, enqueuing tasks, and managing workers resides here.
    > **Maintenance**: Any change to the adapter's behavior, such as adding support for a new BullMQ feature or changing default options, will happen in this file. You must study the `createBullMQAdapter` function thoroughly.

*   `src/types.ts`
    > **Purpose**: Contains TypeScript `interface` and `type` definitions that are **specific to this adapter**. This primarily includes the configuration options for the `createBullMQAdapter` function, like `BullMQAdapterConfig`.
    > **Maintenance**: If you add a new configuration option to the adapter, its type definition must be added here first.

*   `src/__tests__/`
    > **Purpose**: Contains all Vitest unit and integration tests for the adapter.
    > **Maintenance**: Any code change **must** be accompanied by a corresponding new or updated test. Before committing any changes, you must run the tests within this directory to ensure there are no regressions.

---

## 4. Common Maintenance Tasks for AI Agents

This section provides explicit, step-by-step instructions for performing common maintenance tasks on this package.

### Task 1: Add Support for a New BullMQ Job Option

**Scenario:** A developer wants to specify the `removeOnFail` option for a job, a feature supported by BullMQ but not currently exposed in the `jobs.register()` definition.

1.  **Objective Analysis:** The goal is to allow developers to pass a `removeOnFail` property within `jobs.register()` and have that option passed correctly to BullMQ's `queue.add()` method.

2.  **Locate the Core Interface (Source of Truth):** First, check the canonical interface for job options in the core package.
    -   **File:** `packages/core/src/types/jobs.interface.ts`.
    -   **Action:** Find the `JobDefinition` or a related options type. Add the new property there. This ensures that the entire framework is aware of the new option.
    ```typescript
    // In packages/core/src/types/jobs.interface.ts
    export interface JobDefinition<...> {
      // ... existing properties
      removeOnFail?: boolean | number; // Add the new property
    }
    ```

3.  **Locate the Adapter Implementation:** Now, turn your attention to this adapter. The logic that takes a job definition and adds it to the queue is what needs to change.
    -   **File:** `packages/adapter-bullmq/src/bullmq.adapter.ts`.
    -   **Action:** Find the part of the code inside `createBullMQAdapter` that handles job invocation (e.g., inside the `.schedule()` or `.invoke()` methods returned by the proxy). This is where the call to BullMQ's `queue.add()` happens.

4.  **Modify the Invocation Logic:** Update the code to read the new `removeOnFail` property from the job definition and include it in the `opts` object passed to `queue.add()`.
    ```typescript
    // Inside createBullMQAdapter, likely within the invocation logic
    // (e.g., inside the returned `schedule` function)
    
    // ... logic to get jobDefinition ...
    
    const bullmqOptions: JobsOptions = {
      // ... existing options being mapped ...
      delay: options.delay,
      priority: options.priority,
    };
    
    // Add the new option if it exists on the job definition
    if (jobDefinition.removeOnFail !== undefined) {
      bullmqOptions.removeOnFail = jobDefinition.removeOnFail;
    }
    
    // This is the call to the underlying BullMQ library
    await queue.add(jobDefinition.name, input, bullmqOptions);
    ```

5.  **Write/Update Tests:**
    -   **File:** `packages/adapter-bullmq/src/__tests__/bullmq.adapter.test.ts`.
    -   **Action:** Add a new test case. In this test, define a job using `jobs.register` that includes the new `removeOnFail` option. Then, invoke that job. Use `vi.spyOn` or a mock of the BullMQ `queue.add` method to assert that it was called with the correct options object, including `removeOnFail`.

    ```typescript
    // Example test case snippet
    it('should pass the removeOnFail option to BullMQ', async () => {
      const mockQueueAdd = vi.fn();
      // Mock the BullMQ queue instance to spy on its 'add' method
      // (This requires setting up the test harness appropriately)
      vi.spyOn(BullMQ, 'Queue').mockImplementation(() => ({
        add: mockQueueAdd,
        // ... other mocked methods
      }));

      const myJob = jobs.register({
        input: z.object({}),
        handler: async () => {},
        removeOnFail: 50, // Use the new option
      });

      // ... invoke the job ...
      
      expect(mockQueueAdd).toHaveBeenCalledWith(
        expect.any(String), // job name
        expect.any(Object), // payload
        expect.objectContaining({ removeOnFail: 50 }) // Assert the option is present
      );
    });
    ```

### Task 2: Change a Default Worker Behavior

**Scenario:** The default worker concurrency is `5`. The project lead wants to change this default to `10`.

1.  **Objective Analysis:** The goal is to change a default configuration value within the adapter.

2.  **Locate Adapter Configuration:** This default is set when the adapter is created.
    -   **File:** `packages/adapter-bullmq/src/bullmq.adapter.ts`.
    -   **Action:** Find the `createBullMQAdapter` function. Inside it, locate where the `autoStartWorker` options are processed and where the default `concurrency` is set.

3.  **Modify the Default Value:** Change the default value from `5` to `10`.
    ```typescript
    // Inside createBullMQAdapter
    export const createBullMQAdapter = (config: BullMQAdapterConfig) => {
      // ...
      const workerOptions = {
        concurrency: 5, // <-- This is the old value
        // ...
      };
      
      // Change it to:
      const workerOptions = {
        concurrency: 10, // <-- This is the new value
        // ...
      };
      // ... rest of the logic that uses workerOptions
    }
    ```

4.  **Review for Impacts:** Assess if this change has any side effects. Changing a default concurrency value is generally safe but could impact performance. The change is isolated to this adapter, so no other packages should be affected.

5.  **Write/Update Tests:**
    -   **File:** `packages/adapter-bullmq/src/__tests__/bullmq.adapter.test.ts`.
    -   **Action:** Find the test that verifies the default worker behavior. If it doesn't exist, create one. The test should initialize the adapter *without* specifying a concurrency level and then assert that the underlying BullMQ `Worker` was created with `concurrency: 10`.

By following these detailed, methodical steps, you will ensure that all modifications are implemented correctly, are well-tested, and respect the architectural boundaries of the Igniter.js ecosystem. Always prioritize reading the `types` and then the `implementation` before making any changes.