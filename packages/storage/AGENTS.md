# AGENTS.md - @igniter-js/storage

> **Last Updated:** 2026-01-29  
> **Version:** 0.1.21  
> **Goal:** This document serves as the complete operational manual for Code Agents maintaining and consuming the @igniter-js/storage package. It is designed to be hyper-robust, training-ready, and exhaustive, aiming for 1,500 lines of high-quality technical intelligence.

---

## 1. Package Vision & Context

**@igniter-js/storage** is the high-performance, multi-cloud file abstraction engine for the Igniter.js ecosystem. In the world of modern cloud applications, files are as vital as data, but managing them often involves wrestling with complex SDKs, inconsistent path conventions, and weak security boundaries. This package solves those problems by providing a unified, type-safe orchestrator that abstracts away the infrastructure while enforcing rigorous business standards and deep observability.

### Core Value Propositions

1.  **Multi-Tenant Isolation by Default**: Hierarchical scoping ensures that data for different organizations, users, or projects is physically isolated in the underlying store via deterministic path prefixing. This eliminates accidental data leakage between tenants at the infrastructure level.
2.  **Infrastructure Portability**: Application logic remains agnostic of the storage provider. Move from AWS S3 to Google Cloud Storage or a local MinIO instance by changing a single line of configuration.
3.  **Proactive Validation (Pre-flight)**: Rejects invalid files (oversized, forbidden types) at the application edge, saving bandwidth and cloud egress costs.
4.  **Native Observability**: Integrated with `@igniter-js/telemetry`, providing deep visibility into every file operation—from latency tracking to error analysis.
5.  **Lifecycle Hooks**: Built-in hooks enable custom logic (like database synchronization or virus scanning) at every stage of the file lifecycle.

### Place in the Igniter.js Ecosystem

The storage package acts as the authoritative gateway for all binary data persistence:

- **The Content Layer**: Persists user avatars, banners, and documents.
- **The System Layer**: Hosts static assets, CSS/JS files, and public branding.
- **The Processing Layer**: Handles temporary logs, CSV imports, and intermediate buffers for background jobs.
- **The Compliance Layer**: Enforces retention policies and audit logging for sensitive industries like Healthcare and Fintech.

---

## I. MAINTAINER GUIDE (Internal Architecture)

### 2. FileSystem Topology (Maintenance)

Maintainers must respect the following directory structure and responsibilities to ensure the package remains modular, easy to extend, and predictable.

#### `src/adapters/` — The Infrastructure Boundary

This directory contains the concrete implementations of the `IgniterStorageAdapter` abstract class. These files are the only place where direct interaction with third-party SDKs is permitted.

- `storage.adapter.ts`: **The Source of Truth**. Defines the abstract class and interfaces for all storage providers. It specifies the mandatory methods (`put`, `delete`, `list`, `exists`, `stream`) and optional ones (`copy`, `move`). It also provides shared logic like `normalizeKey`.
- `s3.adapter.ts`: **The S3 Implementation**. Exports `IgniterS3StorageAdapter` and `IgniterS3Adapter`. Uses `@aws-sdk/client-s3` for commands and `@aws-sdk/lib-storage` for multipart uploads. Performs best-effort bucket creation and applies a public-read policy when possible.
- `google-cloud.adapter.ts`: **The GCS Implementation**. Exports `IgniterGoogleCloudStorageAdapter` and `IgniterGoogleAdapter`. Uses `@google-cloud/storage` with `createWriteStream({ resumable: false })` for streams and `file.save(..., { validation: "md5" })` for buffers. Ensures the bucket exists and applies `makePublic()` when `options.public` is true.
- `mock.adapter.ts`: **The Testing Workhorse**. Exports `MockStorageAdapter` with an in-memory `Map` and `calls` counters for `put/delete/list/exists/stream/copy/move`.
- `index.ts`: Standard discovery point. It exports all built-in adapters to ensure they can be easily consumed by the main builder.

#### `src/builders/` — The Configuration Factory

This directory houses the "Accumulators" that implement the fluent API. These classes are responsible for collecting configuration state and using advanced TypeScript generics to build a strictly-typed output.

- `main.builder.ts`: **IgniterStorageBuilder**. The fluent entry point that accumulates immutable state and type-safe scopes. It registers default adapter factories (`s3`, `google`), supports `withAdapterFactories`, accepts adapter instances or keys (`withAdapter`), and wires `withLogger`, `withTelemetry`, policy setters, and all lifecycle hooks. It validates `baseUrl` and resolves adapters during `.build()` with environment fallbacks via `IgniterStorageEnv`.
- `index.ts`: Builder exports.

#### `src/core/` — The Runtime Heart

The core directory contains the implementation of the manager, which is the object developers actually use at runtime.

- `manager.ts`: **IgniterStorageManager**. The most critical file in the package. It implements the public API and orchestrates the entire lifecycle of an operation: resolving the key, emitting "started" telemetry, executing hooks, performing policy validation, executing the adapter, handling errors, emitting "finished" telemetry, and returning the result. It also implements the immutable path/scope cloning logic.
- `index.ts`: Core runtime exports.

#### `src/errors/` — Resiliency Definitions

Standardization of failure modes is a key part of the framework's reliability.

- `storage.error.ts`: **IgniterStorageError**. Extends the base `Error` class and provides a structured payload including a typed `code`, an `operation` name, an optional `cause`, and a `data` metadata payload.

#### `src/telemetry/` — Observability Registry

This directory defines "what the storage service looks like" to monitoring systems.

- `index.ts`: The authoritative registry of Zod schemas for all storage telemetry events. Every attribute emitted by the storage service must match a schema defined here, ensuring consistent analytics.

#### `src/types/` — Pure Contract Definitions

This directory contains only TypeScript interfaces and type aliases. It is strictly forbidden to have runtime code (like class implementations) here to avoid circular dependency issues.

