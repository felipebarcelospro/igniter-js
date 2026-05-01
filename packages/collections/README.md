# @igniter-js/collections

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/collections)](https://www.npmjs.com/package/@igniter-js/collections)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange)](https://bun.sh)

**Type-safe ORM for content collections**  
Prisma-like API for Markdown, JSON, and YAML files with schema validation, lifecycle hooks, declarative views, and TypeScript-first configuration.

[Quick Start](#-quick-start) • [Documentation](https://igniterjs.com/docs/collections) • [Examples](#-real-world-examples) • [API Reference](#-api-reference)

</div>

---

## ✨ Why @igniter-js/collections?

Managing content-driven applications shouldn't require a database. Whether you're building a documentation site, a blog, or a configuration management system, you need:

- **Type-safe content** — Catch errors at build time, not runtime
- **Familiar API** — Prisma-like queries you already know
- **Runtime flexibility** — Deploy anywhere (Bun, Node.js, Redis, S3)
- **Developer experience** — Autocomplete everywhere, zero boilerplate
- **Production-ready** — Lifecycle hooks, validation, and observability built-in
- **TypeScript-first** — Define collections and views in `.ts` files with hot reload

---

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install @igniter-js/collections zod

# Using pnpm
pnpm add @igniter-js/collections zod

# Using yarn
yarn add @igniter-js/collections zod

# Using bun
bun add @igniter-js/collections zod
```

### Your First Collection (60 seconds)

```typescript
import { IgniterCollections, IgniterCollectionModel } from '@igniter-js/collections';
import { NodeFsAdapter } from '@igniter-js/collections/adapters';
import { z } from 'zod';

// 1️⃣ Define your content schema
const Posts = IgniterCollectionModel.create('posts')
  .withPatterns(['.content/posts/{id}.mdx'])
  .withSchema(z.object({
    title: z.string(),
    description: z.string(),
    published: z.boolean().default(false),
    tags: z.array(z.string()).optional(),
    author: z.string(),
  }))
  .build();

// 2️⃣ Create the manager
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withBasePath(process.cwd())
  .addCollection(Posts)
  .build();

// 3️⃣ Use it like Prisma!
const post = await docs.posts.create({
  data: {
    title: 'Getting Started with Igniter.js',
    description: 'Learn how to build type-safe content-driven apps',
    published: true,
    tags: ['tutorial', 'typescript'],
    author: 'Felipe Barcelos',
  }
});

console.log('Created post:', post.id);
// Created post: 9f3e4d2a-8b7c-4e1f-a3d2-9c8b7e6f5a4d
```

**✅ Success!** You just created a type-safe Markdown file with validated frontmatter.

---

## 🎯 Core Concepts

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Your Application                       │
├─────────────────────────────────────────────────────────┤
│  docs.posts.findMany({ where: { published: true } })    │
│  docs.views.render('dashboard')                         │
└────────────┬────────────────────────────────────────────┘
             │ Type-safe API
             ▼
┌─────────────────────────────────────────────────────────┐
│            IgniterCollectionManager (Proxy)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Posts     │  │    Docs      │  │   Authors    │  │
│  │  Manager     │  │  Manager     │  │   Manager    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │        IgniterCollectionViewManager                  ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          ││
│  │  │ Dashboard│  │ Analytics│  │   Admin  │          ││
│  │  │  View    │  │   View   │  │   View   │          ││
│  │  └──────────┘  └──────────┘  └──────────┘          ││
│  └─────────────────────────────────────────────────────┘│
└────────────┬────────────────────────────────────────────┘
             │ Hooks + Validation
             ▼
┌─────────────────────────────────────────────────────────┐
│                    Adapter Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │ BunFs    │  │  Redis   │  │   S3     │  │  Mock   ││
│  │ Adapter  │  │ Adapter  │  │ Adapter  │  │ Adapter ││
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘│
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│                  Storage Backend                         │
│      Files  •  Redis  •  S3  •  In-Memory               │
└─────────────────────────────────────────────────────────┘
```

### Key Abstractions

- **Builder** → Immutable configuration (`.withSchema()`, `.withAdapter()`)
- **Manager** → Operational CRUD instance (`.findMany()`, `.create()`)
- **Adapter** → Pluggable storage backend (filesystem, Redis, S3)
- **Schema** → Runtime validation (Zod, JSON Schema, StandardSchemaV1)
- **Hooks** → Lifecycle interception (`.onCreated()`, `.onDeleted()`)
- **Views** → Global declarative data shaping with multi-collection access
- **Watcher** → Unified filesystem discovery for collections and views

---

## 📖 Usage Examples

### Basic Usage

```typescript
import { IgniterCollections, IgniterCollectionModel } from '@igniter-js/collections';
import { NodeFsAdapter } from '@igniter-js/collections/adapters';
import { z } from 'zod';

const Posts = IgniterCollectionModel.create('posts')
  .withPatterns(['.content/posts/{id}.mdx'])
  .withSchema(z.object({
    title: z.string(),
    published: z.boolean(),
  }))
  .build();

const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .addCollection(Posts)
  .build();

// Create a post
const post = await docs.posts.create({
  data: { title: 'Hello World', published: true },
});

// Find all published posts
const publishedPosts = await docs.posts.findMany({
  where: { published: true },
});

// Update a post
const updated = await docs.posts.update({
  where: { id: post.id },
  data: { published: false },
});

// Delete a post
await docs.posts.delete({
  where: { id: post.id },
});
```

### Advanced Queries (Prisma-like)

```typescript
// Complex filtering
const results = await docs.posts.findMany({
  where: {
    published: true,
    category: { in: ['tutorial', 'guide'] },
    title: { contains: 'TypeScript' },
    views: { gte: 100, lt: 1000 },
    tags: { has: 'featured' },
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0,
});

// Full-Text Search (FTS) with Fuzzy Matching
const searchResults = await docs.posts.findMany({
  where: {
    search: {
      term: 'TypeScript',
      fields: { 
        title: { weight: 2, fuzzy: true }, 
        description: { weight: 1.5, fuzzy: true },
        content: { weight: 1 }
      },
      threshold: 0.1,
      fuzzy: true
    }
  }
});

// Field Selection (Select & Exclude)
const lightweightPosts = await docs.posts.findMany({
  select: {
    id: true,
    title: true,
  }
});

// Count matching documents
const count = await docs.posts.count({
  where: { published: true },
});
```

### Lifecycle Hooks (Powerful Control Flow)

```typescript
const Posts = IgniterCollectionModel.create('posts')
  .withPatterns(['.content/posts/{id}.mdx'])
  .withSchema(postSchema)
  
  // Add created timestamp automatically
  .onCreated(async ({ value }) => {
    return {
      ...value,
      createdAt: new Date().toISOString(),
    };
  })
  
  // Prevent unpublishing approved content
  .onUpdated(({ newValue, previousValue }) => {
    if (
      previousValue.status === 'approved' &&
      newValue.status === 'draft'
    ) {
      return false; // ❌ Cancel operation
    }
    return newValue; // ✅ Allow update
  })
  
  // Audit deletions
  .onDeleted(async ({ value, manager }) => {
    await manager.audit.create({
      data: {
        action: 'deleted',
        collection: 'posts',
        documentId: value.id,
        timestamp: new Date(),
      },
    });
    return true; // ✅ Proceed with deletion
  })
  
  .build();
```

### Event Emitters

The manager emits global and scoped events on every CRUD operation, making it easy to integrate with external systems (like WebSockets, cache invalidation, or search indexers).

```typescript
// Global event (any collection)
docs.on('created', ({ collection, value }) => {
  console.log(`New document in ${collection}: ${value.id}`);
});

// Scoped event (specific collection)
docs.on('posts:updated', ({ newValue, previousValue }) => {
  if (newValue.published && !previousValue.published) {
    console.log(`Post published: ${newValue.title}`);
  }
});
```

### Schema Validation (Type-safe Frontmatter)

```typescript
import { z } from 'zod';

const blogPostSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(500),
  author: z.string(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).min(1).max(10),
  category: z.enum(['tutorial', 'guide', 'news', 'update']),
  publishedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().url().optional(),
  }).optional(),
});

const Posts = IgniterCollectionModel.create('posts')
  .withSchema(blogPostSchema)
  .build();

// TypeScript knows the exact shape of your data!
const post = await docs.posts.create({
  data: {
    title: 'My Post',
    description: 'A great post about TypeScript',
    author: 'John Doe',
    tags: ['typescript', 'tutorial'],
    category: 'tutorial',
  },
});
```

---

## 🎨 Views System (Global & Multi-Collection)

Views are **global first-class citizens** with unrestricted access to all collections. They allow you to shape data for specific UI needs without custom query logic.

### Programmatic Views

```typescript
import { IgniterCollectionView } from '@igniter-js/collections';

const DashboardView = IgniterCollectionView.create('dashboard')
  .withTitle('Blog Dashboard')
  .withGetData(async ({ manager }) => {
    const [posts, authors, comments] = await Promise.all([
      manager.posts.findMany(),
      manager.authors.findMany(),
      manager.comments.count()
    ]);
    return {
      items: posts,
      stats: {
        totalPosts: posts.length,
        totalAuthors: authors.length,
        totalComments: comments
      }
    };
  })
  .withTree([
    { component: 'Metric', props: { title: 'Total Posts' }, valuePath: '/stats/totalPosts' },
    { component: 'Metric', props: { title: 'Total Authors' }, valuePath: '/stats/totalAuthors' },
    { component: 'Metric', props: { title: 'Total Comments' }, valuePath: '/stats/totalComments' },
    { component: 'Table', props: { columns: ['title', 'category', 'views'] }, valuePath: '/items' },
  ])
  .addAction('export', {
    description: 'Export to CSV',
    async handler({ manager, params }) {
      const posts = await manager.posts.findMany();
      // ... export logic
      return { success: true, fileUrl: '/exports/posts.csv' };
    }
  })
  .build();

const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .addCollection(Posts)
  .addCollection(Authors)
  .addCollection(Comments)
  .addView(DashboardView)
  .build();

// Render the global view
const dashboard = await docs.views.render('dashboard');
console.log(dashboard.stats.totalPosts);    // 42
console.log(dashboard.stats.totalAuthors);  // 8
console.log(dashboard.items);               // All posts
```

### View Definition (JSON File)

```json
// .fractal/views/dashboard.view.json
{
  "name": "dashboard",
  "title": "Blog Dashboard",
  "getData": "./hooks/dashboard.ts",
  "tree": [
    { "component": "Metric", "valuePath": "/stats/totalPosts" },
    { "component": "Table", "valuePath": "/items" }
  ]
}
```

### View Definition (TypeScript File)

```typescript
// .fractal/views/dashboard.view.ts
import { IgniterCollectionView } from '@igniter-js/collections';

export default IgniterCollectionView.create('dashboard')
  .withTitle('Analytics Dashboard')
  .withGetData(async ({ manager }) => {
    const posts = await manager.posts.findMany();
    return {
      items: posts,
      stats: { totalPosts: posts.length }
    };
  })
  .withTree([
    { component: 'Metric', valuePath: '/stats/totalPosts' }
  ])
  .build();
```

### Executing View Actions

```typescript
// Execute an action on a global view
const result = await docs.views.executeAction('dashboard', 'export', {
  format: 'csv'
});

if (result.success) {
  console.log('Export ready:', result.fileUrl);
} else {
  console.error('Export failed:', result.error);
}
```

---

## 🔍 Unified Watcher (Auto-Discovery)

The watcher discovers collections and views from the filesystem, supporting both JSON and TypeScript files with hot reload.

### Basic Auto-Discovery

```typescript
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withBasePath(process.cwd())
  .withWatcher('.fractal', {
    collections: '**/schema.{json,ts}',  // Collection definitions
    views: '**/view.{json,ts}',          // View definitions
    autoWatch: true,                     // Hot reload on file changes
  })
  .build();

// Collections and views are available automatically!
const posts = await docs.posts.findMany();
const dashboard = await docs.views.render('dashboard');
```

### Multiple Directories (Plugin System)

```typescript
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withWatcher([
    '.fractal',                          // Core schemas
    'plugins/*/schemas',                 // Plugin schemas
    'node_modules/@my-org/*/schemas',    // NPM package schemas
  ], {
    collections: '**/schema.{json,ts}',
    views: '**/view.{json,ts}',
    autoWatch: process.env.NODE_ENV === 'development',
  })
  .build();

// Auto-prefixing prevents conflicts:
// plugins/blog/schemas/posts.schema.json    → blog:posts
// plugins/docs/schemas/posts.schema.json    → docs:posts
// .fractal/schemas/posts.schema.json        → posts

await docs['blog:posts'].findMany();
await docs['docs:posts'].findMany();
await docs.posts.findMany(); // Core posts
```

### Collection Schema File (JSON)

```json
// .fractal/schemas/posts.schema.json
{
  "name": "posts",
  "patterns": [".content/posts/{id}.mdx"],
  "schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string", "minLength": 1 },
      "author": { "type": "string" },
      "published": { "type": "boolean", "default": false }
    },
    "required": ["title", "author"]
  }
}
```

### Collection Schema File (TypeScript)

```typescript
// .fractal/schemas/posts.schema.ts
import { IgniterCollectionModel } from '@igniter-js/collections';
import { z } from 'zod';

export default IgniterCollectionModel.create('posts')
  .withPatterns(['.content/posts/{id}.mdx'])
  .withSchema(z.object({
    title: z.string(),
    author: z.string(),
    published: z.boolean().default(false),
  }))
  .onCreated(({ value }) => ({
    ...value,
    createdAt: new Date().toISOString(),
  }))
  .build();
```

### Hot Reload (Development)

```typescript
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withWatcher('.fractal', {
    collections: '**/schema.{json,ts}',
    views: '**/view.{json,ts}',
    autoWatch: true,
  })
  .build();

// Start watching for file changes
await docs.startWatching();

// Now edit .fractal/schemas/posts.schema.ts
// The manager automatically reloads the schema!

// Manually refresh if needed
await docs.refresh();

// Stop watching
docs.stopWatching();
```

### Watcher Options

```typescript
interface IgniterCollectionWatcherConfig {
  paths: string | string[];           // Directories to watch
  collections?: string;              // Glob for collection files (default: "*.schema.{json,ts}")
  views?: string;                    // Glob for view files (default: "*.view.{json,ts}")
  autoWatch?: boolean;               // Enable filesystem watching
}
```

---

## 📐 Templates & Dynamic Content

When creating a collection, you can define a `template` path. This allows the `content` property in `.create()` and `.update()` to be a strongly-typed object instead of a raw string.

Igniter uses Handlebars to automatically hydrate the template with the provided object.

```typescript
const Prompts = IgniterCollectionModel.create('prompts')
  .withPatterns(['prompts/{id}.md'])
  .withTemplate('templates/prompt.hbs')
  .withSchema(z.object({
    title: z.string(),
    content: z.object({
      agent: z.string(),
      instructions: z.string()
    })
  }))
  .build();

// Creating a document
const doc = await docs.prompts.create({
  data: {
    title: "System Prompt",
    content: {
      agent: "Lia",
      instructions: "Be helpful."
    }
  }
});
```

---

## 🧩 Multi-Runtime Adapters

### Bun (High Performance)

```typescript
import { BunFsAdapter } from '@igniter-js/collections/adapters';

const docs = IgniterCollections.create()
  .withAdapter(new BunFsAdapter())
  .addCollection(Posts)
  .build();
```

### Node.js (Cross-Runtime)

```typescript
import { NodeFsAdapter } from '@igniter-js/collections/adapters';

const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .addCollection(Posts)
  .build();
```

### Redis (Distributed)

```typescript
import { BunRedisAdapter } from '@igniter-js/collections/adapters';

const docs = IgniterCollections.create()
  .withAdapter(new BunRedisAdapter({
    url: 'redis://localhost:6379',
    keyPrefix: 'content:',
    ttl: 3600,
  }))
  .addCollection(Posts)
  .build();
```

### S3 (Cloud Storage)

```typescript
import { BunS3Adapter } from '@igniter-js/collections/adapters';

const docs = IgniterCollections.create()
  .withAdapter(new BunS3Adapter({
    bucket: 'my-content-bucket',
    region: 'us-east-1',
    endpoint: 'https://s3.amazonaws.com',
  }))
  .addCollection(Posts)
  .build();
```

### Mock (Testing)

```typescript
import { MockAdapter } from '@igniter-js/collections/adapters';

const mockAdapter = new MockAdapter();
const docs = IgniterCollections.create()
  .withAdapter(mockAdapter)
  .addCollection(Posts)
  .build();
```

---

## 🌍 Real-World Examples

### Example 1: Documentation Site

```typescript
import { IgniterCollections, IgniterCollectionModel } from '@igniter-js/collections';
import { NodeFsAdapter } from '@igniter-js/collections/adapters';
import { z } from 'zod';

const Docs = IgniterCollectionModel.create('docs')
  .withPatterns(['content/docs/{id}.mdx'])
  .withSchema(z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['guide', 'api', 'tutorial']),
    order: z.number().int().min(0),
  }))
  .build();

const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .addCollection(Docs)
  .build();

// Build navigation tree
const navigation = await docs.docs.findMany({
  orderBy: { order: 'asc' },
});
```

### Example 2: Blog with Scheduled Publishing

```typescript
const Posts = IgniterCollectionModel.create('posts')
  .withSchema(z.object({
    title: z.string(),
    publishedAt: z.string().datetime(),
    status: z.enum(['draft', 'scheduled', 'published']),
  }))
  .onList(({ values }) => {
    const now = new Date();
    return values.filter((post) => {
      if (post.status !== 'published') return false;
      return new Date(post.publishedAt) <= now;
    });
  })
  .build();
```

### Example 3: Multi-Collection Analytics Dashboard

```typescript
import { IgniterCollectionView } from '@igniter-js/collections';

const AnalyticsView = IgniterCollectionView.create('analytics')
  .withTitle('Site Analytics')
  .withGetData(async ({ manager }) => {
    const [posts, authors, comments] = await Promise.all([
      manager.posts.findMany(),
      manager.authors.findMany(),
      manager.comments.count()
    ]);
    return {
      items: posts,
      stats: {
        totalPosts: posts.length,
        totalAuthors: authors.length,
        totalComments: comments,
        avgViews: posts.reduce((s, p) => s + (p.views || 0), 0) / posts.length
      }
    };
  })
  .withTree([
    { component: 'Metric', valuePath: '/stats/totalPosts' },
    { component: 'Metric', valuePath: '/stats/totalAuthors' },
    { component: 'Metric', valuePath: '/stats/totalComments' },
    { component: 'Chart', valuePath: '/items' }
  ])
  .build();

const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .addCollection(Posts)
  .addCollection(Authors)
  .addCollection(Comments)
  .addView(AnalyticsView)
  .build();

const dashboard = await docs.views.render('analytics');
```

### Example 4: Configuration Management

```typescript
const Configs = IgniterCollectionModel.create('configs')
  .withPatterns(['.config/{id}.json'])
  .withSchema(z.object({
    environment: z.enum(['dev', 'staging', 'production']),
    apiUrl: z.string().url(),
    features: z.record(z.boolean()),
  }))
  .onUpdated(({ newValue }) => {
    if (newValue.environment === 'production') {
      if (!newValue.apiUrl.includes('api.prod.com')) {
        throw new Error('Production config must use prod API');
      }
    }
    return newValue;
  })
  .build();
```

---

## 📚 API Reference

### IgniterCollections (Main Builder)

```typescript
class IgniterCollectionsBuilder<TCollections> {
  static create(): IgniterCollectionsBuilder<{}>
  
  withBasePath(path: string | string[]): this
  withAdapter(adapter: IgniterCollectionAdapter): this
  withWatcher(paths: string | string[], options?: WatcherConfig): this
  withTelemetry(telemetry: IgniterTelemetryManager): this
  withLogger(logger: IgniterLogger): this
  withGlobalHooks(hooks: IgniterCollectionModelHooks): this
  
  addCollection<T>(collection: Definition<T>): IgniterCollectionsBuilder<TCollections & T>
  addView(view: IgniterCollectionViewDefinition): this
  
  build(): IIgniterCollectionsManager<TCollections>
}
```

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `create()` | None | `Builder` | Static factory for new builder |
| `withBasePath()` | `path: string \| string[]` | `this` | Set root path(s) for collections |
| `withAdapter()` | `adapter: IgniterCollectionAdapter` | `this` | **Required.** Set storage adapter |
| `withWatcher()` | `paths, options?` | `this` | Enable filesystem discovery with auto-watch |
| `withTelemetry()` | `telemetry: IgniterTelemetryManager` | `this` | Connect to telemetry system |
| `withLogger()` | `logger: IgniterLogger` | `this` | Set custom logger |
| `withGlobalHooks()` | `hooks: IgniterCollectionModelHooks` | `this` | Apply hooks to all collections |
| `addCollection()` | `collection: Definition` | `Builder<T + C>` | Register a collection (type-safe) |
| `addView()` | `view: ViewDefinition` | `this` | Register a global view |
| `build()` | None | `Manager` | Build the operational manager |

### IgniterCollectionModel (Collection Builder)

```typescript
class IgniterCollectionModelBuilder<TSchema, TName> {
  static create<TName>(name: TName): Builder<unknown, TName>
  
  withPatterns(patterns: string[]): this
  withTemplate(path: string): this
  withSchema<S>(schema: S): Builder<InferSchema<S>, TName>
  
  onCreated(hook: OnCreatedHook<TSchema>): this
  onUpdated(hook: OnUpdatedHook<TSchema>): this
  onDeleted(hook: OnDeletedHook<TSchema>): this
  onRead(hook: OnReadHook<TSchema>): this
  onList(hook: OnListHook<TSchema>): this
  
  build(): IgniterCollectionModelDefinition<TSchema, TName>
}
```

### IgniterCollectionView (View Builder)

```typescript
class IgniterCollectionViewBuilder {
  static create(name: string): IgniterCollectionViewBuilder
  
  withTitle(title: string): this
  withDescription(description: string): this
  withGetData(hook: ViewDataHook): this        // Required
  withTree(tree: ViewNode[]): this
  withTransform(transform: Transform): this
  addAction(name: string, action: ViewAction): this
  
  build(): IgniterCollectionViewDefinition
}
```

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `create()` | `name: string` | `Builder` | Start building a view |
| `withTitle()` | `title: string` | `this` | Set display title |
| `withDescription()` | `description: string` | `this` | Set description |
| `withGetData()` | `hook: Function` | `this` | **Required.** Data fetching hook |
| `withTree()` | `tree: Node[]` | `this` | UI component tree |
| `withTransform()` | `transform: Transform` | `this` | Add data transformation |
| `addAction()` | `name, action` | `this` | Add view action |
| `build()` | None | `Definition` | Build immutable definition |

### Collection Manager (CRUD Operations)

```typescript
interface IIgniterCollectionModel<TSchema> {
  findUnique(args: FindUniqueArgs): Promise<Document<TSchema> | null>
  findMany(args?: FindManyArgs): Promise<Document<TSchema>[]>
  count(args?: CountArgs): Promise<number>
  create(args: CreateArgs<TSchema>): Promise<Document<TSchema>>
  update(args: UpdateArgs<TSchema>): Promise<Document<TSchema>>
  delete(args: DeleteArgs): Promise<Document<TSchema>>
  definition: IgniterCollectionModelDefinition
}
```

### Views Manager (Global)

```typescript
interface IIgniterCollectionViewManager {
  render(name: string, options?: RenderOptions): Promise<RenderResult>
  executeAction(viewName: string, actionName: string, params?: any): Promise<ActionResult>
  list(): ViewDefinition[]
  get(name: string): ViewDefinition | undefined
}
```

### Query System (Prisma-like)

```typescript
// Where Clause
interface IgniterCollectionWhereClause<T> {
  search?: { term: string; fields?: Record<string, { weight?: number; fuzzy?: boolean }> };
  fieldName?: value;
  fieldName?: { equals?: value; not?: value; in?: value[]; lt?: number; gte?: number; contains?: string };
  arrayField?: { has?: item; hasEvery?: item[]; isEmpty?: boolean };
}

// Select & Exclude
interface IgniterCollectionSelectClause<T> {
  select?: { [K in keyof T]?: boolean };
  exclude?: { [K in keyof T]?: boolean };
}
```

---

## 🔧 Configuration

### Global Hooks

Apply hooks to **all** collections:

```typescript
const docs = IgniterCollections.create()
  .withAdapter(adapter)
  .withGlobalHooks({
    onCreated: ({ value }) => ({
      ...value,
      createdAt: new Date().toISOString(),
    }),
  })
  .addCollection(Posts)
  .build();
```

### File Patterns

Customize file naming:

```typescript
// Single pattern
.withPatterns(['{id}.mdx'])

// Multiple fallback patterns
.withPatterns([
  '{id}.mdx',
  '{id}/index.mdx'
])

// Custom extensions
.withPatterns(['{id}.json'])
.withPatterns(['{id}.yaml'])
```

---

## 🧪 Testing

### Unit Testing with MockAdapter

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { IgniterCollections, IgniterCollectionModel } from '@igniter-js/collections';
import { MockAdapter } from '@igniter-js/collections/adapters';
import { z } from 'zod';

describe('Posts Collection', () => {
  let docs: ReturnType<typeof createDocs>;
  let mockAdapter: MockAdapter;
  
  beforeEach(() => {
    mockAdapter = new MockAdapter();
    docs = createDocs(mockAdapter);
    mockAdapter.reset();
  });
  
  it('should create a post', async () => {
    const post = await docs.posts.create({
      data: { title: 'Test Post', published: true },
    });
    
    expect(post.id).toBeDefined();
    expect(post.title).toBe('Test Post');
    expect(mockAdapter.calls.write).toHaveLength(1);
  });
  
  it('should validate schema', async () => {
    await expect(
      docs.posts.create({
        data: { title: '', published: true },
      })
    ).rejects.toThrow('Validation failed');
  });
});

function createDocs(adapter: MockAdapter) {
  const Posts = IgniterCollectionModel.create('posts')
    .withPatterns(['content/posts/{id}.mdx'])
    .withSchema(z.object({
      title: z.string().min(1),
      published: z.boolean(),
    }))
    .build();
  
  return IgniterCollections.create()
    .withAdapter(adapter)
    .addCollection(Posts)
    .build();
}
```

---

## 🎨 Best Practices

### ✅ Do

```typescript
// ✅ Use immutable builders
const Posts = IgniterCollectionModel.create('posts')
  .withPatterns(['content/posts/{id}.mdx'])
  .withSchema(schema)
  .build();

// ✅ Always set a schema for type safety
.withSchema(z.object({
  title: z.string(),
  published: z.boolean(),
}))

// ✅ Use BunFsAdapter in Bun for performance
.withAdapter(new BunFsAdapter())

// ✅ Use hooks for metadata
.onCreated(({ value }) => ({
  ...value,
  createdAt: new Date() 
}))

// ✅ Use global views for multi-collection dashboards
.addView(IgniterCollectionView.create('dashboard')
  .withGetData(async ({ manager }) => {
    const posts = await manager.posts.findMany();
    return { items: posts };
  })
  .build()
)

// ✅ Handle hook errors gracefully
.onCreated(async ({ value, manager }) => {
  try {
    await manager.audit.create({ ... });
  } catch (error) {
    console.error('Audit failed:', error);
  }
  return value;
})
```

### ❌ Don't

```typescript
// ❌ Don't skip schema validation
const Posts = IgniterCollectionModel.create('posts')
  .withPatterns(['content/posts/{id}.mdx'])
  .build(); // Missing .withSchema()

// ❌ Don't perform heavy operations in hooks
.onCreated(async ({ value }) => {
  await heavyExternalAPICall();
  return value;
})

// ❌ Don't mutate hook context
.onCreated(({ value }) => {
  value.title = 'Changed'; // ❌ Mutates input
  return value;
})

// ✅ Instead, return new object
.onCreated(({ value }) => ({
  ...value,
  title: 'Changed' 
}))

// ❌ Don't use findMany for single results
const post = await docs.posts.findMany({ where: { id: 'abc' } });
// ✅ Use findUnique instead
const post = await docs.posts.findUnique({ where: { id: 'abc' } });
```

---

## 🚨 Troubleshooting

### Error: `ADAPTER_REQUIRED`

**Cause:** No adapter configured during `.build()`

**Solution:**

```typescript
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .addCollection(Posts)
  .build();
```

### Error: `VALIDATION_ERROR`

**Cause:** Data doesn't match schema

**Solution:**

```typescript
try {
  await docs.posts.create({
    data: { title: '', published: true },
  });
} catch (error) {
  console.log(error.details.issues);
}
```

### Error: `VIEW_INVALID_CONFIGURATION`

**Cause:** View created without mandatory `getData` hook

**Solution:**

```typescript
// ❌ Missing getData
const BadView = IgniterCollectionView.create('bad').build();

// ✅ Always provide getData
const GoodView = IgniterCollectionView.create('good')
  .withGetData(async ({ manager }) => ({
    items: await manager.posts.findMany()
  }))
  .build();
```

### Error: `TRANSPILE_FAILED`

**Cause:** TypeScript file has syntax error

**Solution:**

```typescript
// Check your .schema.ts or .view.ts file for syntax errors
// Ensure it exports default:
export default IgniterCollectionModel.create('posts')
  .withSchema(z.object({ ... }))
  .build();
```

### Performance: Slow `findMany` with Large Collections

**Solutions:**

1. Use pagination:
```typescript
const page1 = await docs.posts.findMany({ take: 50, skip: 0 });
```

2. Use Redis/S3 adapter with indexing

3. Use views with pre-filtered data:
```typescript
const RecentView = IgniterCollectionView.create('recent')
  .withGetData(async ({ manager }) => {
    const posts = await manager.posts.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' }
    });
    return { items: posts };
  })
  .build();
