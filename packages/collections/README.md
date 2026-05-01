# @igniter-js/collections

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/collections)](https://www.npmjs.com/package/@igniter-js/collections)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange)](https://bun.sh)

**Type-safe ORM for content collections**  
Prisma-like API for Markdown, JSON, and YAML files with schema validation, lifecycle hooks, and declarative views.

[Quick Start](#-quick-start) • [Documentation](https://igniterjs.com/docs/collections) • [Examples](#-real-world-examples) • [API Reference](#-api-reference)

</div>

---

## ✨ Why @igniter-js/collections?

Managing content-driven applications shouldn't require a database. Whether you're building a documentation site, a blog, or a configuration management system, you need:

- ✅ **Type-safe content** — Catch errors at build time, not runtime
- ✅ **Familiar API** — Prisma-like queries you already know
- ✅ **Runtime flexibility** — Deploy anywhere (Bun, Node.js, Redis, S3)
- ✅ **Developer experience** — Autocomplete everywhere, zero boilerplate
- ✅ **Production-ready** — Lifecycle hooks, validation, and observability built-in

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
└────────────┬────────────────────────────────────────────┘
             │ Type-safe API
             ▼
┌─────────────────────────────────────────────────────────┐
│            IgniterCollectionManager (Proxy)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Posts     │  │    Docs      │  │   Authors    │  │
│  │  Manager     │  │  Manager     │  │   Manager    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
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
- **Views** → Declarative data shaping (stats, transforms, actions)

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
      threshold: 0.1, // Minimum match score
      fuzzy: true     // Global fuzzy fallback
    }
  }
});
// searchResults[0]._search.score contains the match score
// searchResults[0]._search.matches contains the matched fields

// Field Selection (Select & Exclude)
const lightweightPosts = await docs.posts.findMany({
  select: {
    id: true,
    title: true,
    // When using select, fields not specified are excluded
  }
});

// Count matching documents
const count = await docs.posts.count({
  where: { published: true },
});