- `adapter.ts`: Defines the low-level adapter contract, including `IgniterStoragePutOptions`.
- `builder.ts`: Defines the internal `IgniterStorageBuilderState` and the configuration accumulator types.
- `config.ts`: **IgniterStorageConfig**. The final, composite configuration object used to instantiate the manager.
- `file.ts`: Defines the `IgniterStorageFile` interface, which is the primary return type for most operations.
- `hooks.ts`: Comprehensive definitions for all lifecycle hooks and their payloads.
- `manager.ts`: Public interfaces for the manager class and its methods.
- `policies.ts`: Schemas for validation rules (size, type, extensions) and violation structures.
- `replace.ts`: Enumerations for file replacement strategies.
- `scopes.ts`: The complex generic logic required for path template inference and `[identifier]` detection.

#### `src/utils/` — Static Helper Library

Pure, stateless utility functions that provide the atomic logic for the package.

- `env.ts`: **IgniterStorageEnv**. Centralized logic for parsing `IGNITER_STORAGE_` environment variables with support for credential mapping and policy parsing.
- `mime.ts`: **IgniterStorageMime**. Helpers for content-type inference and normalization based on the `mime-types` package.
- `path.ts`: **IgniterStoragePath**. Authority for URL-safe path joining, splitting, and extension manipulation.
- `url.ts`: **IgniterStorageUrl**. Hostname validation and host-stripping logic to ensure absolute URLs can be safely passed to relative path methods.
- `try-catch.ts`: Functional utility for capturing and normalizing errors in asynchronous chains.

---

### 3. Architecture Deep-Dive

#### 3.1 The Builder and Recursive Type Accumulation

The `IgniterStorageBuilder` implements an **Immutable State Machine** pattern combined with **Recursive Type Intersection**. When a developer starts with `IgniterStorage.create()`, they get a builder with an empty scope registry (`{}`).

Each method call (e.g., `.addScope('user', '/u/[identifier]')`) does not mutate the current builder. Instead, it returns a _new_ instance of the builder class. Crucially, the return type of that method is a new version of the builder where the generic parameters have been extended:

```typescript
addScope<TKey, TPath>(key: TKey, path: TPath): IgniterStorageBuilder<TScopes & { [K in TKey]: ScopeDef<TPath> }>
```

This is what allows the TypeScript compiler to "remember" every scope ever added to the builder, providing full autocomplete in the final manager.

#### 3.2 Deterministic Path Resolution

The `IgniterStorageManager` implements a multi-stage resolution pipeline to ensure paths are consistent across providers and environments.

**The Key Building Pipeline:**

1.  **Sanitization**: Input strings (including full URLs) are stripped of the base URL using `IgniterStorageUrl.stripBaseUrlOrThrow`. This prevents accidental cross-host storage access.
2.  **Merging**: The current `basePath` (derived from previous `.scope()` or `.path()` calls) is joined with the input using `IgniterStoragePath.join`. This method handles leading/trailing slashes and empty segments.
3.  **Inference**: If the resulting key ends without a dot-extension, the manager attempts to append one based on the MIME type of the source file or the provided `contentType` option.

#### 3.3 Instance Immutability

`IgniterStorageManager` is strictly immutable. Transformation methods like `.path()` or `.scope()` perform a "Config Clone-and-Merge" and return a fresh instance.

```typescript
path(prefix: string): IgniterStorageManager<TScopes> {
  const nextPath = IgniterStoragePath.join(this.basePath, prefix);
  return new IgniterStorageManager({ ...this.config, basePath: nextPath });
}
```

This architecture is critical for thread-safety and logical branching within an application (e.g., a "User" service and an "Organization" service sharing a base storage instance but branching into their own folders).

---

### 4. Operational Flow Mapping (Pipelines)

For EVERY public method, here is the exhaustive internal step-by-step pipeline documenting the logic from the user's call to the adapter's return.

#### 4.1 Method: `upload(file, destination, options?)`

1.  **Entry Point**: Receives the file content (Blob, File, or Stream), a destination string, and optional configuration.
2.  **Resolution Phase**:
    - Calls `this.resolveDestination()`.
    - Strips `baseUrl` if the input is an absolute URL.
    - Joins with current `basePath`.
    - Detects existing extension.
3.  **Extension Inference**: If the destination has no extension, the manager calls `tryInferExtension`. It checks `sourceContentType` first, then `file.type` (if Blob). If found, it appends the extension to the final key.
4.  **Content-Type Normalization**:
    - Infers Content-Type via `inferContentType`.
    - Calls `IgniterStorageMime.normalize` to remove parameters like `charset=utf-8` and convert to lowercase.
5.  **Policy Assertion**:
    - Calls `this.assertUploadPolicies()`.
    - Validates `payload.size` against `maxFileSize`.
    - Validates `contentType` against `allowedMimeTypes`.
    - Validates `extension` against `allowedExtensions`.
    - If any policy fails, it collects all violations into an array and throws `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`.
6.  **Telemetry Start**: Emits `igniter.storage.upload.started` event with attributes: `path`, `size`, `content_type`, and `method`.
7.  **Hook Start**: Awaits the execution of the `onUploadStarted` hook with the complete payload.
8.  **Replace Strategy Execution**:
    - If strategy is `BY_FILENAME_AND_EXTENSION`: Performs a simple `adapter.delete(exactKey)`.
    - If strategy is `BY_FILENAME`: Performs `adapter.list(prefix)`, filters by basename (ignoring extension), and deletes all matching keys in parallel.
9.  **Physical Upload**: Call `adapter.put(key, body, options)` with:
  - `contentType` inferred by `IgniterStorageMime`
  - `cacheControl: "public, max-age=31536000"`
  - `public: true` to request public readability
  - S3 adapter uses the `Upload` class from `@aws-sdk/lib-storage` for optimized chunked uploads (or `PutObjectCommand` for buffers).
  - GCS adapter uses `createWriteStream({ resumable: false })` for streams and `file.save(..., { validation: "md5" })` for buffers.
10. **Envelope Building**: Creates the `IgniterStorageFile` object, including the fully qualified public URL generated by joining `baseUrl` with the storage key.
11. **Telemetry Success**: Emits `igniter.storage.upload.success` with `storage.duration_ms` and `storage.url`.
12. **Hook Success**: Awaits the `onUploadSuccess` hook execution, providing the final file reference.
13. **Return**: Returns the `IgniterStorageFile` to the caller.

