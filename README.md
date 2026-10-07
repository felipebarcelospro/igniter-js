<div align="center">
  <h1>🔥 Igniter.js</h1>
  <p><strong>The End-to-End Typesafe Full-stack TypeScript Framework</strong></p>
  <p><em>Built for Humans and Code Agents</em></p>

  [![npm version](https://img.shields.io/npm/v/@igniter-js/core.svg?style=flat)](https://www.npmjs.com/package/@igniter-js/core)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Documentation](https://img.shields.io/badge/docs-igniterjs.tryfractal.co-brightgreen.svg)](https://igniterjs.tryfractal.co)
</div>

---

## ✨ What is Igniter.js?

Igniter.js is a modern, full-stack TypeScript framework that eliminates the friction between your backend and frontend. Define your API once, get fully-typed clients everywhere—no code generation, no manual synchronization, just pure end-to-end type safety.

**Perfect for building scalable APIs, real-time applications, and modern web services.**

## 🚀 Quick Start

Get up and running in seconds:

```bash
# Create a new project
npx @igniter-js/cli@latest init my-app

# Or add to existing project
npm install @igniter-js/core zod
```

## 🎯 Key Features

- **🔒 End-to-End Type Safety** - Define once, use everywhere with full TypeScript inference
- **⚡ Zero Code Generation** - No build steps, no schemas to sync
- **🔌 Framework Agnostic** - Works with Next.js, Express, Bun, and more
- **🎛️ Built-in Features** - Queues, Real-time, Caching, and Telemetry
- **🤖 Code Agent Optimized** - Optimized for code agents and AI assistance
- **📦 Plugin System** - Extensible and modular architecture

## 📖 Documentation & Resources

- **📚 [Official Documentation](https://igniterjs.tryfractal.co/docs)** - Complete guides and API reference
- **🎯 [Getting Started](https://igniterjs.tryfractal.co/docs/getting-started)** - Your first Igniter.js app
- **📝 [Blog](https://igniterjs.tryfractal.co/blog)** - Latest updates and tutorials
- **🎨 [Templates](https://igniterjs.tryfractal.co/templates)** - Starter templates and examples
- **📋 [Changelog](https://igniterjs.tryfractal.co/changelog)** - What's new in each release

## 🛠️ Development

```bash
# Interactive development dashboard
npx @igniter-js/cli@latest dev

# Build your project
npm run build

# Run tests
npm test
```

## 🌟 Example

```typescript
// Define your API
// features/users/controllers/users.controller.ts
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
})

// Use in your React app with full type safety
import { api } from './igniter.client';

function UserProfile({ userId }: { userId: string }) {
  const currentUser = api.user.getUser.useQuery({
    enabled: !!userId,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    params: {
      id: userId
    },
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
}
```

## 🤝 Community & Support

- **🐛 [Issues](https://github.com/felipebarcelospro/igniter-js/issues)** - Report bugs and request features
- **💬 [Discussions](https://github.com/felipebarcelospro/igniter-js/discussions)** - Ask questions and share ideas
- **🤝 [Contributing](https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md)** - Help make Igniter.js better

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Made with ❤️ by the Igniter.js team</p>
  <p><a href="https://igniterjs.tryfractal.co">igniterjs.tryfractal.co</a> • <a href="https://github.com/felipebarcelospro/igniter-js">GitHub</a> • <a href="https://www.npmjs.com/package/@igniter-js/core">npm</a></p>
</div>