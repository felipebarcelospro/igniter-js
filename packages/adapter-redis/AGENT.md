# AI Agent Maintenance Manual: `@igniter-js/adapter-redis`

**Version:** 1.0.0
**For AI Agent:** You are an expert TypeScript software engineer. This document is your primary technical guide to the `@igniter-js/adapter-redis` package. Read and understand it thoroughly before attempting any modifications. Your goal is to perform maintenance tasks accurately, respecting the architectural principles outlined here.

---

## 1. Package Overview

### 1.1. Package Name
`@igniter-js/adapter-redis`

### 1.2. Purpose
This package is an **Adapter**. Its sole purpose is to provide a concrete, production-ready implementation of the `IgniterStoreAdapter` interface (defined in `@igniter-js/core`). It uses the `ioredis` library to connect to a Redis server, enabling two critical functionalities for the Igniter.js framework:
1.  **Key-Value Caching:** High-performance storage and retrieval of frequently accessed data.
2.  **Pub/Sub Messaging:** A message bus for event-driven communication between different parts of an application or between microservices.

---

## 2. Architecture & Key Concepts

To effectively maintain this package, you must understand its role as a "translation layer" that connects the abstract concepts of the Igniter.js Store to the concrete commands of Redis.

### 2.1. The Adapter Pattern and the Core Contract

This package is a textbook example of the **Adapter Pattern**. `@igniter-js/core` defines a standard interface, `IgniterStoreAdapter`, which dictates the methods a store must provide (e.g., `get`, `set`, `del`, `publish`, `subscribe`). This can be found in `packages/core/src/types/store.interface.ts`.

**This interface is the absolute source of truth.** The `@igniter-js/adapter-redis` package **must** implement every method defined in `IgniterStoreAdapter` correctly. Any changes to the public-facing API of the store should begin by modifying the interface in `@igniter-js/core`.

### 2.2. The `ioredis` Dependency

This adapter is a sophisticated wrapper around the popular `ioredis` library. It translates the adapter's method calls into the corresponding `ioredis` commands.
-   `store.get(key)` becomes `redis.get(key)`
-   `store.set(key, value)` becomes `redis.set(key, value)`
-   `store.publish(channel, message)` becomes `redis.publish(channel, message)`

A critical architectural point is that `ioredis` requires **separate client instances for regular commands and for Pub/Sub subscriptions**. A client that enters subscription mode (`subscribe`) can no longer execute regular commands. This adapter handles this internally by creating a duplicate client for subscription operations, ensuring that caching and Pub/Sub can function simultaneously without interfering with each other.

### 2.3. Data Serialization

Redis stores data as strings. However, the Igniter.js Store is designed to handle any JSON-serializable JavaScript object. This adapter is therefore responsible for:
-   **Serializing:** Using `JSON.stringify()` on objects before they are sent to Redis with `set`.
-   **Deserializing:** Using `JSON.parse()` on strings retrieved from Redis with `get`.

This serialization logic is a key area of maintenance. Any changes to how data is stored (e.g., to handle `Date` objects or other complex types) must be implemented within this adapter's `get` and `set` methods.

---

## 3. File & Directory Map (`src/`)

The package has a minimal and focused file structure.

*   `src/index.ts`
    > **Purpose**: The public entry point of the package. It exports the primary factory function, `createRedisStoreAdapter`.
    > **Maintenance**: This file should only change if the signature of the main export is modified.

*   `src/redis.adapter.ts`
    > **Purpose**: **This is the core implementation file.** It contains the `createRedisStoreAdapter` factory function. All the logic for connecting to Redis, managing separate command/subscriber clients, and implementing the methods of the `IgniterStoreAdapter` interface (like `get`, `set`, `publish`) resides here.
    > **Maintenance**: Any task involving a change to caching behavior, pub/sub logic, or how Redis commands are executed will happen in this file. You must study this file's contents carefully before any modification.

*   `src/__tests__/`
    > **Purpose**: Contains all Vitest unit and integration tests for the adapter.
    > **Maintenance**: **Any code change to `redis.adapter.ts` MUST be accompanied by a corresponding new or updated test.** This is non-negotiable. The tests should mock the `ioredis` client to assert that the correct Redis commands are being called with the correct arguments.

---

## 4. Common Maintenance Tasks for AI Agents

This section provides explicit, step-by-step instructions for performing common maintenance tasks on this adapter.

### Task 1: Add a New Caching Method

**Scenario:** A developer wants to add a `getSetMembers(key: string)` method to the store to retrieve all members of a Redis Set.

1.  **Objective Analysis:** The goal is to expose a native Redis command (`SMEMBERS`) through the Igniter.js Store API. This requires updating the core interface and then implementing the logic in this adapter.