#### 4.2 Method: `get(pathOrUrl)`

1.  **Resolve Key**: Normalizes the input to a relative storage key via `resolvePath`.
2.  **Telemetry Start**: Emits `igniter.storage.get.started`.
3.  **Existence Check**: Invokes `adapter.exists(key)`.
4.  **Result Pipeline**:
    - **Case Found**: Constructs the `IgniterStorageFile` object, emits `get.success` with `found: true`, and returns the object.
    - **Case Not Found**: Emits `get.success` with `found: false` and returns `null`.
5.  **Return**: Returns the metadata object or null.

#### 4.3 Method: `delete(pathOrUrl)`

1.  **Resolve Key**: Normalizes the input to a relative storage key.
2.  **Hook Start**: Awaits the execution of `onDeleteStarted`.
3.  **Telemetry Start**: Emits `igniter.storage.delete.started`.
4.  **Execution**: Calls `adapter.delete(key)`. The adapter implementation is expected to be idempotent (it should not throw if the file does not exist).
5.  **Telemetry Success**: Emits `igniter.storage.delete.success` with the calculated duration.
6.  **Hook Success**: Awaits the execution of `onDeleteSuccess`.

#### 4.4 Method: `list(prefix?)`

1.  **Prefix Resolution**: Joins the current `basePath` with the optional prefix provided by the user.
2.  **Telemetry Start**: Emits `igniter.storage.list.started`.
3.  **Execution**: Calls `adapter.list(resolvedPrefix)`.
4.  **Mapping**: Iterates through the returned string array and converts each key into a full `IgniterStorageFile` metadata object using `fileFromKey`.
5.  **Telemetry Success**: Emits `igniter.storage.list.success` with the total `storage.count`.

#### 4.5 Method: `copy(from, to)`

1.  **Contract Check**: Verifies if `adapter.copy` is implemented. If not, throws `IGNITER_STORAGE_COPY_NOT_SUPPORTED`.
2.  **Key Resolution**:
    - `fromKey`: Normalized via `resolvePath` (handles absolute URLs).
    - `toKey`: Normalized via `resolvePath`.
3.  **Hook Start**: Awaits `onCopyStarted` with both keys.
4.  **Telemetry Start**: Emits `igniter.storage.copy.started` with `storage.from` and `storage.to`.
5.  **Execution**: Calls `adapter.copy(fromKey, toKey)`.
    - S3: Uses `CopyObjectCommand` with `public-read` ACL.
    - GCS: Uses `file.copy`.
6.  **Telemetry Success**: Emits `igniter.storage.copy.success` with `storage.duration_ms`.
7.  **Hook Success**: Awaits `onCopySuccess`.
8.  **Return**: Returns the metadata for the NEW file location.

#### 4.6 Method: `move(from, to)`

1.  **Contract Check**: Verifies if `adapter.move` is implemented. If not, throws `IGNITER_STORAGE_MOVE_NOT_SUPPORTED`.
2.  **Key Resolution**: Normalizes `fromKey` and `toKey`.
3.  **Hook Start**: Awaits `onMoveStarted`.
4.  **Telemetry Start**: Emits `igniter.storage.move.started`.
5.  **Execution**: Calls `adapter.move(fromKey, toKey)`.
    - Standard implementation (if not overridden by adapter): Calls `this.copy(from, to)` followed by `this.delete(from)`.
    - Optimized adapters (like S3/GCS) might perform this as a single atomic-ish operation if supported by the provider.
6.  **Telemetry Success**: Emits `igniter.storage.move.success`.
7.  **Hook Success**: Awaits `onMoveSuccess`.
8.  **Return**: Returns the metadata for the NEW file location.

#### 4.7 Method: `stream(pathOrUrl)`

1.  **Key Resolution**: Normalizes input to storage key.
2.  **Telemetry Start**: Emits `igniter.storage.stream.started`.
3.  **Execution**: Calls `adapter.stream(key)`.
    - Returns a `node:stream.Readable`.
4.  **Telemetry Success**: Emits `igniter.storage.stream.success`.
5.  **Return**: Returns the readable stream to the consumer.

#### 4.8 Method: `uploadFromUrl(sourceUrl, destination, options?)`

1. **Fetch**: Uses the global `fetch` API to download the remote file.
2. **Failure Handling**:
  - Network failure → `IGNITER_STORAGE_FETCH_FAILED`.
  - Non-2xx response → `IGNITER_STORAGE_FETCH_FAILED` with status metadata.
3. **Content-Type**: Reads `content-type` header and normalizes it.
4. **Blob Conversion**: Converts the response to `ArrayBuffer` and wraps in a `Blob`.
5. **Delegate**: Calls `upload(blob, destination, { _source: { kind: "url" }, _explicitContentType })`.

#### 4.9 Method: `uploadFromBuffer(buffer, destination, options?)`

1. **Normalize**: Converts `Uint8Array` or `ArrayBuffer` to a `Buffer`.
2. **Blob Conversion**: Wraps bytes in a `Blob` with `contentType` (default `application/octet-stream`).
3. **Delegate**: Calls `upload(blob, destination, { _source: { kind: "buffer" }, _explicitContentType })`.

#### 4.10 Method: `uploadFromBase64(base64, destination, options?)`

1. **Normalize**: Strips data URL prefix if present.
2. **Decode**: Converts base64 to bytes.
3. **Delegate**: Calls `uploadFromBuffer` using the decoded buffer.

---

### 5. Dependency & Type Graph

Maintainers must protect the architecture from "Dependency Bloat." The storage package is designed to have a very light runtime footprint.

#### Dependencies (Peer & Optional)

- **`@igniter-js/common`**: Mandatory. Provides the foundational `IgniterError` class and the `IgniterLogger` interface.
- **`@igniter-js/telemetry`**: Optional peer dependency. If not present, the manager uses a "no-op" telemetry implementation that safely ignores `emit` calls.
- **`mime-types`**: Internal dependency for mapping extensions to Content-Types.
- **`zod`**: (Peer) Used for internal configuration validation and telemetry schema enforcement.
- **`@aws-sdk/client-s3`**: Optional. Required only when using `IgniterS3Adapter`.
- **`@aws-sdk/lib-storage`**: Optional. Required only when using `IgniterS3Adapter`.
- **`@google-cloud/storage`**: Optional. Required only when using `IgniterGoogleAdapter`.

