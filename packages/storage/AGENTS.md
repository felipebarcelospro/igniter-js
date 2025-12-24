# AGENTS.md - @igniter-js/storage

> **Last Updated:** 2025-12-23  
> **Version:** 0.2.0  
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
- `s3.adapter.ts`: **The S3 Implementation**. Implements the adapter for AWS S3 and compatible APIs (MinIO, R2). It uses `@aws-sdk/client-s3` for commands and `@aws-sdk/lib-storage` for high-performance multipart uploads. It handles bucket auto-creation (best-effort) and public-read policy application.
- `google-cloud.adapter.ts`: **The GCS Implementation**. Implements the adapter for Google Cloud Storage using the `@google-cloud/storage` library. It supports resumable uploads and handles bucket existence checks during the initialization of the write pipeline.
- `mock.adapter.ts`: **The Testing Workhorse**. An in-memory, high-fidelity mock that tracks every call and stores data in a `Map`. It is the primary tool for testing both the package itself and consumer applications.
- `index.ts`: Standard discovery point. It exports all built-in adapters to ensure they can be easily consumed by the main builder.

#### `src/builders/` — The Configuration Factory

This directory houses the "Accumulators" that implement the fluent API. These classes are responsible for collecting configuration state and using advanced TypeScript generics to build a strictly-typed output.

- `main.builder.ts`: **IgniterStorageBuilder**. The entry point of the fluent API. It manages immutable state accumulation and uses recursive generic intersection to track and type-safe added scopes. It is responsible for the final validation and merging of environment variables during the `.build()` call.
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
9.  **Physical Upload**: Call `adapter.put(key, body, options)`.
    - S3 adapter uses the `Upload` class from `@aws-sdk/lib-storage` for optimized chunked uploads.
    - Google adapter uses `file.save` with MD5 validation.
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

---

### 5. Dependency & Type Graph

Maintainers must protect the architecture from "Dependency Bloat." The storage package is designed to have a very light runtime footprint.

#### Dependencies (Peer & Optional)

- **`@igniter-js/core`**: Mandatory. Provides the foundational `IgniterError` class and the `IgniterLogger` interface.
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

### 9. Quick Start & Common Patterns

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
storage.onUploadSuccess(async (p) => {
  await db.log(p.file.path);
});
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

### 12. Detailed Internal Operation Walkthrough

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

### 13. Telemetry Event & Attribute Reference

| Namespace         | Event            | Attributes                                    | Description           |
| :---------------- | :--------------- | :-------------------------------------------- | :-------------------- |
| `igniter.storage` | `upload.started` | `storage.path`, `storage.size`                | Operation initiated.  |
|                   | `upload.success` | `storage.url`, `storage.duration_ms`          | Transfer completed.   |
|                   | `upload.error`   | `storage.error.code`, `storage.error.message` | Operation failed.     |
|                   | `delete.success` | `storage.path`, `storage.duration_ms`         | Object removed.       |
|                   | `get.success`    | `storage.found` (bool)                        | Metadata lookup done. |
|                   | `list.success"   | `storage.count` (num)                         | Directory scanned.    |

---

### 14. Troubleshooting & Error Code Library

#### `IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED`

- **Context**: Occurs during `.build()`.
- **Cause**: Developer forgot to call `.withAdapter()` and the environment variable is missing.
- **Solution**: Call `.withAdapter('s3', credentials)` in your storage setup.

#### `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`

- **Context**: Immediately after calling `upload`.
- **Cause**: File size or type violates configured rules.
- **Solution**: Check the `violations` array in the error object data.

#### `IGNITER_STORAGE_INVALID_SCOPE`

- **Context**: Calling `.scope('key', ...)`.
- **Cause**: The key was never registered in the builder.
- **Solution**: Add `.addScope('key', 'template')` to your builder configuration.

#### `IGNITER_STORAGE_REPLACE_FAILED`

- **Context**: Cleanup phase of an upload with a replace strategy.
- **Cause**: The adapter failed to delete existing conflicting files (likely permission issue).
- **Solution**: Ensure your storage credentials have `delete` and `list` permissions.

---

_End of AGENTS.md_
