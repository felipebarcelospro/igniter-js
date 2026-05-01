# AGENTS.md - @igniter-js/collections

> **Last Updated:** 2026-01-24
> **Version:** 1.0.0-alpha.1
> **Goal:** This document serves as the complete operational manual for Code Agents (Lia, Kai, Nova, Rex) and maintainers working with the `@igniter-js/collections` package. It follows the 1,000-line "Gold Standard" for robust agent training, ensuring deep understanding of architecture, flows, and troubleshooting.

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

#### 3.4 Views & Data Transformations (RFC 6901)
The Views System introduces a declarative way to shape data for display.
- **ViewManager:** Coordinates the rendering of views. It handles query merging, hook execution, and transformation chaining.
- **TransformEngine:** A static engine that applies operations like `group`, `flatten`, and `pivot` to the raw document list.
- **Stats Calculator:** Performs aggregations over the data set (count, sum, avg) based on field values or match criteria.
- **JSON Pointer:** We use JSON Pointers for path resolution in the view result, making it easy for UI components to extract specific data nodes.

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

### 6. Views System Deep Dive

#### 6.1 View Actions (Implemented)
- **`group`:** Groups items into a dictionary based on a field value.
  - *Example:* Group posts by `author`.
- **`flatten`:** flattens nested objects into dot-notation keys.
  - *Example:* `{ meta: { title: 'X' } }` becomes `{ 'meta.title': 'X' }`.
- **`pivot`:** Reorganizes data from long to wide format.
  - *Config:* `index`, `column`, `value`.

#### 6.2 View Render Flow
1. **Query Fetch:** Runs `findMany` with the view's `defaultQuery`.
2. **Hook Execution:** If `getData` hook is present, it's called with the fetched items.
3. **Transform Engine:** Applies the array of `transforms` sequentially.
4. **Stats Calculation:** Computes aggregations over the final items list.
5. **Return Result:** Returns the `IgniterCollectionViewRenderResult`.

---

### 7. Hooks System Registry

| Hook | When? | Context | Return |
|------|-------|---------|--------|
| `onCreated` | After creation, before write | `value`, `collection`, `manager` | Modified `value` or `false` |
| `onUpdated` | After merge, before write | `newValue`, `previousValue`, `collection` | Modified `newValue` or `false` |
| `onDeleted` | Before write | `value`, `collection`, `manager` | `true` to proceed, `false` to stop |
| `onRead` | After single fetch | `value`, `collection`, `manager` | Modified `value` or `false` |
| `onList` | After filtering | `values`, `collection`, `manager` | Modified `values[]` or `false` |

---

### 8. Real-World Use Case Library

#### Case 1: Multi-Environment Blog (Local + Cloud)
A developer wants to work locally with files but deploy to Production using S3 for scalability.
The manager automatically switches adapters based on the environment, while the rest of the code remains identical.

#### Case 2: Multi-Tenant Content Platform
Each organization has its own isolated collections stored in Redis under a prefix.
Using `BunRedisAdapter` with dynamic prefixes, we can ensure data isolation and high-performance access.

#### Case 3: Automated Documentation Site
A site that automatically registers collections for every folder in a specific path.
Using `withSchemaRegistry` with a glob pattern allows adding new documentation sections just by creating a new folder with a schema file.

#### Case 4: Audited Secure Store
A collection that requires every deletion to be logged to a separate audit collection.
Using the `onDeleted` hook, we can trigger a `create` operation on an `audit` collection before allowing the deletion.

#### Case 5: Real-time Collaborative Editor
Synchronizing content across multiple instances using Redis Pub/Sub events. The `watch` capability in `BunRedisAdapter` allows the manager to emit `updated` events across different servers as soon as a key is modified in Redis.

#### Case 6: Dynamic Plugin Content
A multi-plugin CMS where each plugin provides its own content types. The main app uses `withSchemaRegistry` pointing to the `node_modules` of plugins to automatically discover their schemas and build the management UI dynamically.

