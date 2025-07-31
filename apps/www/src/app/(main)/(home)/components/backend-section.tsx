"use client";

import { CodeBlock, CodeBlockContent, CodeBlockHeader } from "@/components/ui/code-block";
import { motion } from "framer-motion";
import { Code2, Database, Lock, Mail, Upload, Zap } from "lucide-react";
import React from "react";

const codeExamples = [
  {
    id: "controller",
    title: "Controllers",
    description: "Type-safe API endpoints with automatic validation",
    icon: Code2,
    code: `// src/features/user/controllers/user.controller.ts
import { action } from "@igniter-js/core";
import { z } from "zod";
import { UserInput } from "../user.types";
import { auth } from "../procedures/auth.procedure";

export const userController = {
  // Query Action
  getUserById: action()
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      return await context.db.user.findUnique({ where: { id: input.id } });
    }),

  // Mutation Action with Middleware
  updateProfile: auth("user:update")
    .input(UserInput)
    .handler(async ({ input, context }) => {
      return await context.db.user.update({
        where: { id: context.user.id },
        data: input,
      });
    }),
};`
  },
  {
    id: "procedure",
    title: "Procedures (Middleware)",
    description: "Reusable middleware for authentication, validation, and more",
    icon: Zap,
    code: `// src/features/user/procedures/auth.procedure.ts
import { procedure } from "@igniter-js/core";
import { getCurrentUser } from "./utils/get-current-user";

type AuthOptions = {
  permissions: string[];
};

export const auth = (scope: string) =>
  procedure<AuthOptions>()
    .use(async ({ options, context, next }) => {
      const user = await getCurrentUser(context.req.headers.authorization);

      if (!user) {
        throw new Error("UNAUTHORIZED");
      }

      const hasPermission = user.permissions.includes(scope);
      if (!hasPermission) {
        throw new Error("FORBIDDEN");
      }

      return next({
        context: {
          ...context,
          user,
        },
      });
    });`
  },
  {
    id: "client",
    title: "Frontend Client",
    description: "Fully typed client with React hooks for seamless integration",
    icon: Code2,
    code: `// src/igniter.client.ts
import { createIgniter } from "@igniter-js/react";
import { type AppRouter } from "./igniter.router.ts";

export const {
  IgniterProvider,
  useQuery,
  useMutation,
  useSubscription,
  useQueryClient,
  api,
} = createIgniter<AppRouter>({
  url: "/api/igniter",
});

// app/components/UsersList.tsx
function UsersList() {
  const { data: users, isLoading } = useQuery("user", "getAll");

  if (isLoading) return "Loading...";

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}`
  },
  {
    id: "jobs",
    title: "Background Jobs",
    description: "Reliable job processing with BullMQ integration",
    icon: Database,
    code: `// src/jobs/index.ts
import { EmailJob } from "./email.job";

export const jobs = {
  email: EmailJob,
};

// src/jobs/email.job.ts
import { job } from "@igniter-js/core";
import { z } from "zod";

export const EmailJob = job()
  .input(z.object({ to: z.string().email(), name: z.string() }))
  .handler(async ({ input, context }) => {
    await context.mailer.send({
      to: input.to,
      subject: "Welcome!",
      body: \`Hi \${input.name}, welcome to Igniter.js!\`,
    });
    context.logger.info(\`Welcome email sent to \${input.to}\`);
  });

// Enqueue from an action
export const userController = {
  createUser: action()
    .input(UserInput)
    .handler(async ({ input, context: { db, jobs } }) => {
      const user = await db.user.create({ data: input });
      await jobs.email.add({ to: user.email, name: user.name });
      return user;
    }),
};`
  },
  {
    id: "events",
    title: "Real-time Events",
    description: "Live data synchronization and event streaming",
    icon: Zap,
    code: `// Automatic Revalidation
export const postController = {
  createPost: action()
    .input(PostInput)
    .revalidate("post", "getAll") // Automatically refetches 'getAll' query on the client
    .handler(async ({ input, context }) => {
      return await context.db.post.create({ data: input });
    }),
};

// Custom Data Streams
export const notificationStream = stream()
  .input(z.object({ userId: z.string() }))
  .handler(async function* ({ input, done }) {
    for await (const notification of getNotifications(input.userId)) {
      yield { data: notification };
    }
    done();
  });

// Subscribe on frontend
const { data } = useSubscription(
  "notificationsStream",
  { userId: "123" }
);`
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
    code: `// src/igniter.context.ts
import { PrismaClient } from "@prisma/client";
import { createLogger, createMailer } from "./services";

export async function createIgniterAppContext() {
  const db = new PrismaClient();
  const logger = createLogger();
  const mailer = createMailer();

  return {
    db,
    logger,
    mailer,
    // Add any other global services or values here
  };
}

export type IgniterAppContext = Awaited<
  ReturnType<typeof createIgniterAppContext>
>;`
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
