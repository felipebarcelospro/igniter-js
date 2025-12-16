# Changelog

All notable changes to this package will be documented in this file.

## 0.1.1

### New Features

- **URL in HTTP methods** - All HTTP methods (`get`, `post`, `put`, `patch`, `delete`, `head`) now accept URL directly:
  ```ts
  // Before
  api.get().url('/users').execute()
  
  // After
  api.get('/users').execute()
  ```

- **axios-style requests** - New `.request()` method for object-based API:
  ```ts
  const result = await api.request({
    method: 'POST',
    url: '/users',
    body: { name: 'John' },
    timeout: 5000,
  })
  ```

- **Auto content-type detection** - Response is automatically parsed based on `Content-Type` header:
  - `application/json` → JSON object
  - `text/xml`, `text/csv`, `text/html`, `text/plain` → Text
  - `image/*`, `audio/*`, `video/*`, `application/pdf` → Blob
  - `application/octet-stream` → Blob

- **GET body → query params** - Body in GET/HEAD requests is automatically converted to query parameters:
  ```ts
  api.get('/search').body({ q: 'test' }).execute()
  // → GET /search?q=test
  ```

- **Response includes status and headers** - API response now includes HTTP status and headers:
  ```ts
  const result = await api.get('/users').execute()
  console.log(result.status)  // 200
  console.log(result.headers?.get('x-request-id'))
  ```

- **HEAD method** - Added `.head()` method for HEAD requests.

### Improvements

- `responseType()` now serves primarily for TypeScript typing. Schema validation only runs for validatable content types (JSON, XML, CSV).
- `.method()` is no longer available when using specific HTTP methods (`get`, `post`, etc.) to prevent confusion.
- Better type inference for schema maps with new utility types.

### Deprecated

- `getFile()` is deprecated. Use `.responseType<Blob>().execute()` or `.responseType<File>().execute()` instead. Content-type detection is automatic.

## 0.1.0

- Initial release of `@igniter-js/caller`.
- Type-safe HTTP client built on `fetch`.
- Fluent builder API (`IgniterCaller.create()` + request builder).
- Request/response interceptors.
- Retry support with linear/exponential backoff.
- In-memory caching with optional store adapter.
- Schema validation via `StandardSchemaV1` (and optional Zod `responseType`).
- Global response events for observability.
