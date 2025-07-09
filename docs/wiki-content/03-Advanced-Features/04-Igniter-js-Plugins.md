# Advanced Features: Igniter.js Plugins

**Igniter.js Plugins** are the primary mechanism for creating reusable, modular, and encapsulated functionality. A plugin is a self-contained package that can add its own API endpoints, internal logic, middleware, and even extend the global application context, all while maintaining full type safety.

This architecture allows you to build complex features (like authentication, billing, or logging) as isolated modules that can be easily shared, versioned, and integrated into any Igniter.js application.

## The Philosophy of Plugins

-   **Encapsulation:** All the logic for a specific, cross-cutting concern is contained within a single unit.
-   **Reusability:** A well-designed plugin can be dropped into any Igniter.js project to provide instant functionality.
-   **Decoupling:** Plugins reduce the complexity of your main application logic by handling their own concerns, leading to a cleaner, more maintainable codebase.
-   **Extensibility:** They are the official way to extend the core framework with new capabilities.

---

## The Anatomy of a Plugin

You create a plugin using the `createIgniterPlugin` factory function. A plugin is defined by a configuration object with several key properties:

| Property        | Description                                                                                                                                              |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | A **unique string identifier** for the plugin. Used for namespacing routes and accessing the plugin.                                                     |
| `actions`       | A collection of **internal, private functions**. These are not exposed as API endpoints but can be called by the plugin's own controllers and hooks.       |
| `controllers`   | A collection of **public API endpoints** exposed by the plugin. These are automatically integrated into the main router under `/plugins/<plugin-name>/...`. |
| `hooks`         | Functions that are executed at specific points in the application's lifecycle, such as `afterRequest` or `onError`.                                      |
| `extendContext` | A function that returns an object. This object is merged into the global application `context`, making new services available everywhere.               |

---

## Creating an Example Plugin: An Audit Logger

Let's build a practical `audit-log` plugin. This plugin will:
1.  Automatically log every successful request to the console.
2.  Expose an API endpoint to view the last 10 logs.
3.  Add a helper service to the global context to get the total log count.

### Step 1: Define the Plugin

Create a new file, for example, at `src/plugins/audit-log.plugin.ts`.

```typescript
// src/plugins/audit-log.plugin.ts
import { createIgniterPlugin, createIgniterPluginAction } from '@igniter-js/core';
import { z } from 'zod';

// For this example, we'll store logs in memory.
// In a real application, this would be a database or a log file.
const auditLogs: string[] = [];

export const auditLogPlugin = createIgniterPlugin({
  name: 'audit-log',

  /**
   * Internal actions are not exposed as API endpoints. They can only be
   * called from this plugin's controllers or hooks via the `self` object.
   */
  actions: {
    logEvent: createIgniterPluginAction({
      input: z.object({ path: z.string(), status: z.number() }),
      handler: async ({ input }) => {
        const logMessage = `[AUDIT] ${new Date().toISOString()}: Request to ${input.path} completed with status ${input.status}`;
        auditLogs.push(logMessage);
        console.log(logMessage);
      },
    }),
  },

  /**
   * Public API endpoints exposed by this plugin.
   * They will be available under the path `/plugins/audit-log/...`
   */
  controllers: {
    history: {
      path: '/history',
      method: 'GET',
      handler: async ({ response }) => {
        // Return the last 10 logs.
        return response.success({ logs: auditLogs.slice(-10).reverse() });
      },
    },
  },

  /**
   * Lifecycle hooks allow the plugin to tap into the request lifecycle.
   */
  hooks: {
    // This hook runs after a successful request has been processed.
    afterRequest: async (ctx, req, res, self) => {
      // The `self` parameter provides type-safe access to this plugin's own actions.
      await self.actions.logEvent({
        path: req.path,
        status: res.status,
      });
    },
  },

  /**
   * The `extendContext` function adds properties to the global application context.
   * The returned object will be available on `context` in all actions and procedures.
   */
  extendContext: () => {
    return {
      auditService: {
        getLogCount: () => auditLogs.length,
      },
    };
  },
});
```

### Step 2: Register the Plugin with the Builder

Now, enable your new plugin in your main `igniter.ts` file using the `.plugins()` method on the builder.

```typescript
// src/igniter.ts
import { Igniter } from '@igniter-js/core';
import { auditLogPlugin } from '@/plugins/audit-log.plugin'; // 1. Import the plugin

export const igniter = Igniter
  .context<AppContext>()
  // ... other builder methods
  // 2. Register the plugin
  .plugins({
    // The key 'audit' is how we will access the plugin's context extensions.
    audit: auditLogPlugin,
  })
  .create();
```

### Step 3: Use the Plugin's Features

Your plugin is now fully integrated.

1.  **Automatic Logging:** Every successful API request in your application will now automatically be logged to the console by the `afterRequest` hook.
2.  **Plugin API Endpoint:** You can make a `GET` request to `/api/v1/plugins/audit-log/history` (assuming your `basePATH` is `/api/v1`), and it will return the last 10 logs.
3.  **Extended Context:** The `auditService` is now available on the global context. You can use it in any of your application's regular action handlers:

    ```typescript
    // In any controller in your application
    someAction: igniter.query({
      path: '/stats',
      handler: async ({ context, response }) => {
        // `context.auditService` is available and fully typed!
        const logCount = context.auditService.getLogCount();
        return response.success({ totalLogs: logCount });
      },
    }),
    ```

By using the plugin system, you've successfully created a modular, self-contained piece of functionality and seamlessly integrated it into your application, complete with its own API and context extensions.