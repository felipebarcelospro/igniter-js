/**
 * Example: MCP Adapter with Automatic Type Inference
 * 
 * This example demonstrates how the MCP adapter automatically infers types
 * from your context function, providing full type safety throughout.
 */

import { Igniter } from '../src';
import { createMcpAdapter } from '../src/adapters/mcp';
import { z } from 'zod';

// Define your application's context types
interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface Database {
  users: {
    findById: (id: string) => Promise<User | null>;
    create: (data: Omit<User, 'id'>) => Promise<User>;
  };
}

// Create Igniter instance
const igniter = Igniter.context<{ user?: User; db: Database }>().create();

// Create a simple controller
const userController = igniter.controller({
  path: '/users',
  actions: {
    get: igniter.query({
      path: '/:id',
      handler: async (ctx) => {
        const user = await ctx.context.db.users.findById(ctx.request.params.id);
        return ctx.response.success({ user });
      }
    }),

    create: igniter.mutation({
      path: '/',
      method: 'POST',
      body: z.object({
        name: z.string(),
        email: z.string().email(),
        roles: z.array(z.string()).default(['user'])
      }),
      handler: async (ctx) => {
        const user = await ctx.context.db.users.create(ctx.request.body);
        return ctx.response.created({ user });
      }
    })
  }
});

// Create router
const router = igniter.router({
  controllers: { users: userController }
});

// 🎯 Example 1: Basic MCP Adapter (uses router's context type)
export const basicMcpHandler = createMcpAdapter(router, {
  serverInfo: { name: "Basic API", version: "1.0.0" },
  
  events: {
    onToolCall: (toolName, args, context) => {
      // ✅ context.context.user is typed as User | undefined
      // ✅ context.context.db is typed as Database
      console.log(`User ${context.context.user?.name} called ${toolName}`);
    }
  }
});

// 🚀 Example 2: Custom Context with Automatic Type Inference
export const advancedMcpHandler = createMcpAdapter(router, {
  serverInfo: { name: "Advanced API", version: "1.0.0" },
  
  // 🎯 Define custom context - types are automatically inferred!
  context: async (request) => {
    // Mock authentication
    const authHeader = request.headers.get('authorization');
    const user = authHeader ? await mockGetUser(authHeader) : undefined;
    
    // Mock database
    const db = mockDatabase();
    
    // ✅ Return type is automatically inferred
    return {
      context: { user, db },
      tools: [], // Auto-populated
      request,
      user, // ✅ This will be typed as User | undefined
      timestamp: Date.now(),
      client: request.headers.get('user-agent') || 'unknown',
      // 🎯 Add custom properties with full typing
      permissions: user?.roles || [],
      isAuthenticated: !!user,
      requestId: Math.random().toString(36)
    };
  },
  
  // 🎯 Instructions with full type inference
  instructions: (context) => `
    You are an AI assistant for the User Management API.
    
    Current user: ${context.user?.name || 'Anonymous'}
    Permissions: ${context.permissions.join(', ') || 'None'}
    Authentication: ${context.isAuthenticated ? 'Authenticated' : 'Guest'}
    Request ID: ${context.requestId}
    
    Available tools: ${context.tools.map(t => t.name).join(', ')}
    
    Guidelines:
    - Always check user permissions before executing actions
    - Provide clear feedback on tool results
    - Log all actions for audit purposes
  `,
  
  // 🎯 Event handlers with full type safety
  events: {
    onToolCall: (toolName, args, context) => {
      // ✅ All properties are fully typed!
      console.log(`🔧 Tool: ${toolName}`, {
        user: context.user?.name, // ✅ User | undefined
        permissions: context.permissions, // ✅ string[]
        authenticated: context.isAuthenticated, // ✅ boolean
        requestId: context.requestId, // ✅ string
        args
      });
    },
    
    onToolSuccess: (toolName, result, duration, context) => {
      console.log(`✅ Success: ${toolName}`, {
        user: context.user?.email, // ✅ Fully typed
        duration,
        timestamp: new Date(context.timestamp).toISOString()
      });
    },
    
    onToolError: (toolName, error, context) => {
      console.error(`❌ Error: ${toolName}`, {
        user: context.user?.id, // ✅ Fully typed
        error: error.message,
        permissions: context.permissions, // ✅ string[]
        requestId: context.requestId // ✅ string
      });
    }
  },
  
  // 🎯 Custom tools with type inference
  tools: {
    custom: [
      {
        name: 'get_user_permissions',
        description: 'Get current user permissions',
        schema: z.object({}),
        handler: async (args, context) => {
          // ✅ context is fully typed with custom properties!
          return {
            content: [
              {
                type: 'text',
                text: `User: ${context.user?.name || 'Anonymous'}
Permissions: ${context.permissions.join(', ') || 'None'}
Authenticated: ${context.isAuthenticated}
Request ID: ${context.requestId}`
              }
            ]
          };
        }
      },
      
      {
        name: 'audit_log',
        description: 'Create an audit log entry',
        schema: z.object({
          action: z.string(),
          details: z.string().optional()
        }),
        handler: async (args, context) => {
          // ✅ Full type safety throughout
          const logEntry = {
            action: args.action,
            details: args.details,
            user: context.user?.id,
            timestamp: context.timestamp,
            requestId: context.requestId,
            permissions: context.permissions
          };
          
          console.log('📝 Audit Log:', logEntry);
          
          return {
            content: [
              {
                type: 'text',
                text: `Audit log created for action: ${args.action}`
              }
            ]
          };
        }
      }
    ]
  },
  
  // 🎯 Response transformation with type safety
  response: {
    transform: (igniterResponse, toolName, context) => {
      return {
        content: [
          {
            type: 'text',
            text: `🛠️ Tool: ${toolName}
👤 User: ${context.user?.name || 'Anonymous'}
🔑 Request ID: ${context.requestId}
📊 Result: ${JSON.stringify(igniterResponse, null, 2)}`
          }
        ]
      };
    },
    
    onError: (error, toolName, context) => ({
      content: [
        {
          type: 'text',
          text: `❌ Error in ${toolName}
👤 User: ${context.user?.name || 'Anonymous'}
🔑 Request ID: ${context.requestId}
🚨 Error: ${error.message}`
        }
      ]
    })
  }
});

