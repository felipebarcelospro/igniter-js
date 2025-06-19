/**
 * Example: Complete CLI Usage for Bundle Contamination Solution
 * 
 * This example demonstrates the complete workflow of using Igniter CLI
 * to eliminate bundle contamination and generate type-safe clients.
 */

// ==========================================
// 1. SETUP YOUR CONTROLLERS (AS USUAL)
// ==========================================

// src/controllers/user.controller.ts
import { Igniter } from '@igniter-js/core'
import { prisma } from '@/lib/db'           // 🔥 This STAYS on server only
import { sendEmail } from '@/services/email' // 🔥 This STAYS on server only

const igniter = Igniter.context<{
  user: { id: string; email: string } | null
  db: typeof prisma
}>()

export const userController = igniter.controller({
  path: '/users',
  actions: {
    // GET /users
    list: igniter.query({
      handler: async (ctx) => {
        // 🔥 All this server logic NEVER goes to client bundle
        const users = await ctx.db.user.findMany()
        return ctx.response.ok(users)
      }
    }),

    // POST /users
    create: igniter.mutation({
      handler: async (ctx) => {
        // 🔥 Server-only dependencies stay on server
        const user = await ctx.db.user.create({
          data: ctx.request.body
        })
        
        await sendEmail({
          to: user.email,
          subject: 'Welcome!'
        })
        
        return ctx.response.created(user)
      }
    }),

    // GET /users/:id
    byId: igniter.query({
      path: '/:id',
      handler: async (ctx) => {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.request.params.id }
        })
        return ctx.response.ok(user)
      }
    })
  }
})

// ==========================================
// 2. CREATE YOUR ROUTER (AS USUAL)
// ==========================================

// src/igniter.router.ts
import { createIgniterRouter } from '@igniter-js/core'
import { userController } from './controllers/user.controller'

export const AppRouter = createIgniterRouter({
  baseURL: process.env.API_URL || 'http://localhost:3000',
  basePATH: '/api/v1',
  controllers: {
    users: userController
  },
  context: async (request) => ({
    user: await getCurrentUser(request),
    db: prisma  // 🔥 This NEVER goes to client
  })
})

export type AppRouterType = typeof AppRouter

// ==========================================
// 3. SETUP CLI COMMANDS
// ==========================================

// package.json scripts
/*
{
  "scripts": {
    "igniter:dev": "igniter dev --framework nextjs --output app/lib/generated --debug",
    "igniter:build": "igniter generate --framework nextjs --output app/lib/generated",
    "dev": "npm run igniter:dev & next dev",
    "build": "npm run igniter:build && next build"
  }
}
*/

// ==========================================
// 4. RUN CLI COMMANDS
// ==========================================

/*
# Development mode (auto-regenerates on file changes)
$ npm run igniter:dev

🚀 Starting Igniter CLI in development mode...
📦 Framework: nextjs
📁 Output: app/lib/generated
👀 Watching: **\/*.controller.{ts,js}
✅ Igniter CLI is ready!
   Changes to controllers will automatically regenerate the client
   Press Ctrl+C to stop

# Build mode (one-time generation for CI/CD)
$ npm run igniter:build

🔄 Generating Igniter client...
📦 Framework: nextjs
📁 Output: app/lib/generated
📂 Input: **\/*.controller.{ts,js}
✅ Client generation completed!
   Generated files in: app/lib/generated
*/

// ==========================================
// 5. GENERATED FILES (AUTO-CREATED BY CLI)
// ==========================================

// app/lib/generated/schema.generated.ts
/*
export const AppRouterSchemaData = {
  "config": {
    "baseURL": "http://localhost:3000",
    "basePATH": "/api/v1"
  },
  "controllers": {
    "users": {
      "name": "users",
      "path": "/users",
      "actions": {
        "list": {
          "path": "",
          "method": "GET",
          "description": undefined,
          "$Infer": { ... }
          // ✅ NO handlers, middleware, or server logic
        },
        "create": {
          "path": "",
          "method": "POST",
          "$Infer": { ... }
          // ✅ NO handlers, middleware, or server logic
        },
        "byId": {
          "path": "/:id",
          "method": "GET",
          "$Infer": { ... }
          // ✅ NO handlers, middleware, or server logic
        }
      }
    }
  }
} as const

export type AppRouterSchema = typeof AppRouterSchemaData
*/

// app/lib/generated/client.generated.ts
/*
import { createIgniterSchemaClient } from '@igniter-js/core/client'
import type { AppRouterSchema } from './schema.generated'
import { AppRouterSchemaData } from './schema.generated'
import { cache } from 'react'

const getServerRouter = cache(async () => {
  if (typeof window === 'undefined') {
    try {
      const routerModule = await import('@/igniter.router')
      const router = routerModule.AppRouter
      if (router && typeof router.processor?.call === 'function') {
        return router
      }
    } catch (error) {
      console.warn('Could not load server router, using HTTP fallback:', error.message)
    }
  }
  return null
})

export const api = createIgniterSchemaClient<AppRouterSchema>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
  schema: AppRouterSchemaData,  // ✅ CLEAN schema, no server code
  getServerRouter,              // ✅ Hybrid execution when possible
})
*/

// app/lib/generated/index.ts
/*
export { api } from './client.generated'
export type { AppRouterSchema } from './schema.generated'
*/

// ==========================================
// 6. USAGE IN YOUR APP (ZERO BUNDLE CONTAMINATION)
// ==========================================

// app/users/page.tsx (Server Component)
import { api } from '@/lib/generated'

export default async function UsersPage() {
  // ✅ Direct execution in server environment (best performance)
  // ✅ Falls back to HTTP if direct execution fails
  // ✅ ZERO server code in client bundle
  const users = await api.users.list.query()
  
  return (
    <div>
      <h1>Users ({users.length})</h1>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}

// app/components/UserForm.tsx (Client Component)
'use client'
import { api } from '@/lib/generated'

export function UserForm() {
  // ✅ React hooks work perfectly
  // ✅ Full TypeScript inference
  // ✅ ZERO server code in client bundle
  const { mutate: createUser, loading } = api.users.create.useMutation()
  
  const handleSubmit = async (data: any) => {
    await createUser(data)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}

// ==========================================
// 7. BUNDLE ANALYSIS RESULTS
// ==========================================

/*
BEFORE CLI (Bundle Contamination):
- Client bundle: 2.3MB (includes prisma, server logic, etc.)
- Server dependencies leaked to client
- Build failures in static generation
- Performance issues

AFTER CLI (Clean Separation):
- Client bundle: 45KB (only client code + schema)
- Zero server dependencies in client
- Static generation works perfectly
- Optimal performance
- Hybrid execution when beneficial
*/

// ==========================================
// 8. DEVELOPMENT WORKFLOW
// ==========================================

/*
1. Developer writes controllers normally (no API changes)
2. CLI watches for changes and regenerates client automatically
3. TypeScript provides full inference and safety
4. Hot reload works seamlessly
5. Build process generates optimized bundles
6. Production deployment is lightning fast

✅ ZERO breaking changes to existing API
✅ ZERO learning curve for developers  
✅ MAXIMUM performance and type safety
✅ PERFECT developer experience
*/ 