2.  **Locate and Update Core Interface:** The `IgniterStoreAdapter` interface is the source of truth for the store's contract.
    -   **File:** `packages/core/src/types/store.interface.ts`.
    -   **Action:** Add the new method signature to the `IgniterStoreAdapter` interface.
    ```typescript
    // In packages/core/src/types/store.interface.ts
    export interface IgniterStoreAdapter {
      // ... existing methods: get, set, etc.
      getSetMembers(key: string): Promise<string[]>; // Add the new method
    }
    ```

3.  **Locate Adapter Implementation:** Now, implement this new method in the Redis adapter.
    -   **File:** `packages/adapter-redis/src/redis.adapter.ts`.

4.  **Implement the New Method:** Inside the object returned by `createRedisStoreAdapter`, add the `getSetMembers` method. Use the `ioredis` client to call the `smembers` command.
    ```typescript
    // In packages/adapter-redis/src/redis.adapter.ts
    // Inside the object returned by createRedisStoreAdapter
    
    // ... existing methods: get, set, del, etc.

    async getSetMembers(key: string): Promise<string[]> {
      // Use the command client, not the subscriber client
      const members = await commandClient.smembers(key);
      return members;
    },
    
    // ... rest of the methods
    ```

5.  **Write/Update Tests:**
    -   **File:** `packages/adapter-redis/src/__tests__/redis.adapter.test.ts`.
    -   **Action:** Add a new `describe` block for `getSetMembers`. The test should:
        -   Create an instance of the adapter with a mocked `ioredis` client.
        -   Call `store.getSetMembers('my-set')`.
        -   Assert that the mocked `redis.smembers` method was called exactly once with the argument `'my-set'`.
        -   Mock the return value of `redis.smembers` (e.g., `['a', 'b', 'c']`) and assert that the `getSetMembers` method returns this value correctly.

    ```typescript
    // Example test case snippet
    it('should call smembers and return the members of a set', async () => {
      const mockRedisClient = { smembers: vi.fn().mockResolvedValue(['member1', 'member2']) };
      const adapter = createRedisStoreAdapter({ client: mockRedisClient as any });
      
      const members = await adapter.getSetMembers('my-key');
      
      expect(mockRedisClient.smembers).toHaveBeenCalledWith('my-key');
      expect(members).toEqual(['member1', 'member2']);
    });
    ```

### Task 2: Change the Global Key Prefix Logic

**Scenario:** Instead of a single prefix, we now need to support a function `(key: string) => string` for dynamic key prefixing.

1.  **Objective Analysis:** This is a significant change to the adapter's configuration and internal key-handling logic. It will affect every method that interacts with a key.

2.  **Locate and Update Adapter's Type Definitions:** First, update the configuration type for the adapter.
    -   **File:** `packages/adapter-redis/src/types.ts` (if it exists) or directly in `redis.adapter.ts`.
    -   **Action:** Find the `RedisAdapterConfig` interface and change the type of `keyPrefix`.
    ```typescript
    // In the adapter's types file
    export interface RedisAdapterConfig {
      client: ioredis.Redis;
      // Change the type from 'string' to a union type
      keyPrefix?: string | ((key: string) => string);
    }
    ```

3.  **Locate Adapter Implementation:**
    -   **File:** `packages/adapter-redis/src/redis.adapter.ts`.

4.  **Implement a Key-Resolution Helper Function:** To avoid repeating logic, create a private helper function inside `createRedisStoreAdapter` that resolves the final key.
    ```typescript
    // Inside createRedisStoreAdapter
    const resolveKey = (key: string): string => {
      const { keyPrefix } = config;
      if (typeof keyPrefix === 'function') {
        return keyPrefix(key);
      }
      if (typeof keyPrefix === 'string') {
        return `${keyPrefix}${key}`;
      }
      return key;
    };
    ```

5.  **Refactor All Key-Based Methods:** Go through every method in the adapter (`get`, `set`, `del`, `has`, `increment`, etc.) and replace direct key usage with a call to your new `resolveKey` helper.
    ```typescript
    // Example for the 'get' method
    async get<T>(key: string): Promise<T | null> {
      const finalKey = resolveKey(key); // Use the helper
      const value = await commandClient.get(finalKey);
      // ... rest of the logic
    },
    
    // Example for the 'set' method
    async set(key: string, value: any, options?: { ttl: number }): Promise<void> {
      const finalKey = resolveKey(key); // Use the helper
      const serializedValue = JSON.stringify(value);
      // ... rest of the logic
    },
    ```

6.  **Write/Update Tests:**
    -   **File:** `packages/adapter-redis/src/__tests__/redis.adapter.test.ts`.
    -   **Action:** This is a major change requiring comprehensive test updates.
        -   Add a new test suite for the `keyPrefix` functionality.
        -   Test the case with no prefix.
        -   Test the case with a static string prefix.
        -   Test the case with a function prefix. Mock the function and assert that it's called with the correct original key.
        -   Ensure existing tests for `get`, `set`, etc., are updated to work with this new dynamic key logic.

This methodical, type-first, and test-driven approach is mandatory for maintaining the quality and reliability of the Igniter.js adapters.