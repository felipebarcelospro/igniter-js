# @igniter-js/storage - AI Agent Manual

> **Package Version:** 0.2.0  
> **Last Updated:** 2025-12-23  
> **Status:** In Review

---

## 1. For Code Agents Maintaining the Package

### 1.1 Architecture & Core Engine

The `@igniter-js/storage` package is built on a **Unified Manager** architecture. This design eliminates the traditional Facade/Core separation to provide a direct, high-performance API while maintaining deep internal state.

- **Instance Immutability:** The `IgniterStorageManager` class is immutable. Every transformation method (`.scope()`, `.path()`) returns a **freshly cloned instance** with a merged configuration state. This prevents side effects when sharing a base storage instance across multiple services.
- **Recursive Generic Scoping:** The `IgniterStorageBuilder` implements a recursive generic type `TScopes`. Every call to `.addScope(key, path)` uses TypeScript's `Record<K, V> & TScopes` to accumulate scope definitions. This metadata is then carried into the `IgniterStorageManager`, allowing for full IDE intellisense and compile-time validation of scope keys and identifiers.
- **Provider Abstraction:** Adapters are restricted to raw I/O. Business logic (Policy enforcement, MIME inference, URL generation) is strictly owned by the Manager.

### 1.2 Development Conventions & "Zero Redundancy" Rule

- **Static Utilities:** All shared logic (MIME, Path, URL) MUST be implemented as static methods in classes within `src/utils/`. **Naming:** `IgniterStorage[Domain]`. **Reason:** Namespace clarity and tree-shaking efficiency.
- **Decoupled types:** Never define types or interfaces inside class files. They must reside in `src/types/` and be grouped by domain (e.g., `src/types/policies.ts`).
- **Unified Emit Pattern:** Emit telemetry inline inside each public method using `IgniterStorageTelemetryEvents.get.key(...)`.
  - _Rule:_ Operation Start -> Hook Call -> Operation Execution -> Operation End (Success/Error) -> Hook End -> Telemetry End.
- **Log Conciseness:** Use `this.logger` for operational tracing. **Info** for successful major operations (Upload, Delete), **Warn** for non-critical misses (e.g., `get` 404), and **Error** for process failures.

### 1.3 Detailed File Structure Mapping

| Path                           | Purpose            | Key Content                                                                 |
| :----------------------------- | :----------------- | :-------------------------------------------------------------------------- |
| `src/index.ts`                 | Entry Point        | Barrel exports for core, builders, adapters, telemetry, errors, utils, types. |
| `src/shim.ts`                  | Browser Protection | Throws `Error` on access. Prevents browser bundles from including storage logic. |
| `src/builders/main.builder.ts` | Fluent Config      | `IgniterStorageBuilder` and `IgniterStorage` entrypoint alias.              |
| `src/builders/index.ts`        | Builder Barrel     | Public builder exports.                                                     |
| `src/core/manager.ts`          | Operational Engine | `IgniterStorageManager` implementing `IIgniterStorageManager`.              |
| `src/core/index.ts`            | Core Barrel        | Core exports for the manager.                                               |
| `src/adapters/index.ts`        | Adapter Barrel     | S3, GCS, base adapter, and mock adapter exports.                            |
| `src/adapters/mock.adapter.ts` | Testing Adapter    | In-memory mock adapter with call tracking.                                  |
| `src/telemetry/index.ts`       | Observability      | Zod schemas for all dot-notation events (`igniter.storage.*`).              |
| `src/utils/index.ts`           | Utilities Barrel   | Path, URL, MIME, env, and try-catch utilities.                              |
| `src/types/index.ts`           | Types Barrel       | Public type exports grouped by domain.                                      |
| `src/errors/index.ts`          | Errors Barrel      | Storage error exports.                                                      |

### 1.4 Comprehensive Operation Flows

#### The Upload Pipeline

1.  **Resolve Destination:** Normalize path, join with `basePath`, and verify URL host (if destination is a URL).
2.  **Infer Content:** If extension is missing, guess from `Blob.type`, `File.name`, or response headers.
3.  **Policy Assert:** Check `maxFileSize`, `allowedMimeTypes`, and `allowedExtensions`. Throw `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION` on failure.
4.  **Telemetry Start:** Emit `igniter.storage.upload.started`.
5.  **Hook Start:** Invoke `onUploadStarted`.
6.  **Replace Strategy:** If `replace` is set, delete conflicting files (BY_FILENAME or BY_FILENAME_AND_EXTENSION).
7.  **Adapter Execution:** Call `adapter.put()`.
8.  **Telemetry End:** Emit `igniter.storage.upload.success` (with duration/size) or `error`.
9.  **Hook End:** Invoke `onUploadSuccess` or `onUploadError`.

