# 🚀 Igniter MCP Adapter

Transform your Igniter Router into a powerful **Model Context Protocol (MCP) server** that can be used by AI models like Claude, Cursor, and other MCP-compatible clients.

## 🎯 What is MCP?

**Model Context Protocol (MCP)** is a standard interface that lets large language models (LLMs) communicate with external tools and data sources. Think of it as a way to give AI models access to your APIs and services.

## ⚡ Quick Start

### 1. Zero Configuration

```typescript
import { createIgniterRouter, createMcpAdapter } from '@igniter-js/core';

const router = createIgniterRouter({
  controllers: { users: userController }
});

// Just works! 🚀
const handler = createMcpAdapter(router);
export { handler as GET, handler as POST };
```

## 🎯 Automatic Type Inference

**New!** The MCP adapter now automatically infers types from your context function, providing full type safety without manual generics:

### Before (Manual Types):
```typescript
// ❌ Manual type specification
const handler = createMcpAdapter<MyContext>(router, {
  events: {
    onToolCall: (name, args, context) => {
      // context.user - Type unknown, no IntelliSense
    }
  }
});
```

### After (Automatic Inference):
```typescript
// ✅ Automatic type inference
const handler = createMcpAdapter(router, {
  context: async (request) => ({
    context: { user: await getUser(request), db: getDB() },
    tools: [],
    request,
    user: await getUser(request), // ✅ Fully typed!
    timestamp: Date.now(),
    permissions: ['read', 'write'] // ✅ Fully typed!
  }),
  
  events: {
    onToolCall: (name, args, context) => {
      // ✅ context.user is fully typed with IntelliSense!
      // ✅ context.permissions is string[]!
      console.log(`User ${context.user?.name} called ${name}`);
    }
  }
});
```

### Multi-tenant Example:
```typescript
const handler = createMcpAdapter(router, {
  context: async (request) => {
    const tenant = await getTenant(request.headers.get('x-tenant-id'));
    const user = await getUser(request);
    
    return {
      context: { user, db: getDB() },
      tools: [],
      request,
      user,        // ✅ User | undefined
      tenant,      // ✅ Tenant | undefined  
      timestamp: Date.now(),
      requestId: crypto.randomUUID()
    };
  },
  
  instructions: (context) => `
    Tenant: ${context.tenant?.name || 'No tenant'}
    User: ${context.user?.name || 'Anonymous'}
    Features: ${context.tenant?.features.join(', ') || 'None'}
  `, // ✅ All properties fully typed!
  
  tools: {
    custom: [
      {
        name: 'audit_log',
        description: 'Create audit log',
        schema: z.object({ action: z.string() }),
        handler: async (args, context) => {
          // ✅ context.tenant.features is string[]!
          // ✅ context.user.roles is string[]!
          return auditLog(args.action, context.user, context.tenant);
        }
      }
    ]
  }
});
```

**Benefits:**
- ✅ **Full Type Safety**: All context properties are properly typed
- ✅ **IntelliSense**: Get autocomplete for context properties
- ✅ **Compile-time Errors**: Catch type errors before runtime
- ✅ **Refactoring Safety**: Changes to context types are tracked
- ✅ **Better DX**: No need to manually specify generic types

### 2. Basic Configuration

```typescript
const handler = createMcpAdapter(router, {
  serverInfo: { name: "My API", version: "1.0.0" },
  instructions: "Tools for managing users and posts"
});
```

### 3. Full Configuration

```typescript
const handler = createMcpAdapter(router, {
  serverInfo: { name: "My API", version: "1.0.0" },
  instructions: (ctx) => `You have ${ctx.tools.length} tools available`,
  events: {
    onToolCall: (name, args) => console.log(`🔧 ${name}`, args),
    onToolError: (name, error) => console.error(`❌ ${name}`, error)
  }
});
```

## 🛡️ Security First

Security is handled at the **router level**, not in the MCP adapter:

```typescript
const router = createIgniterRouter({
  controllers: { users: userController },
  
  // 🛡️ Built-in security
  security: {
    cors: {
      origins: ['http://localhost:3000'],
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    },
    auth: {
      strategy: 'bearer',
      validate: async (token) => validateJWT(token)
    }
  }
});

// MCP adapter inherits all security 🔒
const handler = createMcpAdapter(router);
```

## 🔧 Tool Configuration

### Auto-mapping Actions

By default, all router actions become MCP tools:

```typescript
// Router actions
const userController = createIgniterController({
  actions: {
    list: createIgniterQuery({ path: '/', description: 'List users' }),
    get: createIgniterQuery({ path: '/:id', description: 'Get user by ID' }),
    create: createIgniterMutation({ path: '/', method: 'POST' })
  }
});

// Becomes MCP tools: users.list, users.get, users.create
```

### Custom Tool Configuration

```typescript
const handler = createMcpAdapter(router, {
  tools: {
    // Custom naming
    naming: (controller, action) => `${controller}_${action}`,
    
    // Filter tools
    filter: (controller, action, config) => !config.path.includes('admin'),
    
    // Transform descriptions
    transform: (controller, action, config) => ({
      name: `${controller}_${action}`,
      description: `${config.description} [${controller}]`,
      tags: [controller]
    }),
    
    // Add custom tools
    custom: [
      {
        name: 'get_time',
        description: 'Get current server time',
        schema: z.object({}),
        handler: async () => ({ 
          content: [{ type: 'text', text: new Date().toISOString() }] 
        })
      }
    ]
  }
});
```

## 🎪 Event Handling

Track tool usage and errors:

```typescript
const handler = createMcpAdapter(router, {
  events: {
    onToolCall: (toolName, args, context) => {
      // Analytics
      analytics.track('mcp_tool_call', { 
        tool: toolName, 
        user: context.user?.id 
      });
    },
    
    onToolSuccess: (toolName, result, duration) => {
      console.log(`✅ ${toolName} completed in ${duration}ms`);
    },
    
    onToolError: (toolName, error, context) => {
      // Error tracking
      errorTracker.capture(error, { 
        tool: toolName, 
        user: context.user?.id 
      });
      
      // Slack notifications
      if (error.severity === 'critical') {
        slack.notify(`🚨 Critical error in ${toolName}: ${error.message}`);
      }
    }
  }
});
```

## 🔄 Dynamic Instructions

Create context-aware instructions:

```typescript
const handler = createMcpAdapter(router, {
  instructions: (context) => `
    You are an AI assistant for ${process.env.APP_NAME}.
    
    Available tools: ${context.tools.map(t => t.name).join(', ')}
    
    Current user: ${context.user?.name || 'Anonymous'}
    Permissions: ${context.user?.roles?.join(', ') || 'None'}
    
    Guidelines:
    - Always verify user permissions before executing actions
    - Provide clear feedback on tool results
    - Handle errors gracefully
  `
});
```

## 🔄 Response Transformation

Customize how responses are formatted:

```typescript
const handler = createMcpAdapter(router, {
  response: {
    transform: (igniterResponse, toolName, context) => {
      // Custom formatting
      if (igniterResponse.error) {
        return {
          content: [
            { 
              type: 'text', 
              text: `❌ Error in ${toolName}: ${igniterResponse.error.message}` 
            }
          ]
        };
      }
      
      return {
        content: [
          { 
            type: 'text', 
            text: `✅ ${toolName} succeeded:\n${JSON.stringify(igniterResponse.data, null, 2)}` 
          }
        ]
      };
    },
    
    onError: (error, toolName, context) => ({
      content: [
        { 
          type: 'text', 
          text: `🚨 ${toolName} failed: ${error.message}\nUser: ${context.user?.name}` 
        }
      ]
    })
  }
});
```

## 🔗 Context Creation

Provide custom context for tools:

```typescript
const handler = createMcpAdapter(router, {
  context: async (request) => {
    const user = await getUserFromToken(request.headers.get('authorization'));
    const permissions = await getUserPermissions(user?.id);
    
    return {
      context: { user, db: getDatabase() },
      tools: [], // Auto-populated
      request,
      user,
      permissions,
      timestamp: Date.now(),
      client: request.headers.get('user-agent')
    };
  }
});
```

## 📦 Next.js Integration

### 1. Create API Route

```typescript
// app/api/mcp/route.ts
import { mcpHandler } from '@/lib/mcp-server';

export { mcpHandler as GET, mcpHandler as POST, mcpHandler as DELETE };
```

### 2. Environment Variables

```bash
# .env.local
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### 3. Test Locally

```bash
# Start your Next.js app
npm run dev

# Test MCP server
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

## 🔌 Connect to MCP Clients

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "my-app": {
      "url": "https://your-app.vercel.app/api/mcp"
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-app": {
      "command": "npx",
      "args": ["mcp-remote", "-y", "https://your-app.vercel.app/api/mcp"]
    }
  }
}
```

## 🚀 Deployment

### Vercel

```typescript
// vercel.json
{
  "functions": {
    "app/api/mcp/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Environment Setup

```bash
# Production environment variables
REDIS_URL=redis://your-redis-instance
JWT_SECRET=your-production-secret
CORS_ORIGINS=https://your-frontend.com
RATE_LIMIT_MAX=1000
```

## 🎨 Advanced Examples

### Multi-tenant MCP Server

```typescript
const handler = createMcpAdapter(router, {
  context: async (request) => {
    const tenantId = request.headers.get('x-tenant-id');
    const tenant = await getTenant(tenantId);
    
    return {
      context: { tenant, db: getTenantDatabase(tenantId) },
      tools: await getTenantTools(tenantId),
      request,
      tenant,
      timestamp: Date.now()
    };
  },
  
  tools: {
    filter: (controller, action, config) => {
      // Filter tools based on tenant permissions
      return tenant.permissions.includes(`${controller}.${action}`);
    }
  }
});
```

### Audit Logging

```typescript
const handler = createMcpAdapter(router, {
  events: {
    onToolCall: async (toolName, args, context) => {
      await auditLog.create({
        action: 'mcp_tool_call',
        tool: toolName,
        user: context.user?.id,
        tenant: context.tenant?.id,
        args: sanitizeArgs(args),
        timestamp: new Date(),
        ip: context.request.headers.get('x-forwarded-for')
      });
    }
  }
});
```

## 🔍 Debugging

Enable verbose logging:

```typescript
const handler = createMcpAdapter(router, {
  adapter: {
    verboseLogs: true
  },
  
  events: {
    onToolCall: (name, args) => console.log(`🔧 ${name}:`, args),
    onToolSuccess: (name, result, duration) => console.log(`✅ ${name}: ${duration}ms`),
    onToolError: (name, error) => console.error(`❌ ${name}:`, error)
  }
});
```

## 📊 Monitoring

Track MCP usage:

```typescript
const handler = createMcpAdapter(router, {
  events: {
    onToolCall: (toolName, args, context) => {
      metrics.increment('mcp.tool.calls', {
        tool: toolName,
        user: context.user?.id || 'anonymous'
      });
    },
    
    onToolError: (toolName, error, context) => {
      metrics.increment('mcp.tool.errors', {
        tool: toolName,
        error: error.constructor.name
      });
    }
  }
});
```

## 🤝 Best Practices

1. **Security First**: Always configure authentication and rate limiting
2. **Clear Descriptions**: Provide detailed tool descriptions for better AI understanding
3. **Error Handling**: Implement comprehensive error handling and logging
4. **Performance**: Use caching and optimize database queries
5. **Monitoring**: Track tool usage and performance metrics
6. **Testing**: Test your MCP server with actual AI clients

## 🔗 Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [@vercel/mcp-adapter](https://github.com/vercel/mcp-adapter)
- [Igniter Documentation](https://igniter.dev)
- [Example Project](./mcp-server.ts)

---

**Ready to give your AI models superpowers? Start building with Igniter MCP Adapter today!** 🚀 