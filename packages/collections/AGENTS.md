# AGENTS.md - @igniter-js/collections

> **Last Updated:** 2026-05-01
> **Version:** 0.2.0
> **Goal:** This document serves as the complete operational manual for Code Agents (Lia, Kai, Nova, Rex) and maintainers working with the `@igniter-js/collections` package. It follows the 1,000-line "Gold Standard" for robust agent training, ensuring deep understanding of architecture, flows, and troubleshooting.

## Key Changes in v2.0.0

- **Decoupled Views:** Views are no longer tied to collections. They are global entities with access to the full `IIgniterCollectionsManager`.
- **Unified Watcher:** `withWatcher()` replaces `withSchemaRegistry()`, supporting both collections and views.
- **TypeScript Discovery:** `.schema.ts` and `.view.ts` files are supported via jiti with hot reload.
- **Mandatory getData:** All views must define a `getData` hook.
- **Immutable ViewBuilder:** `IgniterCollectionView.create()` follows the immutable builder pattern.

---

## 1. Package Vision & Context

`@igniter-js/collections` is a **universal ORM for content-driven applications**. It treats files (Markdown, JSON, YAML) or key-value pairs (Redis) and objects (S3) as structured data collections with a Prisma-like API. It is designed to bridge the gap between static content and dynamic data management.

### 1.1 Core Philosophy
- **Standardization:** Bring database-like rigor to unstructured or semi-structured content. Every collection follows a predictable contract regardless of the underlying storage.
- **Runtime Native:** Provide zero-overhead adapters for modern runtimes like Bun while maintaining Node.js compatibility through standard implementations.
- **Type-Safety First:** Leverage TypeScript and StandardSchemaV1 (Zod, JSON Schema) for end-to-end type safety. The manager uses dynamic proxies to ensure that `docs.posts` is typed according to the "posts" collection schema.
- **Observability:** Built-in telemetry and logging for every operation, allowing developers to trace the lifecycle of a document from creation to retrieval.
- **Developer Experience:** A declarative, proxied API that feels like a native database client, reducing the boilerplate required to manage file-based data.

### 1.2 Target Audience
- **Static Site Generators:** Developers building documentation sites, blogs, or CMSs who want a better way to query their Markdown files.
- **Microservices:** Teams needing a lightweight alternative to a full database for configuration or small content sets.
- **High-Performance Content Apps:** Applications requiring high-performance content reading in Bun environments using native syscalls.
- **AI Ecosystems:** AI Agents needing a structured, version-controllable way to store and retrieve memories, logs, or knowledge bases.

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

Understanding the internal structure is crucial for correctly implementing new features or fixing bugs.

- `src/adapters/`: Contains the bridge between the ORM and the storage layer.
  - `index.ts`: Barrel export for all adapters.
  - `bun-fs.adapter.ts`: Native Bun filesystem integration using `Bun.file` and `Bun.write`. Optimized for high-throughput I/O and atomic operations.
  - `node-fs.adapter.ts`: Standard Node.js filesystem integration using `fs/promises`. Ensures cross-runtime compatibility for traditional environments.
  - `bun-redis.adapter.ts`: Bun-native Redis client wrapper. Supports key-based storage with TTL and Pub/Sub notifications for distributed state.
  - `bun-s3.adapter.ts`: Bun-native S3 client for object storage. Supports R2, MinIO, and AWS. Handles pagination automatically to present a unified "list" view.
  - `mock.adapter.ts`: High-fidelity in-memory adapter for testing with call tracking and state snapshots.
- `src/builders/`: Handles the configuration stage using the immutable builder pattern.
  - `index.ts`: Barrel export for builders.
  - `main.builder.ts`: Entry point for `IgniterCollections`. Accumulates global config (adapter, telemetry, logger, global hooks).
  - `collection.builder.ts`: Configuration for individual collections (schema, hooks, path, views).
- `src/core/`: The "brain" of the package.
  - `index.ts`: Barrel export for core components.
  - `manager.ts`: The main entry point that uses a `Proxy` for dynamic collection access. Handles schema registry initialization and event dispatching.
  - `collection-manager.ts`: Executes CRUD logic for a single collection. Coordinates validation, hooks, and adapters.
  - `schema-registry.ts`: Handles dynamic schema discovery from JSON files. Implements glob expansion, runtime hook loading, and conflict prefixing.
  - `view-manager.ts`: Manages the lifecycle of collection views, including rendering, action execution, and caching.
  - `event-emitter.ts`: Typed event dispatcher for hooks and observability. Uses `Promise.allSettled` for safe async emissions.
- `src/errors/`: Custom error classes.
  - `collection.error.ts`: `IgniterCollectionError` with structured metadata (`ctx.package`, `ctx.operation`) and descriptive error codes.
- `src/telemetry/`: Telemetry definitions (subpath export).
  - `index.ts`: `IgniterCollectionTelemetryEvents` using the telemetry builder. Grouped by `document`, `registry`, `view`, and `adapter`.
- `src/types/`: Pure TypeScript definitions (No logic here!).
  - `adapter.ts`: The `IgniterCollectionAdapter` contract. Defines mandatory methods and optional capabilities like `watch` and `mkdir`.
  - `builder.ts`: Internal state types for builders, ensuring type safety during the multi-step configuration process.
  - `collection.ts`: Document interfaces, collection definition types, and model metadata.
  - `hooks.ts`: Function signatures and context types for lifecycle hooks (`onCreated`, `onRead`, etc.).
  - `manager.ts`: Public API interfaces, including the complex `IIgniterCollectionsManager` with dynamic property types for proxied access.
  - `query.ts`: Complex types for `where` (Prisma-like filters), `orderBy`, and pagination args.
  - `view.ts`: Definitions for the Views System, including stats, transforms, and action handlers.
