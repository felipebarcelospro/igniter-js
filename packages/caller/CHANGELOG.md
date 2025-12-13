# Changelog

All notable changes to this package will be documented in this file.

## 0.1.0

- Initial release of `@igniter-js/caller`.
- Type-safe HTTP client built on `fetch`.
- Fluent builder API (`IgniterCaller.create()` + request builder).
- Request/response interceptors.
- Retry support with linear/exponential backoff.
- In-memory caching with optional store adapter.
- Schema validation via `StandardSchemaV1` (and optional Zod `responseType`).
- Global response events for observability.
