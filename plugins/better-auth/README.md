# @igniter-js/plugin-better-auth

> **Type-safe BetterAuth integration for Igniter.js** 🚀

Seamlessly integrate [BetterAuth](https://better-auth.com) authentication into your Igniter.js applications with full TypeScript support and automatic API mapping.

[![npm version](https://badge.fury.io/js/%40igniter-js%2Fplugin-better-auth.svg)](https://badge.fury.io/js/%40igniter-js%2Fplugin-better-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🔒 **Full BetterAuth Integration** - Drop-in replacement for BetterAuth's API surface
- 📝 **Type-Safe** - Complete TypeScript inference for all auth endpoints
- 🔄 **Auto-Mapping** - Automatically converts BetterAuth API to Igniter controllers
- 🚀 **Zero Configuration** - Works out-of-the-box with default BetterAuth setup
- 🏗️ **Framework Agnostic** - Supports all Igniter.js integrations (Next.js, TanStack Start, etc.)
- 📡 **RESTful Endpoints** - Clean HTTP endpoints following REST conventions

## 📦 Installation

```bash
npm install @igniter-js/plugin-better-auth better-auth
```

**Peer Dependencies:**
- `@igniter-js/core` (must be in your workspace)
- `better-auth` (installed above)

## 🚀 Quick Start

### 1. Set up BetterAuth

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"

export const auth = betterAuth({
  database: mongodbAdapter({
    // your MongoDB connection
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  // ... other config
})
```

### 2. Create the Igniter Plugin

```typescript
// lib/plugins/better-auth.ts
import { createBetterAuthPlugin } from '@igniter-js/plugin-better-auth'
import { auth } from '../auth'

export const betterAuthPlugin = createBetterAuthPlugin(auth)
```

### 3. Register with Igniter

```typescript
// app/igniter.ts
import { Igniter } from '@igniter-js/core'
import { betterAuthPlugin } from './lib/plugins/better-auth'

export const igniter = Igniter
  .create()
  .plugins({
    'better-auth': betterAuthPlugin
  })

// Your router with full type safety
export const router = igniter.router({
  controllers: {
    // Your other controllers...
    users: { /* ... */ },
    posts: { /* ... */ },
  }
})

// Full TypeScript support for auth endpoints
export type RouterCaller = typeof router.caller
```

### 4. Use in Your App

```typescript
// In your API routes or controllers
import { router } from './igniter'

// Sign up a user (POST /api/v1/auth/signUp)
const result = await router.caller.auth.signUp({
  body: {
    email: "user@example.com",
    password: "password123",
    name: "John Doe"
  }
})

// Sign in (POST /api/v1/auth/signIn)
const signInResult = await router.caller.auth.signIn({
  body: {
    email: "user@example.com",
    password: "password123"
  }
})

// Get session (POST /api/v1/auth/getSession)
const session = await router.caller.auth.getSession({
  body: {
    // session token or data
  }
})
```

## 🎯 API Mapping

The plugin automatically maps BetterAuth's `auth.api` functions to Igniter controller actions:

### Function Mapping
```typescript
// BetterAuth API - functions in auth.api
auth.api.signUp = (input) => Promise<User>
auth.api.signIn = (input) => Promise<Session>
auth.api.getSession = (input) => Promise<Session | null>

// Becomes Igniter actions (all POST by default)
router.caller.auth.signUp     // POST /api/v1/auth/signUp
router.caller.auth.signIn     // POST /api/v1/auth/signIn
router.caller.auth.getSession // POST /api/v1/auth/getSession
```

### HTTP Method Detection
Functions can specify their HTTP method via a `method` property:
```typescript
// If BetterAuth function has method metadata
auth.api.getSession.method = 'GET' // or httpMethod, defaultMethod

// Becomes GET action instead of POST
router.caller.auth.getSession // GET /api/v1/auth/getSession
```

## 🔧 Configuration

The plugin is configured automatically based on your BetterAuth instance. The controller name is fixed as `auth` and the plugin name is `better-auth`. All configuration is derived from your BetterAuth setup.

```typescript
// The plugin configuration is automatic - just pass your auth instance
const betterAuthPlugin = createBetterAuthPlugin(auth)
```

## 🏗️ Framework Integration

### Next.js App Router

```typescript
// app/api/auth/[...action]/route.ts
import { router } from '@/lib/igniter'

export async function GET(request: Request, { params }: { params: { action: string[] } }) {
  return router.handle('auth', request)
}

export async function POST(request: Request, { params }: { params: { action: string[] } }) {
  return router.handle('auth', request)
}

// Add other HTTP methods as needed...
```

### TanStack Start

```typescript
// app/routes/auth.$action.ts
import { createFileRoute } from '@tanstack/react-router'
import { router } from '@/lib/igniter'

export const Route = createFileRoute('/auth/$action')({
  loader: async ({ request, params }) => {
    return router.handle('auth', request)
  },
  action: async ({ request, params }) => {
    return router.handle('auth', request)
  }
})
```

### Express.js

```typescript
// server.js
import express from 'express'
import { router } from './lib/igniter'

const app = express()

// Mount auth routes
app.use('/api/v1/auth', async (req, res) => {
  const response = await router.handle('auth', req)
  res.status(response.status).json(await response.json())
})

app.listen(3000)
```

## 🔐 Available Endpoints

After setup, you'll have access to all BetterAuth endpoints as type-safe Igniter actions. The exact endpoints depend on your BetterAuth configuration:

### Common Authentication Endpoints
- `signUp` - Create new user account (POST)
- `signIn` - Authenticate user (POST)
- `signOut` - Sign out current user (POST)
- `getSession` - Get current session info (POST, or GET if configured)

### Social Authentication
- `signInWithGithub` - GitHub OAuth (POST)
- `signInWithGoogle` - Google OAuth (POST)
- `signInWithDiscord` - Discord OAuth (POST)
- And other social providers you configure...

### Account Management
- `updateUser` - Update user profile (POST)
- `changePassword` - Change user password (POST)
- `deleteUser` - Delete user account (POST)

### Password Recovery
- `forgetPassword` - Request password reset (POST)
- `resetPassword` - Reset password with token (POST)
- `verifyEmail` - Verify email address (POST)

**Note:** All endpoints are POST by default unless the BetterAuth function specifies a different HTTP method via `method` property.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Development mode
npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT © [Igniter.js Contributors](https://github.com/felipebarcelospro/igniter-js)

## 🔗 Links

- [BetterAuth Documentation](https://better-auth.com)
- [Igniter.js Documentation](https://igniterjs.com)
- [GitHub Repository](https://github.com/felipebarcelospro/igniter-js)
