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
│  docs.views.get('dashboard').render()                         │
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

#### Complex Filtering

```typescript
const results = await docs.posts.findMany({
  where: {
    published: true,
    category: { in: ['tutorial', 'guide'] },
    title: { contains: 'TypeScript', startsWith: 'Getting' },
    views: { gte: 100, lt: 1000 },
    tags: { has: 'featured' },
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0,
});
```

#### String Operators

Filter string fields with precision:

```typescript
// Exact match and negation
await docs.posts.findMany({ where: { status: { equals: 'published', not: 'draft' } } });

// Substring matching
await docs.posts.findMany({ where: { title: { contains: 'TypeScript' } } });

// Prefix and suffix matching
await docs.posts.findMany({ where: { slug: { startsWith: 'getting-started' } } });
await docs.posts.findMany({ where: { email: { endsWith: '@example.com' } } });

// Combined string operators
await docs.posts.findMany({
  where: {
    title: { contains: 'TypeScript', startsWith: 'Getting' },
    slug: { startsWith: 'tutorial' },
  }
});
```

#### Array Operators

Filter documents based on array field contents:

```typescript
// Array contains a specific value
await docs.posts.findMany({ where: { tags: { has: 'featured' } } });

// Array contains ALL values
await docs.posts.findMany({ where: { tags: { hasEvery: ['featured', 'typescript'] } } });

// Array contains at least ONE of these values
await docs.posts.findMany({ where: { tags: { hasSome: ['tutorial', 'guide', 'news'] } } });

// Array is empty or not empty
await docs.posts.findMany({ where: { comments: { isEmpty: false } } });

// Array exact length
await docs.posts.findMany({ where: { tags: { length: 3 } } });

// Combined array operators
await docs.posts.findMany({
  where: {
    tags: { has: 'featured', hasEvery: ['ts', 'node'], isEmpty: false },
    categories: { hasSome: ['tech', 'programming', 'devops'] },
  }
});
```

#### Nested Select & Exclude

Shape the returned data by selecting or excluding specific fields, including nested objects:

```typescript
// Select only top-level fields
const lightweightPosts = await docs.posts.findMany({
  select: {
    id: true,
    title: true,
  }
});

// Select nested fields
const postsWithAuthorName = await docs.posts.findMany({
  select: {
    id: true,
    title: true,
    author: { name: true, email: true },
    seo: { title: true, description: true },
  }
});

// Exclude specific fields (including nested)
const postsWithoutContent = await docs.posts.findMany({
  exclude: {
    content: true,
    seo: { image: true, keywords: true },
  }
});
```

> **Note:** `select` and `exclude` are mutually exclusive. Using both at the same time throws a `VALIDATION_ERROR`. TypeScript automatically infers the return type based on your selection.

#### Full-Text Search (FTS) with Fuzzy Matching

Search across document fields with weighted relevance scoring and fuzzy matching:

```typescript
// Basic FTS with default fields
const searchResults = await docs.posts.findMany({
  where: {
    search: {
      term: 'TypeScript',
      threshold: 0.1,
      fuzzy: true
    }
  }
});

// Advanced FTS with weighted fields and nested search
const advancedSearch = await docs.posts.findMany({
  where: {
    search: {
      term: 'getting started typescript',
      fields: {
        title: { weight: 3, fuzzy: true },
        description: { weight: 2, fuzzy: true },
        tags: { weight: 1.5, fuzzy: false },
        content: { weight: 1, fuzzy: true },
        'author.name': { weight: 2, fuzzy: true },
        'seo.keywords': { weight: 1, fuzzy: false },
      },
      threshold: 0.15,
      fuzzy: true,
    }
  }
});
```

**How FTS works:**
- **BM25 ranking**: Industry-standard algorithm used by Elasticsearch and Solr. Term frequency and document rarity determine relevance — rare terms are boosted, common terms are penalized
- **Field weights**: Higher weights increase relevance for matches in that field
- **Prefix matching**: Partial terms match full words out of the box — searching `"typ"` finds `"typescript"`
- **Fuzzy matching**: Tolerates typos and spelling variations with configurable edit distance
- **Term frequency**: Documents with more occurrences of a term rank higher
- **Threshold filtering**: Results below the threshold score are excluded (0-1 scale)
- **Search metadata**: Each result includes `_search.score` and `_search.matches` (matched field paths)

```typescript
// Results include search metadata automatically
for (const post of advancedSearch) {
  console.log(post._search.score);   // 0.85
  console.log(post._search.matches); // ['title', 'content']
}
```

#### Count Matching Documents

```typescript
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

#### Global Events

Listen to all collections at once:

```typescript
// Global event (any collection)
const { off } = docs.on('created', ({ collection, value }) => {
  console.log(`New document in ${collection}: ${value.id}`);
});

// Unsubscribe later
off();
```

#### Typed Scoped Events

Subscribe directly on a collection manager for **schema-typed** event payloads. TypeScript automatically infers the shape of `value`, `newValue`, `previousValue`, and `items` from the collection's schema:

```typescript
// Scoped events are fully typed — autocomplete works!
const sub = docs.posts.on('created', ({ value }) => {
  // TypeScript knows: value.title, value.author, value.published, etc.
  console.log(`Post created: ${value.title} by ${value.author}`);
});