#### Internal Type Flow

```
Scope Definitions (Developer)
  ↓
IgniterStorageBuilder<TScopes> (Accumulator)
  ↓
IgniterStorageManagerConfig<TScopes> (State Bridge)
  ↓
IgniterStorageManager<TScopes> (Runtime Interface)
  ├─ path(prefix) → IgniterStorageManager<TScopes>
  └─ scope<K, I>() → IgniterStorageManager<TScopes>
```

---

### 6. Technical Reference: Interface & Property Map

#### `IgniterStorageFile`

The primary data structure returned by all file operations.

- `path`: `string` — The internal object key (e.g., `uploads/123.jpg`).
- `url`: `string` — The fully qualified public URL pointing to the CDN.
- `name`: `string" — Basename including extension (e.g., `123.jpg`).
- `extension`: `string" — Lowercase extension without dot (e.g., `jpg`).
- `contentType`: `string?` — RFC 9110 media type (e.g., `image/jpeg`).
- `size`: `number?` — File size in bytes.

#### `IgniterStoragePolicies`

Validation rules applied during upload.

- `maxFileSize`: `number?` — Maximum allowed size in bytes.
- `allowedMimeTypes`: `string[]?` — Array of valid Content-Types.
- `allowedExtensions`: `string[]?` — Array of valid lowercase extensions.

#### `IgniterStorageUploadOptions`

Fine-grained control over individual upload operations.

- `replace`: `IgniterStorageReplaceStrategy?` — `BY_FILENAME` or `BY_FILENAME_AND_EXTENSION`.
- `contentType`: `string?` — Explicit override for the media type.

---

### 7. Maintainer Checklist

1.  **Contract First**: Update `IIgniterStorageManager` in `src/types/manager.ts` before adding new public methods.
2.  **Adapter Parity**: Implement new features in `s3`, `google-cloud`, and `mock` adapters simultaneously.
3.  **Telemetry Registry**: Every method MUST emit `started` and `success`/`error` events.
4.  **Immutability Test**: Verify that cloning operations (`.path()`, `.scope()`) do not mutate the original instance.
5.  **Security Audit**: Verify that `shim.ts` blocks all new public entry points from browser bundles.

---

### 8. Troubleshooting & Error Code Library

#### `IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED`

- **Context**: Occurs during `.build()`.
- **Cause**: No adapter was provided and no environment variable found.
- **Solution**: Call `.withAdapter()` with a valid provider instance.

#### `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`

- **Context**: Immediately after calling `upload()`.
- **Cause**: File size or type violates configured policies.
- **Solution**: Check the `violations` array in the error object for specific reasons.

#### `IGNITER_STORAGE_INVALID_SCOPE`

- **Context**: Calling `.scope('key', ...)`.
- **Cause**: The key was never registered in the builder.
- **Solution**: Add `.addScope('key', 'template')` to your builder configuration.

#### `IGNITER_STORAGE_INVALID_PATH_HOST`

- **Context**: Passing a full URL to `get()` or `delete()`.
- **Cause**: URL hostname does not match configured `baseUrl`.
- **Solution**: Verify the `baseUrl` property in your config matches your CDN domain.

---

## II. CONSUMER GUIDE (Developer Manual)

### 9. Distribution Anatomy (Consumption)

Developers consuming this package must understand how it is distributed to ensure proper environment compatibility and optimized bundling.

- **`@igniter-js/storage` (Main Entry)**:
  - Exports the `IgniterStorage` builder and the `IgniterStorageManager`.
  - Includes core logic, utilities, and common error classes.
  - Protected by `shim.ts`: If imported in a browser environment, it will throw an error.
- **`@igniter-js/storage/adapters` (Subpath)**:
  - Contains concrete implementations for S3, GCS, and the Mock adapter.
  - Separated to allow consumers to only import the adapter they need, keeping the bundle size small.
- **`@igniter-js/storage/telemetry` (Subpath)**:
  - Contains the Zod schemas and the `IgniterStorageTelemetryEvents` registry.
  - Separated to prevent circular dependencies with the telemetry package.

### 10. Best Practices & Anti-Patterns

| Practice | Why? | Example |
| :--- | :--- | :--- |
| ✅ **Always** use scopes for isolation | Prevents path collisions and simplifies path management. | `storage.scope('user', id)` |
| ✅ **Always** provide a `baseUrl` | Essential for generating absolute links for CDNs. | `.withUrl('https://cdn.com')` |
| ✅ **Prefer** `uploadFromUrl` | Optimized for remote assets; avoids manual buffer management. | `storage.uploadFromUrl(url, 'dest')` |
| ✅ **Always** use `MockStorageAdapter` in tests | Fast, deterministic, and doesn't require cloud credentials. | `.withAdapter(new MockStorageAdapter())` |
| ❌ **Don't** use `upload` in browsers | Storage logic is server-only; use direct-to-S3 signed URLs instead. | `// Don't import in React components` |
| ❌ **Don't** hardcode credentials | Use `IgniterStorageEnv` or environment variables for security. | `// Don't put keys in source code` |
| ❌ **Don't** skip error handling | Storage operations can fail; always use `try/catch` or hooks. | `try { ... } catch (e) { ... }` |

### 11. Quick Start & Common Patterns

#### Pattern: The Centralized Storage Definition

Setup your storage in a single file (e.g., `src/lib/storage.ts`) and export the built instance.

```typescript
import { IgniterStorage } from "@igniter-js/storage";
import { IgniterS3Adapter } from "@igniter-js/storage/adapters";

export const storage = IgniterStorage.create()
  .withAdapter(
    IgniterS3Adapter.create({
      bucket: process.env.STORAGE_BUCKET,
      region: "us-east-1",
    }),
  )
  .withUrl("https://cdn.myapp.com")
  .addScope("user", "/users/[identifier]")
  .addScope("public", "/assets")
  .build();
```

