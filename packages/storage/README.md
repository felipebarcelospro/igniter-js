# @igniter-js/storage

[![NPM Version](https://img.shields.io/npm/v/@igniter-js/storage.svg)](https://www.npmjs.com/package/@igniter-js/storage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe, adapter-based file storage library for Igniter.js applications. Upload, manage, and serve files from S3, Google Cloud Storage, or any custom backend with intelligent path composition, upload policies, and lifecycle hooks.

## Features

- ✅ **Type-Safe API** - Full TypeScript support with end-to-end type inference
- ✅ **Adapter-Based** - Pluggable backends (S3, Google Cloud Storage, custom)
- ✅ **Scoped Storage** - Organize files with type-safe scopes and nested paths
- ✅ **Smart Uploads** - Automatic content-type and extension inference
- ✅ **Upload Policies** - Enforce file size limits, allowed MIME types, and extensions
- ✅ **Lifecycle Hooks** - React to upload, delete, copy, and move operations
- ✅ **Replace Strategies** - Control file replacement behavior (by filename, by extension)
- ✅ **Environment-First** - Configure via environment variables or builder
- ✅ **URL Management** - Automatic public URL generation from base URL + key
- ✅ **Server-First** - Built for Node.js, Bun, Deno (no browser dependencies)

## Installation

```bash
# npm
npm install @igniter-js/storage

# pnpm
pnpm add @igniter-js/storage

# yarn
yarn add @igniter-js/storage

# bun
bun add @igniter-js/storage
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
import { IgniterStorageBuilder } from '@igniter-js/storage'
import { IgniterS3Adapter } from '@igniter-js/storage/adapters'

export const storage = IgniterStorageBuilder.create()
  .withUrl(process.env.STORAGE_URL!)
  .withPath(process.env.STORAGE_BASE_PATH || '/development')
  .withAdapter(
    IgniterS3Adapter.create({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      bucket: process.env.S3_BUCKET,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    })
  )
  .addScope('user', '/user/[identifier]')
  .addScope('public', '/public')
  .build()
```

### 2. Upload Files

```typescript
// Upload from URL
const file = await storage
  .scope('user', '123')
  .uploadFromUrl('https://example.com/avatar.png', 'avatar')

console.log(file.url) // https://cdn.example.com/development/user/123/avatar.png

// Upload from Buffer
const buffer = Buffer.from('Hello World')
await storage.scope('public').uploadFromBuffer(
  buffer,
  'hello.txt',
  { contentType: 'text/plain' }
)

// Upload File/Blob
await storage.scope('user', '123').upload(fileObject, 'documents/resume.pdf')
```

### 3. Retrieve Files

```typescript
// Check if file exists and get metadata
const file = await storage.scope('user', '123').get('avatar.png')

if (file) {
  console.log(file.url)        // Public URL
  console.log(file.path)       // Storage key
  console.log(file.name)       // avatar.png
  console.log(file.extension)  // png
  console.log(file.contentType) // image/png
}
```

### 4. Delete Files

```typescript
await storage.scope('user', '123').delete('avatar.png')
```

## Core Concepts

### Scopes

Scopes provide a convenient way to organize files with automatic path prefixing. Define scopes at initialization:

```typescript
const storage = IgniterStorageBuilder.create()
  .addScope('user', '/user/[identifier]')  // Requires identifier
  .addScope('public', '/public')            // No identifier needed
  .addScope('tenant', '/tenant/[identifier]/files')
  .build()
```

Use scopes at runtime:

```typescript
// With identifier (required for scopes with [identifier])
await storage.scope('user', '123').upload(file, 'avatar.png')
// → Uploads to: /development/user/123/avatar.png

// Without identifier (for public scopes)
await storage.scope('public').upload(file, 'logo.png')
// → Uploads to: /development/public/logo.png
```

### Nested Paths

Use `.path()` to create nested scopes:

```typescript
await storage
  .scope('user', '123')
  .path('/documents/invoices')
  .upload(file, 'invoice-2024-01.pdf')
// → Uploads to: /development/user/123/documents/invoices/invoice-2024-01.pdf
```

### Destination as URL

All methods accept either relative paths or absolute URLs. URLs must match the configured `baseUrl`:

```typescript
// Relative path
await storage.scope('user', '123').delete('avatar.png')

// Absolute URL (must match baseUrl)
await storage.scope('user', '123').delete(
  'https://cdn.example.com/development/user/123/avatar.png'
)
```

If the URL hostname differs from `baseUrl`, an error is thrown to prevent accidental cross-environment operations.

## Upload Intelligence

### Automatic Extension Inference

When the destination has no extension, the library infers it from:

1. Explicit `contentType` option
2. `Blob.type` or `File.type`
3. URL response `Content-Type` header (for `uploadFromUrl`)
4. Filename-based fallback

```typescript
// Destination: "avatar" (no extension)
// Content-Type: "image/png"
// Result: "avatar.png"
await storage.uploadFromUrl('https://example.com/photo.png', 'avatar')
```

### Content-Type Inference

Content-Type is inferred from:
1. Explicit `contentType` option
2. `Blob.type` or `File.type`
3. Filename extension
4. Fallback: `application/octet-stream`

## Upload Policies

Enforce file restrictions globally or per upload:

```typescript
const storage = IgniterStorageBuilder.create()
  .withMaxFileSize(5 * 1024 * 1024) // 5 MB
  .withAllowedMimeTypes(['image/png', 'image/jpeg'])
  .withAllowedExtensions(['png', 'jpg', 'jpeg'])
  .build()
```

Policy violations throw `IgniterStorageError` with code `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`.

## Replace Strategies

Control how uploads handle existing files:

```typescript
// Replace exact file (same name + extension)
await storage.upload(file, 'avatar.png', {
  replace: 'BY_FILENAME_AND_EXTENSION'
})

// Replace any file with same basename (any extension)
await storage.upload(file, 'avatar.png', {
  replace: 'BY_FILENAME'
})
// Deletes: avatar.jpg, avatar.png, avatar.webp
```

## Lifecycle Hooks

React to storage operations with hooks:

```typescript
const storage = IgniterStorageBuilder.create()
  .onUploadStarted(async (event) => {
    console.log('Uploading:', event.path)
  })
  .onUploadSuccess(async (event) => {
    console.log('Uploaded:', event.file.url)
    // Send webhook, update database, etc.
  })
  .onUploadError(async (event, error) => {
    console.error('Upload failed:', error)
  })
  .onDeleteSuccess(async (event) => {
    console.log('Deleted:', event.path)
  })
  .build()
```

Available hooks:
- `onUploadStarted`, `onUploadSuccess`, `onUploadError`
- `onDeleteStarted`, `onDeleteSuccess`, `onDeleteError`
- `onCopyStarted`, `onCopySuccess`, `onCopyError`
- `onMoveStarted`, `onMoveSuccess`, `onMoveError`

## API Reference

### IgniterStorage

Main storage client created by the builder.

#### Methods

##### `scope(key, identifier?)`

Creates a scoped storage client with automatic path prefixing.

```typescript
storage.scope('user', '123')
storage.scope('public')
```

##### `path(path)`

Creates a storage client with a custom path prefix.

```typescript
storage.path('/uploads/temp')
```

##### `get(pathOrUrl)`

Returns file metadata if exists, otherwise `null`.

```typescript
const file = await storage.get('avatar.png')
```

##### `upload(file, destination, options?)`

Uploads a File, Blob, or Stream.

```typescript
await storage.upload(fileObject, 'avatar.png', {
  replace: 'BY_FILENAME',
})
```

##### `uploadFromUrl(url, destination, options?)`

Uploads a file from a URL.

```typescript
await storage.uploadFromUrl('https://...', 'avatar.png')
```

##### `uploadFromBuffer(buffer, destination, options?)`

Uploads from a Uint8Array or ArrayBuffer.

```typescript
await storage.uploadFromBuffer(buffer, 'file.txt', {
  contentType: 'text/plain',
})
```

##### `uploadFromBase64(base64, destination, options?)`

Uploads from a base64 string.

```typescript
await storage.uploadFromBase64('data:image/png;base64,...', 'avatar.png')
```

##### `delete(pathOrUrl)`

Deletes a file.

```typescript
await storage.delete('avatar.png')
```

##### `list(prefix?)`

Lists files under a prefix.

```typescript
const files = await storage.list('user/123/')
```

##### `stream(pathOrUrl)`

Streams a file.

```typescript
const stream = await storage.stream('large-file.mp4')
```

##### `copy(from, to)`

Copies a file (if supported by adapter).

```typescript
await storage.copy('old-avatar.png', 'avatar-backup.png')
```

##### `move(from, to)`

Moves a file (if supported by adapter).

```typescript
await storage.move('temp/upload.png', 'final/avatar.png')
```

### IgniterStorageFile

Object returned by `get()`, `upload()`, `list()`, `copy()`, and `move()`.

```typescript
{
  path: string          // Storage key (e.g., "user/123/avatar.png")
  url: string           // Public URL (e.g., "https://cdn.example.com/...")
  name: string          // Filename (e.g., "avatar.png")
  extension: string     // Extension without dot (e.g., "png")
  contentType?: string  // MIME type (e.g., "image/png")
  size?: number         // File size in bytes
}
```

## Adapters

### S3 Adapter

Supports AWS S3, MinIO, Cloudflare R2, and any S3-compatible service.

```typescript
import { IgniterS3Adapter } from '@igniter-js/storage/adapters'

const adapter = IgniterS3Adapter.create({
  endpoint: 'https://s3.amazonaws.com',
  region: 'us-east-1',
  bucket: 'my-bucket',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
})
```

**Environment Variables:**
- `IGNITER_STORAGE_S3_ENDPOINT`
- `IGNITER_STORAGE_S3_REGION`
- `IGNITER_STORAGE_S3_BUCKET`
- `IGNITER_STORAGE_S3_ACCESS_KEY_ID`
- `IGNITER_STORAGE_S3_SECRET_ACCESS_KEY`

### Google Cloud Storage Adapter

```typescript
import { IgniterGoogleAdapter } from '@igniter-js/storage/adapters'

const adapter = IgniterGoogleAdapter.create({
  bucket: 'my-bucket',
  credentialsJson: process.env.GOOGLE_CREDENTIALS_JSON,
  // OR
  credentialsJsonBase64: process.env.GOOGLE_CREDENTIALS_BASE64,
})
```

**Environment Variables:**
- `IGNITER_STORAGE_GOOGLE_BUCKET`
- `IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON`
- `IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON_BASE64`

### Custom Adapter

Create your own adapter by extending `IgniterStorageAdapter`:

```typescript
import { IgniterStorageAdapter } from '@igniter-js/storage/adapters'

class MyCustomAdapter extends IgniterStorageAdapter {
  async put(key, body, options) {
    // Upload implementation
  }

  async delete(key) {
    // Delete implementation
  }

  async list(prefix?) {
    // List implementation
  }

  async exists(key) {
    // Exists check implementation
  }

  async stream(key) {
    // Stream implementation
  }
}
```

## Environment Configuration

All builder options can be configured via environment variables:

```bash
# Required
IGNITER_STORAGE_URL=https://cdn.example.com
IGNITER_STORAGE_ADAPTER=s3  # or "google"

# Optional
IGNITER_STORAGE_BASE_PATH=/development

# Policies
IGNITER_STORAGE_MAX_FILE_SIZE=5242880  # bytes
IGNITER_STORAGE_ALLOWED_MIME_TYPES=image/png,image/jpeg
IGNITER_STORAGE_ALLOWED_EXTENSIONS=png,jpg,jpeg

# S3-specific
IGNITER_STORAGE_S3_ENDPOINT=https://s3.amazonaws.com
IGNITER_STORAGE_S3_REGION=us-east-1
IGNITER_STORAGE_S3_BUCKET=my-bucket
IGNITER_STORAGE_S3_ACCESS_KEY_ID=...
IGNITER_STORAGE_S3_SECRET_ACCESS_KEY=...

# Google-specific
IGNITER_STORAGE_GOOGLE_BUCKET=my-bucket
IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON_BASE64=eyJ0eXBlIjoi...
```

Builder options override environment variables.

## Error Handling

All predictable errors throw `IgniterStorageError` with a stable `code`:

```typescript
try {
  await storage.upload(file, 'avatar.png')
} catch (error) {
  if (error instanceof IgniterStorageError) {
    console.error('Code:', error.code)
    console.error('Operation:', error.operation)
    console.error('Data:', error.data)
  }
}
```

**Common Error Codes:**
- `IGNITER_STORAGE_INVALID_SCOPE`
- `IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED`
- `IGNITER_STORAGE_INVALID_PATH_HOST`
- `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`
- `IGNITER_STORAGE_UPLOAD_FAILED`
- `IGNITER_STORAGE_DELETE_FAILED`
- `IGNITER_STORAGE_GET_FAILED`
- `IGNITER_STORAGE_LIST_FAILED`
- `IGNITER_STORAGE_COPY_NOT_SUPPORTED`
- `IGNITER_STORAGE_MOVE_NOT_SUPPORTED`

## TypeScript Support

Full TypeScript support with type-safe scopes:

```typescript
const storage = IgniterStorageBuilder.create()
  .addScope('user', '/user/[identifier]')
  .addScope('public', '/public')
  .build()

// ✅ TypeScript knows 'user' requires identifier
storage.scope('user', '123')

// ❌ TypeScript error: identifier required
storage.scope('user')

// ✅ TypeScript knows 'public' doesn't require identifier
storage.scope('public')
```

## Best Practices

1. **Use Scopes** - Organize files logically with scopes instead of manual path composition
2. **Configure via Environment** - Use environment variables for credentials and config
3. **Enforce Policies** - Set upload policies to prevent malicious or oversized files
4. **Use Hooks** - React to storage operations for webhooks, analytics, logging
5. **Handle Errors** - Always catch and handle `IgniterStorageError`
6. **Leverage Intelligence** - Let the library infer content-types and extensions
7. **Replace Strategically** - Use `BY_FILENAME` to clean up old versions with different extensions

## Examples

### Upload User Avatar with Replacement

```typescript
async function updateUserAvatar(userId: string, imageUrl: string) {
  const file = await storage
    .scope('user', userId)
    .uploadFromUrl(imageUrl, 'avatar', {
      replace: 'BY_FILENAME', // Delete old avatars with any extension
    })

  return file.url
}
```

### List User Documents

```typescript
async function getUserDocuments(userId: string) {
  const files = await storage
    .scope('user', userId)
    .path('/documents')
    .list()

  return files.map(f => ({
    name: f.name,
    url: f.url,
    size: f.size,
  }))
}
```

### Temporary Uploads with Cleanup

```typescript
async function processTemporaryUpload(file: File) {
  const tempFile = await storage
    .path('/temp')
    .upload(file, `${Date.now()}-${file.name}`)

  try {
    // Process file...
    await processFile(tempFile.path)
  } finally {
    // Clean up
    await storage.delete(tempFile.path)
  }
}
```

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](https://github.com/felipebarcelospro/igniter-js/blob/main/CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](https://github.com/felipebarcelospro/igniter-js/blob/main/LICENSE) for details.

## Links

- **Documentation:** https://igniterjs.com/docs/storage
- **GitHub:** https://github.com/felipebarcelospro/igniter-js
- **NPM:** https://www.npmjs.com/package/@igniter-js/storage
- **Issues:** https://github.com/felipebarcelospro/igniter-js/issues
