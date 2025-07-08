# Igniter.js Store: High-Performance Caching and Messaging

Modern applications often need to perform the same expensive operations repeatedly, such as complex database queries. They also benefit from having different parts of the system communicate with each other without being tightly coupled.

**Igniter.js Store** is a powerful, integrated service that addresses both of these needs. It provides a unified, driver-based API for:

1.  **Key-Value Caching**: A high-performance cache to store and retrieve frequently accessed data, dramatically reducing database load and improving response times.
2.  **Pub/Sub Messaging**: A publisher/subscriber system that allows different parts of your application (or even different microservices) to communicate asynchronously by broadcasting and listening to messages on named channels.

Like other Igniter.js systems, the Store is built on a modular architecture. The officially recommended driver is the **Redis Store Adapter**, which leverages the speed and power of Redis.

---

## 1. Setup and Configuration

To use the Store, you first need to install the necessary dependencies, create the adapter instance, and register it with the Igniter Builder.

### Step A: Install Peer Dependencies

The Redis adapter requires the `ioredis` package.

```bash
# npm
npm install ioredis
npm install @types/ioredis --save-dev

# yarn
yarn add ioredis
yarn add @types/ioredis --dev
```

### Step B: Create the Redis Store Adapter

Create a file at `src/services/store.ts` to initialize the Redis adapter. You'll need a running Redis instance for it to connect to.

```typescript
// src/services/store.ts
import { createRedisStoreAdapter } from '@igniter-js/core/adapters';
import { redis } from './redis'; // Assuming you have your ioredis client instance here

/**
 * Store adapter for data persistence and messaging.
 * Provides a unified interface for caching and pub/sub operations via Redis.
 */
export const store = createRedisStoreAdapter({
  client: redis,
  // Optional: A global prefix for all keys stored by this adapter.
  // Useful for preventing key collisions in a shared Redis instance.
  keyPrefix: 'igniter-app:', 
});
```

### Step C: Register with the Igniter Builder

Finally, enable the Store feature in `src/igniter.ts` by passing your adapter to the `.store()` method.

```typescript
// src/igniter.ts
import { Igniter } from '@igniter-js/core';
import { store } from '@/services/store'; // 1. Import the store adapter
// ... other imports

export const igniter = Igniter
  .context<AppContext>()
  // ... other builder methods
  .store(store) // 2. Enable the Store feature
  .create();
```
With this configuration, the `igniter.store` object becomes available throughout your application for direct use, and a `store` property is added to the `context` within your actions and procedures.

---

## 2. Using the Store as a Cache

Caching is one of the most effective ways to boost your API's performance. The cache-aside pattern is a common strategy:

1.  Your application requests data.
2.  It first checks the cache for this data.
3.  **Cache Hit:** If the data is in the cache, it's returned immediately, avoiding a slow database call.
4.  **Cache Miss:** If the data is not in the cache, the application fetches it from the database, stores it in the cache for future requests, and then returns it.

### Key Cache Methods

*   `store.set(key, value, options)`: Stores a value in the cache. The `value` is automatically serialized. The `options` object can include a `ttl` (time-to-live) in seconds.
*   `store.get<T>(key)`: Retrieves a value from the cache. The value is automatically deserialized. You can provide a type `T` for type safety.
*   `store.del(key)`: Deletes a key from the cache.
*   `store.has(key)`: Checks if a key exists in the cache.
*   `store.increment(key)` / `store.decrement(key)`: Atomically increases or decreases a numeric value, perfect for counters.

### Example: Caching a User Profile

Let's implement the cache-aside pattern for an endpoint that fetches a user's profile.

```typescript
// In a controller
getProfile: igniter.query({
  path: '/users/:id',
  handler: async ({ request, context, response }) => {
    const { id } = request.params;
    const cacheKey = `user-profile:${id}`;

    // 1. First, try to get the user from the cache
    const cachedUser = await context.store.get<User>(cacheKey);

    if (cachedUser) {
      context.logger.info(`Cache HIT for key: ${cacheKey}`);
      return response.success(cachedUser);
    }

    context.logger.info(`Cache MISS for key: ${cacheKey}`);
    
    // 2. If not in cache, fetch from the database
    const user = await context.database.user.findUnique({ where: { id } });

    if (!user) {
      return response.notFound({ message: 'User not found' });
    }

    // 3. Store the result in the cache for next time.
    // Set a TTL of 1 hour (3600 seconds).
    await context.store.set(cacheKey, user, { ttl: 3600 });

    return response.success(user);
  },
}),
```

---

## 3. Using the Store for Pub/Sub Messaging

The Publish/Subscribe (Pub/Sub) pattern is a powerful messaging model that allows you to decouple the components of your application.

*   **Publishers** send messages to named "channels" without needing to know who, if anyone, is listening.
*   **Subscribers** listen to specific channels and react when they receive a message.

This is ideal for event-driven architectures, real-time notifications, or broadcasting state changes.

### Key Pub/Sub Methods

*   `store.publish(channel, message)`: Publishes a `message` to a specific `channel`. The message can be any JSON-serializable object.
*   `store.subscribe(channel, handler)`: Subscribes to a `channel` and executes the `handler` function every time a message is received on that channel.

### Example: Invalidating Cache on Role Change

Imagine you have a complex permissions system where user roles are cached. When an admin changes a user's role, you need to invalidate that user's cache everywhere. Pub/Sub is perfect for this.

**Step 1: The Publisher (in a mutation)**
The `mutation` for updating a role publishes an event after a successful database update.

```typescript
// In an admin controller
updateUserRole: igniter.mutation({
  path: '/users/:id/role',
  method: 'PATCH',
  body: z.object({ role: z.string() }),
  handler: async ({ request, context, response }) => {
    const { id } = request.params;
    const { role } = request.body;

    await context.database.user.update({ where: { id }, data: { role } });
    
    // 1. Publish an event to the 'user-events' channel
    await context.store.publish('user-events', {
      type: 'ROLE_UPDATED',
      payload: { userId: id },
    });

    return response.success({ message: 'User role updated.' });
  },
}),
```

**Step 2: The Subscriber (in a service or startup file)**
A listener, initialized when the application starts, subscribes to the `user-events` channel.

```typescript
// src/services/event-listeners.ts
import { store } from './store';

export function initializeEventListeners() {
  // 2. Subscribe to the channel
  store.subscribe('user-events', (message) => {
    // This handler will run for every message published to 'user-events'
    console.log('Received user event:', message);

    if (message.type === 'ROLE_UPDATED') {
      const { userId } = message.payload;
      const cacheKey = `user-profile:${userId}`;
      console.log(`Role updated for user ${userId}, clearing cache key: ${cacheKey}`);
      
      // 3. React to the event
      store.del(cacheKey);
    }
  });
  console.log("User event listeners initialized.");
}

// Call initializeEventListeners() when your application starts up.
```
With this pattern, the `updateUserRole` action doesn't need to know anything about the caching logic. It just fires an event, and the decoupled listener handles the side effects, leading to cleaner, more maintainable code.