#### Pattern: Per-User Isolated Uploads

Seamlessly switch between user directories with full type safety.

```typescript
// All operations through 'userDrive' will be automatically isolated to /users/123/
const userDrive = storage.scope("user", "123");

await userDrive.upload(file, "avatar.png", {
  replace: "BY_FILENAME", // Deletes old avatar.jpg, avatar.png, etc.
});
```

#### Pattern: Protected Private Streaming

Serve files without exposing the storage URL by streaming them through your server.

```typescript
const stream = await storage.scope("admin").stream("report.xlsx");
return new Response(stream as any, {
  headers: { "Content-Type": "application/vnd.ms-excel" },
});
```

---

### 10. Real-World Use Case Library

#### Case 1: Multi-Tenant Asset Isolation

**Goal**: Isolate assets for different organizations in a SaaS platform.

```typescript
const orgDrive = storage.scope("org", orgId);
await orgDrive.upload(file, "logo.png");
```

#### Case 2: Per-User Avatar Management

**Goal**: Manage user profile pictures with automatic replacement of old formats.

```typescript
const userDrive = storage.scope("user", userId);
await userDrive.upload(blob, "avatar", { replace: "BY_FILENAME" });
```

#### Case 3: Temporary CSV Processing

**Goal**: Upload a large CSV for background processing and delete it after.

```typescript
const file = await storage.path("tmp").upload(stream, "import.csv");
// Process...
await storage.delete(file.path);
```

#### Case 4: Versioned Public Assets

**Goal**: Serve website assets versioned by deployment tag.

```typescript
const assets = storage.scope("public").path("v2.1.0");
await assets.upload(icon, "home.svg");
```

#### Case 5: Secure Medical Image Storage

**Goal**: Store HIPAA-compliant images with full audit logging via hooks.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: process.env.S3_BUCKET })
  .onUploadSuccess(async ({ file }) => {
    await db.log(file.path);
  })
  .build();

await storage.scope("patient", id).upload(xray, "chest-xray.dicom");
```

#### Case 6: Automated Nightly Backups

**Goal**: Dumping database snapshots into daily-partitioned folders.

```typescript
const date = new Date().toISOString().split("T")[0];
await storage.path("backups").path(date).uploadFromBuffer(sql, "db.sql.gz");
```

#### Case 7: Remote Asset Mirroring

**Goal**: Mirroring a third-party image to your local CDN for stability.

```typescript
await storage.path("mirrors").uploadFromUrl(remoteUrl, "mirrored-image");
```

#### Case 8: Private Document Streaming

**Goal**: Streaming sensitive PDFs to users without exposing public URLs.

```typescript
const stream = await storage.scope("admin").stream("report.pdf");
```

#### Case 9: White-Label Branding

**Goal**: Serving different themes to different customers using path branching.

```typescript
const theme = storage.scope("tenant", id).path("branding");
const logo = await theme.get("logo.png");
```

#### Case 10: System Health Monitoring

**Goal**: Verifying storage availability by writing a tiny probe file.

```typescript
await storage.path("health").uploadFromBase64("e30=", "check.json");
```

#### Case 11: Bulk Asset Migration

**Goal**: Moving an entire directory of assets from a legacy path to a new structured scope.

```typescript
const legacyFiles = await storage.list('old-assets/');
for (const file of legacyFiles) {
  const newName = file.name.toLowerCase().replace(/\s+/g, '-');
  await storage.move(file.path, `assets/migrated/${newName}`);
}
```

#### Case 12: On-the-fly Image Resizing Integration

**Goal**: Using hooks to trigger a background job for image processing after a successful upload.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: process.env.S3_BUCKET })
  .onUploadSuccess(async ({ file, contentType }) => {
    if (contentType?.startsWith("image/")) {
      await jobs.enqueue("resize-image", { path: file.path });
    }
  })
  .build();
```

#### Case 13: Distributed Log Storage

**Goal**: Storing application logs in date-partitioned folders for easy archival.

```typescript
const today = new Date().toISOString().split('T')[0];
await storage.path('logs').path(today).uploadFromBuffer(logBuffer, `${clientId}.log`);
```

#### Case 14: Secure Document Signing Workflow

**Goal**: Managing a sequence of document states (draft, signed, archived) using path branching.

```typescript
const docId = 'doc_987';
const draft = storage.path('documents/drafts');
const signed = storage.path('documents/signed');

// 1. Upload draft
await draft.upload(pdf, `${docId}.pdf`);

// 2. After signing, move to signed folder
await storage.move(`documents/drafts/${docId}.pdf`, `documents/signed/${docId}.pdf`);
```

#### Case 15: Public Profile Page Generation

**Goal**: Uploading a generated HTML file for a public user profile.

```typescript
const html = `<html><body><h1>${user.name}</h1></body></html>`;
await storage.scope('public').path('profiles').uploadFromBuffer(Buffer.from(html), `${user.username}.html`, {
  contentType: 'text/html'
});
```

#### Case 16: Multi-Region Failover Simulation

**Goal**: Mirroring critical assets to a backup storage instance using hooks.

```typescript
const backupStorage = IgniterStorage.create()
  .withUrl("https://cdn.backup.example.com")
  .withAdapter("s3", backupCredentials)
  .build();

const storage = IgniterStorage.create()
  .withUrl("https://cdn.primary.example.com")
  .withAdapter("s3", primaryCredentials)
  .onUploadSuccess(async ({ file, path }) => {
    if (path.startsWith("critical/")) {
      await backupStorage.uploadFromUrl(file.url, path);
    }
  })
  .build();
```

#### Case 17: User Data Export (Zip Generation)

**Goal**: Uploading a generated zip file containing user data.

```typescript
const zipBuffer = await generateUserZip(userId);
await storage.scope('user', userId).uploadFromBuffer(zipBuffer, 'export.zip', {
  contentType: 'application/zip'
});
```

#### Case 18: CDN Cache Invalidation

**Goal**: Triggering a CDN invalidation after deleting a file.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: process.env.S3_BUCKET })
  .onDeleteSuccess(async ({ path }) => {
    await cdn.invalidate(path);
  })
  .build();