- `src/utils/`: Static helper classes.
  - `frontmatter.ts`: Wrapper for `gray-matter`. Handles YAML/JSON serialization/parsing and content separation.
  - `path.ts`: Utilities for resolving paths, normalizing slashes, and extracting IDs from filenames.
  - `id.ts`: Default ID generators (UUID v4, Slug from title, Date-prefixed slugs).
  - `view-stats.ts`: Optimized stats calculation engine for view aggregations (count, sum, avg).
  - `view-transforms.ts`: Data transformation engine for `group`, `flatten`, and `pivot` operations.
  - `schema.ts`: Unification layer for Zod and JSON Schema via `StdSchema` (StandardSchemaV1).

---

### 3. Architecture Deep-Dive

#### 3.1 The Immutable Builder Pattern
All configuration in `@igniter-js/collections` happens via immutable builders. Every `.with*()` call returns a **new instance** of the builder, ensuring that partial configurations can be reused without side effects.

**Design Decision:** We avoid mutation to prevent accidental state leakage when multiple managers are built from the same base configuration (e.g., in a multi-tenant setup where tenants share a base adapter but have different base paths).

#### 3.2 Dynamic Collection Proxy
The `IgniterCollectionManager` uses a JavaScript `Proxy` to provide a clean, property-based API.
- **The Trap:** When you access `docs.posts`, the `get` trap is triggered.
- **The Logic:**
  1. If the key matches a standard manager method (`collection`, `on`, `refreshSchemas`, `definitions`), return that method.
  2. If the key exists in the `collectionManagers` Map, return the manager for that collection.
  3. This allows the user to write `await docs.posts.findMany()` instead of `await docs.collection('posts').findMany()`.
- **Typing:** We use an intersection type `IIgniterCollectionsManagerMethods & IgniterCollectionsAccessor<TCollections>` to ensure full IDE support and type-safety.

#### 3.3 Schema Registry & Runtime Discovery
The `IgniterCollectionSchemaRegistry` allows loading collections from JSON schema files at runtime.
- **Auto-Discovery:** Scans directories based on glob patterns (e.g., `./plugins/*/schemas/*.json`).
- **Runtime Hook Loading:** Supports loading hooks from external files. If a schema specifies `"hooks": { "onCreated": "./hooks/timestamp.ts" }`, the registry attempts to dynamically import the module and extract the hook.
- **Auto-Prefixing:** If `posts.schema.json` is found in two different folders, the registry uses the parent folder name as a prefix (e.g., `blog:posts` vs `docs:posts`).
- **Watching:** In Bun, the registry can watch the filesystem. When a schema file is added or modified, the registry reloads it and automatically refreshes the main manager.

#### 3.4 Views & Data Transformations (RFC 6901) — **v2.0 Global Views**
The Views System was completely refactored in v2.0. Views are now **global first-class citizens** with unrestricted access to the `IIgniterCollectionsManager`.

**Architectural Changes:**
- **ViewManager (Global):** `IgniterCollectionViewManager` is initialized once per manager instance. It receives `manager: IIgniterCollectionsManager` instead of a single collection.
- **ViewBuilder:** `IgniterCollectionViewBuilder` creates view definitions independently. `getData` is **mandatory**.
- **ViewRegistry:** `IgniterCollectionViewRegistry` discovers `.view.json` and `.view.ts` files from the filesystem.
- **TransformEngine:** Unchanged — still applies `group`, `flatten`, `pivot`.
- **Stats Calculator:** Unchanged — still computes `count`, `sum`, `avg`, etc.
- **JSON Pointer:** Unchanged — still used for path resolution.

**Key Design Decisions:**
- Views have no `defaultQuery` — they fetch data via `getData` hook with full manager access.
- Views have no `collection` property — they access all collections freely.
- `withViews()` and `withTypedViews()` were removed from `IgniterCollectionModelBuilder`.

#### 3.5 Unified Watcher & Auto-Discovery
The `IgniterCollectionWatcher` (configured via `withWatcher()`) is the central orchestrator for runtime discovery.

**Components:**
- **IgniterCollectionWatcher (Config):** Holds paths, globs, and `autoWatch` flag. Does not perform I/O itself.
- **IgniterCollectionSchemaRegistry:** Owned by the watcher. Discovers `.schema.{json,ts}` files.
- **IgniterCollectionViewRegistry:** Owned by the watcher. Discovers `.view.{json,ts}` files.
- **IgniterCollectionLoader:** Shared utility. Wraps jiti for `.ts` and `JSON.parse` for `.json`.

**Lifecycle:**
1. `withWatcher(paths, { collections, views, autoWatch })` stores config in builder state.
2. `build()` passes config to `IgniterCollectionManager`.
3. Manager initializes `SchemaRegistry` and `ViewRegistry`.
4. If `autoWatch: true`, `startWatching()` is called automatically.
5. `refresh()` reloads both collections and views, merging with programmatic definitions.

#### 3.6 TypeScript File Loading via jiti
`jiti` (from UnJS) provides runtime TypeScript transpilation without ts-node.

**Why jiti:**
- Native ESM/CJS interoperability
- `moduleCache: false` enables hot reload
- `fsCache: true` keeps transpilation performant
- Bun-compatible via `tryNative: true`

**Configuration:**
```typescript
const jiti = createJiti(import.meta.url, {
  moduleCache: false,  // Critical for hot reload
  fsCache: true,       // Cache on disk
  tryNative: true,     // Use native import in Bun
  interopDefault: true, // Extract default export
});
```

**Usage in Loader:**
```typescript
// .ts file → jiti.import(filePath, { default: true })
// .json file → adapter.read() + JSON.parse()
```

**File Patterns:**
- Collections: `*.schema.json` or `*.schema.ts`
- Views: `*.view.json` or `*.view.ts`
- Hooks: `*.ts` (loaded dynamically by manager)

---

### 4. Operational Flow Mapping (Pipelines)

#### 4.1 Pipeline: `collectionManager.findMany(args)`
The `findMany` operation is a read-heavy pipeline that applies filtering in-memory.