// Find unique document
const post = await docs.posts.findUnique({
  where: { id: 'my-post-id' },
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
    await manager.collection('audit').create({
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
  // Required fields
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(500),
  author: z.string(),
  
  // Optional with defaults
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  
  // Complex types
  tags: z.array(z.string()).min(1).max(10),
  category: z.enum(['tutorial', 'guide', 'news', 'update']),
  
  // Dates
  publishedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  
  // Nested objects
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

// ✅ Type-safe access
console.log(post.title); // string
console.log(post.published); // boolean (default: false)
console.log(post.tags); // string[]
```

### Views System (Declarative UI Data)

Views allow you to shape data for specific UI needs without custom query logic.

```typescript
const Posts = IgniterCollectionModel.create('posts')
  .withSchema(postSchema)
  .withViews([
    {
      name: 'dashboard',
      title: 'Blog Dashboard',
      
      // Default query for this view
      defaultQuery: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      
      // Stats (aggregations)
      stats: {
        totalPosts: { type: 'count' },
        publishedCount: { type: 'count', where: { published: true } },
        averageViews: { type: 'avg', field: 'views' },
      },
      
      // Transformations
      transforms: [
        { type: 'group', field: 'category' },
      ],
      
      // UI component tree (JSON-compatible)
      tree: [
        {
          component: 'Metric',
          props: { title: 'Total Posts' },
          valuePath: '/stats/totalPosts',
        },
        {
          component: 'Table',
          props: { columns: ['title', 'category', 'views'] },
          valuePath: '/items',
        },
      ],
    },
  ])
  .build();

// Render the view
const dashboard = await docs.posts.views.render('dashboard');

console.log(dashboard.stats.totalPosts); // 42
console.log(dashboard.stats.publishedCount); // 28
console.log(dashboard.items); // Grouped by category
```

### Dynamic Schema Registry (Plugin Architecture)

The Schema Registry allows you to define collections entirely in JSON files—perfect for plugin systems, CMS platforms, or any scenario where collections need to be added/removed without code changes.

#### Complete Schema File Structure

Here's a **complete** schema definition showing all available capabilities:

```json
// .fractal/schemas/posts.schema.json
{
  "name": "posts",
  "patterns": [".content/posts/{id}.mdx"],
  
  "schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string", "minLength": 1, "maxLength": 200 },
      "description": { "type": "string", "minLength": 10 },
      "author": { "type": "string" },
      "published": { "type": "boolean", "default": false },
      "featured": { "type": "boolean", "default": false },
      "tags": { 
        "type": "array", 
        "items": { "type": "string" },
        "minItems": 1
      },
      "category": { 
        "type": "string",
        "enum": ["tutorial", "guide", "news", "update"]
      },
      "views": { "type": "number", "default": 0 },
      "publishedAt": { "type": "string", "format": "date-time" },
      "seo": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "image": { "type": "string", "format": "uri" }
        }
      }
    },
    "required": ["title", "description", "author"]
  },
  
  "hooks": {
    "onCreated": ".fractal/schemas/hooks/posts.onCreate.ts",
    "onUpdated": ".fractal/schemas/hooks/posts.onUpdate.ts",
    "onDeleted": ".fractal/schemas/hooks/posts.onDelete.ts",
    "onList": ".fractal/schemas/hooks/posts.onList.ts"
  },
  
  "views": [
    {
      "name": "dashboard",
      "title": "Blog Dashboard",
      "description": "Overview of blog posts with key metrics",
      
      "defaultQuery": {
        "orderBy": { "createdAt": "desc" },
        "take": 50
      },
      
      "stats": {
        "totalPosts": {
          "type": "count"
        },
        "publishedCount": {
          "type": "count",
          "where": { "published": true }
        },
        "draftCount": {
          "type": "count",
          "where": { "published": false }
        },
        "featuredCount": {
          "type": "count",
          "where": { "featured": true }
        },
        "totalViews": {
          "type": "sum",
          "field": "views"
        },
        "averageViews": {
          "type": "avg",
          "field": "views"
        }
      },
      
      "transforms": [
        {
          "type": "group",
          "field": "category"
        }
      ],
      
      "tree": [
        {
          "component": "Grid",
          "props": { "columns": 4, "gap": 4 },
          "children": [
            {
              "component": "Metric",
              "props": { 
                "title": "Total Posts",
                "icon": "FileText"
              },
              "valuePath": "/stats/totalPosts"
            },
            {
              "component": "Metric",
              "props": { 
                "title": "Published",
                "icon": "CheckCircle",
                "color": "green"
              },
              "valuePath": "/stats/publishedCount"
            },
            {
              "component": "Metric",
              "props": { 
                "title": "Drafts",
                "icon": "Edit",
                "color": "orange"
              },
              "valuePath": "/stats/draftCount"
            },
            {
              "component": "Metric",
              "props": { 
                "title": "Total Views",
                "icon": "Eye"
              },
              "valuePath": "/stats/totalViews"
            }
          ]
        },
        {
          "component": "Table",
          "props": {
            "columns": [
              { "key": "title", "label": "Title" },
              { "key": "category", "label": "Category" },
              { "key": "author", "label": "Author" },
              { "key": "views", "label": "Views" },
              { "key": "published", "label": "Published" }
            ]
          },
          "valuePath": "/items"
        }
      ],
      
      "actions": {
        "publish": {
          "description": "Publish a draft post",
          "params": {
            "type": "object",
            "properties": {
              "postId": { "type": "string" }
            },
            "required": ["postId"]
          },
          "handler": ".fractal/schemas/actions/posts.publish.ts",
          "confirm": {
            "title": "Publish Post",
            "message": "Are you sure you want to publish this post?",
            "variant": "info"
          }
        },
        "unpublish": {
          "description": "Unpublish a published post",
          "params": {
            "type": "object",
            "properties": {
              "postId": { "type": "string" }
            },
            "required": ["postId"]
          },
          "handler": ".fractal/schemas/actions/posts.unpublish.ts",
          "confirm": {
            "title": "Unpublish Post",
            "message": "This will hide the post from public view.",
            "variant": "warning"
          }
        },
        "toggleFeatured": {
          "description": "Toggle featured status",
          "params": {
            "type": "object",
            "properties": {
              "postId": { "type": "string" }
            },
            "required": ["postId"]
          },
          "handler": ".fractal/schemas/actions/posts.toggleFeatured.ts"
        },
        "bulkDelete": {
          "description": "Delete multiple posts",
          "params": {
            "type": "object",
            "properties": {
              "postIds": { 
                "type": "array",
                "items": { "type": "string" }
              }
            },
            "required": ["postIds"]
          },
          "handler": ".fractal/schemas/actions/posts.bulkDelete.ts",
          "confirm": {
            "title": "Delete Posts",
            "message": "This action cannot be undone. Are you sure?",
            "variant": "danger"
          }
        }
      }
    },
    
    {
      "name": "analytics",
      "title": "Content Analytics",
      "description": "Performance metrics for published content",
      
      "defaultQuery": {
        "where": { "published": true },
        "orderBy": { "views": "desc" },
        "take": 20
      },
      
      "stats": {
        "topPerformer": {
          "type": "custom",
          "fn": ".fractal/schemas/stats/posts.topPerformer.ts"
        },
        "totalEngagement": {
          "type": "sum",
          "field": "views",
          "where": { "published": true }
        }
      },
      
      "transforms": [
        {
          "type": "group",
          "field": "author"
        }
      ],
      
      "tree": [
        {
          "component": "Chart",
          "props": {
            "type": "bar",
            "title": "Top 10 Posts by Views"
          },
          "valuePath": "/items"
        }
      ]
    }
  ]
}
```

#### Hook Files (External TypeScript)

Hooks can be defined in external files for better maintainability:

**`.fractal/schemas/hooks/posts.onCreate.ts`**

```typescript
import type { IgniterCollectionOnCreatedHook } from '@igniter-js/collections';

export const onCreated: IgniterCollectionOnCreatedHook<any> = async ({ value, manager }) => {
  // Add automatic timestamps
  return {
    ...value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    slug: value.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
  };
};
```

**`.fractal/schemas/hooks/posts.onUpdate.ts`**

```typescript
import type { IgniterCollectionOnUpdatedHook } from '@igniter-js/collections';

export const onUpdated: IgniterCollectionOnUpdatedHook<any> = async ({ 
  newValue, 
  previousValue 
}) => {
  // Prevent unpublishing featured posts
  if (previousValue.featured && !newValue.published) {
    throw new Error('Cannot unpublish a featured post. Remove featured status first.');
  }
  
  // Update timestamp
  return {
    ...newValue,
    updatedAt: new Date().toISOString(),
  };
};
```

**`.fractal/schemas/hooks/posts.onDelete.ts`**

```typescript
import type { IgniterCollectionOnDeletedHook } from '@igniter-js/collections';

export const onDeleted: IgniterCollectionOnDeletedHook<any> = async ({ 
  value, 
  manager 
}) => {
  // Create audit log
  await manager.collection('audit').create({
    data: {
      action: 'deleted',
      collection: 'posts',
      documentId: value.id,
      documentTitle: value.title,
      deletedBy: 'system',
      timestamp: new Date().toISOString(),
    },
  });
  
  return true; // Proceed with deletion
};
```

**`.fractal/schemas/hooks/posts.onList.ts`**

```typescript
import type { IgniterCollectionOnListHook } from '@igniter-js/collections';