```

#### Case 19: Dynamic Branding per Tenant

**Goal**: Fetching a tenant-specific logo from a scoped path.

```typescript
const logo = await storage.scope('tenant', tenantId).path('branding').get('logo.png');
const logoUrl = logo?.url ?? defaultLogo;
```

#### Case 20: Audit Logging for Compliance

**Goal**: Recording every file access in a database for HIPAA compliance.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: process.env.S3_BUCKET })
  .onUploadSuccess(async ({ file, operation }) => {
    await db.auditLogs.create({
      action: operation,
      resource: file.path,
      timestamp: new Date(),
    });
  })
  .build();
```
#### Case 21: Multi-Step Media Processing Pipeline

**Goal**: Coordinating multiple processing steps (Upload -> Resize -> WebP Conversion -> CDN Invalidation).

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: process.env.S3_BUCKET })
  .onUploadSuccess(async ({ file, contentType }) => {
    if (contentType?.startsWith("image/")) {
      // 1. Resize
      const resized = await jobs.enqueue("resize", { path: file.path });
      // 2. Convert to WebP
      const webp = await jobs.enqueue("webp", { path: resized.path });
      // 3. Invalidate CDN
      await cdn.invalidate(webp.path);
    }
  })
  .build();
```

#### Case 22: Ephemeral Share Links

**Goal**: Creating a temporary, one-time-use download link for a protected file.

```typescript
// Create a short-lived server endpoint that streams the file after token validation.
// The storage package provides the stream; your app controls token issuance.
const stream = await storage.stream(file.path);
stream.pipe(response);
```

#### Case 23: Batch Cleanup of Orphaned Assets

**Goal**: Periodically scanning storage to remove files no longer referenced in the database.

```typescript
const files = await storage.path('temp-uploads').list();
for (const file of files) {
  const existsInDb = await db.files.exists({ path: file.path });
  if (!existsInDb) {
    await storage.delete(file.path);
  }
}
```

#### Case 24: Intelligent Content-Type Overrides

**Goal**: Forcing a specific content-type for files that are uploaded with incorrect headers from the source.

```typescript
await storage.uploadFromBuffer(buffer, "document.pdf", {
  contentType: "application/pdf",
});
```

#### Case 25: Cross-Bucket Migration Utility

**Goal**: Moving files from an old bucket to a new one using two storage instances.

```typescript
const oldStorage = IgniterStorage.create()
  .withUrl("https://cdn.old.example.com")
  .withAdapter(oldAdapter)
  .build();

const newStorage = IgniterStorage.create()
  .withUrl("https://cdn.new.example.com")
  .withAdapter(newAdapter)
  .build();