### 1.5 Maintenance Checklist

- [ ] **Build Validation:** Run `npm run build`. Check for DTS generation errors.
- [ ] **Type Inference Check:** Add a dummy scope in `manager.spec.ts` and verify `storage.scope('key')` correctly identifies required parameters.
- [ ] **Telemetry Redaction:** Ensure no credentials or raw file buffers are EVER passed to telemetry attributes.
- [ ] **Provider Consistency:** When adding an adapter, ensure `exists()` correctly returns `false` instead of throwing on 404.

---

## 2. For Code Agents Using the Package

### 2.1 Standard Initialization

Initialize the storage service in your application's service layer (e.g., `src/services/storage.ts`).

```typescript
import { IgniterStorage } from "@igniter-js/storage";
import { IgniterS3Adapter } from "@igniter-js/storage/adapters";

export const storage = IgniterStorage.create()
  .withAdapter(
    IgniterS3Adapter.create({
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
    }),
  )
  .withUrl(env.CDN_URL) // Base URL for public access
  .withPath("/app-v1") // Global prefix
  .addScope("user", "/users/[identifier]") // Requires identifier
  .addScope("public", "/static") // Static path
  .build();
```

### 2.2 Feature-Scoped Best Practices

When building features, do not pass the whole storage around. Use the scoped clones:

```typescript
// Good: Feature only cares about its bucket
const userDrive = storage.scope("user", userId);
await userDrive.upload(file, "profile.png");

// Better: Deep nesting within a feature
const gallery = userDrive.path("gallery");
await gallery.upload(photo, "vacation.jpg"); // Saved to: /app-v1/users/123/gallery/vacation.jpg
```

### 2.3 Real-World Use Cases

#### Cleanup-First Uploads

When a user uploads a new profile picture, you want to delete the old one regardless of the extension (e.g., if they change from `.jpg` to `.png`).

```typescript
await storage
  .scope("user", userId)
  .upload(file, "avatar", { replace: "BY_FILENAME" });
```

#### Secure Proxying (Server-Side)

Fetch a private file from storage and stream it to the client with correct headers.

```typescript
const stream = await storage.stream("private/report.pdf");
return new Response(stream as any, {
  headers: { "Content-Type": "application/pdf" },
});
```

### 2.4 Telemetry Catalog

| Action     | Event                      | Attributes                                                                 |
| :--------- | :------------------------- | :-------------------------------------------------------------------------- |
| **Upload** | `igniter.storage.upload.*` | `storage.path`, `storage.size`, `storage.content_type`, `storage.method`, `storage.duration_ms` |
| **Delete** | `igniter.storage.delete.*` | `storage.path`, `storage.duration_ms`                                       |
| **Copy**   | `igniter.storage.copy.*`   | `storage.from`, `storage.to`, `storage.duration_ms`                         |
| **Move**   | `igniter.storage.move.*`   | `storage.from`, `storage.to`, `storage.duration_ms`                         |
| **List**   | `igniter.storage.list.*`   | `storage.prefix`, `storage.count`, `storage.duration_ms`                    |
| **Get**    | `igniter.storage.get.*`    | `storage.path`, `storage.found`, `storage.duration_ms`                      |

### 2.5 Troubleshooting & Error Codes

| Code                                      | Meaning                                  | Fix                                                        |
| :---------------------------------------- | :--------------------------------------- | :--------------------------------------------------------- |
| `IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED`  | Missing credentials or adapter call.     | Check your `.withAdapter()` configuration.                 |
| `IGNITER_STORAGE_INVALID_SCOPE`           | Tried to use a scope not in the builder. | Add `.addScope()` during initialization.                   |
| `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION` | File is too big or wrong type.           | Review `.withMaxFileSize()` or `.withAllowedExtensions()`. |
| `IGNITER_STORAGE_INVALID_PATH_HOST`       | Input URL host doesn't match `baseUrl`.  | Ensure URLs passed to `get()` match the CDN domain.        |

---

## 3. Mastering Advanced Usage

- **Manual Extension Handling:** If you want absolute control over the name, provide the extension in the destination string. The manager only infers if the extension is missing.
- **Environment Integration:** You can set `IGNITER_STORAGE_ADAPTER=s3` and `IGNITER_STORAGE_S3_BUCKET=my-bucket` in your `.env` to avoid hardcoding credentials in the builder.
- **Custom Adapters:** Simply extend `IgniterStorageAdapter` and implement the 5 abstract methods. Inject via `withAdapter(myInstance)`.
