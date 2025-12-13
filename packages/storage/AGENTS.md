# @igniter-js/storage - AI Agent Instructions

> **Package Version:** 0.1.0  
> **Last Updated:** 2025-01-13  
> **Status:** Ready for Publication

---

## Package Overview

**Name:** `@igniter-js/storage`  
**Purpose:** Type-safe, adapter-based file storage library for Igniter.js applications  
**Type:** Standalone Library (can be used independently or with Igniter.js)

### Core Features
- Server-first file storage with pluggable adapters (S3, Google Cloud Storage, custom)
- Type-safe scopes with automatic path composition
- Intelligent upload behavior (content-type + extension inference)
- Upload policies (file size, MIME types, extensions)
- Lifecycle hooks for storage operations
- Replace strategies (by filename, by filename + extension)
- Environment-first configuration

---

## Architecture

### Design Principles

1. **Business Rules in Core, Infrastructure in Adapters**
   - `IgniterStorageCore` contains ALL business logic
   - Adapters are infrastructure-only (no scopes, policies, hooks, or inference)
   - Adapters operate on fully resolved object keys

2. **Type Safety First**
   - End-to-end TypeScript inference
   - Type-safe scopes with identifier requirements
   - No `any` types in public APIs

3. **Adapter-Based Architecture**
   - Core defines interfaces, adapters provide implementations
   - Easy to add new storage backends
   - Adapters are peer dependencies (optional)

4. **Server-First**
   - Node.js, Bun, Deno compatible
   - No browser-only APIs
   - Stream support for large files

---

## File Structure

```
packages/storage/
├── src/
│   ├── index.ts                         # Public exports
│   ├── igniter-storage.ts              # Public runtime classes
│   ├── igniter-storage.spec.ts         # Unit tests
│   │
│   ├── builder/
│   │   └── igniter-storage.builder.ts  # Developer-facing builder
│   │
│   ├── core/
│   │   └── igniter-storage.core.ts     # Business rules + orchestration
│   │
│   ├── adapters/
│   │   ├── index.ts                    # Adapter exports
│   │   ├── igniter-storage.adapter.ts  # Abstract base adapter
│   │   ├── s3.adapter.ts               # S3-compatible adapter
│   │   └── google-cloud.adapter.ts     # Google Cloud Storage adapter
│   │
│   ├── errors/
│   │   └── igniter-storage.error.ts    # Typed error model
│   │
│   ├── types/
│   │   ├── file.ts                     # IgniterStorageFile type
│   │   ├── hooks.ts                    # Hook types
│   │   ├── policies.ts                 # Policy types
│   │   ├── replace.ts                  # Replace strategy types
│   │   └── scopes.ts                   # Scope definition types
│   │
│   └── utils/
│       ├── env.ts                      # Environment variable parsing
│       ├── mime.ts                     # MIME type inference
│       ├── path.ts                     # Path manipulation utilities
│       ├── url.ts                      # URL utilities
│       └── try-catch.ts                # Error handling utility
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── AGENTS.md                            # This file
└── CHANGELOG.md
```

---

## Key Responsibilities

### `IgniterStorageCore` (ALL business rules)

The core is the **only** place that implements:
- Base URL + base path normalization
- Path resolution (relative path or absolute URL)
- Host validation for URL paths
- Policy enforcement (max file size, allowed MIME types, allowed extensions)
- Hooks lifecycle (upload/delete/copy/move started/success/error)
- Replace behavior (by filename, or filename+extension)
- Content-type inference (from explicit option, Blob.type, URL response, filename)
- Extension inference (from content-type, Blob.type, filename)

**Key Invariants:**
- All destination inputs are normalized to a **storage key** (slash-separated, no leading `/`)
- `basePath` is always prefixed first (e.g., `/development` + `public/a.png` → `development/public/a.png`)
- Returned `IgniterStorageFile.path` is **always the key**, never a URL
- Returned `IgniterStorageFile.url` is always computed from `baseUrl + key`
- All predictable failures throw `IgniterStorageError` with a stable `code`

### `IgniterStorageAdapter` (infrastructure-only)