1.  **Telemetry (Started):** Emits `igniter.collections.document.findMany.started`.
2.  **Pattern Conversion:** Combines `basePath` + collection `patterns`, replacing variables like `{id}` with glob wildcards (`*`).
3.  **Listing:** Calls `adapter.list()` using the glob pattern. Native filesystem adapters support hidden directories implicitly. 
4.  **Parallel Load:**
    -   Iterates over file list.
    -   Calls `adapter.read()`.
    -   Parses frontmatter.
    -   Validates against schema.
5.  **Filtering:** Applies `where` clause (in-memory). Supports operators: `contains`, `in`, `gt`, `lt`, `gte`, `lte`.
6.  **Sorting:** Applies `orderBy`.
7.  **Pagination:** Applies `skip` and `take`.
8.  **Hook (onList):** Calls `hooks.onList` to transform the final result set.
9.  **Telemetry (Success):** Emits `igniter.collections.document.findMany.success`.

#### 4.2 Pipeline: `collectionManager.delete(args)`
The `delete` operation removes a document and emits lifecycle events.

1.  **Fetch Document:** Reads the existing document to pass it to hooks and events.
2.  **Hook: `onDeleted` (Pre-Deletion):**
    -   Executes hook. 
    -   If returns `false`, aborts with `HOOK_CANCELLED`.
3.  **Persistence:** Calls `adapter.delete(path)`.
4.  **Events:** Emits global `deleted` and scoped `${name}:deleted`.
5.  **Telemetry:** Emits `igniter.collections.document.delete.success`.

#### 4.3 Pipeline: `manager.refreshSchemas()`
Reloads the dynamic schema registry.

1.  **Registry Refresh:** Calls `registry.refresh()`.
2.  **Re-Discovery:** Scans for files again.
3.  **Manager Sync:** 
    -   Compares old collection list with new one.
    -   Removes managers for deleted schemas.
    -   Creates managers for new schemas.
    -   Updates existing managers if definitions changed.
4.  **Events:** Emits schema change notifications if callbacks were provided.

#### 4.4 Pipeline: `collectionManager.count(args)`
Efficiently counts matching documents.

1.  **Filter Application:** Similar to `findMany`, it lists and filters documents.
2.  **Optimization:** If no filters are provided, it may optimize by just counting the keys from the adapter (if supported).
3.  **Return:** Returns the final length of the filtered list.

#### 4.5 Pipeline: `manager.views.render(name)`
Renders a global view with multi-collection data.

1.  **View Lookup:** Finds view in `IgniterCollectionViewManager.views` Map.
2.  **Validation:** Confirms `getData` hook exists (throws `VIEW_INVALID_CONFIGURATION` if missing).
3.  **Telemetry (Started):** Emits `igniter.collections.view.render.started`.
4.  **Hook Execution:** Calls `getData({ manager, options })`.
5.  **Transform Engine:** Applies transforms sequentially to `hookResult.items`.
6.  **Stats Calculation:** Computes declarative stats over transformed items.
7.  **Telemetry (Success):** Emits `igniter.collections.view.render.success`.
8.  **Return Result:** Returns `IgniterCollectionViewRenderResult`.

#### 4.6 Pipeline: `manager.refresh()`
Reloads both collections and views from disk.

1.  **Schema Registry Refresh:** Calls `schemaRegistry.refresh()`.
2.  **Collection Manager Sync:** Compares old/new collections. Adds/updates/removes managers.
3.  **View Registry Refresh:** Calls `viewRegistry.refresh()`.
4.  **View Merge:** Combines watched views with programmatic views. Programmatic wins.
5.  **Conflict Warning:** Logs `warn` if watched view name collides with programmatic view.
6.  **Rebuild ViewManager:** Creates new `IgniterCollectionViewManager` with merged views.

---

### 5. Detailed Adapter Internal Mappings

#### 5.1 BunFsAdapter (Native Filesystem)
- **`list(dir, pattern)`:** Uses `new Bun.Glob(pattern).scan({ cwd: dir, dot: true })`. The `dot: true` flag is mandatory to ensure collections can be stored inside hidden directories (e.g., `.content/`).
- **`write(path, content)`:** Uses `Bun.write(path, content)`.
- **`watch(path, callback)`:** Uses Bun's native `fs.watch`.


#### 5.2 BunRedisAdapter (Distributed Key-Value)
- **`list(prefix, pattern)`:** Uses `SCAN` with `MATCH`.
- **`write(key, content, options)`:** Uses `SET` with optional `EX`.
- **`watch(path, callback)`:** Uses Pub/Sub channel `igniter:collections:events`.

#### 5.3 BunS3Adapter (Object Storage)
- **`list(prefix, pattern)`:** Implements pagination with `isTruncated` and `NextContinuationToken`.
- **`read(key)`:** Uses `S3Client.file(key).text()`.

---

### 6. Views System Deep Dive (v2.0 Global Views)

#### 6.1 View Architecture
Views are **global** and **independent** of collections. They are defined via `IgniterCollectionView.create()` and registered via `.addView()` or discovered via `.withWatcher()`.

**Key Characteristics:**
- **No defaultQuery:** Views fetch data entirely through the `getData` hook.
- **No collection property:** The hook receives `manager: IIgniterCollectionsManager` and can access any collection.
- **Mandatory getData:** `IgniterCollectionViewBuilder.build()` throws `VIEW_INVALID_CONFIGURATION` if `getData` is missing.
- **Global Manager:** `docs.views.render('dashboard')` accesses the single `IgniterCollectionViewManager` instance.

#### 6.2 View Builder API
```typescript
const DashboardView = IgniterCollectionView.create('dashboard')
  .withTitle('Analytics Dashboard')
  .withGetData(async ({ manager }) => {
    const [posts, authors] = await Promise.all([
      manager.posts.findMany(),
      manager.authors.findMany(),
    ]);
    return {
      items: posts,
      stats: { totalPosts: posts.length, totalAuthors: authors.length }
    };
  })
  .withTree([
    { component: 'Metric', valuePath: '/stats/totalPosts' },
    { component: 'Table', valuePath: '/items' }
  ])
  .addAction('export', {
    description: 'Export to CSV',
    handler: async ({ manager, params }) => ({ success: true })
  })
  .build();
```