sub.off(); // Unsubscribe
```

**Available scoped events:** `created`, `updated`, `deleted`, `read`, `list`

#### Global vs Scoped Comparison

| Aspect | Global (`docs.on(...)`) | Scoped (`docs.posts.on(...)`) |
|--------|-------------------------|-------------------------------|
| Payload | `{ collection, value }` | `{ value }` (typed) |
| Type Safety | `any` | Schema-inferred |
| Use Case | Cross-cutting concerns | Collection-specific logic |

```typescript
// Global — receives collection name as string
docs.on('updated', ({ collection, newValue, previousValue }) => {
  console.log(`${collection} updated`);
});

// Scoped — receives typed payload from the schema
docs.posts.on('updated', ({ newValue, previousValue }) => {
  // newValue.title is autocompleted by TypeScript
  if (newValue.published && !previousValue.published) {
    console.log(`Post published: ${newValue.title}`);
  }
});

// Scoped list event
docs.posts.on('list', ({ items }) => {
  // items is typed as IgniterCollectionDocument<PostSchema>[]
  console.log(`Listed ${items.length} posts`);
});
```

#### Custom Events

The event system also supports custom event names for extensibility:

```typescript
// Subscribe to a custom event
docs.posts.on('custom:approved', ({ value }) => {
  console.log('Custom approval:', value);
});
```

> **Note:** All `.on()` calls return a subscription handle with `{ off }` for easy cleanup.

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
  .withData(async ({ manager }) => {
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
const dashboard = await docs.views.get('dashboard').render();
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
  .withData(async ({ manager }) => {
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

Views can define interactive actions with parameter validation, confirmation dialogs, and optimistic state updates.

#### Basic Action Execution

```typescript
// Execute an action on a global view
const result = await docs.views.get('dashboard').actions.execute('export', {
  format: 'csv'
});

if (result.success) {
  console.log('Export ready:', result.fileUrl);
} else {
  console.error('Export failed:', result.error);
}
```

#### Parameter Validation

Actions can enforce typed parameters using Zod schemas. Invalid parameters automatically throw `ACTION_INVALID_PARAMS`:

```typescript
const DashboardView = IgniterCollectionView.create('dashboard')
  .withTitle('Blog Dashboard')
  .withData(async ({ manager }) => ({ items: [] }))
  .addAction('export', {
    description: 'Export posts to file',
    params: z.object({
      format: z.enum(['csv', 'json', 'xml']),
      includeDrafts: z.boolean().default(false),
    }),
    handler: async ({ manager, params }) => {
      const posts = await manager.posts.findMany({
        where: { published: !params.includeDrafts }
      });
      // ... export logic
      return { success: true, fileUrl: '/exports/posts.csv' };
    }
  })
  .build();

// Valid parameters — executes successfully
await docs.views.get('dashboard').actions.execute('export', {
  format: 'csv',
  includeDrafts: true
});

// Invalid parameters — throws ACTION_INVALID_PARAMS
await docs.views.get('dashboard').actions.execute('export', {
  format: 'pdf' // ❌ Not in enum
});
```

#### Confirmation Dialogs

Destructive or sensitive actions can require user confirmation before execution:

```typescript
const DashboardView = IgniterCollectionView.create('dashboard')
  .withTitle('Blog Dashboard')
  .withData(async ({ manager }) => ({ items: [] }))
  .addAction('deleteAll', {
    description: 'Delete all draft posts',
    confirm: {
      title: 'Delete All Drafts?',
      message: 'This will permanently remove all unpublished posts. This action cannot be undone.',
      variant: 'danger' // 'danger' | 'warning' | 'info'
    },
    handler: async ({ manager }) => {
      const drafts = await manager.posts.findMany({
        where: { published: false }
      });
      for (const draft of drafts) {
        await manager.posts.delete({ where: { id: draft.id } });
      }
      return { success: true, deletedCount: drafts.length };
    }
  })
  .build();
```

**Variant options:**
- `danger` — Critical destructive actions (delete, purge)
- `warning` — Potentially risky operations (bulk updates)
- `info` — Non-destructive but important confirmations

#### Optimistic Updates

Actions can return partial state patches using JSON Pointer paths, allowing the frontend to update the view without a full re-render:

```typescript
const DashboardView = IgniterCollectionView.create('dashboard')
  .withTitle('Blog Dashboard')
  .withData(async ({ manager }) => {
    const posts = await manager.posts.findMany();
    return {
      items: posts,
      stats: { totalPosts: posts.length, pendingCount: posts.filter(p => !p.published).length }
    };
  })
  .addAction('publishPost', {
    description: 'Publish a pending post',
    params: z.object({ postId: z.string() }),
    handler: async ({ manager, params }) => {
      await manager.posts.update({
        where: { id: params.postId },
        data: { published: true }
      });

      // Return partial updates instead of full re-render
      return {
        success: true,
        updates: {
          '/items/0/status': 'published',        // Update item status
          '/stats/pendingCount': 3,              // Decrement pending count
          '/lastAction': `Published post ${params.postId}`
        }
      };
    }
  })
  .build();
