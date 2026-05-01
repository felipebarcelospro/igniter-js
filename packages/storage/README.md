# @igniter-js/storage

<div align="center">

[![npm version](https://img.shields.io/npm/v/@igniter-js/storage)](https://www.npmjs.com/package/@igniter-js/storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-orange)](https://bun.sh)

**Type-safe, adapter-based file storage for Igniter.js**  
S3, Google Cloud Storage, and custom adapters with scopes, policies, hooks, and telemetry.

[Quick Start](#-quick-start) • [Core Concepts](#-core-concepts) • [Usage Examples](#-usage-examples) • [API Reference](#-api-reference) • [Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Why @igniter-js/storage?

@igniter-js/storage gives you a consistent, typed API for any file storage backend. It is designed for server-side runtimes and integrates seamlessly with observability and logging in the Igniter.js ecosystem.

- ✅ **Provider-agnostic** — switch between S3 and GCS with one line
- ✅ **Type-safe scopes** — compile-time path safety with identifier enforcement
- ✅ **Pre-flight validation** — size, MIME, and extension policies
- ✅ **Lifecycle hooks** — upload/delete/copy/move events
- ✅ **Telemetry-ready** — first-class integration with `@igniter-js/telemetry`
- ✅ **Server-only safety** — browser shim prevents misuse
- ✅ **Immutable builder** — predictable configuration flow

---

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @igniter-js/storage @igniter-js/common

# pnpm
pnpm add @igniter-js/storage @igniter-js/common

# yarn
yarn add @igniter-js/storage @igniter-js/common

# bun
bun add @igniter-js/storage @igniter-js/common
```

Optional telemetry package:

```bash
# npm
npm install @igniter-js/telemetry

# pnpm
pnpm add @igniter-js/telemetry

# yarn
yarn add @igniter-js/telemetry

# bun
bun add @igniter-js/telemetry
```

Adapter SDKs:

```bash
# S3 / R2 / MinIO
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage

# Google Cloud Storage
npm install @google-cloud/storage
```

### Your first storage instance

```typescript
import { IgniterStorage } from "@igniter-js/storage";

export const storage = IgniterStorage.create()
  .withUrl("https://cdn.myapp.com")
  .withAdapter("s3", {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  })
  .addScope("user", "/users/[identifier]")
  .addScope("public", "/public")
  .build();
```

### Upload your first file

```typescript
const avatar = await storage
  .scope("user", "user_123")
  .upload(file, "avatar.png");

console.log(avatar.url);
```

**✅ Success!** You now have a type-safe storage manager with S3 backing.

---

## 🧭 Core Concepts

### Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│                   Your Application                       │
├─────────────────────────────────────────────────────────┤
│ storage.scope("user", id).upload(file, "avatar.png")     │
└────────────┬────────────────────────────────────────────┘
             │ Type-safe API
             ▼
┌─────────────────────────────────────────────────────────┐
│            IgniterStorageManager (Runtime)               │
│  • Path resolution     • Policies     • Hooks            │
│  • Telemetry           • Logger       • Immutability     │
└────────────┬────────────────────────────────────────────┘
             │ Adapter contract
             ▼
┌─────────────────────────────────────────────────────────┐
│                     Adapter Layer                        │
│   S3 Adapter  |  GCS Adapter  |  Mock Adapter            │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│           S3 / GCS / R2 / MinIO / Custom Backend         │
└─────────────────────────────────────────────────────────┘
```

### Builder → Manager

- `IgniterStorage.create()` returns an immutable builder.
- Each `.with*()` call returns a new builder instance.
- `.build()` validates config and returns a runtime manager.

### Scopes (type-safe paths)

Scopes model multi-tenant or domain-specific storage while keeping paths compile-time safe.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .addScope("user", "/users/[identifier]")
  .addScope("public", "/public")
  .build();

storage.scope("user", "123");
storage.scope("public");
```

### Policies (guardrails)

Policies are validated before uploads begin.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withMaxFileSize(5 * 1024 * 1024)
  .withAllowedMimeTypes(["image/png", "image/jpeg"])
  .withAllowedExtensions(["png", "jpg", "jpeg"])
  .build();
```

### Replace strategies

Replace strategies delete conflicting files before upload.

```typescript
await storage.upload(file, "avatar.png", { replace: "BY_FILENAME" });
```

### Hooks (lifecycle control)

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onUploadStarted(({ path }) => {
    console.log("Starting upload", path);
  })
  .onUploadSuccess(({ file }) => {
    console.log("Uploaded", file.url);
  })
  .onDeleteSuccess(({ path }) => {
    console.log("Deleted", path);
  })
  .build();
```

### Telemetry

Telemetry events are defined in `@igniter-js/storage/telemetry` and emitted when `withTelemetry(...)` is configured.

```typescript
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { IgniterStorageTelemetryEvents } from "@igniter-js/storage/telemetry";

const telemetry = IgniterTelemetry.create()
  .withService("api")
  .addEvents(IgniterStorageTelemetryEvents)
  .build();

const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withTelemetry(telemetry)
  .build();
```

---

## 📖 Usage Examples

### 1) Upload from a File/Blob

```typescript
const file = new File(["hello"], "hello.txt", { type: "text/plain" });
const stored = await storage.upload(file, "docs/hello.txt");
console.log(stored.url);
```

### 2) Upload from a URL

```typescript
const file = await storage.uploadFromUrl(
  "https://example.com/logo.png",
  "public/logo.png",
);
```

### 3) Upload from Buffer

```typescript
const buffer = Buffer.from("hello");
await storage.uploadFromBuffer(buffer, "docs/hello.txt", {
  contentType: "text/plain",
});
```

### 4) Upload from Base64

```typescript
const base64 = Buffer.from("hello").toString("base64");
await storage.uploadFromBase64(base64, "docs/hello.txt", {
  contentType: "text/plain",
});
```

### 5) Read metadata

```typescript
const file = await storage.get("public/logo.png");
if (file) {
  console.log(file.name, file.contentType);
}
```

### 6) List files in a folder

```typescript
const files = await storage.list("public/");
for (const file of files) {
  console.log(file.path);
}
```

### 7) Delete a file

```typescript
await storage.delete("public/logo.png");
```

### 8) Stream a file

```typescript
const stream = await storage.stream("public/video.mp4");
stream.pipe(response);
```

### 9) Copy a file

```typescript
await storage.copy("public/logo.png", "public/logo-copy.png");
```

### 10) Move a file

```typescript
await storage.move("public/logo.png", "archive/logo.png");
```

### 11) Replace by filename

```typescript
await storage.upload(file, "avatar.png", { replace: "BY_FILENAME" });
```

### 12) Replace exact file

```typescript
await storage.upload(file, "avatar.png", { replace: "BY_FILENAME_AND_EXTENSION" });
```

### 13) Use scopes for multi-tenant isolation

```typescript
const userStorage = storage.scope("user", "user_123");
await userStorage.upload(file, "avatar.png");
```

### 14) Compose paths fluently

```typescript
const invoices = storage.path("orgs/acme").path("invoices");
await invoices.upload(file, "jan.pdf");
```

### 15) Use adapter instance

```typescript
import { IgniterS3StorageAdapter } from "@igniter-js/storage/adapters";

const adapter = new IgniterS3StorageAdapter({
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION,
});

const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter(adapter)
  .build();
```

### 16) Use adapter factories

```typescript
const storage = IgniterStorage.create()
  .withAdapterFactories({
    s3: (credentials) => new IgniterS3StorageAdapter(credentials),
  })
  .withAdapter("s3", { bucket: "app" })
  .withUrl("https://cdn.example.com")
  .build();
```

### 17) Mock adapter for tests

```typescript
import { MockStorageAdapter } from "@igniter-js/storage/adapters";

const mock = MockStorageAdapter.create();
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter(mock)
  .build();

await storage.uploadFromBuffer(Buffer.from("hi"), "test.txt", {
  contentType: "text/plain",
});

console.log(mock.calls.put); // 1
```

### 18) Hook-based audit logging

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onUploadSuccess(async ({ file }) => {
    await db.audit.insert({ action: "upload", path: file.path });
  })
  .onDeleteSuccess(async ({ path }) => {
    await db.audit.insert({ action: "delete", path });
  })
  .build();
```

### 19) Policy enforcement

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withMaxFileSize(2 * 1024 * 1024)
  .withAllowedMimeTypes(["image/png", "image/jpeg"])
  .withAllowedExtensions(["png", "jpg", "jpeg"])
  .build();
```

### 20) Handle policy errors

```typescript
import { IgniterStorageError } from "@igniter-js/storage";

try {
  await storage.upload(file, "avatar.png");
} catch (error) {
  if (IgniterStorageError.is(error) &&
      error.code === "IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION") {
    console.error(error.data);
  }
}
```

### 21) Using logger

```typescript
import type { IgniterLogger } from "@igniter-js/common";

const logger: IgniterLogger = console;

const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withLogger(logger)
  .build();
```

### 22) Google Cloud Storage

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("google", {
    bucket: process.env.GCS_BUCKET,
    credentialsJsonBase64: process.env.GCS_CREDENTIALS_BASE64,
  })
  .build();
```

### 23) Use the factory objects

```typescript
import { IgniterS3Adapter } from "@igniter-js/storage/adapters";

const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter(IgniterS3Adapter.create({
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
  }))
  .build();
```

### 24) Explicit content type with buffers

```typescript
await storage.uploadFromBuffer(Buffer.from("hi"), "note.txt", {
  contentType: "text/plain",
});
```

### 25) Hostname protection with full URLs

```typescript
// Allowed: hostname matches baseUrl
await storage.delete("https://cdn.example.com/public/logo.png");

// Throws IGNITER_STORAGE_INVALID_PATH_HOST if hostname differs
```

### 26) Read-only metadata for checks

```typescript
const file = await storage.get("public/logo.png");
if (!file) {
  console.log("missing");
}
```

### 27) Conditional replace by file type

```typescript
const options = file.type.startsWith("image/")
  ? { replace: "BY_FILENAME" as const }
  : undefined;

await storage.upload(file, "uploads/media", options);
```

### 28) Split storage by environment

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withPath(process.env.NODE_ENV === "production" ? "prod" : "dev")
  .withAdapter("s3", { bucket: "app" })
  .build();
```

### 29) Scoped avatars with base path

```typescript
const avatars = storage.path("users").scope("user", "123");
await avatars.upload(file, "avatar.png");
```

### 30) Readable streams with Node Response

```typescript
import { Readable } from "node:stream";

const stream = await storage.stream("videos/intro.mp4");
const nodeStream = stream instanceof Readable ? stream : Readable.fromWeb(stream as any);
nodeStream.pipe(response);
```

### 31) Upload from URL with metadata

```typescript
const file = await storage.uploadFromUrl(
  "https://images.example.com/hero.jpg",
  "public/hero",
);
console.log(file.extension);
```

### 32) Replace existing PDFs only

```typescript
await storage.upload(file, "docs/report.pdf", {
  replace: "BY_FILENAME_AND_EXTENSION",
});
```

### 33) Use base path + list

```typescript
const appStorage = storage.path("apps/my-app");
const files = await appStorage.list();
```

### 34) Move and keep metadata

```typescript
const moved = await storage.move("tmp/file.txt", "archive/file.txt");
console.log(moved.url);
```

### 35) Copy into another folder

```typescript
const file = await storage.copy("public/logo.png", "public/logos/logo.png");
console.log(file.path);
```

### 36) Create a "public" wrapper helper

```typescript
import type { IgniterStorageManager } from "@igniter-js/storage";

function publicStorage(storage: IgniterStorageManager) {
  return storage.path("public");
}

const publicFiles = publicStorage(storage);
await publicFiles.upload(file, "hero.png");
```

### 37) Strict MIME-only uploads

```typescript
const strictStorage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withAllowedMimeTypes(["application/pdf"])
  .build();
```

### 38) Hook: image processing pipeline

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onUploadSuccess(async ({ file, contentType }) => {
    if (contentType.startsWith("image/")) {
      await jobs.enqueue("resize-image", { path: file.path });
    }
  })
  .build();
```

### 39) Hook: audit on move

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onMoveSuccess(async ({ from, to }) => {
    await db.audit.insert({ from, to });
  })
  .build();
```

### 40) Hook: alert on delete

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onDeleteSuccess(({ path }) => {
    alerts.send(`Deleted ${path}`);
  })
  .build();
```

---

## 🌍 Real-World Examples

### Example 1: SaaS Multi-Tenant Asset Isolation

```typescript
const tenantStorage = storage.scope("tenant", tenantId);
await tenantStorage.upload(file, "branding/logo.png");
```

### Example 2: User Avatar Management

```typescript
const userDrive = storage.scope("user", userId);
await userDrive.upload(file, "avatar.png", { replace: "BY_FILENAME" });
```

### Example 3: Compliance Archive (Healthcare)

```typescript
const archive = storage.path("compliance").path("hipaa");
await archive.upload(file, `records/${recordId}.pdf`);
```

### Example 4: E-commerce Product Images

```typescript
const products = storage.path("products").path(productId);
await products.upload(file, "hero.jpg", { replace: "BY_FILENAME" });
```

### Example 5: Nightly Database Backups

```typescript
const date = new Date().toISOString().split("T")[0];
await storage.path("backups").path(date).uploadFromBuffer(sql, "db.sql.gz", {
  contentType: "application/gzip",
});
```

### Example 6: Import CSV → Processing Queue

```typescript
const file = await storage.path("imports").upload(stream, "incoming.csv");
await jobs.enqueue("process-import", { path: file.path });
```

### Example 7: CDN-safe Logo Publishing

```typescript
const assets = storage.path("public");
await assets.upload(file, "logo.svg", { replace: "BY_FILENAME" });
```

### Example 8: Tenant Branding (White Label)

```typescript
const branding = storage.scope("tenant", tenantId).path("branding");
const logo = await branding.get("logo.png");
```

### Example 9: Document Signing Pipeline

```typescript
const drafts = storage.path("documents/drafts");
await drafts.upload(file, `${docId}.pdf`);
await storage.move(`documents/drafts/${docId}.pdf`, `documents/signed/${docId}.pdf`);
```

### Example 10: Privacy-first Streamed Reports

```typescript
const stream = await storage.scope("admin").stream(`reports/${reportId}.pdf`);
stream.pipe(response);
```

### Example 11: Media Mirroring

```typescript
await storage.path("mirrors").uploadFromUrl(remoteUrl, "image.png");
```

### Example 12: Audit Logs on Delete

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onDeleteSuccess(async ({ path }) => {
    await db.audit.insert({ action: "delete", path });
  })
  .build();
```

---

## 🧩 Adapters

### Built-in adapters

- `IgniterS3StorageAdapter`
- `IgniterGoogleCloudStorageAdapter`
- `MockStorageAdapter`

### Import adapters

```typescript
import {
  IgniterS3StorageAdapter,
  IgniterGoogleCloudStorageAdapter,
  MockStorageAdapter,
} from "@igniter-js/storage/adapters";
```

### S3 adapter example

```typescript
const adapter = new IgniterS3StorageAdapter({
  bucket: process.env.S3_BUCKET,
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
});

const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter(adapter)
  .build();
```

### Google Cloud adapter example

```typescript
const adapter = new IgniterGoogleCloudStorageAdapter({
  bucket: process.env.GCS_BUCKET,
  credentialsJsonBase64: process.env.GCS_CREDENTIALS_BASE64,
});

const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter(adapter)
  .build();
```

### Mock adapter example

```typescript
const adapter = MockStorageAdapter.create();
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter(adapter)
  .build();
```

### Adapter comparison

| Adapter | Supports Copy | Supports Move | Notes |
| --- | --- | --- | --- |
| `IgniterS3StorageAdapter` | ✅ | ✅ | Uses AWS SDK v3 + multipart uploads |
| `IgniterGoogleCloudStorageAdapter` | ✅ | ✅ | Uses `@google-cloud/storage` |
| `MockStorageAdapter` | ✅ | ✅ | In-memory testing utility |

---

## ⚙️ Configuration

### Environment variables

The builder reads configuration from environment variables via `IgniterStorageEnv`.

```text
IGNITER_STORAGE_ADAPTER
IGNITER_STORAGE_URL
IGNITER_STORAGE_BASE_PATH

IGNITER_STORAGE_MAX_FILE_SIZE
IGNITER_STORAGE_ALLOWED_MIME_TYPES
IGNITER_STORAGE_ALLOWED_EXTENSIONS

IGNITER_STORAGE_S3_ENDPOINT
IGNITER_STORAGE_S3_REGION
IGNITER_STORAGE_S3_BUCKET
IGNITER_STORAGE_S3_ACCESS_KEY_ID
IGNITER_STORAGE_S3_SECRET_ACCESS_KEY
IGNITER_STORAGE_S3_SIGNATURE_VERSION

IGNITER_STORAGE_GOOGLE_ENDPOINT
IGNITER_STORAGE_GOOGLE_REGION
IGNITER_STORAGE_GOOGLE_BUCKET
IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON
IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON_BASE64
```

### Environment-based setup

```typescript
import { IgniterStorage, IgniterStorageEnv } from "@igniter-js/storage";

const env = IgniterStorageEnv.read();

const storage = IgniterStorage.create()
  .withUrl(env.url ?? "https://cdn.example.com")
  .withAdapter(env.adapter === "google" ? "google" : "s3", env.adapter === "google" ? env.google! : env.s3!)
  .build();
```

---

## 🧪 Testing

### Unit tests with MockStorageAdapter

```typescript
import { describe, it, expect } from "vitest";
import { IgniterStorage } from "@igniter-js/storage";
import { MockStorageAdapter } from "@igniter-js/storage/adapters";

describe("storage", () => {
  it("stores a file in memory", async () => {
    const adapter = MockStorageAdapter.create();
    const storage = IgniterStorage.create()
      .withUrl("https://cdn.example.com")
      .withAdapter(adapter)
      .build();

    await storage.uploadFromBuffer(Buffer.from("hi"), "a.txt", {
      contentType: "text/plain",
    });

    expect(adapter.files.size).toBe(1);
    expect(adapter.calls.put).toBe(1);
  });
});
```

---

## ✅ Best Practices

| ✅ Do | Why | Example |
| --- | --- | --- |
| Use scopes | Safe multi-tenant isolation | `storage.scope("user", id)` |
| Set `baseUrl` | Required for public URLs | `.withUrl("https://cdn...")` |
| Use policies | Block unsafe uploads | `.withMaxFileSize(...)` |
| Use hooks | Enforce workflows | `.onUploadSuccess(...)` |
| Use Mock adapter | Fast tests | `MockStorageAdapter.create()` |

### Anti-patterns

- ❌ Import in client/browser code (server-only package)
- ❌ Hardcode credentials in source
- ❌ Skip telemetry in production
- ❌ Skip error handling for uploads and deletions

---

## 📚 API Reference

### Exports

```typescript
import { IgniterStorage, IgniterStorageBuilder, IgniterStorageError } from "@igniter-js/storage";
import {
  IgniterS3StorageAdapter,
  IgniterGoogleCloudStorageAdapter,
  MockStorageAdapter,
} from "@igniter-js/storage/adapters";
import { IgniterStorageTelemetryEvents } from "@igniter-js/storage/telemetry";
```

### IgniterStorageBuilder

#### Constructor

- `IgniterStorage.create()`

#### Methods

| Method | Parameters | Returns | Notes |
| --- | --- | --- | --- |
| `withAdapterFactories` | `Partial<IgniterStorageAdapterFactoryMap>` | `IgniterStorageBuilder` | Register custom factories |
| `withAdapter` | `IgniterStorageAdapter` | `IgniterStorageBuilder` | Provide adapter instance |
| `withAdapter` | `"s3" | "google", credentials` | `IgniterStorageBuilder` | Use built-in factories |
| `withUrl` | `string` | `IgniterStorageBuilder` | **Required** |
| `withPath` | `string` | `IgniterStorageBuilder` | Prefix (env/scopes) |
| `withLogger` | `IgniterLogger` | `IgniterStorageBuilder` | Optional logger |
| `withTelemetry` | `IgniterTelemetryManager` | `IgniterStorageBuilder` | Telemetry integration |
| `withMaxFileSize` | `number` | `IgniterStorageBuilder` | Policy |
| `withAllowedMimeTypes` | `readonly string[]` | `IgniterStorageBuilder` | Policy |
| `withAllowedExtensions` | `readonly string[]` | `IgniterStorageBuilder` | Policy |
| `onUploadStarted` | `IgniterStorageHooks["onUploadStarted"]` | `IgniterStorageBuilder` | Hook |
| `onUploadSuccess` | `IgniterStorageHooks["onUploadSuccess"]` | `IgniterStorageBuilder` | Hook |
| `onUploadError` | `IgniterStorageHooks["onUploadError"]` | `IgniterStorageBuilder` | Hook |
| `onDeleteStarted` | `IgniterStorageHooks["onDeleteStarted"]` | `IgniterStorageBuilder` | Hook |
| `onDeleteSuccess` | `IgniterStorageHooks["onDeleteSuccess"]` | `IgniterStorageBuilder` | Hook |
| `onDeleteError` | `IgniterStorageHooks["onDeleteError"]` | `IgniterStorageBuilder` | Hook |
| `onCopyStarted` | `IgniterStorageHooks["onCopyStarted"]` | `IgniterStorageBuilder` | Hook |
| `onCopySuccess` | `IgniterStorageHooks["onCopySuccess"]` | `IgniterStorageBuilder` | Hook |
| `onCopyError` | `IgniterStorageHooks["onCopyError"]` | `IgniterStorageBuilder` | Hook |
| `onMoveStarted` | `IgniterStorageHooks["onMoveStarted"]` | `IgniterStorageBuilder` | Hook |
| `onMoveSuccess` | `IgniterStorageHooks["onMoveSuccess"]` | `IgniterStorageBuilder` | Hook |
| `onMoveError` | `IgniterStorageHooks["onMoveError"]` | `IgniterStorageBuilder` | Hook |
| `addScope` | `key: string, path?: string` | `IgniterStorageBuilder` | Typed scopes |
| `build` | none | `IgniterStorageManager` | Validates config |

### IgniterStorageManager

| Method | Parameters | Returns | Notes |
| --- | --- | --- | --- |
| `path` | `prefix: string` | `IgniterStorageManager` | Immutable path composition |
| `scope` | `key, identifier?` | `IgniterStorageManager` | Typed scopes |
| `get` | `pathOrUrl: string` | `Promise<IgniterStorageFile \| null>` | Metadata |
| `list` | `prefix?: string` | `Promise<IgniterStorageFile[]>` | Listing |
| `upload` | `file, destination, options?` | `Promise<IgniterStorageFile>` | File/Blob/Stream |
| `uploadFromUrl` | `url, destination, options?` | `Promise<IgniterStorageFile>` | Proxy upload |
| `uploadFromBuffer` | `buffer, destination, options?` | `Promise<IgniterStorageFile>` | Buffer/Uint8Array |
| `uploadFromBase64` | `base64, destination, options?` | `Promise<IgniterStorageFile>` | Base64 string |
| `delete` | `pathOrUrl: string` | `Promise<void>` | Deletion |
| `stream` | `pathOrUrl: string` | `Promise<Readable>` | Stream |
| `copy` | `from, to` | `Promise<IgniterStorageFile>` | Adapter-dependent |
| `move` | `from, to` | `Promise<IgniterStorageFile>` | Adapter-dependent |

### Types

- `IgniterStorageFile`
- `IgniterStoragePolicies`
- `IgniterStorageUploadOptions`
- `IgniterStorageHooks`
- `IgniterStorageScopeDefinition`
- `IgniterStorageAdapterKey` (`"s3" | "google"`)

---

## 🧩 Telemetry Events

Telemetry events are defined in `@igniter-js/storage/telemetry`.

- `igniter.storage.upload.started`
- `igniter.storage.upload.success`
- `igniter.storage.upload.error`
- `igniter.storage.get.started`
- `igniter.storage.get.success`
- `igniter.storage.get.error`
- `igniter.storage.list.started`
- `igniter.storage.list.success`
- `igniter.storage.list.error`
- `igniter.storage.delete.started`
- `igniter.storage.delete.success`
- `igniter.storage.delete.error`
- `igniter.storage.copy.started`
- `igniter.storage.copy.success`
- `igniter.storage.copy.error`
- `igniter.storage.move.started`
- `igniter.storage.move.success`
- `igniter.storage.move.error`
- `igniter.storage.stream.started`
- `igniter.storage.stream.success`
- `igniter.storage.stream.error`

---

## 🧱 Detailed API Reference

This section documents every public method in detail with signatures, behavior notes, and runnable examples.

### Builder: `IgniterStorageBuilder`

#### `IgniterStorage.create()`

Creates a new builder with default adapter factories (`s3`, `google`).

```typescript
const builder = IgniterStorage.create();
```

#### `withAdapterFactories(factories)`

Registers custom factory functions that build adapters.

```typescript
const storage = IgniterStorage.create()
  .withAdapterFactories({
    s3: (credentials) => new IgniterS3StorageAdapter(credentials),
    google: (credentials) => new IgniterGoogleCloudStorageAdapter(credentials),
  })
  .withAdapter("s3", { bucket: "app" })
  .withUrl("https://cdn.example.com")
  .build();
```

#### `withAdapter(adapter)`

Provides a concrete adapter instance.

```typescript
const adapter = new IgniterS3StorageAdapter({ bucket: "app" });

const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter(adapter)
  .build();
```

#### `withAdapter("s3" | "google", credentials)`

Uses built-in factory maps for S3 or Google Cloud Storage.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("google", {
    bucket: "my-bucket",
    credentialsJsonBase64: process.env.GCS_CREDENTIALS_BASE64,
  })
  .build();
```

#### `withUrl(url)`

Sets the public base URL used to generate `IgniterStorageFile.url`. This is required.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .build();
```

#### `withPath(basePath)`

Sets a global prefix for all keys (e.g., `prod/`).

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withPath("production")
  .withAdapter("s3", { bucket: "app" })
  .build();
```

#### `withLogger(logger)`

Injects a logger for operational traces.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withLogger(console)
  .build();
```

#### `withTelemetry(telemetry)`

Enables telemetry event emission.

```typescript
const telemetry = IgniterTelemetry.create()
  .withService("api")
  .addEvents(IgniterStorageTelemetryEvents)
  .build();

const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withTelemetry(telemetry)
  .build();
```

#### `withMaxFileSize(bytes)`

Sets the maximum file size (in bytes) for uploads.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withMaxFileSize(10 * 1024 * 1024)
  .build();
```

#### `withAllowedMimeTypes(types)`

Restricts allowed MIME types.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withAllowedMimeTypes(["image/png", "image/jpeg"])
  .build();
```

#### `withAllowedExtensions(exts)`

Restricts allowed file extensions.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withAllowedExtensions(["png", "jpg", "jpeg"])
  .build();
```

#### `addScope(key, template)`

Registers a scope that can optionally require an identifier.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .addScope("user", "/users/[identifier]")
  .addScope("public", "/public")
  .build();
```

#### Hook registration

All hooks are optional and can be registered individually.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onUploadStarted(({ path }) => console.log("upload.start", path))
  .onUploadSuccess(({ file }) => console.log("upload.success", file.path))
  .onUploadError(({ path }, error) => console.error("upload.error", path, error))
  .onDeleteStarted(({ path }) => console.log("delete.start", path))
  .onDeleteSuccess(({ path }) => console.log("delete.success", path))
  .onDeleteError(({ path }, error) => console.error("delete.error", path, error))
  .onCopyStarted(({ from, to }) => console.log("copy.start", from, to))
  .onCopySuccess(({ from, to }) => console.log("copy.success", from, to))
  .onCopyError(({ from, to }, error) => console.error("copy.error", from, to, error))
  .onMoveStarted(({ from, to }) => console.log("move.start", from, to))
  .onMoveSuccess(({ from, to }) => console.log("move.success", from, to))
  .onMoveError(({ from, to }, error) => console.error("move.error", from, to, error))
  .build();
```

#### `build()`

Validates the configuration and returns an `IgniterStorageManager` instance.

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .build();
```

### Manager: `IgniterStorageManager`

#### `path(prefix)`

Returns a new manager with an appended path prefix.

```typescript
const images = storage.path("images");
await images.upload(file, "logo.png");
```

#### `scope(key, identifier?)`

Scopes to a pre-registered path template.

```typescript
const userDrive = storage.scope("user", "user_123");
await userDrive.upload(file, "avatar.png");
```

#### `get(pathOrUrl)`

Returns file metadata or `null` if missing.

```typescript
const file = await storage.get("public/logo.png");
if (file) console.log(file.url);
```

#### `list(prefix?)`

Lists files under a prefix or the current base path.

```typescript
const files = await storage.list("public/");
```

#### `upload(file, destination, options?)`

Uploads a `File`, `Blob`, or `Readable` stream. Content type is inferred.

```typescript
await storage.upload(file, "avatars/user.png", { replace: "BY_FILENAME" });
```

#### `uploadFromUrl(url, destination, options?)`

Fetches a URL and uploads it, using response content type if available.

```typescript
await storage.uploadFromUrl("https://example.com/hero.jpg", "public/hero.jpg");
```

#### `uploadFromBuffer(buffer, destination, options?)`

Uploads bytes and allows explicit `contentType`.

```typescript
await storage.uploadFromBuffer(Buffer.from("hello"), "docs/hello.txt", {
  contentType: "text/plain",
});
```

#### `uploadFromBase64(base64, destination, options?)`

Uploads a base64 payload.

```typescript
await storage.uploadFromBase64(base64String, "docs/file.txt", {
  contentType: "text/plain",
});
```

#### `delete(pathOrUrl)`

Deletes a file by path or full URL.

```typescript
await storage.delete("public/logo.png");
```

#### `stream(pathOrUrl)`

Returns a readable stream for a stored object.

```typescript
const stream = await storage.stream("public/video.mp4");
```

#### `copy(from, to)`

Copies an object if the adapter implements copy.

```typescript
const file = await storage.copy("public/logo.png", "public/logo-copy.png");
```

#### `move(from, to)`

Moves an object if the adapter implements move.

```typescript
const file = await storage.move("public/logo.png", "archive/logo.png");
```

---

## 🧾 Hook Payload Reference

Hook payloads are defined in `src/types/hooks.ts` and include detailed metadata for each operation.

### `IgniterStorageHookContext`

- `operation`: `"upload" | "delete" | "copy" | "move"`
- `path`: resolved storage key

### `IgniterStorageUploadHookPayload`

- `operation`: always `"upload"`
- `path`: resolved key
- `name`: filename without path
- `extension`: inferred or provided extension
- `contentType`: inferred or provided MIME type
- `size`: optional size in bytes
- `source`: optional info about origin (`file`, `url`, `buffer`, `base64`)

### `IgniterStorageUploadSuccessPayload`

Extends upload payload with:

- `file`: `IgniterStorageFile` metadata

---

## 🧪 Policy Reference

### `IgniterStoragePolicies`

| Policy | Type | Description |
| --- | --- | --- |
| `maxFileSize` | `number` | Max size in bytes (only enforced when size is known) |
| `allowedMimeTypes` | `readonly string[]` | Allowed MIME types |
| `allowedExtensions` | `readonly string[]` | Allowed file extensions (no dot) |

### Policy enforcement order

1. `maxFileSize`
2. `allowedMimeTypes`
3. `allowedExtensions`

---

## 🧵 Adapter Contract Reference

Adapters extend `IgniterStorageAdapter` and implement the following contract:

| Method | Required | Description |
| --- | --- | --- |
| `put(key, body, options)` | ✅ | Uploads an object |
| `delete(key)` | ✅ | Deletes an object |
| `list(prefix?)` | ✅ | Lists objects under a prefix |
| `exists(key)` | ✅ | Checks if an object exists |
| `stream(key)` | ✅ | Returns a readable stream |
| `copy(fromKey, toKey)` | optional | Copies an object |
| `move(fromKey, toKey)` | optional | Moves an object |

`IgniterStoragePutOptions` include:

- `contentType`: required
- `cacheControl`: optional
- `public`: optional

---

## 🔭 Telemetry Attributes Reference

All telemetry attributes use the `storage.*` namespace.

### Upload group

- `storage.path`
- `storage.size`
- `storage.content_type`
- `storage.method`
- `storage.url` (success)
- `storage.duration_ms`
- `storage.error.code` (error)
- `storage.error.message` (error)

### Get group

- `storage.path`
- `storage.found`
- `storage.size`
- `storage.content_type`
- `storage.duration_ms`
- `storage.error.code` (error)
- `storage.error.message` (error)

### List group

- `storage.prefix`
- `storage.count`
- `storage.duration_ms`
- `storage.error.code` (error)
- `storage.error.message` (error)

### Delete group

- `storage.path`
- `storage.duration_ms`
- `storage.error.code` (error)
- `storage.error.message` (error)

### Copy group

- `storage.from`
- `storage.to`
- `storage.duration_ms`
- `storage.error.code` (error)
- `storage.error.message` (error)

### Move group

- `storage.from`
- `storage.to`
- `storage.duration_ms`
- `storage.error.code` (error)
- `storage.error.message` (error)

### Stream group

- `storage.path`
- `storage.duration_ms`
- `storage.error.code` (error)
- `storage.error.message` (error)

---

## 🧯 Error Reference

All errors thrown by the package are instances of `IgniterStorageError` with structured `code`, `operation`, and `data`.

| Code | When it happens | Typical fix |
| --- | --- | --- |
| `IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED` | Missing adapter or base URL | Provide `.withAdapter(...)` and `.withUrl(...)` |
| `IGNITER_STORAGE_INVALID_SCOPE` | Unknown scope key | Register scope via `.addScope(...)` |
| `IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED` | Identifier missing | Provide the required identifier |
| `IGNITER_STORAGE_INVALID_PATH_HOST` | URL host mismatch | Use paths from same `baseUrl` |
| `IGNITER_STORAGE_FETCH_FAILED` | `uploadFromUrl` failed | Check network/URL accessibility |
| `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION` | Policy check failed | Adjust policy or file type |
| `IGNITER_STORAGE_UPLOAD_FAILED` | Adapter upload failed | Verify credentials and permissions |
| `IGNITER_STORAGE_DELETE_FAILED` | Adapter delete failed | Verify permissions |
| `IGNITER_STORAGE_LIST_FAILED` | Adapter list failed | Verify permissions |
| `IGNITER_STORAGE_STREAM_FAILED` | Adapter stream failed | Verify object existence |
| `IGNITER_STORAGE_GET_FAILED` | Adapter get failed | Verify path and permissions |
| `IGNITER_STORAGE_COPY_NOT_SUPPORTED` | Adapter lacks `copy` | Use supported adapter |
| `IGNITER_STORAGE_MOVE_NOT_SUPPORTED` | Adapter lacks `move` | Use supported adapter |
| `IGNITER_STORAGE_COPY_FAILED` | Copy failed | Verify permissions |
| `IGNITER_STORAGE_MOVE_FAILED` | Move failed | Verify permissions |
| `IGNITER_STORAGE_REPLACE_FAILED` | Replace strategy failed | Ensure list/delete permissions |

---

## ❓ FAQ

### Can I use this in the browser?

No. `@igniter-js/storage` is server-only and ships a browser shim that throws if imported client-side.

### Does `upload` accept Buffers?

Use `uploadFromBuffer` or `uploadFromBase64` for raw bytes. `upload` accepts `File`, `Blob`, or `Readable`.

### Do I need `baseUrl`?

Yes. The manager uses `baseUrl` to create public URLs and validate incoming absolute paths.

### How are extensions inferred?

The manager checks explicit content type (for URL/buffer/base64), then `Blob.type`, and finally MIME lookup based on filename.

---

## 📗 Cookbook (40 Recipes)

### Recipe 01: Single-file health check

```typescript
await storage.path("health").uploadFromBuffer(Buffer.from("ok"), "ping.txt", {
  contentType: "text/plain",
});
```

### Recipe 02: Environment-based base path

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withPath(process.env.NODE_ENV === "production" ? "prod" : "dev")
  .withAdapter("s3", { bucket: "app" })
  .build();
```

### Recipe 03: Scoped avatar uploads

```typescript
const userStorage = storage.scope("user", userId);
await userStorage.upload(file, "avatar.png", { replace: "BY_FILENAME" });
```

### Recipe 04: One-time public asset upload

```typescript
await storage.path("public").upload(file, "marketing/hero.jpg");
```

### Recipe 05: Upload generated report

```typescript
const pdf = await reportService.generate();
await storage.uploadFromBuffer(pdf, `reports/${id}.pdf`, {
  contentType: "application/pdf",
});
```

### Recipe 06: Mirror external assets

```typescript
await storage.path("mirrors").uploadFromUrl(remoteUrl, "logo.png");
```

### Recipe 07: Delete old artifacts

```typescript
const files = await storage.path("tmp").list();
await Promise.all(files.map((file) => storage.delete(file.path)));
```

### Recipe 08: Archive data after processing

```typescript
await storage.move("tmp/input.csv", "archive/processed/input.csv");
```

### Recipe 09: Copy shared templates

```typescript
await storage.copy("templates/base.pdf", "orgs/acme/base.pdf");
```

### Recipe 10: Nested folder composition

```typescript
const invoices = storage.path("orgs").path(orgId).path("invoices");
await invoices.upload(file, "jan.pdf");
```

### Recipe 11: Enforce image-only uploads

```typescript
const images = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withAllowedMimeTypes(["image/png", "image/jpeg", "image/webp"])
  .withAllowedExtensions(["png", "jpg", "jpeg", "webp"])
  .build();
```

### Recipe 12: Enforce PDF-only uploads

```typescript
const pdfs = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withAllowedMimeTypes(["application/pdf"])
  .withAllowedExtensions(["pdf"])
  .build();
```

### Recipe 13: Max file size policy

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withMaxFileSize(50 * 1024 * 1024)
  .build();
```

### Recipe 14: Upload stream (Node.js)

```typescript
import { createReadStream } from "node:fs";

const stream = createReadStream("./video.mp4");
await storage.upload(stream, "videos/video.mp4");
```

### Recipe 15: Stream file to response

```typescript
const stream = await storage.stream("videos/video.mp4");
stream.pipe(res);
```

### Recipe 16: Build a storage service module

```typescript
// src/services/storage.ts
export const storage = IgniterStorage.create()
  .withUrl(process.env.CDN_URL!)
  .withAdapter("s3", { bucket: process.env.S3_BUCKET })
  .addScope("user", "/users/[identifier]")
  .build();
```

### Recipe 17: Upload from URL with replacement

```typescript
await storage.uploadFromUrl(remoteUrl, "public/banner.png", {
  replace: "BY_FILENAME",
});
```

### Recipe 18: Replace only exact file

```typescript
await storage.upload(file, "logo.png", {
  replace: "BY_FILENAME_AND_EXTENSION",
});
```

### Recipe 19: Audit logs on upload success

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onUploadSuccess(({ file }) => audit.log("upload", file.path))
  .build();
```

### Recipe 20: Audit logs on delete success

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onDeleteSuccess(({ path }) => audit.log("delete", path))
  .build();
```

### Recipe 21: Metrics with telemetry

```typescript
const telemetry = IgniterTelemetry.create()
  .withService("api")
  .addEvents(IgniterStorageTelemetryEvents)
  .build();

const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withTelemetry(telemetry)
  .build();
```

### Recipe 22: Use logger for debugging

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withLogger(console)
  .build();
```

### Recipe 23: GCS credentials from Base64

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("google", {
    bucket: process.env.GCS_BUCKET,
    credentialsJsonBase64: process.env.GCS_CREDENTIALS_BASE64,
  })
  .build();
```

### Recipe 24: Use IgniterStorageEnv

```typescript
const env = IgniterStorageEnv.read();
const storage = IgniterStorage.create()
  .withUrl(env.url ?? "https://cdn.example.com")
  .withAdapter(env.adapter === "google" ? "google" : "s3", env.adapter === "google" ? env.google! : env.s3!)
  .build();
```

### Recipe 25: Test with MockStorageAdapter

```typescript
const mock = MockStorageAdapter.create();
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter(mock)
  .build();

await storage.uploadFromBuffer(Buffer.from("ok"), "ok.txt", {
  contentType: "text/plain",
});
```

### Recipe 26: Upload app assets by version

```typescript
const version = "v2.1.0";
await storage.path("assets").path(version).upload(file, "app.css");
```

### Recipe 27: Batch move for re-org

```typescript
const files = await storage.list("legacy/");
for (const file of files) {
  await storage.move(file.path, file.path.replace("legacy/", "archive/"));
}
```

### Recipe 28: Clean up by prefix

```typescript
const files = await storage.list("temp/");
await Promise.all(files.map((file) => storage.delete(file.path)));
```

### Recipe 29: Copy to backup location

```typescript
await storage.copy("reports/summary.pdf", "backup/reports/summary.pdf");
```

### Recipe 30: Use `.path()` for isolation

```typescript
const orgStorage = storage.path(`orgs/${orgId}`);
await orgStorage.upload(file, "logo.png");
```

### Recipe 31: Safe URL deletion

```typescript
await storage.delete("https://cdn.example.com/public/logo.png");
```

### Recipe 32: List under current base path

```typescript
const scoped = storage.path("public");
const files = await scoped.list();
```

### Recipe 33: Replace profile photo

```typescript
await storage.scope("user", userId).upload(file, "profile.png", {
  replace: "BY_FILENAME",
});
```

### Recipe 34: Serve a file in Express

```typescript
app.get("/files/:path", async (req, res) => {
  const stream = await storage.stream(req.params.path);
  stream.pipe(res);
});
```

### Recipe 35: Add scope without identifier

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .addScope("public", "/public")
  .build();

await storage.scope("public").upload(file, "logo.svg");
```

### Recipe 36: Prevent oversize uploads

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .withMaxFileSize(2 * 1024 * 1024)
  .build();
```

### Recipe 37: Cleanup on move

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .onMoveSuccess(({ to }) => cache.invalidate(to))
  .build();
```

### Recipe 38: Error handling by code

```typescript
try {
  await storage.copy("a.png", "b.png");
} catch (error) {
  if (IgniterStorageError.is(error) && error.code === "IGNITER_STORAGE_COPY_FAILED") {
    console.error("Copy failed", error.data);
  }
}
```

### Recipe 39: Upload with consistent cache control

```typescript
// Cache-Control is set automatically to "public, max-age=31536000"
await storage.upload(file, "assets/logo.svg");
```

### Recipe 40: Use `.scope()` with identifier placeholder

```typescript
const storage = IgniterStorage.create()
  .withUrl("https://cdn.example.com")
  .withAdapter("s3", { bucket: "app" })
  .addScope("org", "/orgs/[identifier]")
  .build();

await storage.scope("org", "acme").upload(file, "logo.png");
```

---

## 📌 Appendix: Example Index

1. Basic S3 setup
2. Basic GCS setup
3. Mock adapter setup
4. Upload File
5. Upload Blob
6. Upload Stream
7. Upload from URL
8. Upload from Buffer
9. Upload from Base64
10. Get metadata
11. List prefix
12. Delete file
13. Stream file
14. Copy file
15. Move file
16. Use scopes with identifiers
17. Use scopes without identifiers
18. Path chaining
19. Replace by filename
20. Replace by filename+extension
21. Policy: max size
22. Policy: allowed MIME
23. Policy: allowed extensions
24. Upload error handling
25. Delete error handling
26. Copy error handling
27. Move error handling
28. Hook: upload started
29. Hook: upload success
30. Hook: upload error
31. Hook: delete started
32. Hook: delete success
33. Hook: delete error
34. Hook: copy started
35. Hook: copy success
36. Hook: copy error
37. Hook: move started
38. Hook: move success
39. Hook: move error
40. Telemetry integration
41. Logger integration
42. Environment config
43. Base path per env
44. Multi-tenant with scope
45. Public assets bucket
46. Processing pipeline
47. Audit logging
48. CDN invalidation
49. Backup strategy
50. Health check upload
51. Per-tenant branding
52. User document storage
53. CSV import workflow
54. Export archive
55. Temporary workspace cleanup
56. Image resize hook
57. Video processing hook
58. PDF conversion hook
59. Batch delete by prefix
60. Asset mirroring
61. Multi-env config
62. Audit log integration
63. Metrics dashboards
64. Logger integration
65. Cache busting via move
66. Batch copy for migration
67. Scoped invoices
68. Scoped receipts
69. Scoped attachments
70. Scoped org documents
71. Scoped project files
72. Public assets path
73. Private admin path
74. Safe URL deletion
75. Safe URL get
76. Safe URL stream
77. Upload binary report
78. Upload HTML snapshot
79. Upload JSON export
80. Upload markdown export
81. Upload zip archive
82. Upload from data URL
83. Validate MIME policies
84. Validate extension policies
85. Validate size policies
86. Replace avatar by filename
87. Replace banner by extension
88. Replace asset by filename
89. Handle copy not supported
90. Handle move not supported
91. Handle policy violation
92. Handle upload failure
93. Handle delete failure
94. Handle list failure
95. Handle stream failure
96. Handle get failure
97. Handle replace failure
98. Adapter factory overrides
99. Adapter instance injection
100. Custom adapter skeleton
101. Readable stream piping
102. Buffer upload with explicit MIME
103. Base64 upload with explicit MIME
104. URL upload with inferred MIME
105. Compose basePath and scope
106. Compose basePath and path
107. Scope without identifier
108. Scope with identifier
109. Nested path chaining
110. Cross-tenant isolation
111. Shared asset library
112. Shared template copying
113. Migration dry-run
114. List by tenant
115. List by prefix
116. List root
117. Delete by URL
118. Delete by path
119. Copy by URL
120. Move by URL
121. Stream by URL
122. Get by URL
123. Use IgniterStorageEnv
124. Use withLogger
125. Use withTelemetry
126. Use withPath
127. Use withUrl
128. Use withAdapterFactories
129. Use withAdapter by key
130. Use withAdapter by instance
131. Add scope templates
132. Validate scope identifier requirement
133. Adapter list normalization
134. Adapter delete idempotence
135. Adapter stream behavior
136. Adapter copy behavior
137. Adapter move behavior
138. Telemetry upload metrics
139. Telemetry delete metrics
140. Telemetry list metrics
141. Telemetry stream metrics
142. Telemetry copy metrics
143. Telemetry move metrics
144. Telemetry get metrics
145. Hook ordering notes
146. Policy ordering notes
147. Cache control defaults
148. Public ACL defaults
149. CDN URL composition
150. Path normalization rules

---

## 🧰 Troubleshooting

### `IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED`

**Cause:** No adapter or base URL found.  
**Fix:** Provide `.withAdapter(...)` and `.withUrl(...)` or set env vars.

### `IGNITER_STORAGE_INVALID_SCOPE`

**Cause:** Scope key not registered.  
**Fix:** Add the scope with `.addScope(...)`.

### `IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED`

**Cause:** Scope requires identifier but you didn’t provide one.  
**Fix:** `storage.scope("user", id)`.

### `IGNITER_STORAGE_INVALID_PATH_HOST`

**Cause:** URL hostname doesn’t match `baseUrl`.  
**Fix:** Use same CDN host or pass relative path.

### `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`

**Cause:** Policy check failed.  
**Fix:** Adjust size/MIME/extension policies.

### `IGNITER_STORAGE_COPY_NOT_SUPPORTED`

**Cause:** Adapter doesn’t support copy.  
**Fix:** Use S3 or GCS adapters, or implement `copy` in custom adapter.

### `IGNITER_STORAGE_MOVE_NOT_SUPPORTED`

**Cause:** Adapter doesn’t support move.  
**Fix:** Use S3 or GCS adapters, or implement `move`.

---

## 🧩 Framework Integration

### Next.js (App Router)

```typescript
// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const result = await storage.upload(file, "uploads/file");
  return NextResponse.json({ url: result.url });
}
```

### Express

```typescript
app.post("/upload", async (req, res) => {
  const file = req.file;
  const stored = await storage.uploadFromBuffer(file.buffer, "uploads/file", {
    contentType: file.mimetype,
  });
  res.json({ url: stored.url });
});
```

### Fastify

```typescript
fastify.post("/upload", async (req, reply) => {
  const data = await req.file();
  const stored = await storage.uploadFromBuffer(await data.toBuffer(), "uploads/file", {
    contentType: data.mimetype,
  });
  return { url: stored.url };
});
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## 📄 License

MIT © [Felipe Barcelos](https://github.com/felipebarcelospro/igniter-js)

## 🔗 Related Packages

- [@igniter-js/telemetry](../telemetry)
- [@igniter-js/store](../store)
- [@igniter-js/mail](../mail)# @igniter-js/storage

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/storage.svg)](https://www.npmjs.com/package/@igniter-js/storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)