#### 6.3 View Actions (Implemented)
- **`group`:** Groups items into a dictionary based on a field value.
  - *Example:* Group posts by `author`.
- **`flatten`:** flattens nested objects into dot-notation keys.
  - *Example:* `{ meta: { title: 'X' } }` becomes `{ 'meta.title': 'X' }`.
- **`pivot`:** Reorganizes data from long to wide format.
  - *Config:* `index`, `column`, `value`.

#### 6.4 View Render Flow (v2.0)
1. **View Lookup:** Finds view by name in global `IgniterCollectionViewManager`.
2. **Validation:** Confirms `getData` exists.
3. **Telemetry (Started):** Emits `igniter.collections.view.render.started`.
4. **Hook Execution:** Calls `getData({ manager, options })`. Returns `{ items, stats?, extra? }`.
5. **Transform Engine:** Applies `transforms` sequentially to `items`.
6. **Stats Calculation:** Computes declarative stats over final items.
7. **Telemetry (Success):** Emits `igniter.collections.view.render.success`.
8. **Return Result:** Returns `IgniterCollectionViewRenderResult`.

### 7. TypeScript File Loading Deep Dive

#### 7.1 Why TypeScript Files?
TypeScript schema and view files provide:
- **Type Safety:** Full IDE support and compile-time checking.
- **Dynamic Logic:** Use Zod schemas, computed properties, and conditional logic.
- **Import Reuse:** Share constants, types, and utilities across definitions.
- **Hot Reload:** `moduleCache: false` ensures changes are picked up immediately.

#### 7.2 File Structure

**Collection Schema (TypeScript):**
```typescript
// .fractal/schemas/posts.schema.ts
import { IgniterCollectionModel } from '@igniter-js/collections';
import { z } from 'zod';

export default IgniterCollectionModel.create('posts')
  .withPatterns(['.content/posts/{id}.mdx'])
  .withSchema(z.object({
    title: z.string(),
    publishedAt: z.date(),
  }))
  .onCreated(async ({ value, manager }) => {
    console.log(`Post created: ${value.title}`);
  })
  .build();
```

**View Definition (TypeScript):**
```typescript
// .fractal/views/dashboard.view.ts
import { IgniterCollectionView } from '@igniter-js/collections';

export default IgniterCollectionView.create('dashboard')
  .withTitle('Analytics Dashboard')
  .withGetData(async ({ manager }) => {
    const [posts, authors] = await Promise.all([
      manager.posts.findMany(),
      manager.authors.findMany(),
    ]);
    return {
      items: posts,
      stats: { totalPosts: posts.length, totalAuthors: authors.length }
    };
  })
  .withTree([
    { component: 'Metric', valuePath: '/stats/totalPosts' }
  ])
  .build();
```

#### 7.3 Hot Reload Mechanism
1. File is modified on disk.
2. Adapter `watch` callback fires.
3. Debounce timer (100ms) prevents excessive reloads.
4. Registry calls `refresh()`.
5. `IgniterCollectionLoader.load()` calls `jiti.import()` with `moduleCache: false`.
6. jiti transpiles the file fresh (ignoring module cache).
7. New definition replaces old one in manager.
8. `onSchemaChange` / `onViewChange` callbacks fire.

#### 7.4 Migration from JSON to TypeScript
Both formats can coexist in the same project:
```typescript
const docs = IgniterCollections.create()
  .withWatcher('.fractal', {
    collections: '**/schema.{json,ts}',
    views: '**/view.{json,ts}',
    autoWatch: true,
  })
  .build();
```

---

### 8. Hook System Deep Dive

Hooks are the primary mechanism for extending collection behavior without modifying core logic. They operate at the boundary between the manager and the adapter, allowing transformations, validations, side effects, and event emissions.

#### 8.1 Hook Types & Signatures

| Hook | Timing | Mutates Data | Context |
|------|--------|--------------|---------|
| `onCreated` | After validation, before persistence | Yes | `{ value, id?, manager }` |
| `onUpdated` | After read, before persistence | Yes | `{ value, previousValue, id, manager }` |
| `onDeleted` | After read, before deletion | Yes (can abort) | `{ value, id, manager }` |
| `onRead` | After read, before return | Yes | `{ value, id, manager }` |
| `onList` | After filtering, before return | Yes | `{ items, manager }` |

#### 8.2 Hook Execution Order

For a `create` operation:
1. Validate input against schema
2. Call `onCreated` hook
3. If hook returns `false`, throw `HOOK_CANCELLED`
4. If hook returns object, use as new value
5. Persist via adapter
6. Emit `created` event

For an `update` operation:
1. Read existing document
2. Merge new data with existing
3. Validate merged result
4. Call `onUpdated` hook
5. If hook returns `false`, throw `HOOK_CANCELLED`
6. Persist via adapter
7. Emit `updated` event

#### 8.3 Global Hooks

Global hooks apply to ALL collections managed by an instance:
```typescript
const docs = IgniterCollections.create()
  .withAdapter(adapter)
  .withGlobalHooks({
    onCreated: async ({ value, manager }) => {
      value.createdAt = new Date().toISOString();
      return value;
    }
  })
  .build();
```

Global hooks execute BEFORE collection-specific hooks. If a global hook returns `false`, the operation is cancelled immediately.

#### 8.4 Hook Best Practices

- **Keep hooks idempotent:** The same hook may run multiple times during retries.
- **Avoid heavy I/O:** Hooks block the CRUD operation. Use events for async side effects.
- **Return the value:** Always return the (possibly modified) value object, even if unchanged.
- **Use manager for cross-collection operations:** Access other collections via `manager.otherCollection`.

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 9. Exhaustive Error Code Library