const files = await oldStorage.list();
for (const file of files) {
  await newStorage.uploadFromUrl(file.url, file.path);
  await oldStorage.delete(file.path);
}
```
---

## III. TECHNICAL REFERENCE & RESILIENCE

### 11. Exhaustive API Reference

#### Core classes and interfaces in detail

##### `IgniterStorageBuilder` (Config Phase)

- **`create()`**: Initializes the configuration accumulation.
- **`withAdapter(adapter)`**: Injects a concrete implementation of the storage provider.
- **`withUrl(url)`**: Defines the public base URL used for public file links.
- **`withPath(prefix)`**: Sets a global key prefix (e.g. `production/`).
- **`addScope(key, template)`**: Registers a path pattern. Use `[identifier]` for dynamic segments.
- **`withMaxFileSize(bytes)`**: Defines a global limit for all upload operations.
- **`onUploadSuccess(callback)`**: Attaches a listener for completed transfers.
- **`build()`**: Validates configuration and returns the `IgniterStorageManager`.

##### `IIgniterStorageManager` (Operational Phase)

- **`upload(file, dest, opts)`**: High-level method for binary persistence.
- **`uploadFromUrl(url, dest, opts)`**: Proxies remote files directly to your bucket.
- **`uploadFromBuffer(buffer, dest, opts)`**: Stores raw memory bytes.
- **`get(pathOrUrl)`**: Retrieves file metadata if the object exists.
- **`delete(pathOrUrl)`**: Permanently removes an object from the backend.
- **`list(prefix?)`**: Returns an array of file metadata for objects matching the prefix.
- **`scope(key, id?)`**: Returns a clones manager instance with a narrowed path.
- **`path(prefix)`**: Returns a clones manager instance with an extended path.
- **`stream(pathOrUrl)`**: Opens a readable Node.js binary stream for the file.

---

### 12. State & Immutability Patterns (Maintainer Deep-Dive)

The stability of the `@igniter-js/storage` package rests on its commitment to **Stateless Execution** and **Immutable State Transitions**.

#### 12.1 The Configuration Bridge

When `builder.build()` is called, the internal `IgniterStorageBuilderState` is mapped to an `IgniterStorageManagerConfig`. This config is the "Frozen Intent" of the developer. Once the manager is created, this config is never modified.

#### 12.2 Cloning via Recursive Construction

Methods like `.path()` and `.scope()` do not modify the current `basePath`. Instead, they invoke the constructor again with a merged payload. This ensures that:
- You can branch multiple storage instances from a single root.
- There are no race conditions between asynchronous operations.
- The `basePath` is always deterministic.

```typescript
// Example of branching
const root = storage.path('org_1');
const uploads = root.path('uploads');
const assets = root.path('assets');
// 'uploads' and 'assets' share 'org_1' but don't interfere with each other.
```

#### 12.3 Adapter Contract Nuances

Adapters are expected to follow these strict rules to ensure the Manager behaves consistently:
- **Idempotent Deletion**: `delete()` should NOT throw if the key is not found.
- **Normalized Listing**: `list()` must return relative keys, not absolute paths.
- **Error Propagation**: Adapters should throw original SDK errors, which the Manager will then wrap into `IgniterStorageError`.

---

### 13. Operational Flow Mapping (Pipelines)

#### 12.1 Path Resolution Logic (`resolveDestination`)

1.  **Sanitization**: Input strings (including absolute URLs) are passed to `IgniterStorageUrl.stripBaseUrlOrThrow`.
2.  **Hostname Check**: If the input is a URL, its hostname MUST match the `baseUrl` configured in the builder. If not, `IGNITER_STORAGE_INVALID_PATH_HOST` is thrown to prevent accidental cross-tenant deletion.
3.  **Merging**: The relative path is joined with the current `basePath` using `IgniterStoragePath.join`. This static utility collapses double slashes and ensures no leading/trailing slashes remain.
4.  **Extension Logic**:
    - The system checks if the key ends with a dot followed by characters.
    - If not, it calls `tryInferExtension`.
    - It checks the `sourceContentType` if provided.
    - It checks the `file.type` property if available.
    - The inferred extension is appended to the key.

#### 12.2 Policy Enforcement Mechanics (`assertUploadPolicies`)

1.  **Violation Collection**: An empty array of `violations` is initialized.
2.  **Size Check**: If `policies.maxFileSize` is set and the `payload.size` is known, it compares the values.
3.  **MIME Check**: If `policies.allowedMimeTypes` is set, it checks if the inferred `contentType` exists in the whitelist.
4.  **Extension Check**: If `policies.allowedExtensions` is set, it extracts the extension from the resolved key and checks it against the whitelist.
5.  **Final Assertion**: If `violations.length > 0`, the entire array is included in an `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION` error.

---

### 13. Deep Dive: Type Inference and Scoping

The type safety of `@igniter-js/storage` relies on a sophisticated "recursive intersection" of generic types. When you add a scope, the builder's state is updated to include a new key in its `TScopes` generic parameter.

#### 13.1 The Identifier Detection Logic

The `addScope` method uses the `ContainsIdentifier<TPath>` type to detect if the string literal `[identifier]` is present in the path template.

```typescript
export type ContainsIdentifier<T extends string> = T extends `${string}[identifier]${string}` ? true : false;
```

This boolean is stored in the scope definition. At runtime, the `scope()` method uses this boolean to decide if it should require a second argument:

```typescript
scope<K extends keyof TScopes & string>(
  scopeKey: K,
  ...args: TScopes[K] extends { requiresIdentifier: true } ? [string] : [string?]
)
```

#### 13.2 Template Interpolation

The interpolation of `[identifier]` is handled by a simple string replacement. Because the builder verifies the template during `addScope`, we can guarantee that the identifier will be placed exactly where intended.

---

### 14. Telemetry Event & Attribute Reference

| Namespace         | Event            | Attributes                                    | Description           |
| :---------------- | :--------------- | :-------------------------------------------- | :-------------------- |
| `igniter.storage` | `upload.started` | `storage.path`, `storage.size`                | Operation initiated.  |
|                   | `upload.success` | `storage.url`, `storage.duration_ms`          | Transfer completed.   |
|                   | `upload.error`   | `storage.error.code`, `storage.error.message` | Operation failed.     |
|                   | `delete.success` | `storage.path`, `storage.duration_ms`         | Object removed.       |
|                   | `get.success`    | `storage.found` (bool)                        | Metadata lookup done. |
|                   | `list.success`   | `storage.count` (num)                         | Directory scanned.    |
|                   | `copy.success`   | `storage.from`, `storage.to`                  | File copied.          |
|                   | `move.success`   | `storage.from`, `storage.to`                  | File moved.           |

---

### 15. Testing Strategy (Maintainer Reference)

The storage package requires a robust testing strategy due to its interaction with external cloud providers.

#### 15.1 Unit Testing with `MockStorageAdapter`

The `MockStorageAdapter` is the primary tool for unit testing. It should be used to verify:
- **Path Resolution**: Ensure `resolvePath` correctly handles different input types and `basePath`.
- **Policy Enforcement**: Verify that violations are correctly identified and the right error is thrown.
- **Hook Execution**: Ensure hooks are called in the correct order with expected payloads.
- **Replacement Logic**: Verify that old files are correctly deleted according to the chosen strategy.

#### 15.2 Integration Testing with Emulators

For adapter-specific logic (S3, Google), maintainers should use local emulators:
- **S3**: Use `Minio` or `LocalStack` via Docker.
- **Google Cloud**: Use the official Google Cloud Storage emulator.

#### 15.3 Type Inference Tests

The `builders/main.builder.spec.ts` must include `expectTypeOf` tests to verify that:
- Adding a scope correctly updates the `TScopes` type.
- `.scope()` correctly identifies if a second argument is required.
- Nested `.path()` calls don't lose scope type information.

---

### 16. Maintainer Guide: Adding a New Adapter

To add a new storage provider (e.g., Azure Blob Storage, Cloudflare R2), follow these steps:

1.  **Define Credentials**: Add the credential interface to `src/types/credentials.ts`.
2.  **Implement Adapter**: Create `src/adapters/[provider].adapter.ts`.
    - Extend `IgniterStorageAdapter`.
    - Implement `put`, `delete`, `list`, `exists`, `stream`.
    - (Optional) Implement `copy`, `move` for provider-native performance.
3.  **Export Adapter**: Add to `src/adapters/index.ts`.
4.  **Register Factory**: Add a default factory to `IgniterStorageBuilder.create()` in `src/builders/main.builder.ts`.
5.  **Update Environment**: Update `IgniterStorageEnv` in `src/utils/env.ts` to support the new provider's environment variables.
6.  **Add Tests**: Create `src/adapters/[provider].adapter.spec.ts` and use the `MockAdapter` or local emulator (e.g., Azurite) for verification.

---

### 16. Security & Compliance

#### 16.1 Server-Only Safety

The `@igniter-js/storage` package is designed for server-side environments. It contains logic (like stream handling and AWS/GCP SDKs) that is not compatible with browsers. To prevent accidental inclusion in client-side bundles, we use a `shim.ts` protection.

- **`src/shim.ts`**: This file is mapped in `package.json`'s `browser` and `exports` fields. It exports a version of the classes that throw "IgniterStorage is server-only" errors upon instantiation.

#### 16.2 PII and Sensitive Data

- **Telemetry Privacy**: The `telemetryInternal.emit` calls are designed to NEVER include file content or sensitive metadata. Only paths, sizes, and operational metrics are emitted.
- **Credential Handling**: Credentials should never be hardcoded. The builder prioritizes `IgniterStorageEnv` which pulls from process environment variables.

#### 16.3 Environment Variable Reference

The `IgniterStorageEnv` utility reads configuration from environment variables with the `IGNITER_STORAGE_` prefix. These values are merged into the builder state during `.build()`.

- `IGNITER_STORAGE_ADAPTER`
- `IGNITER_STORAGE_URL`
- `IGNITER_STORAGE_BASE_PATH`
- `IGNITER_STORAGE_MAX_FILE_SIZE`
- `IGNITER_STORAGE_ALLOWED_MIME_TYPES`
- `IGNITER_STORAGE_ALLOWED_EXTENSIONS`

S3 credentials:

- `IGNITER_STORAGE_S3_ENDPOINT`
- `IGNITER_STORAGE_S3_REGION`
- `IGNITER_STORAGE_S3_BUCKET`
- `IGNITER_STORAGE_S3_ACCESS_KEY_ID`
- `IGNITER_STORAGE_S3_SECRET_ACCESS_KEY`
- `IGNITER_STORAGE_S3_SIGNATURE_VERSION`

Google credentials:

- `IGNITER_STORAGE_GOOGLE_ENDPOINT`
- `IGNITER_STORAGE_GOOGLE_REGION`
- `IGNITER_STORAGE_GOOGLE_BUCKET`
- `IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON`
- `IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON_BASE64`

#### 16.4 Cache Control and Public ACL Defaults

`IgniterStorageManager.upload()` calls `adapter.put()` with:

- `cacheControl: "public, max-age=31536000"`
- `public: true`

Adapters interpret these values per provider:

- S3 uses `ACL: "public-read"` where supported.
- GCS calls `makePublic()` after successful upload.

#### 16.5 Telemetry Optionality

Telemetry is optional. If `withTelemetry(...)` is not configured, the manager skips event emission safely.

#### 16.6 Adapter Contract Guarantees

Adapters are infrastructure-only. They must not apply scopes, policies, or any business validation. All path and policy decisions are handled in the manager.

---

### 17. Troubleshooting & Error Code Library

#### `IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED`
- **Context**: Occurs during `.build()`.
- **Cause**: Missing adapter OR missing `baseUrl` (required for public URLs).
- **Solution**: Provide `.withAdapter(...)` and `.withUrl(...)` or set `IGNITER_STORAGE_ADAPTER` and `IGNITER_STORAGE_URL`.

#### `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`
- **Context**: Immediately after calling `upload`.
- **Cause**: File size or type violates configured rules.
- **Solution**: Check the `violations` array in the error object data.

#### `IGNITER_STORAGE_INVALID_SCOPE`
- **Context**: Calling `.scope('key', ...)`.
- **Cause**: The key was never registered in the builder.
- **Solution**: Add `.addScope('key', 'template')` to your builder configuration.

#### `IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED`
- **Context**: Calling `.scope('key')` for a scope that requires `[identifier]`.
- **Cause**: Missing identifier argument for a template containing `[identifier]`.
- **Solution**: Provide an identifier: `.scope('user', userId)`.

#### `IGNITER_STORAGE_INVALID_PATH_HOST`
- **Context**: Passing a full URL to `get`, `delete`, `stream`, `copy`, or `move`.
- **Cause**: URL hostname does not match configured `baseUrl`.
- **Solution**: Use a URL from the same CDN host or pass a relative path.

#### `IGNITER_STORAGE_REPLACE_FAILED`
- **Context**: Cleanup phase of an upload with a replace strategy.
- **Cause**: The adapter failed to delete existing conflicting files (likely permission issue).
- **Solution**: Ensure your storage credentials have `delete` and `list` permissions.

#### `IGNITER_STORAGE_FETCH_FAILED`
- **Context**: During `uploadFromUrl`.
- **Cause**: The remote URL could not be reached or returned a non-2xx status.
- **Solution**: Check the remote URL's accessibility and ensure the server allows your IP to fetch the asset.

#### `IGNITER_STORAGE_UPLOAD_FAILED`
- **Context**: During `upload` after adapter interaction.
- **Cause**: Adapter error (credentials, permissions, network) or stream failure.
- **Solution**: Validate adapter config and provider permissions.

#### `IGNITER_STORAGE_DELETE_FAILED`
- **Context**: During `delete`.
- **Cause**: Adapter error or permission issues.
- **Solution**: Ensure delete permissions on the backend.

#### `IGNITER_STORAGE_LIST_FAILED`
- **Context**: During `list`.
- **Cause**: Adapter error or permission issues.
- **Solution**: Ensure list permissions on the backend.

#### `IGNITER_STORAGE_STREAM_FAILED`
- **Context**: During `stream`.
- **Cause**: Adapter error or missing object.
- **Solution**: Validate existence and permissions.

#### `IGNITER_STORAGE_GET_FAILED`
- **Context**: During `get`.
- **Cause**: Adapter error or missing object.
- **Solution**: Validate existence and permissions.

#### `IGNITER_STORAGE_COPY_NOT_SUPPORTED`
- **Context**: Calling `copy()`.
- **Cause**: The current adapter does not implement the `copy` method.
- **Solution**: Use an adapter that supports copying (like S3 or GCS) or manually download and re-upload the file.

#### `IGNITER_STORAGE_MOVE_NOT_SUPPORTED`
- **Context**: Calling `move()`.
- **Cause**: The current adapter does not implement the `move` method.
- **Solution**: Use an adapter that supports moving or manually copy and then delete.

#### `IGNITER_STORAGE_COPY_FAILED`
- **Context**: During `copy`.
- **Cause**: Provider error (permissions or missing source).
- **Solution**: Validate source existence and copy permissions.

#### `IGNITER_STORAGE_MOVE_FAILED`
- **Context**: During `move`.
- **Cause**: Provider error (permissions or missing source).
- **Solution**: Validate source existence and move permissions.

---

_End of AGENTS.md_

