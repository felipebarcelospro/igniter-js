# Changelog

All notable changes to `@igniter-js/storage` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-13

### 🎉 Initial Release

First public release of `@igniter-js/storage` - a type-safe, adapter-based file storage library for Igniter.js applications.

### ✨ Features

#### Core Functionality
- **Type-Safe Storage API** - Full TypeScript support with end-to-end type inference
- **Adapter-Based Architecture** - Pluggable storage backends (S3, Google Cloud Storage, custom)
- **Builder Pattern** - Fluent API for storage initialization and configuration
- **Environment-First Configuration** - Configure via environment variables or builder

#### Storage Operations
- **Upload Methods**
  - `upload()` - Upload File, Blob, or Stream
  - `uploadFromUrl()` - Upload from remote URL
  - `uploadFromBuffer()` - Upload from Uint8Array or ArrayBuffer
  - `uploadFromBase64()` - Upload from base64 string
- **File Management**
  - `get()` - Retrieve file metadata
  - `delete()` - Delete files
  - `list()` - List files with prefix filtering
  - `stream()` - Stream large files
  - `copy()` - Copy files (adapter-dependent)
  - `move()` - Move files (adapter-dependent)

#### Advanced Features
- **Type-Safe Scopes** - Organize files with automatic path prefixing and type inference
- **Nested Paths** - Create sub-scopes with `.path()` method
- **Smart Upload Intelligence**
  - Automatic content-type inference from multiple sources
  - Automatic extension inference when missing
  - Destination accepts both relative paths and absolute URLs
- **Upload Policies**
  - Max file size enforcement
  - Allowed MIME types whitelist
  - Allowed extensions whitelist
- **Replace Strategies**
  - `BY_FILENAME_AND_EXTENSION` - Replace exact file
  - `BY_FILENAME` - Replace files with same basename (any extension)
- **Lifecycle Hooks**
  - `onUploadStarted`, `onUploadSuccess`, `onUploadError`
  - `onDeleteStarted`, `onDeleteSuccess`, `onDeleteError`
  - `onCopyStarted`, `onCopySuccess`, `onCopyError`
  - `onMoveStarted`, `onMoveSuccess`, `onMoveError`

#### Adapters
- **S3 Adapter** - Support for AWS S3, MinIO, Cloudflare R2, and S3-compatible services
- **Google Cloud Storage Adapter** - Full GCS support with service account authentication
- **Custom Adapter Interface** - Extend `IgniterStorageAdapter` for custom backends

#### Developer Experience
- **Comprehensive Error Handling** - Typed `IgniterStorageError` with stable error codes
- **Rich Type Definitions** - Complete TypeScript types for all APIs
- **Environment Variable Support** - Configure everything via env vars
- **Host Validation** - Prevent accidental cross-environment operations
- **Stream Support** - Handle large files efficiently

### 📦 Package Configuration
- ESM and CJS exports
- TypeScript declaration files
- Tree-shakeable exports
- Peer dependencies for adapters (optional)
- Source maps included

### 📚 Documentation
- Comprehensive README with examples
- API reference documentation
- Environment variable reference
- Best practices guide
- Error codes reference
- AGENTS.md for AI agent development

### 🧪 Testing
- Unit tests with in-memory adapter
- Type-safe test utilities
- Coverage for core business rules
- Test hooks lifecycle
- Test policy enforcement

---

## Future Releases

Planned features for upcoming versions:
- Azure Blob Storage adapter
- Cloudflare R2 direct upload support
- File metadata storage and retrieval
- Image transformation pipeline
- CDN integration helpers
- Signed URL generation
- Batch operations
- Progress tracking for uploads
- Resume interrupted uploads

---

[0.1.0]: https://github.com/felipebarcelospro/igniter-js/releases/tag/@igniter-js/storage@0.1.0