#### `ADAPTER_REQUIRED`
- **Context:** Occurs during `.build()`.
- **Cause:** No adapter was provided.
- **Solution:** Call `.withAdapter(new NodeFsAdapter())`.

#### `VALIDATION_ERROR`
- **Context:** During `create` or `update`.
- **Cause:** Data doesn't match schema.
- **Solution:** Inspect `error.details.validation.errors`.

#### `HOOK_CANCELLED`
- **Context:** Any CRUD operation.
- **Cause:** A hook returned `false`.
- **Solution:** Check business rules in hooks.

#### `VIEW_NOT_FOUND`
- **Context:** `views.render()`.
- **Cause:** Requesting a view name that wasn't registered.
- **Solution:** Verify view names in `definitions()`.

---

### 10. Best Practices & Anti-Patterns

| Practice | Why? | Example |
|----------|------|---------|
| ✅ Use `BunFsAdapter` in Bun | Native performance | `new BunFsAdapter()` |
| ✅ Define schemas | Runtime safety | `.withSchema(z.object({...}))` |
| ✅ Use hooks for metadata | DRY principles | `onCreated` for `createdAt` |
| ❌ Manual ID generation | Risk of conflicts | Let the manager generate UUIDs |
| ❌ Heavy hooks | Blocks CRUD operations | Keep hooks lean and fast |

---

## III. TECHNICAL REFERENCE & RESILIENCE

### 11. Distribution Anatomy (Consumption)

Understanding how `@igniter-js/collections` is distributed helps in selecting the right imports and ensuring optimal bundle sizes.

- **Main Entrypoint (`@igniter-js/collections`):**
  - Contains the `IgniterCollections` and `IgniterCollectionModel` builders.
  - Contains the core manager logic and lifecycle management.
  - Excludes specific adapters and telemetry to avoid bloating consumer bundles with unused dependencies.
- **Adapters Subpath (`@igniter-js/collections/adapters`):**
  - Contains all production adapters (`BunFs`, `NodeFs`, `BunRedis`, `BunS3`).
  - Contains the `MockAdapter` for testing.
  - *Recommendation:* Always import only the adapter you need to minimize runtime overhead.
- **Telemetry Subpath (`@igniter-js/collections/telemetry`):**
  - Contains the telemetry event definitions.
  - This subpath is separated to prevent circular dependencies between `@igniter-js/telemetry` and the collections package.
- **Shim Protection (`src/shim.ts`):**
  - Most adapters and core logic in this package are **server-only**.
  - The `package.json` maps the `browser` field to `shim.ts`, which throws a descriptive "Server-only" error if the package is accidentally imported into a client-side bundle (e.g., in a React component).

### 12. Exhaustive API Reference

#### 12.1 IgniterCollectionsBuilder (The Main Builder)

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `create()` | None | `Builder<{}>` | Static factory for a new builder instance. |
| `withAdapter()` | `adapter: IgniterCollectionAdapter` | `this` | Sets the filesystem or database adapter. **Required.** |
| `withBasePath()` | `path: string \| string[]` | `this` | Sets the root path(s) for collection resolution. |
| `withWatcher()` | `paths: string \| string[], options?` | `this` | Configures unified watcher for collections and views. |
| `withTelemetry()` | `telemetry: IgniterTelemetryManager` | `this` | Connects the package to the telemetry system. |
| `withLogger()` | `logger: IgniterLogger` | `this` | Sets a custom logger for operational tracing. |
| `withGlobalHooks()` | `hooks: IgniterCollectionModelHooks` | `this` | Applies hooks to all collections managed by this instance. |
| `addCollection()` | `collection: Definition` | `Builder<T + C>` | Manually registers a collection with full type inference. |
| `addView()` | `view: ViewDefinition` | `Builder<T>` | Manually registers a global view. |
| `build()` | None | `Manager<T>` | Validates state and returns the operational Manager. |

#### 12.2 IgniterCollectionViewBuilder (The View Builder)

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `create(name)` | `name: string` | `Builder` | Starts building a view named `name`. |
| `withTitle()` | `title: string` | `this` | Sets the display title. |
| `withDescription()` | `description: string` | `this` | Sets the description. |
| `withGetData()` | `hook: Hook` | `this` | Sets the data hook (**Mandatory**). |
| `withTree()` | `tree: Node[]` | `this` | Sets the UI component tree. |
| `withTransform()` | `transform: Transform` | `this` | Adds a data transformation. |
| `addAction()` | `name: string, action: Action` | `this` | Adds an action. |
| `build()` | None | `Definition` | Returns the immutable view definition. |

#### 12.2 IgniterCollectionModelBuilder (The Collection Builder)

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `create(name)` | `name: string` | `Builder` | Starts building a collection named `name`. |
| `withPatterns()` | `patterns: string[]` | `this` | Sets file patterns for resolution (e.g., `['.content/posts/{id}.mdx']`). |
| `withTemplate()` | `path: string` | `this` | Sets a predefined template path for generating content. |
| `withSchema()` | `schema: S` | `Builder<Infer<S>>` | Sets the validation schema and updates type inference. |
| `onCreated()` | `hook: Hook` | `this` | Register a callback for the creation lifecycle. |
| `onUpdated()` | `hook: Hook` | `this` | Register a callback for the update lifecycle. |
| `onDeleted()` | `hook: Hook` | `this` | Register a callback for the deletion lifecycle. |
| `onRead()` | `hook: Hook` | `this` | Register a callback for single document reads. |
| `onList()` | `hook: Hook` | `this` | Register a callback for bulk document listings. |
| `build()` | None | `Definition` | Returns the immutable collection definition. |

#### 12.3 CollectionManager (CRUD Operations)