Adapters **must**:
- Operate exclusively on **fully resolved object keys**
- NOT implement scopes, policies, hooks, inference, or URL logic
- Provide `put`, `delete`, `list`, `exists`, `stream`
- Optionally provide `copy`, `move`

**Mental Model:**
- **Core** decides *what* should happen and *which key* to use
- **Adapter** executes *how* to talk to the backend

---

## Development Guidelines

### Adding New Features

1. **Business Logic → Core**
   - If it's a rule or decision, it belongs in `IgniterStorageCore`
   - Examples: validation, transformation, policy enforcement

2. **Infrastructure Logic → Adapter**
   - If it's backend-specific, it belongs in the adapter
   - Examples: API calls, authentication, error mapping

3. **Public API → Builder or Storage Classes**
   - If users need to configure it, add to `IgniterStorageBuilder`
   - If users need to call it at runtime, add to `IgniterStorage` or `IgniterStorageScoped`

### Testing Strategy

**Unit Tests** (`igniter-storage.spec.ts`):
- Use `InMemoryAdapter` for isolated core testing
- Test all business rules without real backend calls
- Test error scenarios (policy violations, host mismatches, etc.)
- Test hooks lifecycle

**Integration Tests** (future):
- Test real adapters against LocalStack (S3) or test buckets
- Test stream uploads and large files
- Test concurrent operations

**Type Tests** (future):
- Verify scope identifier type inference
- Verify builder fluent API type safety

### Code Style

- Follow ESLint rules (`npm run lint`)
- Use JSDoc comments for public APIs (in English)
- Prefer explicit types over inference in public APIs
- Use `readonly` for immutable properties
- Use `async/await` over raw Promises

### Error Handling

- All predictable errors must throw `IgniterStorageError`
- Use stable error codes (e.g., `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION`)
- Include relevant context in `error.data`
- Specify `operation` for debugging

### Commit Messages

Follow Conventional Commits:
```
feat(storage): add Google Cloud Storage adapter
fix(storage): handle undefined extension in inference
docs(storage): update README with environment variables
test(storage): add tests for replace strategies
```

---

## Adding a New Adapter

1. Create new file in `src/adapters/` (e.g., `azure.adapter.ts`)
2. Extend `IgniterStorageAdapter`
3. Implement required methods (`put`, `delete`, `list`, `exists`, `stream`)
4. Optionally implement `copy`, `move`
5. Export a factory object: `{ create(credentials) }`
6. Add adapter to `src/adapters/index.ts` exports
7. Register factory in `IgniterStorageBuilder` (optional default)
8. Add tests for adapter-specific behavior
9. Update README with adapter documentation

**Adapter Checklist:**
- ✅ Never assume leading `/` in keys (use `normalizeKey()`)
- ✅ No "smart" behavior (no policies/scopes/host validation)
- ✅ Honor `IgniterStoragePutOptions.public` best-effort
- ✅ Return keys from `list()` that start with prefix
- ✅ Handle streams properly in `put()` and `stream()`

---

## Common Tasks

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Run specific test file
npm run test -- igniter-storage.spec.ts
```

### Building

```bash
# Build once
npm run build

# Build and watch
npm run dev
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

---

## Environment Variables

The package supports environment-first configuration. All builder options can be set via env vars with `IGNITER_STORAGE_` prefix.

**Common:**
- `IGNITER_STORAGE_URL` - Public base URL (CDN)
- `IGNITER_STORAGE_BASE_PATH` - Base path prefix (e.g., `/development`)
- `IGNITER_STORAGE_ADAPTER` - Adapter key (`s3` | `google`)

**Policies:**
- `IGNITER_STORAGE_MAX_FILE_SIZE` - Max file size in bytes
- `IGNITER_STORAGE_ALLOWED_MIME_TYPES` - Comma-separated MIME types
- `IGNITER_STORAGE_ALLOWED_EXTENSIONS` - Comma-separated extensions

**S3:**
- `IGNITER_STORAGE_S3_ENDPOINT`
- `IGNITER_STORAGE_S3_REGION`
- `IGNITER_STORAGE_S3_BUCKET`
- `IGNITER_STORAGE_S3_ACCESS_KEY_ID`
- `IGNITER_STORAGE_S3_SECRET_ACCESS_KEY`

