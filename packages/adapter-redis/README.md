# @igniter-js/adapter-redis

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/adapter-redis.svg)](https://www.npmjs.com/package/@igniter-js/adapter-redis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official Redis adapter for the **Igniter.js Store** system. This package provides a high-performance driver for caching and pub/sub messaging using a Redis data store.

## Role in the Ecosystem

This adapter acts as the concrete implementation for the abstract Store interface defined in `@igniter-js/core`. By plugging this adapter into your application, you enable powerful features:

-   **Caching:** A fast, Redis-backed key-value cache for storing the results of expensive operations.
-   **Pub/Sub:** A message bus for building real-time, event-driven features.
-   **Shared Connection:** The Redis client from this adapter can be shared with other systems, like the `Igniter.js Queues` (BullMQ) adapter, for maximum efficiency.

## Installation

To use this adapter, you need to install it along with its peer dependency, `ioredis`.

```bash
# npm
npm install @igniter-js/adapter-redis ioredis

# yarn
yarn add @igniter-js/adapter-redis ioredis

# pnpm
pnpm add @igniter-js/adapter-redis ioredis

# bun
bun add @igniter-js/adapter-redis ioredis
```

## Basic Usage

The primary export of this package is the `createRedisStoreAdapter` factory function.

### 1. Create the Adapter Instance

First, create an instance of the `ioredis` client and pass it to the adapter factory. This is typically done in a dedicated service file.

```typescript
// src/services/store.ts
import { createRedisStoreAdapter } from '@igniter-js/adapter-redis';
import { Redis } from 'ioredis';

// It's recommended to configure your Redis connection via environment variables.
const redis = new Redis(process.env.REDIS_URL);

/**
 * The Store adapter for data persistence and messaging.
 */
export const store = createRedisStoreAdapter({
  client: redis,
  // Optional: A global prefix for all keys stored by this adapter.
  keyPrefix: 'igniter-app:',
});
```

### 2. Register with the Igniter Builder

Next, enable the Store feature in your main `igniter.ts` file by passing your `store` adapter instance to the `.store()` method on the builder.

```typescript
// src/igniter.ts
import { Igniter } from '@igniter-js/core';
import { store } from './services/store';

export const igniter = Igniter
  .context<AppContext>()
  .store(store) // Enable the Store feature
  .create();
```

Your application is now configured to use Redis for caching and pub/sub. You can access the store's methods via `igniter.store` or `context.store` within your actions.

**Example of use in an action:**

```typescript
handler: async ({ context, response }) => {
  // Set a value in the cache with a 1-hour TTL
  await context.store.set('user:123', { name: 'John Doe' }, { ttl: 3600 });

  // Get the value
  const user = await context.store.get('user:123');

  return response.success({ user });
}
```

For more detailed guides, please refer to the **[Official Igniter.js Wiki](https://github.com/felipebarcelospro/igniter-js/wiki)**.

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](/CONTRIBUTING.md) file for details on how to get started.

## License

This package is licensed under the [MIT License](/LICENSE).