| Method | Arguments | Returns | Description |
|--------|-----------|---------|-------------|
| `findMany()` | `{ where, select, exclude, orderBy, take, skip }` | `Promise<Doc[]>` | Fetches, filters (including FTS `search`), and shapes documents. |
| `findUnique()` | `{ where: { id } }` | `Promise<Doc \| null>` | Fetches a single document by its unique ID. |
| `create()` | `{ data: T, id? }` | `Promise<Doc>` | Validates and persists a new document. |
| `update()` | `{ where, data }` | `Promise<Doc>` | Partially updates an existing document. |
| `delete()` | `{ where }` | `Promise<Doc>` | Removes a document and returns its last state. |
| `count()` | `{ where? }` | `Promise<number>` | Returns the number of matching documents. |

### 13. Telemetry & Observability Registry

The `@igniter-js/collections` package emits high-granularity events to ensure the framework is fully observable.

| Event Name | Group | Attributes | Meaning |
|------------|-------|------------|---------|
| `findMany.started` | `document` | `ctx.query.where`, `ctx.query.take` | Initialized a bulk read operation. |
| `findMany.success` | `document` | `ctx.document.count`, `ctx.duration_ms` | Bulk read completed successfully. |
| `create.success` | `document` | `ctx.document.id`, `ctx.document.path` | A new document was persisted. |
| `view.render.started` | `view` | `ctx.view.name`, `ctx.view.collection` | A view rendering process started. |
| `view.render.success` | `view` | `ctx.view.items_count`, `ctx.duration_ms` | View result is ready for the UI. |
| `registry.refresh.started` | `registry` | `ctx.registry.path_count` | Started scanning for schema files. |
| `adapter.read.error` | `adapter` | `ctx.adapter.type`, `ctx.error.code` | A low-level storage read failed. |

### 14. Real-World Use Case Library (Expanded)

#### Case 6: Dynamic Plugin Content
A multi-plugin CMS where each plugin provides its own content types. The main app uses `withSchemaRegistry` pointing to the `node_modules` of plugins to automatically discover their schemas and build the management UI dynamically.

#### Case 7: High-Frequency Cache for Microservices
Using `BunRedisAdapter` with `@igniter-js/collections` as a type-safe cache layer. Service A writes complex objects to Redis, and Service B reads them with full validation, ensuring that data corruption in Redis (due to manual intervention) is caught immediately at the ORM layer.

#### Case 8: Multi-Step Content Approval Workflow
Using hooks to implement an approval state machine.
```typescript
.onUpdated(({ newValue, previousValue }) => {
  if (previousValue.status === 'approved' && newValue.status === 'draft') {
    throw new Error('Cannot revert approved content to draft');
  }
  return newValue;
})
```

#### Case 9: Global Search Implementation
By utilizing the native **Full-Text Search (FTS)** capabilities of `findMany`, developers can build powerful global search engines over their Markdown content without external search services. The FTS engine supports `fields` weighting, `threshold` filtering, and Levenshtein-based `fuzzy` matching, automatically attaching `_search` scores to results.

#### Case 10: Automatic Image Optimization on Upload
A collection that manages image metadata in Markdown. An `onCreated` hook triggers an asynchronous process to optimize the image on S3 and update the Markdown file with the new optimized URL.

#### Case 11: E-commerce Product Catalog with Variants
A product collection with computed variant pricing based on base price and modifier rules.
```typescript
const products = IgniterCollectionModel.create('products')
  .withPatterns(['.content/products/{id}.mdx'])
  .withSchema(z.object({
    name: z.string(),
    basePrice: z.number(),
    variants: z.array(z.object({
      sku: z.string(),
      modifier: z.number().default(0),
    })),
  }))
  .onRead(({ value }) => ({
    ...value,
    variants: value.variants.map(v => ({
      ...v,
      finalPrice: value.basePrice + v.modifier
    }))
  }))
  .build();
```

#### Case 12: Multi-Tenant SaaS with Isolated Collections
Each tenant gets isolated collections using path prefixing. The adapter is shared, but base paths differ.
```typescript
const tenantDocs = (tenantId: string) => IgniterCollections.create()
  .withAdapter(new BunFsAdapter())
  .withBasePath(`.data/tenants/${tenantId}`)
  .withWatcher('.fractal/schemas', { autoWatch: true })
  .build();
```

#### Case 13: Documentation Site with Versioning
Store multiple versions of documentation as separate collections, with a view that aggregates the latest version of each page.
```typescript
const docs = IgniterCollections.create()
  .withAdapter(adapter)
  .addCollection(IgniterCollectionModel.create('v1').withPatterns(['.content/v1/{id}.mdx']).build())
  .addCollection(IgniterCollectionModel.create('v2').withPatterns(['.content/v2/{id}.mdx']).build())
  .addView(IgniterCollectionView.create('latest')
    .withTitle('Latest Documentation')
    .withGetData(async ({ manager }) => {
      const v2Docs = await manager.v2.findMany();
      return { items: v2Docs };
    })
    .build()
  )
  .build();
```

#### Case 14: AI Agent Memory System
An AI agent uses collections to store episodic memories with semantic search capabilities.
```typescript
const memories = IgniterCollectionModel.create('memories')
  .withPatterns(['.data/memories/{id}.mdx'])
  .withSchema(z.object({
    agentId: z.string(),
    timestamp: z.string().datetime(),
    content: z.string(),
    embedding: z.array(z.number()).optional(),
    importance: z.number().min(0).max(1),
  }))
  .onCreated(({ value }) => ({
    ...value,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }))
  .build();
```

#### Case 15: Feature Flag Management
Store feature flags in Markdown with environment-specific overrides.
```typescript
const flags = IgniterCollectionModel.create('feature-flags')
  .withPatterns(['.config/flags/{id}.mdx'])
  .withSchema(z.object({
    name: z.string(),
    enabled: z.boolean(),
    environments: z.record(z.boolean()).default({}),
    rolloutPercentage: z.number().min(0).max(100).default(100),
  }))
  .build();

// Check flag for current environment
const isEnabled = (flag: any, env: string) => {
  return flag.environments[env] ?? flag.enabled;
};
```