#### Case 7: High-Frequency Cache for Microservices
Using `BunRedisAdapter` with `@igniter-js/collections` as a type-safe cache layer. Service A writes complex objects to Redis, and Service B reads them with full validation, ensuring that data corruption in Redis (due to manual intervention) is caught immediately at the ORM layer.

#### Case 8: Multi-Step Content Approval Workflow
Using hooks to implement an approval state machine. Preventing unpublishing of approved content without specific permissions.

#### Case 9: Global Search Implementation
By utilizing the native **Full-Text Search (FTS)** capabilities of `findMany`, developers can build powerful global search engines over their Markdown content without external search services. The FTS engine supports `fields` weighting, `threshold` filtering, and Levenshtein-based `fuzzy` matching, automatically attaching `_search` scores to results.

#### Case 10: Automatic Image Optimization on Upload
A collection that manages image metadata in Markdown. An `onCreated` hook triggers an asynchronous process to optimize the image on S3 and update the Markdown file with the new optimized URL.

#### Case 11: Multi-Language Content Routing
Using a sub-collection for translations. Managing localized versions of a post within its own directory structure (`/posts/my-post/translations/en.md`).

#### Case 12: Content Versioning with Git Adapters
Creating a custom adapter that wraps Git commands. When `write` is called, the adapter performs a `git add` and `git commit`, enabling a full history of changes directly at the ORM layer.

#### Case 13: Distributed State for Serverless Functions
Using `BunRedisAdapter` to share state between short-lived Lambda or Vercel functions. The collections API provides a higher-level abstraction than raw Redis commands.

#### Case 14: Documentation Versioning (v1, v2, etc.)
Using multiple base paths in `IgniterCollections` to overlay different versions of documentation. The manager resolves documents by checking folders in order, allowing for easy content "inheritance".

#### Case 15: Schema-Driven Form Generation
Using the registered Zod schemas to automatically generate React forms in the frontend. Since the schemas are shared or discoverable via the Registry, the UI stays in perfect sync with the content requirements.

#### Case 16: Content Migration CLI
Using two managers to migrate thousands of files from a local disk to the cloud. The code simply iterates over `managerA.posts.findMany()` and calls `managerB.posts.create()`.

#### Case 17: Scheduled Content Publishing
An `onList` hook that filters out documents where the `publishDate` is in the future. This ensures that "future" posts never appear in the UI.

#### Case 18: Dynamic Navigation Menu Generation
Using a View with `group` and `sort` transforms to generate a multi-level navigation tree from Markdown frontmatter.

#### Case 19: Content Analytics Overlay
A View that merges document data with external analytics data using the `getData` hook. The final UI receives a unified object with both content and live view counts.

#### Case 20: Audit Log for Sensitive Content
Every `update` and `delete` operation on a "secrets" collection is automatically logged to an append-only "audit" collection using lifecycle hooks.

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
| `withSchemaRegistry()` | `path: string \| string[], options?` | `this` | Configures dynamic schema loading from folders. |
| `withTelemetry()` | `telemetry: IgniterTelemetryManager` | `this` | Connects the package to the telemetry system. |
| `withLogger()` | `logger: IgniterLogger` | `this` | Sets a custom logger for operational tracing. |
| `withGlobalHooks()` | `hooks: IgniterCollectionModelHooks` | `this` | Applies hooks to all collections managed by this instance. |
| `addCollection()` | `collection: Definition` | `Builder<T + C>` | Manually registers a collection with full type inference. |
| `build()` | None | `Manager<T>` | Validates state and returns the operational Manager. |

#### 12.2 IgniterCollectionModelBuilder (The Collection Builder)

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `create(name)` | `name: string` | `Builder` | Starts building a collection named `name`. |
| `withPatterns()` | `patterns: string[]` | `this` | Sets file patterns for resolution (e.g., `['.content/posts/{id}.mdx']`). |
| `withTemplate()` | `path: string` | `this` | Sets a predefined template path for generating content. |
| `withSchema()` | `schema: S` | `Builder<Infer<S>>` | Sets the validation schema and updates type inference. |
| `withViews()` | `views: ViewDefinition[]` | `this` | Registers declarative views for data shaping. |
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
