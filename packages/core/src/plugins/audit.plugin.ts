import { createIgniterPlugin, createIgniterPluginAction } from "../types/plugin.interface";
import { z } from "zod";

/**
 * Audit Plugin - Example plugin for testing the plugin system
 *
 * Provides audit logging capabilities with self-referential actions
 */

export interface AuditEvent {
  action: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

type AuditContext = {
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export const audit = createIgniterPlugin<AuditContext>({
  name: "audit",
  $meta: {
    version: "1.0.0",
    description: "Audit logging plugin with self-referential capabilities",
  },
  $config: {},

  // Type-safe plugin actions using factories
  $actions: {
    create: createIgniterPluginAction({
      name: "create",
      description: "Log an audit event",
      input: z.object({
        action: z.string(),
        userId: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      }),
      handler: async ({ context, input }) => {
        const event: AuditEvent = {
          action: input.action,
          userId: input.userId,
          timestamp: new Date(),
          metadata: input.metadata,
        };

        console.log(`[AuditPlugin] Logging event:`, event);
        
        return {
          success: true,
          eventId: crypto.randomUUID(),
          timestamp: event.timestamp,
        };
      },
    }),

    store: createIgniterPluginAction({
      name: "store",
      description: "Store audit event internally",
      input: z.object({
        event: z.object({
          action: z.string(),
          userId: z.string().optional(),
          timestamp: z.date(),
          metadata: z.record(z.any()).optional(),
        }),
      }),
      handler: async ({ context, input }) => {
        console.log(`[AuditPlugin] Storing event:`, input.event);
        
        return {
          stored: true,
          totalUserLogs: 2, // Mock data
        };
      },
    }),

    getUserLogs: createIgniterPluginAction({
      name: "getUserLogs", 
      description: "Get user audit logs",
      input: z.object({
        userId: z.string(),
        limit: z.number().optional().default(10),
        offset: z.number().optional().default(0),
      }),
      handler: async ({ context, input }) => {
        // Mock data for demonstration
        const mockLogs: AuditEvent[] = [
          {
            action: "user:login",
            userId: input.userId,
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            metadata: { ip: "192.168.1.1" },
          },
          {
            action: "user:profile_update", 
            userId: input.userId,
            timestamp: new Date(Date.now() - 1800000), // 30 mins ago
            metadata: { fields: ["email", "name"] },
          },
        ];

        return {
          logs: mockLogs.slice(input.offset || 0, (input.offset || 0) + (input.limit || 10)),
          total: mockLogs.length,
          userId: input.userId,
        };
      },
    }),
  },

  // Plugin controllers with correct PluginControllerAction structure
  $controllers: {
    logs: {
      path: "/logs",
      method: "POST" as const,
      body: z.object({
        action: z.string(),
        metadata: z.record(z.any()).optional(),
      }),
      handler: async ({ request, context, self }) => {
        const event: AuditEvent = {
          action: request.body.action,
          userId: self.context.userId,
          timestamp: new Date(),
          metadata: request.body.metadata,
        };

        // Self-referential: Use own actions
        await self.actions.store({ event });
        await self.emit("audit:logged", event);

        return {
          success: true,
          eventId: crypto.randomUUID(),
          timestamp: event.timestamp,
        };
      },
    },

    getUserLogs: {
      path: "/user/:userId",
      method: "GET" as const,
      query: z
        .object({
          limit: z.string().transform(Number).optional(),
          offset: z.string().transform(Number).optional(),
        })
        .optional(),
      handler: async ({ request, context, self }) => {
        const userId = (request.params as { userId: string }).userId;
        const limit = request.query?.limit || 10;
        const offset = request.query?.offset || 0;

        // Self-referential: Use own actions
        const result = await self.actions.getUserLogs({
          userId,
          limit: typeof limit === "number" ? limit : 10,
          offset: typeof offset === "number" ? offset : 0,
        });

        return result;
      },
    },

    analytics: {
      path: "/analytics/summary",
      method: "GET" as const,
      query: z
        .object({
          period: z.enum(["day", "week", "month"]).optional(),
        })
        .optional(),
      handler: async ({ request, context, self }) => {
        const userId = self.context.userId || "anonymous";
        
        // Self-referential: Get user logs to calculate analytics
        const userLogs = await self.actions.getUserLogs({ userId });

        return {
          period: request.query?.period || "day",
          totalEvents: userLogs.logs.length,
          userId,
          lastActivity: userLogs.logs[0]?.timestamp || null,
        };
      },
    },
  },

  // Plugin events
  $events: {
    emits: {},
    listens: {},
  },

  // Plugin registration metadata
  registration: {
    discoverable: true,
    version: "1.0.0",
    requiresFramework: "0.1.0",
    category: ["logging", "audit"],
    author: "Igniter Team",
    repository: "https://github.com/igniter-js/igniter",
    documentation: "https://docs.igniter-js.dev/plugins/audit",
  },

  // Plugin dependencies
  dependencies: {
    requires: [], // No dependencies
    provides: ["audit", "logging"],
    conflicts: [], // No conflicts
  },

  // Plugin lifecycle hooks with self-reference
  hooks: {
    /**
     * Plugin initialization hook.
     * 
     * This must be compatible with the generic PluginSelfContext<any, any> type for type-safety.
     * To ensure compatibility, cast `self` to the correct type inside the function body.
     */
    init: async (context, self) => {
      console.log(`[AuditPlugin] Initialized with context:`, {
        userId: self.context.userId,
        sessionId: self.context.sessionId,
      });

      // Self-referential: Log plugin initialization
      await self.actions.create({
        action: "plugin:audit:initialized",
        metadata: {
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        },
      });
    },

    beforeRequest: async (context, request, self) => {
      // Self-referential: Log request start
      await self.actions.create({
        action: "request:started",
        metadata: {
          path: request.url,
          method: request.method,
          userId: self.context.userId,
        },
      });
    },

    afterRequest: async (context, request, response, self) => {
      // Self-referential: Log request completion
      await self.actions.create({
        action: "request:completed",
        metadata: {
          path: request.url,
          method: request.method,
          status: response.status,
          userId: self.context.userId,
        },
      });
    },

    error: async (context, error, self) => {
      // Self-referential: Log errors
      await self.actions.create({
        action: "request:error",
        metadata: {
          error: error.message,
          stack: error.stack,
          userId: self.context.userId,
        },
      });
    },

    // Context extension hook
    extendContext: async (baseContext: any) => ({
      audit: {
        userId: baseContext.user?.id,
        sessionId: baseContext.session?.id,
        requestId: baseContext.request?.id || crypto.randomUUID(),
      },
    }),
  },

  // Plugin middleware (empty for now)
  middleware: {
    global: [],
    routes: {
      "*": [],
    },
  },

  // Plugin resources
  resources: {
    resources: [],
    cleanup: async (context) => {
      console.log("[AuditPlugin] Cleaning up resources");
    },
  },
});