```

**How optimistic updates work:**
- The action returns `updates` with JSON Pointer paths as keys
- The frontend (or json-render consumer) applies these patches to the current view state
- No full `.render()` re-fetch is needed, reducing perceived latency
- Paths follow RFC 6901: `/items/0/status`, `/stats/totalPosts`, `/nested/deep/value`

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
const dashboard = await docs.views.get('dashboard').render();
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
await docs.watcher.start();

// Now edit .fractal/schemas/posts.schema.ts
// The manager automatically reloads the schema!

// Manually refresh if needed
await docs.refresh();

// Stop watching
docs.watcher.stop();
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

### Source Tracking

Collections and views loaded through the watcher are marked with a `source` property, distinguishing between programmatic definitions and dynamically discovered ones:

```typescript
// Inspect collection sources
const entries = docs.collections.entries();
for (const [name, meta] of Object.entries(entries)) {
  console.log(`${name}: ${meta.source}`); // 'built-in' | 'discovered'
}
```

- **`built-in`** — Added programmatically via `.addCollection()` or `.addView()`
- **`discovered`** — Loaded from filesystem via `.withWatcher()`

Programmatic definitions always take precedence when names collide.

---

## 🔄 Lifecycle Methods

Control the manager's lifecycle with manual refresh and cleanup methods.

### `refresh()` — Manual Reload

Reload schemas and views from disk without waiting for the watcher. Useful when `autoWatch` is disabled or when you need to force an immediate reload after external changes.

```typescript
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withWatcher('.fractal', {
    collections: '**/schema.{json,ts}',
    views: '**/view.{json,ts}',
    autoWatch: false, // Manual control
  })
  .build();

// External process modified a schema file
// Force immediate reload
await docs.refresh();

// New collections and views are now available
console.log(docs.collections.entries());
```

### `dispose()` — Cleanup Resources

Stop watching, clear collection managers, and release all resources. Call this when shutting down the application or between test runs to prevent memory leaks.

```typescript
// Server shutdown
process.on('SIGTERM', () => {
  docs.dispose();
  console.log('Collections manager cleaned up');
});

// Test cleanup
afterEach(() => {
  docs.dispose();
});
```

---

## 📐 Templates & Dynamic Content

Collections support document templates using **Handlebars** as the underlying engine. When you define a template with `.withTemplate()`, the `content` property in `.create()` and `.update()` becomes a **typed object** instead of a raw string. Handlebars automatically substitutes variables from the object into the template file.

### How Templates Work

1. Define a `.hbs` template file with Handlebars syntax
2. Call `.withTemplate()` on your collection builder pointing to that file
3. Pass a typed object as `content` when creating or updating documents
4. The engine renders the template with your data and stores the result

### Template File Example

Create a Handlebars template file:

```handlebars
<!-- templates/prompt.hbs -->
# {{title}}

You are {{content.agent}}, an AI assistant.

## Instructions

{{content.instructions}}

## Context
{{#if content.context}}
{{content.context}}
{{/if}}
```

### Collection with Template

```typescript
const Prompts = IgniterCollectionModel.create('prompts')
  .withPatterns(['prompts/{id}.md'])
  .withTemplate('templates/prompt.hbs')
  .withSchema(z.object({
    title: z.string(),
    content: z.object({
      agent: z.string(),
      instructions: z.string(),
      context: z.string().optional()
    })
  }))
  .build();

// Creating a document with typed content object
const doc = await docs.prompts.create({
  data: {
    title: "System Prompt",
    content: {
      agent: "Lia",
      instructions: "Be helpful, concise, and accurate.",
      context: "User is a senior developer."
    }
  }
});

// The stored file contains the rendered template:
// # System Prompt
// You are Lia, an AI assistant.
// ## Instructions
// Be helpful, concise, and accurate.
// ## Context
// User is a senior developer.
```

### Updating with Templates

Templates work the same way for updates:

```typescript
await docs.prompts.update({
  where: { id: doc.id },
  data: {
    content: {
      agent: "Lia",
      instructions: "Be creative and inspiring."
    }
  }
});
```

### Without Templates (Raw Strings)

If no template is defined, `content` must be a plain string:

```typescript
const Notes = IgniterCollectionModel.create('notes')
  .withPatterns(['notes/{id}.md'])
  .withSchema(z.object({ title: z.string() }))
  .build();

// Without template, content is a raw string
await docs.notes.create({
  data: {
    title: "My Note",
    content: "This is raw markdown content..."
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
  .withData(async ({ manager }) => {
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

const dashboard = await docs.views.get('analytics').render();
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
  withData(hook: ViewDataHook): this           // Required
  withTree(tree: ViewNode[]): this
  withMetadata(metadata: Record<string, any>): this
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
| `withData()` | `hook: Function` | `this` | **Required.** Data fetching hook |
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
  .withData(async ({ manager }) => {
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
  .withData(async ({ manager }) => ({
    posts: await manager.posts.findMany()
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
  .withData(async ({ manager }) => {
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