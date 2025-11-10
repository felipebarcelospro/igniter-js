import { Code2, Database, Lock, Mail, Upload, Zap, Bot, Puzzle } from "lucide-react";
import { z } from "zod";

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  icon: typeof Code2;
  filePath: string;
  code: string;
}

export interface ComingSoonFeature {
  title: string;
  description: string;
  icon: typeof Lock;
}

export const codeExamples: CodeExample[] = [
  {
    id: "controller",
    title: "Controllers",
    description: "Type-safe API endpoints with automatic validation",
    icon: Code2,
    filePath: "src/features/users/controllers/users.controller.ts",
    code: `export const userController = igniter.controller({
  path: '/users',
  actions: {
    getUser: igniter.query({
      path: '/:id' as const,
      handler: async ({ request, response, context, query }) => {
        const user = await context.db.user.findUnique({
          where: { id: query.id }
        });

        if (!user) return response.notFound('User not found.');

        return response.success(user);
      },
    }),
    createUser: igniter.mutate({
      path: '/' as const,
      body: z.object({
        name: z.string(),
        email: z.string().email()
      }),
      handler: async ({ request, response, context, body }) => {
        const user = await context.db.user.create({
          data: body
        });

        return response.success(user);
      },
    }),
  }
})`
  },
  {
    id: "procedure",
    title: "Procedures (Middleware)",
    description: "Reusable middleware for authentication, validation, and more",
    icon: Zap,
    filePath: "src/features/users/procedures/auth.procedure.ts",
    code: `export const auth = igniter.procedure({
  handler: async (options: AuthOptions, { response, context }) => {
    const user = await getCurrentUser(context.env.SECRET);

    // If auth is required but there's no user, return an unauthorized error.
    if (options.isAuthRequired && !user) {
      return response.unauthorized('Authentication required.');
    }

    // The returned object is merged into the context.
    // Now, context.auth.user will be available in our controller.
    return {
      auth: { user },
    };
  },
});

// Usage in controller
export const userController = igniter.controller({
  path: '/users',
  actions: {
    getCurrentUser: igniter.query({
      path: '/me',
      // Use the procedure - TypeScript knows context.auth.user is available!
      use: [auth({ isAuthRequired: true })],
      handler: async ({ response, context }) => {
        // Fully type-safe user object from Auth Procedure
        return response.success(context.auth.user);
      },
    }),
  }
})`
  },
  {
    id: "client",
    title: "Type-Safe Client",
    description: "Fully typed client with React hooks for seamless integration",
    icon: Code2,
    filePath: "src/features/user/presentation/components/user-profile.tsx",
    code: `import { api } from './igniter.client';

function UserProfile({ userId }: { userId: string }) {
  const currentUser = api.user.getCurrentUser.useQuery({
    enabled: !!userId,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log('Successfully fetched current user:', data);
    },
    onError: (error) => {
      console.error('Error fetching current user:', error);
    },
  });

  if (currentUser.isLoading) return <div>Loading user...</div>;
  if (currentUser.isError) {
    return <div>Error: {currentUser.error.message}</div>;
  }

  return (
    <div>
      <h1>{currentUser.data.name}</h1>
      <p>{currentUser.data.email}</p>
    </div>
  );
}`
  },
  {
    id: "jobs",
    title: "Queues",
    description: "Reliable job processing with BullMQ integration",
    icon: Database,
    filePath: "src/services/jobs.ts",
    code: `export const registeredJobs = jobs.merge({
  // Defines a group of jobs related to emails
  emails: jobs.router({
    jobs: {
      // Registers the 'sendWelcome' job
      sendWelcome: jobs.register({
        name: 'sendWelcome',
        input: z.object({
          userId: z.string(),
          email: z.string().email()
        }),
        handler: async ({ input, context }) => {
          // Send welcome email
          await context.emailService.send({
            to: input.email,
            template: 'welcome',
            data: { userId: input.userId }
          });
          
          console.log(\`Welcome email sent to \${input.email}\`);
        }
      })
    }
  })
});

// Enqueue the job with type safety
await igniter.jobs.emails.enqueue({
  task: 'sendWelcome',
  input: {
    userId: '123',
    email: 'user@example.com'
  }
});`
  },
  {
    id: "events",
    title: "Pub/Sub",
    description: "Backend Pub/Sub messaging for distributed services using Redis",
    icon: Zap,
    filePath: "src/features/user/controllers/user.controller.ts",
    code: `export const userController = igniter.controller({
  path: '/users',
  actions: {
    createUser: igniter.mutate({
      path: '/' as const,
      body: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      handler: async ({ body, context, response }) => {
        const user = await context.db.user.create({
          data: body,
        });

        // Publish event for other services
        await igniter.store.publish('user.created', {
          id: user.id,
          name: user.name,
          email: user.email,
          timestamp: new Date().toISOString(),
        });

        return response.success(user);
      },
    }),
  }
});

// Subscribe to events in other services
igniter.store.subscribe('user.created', async (data) => {
  console.log(\`New user: \${data.name} (\${data.email})\`);
  // Send welcome email, update CRM, etc.
});

// Wildcard subscriptions
igniter.store.subscribe('user.*', (data, channel) => {
  console.log(\`Event on \${channel}:\`, data);
});`
  },
  {
    id: "caching",
    title: "Caching",
    description: "Redis-powered caching for optimal performance",
    icon: Database,
    filePath: "src/features/user/controllers/user.controller.ts",
    code: `export const userController = igniter.controller({
  path: '/users',
  actions: {
    getById: igniter.query({
      path: '/:id' as const,
      handler: async ({ query, response, context }) => {
        const cacheKey = \`user:\${query.id}\`;

        // Try cache first
        const cached = await igniter.store.get(cacheKey);
        if (cached) {
          return response.success(JSON.parse(cached));
        }

        // Fetch from database
        const user = await context.db.user.findUnique({
          where: { id: query.id }
        });

        if (!user) return response.notFound('User not found');

        // Cache for 1 hour
        await igniter.store.set(
          cacheKey,
          JSON.stringify(user),
          { ttl: 3600 }
        );

        return response.success(user);
      },
    }),
    update: igniter.mutate({
      path: '/:id' as const,
      body: z.object({
        name: z.string(),
        email: z.string().email()
      }),
      handler: async ({ query, body, response, context }) => {
        const user = await context.db.user.update({
          where: { id: query.id },
          data: body
        });

        // Invalidate cache
        await igniter.store.del(\`user:\${query.id}\`);

        return response.success(user);
      },
    }),
  }
})`
  },
  {
    id: "mcp-server",
    title: "MCP Server",
    description: "Expose your API as AI-native tools for Code Agents via Model Context Protocol",
    icon: Puzzle,
    filePath: "src/app/api/mcp/[...transport]/route.ts",
    code: `import { IgniterMcpServer } from '@igniter-js/adapter-mcp-server';
import { AppRouter } from '@/igniter.router';

// Create MCP server - exposes your entire API as AI tools
const { handler } = IgniterMcpServer
  .create()
  .router(AppRouter)
  .withServerInfo({
    name: 'My App MCP Server',
    version: '1.0.0',
  })
  .withInstructions(
    "Use these tools to manage users, posts, and comments."
  )
  .addTool({
    name: 'analyze-user-activity',
    description: 'Analyze user activity patterns',
    args: {
      userId: z.string(),
      days: z.number().default(30)
    },
    handler: async (args, context) => {
      const activity = await analyzeActivity(args.userId, args.days);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(activity, null, 2)
        }]
      };
    }
  })
  .build();

// AI agents can now call your API as native functions
export const GET = handler;
export const POST = handler;`
  },
  {
    id: "bot",
    title: "Bots",
    description: "Build chatbots for Telegram, WhatsApp, and more with unified API",
    icon: Bot,
    filePath: "src/services/bot.ts",
    code: `import { Bot, telegram, whatsapp } from '@igniter-js/bot';

export const bot = Bot.create({
  id: 'support-bot',
  name: 'Support Bot',
  adapters: {
    telegram: telegram({
      token: process.env.TELEGRAM_TOKEN!,
      handle: '@support_bot',
      webhook: {
        url: process.env.TELEGRAM_WEBHOOK_URL!,
      }
    }),
    whatsapp: whatsapp({
      token: process.env.WHATSAPP_TOKEN!,
      phone: process.env.WHATSAPP_PHONE_ID!,
      handle: 'support'
    })
  },
  commands: {
    start: {
      name: 'start',
      description: 'Get started with the bot',
      async handle(ctx) {
        await ctx.bot.send({
          provider: ctx.provider,
          channel: ctx.channel.id,
          content: { 
            type: 'text', 
            content: '👋 Welcome! How can I help you?' 
          }
        });
      }
    },
    status: {
      name: 'status',
      aliases: ['health'],
      description: 'Check system status',
      async handle(ctx) {
        const status = await checkSystemHealth();
        await ctx.bot.send({
          provider: ctx.provider,
          channel: ctx.channel.id,
          content: { 
            type: 'text', 
            content: \`✅ System Status: \${status}\`
          }
        });
      }
    }
  },
  on: {
    message: async (ctx) => {
      if (ctx.message.content?.type === 'text') {
        console.log('[message]', ctx.message.content.raw);
      }
    }
  }
});

// Use in Next.js API route
export async function POST(req: Request) {
  return bot.handle('telegram', req);
}`
  },
  {
    id: "context",
    title: "Context System",
    description: "Dependency injection and shared application state",
    icon: Code2,
    filePath: "src/igniter.context.ts",
    code: `import { PrismaClient } from '@prisma/client';

export const createContext = async () => {
  const db = new PrismaClient();

  return {
    db,
    
    // Services
    emailService: new EmailService(),
    storageService: new StorageService(),
    
    // Environment variables
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      SECRET: process.env.SECRET
    }
  };
};

// Available in all controllers and procedures
export const igniter = Igniter
  .context<Awaited<ReturnType<typeof createContext>>>()
  .create();`
  }
];

export const comingSoonFeatures: ComingSoonFeature[] = [
  {
    title: "Authentication",
    description: "Built-in auth with multiple providers",
    icon: Lock
  },
  {
    title: "Notifications & Mail",
    description: "Email, SMS, and push notification system",
    icon: Mail
  },
  {
    title: "File Storage",
    description: "Cloud storage integration with type safety",
    icon: Upload
  }
];