**Google:**
- `IGNITER_STORAGE_GOOGLE_BUCKET`
- `IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON`
- `IGNITER_STORAGE_GOOGLE_CREDENTIALS_JSON_BASE64`

---

## Publishing Workflow

### Pre-Publish Checklist

- [ ] All tests passing (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] README.md is up-to-date
- [ ] CHANGELOG.md is updated with version changes
- [ ] Version in `package.json` is correct
- [ ] All exports in `src/index.ts` are correct

### Version Update Process

**NEVER update version without user approval.**

When changes are ready:
1. Review changes made
2. Suggest version bump options (patch/minor/major)
3. Wait for user approval
4. Update `package.json` version
5. Update `CHANGELOG.md`
6. Run quality checks
7. Ask about publishing

### Publishing

```bash
# Login to npm (if not already)
npm login

# Publish (from package directory)
cd packages/storage
npm publish --access public
```

---

## Error Codes Reference

| Code | Operation | Reason |
|------|-----------|--------|
| `IGNITER_STORAGE_INVALID_SCOPE` | `scope` | Unknown scope key |
| `IGNITER_STORAGE_SCOPE_IDENTIFIER_REQUIRED` | `scope` | Scope requires identifier but none provided |
| `IGNITER_STORAGE_INVALID_PATH_HOST` | `path` | URL hostname differs from baseUrl |
| `IGNITER_STORAGE_UPLOAD_POLICY_VIOLATION` | `upload` | File violates upload policies |
| `IGNITER_STORAGE_UPLOAD_FAILED` | `upload` | Upload operation failed |
| `IGNITER_STORAGE_DELETE_FAILED` | `delete` | Delete operation failed |
| `IGNITER_STORAGE_GET_FAILED` | `get` | Get operation failed |
| `IGNITER_STORAGE_LIST_FAILED` | `list` | List operation failed |
| `IGNITER_STORAGE_STREAM_FAILED` | `stream` | Stream operation failed |
| `IGNITER_STORAGE_COPY_NOT_SUPPORTED` | `copy` | Adapter doesn't support copy |
| `IGNITER_STORAGE_COPY_FAILED` | `copy` | Copy operation failed |
| `IGNITER_STORAGE_MOVE_NOT_SUPPORTED` | `move` | Adapter doesn't support move |
| `IGNITER_STORAGE_MOVE_FAILED` | `move` | Move operation failed |
| `IGNITER_STORAGE_FETCH_FAILED` | `upload` | Failed to fetch URL for uploadFromUrl |
| `IGNITER_STORAGE_REPLACE_FAILED` | `upload` | Replace strategy failed |
| `IGNITER_STORAGE_ADAPTER_NOT_CONFIGURED` | `upload` | Adapter not configured |

---

## Non-Goals

By design, this package does NOT:
- Implement business rules in adapters (that's the core's job)
- Provide implicit multi-tenancy (apps should use scopes)
- Support browser-only APIs (server-first)
- Bundle adapter dependencies (they're peer dependencies)

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Public exports |
| `src/igniter-storage.ts` | Runtime classes |
| `src/builder/igniter-storage.builder.ts` | Builder API |
| `src/core/igniter-storage.core.ts` | Business rules |
| `src/adapters/*.ts` | Storage adapters |
| `src/errors/igniter-storage.error.ts` | Error model |
| `src/types/*.ts` | Public types |

### Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Build and watch |
| `npm run build` | Build once |
| `npm run test` | Run tests |
| `npm run typecheck` | Check types |
| `npm run lint` | Lint code |

---

## Support & Communication

When working on this package:
- **Read this file first** before making changes
- **Follow existing patterns** - consistency is key
- **Update documentation** after every code change
- **Write tests** for new features and bug fixes
- **Ask for clarification** if requirements are unclear
- **Suggest improvements** to this AGENTS.md if needed

---

## Changelog History

### v0.1.0 (Initial Release)
- Core storage functionality
- S3 adapter (AWS S3, MinIO, R2)
- Google Cloud Storage adapter
- Type-safe scopes
- Upload policies
- Lifecycle hooks
- Replace strategies
- Environment-first configuration
- Comprehensive documentation