```

---

## 🔗 Framework Integration

### Next.js (App Router)

```typescript
// lib/collections.ts
import { IgniterCollections, IgniterCollectionModel } from '@igniter-js/collections';
import { NodeFsAdapter } from '@igniter-js/collections/adapters';

const Posts = IgniterCollectionModel.create('posts')
  .withPatterns(['content/posts/{id}.mdx'])
  .withSchema(postSchema)
  .build();

export const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withBasePath(process.cwd())
  .addCollection(Posts)
  .build();

// app/blog/page.tsx
import { docs } from '@/lib/collections';

export default async function BlogPage() {
  const posts = await docs.posts.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
  });
  
  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.description}</p>
        </article>
      ))}
    </div>
  );
}
```

### Express.js API

```typescript
import express from 'express';
import { IgniterCollections } from '@igniter-js/collections';
import { BunRedisAdapter } from '@igniter-js/collections/adapters';

const app = express();
app.use(express.json());

const docs = IgniterCollections.create()
  .withAdapter(new BunRedisAdapter({ url: process.env.REDIS_URL }))
  .addCollection(Posts)
  .build();

app.get('/api/posts', async (req, res) => {
  const posts = await docs.posts.findMany({
    where: { published: true },
  });
  res.json(posts);
});

app.post('/api/posts', async (req, res) => {
  const post = await docs.posts.create({
    data: req.body,
  });
  res.status(201).json(post);
});

