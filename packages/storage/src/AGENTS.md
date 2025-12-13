# Context for the Feature: Storage (`@igniter-js/storage`)

This folder is intentionally structured to be extracted into a standalone open-source package in the Igniter.js ecosystem.

## Goal
Provide a **server-first**, **adapter-based** storage library with:
- A small public surface (`IgniterStorage`, `IgniterStorageBuilder`)
- Infra-only adapters (S3, Google Cloud Storage)
- Business rules centralized in `IgniterStorageCore`
- Type-safe scopes + flexible path composition
- Intelligent upload behavior (content-type + extension inference, replace strategies)

## Folder Structure
- `index.ts`: Public exports.
- `igniter-storage.ts`: Public runtime classes (`IgniterStorage`, `IgniterStorageScoped`).
- `builder/igniter-storage.builder.ts`: Developer-facing initialization builder.
- `core/igniter-storage.core.ts`: Central business rules + orchestration.
- `adapters/`
  - `igniter-storage.adapter.ts`: Abstract base adapter (infra-only contract).
  - `s3.adapter.ts`: S3-compatible adapter implementation.
  - `google-cloud.adapter.ts`: Google Cloud Storage adapter implementation.
- `errors/igniter-storage.error.ts`: Typed error model and codes.
- `types/`: Public types used by consumers and internal layers.
- `utils/`: Pure helpers for paths, URLs, MIME inference, env parsing.

## Core Responsibilities
### `IgniterStorageCore` (ALL business rules)
`IgniterStorageCore` is the only place that should implement rules such as:
- Base URL + base path normalization
- Accepting destination as **relative path** or **absolute URL**
- Host validation for URL paths
- Policy enforcement (max file size, allowed mime types, allowed extensions)
- Hooks lifecycle
- Replace behavior (by filename, or filename+extension)
- Content type inference and extension inference

Key invariants enforced by the core:
- All destination inputs are normalized to a **storage key** (a slash-separated string without a leading `/`).
- `basePath` is always prefixed first (e.g. `/development` + `public/a.png` -> `development/public/a.png`).
- Returned `IgniterStorageFile.path` is **always the key**, never a URL.
- Returned `IgniterStorageFile.url` is always computed from `baseUrl + key`.
- All predictable failures should throw `IgniterStorageError` (stable `code`).

### `IgniterStorageAdapter` (infra-only)
Adapters must:
- Operate exclusively on **fully resolved object keys**
- NOT implement scopes, policies, hooks, inference, or URL logic
- Provide `put/delete/list/exists/stream` and optionally `copy/move`

A good mental model is:
- **Core** decides *what* should happen and *which key* should be used.
- **Adapter** executes *how* to talk to a backend.

## Public API
### Initialization (Builder)
`IgniterStorageBuilder` is the primary entry point.

Typical usage:
- Configure base URL and base path
- Configure adapter (instance or key+credentials)
- Register scopes
- Configure hooks and policies

Example:
```ts
import { IgniterStorageBuilder } from '@igniter-js/storage'
import { IgniterS3Adapter } from '@igniter-js/storage/adapters'

const storage = IgniterStorageBuilder.create()
  .withUrl(process.env.IGNITER_STORAGE_URL!)
  .withPath(process.env.IGNITER_STORAGE_BASE_PATH || '/development')
  .withAdapter(IgniterS3Adapter.create({
    endpoint: process.env.IGNITER_STORAGE_S3_ENDPOINT,
    region: process.env.IGNITER_STORAGE_S3_REGION,
    bucket: process.env.IGNITER_STORAGE_S3_BUCKET,
    accessKeyId: process.env.IGNITER_STORAGE_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.IGNITER_STORAGE_S3_SECRET_ACCESS_KEY,
  }))
  .addScope('user', '/user/[identifier]')
  .addScope('public', '/public')
  .withMaxFileSize(5 * 1024 * 1024)
  .withAllowedMimeTypes(['image/png', 'image/jpeg'])
  .build()
```

### Scopes
Scopes provide a convenient way to prefix operations:
- `addScope('user', '/user/[identifier]')` requires identifier
- `addScope('public', '/public')` makes identifier optional

Runtime usage:
```ts
await storage.scope('user', '123').uploadFromUrl('https://example.com/a.png', 'avatar')
await storage.scope('public').uploadFromUrl('https://example.com/a.png', 'images/avatar')
```

### Nested paths
`IgniterStorageScoped.path()` creates sub-scopes:
```ts
await storage.scope('user', '123').path('/videos').uploadFromUrl('https://...', 'profile')
```

Important detail:
- `.path()` only affects how the final destination string is composed.
- The core is still responsible for validating/normalizing the final destination.

### Destination as URL (host validation)
Every method that receives a path can also accept an absolute URL.

Rule:
- If the URL hostname differs from the configured `baseUrl`, a typed error is thrown (`IGNITER_STORAGE_INVALID_PATH_HOST`).

This prevents accidentally mixing environments/CDNs.

