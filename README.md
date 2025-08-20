<div align="center">
  <h1>🔥 Igniter.js</h1>
  <p><strong>The End-to-End Typesafe Full-stack TypeScript Framework</strong></p>
  <p><em>Built for Humans and AI</em></p>

  [![npm version](https://img.shields.io/npm/v/@igniter-js/core.svg?style=flat)](https://www.npmjs.com/package/@igniter-js/core)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Documentation](https://img.shields.io/badge/docs-igniterjs.com-brightgreen.svg)](https://igniterjs.com)
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
- **🤖 AI-Friendly** - Optimized for code agents and AI assistance
- **📦 Plugin System** - Extensible and modular architecture

## 📖 Documentation & Resources

- **📚 [Official Documentation](https://igniterjs.com/docs)** - Complete guides and API reference
- **🎯 [Getting Started](https://igniterjs.com/docs/getting-started)** - Your first Igniter.js app
- **📝 [Blog](https://igniterjs.com/blog)** - Latest updates and tutorials
- **🎨 [Templates](https://igniterjs.com/templates)** - Starter templates and examples
- **📋 [Changelog](https://igniterjs.com/changelog)** - What's new in each release

## 🛠️ Development

```bash
# Interactive development dashboard
npx @igniter-js/cli dev --interactive

# Build your project
npm run build

# Run tests
npm test
```

## 🌟 Example

```typescript
// Define your API
export const userController = igniter.controller({
  path: '/users',
  actions: {
    list: igniter.query({
      handler: async ({ context }) => {
        return await context.database.user.findMany();
      }
    }),
    create: igniter.mutation({
      input: z.object({ name: z.string(), email: z.string().email() }),
      handler: async ({ input, context }) => {
        return await context.database.user.create({ data: input });
      }
    })
  }
});

// Use in your React app with full type safety
const { data: users } = useQuery(client.users.list);
const createUser = useMutation(client.users.create);
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
  <p><a href="https://igniterjs.com">igniterjs.com</a> • <a href="https://github.com/felipebarcelospro/igniter-js">GitHub</a> • <a href="https://www.npmjs.com/package/@igniter-js/core">npm</a></p>
</div>