app.listen(3000);
```

---

## 📊 Performance Benchmarks

| Operation | BunFsAdapter | NodeFsAdapter | BunRedisAdapter | Notes |
|-----------|--------------|---------------|-----------------|-------|
| Read 1 file | **0.3ms** | 0.8ms | 1.2ms | Native Bun wins |
| Read 100 files | **45ms** | 120ms | 80ms | Parallel I/O |
| Read 1000 files | **420ms** | 1100ms | 750ms | Bun native syscalls |
| Create 1 file | **0.5ms** | 1.1ms | 1.5ms | Write + validation |
| List directory | **2ms** | 5ms | 8ms | Glob expansion |

**Test Environment:** Apple M1 Pro, Bun 1.0.21, Node.js 20.10.0, Local Redis

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
git clone https://github.com/felipebarcelospro/igniter-js.git
cd igniter-js/packages/collections
bun install
bun run build
bun test
```

---

## 📄 License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro)

---

## 🔗 Related Projects

- [@igniter-js/core](../core) — HTTP framework core
- [@igniter-js/telemetry](../telemetry) — Observability system
- [@igniter-js/storage](../storage) — File storage abstraction
- [Igniter.js Documentation](https://igniterjs.com)

---

## 💬 Community & Support

- 📚 [Documentation](https://igniterjs.com/docs/collections)
- 💬 [Discord Community](https://discord.gg/igniterjs)
- 🐛 [Report Issues](https://github.com/felipebarcelospro/igniter-js/issues)
- 🔒 [Security Policy](https://github.com/felipebarcelospro/igniter-js/security/policy)

---

**Built with ❤️ by the Igniter.js team**