#### Case 16: Automated Changelog Generation
Use hooks to automatically generate changelog entries when releases are created.
```typescript
const releases = IgniterCollectionModel.create('releases')
  .withPatterns(['.content/releases/{id}.mdx'])
  .onCreated(async ({ value, manager }) => {
    await manager.changelog.create({
      data: {
        version: value.version,
        date: new Date().toISOString(),
        changes: value.changes,
      }
    });
    return value;
  })
  .build();
```

#### Case 17: Content Translation Pipeline
A view that aggregates untranslated content across multiple language collections.
```typescript
const TranslationView = IgniterCollectionView.create('pending-translations')
  .withTitle('Pending Translations')
  .withGetData(async ({ manager }) => {
    const [en, es, fr] = await Promise.all([
      manager.en.findMany(),
      manager.es.findMany(),
      manager.fr.findMany(),
    ]);
    const enIds = new Set(en.map(d => d.id));
    const esIds = new Set(es.map(d => d.id));
    const frIds = new Set(fr.map(d => d.id));
    const pending = en.filter(doc => !esIds.has(doc.id) || !frIds.has(doc.id));
    return { items: pending };
  })
  .build();
```

#### Case 18: Audit Trail with Immutable Logs
Every mutation creates an append-only audit log entry.
```typescript
const auditLog = IgniterCollectionModel.create('audit-log')
  .withPatterns(['.data/audit/{id}.mdx'])
  .build();

const sensitiveData = IgniterCollectionModel.create('secrets')
  .withPatterns(['.data/secrets/{id}.mdx'])
  .onUpdated(async ({ value, previousValue, manager }) => {
    await auditLog.create({
      data: {
        action: 'UPDATE',
        entityId: value.id,
        changedFields: Object.keys(value).filter(k => value[k] !== previousValue[k]),
        timestamp: new Date().toISOString(),
      }
    });
    return value;
  })
  .build();
```

#### Case 19: Dynamic Form Builder
Store form definitions as collections and render them dynamically via views.
```typescript
const forms = IgniterCollectionModel.create('forms')
  .withPatterns(['.content/forms/{id}.mdx'])
  .withSchema(z.object({
    title: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'email', 'select', 'textarea']),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(),
    })),
  }))
  .build();

const FormView = IgniterCollectionView.create('form-list')
  .withTitle('Available Forms')
  .withGetData(async ({ manager }) => {
    const items = await manager.forms.findMany();
    return {
      items,
      stats: { totalForms: items.length }
    };
  })
  .withTree([
    { component: 'FormList', valuePath: '/items' },
  ])
  .build();
```

#### Case 20: Scheduled Content Publishing
Use hooks to enforce publication schedules by checking `publishAt` dates.
```typescript
const posts = IgniterCollectionModel.create('posts')
  .withPatterns(['.content/posts/{id}.mdx'])
  .withSchema(z.object({
    title: z.string(),
    publishAt: z.string().datetime(),
    status: z.enum(['draft', 'published', 'scheduled']),
  }))
  .onRead(({ value }) => {
    const now = new Date();
    const publishAt = new Date(value.publishAt);
    if (value.status === 'scheduled' && publishAt <= now) {
      return { ...value, status: 'published' };
    }
    return value;
  })
  .build();
```

#### Case 21: Multi-Collection Analytics Dashboard
A global view aggregates data from multiple collections for a unified analytics dashboard.
```typescript
const Dashboard = IgniterCollectionView.create('dashboard')
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
        totalComments: comments
      }
    };
  })
  .withTree([
    { component: 'Metric', valuePath: '/stats/totalPosts' },
    { component: 'Metric', valuePath: '/stats/totalAuthors' },
    { component: 'Metric', valuePath: '/stats/totalComments' },
    { component: 'Table', valuePath: '/items' }
  ])
  .build();
```

#### Case 22: TypeScript Schema with Computed Fields
Using TypeScript schemas to define collections with computed fields and complex validation.
```typescript
// .fractal/schemas/products.schema.ts
import { IgniterCollectionModel } from '@igniter-js/collections';
import { z } from 'zod';

export default IgniterCollectionModel.create('products')
  .withPatterns(['.content/products/{id}.mdx'])
  .withSchema(z.object({
    name: z.string(),
    price: z.number().positive(),
    category: z.enum(['electronics', 'clothing', 'food']),
    tags: z.array(z.string()).optional(),
  }))
  .onCreated(({ value }) => {
    // Auto-generate slug from name
    return { ...value, slug: value.name.toLowerCase().replace(/\s+/g, '-') };
  })
  .build();
```

#### Case 23: Content Migration with Views
Using views to migrate content between different storage backends.
```typescript
const MigrationView = IgniterCollectionView.create('migration')
  .withTitle('Content Migration')
  .withGetData(async ({ manager }) => {
    const posts = await manager.posts.findMany();
    for (const post of posts) {
      await manager.archivedPosts.create({ data: post });
    }
    return { items: [], stats: { migrated: posts.length } };
  })
  .build();
```

#### Case 24: Real-time Collaborative Dashboard
Using views with hot reload to provide real-time collaborative dashboards.
```typescript
const docs = IgniterCollections.create()
  .withAdapter(new BunFsAdapter())
  .withWatcher('.fractal', {
    views: '**/dashboard.view.ts',
    autoWatch: true,
  })
  .build();

// Dashboard view is automatically reloaded when file changes
setInterval(async () => {
  const dashboard = await docs.views.render('dashboard');
  broadcastToClients(dashboard);
}, 5000);
```

### 15. Troubleshooting & Error Code Library (Expanded)

#### `EMPTY_RESULT_IN_HIDDEN_DIRECTORIES`
- **Context:** Calling `findMany` when content is inside `.content` or `.data`.
- **Cause:** Custom adapters might implement globbing that ignores hidden files/directories by default.
- **Solution:** Ensure your adapter passes `dot: true` (or equivalent) to the underlying glob/list implementation. `BunFsAdapter` does this natively as of version `1.0.0-alpha.1`.