export const onList: IgniterCollectionOnListHook<any> = async ({ values }) => {
  // Filter out future scheduled posts
  const now = new Date();
  
  return values.filter((post) => {
    if (!post.published) return false;
    if (!post.publishedAt) return true;
    
    return new Date(post.publishedAt) <= now;
  });
};
```

#### View Action Handlers

Actions can also be defined in external files:

**`.fractal/schemas/actions/posts.publish.ts`**

```typescript
import type { IgniterCollectionViewActionHandler } from '@igniter-js/collections';

export const handler: IgniterCollectionViewActionHandler = async ({ 
  manager, 
  params 
}) => {
  try {
    const post = await manager.collection('posts').findUnique({
      where: { id: params.postId },
    });
    
    if (!post) {
      return {
        success: false,
        error: 'Post not found',
      };
    }
    
    if (post.published) {
      return {
        success: false,
        error: 'Post is already published',
      };
    }
    
    const updated = await manager.collection('posts').update({
      where: { id: params.postId },
      data: {
        published: true,
        publishedAt: new Date().toISOString(),
      },
    });
    
    return {
      success: true,
      data: updated,
      updates: {
        '/stats/publishedCount': '+1',
        '/stats/draftCount': '-1',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
```

**`.fractal/schemas/actions/posts.toggleFeatured.ts`**

```typescript
import type { IgniterCollectionViewActionHandler } from '@igniter-js/collections';

export const handler: IgniterCollectionViewActionHandler = async ({ 
  manager, 
  params 
}) => {
  const post = await manager.collection('posts').findUnique({
    where: { id: params.postId },
  });
  
  if (!post) {
    return { success: false, error: 'Post not found' };
  }
  
  const updated = await manager.collection('posts').update({
    where: { id: params.postId },
    data: {
      featured: !post.featured,
    },
  });
  
  return {
    success: true,
    data: updated,
    updates: {
      '/stats/featuredCount': updated.featured ? '+1' : '-1',
    },
  };
};
```

**`.fractal/schemas/actions/posts.bulkDelete.ts`**

```typescript
import type { IgniterCollectionViewActionHandler } from '@igniter-js/collections';

export const handler: IgniterCollectionViewActionHandler = async ({ 
  manager, 
  params 
}) => {
  const deletedIds: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];
  
  for (const postId of params.postIds) {
    try {
      await manager.collection('posts').delete({
        where: { id: postId },
      });
      deletedIds.push(postId);
    } catch (error) {
      errors.push({
        id: postId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return {
    success: errors.length === 0,
    data: {
      deleted: deletedIds.length,
      failed: errors.length,
      errors,
    },
    updates: {
      '/stats/totalPosts': `-${deletedIds.length}`,
    },
  };
};
```

**`.fractal/schemas/stats/posts.topPerformer.ts`**

```typescript
import type { IgniterCollectionDocument } from '@igniter-js/collections';

export function topPerformer(items: IgniterCollectionDocument<any>[]): any {
  if (items.length === 0) return null;
  
  return items.reduce((top, current) => {
    return (current.views || 0) > (top.views || 0) ? current : top;
  });
}
```

#### Initializing with Schema Registry

**Option 1: Auto-Discovery (Recommended)**

```typescript
import { IgniterCollections } from '@igniter-js/collections';
import { NodeFsAdapter } from '@igniter-js/collections/adapters';

const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withBasePath(process.cwd())
  .withSchemaRegistry('.fractal/schemas/*.schema.json', {
    autoWatch: true, // Hot-reload on schema changes (dev mode)
  })
  .build();

// Collections are available automatically!
const posts = await docs.posts.findMany();
const authors = await docs.authors.findMany();
const comments = await docs.comments.findMany();

// All collections discovered from .fractal/schemas/
```

**Option 2: Multiple Directories (Plugin System)**

```typescript
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withSchemaRegistry([
    '.fractal/schemas/**/*.schema.json',     // Core schemas
    'plugins/*/schemas/*.schema.json',       // Plugin schemas
    'node_modules/@my-org/*/schemas/*.json', // NPM package schemas
  ], {
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

#### Complete Usage Examples

**Example 1: Using Registry Collections**

```typescript
// The manager is already aware of all schema-defined collections
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withSchemaRegistry('.fractal/schemas')
  .build();

// CRUD operations work exactly the same
const post = await docs.posts.create({
  data: {
    title: 'My First Post',
    description: 'This is a test post',
    author: 'John Doe',
    category: 'tutorial',
    tags: ['typescript', 'igniter'],
  },
  content: '# Hello World\n\nThis is the content.',
});

// Hooks defined in .onCreate.ts run automatically
console.log(post.slug); // 'my-first-post' (auto-generated)
console.log(post.createdAt); // '2026-01-24T...' (auto-added)

// Find with filters
const tutorials = await docs.posts.findMany({
  where: {
    category: 'tutorial',
    published: true,
  },
  orderBy: { views: 'desc' },
});
```

**Example 2: Using Views**

```typescript
// Render the dashboard view
const dashboard = await docs.posts.views.render('dashboard');

console.log(dashboard.stats);
// {
//   totalPosts: 42,
//   publishedCount: 28,
//   draftCount: 14,
//   featuredCount: 5,
//   totalViews: 15420,
//   averageViews: 367
// }

console.log(dashboard.items);
// {
//   tutorial: [{ id: '...', data: {...} }, ...],
//   guide: [{ id: '...', data: {...} }, ...],
//   news: [{ id: '...', data: {...} }, ...],
// }

// Render analytics view
const analytics = await docs.posts.views.render('analytics');
console.log(analytics.stats.topPerformer);
// { id: 'post-123', data: { title: 'Most Popular Post', views: 5000 } }
```

**Example 3: Executing View Actions**

```typescript
// Get the view manager
const postsView = docs.posts.views;

// Execute the publish action
const result = await postsView.executeAction('publish', {
  postId: 'draft-post-123',
});

if (result.success) {
  console.log('Post published!', result.data);
  // UI can update state using result.updates
} else {
  console.error('Publish failed:', result.error);
}

// Toggle featured status
await postsView.executeAction('toggleFeatured', {
  postId: 'post-123',
});

// Bulk delete
const bulkResult = await postsView.executeAction('bulkDelete', {
  postIds: ['post-1', 'post-2', 'post-3'],
});

console.log(`Deleted ${bulkResult.data.deleted} posts`);
if (bulkResult.data.failed > 0) {
  console.error('Failed:', bulkResult.data.errors);
}
```

**Example 4: Hot-Reloading Schemas (Development)**

```typescript
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withSchemaRegistry('.fractal/schemas', {
    autoWatch: true,
  })
  .build();

// Start watching for schema changes
docs.startSchemaWatching((event) => {
  console.log('Schema changed:', event);
  // { type: 'added' | 'updated' | 'removed', name: 'posts' }
});

// Now edit .fractal/schemas/posts.schema.json
// The manager automatically reloads the schema!

// Manually refresh if needed
await docs.refreshSchemas();

// Stop watching
docs.stopSchemaWatching();
```

**Example 5: Multi-Tenant Plugin System**

```typescript
// CMS platform with plugin architecture
const cms = IgniterCollections.create()
  .withAdapter(new BunRedisAdapter({
    url: process.env.REDIS_URL,
  }))
  .withSchemaRegistry([
    'core/schemas/*.schema.json',
    'plugins/*/schemas/*.schema.json',
  ])
  .build();

// Each plugin contributes its own collections
// plugins/ecommerce/schemas/products.schema.json → ecommerce:products
// plugins/blog/schemas/posts.schema.json → blog:posts
// plugins/analytics/schemas/events.schema.json → analytics:events

// Access plugin collections
const products = await cms['ecommerce:products'].findMany();
const blogPosts = await cms['blog:posts'].findMany();
const events = await cms['analytics:events'].findMany();

// Cross-collection operations
const product = await cms['ecommerce:products'].findUnique({ 
  where: { id: 'prod-123' } 
});

await cms['analytics:events'].create({
  data: {
    type: 'product_viewed',
    productId: product.id,
    productName: product.name,
    timestamp: new Date().toISOString(),
  },
});
```

**Example 6: Schema-Driven Admin UI**

```typescript
// Build an admin UI dynamically from schemas
const cms = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withSchemaRegistry('.fractal/schemas')
  .build();

// Get all collection definitions
const collections = cms.definitions();

// For each collection, generate a UI panel
for (const [name, definition] of Object.entries(collections)) {
  console.log(`Collection: ${name}`);
  console.log(`Path: ${definition.basePath}`);
  console.log(`Schema:`, definition.schema);
  
  // Render views
  for (const view of definition.views) {
    console.log(`  View: ${view.name}`);
    console.log(`  Tree:`, view.tree); // UI component tree
    console.log(`  Actions:`, Object.keys(view.actions || {}));
  }
}

// The UI framework (React, Vue, etc.) can use this metadata
// to generate CRUD forms, dashboards, and action buttons automatically
```

### Templates & Dynamic Content

When creating a collection, you can define a `template` path. This allows the `content` property in `.create()` and `.update()` to be a strongly-typed object instead of a raw string. 

Igniter uses Handlebars to automatically hydrate the template with the provided object.

```typescript
const Prompts = IgniterCollectionModel.create('prompts')
  .withPatterns(['prompts/{id}.md'])
  .withTemplate('templates/prompt.hbs') // Enable template mode
  .withSchema(z.object({
    title: z.string(),
    content: z.object({ // Content is now an object, not a string
      agent: z.string(),
      instructions: z.string()
    })
  }))
  .build();

// Creating a document
const doc = await docs.prompts.create({
  data: {
    title: "System Prompt",
    content: { // Type-safe template variables
      agent: "Lia",
      instructions: "Be helpful."
    }
  }
});

// Output: Upon read, doc.content is always the rendered markdown string.
```

### Sub-Collections (Nested Content)

Organize related content hierarchically.

```typescript
const Plans = IgniterCollectionModel.create('plans')
  .withPatterns(['.fractal/plans/{id}.mdx'])
  .withSchema(planSchema)
  .build();

// Define a sub-collection for tasks within plans
const Tasks = Plans.collections.create('tasks')
  .withPatterns(['/tasks/{id}.mdx']) // Relative to parent: .fractal/plans/{id}/tasks/{id}.mdx
  .withSchema(taskSchema)
  .build();

// Access sub-collections
const plan = await docs.plans.findUnique({ where: { id: 'PLN-001' } });
const tasks = await plan.tasks.findMany({
  where: { status: 'pending' },
});
```

### Multi-Runtime Adapters

#### Bun (High Performance)

```typescript
import { BunFsAdapter } from '@igniter-js/collections/adapters';

const docs = IgniterCollections.create()
  .withAdapter(new BunFsAdapter()) // Native Bun syscalls
  .addCollection(Posts)
  .build();
```

#### Redis (Distributed)

```typescript
import { BunRedisAdapter } from '@igniter-js/collections/adapters';

const docs = IgniterCollections.create()
  .withAdapter(new BunRedisAdapter({
    url: 'redis://localhost:6379',
    keyPrefix: 'content:',
    ttl: 3600, // Optional TTL in seconds
  }))
  .addCollection(Posts)
  .build();
```

#### S3 (Cloud Storage)

```typescript
import { BunS3Adapter } from '@igniter-js/collections/adapters';

const docs = IgniterCollections.create()
  .withAdapter(new BunS3Adapter({
    bucket: 'my-content-bucket',
    region: 'us-east-1',
    endpoint: 'https://s3.amazonaws.com', // Or R2, MinIO, etc.
  }))
  .addCollection(Posts)
  .build();
```

#### Mock (Testing)

```typescript
import { MockAdapter } from '@igniter-js/collections/adapters';

const mockAdapter = new MockAdapter();
const docs = IgniterCollections.create()
  .withAdapter(mockAdapter)
  .addCollection(Posts)
  .build();

// In tests
await docs.posts.create({ data: { title: 'Test Post', published: true } });
expect(mockAdapter.calls.write).toHaveLength(1);
expect(mockAdapter.state.size).toBe(1);
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

// Group by category
const byCategory = navigation.reduce((acc, doc) => {
  const category = doc.category;
  if (!acc[category]) acc[category] = [];
  acc[category].push(doc);
  return acc;
}, {} as Record<string, typeof navigation>);
```

### Example 2: Blog with Scheduled Publishing

```typescript
const Posts = IgniterCollectionModel.create('posts')
  .withSchema(z.object({
    title: z.string(),
    publishedAt: z.string().datetime(),
    status: z.enum(['draft', 'scheduled', 'published']),
  }))
  
  // Filter out future posts
  .onList(({ values }) => {
    const now = new Date();
    return values.filter((post) => {
      if (post.status !== 'published') return false;
      return new Date(post.publishedAt) <= now;
    });
  })
  
  .build();
```

### Example 3: Multi-Tenant Content Platform

```typescript
import { BunRedisAdapter } from '@igniter-js/collections/adapters';

// Tenant-specific manager factory
function createTenantDocs(tenantId: string) {
  return IgniterCollections.create()
    .withAdapter(new BunRedisAdapter({
      url: process.env.REDIS_URL!,
      keyPrefix: `tenant:${tenantId}:`,
    }))
    .addCollection(Posts)
    .build();
}

const tenantA = createTenantDocs('tenant-a');
const tenantB = createTenantDocs('tenant-b');

// Isolated data per tenant
await tenantA.posts.create({ data: { title: 'A Post' } });
await tenantB.posts.create({ data: { title: 'B Post' } });
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
  
  // Validate on update
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

### Example 5: Content Migration CLI

```typescript
import { BunS3Adapter, NodeFsAdapter } from '@igniter-js/collections/adapters';

// Source: Local filesystem
const localDocs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .addCollection(Posts)
  .build();

// Destination: S3 bucket
const cloudDocs = IgniterCollections.create()
  .withAdapter(new BunS3Adapter({ bucket: 'my-content' }))
  .addCollection(Posts)
  .build();

// Migrate all posts
const posts = await localDocs.posts.findMany();
for (const post of posts) {
  await cloudDocs.posts.create({
    id: post.id,
    data: post,
  });
  console.log(`Migrated: ${post.id}`);
}
```

---

## 📚 API Reference

### IgniterCollections (Main Builder)

The main entry point for creating a collection manager.

```typescript
class IgniterCollectionsBuilder<TCollections> {
  static create(): IgniterCollectionsBuilder<{}>
  
  withBasePath(path: string | string[]): this
  withAdapter(adapter: IgniterCollectionAdapter): this
  withSchemaRegistry(path: string | string[], options?: RegistryOptions): this
  withTelemetry(telemetry: IgniterTelemetryManager): this
  withLogger(logger: IgniterLogger): this
  withGlobalHooks(hooks: IgniterCollectionModelHooks): this
  
  addCollection<T>(collection: Definition<T>): IgniterCollectionsBuilder<TCollections & T>
  
  build(): IIgniterCollectionsManager<TCollections>
}
```

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `create()` | None | `Builder` | Static factory for new builder |
| `withBasePath()` | `path: string \| string[]` | `this` | Set root path(s) for collections |
| `withAdapter()` | `adapter: IgniterCollectionAdapter` | `this` | **Required.** Set storage adapter |
| `withSchemaRegistry()` | `path: string \| string[], options?` | `this` | Enable dynamic schema loading from JSON files |
| `withTelemetry()` | `telemetry: IgniterTelemetryManager` | `this` | Connect to telemetry system |
| `withLogger()` | `logger: IgniterLogger` | `this` | Set custom logger |
| `withGlobalHooks()` | `hooks: IgniterCollectionModelHooks` | `this` | Apply hooks to all collections |
| `addCollection()` | `collection: Definition` | `Builder<T + C>` | Register a collection (type-safe) |
| `build()` | None | `Manager` | Build the operational manager |

**Example:**

```typescript
const docs = IgniterCollections.create()
  .withAdapter(new NodeFsAdapter())
  .withBasePath(process.cwd())
  .addCollection(Posts)
  .addCollection(Docs)
  .build();
```

---

### IgniterCollectionModel (Collection Builder)

Defines the schema, hooks, and configuration for a single collection.

```typescript
class IgniterCollectionModelBuilder<TSchema, TViews, TName> {
  static create<TName>(name: TName): Builder<unknown, {}, TName>
  
  withPatterns(patterns: string[]): this
  withTemplate(path: string): this
  withSchema<S>(schema: S): Builder<InferSchema<S>, TViews, TName>
  withViews(views: ViewDefinition[]): this
  
  onCreated(hook: OnCreatedHook<TSchema>): this
  onUpdated(hook: OnUpdatedHook<TSchema>): this
  onDeleted(hook: OnDeletedHook<TSchema>): this
  onRead(hook: OnReadHook<TSchema>): this
  onList(hook: OnListHook<TSchema>): this
  
  build(): IgniterCollectionModelDefinition<TSchema, TViews, TName>
}
```

**Methods:**

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `create()` | `name: string` | `Builder` | Start building a collection |
| `withPatterns()` | `patterns: string[]` | `this` | Set file patterns for resolution |
| `withTemplate()` | `path: string` | `this` | Set predefined template path |
| `withSchema()` | `schema: StandardSchemaV1` | `Builder<T>` | Set validation schema (Zod, JSON Schema) |
| `withViews()` | `views: ViewDefinition[]` | `this` | Register declarative views |
| `onCreated()` | `hook: Function` | `this` | Hook for document creation |
| `onUpdated()` | `hook: Function` | `this` | Hook for document updates |
| `onDeleted()` | `hook: Function` | `this` | Hook for document deletion |
| `onRead()` | `hook: Function` | `this` | Hook for single document reads |
| `onList()` | `hook: Function` | `this` | Hook for bulk document listings |
| `build()` | None | `Definition` | Build immutable definition |

**Example:**

```typescript
const Posts = IgniterCollectionModel.create('posts')
  .withPatterns(['content/posts/{id}.mdx'])
  .with
  .withSchema(postSchema)
  .onCreated(({ value }) => {
    console.log('Created:', value.id);
    return value;
  })
  .build();
```

---

### Collection Manager (CRUD Operations)

The operational instance for a specific collection.

```typescript
interface IIgniterCollectionModel<TSchema> {
  // Read operations
  findUnique(args: FindUniqueArgs): Promise<Document<TSchema> | null>
  findMany(args?: FindManyArgs): Promise<Document<TSchema>[]>
  count(args?: CountArgs): Promise<number>
  
  // Write operations
  create(args: CreateArgs<TSchema>): Promise<Document<TSchema>>
  update(args: UpdateArgs<TSchema>): Promise<Document<TSchema>>
  delete(args: DeleteArgs): Promise<Document<TSchema>>
  
  // Views
  views: IIgniterCollectionViewManager
  
  // Metadata
  definition: IgniterCollectionModelDefinition
}
```

**Methods:**

| Method | Arguments | Returns | Description |
|--------|-----------|---------|-------------|
| `findMany()` | `{ where?, orderBy?, take?, skip? }` | `Promise<Document[]>` | Find multiple documents with filtering and pagination |
| `findUnique()` | `{ where: { id } }` | `Promise<Document \| null>` | Find single document by ID |
| `create()` | `{ id?, data, content? }` | `Promise<Document>` | Create new document with validation |
| `update()` | `{ where, data }` | `Promise<Document>` | Update existing document (partial) |
| `delete()` | `{ where: { id } }` | `Promise<Document>` | Delete document and return last state |
| `count()` | `{ where? }` | `Promise<number>` | Count matching documents |

**Type: Document**

```typescript
interface IgniterCollectionDocument<TSchema> {
  id: string;
  path: string;
  data: TSchema; // Validated frontmatter
  content: string; // Markdown/text content
  raw: string; // Full file content
}
```

---

### Query System (Prisma-like)

#### Where Clause

```typescript
interface IgniterCollectionWhereClause<T> {
  // Full-Text Search
  search?: {
    term: string | string[];
    fields?: Record<string, { weight?: number; fuzzy?: boolean }>;
    threshold?: number;
    fuzzy?: boolean;
  };

  // Direct equality
  fieldName?: value;

  // Dot notation for nested fields
  "author.name"?: string;

  // Search inside arrays of objects automatically natively
  "tags.label"?: string;

  // Operators
  fieldName?: {
    equals?: value;
    not?: value;
    in?: value[];
    notIn?: value[];
    lt?: number | Date;
    lte?: number | Date;
    gt?: number | Date;
    gte?: number | Date;
    contains?: string;
    startsWith?: string;
    endsWith?: string;
  };

  // Array operators
  arrayField?: {
    has?: item;
    hasEvery?: item[];
    hasSome?: item[];
    isEmpty?: boolean;
    length?: number;
  };
};
  
  // Array operators
  arrayField?: {
    has?: item;
    hasEvery?: item[];
    hasSome?: item[];
    isEmpty?: boolean;
    length?: number;
  };
}
```

**Example:**

```typescript
const results = await docs.posts.findMany({
  where: {
    // Direct equality
    published: true,
    
    // Comparison
    views: { gte: 100, lt: 1000 },
    
    // String operations
    title: { contains: 'TypeScript' },
    slug: { startsWith: 'getting-started' },
    
    // Array operations
    tags: { has: 'featured' },
    categories: { hasSome: ['tech', 'programming'] },
    
    // In/Not in
    status: { in: ['published', 'featured'] },
    author: { notIn: ['banned-user'] },
  },
});
```

#### Select & Exclude

```typescript
interface IgniterCollectionSelectClause<T> {
  // Use select to pick specific fields
  select?: {
    [K in keyof T]?: boolean;
  };

  // OR use exclude to omit specific fields
  exclude?: {
    [K in keyof T]?: boolean;
  };
}
```

**Example:**

```typescript
// Select only specific fields (other fields are omitted)
const posts = await docs.posts.findMany({
  select: {
    id: true,
    title: true,
  },
});

// Exclude specific fields (other fields are included)
const lightweightPosts = await docs.posts.findMany({
  exclude: {
    content: true,
  },
});
```

#### Order By

```typescript
interface IgniterCollectionOrderByClause<T> {
  [field: string]: 'asc' | 'desc';
}
```

**Example:**

```typescript
const posts = await docs.posts.findMany({
  orderBy: { createdAt: 'desc' },
});

// Multiple fields
const posts = await docs.posts.findMany({
  orderBy: { publishedAt: 'desc', title: 'asc' },
});
```

#### Pagination

```typescript
const page1 = await docs.posts.findMany({
  take: 10,
  skip: 0,
});

const page2 = await docs.posts.findMany({
  take: 10,
  skip: 10,
});
```

---

### Hooks System

Hooks intercept the document lifecycle and can modify data or cancel operations.

```typescript
type OnCreatedHook<T> = (context: {
  value: Document<T>;
  collection: CollectionDefinition;
  manager: IIgniterCollectionsManager;
}) => Promise<Document<T> | false> | Document<T> | false;

type OnUpdatedHook<T> = (context: {
  newValue: Document<T>;
  previousValue: Document<T>;
  collection: CollectionDefinition;
  manager: IIgniterCollectionsManager;
}) => Promise<Document<T> | false> | Document<T> | false;

type OnDeletedHook<T> = (context: {
  value: Document<T>;
  collection: CollectionDefinition;
  manager: IIgniterCollectionsManager;
}) => Promise<boolean> | boolean;

type OnReadHook<T> = (context: {
  value: Document<T>;
  collection: CollectionDefinition;
  manager: IIgniterCollectionsManager;
}) => Promise<Document<T> | false> | Document<T> | false;

type OnListHook<T> = (context: {
  values: Document<T>[];
  collection: CollectionDefinition;
  manager: IIgniterCollectionsManager;
}) => Promise<Document<T>[] | false> | Document<T>[] | false;
```

**Rules:**
- Returning `false` cancels the operation (throws `HOOK_CANCELLED` error)
- Returning modified data applies the changes
- Hooks run **after** validation for creates/updates
- Hooks run **before** persistence for deletes
- Hooks can access the full `manager` for cross-collection operations

**Example:**

```typescript
.onCreated(async ({ value, manager }) => {
  // Add metadata
  return {
    ...value,
    createdAt: new Date().toISOString(),
    createdBy: await getCurrentUser(),
    };
})

.onDeleted(async ({ value, manager }) => {
  // Create audit log
  await manager.collection('audit').create({
    data: {
      action: 'deleted',
      collection: 'posts',
      documentId: value.id,
      timestamp: new Date(),
    },
  });
  
  return true; // Proceed with deletion
})
```

---

### Views System

Views provide a declarative way to shape data for UI consumption.

```typescript
interface IgniterCollectionViewDefinition {
  name: string;
  title: string;
  description?: string;
  
  defaultQuery?: {
    where?: WhereClause;
    orderBy?: OrderByClause;
    take?: number;
    skip?: number;
  };
  
  stats?: {
    [statName: string]: StatDefinition;
  };
  
  transforms?: Transform[];
  
  tree: ViewNode[];
  
  actions?: {
    [actionName: string]: ViewAction;
  };
}
```

**Stats Definitions:**

```typescript
type StatDefinition =
  | { type: 'count'; where?: WhereClause }
  | { type: 'sum' | 'avg' | 'min' | 'max'; field: string; where?: WhereClause }
  | { type: 'custom'; fn: (items: Document[]) => any };
```

**Transforms:**

```typescript
type Transform =
  | { type: 'group'; field: string }
  | { type: 'flatten'; separator?: string }
  | { type: 'pivot'; index: string; column: string; value: string };
```

**Example:**

```typescript
.withViews([
  {
    name: 'analytics',
    title: 'Content Analytics',
    
    defaultQuery: {
      where: { published: true },
      orderBy: { views: 'desc' },
    },
    
    stats: {
      totalViews: { type: 'sum', field: 'views' },
      avgViews: { type: 'avg', field: 'views' },
      publishedCount: { type: 'count', where: { published: true } },
    },
    
    transforms: [
      { type: 'group', field: 'category' },
    ],
    
    tree: [
      {
        component: 'Metric',
        props: { title: 'Total Views' },
        valuePath: '/stats/totalViews',
      },
    ],
  },
])
```

**Rendering:**

```typescript
const result = await docs.posts.views.render('analytics');

console.log(result.stats.totalViews); // 15420
console.log(result.items); // Grouped by category
```

---

### Adapters

#### IgniterCollectionAdapter Interface

All adapters must implement this contract:

```typescript
interface IgniterCollectionAdapter {
  // Required methods
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  delete(path: string): Promise<void>;
  list(dir: string, pattern?: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  
  // Optional capabilities
  mkdir?(path: string): Promise<void>;
  watch?(path: string, callback: (event: string, filename: string) => void): void;
}
```

#### BunFsAdapter (High Performance)

```typescript
import { BunFsAdapter } from '@igniter-js/collections/adapters';

const adapter = new BunFsAdapter();

// Features:
// ✅ Native Bun syscalls (Bun.file, Bun.write)
// ✅ Zero Node.js dependencies
// ✅ Recursive directory creation
// ✅ Native file watching
```

#### NodeFsAdapter (Cross-Runtime)

```typescript
import { NodeFsAdapter } from '@igniter-js/collections/adapters';

const adapter = new NodeFsAdapter();

// Features:
// ✅ Standard fs/promises
// ✅ Works in Node.js and Bun
// ✅ Widely compatible
```

#### BunRedisAdapter (Distributed)

```typescript
import { BunRedisAdapter } from '@igniter-js/collections/adapters';

const adapter = new BunRedisAdapter({
  url: 'redis://localhost:6379',
  keyPrefix: 'content:', // Optional namespace
  ttl: 3600, // Optional TTL in seconds
});

// Features:
// ✅ Key-value storage
// ✅ TTL support
// ✅ Pub/Sub for real-time updates
// ✅ SCAN-based listing with pattern matching
```

#### BunS3Adapter (Cloud Storage)

```typescript
import { BunS3Adapter } from '@igniter-js/collections/adapters';

const adapter = new BunS3Adapter({
  bucket: 'my-content-bucket',
  region: 'us-east-1',
  endpoint: 'https://s3.amazonaws.com', // Or R2, MinIO
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Features:
// ✅ Object storage (S3, R2, MinIO)
// ✅ Automatic pagination
// ✅ Streaming support
```

#### MockAdapter (Testing)

```typescript
import { MockAdapter } from '@igniter-js/collections/adapters';

const adapter = new MockAdapter();

// Features:
// ✅ In-memory storage
// ✅ Call tracking
// ✅ State snapshots
// ✅ Perfect for unit tests

// Access call history
adapter.calls.write; // Array of write calls
adapter.calls.read;  // Array of read calls

// Access state
adapter.state; // Map<path, content>

// Reset state
adapter.reset();
```

---

## 🔧 Configuration

### Schema Registry Options

```typescript
interface IgniterCollectionRegistryOptions {
  autoWatch?: boolean; // Watch for schema file changes (default: false)
  filePattern?: string; // Schema file pattern (default: "*.schema.json")
}
```

**Example:**

```typescript
.withSchemaRegistry('.fractal/schemas', {
  autoWatch: true,
  filePattern: '*.collection.json',
})
```

### Global Hooks

Apply hooks to **all** collections:

```typescript
const docs = IgniterCollections.create()
  .withAdapter(adapter)
  .withGlobalHooks({
    onCreated: ({ value }) => {
      return {
        ...value,
        createdAt: new Date().toISOString(),
    };
    },
  })
  .addCollection(Posts)
  .addCollection(Docs)
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
.withPatterns(['{id}.json']) // For JSON files
.withPatterns(['{id}.yaml']) // For YAML files
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
        data: { title: '', published: true }, // Invalid: empty title
      })
    ).rejects.toThrow('Validation failed');
  });
  
  it('should filter published posts', async () => {
    await docs.posts.create({ data: { title: 'Draft', published: false } });
    await docs.posts.create({ data: { title: 'Published', published: true } });
    
    const published = await docs.posts.findMany({
      where: { published: true },
    });
    
    expect(published).toHaveLength(1);
    expect(published[0].title).toBe('Published');
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

### Integration Testing

```typescript
import { NodeFsAdapter } from '@igniter-js/collections/adapters';
import { rm } from 'fs/promises';

describe('Integration: Filesystem', () => {
  const testDir = './test-content';
  
  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });
  
  it('should persist to disk', async () => {
    const docs = IgniterCollections.create()
      .withAdapter(new NodeFsAdapter())
      .withBasePath(testDir)
      .addCollection(Posts)
      .build();
    
    const post = await docs.posts.create({
      data: { title: 'Persisted Post', published: true },
      content: 'This is the content',
    });
    
    const { readFile } = await import('fs/promises');
    const fileContent = await readFile(
      `${testDir}/content/posts/${post.id}.mdx`,
      'utf-8'
    );
    
    expect(fileContent).toContain('title: Persisted Post');
    expect(fileContent).toContain('This is the content');
  });
});
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

// ✅ Use views for UI data shaping
.withViews([{ name: 'dashboard', stats: { ... } }])

// ✅ Handle hook errors gracefully
.onCreated(async ({ value, manager }) => {
  try {
    await manager.collection('audit').create({ ... });
  } catch (error) {
    console.error('Audit failed:', error);
  }
  return value; // Still proceed
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
  await heavyExternalAPICall(); // Blocks creation
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

// ❌ Don't ignore adapter capabilities
const adapter = new BunRedisAdapter({ ttl: 3600 });
// Missing: Consider TTL implications for long-term storage

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
  .withAdapter(new NodeFsAdapter()) // ← Add this
  .addCollection(Posts)
  .build();
```

---

### Error: `VALIDATION_ERROR`

**Cause:** Data doesn't match schema

**Solution:**

```typescript
// Check validation errors
try {
  await docs.posts.create({
    data: { title: '', published: true }, // Empty title
  });
} catch (error) {
  console.log(error.details.issues);
  // [{ path: ['title'], message: 'String must contain at least 1 character(s)' }]
}
```

---

### Error: `HOOK_CANCELLED`

**Cause:** A hook returned `false`

**Solution:**

```typescript
.onUpdated(({ newValue, previousValue }) => {
  if (someCondition) {
    return false; // Cancels operation
  }
  return newValue;
})

// Check hook logic
```

---

### Error: `VIEW_NOT_FOUND`

**Cause:** Requesting a view that doesn't exist

**Solution:**

```typescript
// Check registered views
console.log(docs.posts.definition.views.map(v => v.name));

// Verify view name matches
await docs.posts.views.render('dashboard'); // Must match registered name
```

---

### Performance: Slow `findMany` with Large Collections

**Diagnosis:** `findMany` loads all files and filters in-memory

**Solutions:**

1. Use pagination:
```typescript
const page1 = await docs.posts.findMany({ take: 50, skip: 0 });
```

2. Use Redis/S3 adapter with indexing

3. Consider a view with pre-filtered query:
```typescript
.withViews([{
  name: 'recent',
  defaultQuery: { take: 20, orderBy: { createdAt: 'desc' } }
}])
```

---

### Type Inference Not Working

**Cause:** Schema not implementing `StandardSchemaV1`

**Solution:**

```typescript
import { z } from 'zod';

// ✅ Zod schemas work automatically
const schema = z.object({ ... });

// ❌ Plain objects don't
const schema = { type: 'object', ... }; // Use JSON Schema instead
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

### Astro

```typescript
// src/lib/collections.ts
import { IgniterCollections, IgniterCollectionModel } from '@igniter-js/collections';
import { BunFsAdapter } from '@igniter-js/collections/adapters';

export const docs = IgniterCollections.create()
  .withAdapter(new BunFsAdapter())
  .addCollection(Posts)
  .build();

// src/pages/blog/[slug].astro
---
import { docs } from '../../lib/collections';

export async function getStaticPaths() {
  const posts = await docs.posts.findMany();
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
---

<article>
  <h1>{post.title}</h1>
  <div set:html={post.content} />
</article>
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

### Running Tests

```bash
# Run all tests
bun test

# Watch mode
bun test:watch

# Coverage
bun test --coverage
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
