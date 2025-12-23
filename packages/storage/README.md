# @igniter-js/storage

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/storage.svg)](https://www.npmjs.com/package/@igniter-js/storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe, adapter-based file storage library for Igniter.js applications. Upload, manage, and serve files from S3, Google Cloud Storage, or any custom backend with intelligent path composition, upload policies, and lifecycle hooks.

## Features

- ✅ **Type-Safe API** - Full TypeScript support with end-to-end type inference for scopes
- ✅ **Adapter-Based** - Pluggable backends (S3, Google Cloud Storage, custom)
- ✅ **Scoped Storage** - Organize files with type-safe scopes and nested paths
- ✅ **Smart Uploads** - Automatic content-type and extension inference
- ✅ **Upload Policies** - Enforce file size limits, allowed MIME types, and extensions
- ✅ **Lifecycle Hooks** - React to upload, delete, copy, and move operations
- ✅ **Telemetry** - Optional integration with `@igniter-js/telemetry`
- ✅ **Replace Strategies** - Control file replacement behavior (by filename, by extension)
- ✅ **Environment-First** - Configure via environment variables or builder
- ✅ **Server-First** - Built for Node.js, Bun, Deno (no browser dependencies)

## Installation

```bash
# npm
npm install @igniter-js/storage @igniter-js/core

# pnpm
pnpm add @igniter-js/storage @igniter-js/core

# yarn
yarn add @igniter-js/storage @igniter-js/core

# bun
bun add @igniter-js/storage @igniter-js/core
```

Optional dependencies:

```bash
# Telemetry (optional)
npm install @igniter-js/telemetry
```

### Adapter Dependencies

Install the adapter you need:

**AWS S3 / S3-Compatible (MinIO, R2, etc.):**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

**Google Cloud Storage:**

```bash
npm install @google-cloud/storage
```

## Quick Start

### 1. Initialize Storage

Create a storage instance with your chosen adapter:

```typescript
import { IgniterStorage } from "@igniter-js/storage";
import { IgniterS3Adapter } from "@igniter-js/storage/adapters";

export const storage = IgniterStorage.create()
  .withUrl(process.env.STORAGE_URL!)
  .withPath(process.env.STORAGE_BASE_PATH || "/development")
  .withAdapter(
    IgniterS3Adapter.create({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      bucket: process.env.S3_BUCKET,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    }),
  )
  .addScope("user", "/user/[identifier]")
  .addScope("public", "/public")
  .build();
```

### 2. Upload Files

```typescript
// Upload from URL
const file = await storage
  .scope("user", "123")
  .uploadFromUrl("https://example.com/avatar.png", "avatar");

console.log(file.url); // https://cdn.example.com/development/user/123/avatar.png

// Upload from Buffer
const buffer = Buffer.from("Hello World");
await storage
  .scope("public")
  .uploadFromBuffer(buffer, "hello.txt", { contentType: "text/plain" });

// Upload File/Blob
await storage.scope("user", "123").upload(fileObject, "documents/resume.pdf");
```

### 3. Retrieve Files

```typescript
// Check if file exists and get metadata
const file = await storage.scope("user", "123").get("avatar.png");

if (file) {
  console.log(file.url); // Public URL
  console.log(file.path); // Storage key
  console.log(file.name); // avatar.png
  console.log(file.extension); // png
  console.log(file.contentType); // image/png
}
```

### 4. Delete Files

```typescript
await storage.scope("user", "123").delete("avatar.png");
```

## Core Concepts

### Scopes & Type Safety

Scopes provide a convenient way to organize files. When you define scopes using `addScope`, the library infers the types, ensuring you can only use valid scope keys and that you provide identifiers when required.

```typescript
const storage = IgniterStorage.create()
  .addScope("user", "/user/[identifier]") // Requires identifier
  .addScope("public", "/public") // No identifier needed
  .build();

// ✅ Valid:
storage.scope("user", "123");
storage.scope("public");

// ❌ TypeScript Errors:
storage.scope("user"); // Error: Expected 2 arguments
storage.scope("admin"); // Error: Argument of type '"admin"' is not assignable...
```

### Nested Paths

Use `.path()` to create nested scopes:

```typescript
await storage
  .scope("user", "123")
  .path("/documents/invoices")
  .upload(file, "invoice-2024-01.pdf");
// → Uploads to: /development/user/123/documents/invoices/invoice-2024-01.pdf
```

### Telemetry Integration

The library integrates seamlessly with `@igniter-js/telemetry`.

```typescript
import { IgniterTelemetry } from "@igniter-js/telemetry";
import { IgniterStorageTelemetryEvents } from "@igniter-js/storage/telemetry";

const telemetry = IgniterTelemetry.create()
  .withService("my-api")
  .addEvents(IgniterStorageTelemetryEvents)
  .build();

const storage = IgniterStorage.create()
  .withTelemetry(telemetry)
  // ...
  .build();
```

Events emitted (examples):

- `igniter.storage.upload.started`
- `igniter.storage.upload.success`
- `igniter.storage.upload.error`
- `igniter.storage.delete.started`
- `igniter.storage.delete.success`
- `igniter.storage.delete.error`
- `igniter.storage.get.started`
- `igniter.storage.get.success`
- `igniter.storage.get.error`

Attributes follow the `storage.*` naming convention (for example: `storage.path`, `storage.duration_ms`).

### Upload Intelligence

When the destination has no extension, the library infers it from:

1. Explicit `contentType` option
2. `Blob.type` or `File.type`
3. URL response `Content-Type` header (for `uploadFromUrl`)
4. Filename-based fallback

### Upload Policies

Enforce file restrictions globally or per upload:

```typescript
const storage = IgniterStorage.create()
  .withMaxFileSize(5 * 1024 * 1024) // 5 MB
  .withAllowedMimeTypes(["image/png", "image/jpeg"])
  .withAllowedExtensions(["png", "jpg", "jpeg"])
  .build();
```

### Replace Strategies

Control how uploads handle existing files:

```typescript
// Replace exact file (same name + extension)
await storage.upload(file, "avatar.png", {
  replace: "BY_FILENAME_AND_EXTENSION",
});

// Replace any file with same basename (any extension)
await storage.upload(file, "avatar.png", {
  replace: "BY_FILENAME",
});
// Deletes: avatar.jpg, avatar.png, avatar.webp
```

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE) for details.
