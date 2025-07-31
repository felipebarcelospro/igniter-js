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
export const usersController = {
  getUser: action()
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const user = await context.db.user.findUnique({
        where: { id: input.id }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    }),
    
  createUser: action()
    .input(z.object({
      name: z.string(),
      email: z.string().email()
    }))
    .handler(async ({ input, context }) => {
      return await context.db.user.create({
        data: input
      });
    })
};`
  },
  {
    id: "procedure",
    title: "Procedures (Middleware)",
    description: "Reusable middleware for authentication, validation, and more",
    icon: Zap,
    code: `// procedures/auth.procedure.ts
export const authProcedure = procedure()
  .use(async ({ context, next }) => {
    const token = context.req.headers.authorization;
    
    if (!token) {
      throw new Error('Unauthorized');
    }
    
    const user = await verifyToken(token);
    
    return next({
      context: {
        ...context,
        user
      }
    });
  });

// Usage in controller
export const protectedController = {
  getProfile: authProcedure
    .handler(async ({ context }) => {
      // context.user is now available and typed
      return context.user;
    })
};`
  },
  {
    id: "client",
    title: "Frontend Client",
    description: "Fully typed client with React hooks for seamless integration",
    icon: Code2,
    code: `// Frontend usage with React
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './igniter.client';

function UserProfile({ userId }: { userId: string }) {
  // Fully typed query with auto-completion
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.users.getUser({ id: userId })
  });
  
  const updateUser = useMutation({
    mutationFn: api.users.updateUser,
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries(['user', userId]);
    }
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
    </div>
  );
}`
  },
  {
    id: "jobs",
    title: "Background Jobs",
    description: "Reliable job processing with BullMQ integration",
    icon: Database,
    code: `// jobs/email.job.ts
export const emailJob = job()
  .input(z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string()
  }))
  .handler(async ({ input, context }) => {
    await context.emailService.send({
      to: input.to,
      subject: input.subject,
      html: input.body
    });
    
    console.log(\`Email sent to \${input.to}\`);
  });

// Dispatch job from controller
export const notificationController = {
  sendWelcomeEmail: action()
    .input(z.object({ userId: z.string() }))
    .handler(async ({ input, context }) => {
      const user = await context.db.user.findUnique({
        where: { id: input.userId }
      });
      
      // Queue the email job
      await context.jobs.emailJob.add({
        to: user.email,
        subject: 'Welcome!',
        body: \`Hello \${user.name}, welcome to our platform!\`
      });
    })
};`
  },
  {
    id: "events",
    title: "Real-time Events",
    description: "Live data synchronization and event streaming",
    icon: Zap,
    code: `// events/user.events.ts
export const userEvents = {
  userCreated: event()
    .input(z.object({
      userId: z.string(),
      name: z.string()
    })),
    
  userUpdated: event()
    .input(z.object({
      userId: z.string(),
      changes: z.record(z.any())
    }))
};

// Emit events from controller
export const usersController = {
  createUser: action()
    .input(userSchema)
    .handler(async ({ input, context }) => {
      const user = await context.db.user.create({
        data: input
      });
      
      // Emit real-time event
      await context.events.userCreated.emit({
        userId: user.id,
        name: user.name
      });
      
      return user;
    })
};

// Subscribe on frontend
api.events.userCreated.subscribe((data) => {
  console.log('New user created:', data.name);
});`
  },
  {
    id: "caching",
    title: "Caching",
    description: "Redis-powered caching for optimal performance",
    icon: Database,
    code: `// Caching with Redis Store
export const usersController = {
  getUser: action()
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
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
    }),
    
  updateUser: action()
    .input(updateUserSchema)
    .handler(async ({ input, context }) => {
      const user = await context.db.user.update({
        where: { id: input.id },
        data: input
      });
      
      // Invalidate cache
      await context.store.del(\`user:\${input.id}\`);
      
      return user;
    })
};`
  },
  {
    id: "context",
    title: "Context System",
    description: "Dependency injection and shared application state",
    icon: Code2,
    code: `// igniter.context.ts
export const createContext = async () => {
  const db = new PrismaClient();
  const redis = new Redis(process.env.REDIS_URL);
  
  return {
    db,
    store: createRedisStore(redis),
    emailService: new EmailService(),
    logger: createLogger(),
    
    // Custom services
    userService: new UserService(db),
    paymentService: new PaymentService(),
    
    // Environment variables
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL
    }
  };
};

// Available in all controllers and procedures
export const protectedAction = authProcedure
  .handler(async ({ context }) => {
    // All context properties are fully typed
    const user = await context.userService.findById(
      context.user.id
    );
    
    context.logger.info('User accessed protected resource', {
      userId: user.id
    });
    
    return user;
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
          <div className="grid grid-cols-2">
            {/* Sidebar */}
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

              {/* Coming Soon Features */}
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

            {/* Code Display */}
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