Notes for maintainers:
- Host validation is performed by `utils/url.ts` (`stripBaseUrlOrThrow`).
- The thrown error uses `code: IGNITER_STORAGE_INVALID_PATH_HOST` and `operation: path`.
- This is intentionally strict: even if the path portion matches, a different host is rejected.

### Upload intelligence
All upload methods accept a **destination string** (path-like), not a complex object.

Rules:
- If the destination has an extension (e.g. `profile.png`), it is respected.
- If the destination has no extension (e.g. `profile`), core tries to infer extension from the effective content type.

Inference sources (in order):
- Explicit content type provided by helpers (`uploadFromBuffer({ contentType })`, `uploadFromUrl()` response header)
- `Blob.type` (when uploading `Blob`/`File`)
- Filename-based fallback (`utils/mime.ts`)

### Replace strategies
Upload supports:
- `replace: 'BY_FILENAME_AND_EXTENSION'` (exact key)
- `replace: 'BY_FILENAME'` (same basename, any extension under the same folder)

Example:
```ts
await storage.scope('user', '123').path('/videos').uploadFromUrl(
  'https://.../profile.png',
  'profile',
  { replace: 'BY_FILENAME' },
)
```

Implementation detail:
- `BY_FILENAME_AND_EXTENSION`: calls `adapter.delete(exactKey)`.
- `BY_FILENAME`: lists the directory prefix and deletes all keys where the basename (without extension) matches.
- This is a convenience feature. Some backends may have eventual consistency; adapters should remain infra-only.

### get() replaces url() + exists()
Instead of maintaining separate `url()` and `exists()` methods, use:
- `get(pathOrUrl) -> IgniterStorageFile | null`

## Environment Variables (Fallbacks)
All config can be supplied via the builder, but the builder also supports env fallbacks using `IGNITER_STORAGE_` prefix.

Common:
- `IGNITER_STORAGE_URL`
- `IGNITER_STORAGE_BASE_PATH`
- `IGNITER_STORAGE_ADAPTER` (`s3` | `google`)

Policies:
- `IGNITER_STORAGE_MAX_FILE_SIZE`
- `IGNITER_STORAGE_ALLOWED_MIME_TYPES` (comma-separated)
- `IGNITER_STORAGE_ALLOWED_EXTENSIONS` (comma-separated)

Adapter credentials (examples):
- S3:
  - `IGNITER_STORAGE_S3_ENDPOINT`
  - `IGNITER_STORAGE_S3_REGION`
  - `IGNITER_STORAGE_S3_BUCKET`
  - `IGNITER_STORAGE_S3_ACCESS_KEY_ID`
  - `IGNITER_STORAGE_S3_SECRET_ACCESS_KEY`
- Google:
  - `IGNITER_STORAGE_GOOGLE_BUCKET`
  - `IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON`
  - `IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON_BASE64`

## Error Model
All predictable failures should throw `IgniterStorageError` with a stable `code`.

Key codes:
- `IGNITER_STORAGE_INVALID_SCOPE`
- `IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED`
- `IGNITER_STORAGE_INVALID_PATH_HOST`
- `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`
- `IGNITER_STORAGE_UPLOAD_FAILED`

Operations (for debugging):
- `scope`, `path`, `get`, `upload`, `delete`, `list`, `stream`, `copy`, `move`

## Testing
Unit tests live alongside this module:
- `igniter-storage.spec.ts`

The tests use a small in-memory adapter to validate:
- `get()` behavior
- basePath prefixing
- URL hostname validation
- scope + nested path composition
- extension inference
- replace strategies

Additional scenarios covered:
- Env fallbacks (`IGNITER_STORAGE_URL`, `IGNITER_STORAGE_BASE_PATH`, policies)
- Policy violations (`IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`)
- Hook lifecycle (started/success)
- `uploadFromUrl()` fetch integration + extension inference from response `content-type`

Run tests (non-watch):
- `bunx vitest run src/@saas-boilerplate/providers/storage/igniter-storage.spec.ts`

## Adding a New Adapter
1. Create a new file in `adapters/`.
2. Extend `IgniterStorageAdapter`.
3. Implement required methods.
4. Export a factory object `{ create(credentials) }` to keep API consistent.
5. Register a factory in `IgniterStorageBuilder.create()` (optional default).
6. Add/extend tests if behavior needs coverage.

Adapter authoring checklist:
- Never assume leading `/` in keys. Always normalize.
- Avoid “smart” behavior (no policies/scopes/host validation) in adapters.
- If the backend supports ACL/public access, honor `IgniterStoragePutOptions.public` best-effort.
- Keep `list(prefix)` consistent: return keys that start with the prefix.

## Non-Goals (by design)
- No business rules in adapters.
- No implicit multi-tenancy logic in storage itself (that stays in the consumer app).
- No dependency on browser-only APIs (server-first).

## Quick Commands
- Run storage tests: `bunx vitest run src/@saas-boilerplate/providers/storage/igniter-storage.spec.ts`
