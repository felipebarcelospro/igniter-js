/**
 * Example: Creating an MCP Server with Igniter Router
 * 
 * This example shows how to create an MCP (Model Context Protocol) server
 * using the Igniter Router with security features and event handling.
 */

import { createIgniterRouter, createIgniterController, createIgniterQuery, createIgniterMutation } from '../src';
import { createMcpAdapter } from '../src/adapters/mcp';
import { z } from 'zod';

// Define application context
interface AppContext {
  user?: { id: string; name: string; email: string };
  db: any; // Your database instance
}

// Create some example controllers
const userController = createIgniterController({
  name: 'users',
  path: 'users',
  actions: {
    list: createIgniterQuery({
      path: '/',
      description: 'List all users',
      query: z.object({
        page: z.number().optional(),
        limit: z.number().optional()
      }),
      handler: async (ctx) => {
        const { page = 1, limit = 10 } = ctx.request.query || {};
        
        // Mock user data
        const users = [
          { id: '1', name: 'John Doe', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
        ];
        
        return ctx.response.success({
          users: users.slice((page - 1) * limit, page * limit),
          pagination: { page, limit, total: users.length }
        });
      }
    }),

    get: createIgniterQuery({
      path: '/:id',
      description: 'Get user by ID',
      handler: async (ctx) => {
        const { id } = ctx.request.params;
        
        // Mock user lookup
        const user = { id, name: 'John Doe', email: 'john@example.com' };
        
        return ctx.response.success({ user });
      }
    }),

    create: createIgniterMutation({
      path: '/',
      method: 'POST',
      description: 'Create a new user',
      body: z.object({
        name: z.string(),
        email: z.string().email()
      }),
      handler: async (ctx) => {
        const { name, email } = ctx.request.body;
        
        // Mock user creation
        const user = {
          id: Math.random().toString(36),
          name,
          email,
          createdAt: new Date().toISOString()
        };
        
        return ctx.response.created({ user });
      }
    })
  }
});

const postController = createIgniterController({
  name: 'posts',
  path: 'posts',
  actions: {
    list: createIgniterQuery({
      path: '/',
      description: 'List all posts',
      handler: async (ctx) => {
        // Mock posts data
        const posts = [
          { id: '1', title: 'Hello World', content: 'First post', authorId: '1' },
          { id: '2', title: 'MCP is awesome', content: 'Second post', authorId: '2' }
        ];
        
        return ctx.response.success({ posts });
      }
    }),

    create: createIgniterMutation({
      path: '/',
      method: 'POST',
      description: 'Create a new post',
      body: z.object({
        title: z.string(),
        content: z.string(),
        authorId: z.string()
      }),
      handler: async (ctx) => {
        const { title, content, authorId } = ctx.request.body;
        
        // Mock post creation
        const post = {
          id: Math.random().toString(36),
          title,
          content,
          authorId,
          createdAt: new Date().toISOString()
        };
        
        return ctx.response.created({ post });
      }
    })
  }
});

// Create router with security
const router = createIgniterRouter<AppContext, {
  users: typeof userController;
  posts: typeof postController;
}>({
  basePATH: '/api/v1',
  controllers: {
    users: userController,
    posts: postController
  },
  
  // 🛡️ Built-in security
  security: {
    cors: {
      origins: ['http://localhost:3000', 'https://myapp.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    auth: {
      strategy: 'bearer',
      required: false, // Optional auth for this example
      validate: async (token) => {
        // Mock token validation
        if (token === 'valid-token') {
          return { id: '1', name: 'John Doe', email: 'john@example.com' };
        }
        return null;
      }
    }
  },
  
  // Context creation
  context: async (request) => {
    return {
      db: {}, // Your database connection
      user: undefined // Will be set by auth middleware
    };
  }
});

// 🎯 Create MCP Adapter with full configuration
export const mcpHandler = createMcpAdapter(router, {
  // 📝 Server Info
  serverInfo: {
    name: 'My App MCP Server',
    version: '1.0.0'
  },
  
  // 🤖 Dynamic Instructions
  instructions: (context) => `
    You are an AI assistant for My App.
    
    Available tools: ${context.tools.map(t => t.name).join(', ')}
    
    You can:
    - List and get users
    - Create new users
    - List and create posts
    
    Current user: ${context.user?.name || 'Anonymous'}
    Timestamp: ${new Date(context.timestamp).toISOString()}
  `,
  
  // 🔧 Tool Configuration
  tools: {
    autoMap: true,
    
    // Custom naming strategy
    naming: (controller, action) => `${controller}_${action}`,
    
    // Filter out admin actions
    filter: (controller, action, actionConfig) => {
      return !actionConfig.path.includes('admin');
    },
    
    // Transform descriptions
    transform: (controller, action, actionConfig) => ({
      name: `${controller}_${action}`,
      description: `${actionConfig.description} [${controller}]`,
      schema: actionConfig.body || actionConfig.query,
      tags: [controller, actionConfig.method?.toLowerCase()]
    }),
    
    // Custom tools
    custom: [
      {
        name: 'get_current_time',
        description: 'Get the current server time',
        schema: z.object({}),
        handler: async () => ({
          content: [
            {
              type: 'text',
              text: `Current server time: ${new Date().toISOString()}`
            }
          ]
        })
      },
      {
        name: 'health_check',
        description: 'Check server health status',
        schema: z.object({}),
        handler: async () => ({
          content: [
            {
              type: 'text',
              text: 'Server is healthy and running!'
            }
          ]
        })
      }
    ]
  },
  
  // 🎪 Event Handling
  events: {
    onToolCall: (toolName, args, context) => {
      console.log(`🔧 Tool called: ${toolName}`, {
        args,
        user: context.user?.name || 'Anonymous',
        timestamp: new Date(context.timestamp).toISOString()
      });
    },
    
    onToolSuccess: (toolName, result, duration, context) => {
      console.log(`✅ Tool success: ${toolName} completed in ${duration}ms`);
    },
    
    onToolError: (toolName, error, context) => {
      console.error(`❌ Tool error: ${toolName}`, {
        error: error.message,
        user: context.user?.name || 'Anonymous'
      });
    },
    
    onRequest: (request, context) => {
      console.log(`📥 MCP Request from ${context.client}`);
    },
    
    onResponse: (response, context) => {
      console.log(`📤 MCP Response sent to ${context.client}`);
    }
  },
  
  // 🔄 Context Creation
  context: async (request) => {
    const user = request.headers.get('authorization') === 'Bearer valid-token'
      ? { id: '1', name: 'John Doe', email: 'john@example.com' }
      : undefined;
    
    return {
      context: { user, db: {} },
      tools: [], // Will be populated automatically
      request,
      user,
      timestamp: Date.now(),
      client: request.headers.get('user-agent') || 'unknown'
    };
  },
  
  // 🔄 Response Transformation
  response: {
    transform: (igniterResponse, toolName, context) => {
      // Custom response formatting
      return {
        content: [
          {
            type: 'text',
            text: `Tool: ${toolName}\nResult: ${JSON.stringify(igniterResponse, null, 2)}`
          }
        ]
      };
    },
    
    onError: (error, toolName, context) => ({
      content: [
        {
          type: 'text',
          text: `Error in ${toolName}: ${error.message}\nUser: ${context.user?.name || 'Anonymous'}`
        }
      ]
    })
  },
  
  // ⚙️ Adapter Options
  adapter: {
    basePath: '/api/mcp',
    maxDuration: 60,
    verboseLogs: true,
    redis: {
      url: process.env.REDIS_URL,
      keyPrefix: 'mcp:'
    }
  }
});

// 🚀 Export for Next.js API Route
// Usage in app/api/mcp/route.ts:
// export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE };

// 📝 Simple Usage Examples:

// 1. Zero Config
export const simpleHandler = createMcpAdapter(router);

// 2. Basic Config
export const basicHandler = createMcpAdapter(router, {
  serverInfo: { name: "My API", version: "1.0.0" },
  instructions: "Tools for managing users and posts"
});

// 3. With Events
export const eventHandler = createMcpAdapter(router, {
  serverInfo: { name: "My API", version: "1.0.0" },
  events: {
    onToolCall: (name, args) => console.log(`Called: ${name}`, args),
    onToolError: (name, error) => console.error(`Error: ${name}`, error)
  }
});

// 4. With Custom Context
export const contextHandler = createMcpAdapter(router, {
  instructions: (ctx) => `You have access to ${ctx.tools.length} tools for ${ctx.user?.name}`,
  context: async (req) => ({
    context: { user: await getUser(req), db: {} },
    tools: [],
    request: req,
    user: await getUser(req),
    timestamp: Date.now(),
    client: req.headers.get('user-agent') || 'unknown'
  })
});

async function getUser(req: Request) {
  // Mock user extraction
  return req.headers.get('authorization') ? { id: '1', name: 'John' } : undefined;
} 