"use client";

import { CodeBlock, CodeBlockContent, CodeBlockHeader, ConnectedCodeBlockContent } from "@/components/ui/code-block";
import { motion } from "framer-motion";
import { ChevronRight, Code2, Database, Lock, Mail, Upload, Zap } from "lucide-react";
import React from "react";

const codeExamples = [
  {
    id: "controller",
    title: "Controllers",
    description: "Type-safe API endpoints with automatic validation",
    icon: Code2,
    code: `// features/users/controllers/users.controller.ts
export const userController = igniter.controller({
  path: '/users',
  actions: {
    getUser: igniter.query({
      path: '/:id' as const,
      handler: async ({ request, response, context, query }) => {
        const user = await context.db.user.findUnique({
          where: { id: input.id }
        });

        if (!user) {
          throw new Error('User not found');
        }

        return user;
      },
    }),
    createUser: igniter.muate({
      path: '/' as const,
      body: z.object({
        name: z.string(),
        email: z.string().email()
      })
      handler: async ({ request, response, context, query }) => {
        return await context.db.user.create({
          data: input
        });
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
    code: `// procedures/auth.procedure.ts
export const auth = igniter.procedure({
  handler: async (options: AuthOptions, { response }) => {
    const user = await getCurrentUser();

    // If auth is required but there's no user, return an unauthorized error.
    // This stops the request from proceeding further.
    if (options.isAuthRequired && !user) {
      return response.unauthorized('Authentication required.');
    }

    // The returned object is merged into the context.
    // Now, context.auth.user will be available in our controller.
    return {
      auth: {
        user,
      },
    };
  },
});

// Usage in controller
export const userController = igniter.controller({
  path: '/users',
  actions: {
    getCurrentUser: igniter.query({
      path: '/',
      // Use the procedure created in the previous step.
      // TypeScript knows that context.auth.user is now available!
      use: [auth({ isAuthRequired: true })],
      handler: async ({ request, response, context, query }) => {
        // You can get fully type-safety user object from Auth Procedure
        const user = context.auth.user

        // Return current session user
        return response.success(user);
      },
    }),
  }
})
` },
  {
    id: "client",
    title: "Frontend Client",
    description: "Fully typed client with React hooks for seamless integration",
    icon: Code2,
    code: `// Frontend usage with React
import { api } from './igniter.client';

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
  if (currentUser.isError) return <div>Error to load user: {postsQuery.error.message}</div>;

  return (
    <div>
      <h1>{currentUser?.name}</h1>
      <p>{currentUser?.email}</p>
    </div>
  );
}`
  },
  {
    id: "jobs",
    title: "Background Jobs",
    description: "Reliable job processing with BullMQ integration",
    icon: Database,
    code: `// src/services/jobs.ts

// Creates a set of registered jobs, using the merge method to add new jobs
export const registeredJobs = jobs.merge({
  // Defines a group of jobs related to emails
  emails: jobs.router({
    jobs: {
      // Registers the 'sendWelcome' job
      sendWelcome: jobs.register({
        name: 'sendWelcome', // Job name
        input: z.object({
          message: z.string() // Defines the input format using Zod (type validation)
        }),
        handler: async ({ input }) => {
          // Function to be executed when the job runs
          console.log(input.message) // Displays the received message in the console
        }
      })
    }
  })
})

// Enqueues the 'sendWelcome' job for execution, ensuring type safety
await igniter.jobs.emails.enqueue({
  task: 'sendWelcome', // Name of the job to be executed
  input: {
    userId: '123' // Input passed to the job (note: schema expects 'message', not 'userId')
  }
});`
  },
  {
    id: "events",
    title: "Pub/Sub Messaging",
    description: "Backend Pub/Sub messaging for distributed services using Redis.",
    icon: Zap,
    code: `// src/features/user/controllers/user.controller.ts
export const userController = igniter.controller({
  path: '/users',
  actions: {
    createUser: igniter.mutate({
      path: '/' as const,
      body: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      handler: async ({ input, context }) => {
        const user = await context.db.user.create({
          data: input,
        });

        // Publish an event via Igniter Store (backed by Redis)
        // This event can be consumed by other services or instances
        // of your application for real-time updates or background processing.
        await igniter.store.publish('user.created', {
          id: user.id,
          name: user.name,
          email: user.email,
          timestamp: new Date().toISOString(),
        });

        return user;
      },
    }),
  }
});

// src/services/notifications.service.ts
// Example: A separate service (or another instance) subscribing to user events.
// This demonstrates inter-service communication in a distributed environment.
igniter.store.subscribe('user.created', async (data) => {
  // 'data' is fully typed based on the published event.
  console.log(\`[Notification Service] New user created: \${data.name} (\${data.email})\`);
  // Here, you could send a welcome email, update a CRM, etc.
  // await emailService.sendWelcomeEmail(data.email, data.name);
});

// src/services/analytics.service.ts
// Another service subscribing to all user-related events.
igniter.store.subscribe('user.*', (data, channel) => {
  console.log(\`[Analytics Service] Received event on channel \${channel}: \`, data);
  // Log event to analytics platform
  // analyticsClient.track(channel, data);
});`
  },
  {
    id: "caching",
    title: "Caching",
    description: "Redis-powered caching for optimal performance",
    icon: Database,
    code: `// Caching with Redis Store
export const userController = igniter.controller({
  path: '/users',
  actions: {
    getById: igniter.query({
      path: '/:id' as const,
      handler: async ({ request, response, context, query }) => {
        const cacheKey = \`user:\${input.id}\`;

        // Try to get from cache first
        const cached = await context.store.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }

        // Fetch from database
        const user = await context.db.user.findUnique({
          where: { id: input.id }
        });

        // Cache for 1 hour
        await context.store.set(
          cacheKey,
          JSON.stringify(user),
          { ttl: 3600 }
        );

        return user;
      },
    }),
    update: igniter.muate({
      path: '/' as const,
      body: z.object({
        name: z.string(),
        email: z.string().email()
      })
      handler: async ({ request, response, context, query }) => {
        const user = await context.db.user.update({
          where: { id: input.id },
          data: input
        });

        // Invalidate cache
        await igniter.store.del(\`user:\${input.id}\`);

        return user;
      },
    }),
  }
})`
  },
  {
    id: "context",
    title: "Context System",
    description: "Dependency injection and shared application state",
    icon: Code2,
    code: `// igniter.context.ts
export const createContext = async () => {
  const db = new PrismaClient();

  return {
    database,

    // Environment variables
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      SECRET: process.env.SECREt
    }
  };
};

// Available in all controllers and procedures
export const auth = igniter.procedure({
  handler: async (options: AuthOptions, { response, context }) => {
    const user = await getCurrentUser(context.env.SECRET);

    // If auth is required but there's no user, return an unauthorized error.
    // This stops the request from proceeding further.
    if (options.isAuthRequired && !user) {
      return response.unauthorized('Authentication required.');
    }

    // The returned object is merged into the context.
    // Now, context.auth.user will be available in our controller.
    return {
      auth: {
        user,
      },
    };
  },
});`
  }
];

const comingSoonFeatures = [
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

export function BackendSection() {
  const [activeExample, setActiveExample] = React.useState("controller");

  const currentExample = codeExamples.find(ex => ex.id === activeExample);

  return (
    <div className="border-t border-border">
      <div className="container max-w-screen-2xl">
        <div className="border-x border-border">
          {/* Mobile Layout - Stacked */}
          <div className="lg:hidden">
            {/* Mobile Header */}
            <div className="p-4 sm:p-6">
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                  <span className="text-2xl sm:text-3xl text-[#FF4931] pr-2">/</span>
                  Backend
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Code that speaks for itself. Simple, elegant, and expressive syntax that feels like first-class citizen.
                </p>
              </div>

              {/* Mobile Navigation */}
              <div className="grid gap-2 mb-2">
                {codeExamples.map((example) => {
                  return (
                    <button
                      key={example.id}
                      onClick={() => setActiveExample(example.id)}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        activeExample === example.id
                          ? "bg-accent border-accent-foreground/20 opacity-100"
                          : "border-border opacity-60 hover:opacity-80 hover:bg-accent/50"
                      }`}
                    >
                      <h3 className="text-sm font-semibold text-foreground">
                        {example.title}
                      </h3>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Coming Soon */}
              <div className="grid grid-cols-1 gap-2 mb-6">
                {comingSoonFeatures.map((feature) => {
                  return (
                    <div
                      className="p-3 text-left rounded-lg border border-border opacity-30"
                      key={feature.title}
                    >
                      <h3 className="text-sm font-semibold text-foreground">
                        {feature.title} (soon)
                      </h3>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Code Display */}
            <div className="border-t border-border p-4 sm:p-6">
              {currentExample && (
                <motion.div
                  key={currentExample.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-4">
                    <h3 className="font-semibold text-foreground mb-1">
                      {currentExample.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {currentExample.description}
                    </p>
                  </div>
                  <div className="relative">
                    <CodeBlock technologies={[]}>
                      <CodeBlockHeader />
                      <CodeBlockContent code={currentExample.code} language="typescript" />
                    </CodeBlock>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Desktop Layout - Side by Side */}
          <div className="hidden lg:grid lg:grid-cols-2">
            {/* Desktop Sidebar */}
            <div className="p-10">
               <div className="mb-16">
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  <span className="text-3xl text-[#FF4931] pr-2">/</span>
                  Backend
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Code that speaks for itself. Simple, elegant, and expressive syntax that feels like first-class citizen.
                </p>
              </div>

              <div className="space-y-2">
                {codeExamples.map((example) => {
                  return (
                    <button
                      key={example.id}
                      onClick={() => setActiveExample(example.id)}
                      className={`w-full text-left py-2 transition-opacity ${activeExample === example.id
                          ? "opacity-100"
                          : "opacity-50 hover:opacity-75"
                        }`}
                    >
                      <h3 className="font-semibold text-foreground">
                        {example.title}
                      </h3>
                    </button>
                  );
                })}
              </div>

              {/* Desktop Coming Soon Features */}
              <div className="mt-2">
                <div className="space-y-2">
                  {comingSoonFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <button
                        className="w-full text-left py-2 transition-opacity opacity-30 cursor-default"
                        key={feature.title}
                      >
                        <h3 className="font-semibold text-foreground">
                          {feature.title} (soon)
                        </h3>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Desktop Code Display */}
            <div className="border-l border-border p-10">
              {currentExample && (
                <motion.div
                  key={currentExample.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h3 className="font-semibold text-foreground mb-1">
                      {currentExample.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {currentExample.description}
                    </p>
                  </div>
                  <div className="relative">
                    <CodeBlock technologies={[]}>
                      <CodeBlockHeader />
                      <CodeBlockContent code={currentExample.code} language="typescript" />
                    </CodeBlock>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