// 🎯 Example 3: Multi-tenant with Type Inference
interface Tenant {
  id: string;
  name: string;
  features: string[];
}

export const multiTenantMcpHandler = createMcpAdapter(router, {
  context: async (request) => {
    const tenantId = request.headers.get('x-tenant-id');
    const tenant = tenantId ? await mockGetTenant(tenantId) : undefined;
    const user = await mockGetUser(request.headers.get('authorization') || '');
    
    return {
      context: { user, db: mockDatabase() },
      tools: [],
      request,
      user,
      tenant, // ✅ Typed as Tenant | undefined
      timestamp: Date.now(),
      client: request.headers.get('user-agent') || 'unknown'
    };
  },
  
  instructions: (context) => `
    Multi-tenant API Assistant
    
    Tenant: ${context.tenant?.name || 'No tenant'}
    User: ${context.user?.name || 'Anonymous'}
    Features: ${context.tenant?.features.join(', ') || 'None'}
  `,
  
  events: {
    onToolCall: (toolName, args, context) => {
      // ✅ context.tenant is fully typed as Tenant | undefined
      console.log(`Tenant ${context.tenant?.name} - User ${context.user?.name} called ${toolName}`);
    }
  }
});

// Mock functions for demonstration
async function mockGetUser(authHeader: string): Promise<User | undefined> {
  if (!authHeader || authHeader === 'Bearer invalid') return undefined;
  
  return {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    roles: ['admin', 'user']
  };
}

async function mockGetTenant(tenantId: string): Promise<Tenant | undefined> {
  return {
    id: tenantId,
    name: 'Acme Corp',
    features: ['users', 'billing', 'analytics']
  };
}

function mockDatabase(): Database {
  return {
    users: {
      findById: async (id: string) => ({
        id,
        name: 'Mock User',
        email: 'mock@example.com',
        roles: ['user']
      }),
      create: async (data) => ({
        id: Math.random().toString(36),
        ...data
      })
    }
  };
}

// 🎯 Usage Examples:

// Next.js API Route
// export { advancedMcpHandler as GET, advancedMcpHandler as POST };

// Express.js
// app.use('/api/mcp', advancedMcpHandler);

// Bun
// Bun.serve({ fetch: advancedMcpHandler });

/**
 * 🎉 Key Benefits of Type Inference:
 * 
 * 1. ✅ **Full Type Safety**: All context properties are properly typed
 * 2. ✅ **IntelliSense**: Get autocomplete for context properties
 * 3. ✅ **Compile-time Errors**: Catch type errors before runtime
 * 4. ✅ **Refactoring Safety**: Changes to context types are tracked
 * 5. ✅ **Better DX**: No need to manually specify generic types
 * 6. ✅ **Consistency**: Same types across all event handlers and tools
 */ 