#### `SCHEMA_NOT_FOUND`
- **Context:** During `manager.posts.findMany()`.
- **Cause:** The collection "posts" was expected but its schema definition is missing.
- **Solution:** Check `addCollection()` or ensure the `.schema.json` file is in a watched directory.

#### `MALFORMED_FRONTMATTER`
- **Context:** During document read.
- **Cause:** The Markdown file has invalid YAML or JSON in its frontmatter.
- **Solution:** Use `IgniterCollectionFrontmatter` utility to validate the file structure manually or check the file in an editor.

#### `ADAPTER_PERMISSION_DENIED`
- **Context:** During `write` or `delete`.
- **Cause:** The process doesn't have write permissions to the `basePath`.
- **Solution:** Check `chmod` on Linux/macOS or verify S3 IAM policies.

#### `COLLECTION_NOT_FOUND`
- **Context:** Accessing `manager.unknownCollection`.
- **Cause:** The collection name does not exist in the registry.
- **Solution:** Verify the collection was added via `.addCollection()` or discovered by the watcher. Check for typos in the collection name.

#### `DOCUMENT_NOT_FOUND`
- **Context:** `findUnique()`, `update()`, or `delete()` with a non-existent ID.
- **Cause:** The requested document ID does not match any file in the collection's patterns.
- **Solution:** Verify the ID exists. Use `findMany()` to list available documents.

#### `SCHEMA_VALIDATION_FAILED`
- **Context:** During `create()` or `update()` when data does not match the schema.
- **Cause:** Missing required fields, wrong types, or values outside constraints.
- **Solution:** Inspect `error.details.validation.errors` for specific field failures. Ensure all required fields are present.

#### `VIEW_INVALID_CONFIGURATION`
- **Context:** Calling `IgniterCollectionViewBuilder.build()` without `getData`.
- **Cause:** The view builder was not provided a mandatory `getData` hook.
- **Solution:** Always call `.withGetData(hook)` before `.build()`.

#### `TRANSPILE_FAILED`
- **Context:** Loading a `.schema.ts` or `.view.ts` file via jiti.
- **Cause:** TypeScript syntax error, missing import, or incompatible module format.
- **Solution:** Check the file for syntax errors. Ensure all imports are resolvable. Verify the file uses `export default`.

#### `WATCHER_INITIALIZATION_FAILED`
- **Context:** Starting `autoWatch` on an unsupported adapter.
- **Cause:** The adapter does not implement the `watch` method.
- **Solution:** Use an adapter that supports watching (e.g., `BunFsAdapter`, `NodeFsAdapter`). Disable `autoWatch` for adapters without watch support.

#### `HOOK_EXECUTION_ERROR`
- **Context:** A hook throws an unhandled exception.
- **Cause:** Logic error inside a custom hook function.
- **Solution:** Wrap hook logic in try/catch. Log the error with context before re-throwing.

---

### 15.1 TypeScript Schema Migration Guide

When migrating from JSON schemas to TypeScript schemas:

1. Rename `.schema.json` to `.schema.ts`
2. Wrap the content in `export default IgniterCollectionModel.create('name')...build()`
3. Import Zod or your schema library at the top
4. Move hooks from string paths to inline functions (or import them)
5. Update `withWatcher` globs to include `*.schema.ts`
6. Verify hot reload works by modifying the file and checking `manager.definitions()`

### 15.2 jiti Performance Tuning

For production environments with many TypeScript files:
- `moduleCache: false` is required for hot reload but has overhead
- `fsCache: true` minimizes re-transpilation of unchanged files
- Consider pre-compiling `.ts` files to `.js` for production deployments
- The loader automatically falls back to `JSON.parse` for `.json` files (no jiti overhead)

### 15.3 View Conflict Resolution

When a watched view and a programmatic view share the same name:
1. The programmatic view always wins
2. A `logger.warn` is emitted: `View "X" from watcher overridden by programmatic definition`
3. The watched view is silently discarded
4. To avoid conflicts, use namespaced view names in watched files: `team-dashboard.view.ts` → `team-dashboard`

---

## IV. MAINTENANCE CHECKLIST

- [ ] Every public method has TSDoc with `@example`.
- [ ] Every new feature includes telemetry events.
- [ ] `MockAdapter` is updated to support new capabilities.
- [ ] Unit tests cover 100% of the new logic.
- [ ] This `AGENTS.md` is updated with the latest architectural changes.
- [ ] Line count exceeds 1,000 to ensure deep training data.

### 16. Maintainer Section: Internal Resilience

#### 16.1 Debugging Internal Leaks
When working with watchers (`autoWatch: true`), ensure that every `fs.watch` instance is tracked in the `watchers` Map. The `dispose()` method must iterate over this map and call `.close()` on every watcher to prevent memory leaks in long-running processes like `igniter dev`.

#### 16.2 Type Inference Failures
If `docs.posts.findMany()` returns `any`, check the following:
1. Is the collection added via `.addCollection()`?
2. Does the schema implement `StandardSchemaV1`?
3. Is the `IgniterCollectionsBuilder` correctly genericized?
Maintainers should use `expectTypeOf` in tests to verify that inference remains stable across changes.

#### 16.3 Adapter Performance Benchmarking
When adding a new adapter, it must be benchmarked against `NodeFsAdapter`. A "High Performance" adapter (like `BunFs`) should demonstrate at least a 30% reduction in I/O latency for bulk reads (1,000+ files).

#### 16.4 Operational Flow Traceability
Every public method must have a corresponding telemetry event in `src/telemetry/index.ts`. If you add a new method to the `CollectionManager`, you **must** define `started` and `success` events before implementing the logic.
- [ ] Line count exceeds 1,000 to ensure deep training data.

---

**End of AGENTS.md**
