# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2025-01-22

### Added
- `IgniterStore.create()` as the official builder entry point
- Typed events builder via `IgniterStoreEvents.create('namespace')`
- Telemetry registry at `@igniter-js/store/telemetry` with full coverage for store operations
- Typed-event validation (only when schemas are registered)

### Changed
- Key prefix is fixed to `igniter:store` (no environment/keyPrefix configuration)
- Streams API is `store.streams`
- Counter API uses `increment()` and `decrement()`

### Improved
- Documentation aligned with current runtime behavior
- Expanded test coverage for builders, utils, core, and adapters

## [0.1.0] - 2025-01-14

### Added

- **Initial Release** - First version of `@igniter-js/store`

#### Core Features
- `IgniterStore` - Main store class with fluent builder API
- `IgniterStoreBuilder` - Configuration builder with type inference
- `RedisStoreAdapter` - Full Redis implementation

#### Key-Value Operations (`store.kv`)
- `get<T>(key)` - Retrieve values with type inference
- `set(key, value, { ttl? })` - Store values with optional TTL
- `exists(key)` - Check key existence
- `remove(key)` - Delete keys
- `expire(key, seconds)` - Set key expiration
- `touch(key, ttl)` - Refresh TTL on existing key

#### Counter Operations (`store.counter`)
- `increment(key)` - Atomic increment
- `decrement(key)` - Atomic decrement
- `expire(key, seconds)` - Set counter expiration

#### Claim Operations (`store.claim`)
- `once(key, value, { ttl? })` - SETNX-based distributed locks

#### Batch Operations (`store.batch`)
- `get<T>(keys)` - Multi-key retrieval with MGET
- `set(entries)` - Multi-key storage with pipeline

#### Pub/Sub Operations (`store.events`)
- `publish(channel, message)` - Publish typed messages
- `subscribe(channel, callback)` - Subscribe with typed handlers (returns unsubscribe)

#### Stream Operations (`store.streams`)
- `append(stream, data, { maxLen?, approximate? })` - XADD with trimming
- `group(name, consumer)` - Consumer group API
  - `ensure(stream, { startId? })` - Create consumer group
  - `read(stream, { count?, blockMs? })` - Read messages
  - `ack(stream, ids)` - Acknowledge messages

#### Development Tools (`store.dev`)
- `scan(pattern, { cursor?, count? })` - Key scanning with pagination

#### Multi-Tenant Scoping (`store.scope`)
- `scope(type, id)` - Create isolated scoped store instances
- Hierarchical scope chaining (org → workspace → project)
- Consistent key prefix generation

#### Type Safety
- `IgniterStoreEventsSchema` - Typed pub/sub channel definitions
- Full TypeScript inference for all operations
- Schema validation with StandardSchemaV1 (Zod compatible)

#### Utilities
- `StoreKeyBuilder` - Consistent key generation
- Custom serializer support with `withSerializer()`
- Logger integration with `withLogger()`

#### Error Handling
- `IgniterStoreError` - Typed error class with 37 error codes
- Static `IgniterStoreError.is()` type guard
- Detailed error metadata and debugging info

### Notes

- Redis adapter includes support for Redis Streams (XADD, XGROUP, XREADGROUP, XACK)
- Key naming follows pattern: `<prefix>:<service>[:<scope>:<id>...]:<namespace>:<key>`
- Default key prefix is `igniter:store`
