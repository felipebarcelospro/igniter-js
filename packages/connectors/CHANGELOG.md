# Changelog

All notable changes to `@igniter-js/connectors` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-13

### Added

- **Core Connector Management**
  - `IgniterConnector` class for managing connector instances
  - `IgniterConnectorScoped` for scoped access to connectors
  - Multi-tenant scope system (organization, user, system)
  - Type-safe connector definitions with full inference

- **Connector Builder**
  - `Connector.create()` fluent API for defining connectors
  - Configuration schema with Zod/StandardSchema
  - Metadata schema and values
  - Default configuration support
  - Action definitions with input/output validation
  - Context and validation hooks

- **OAuth 2.0 Support**
  - OAuth Universal with auto-detection
  - PKCE support for public clients
  - Automatic token refresh
  - User info fetching
  - State management for CSRF protection

- **Webhook Support**
  - Webhook handler registration
  - Payload validation with schema
  - Per-instance webhook secrets
  - Request body parsing

- **Database Adapters**
  - `PrismaAdapter` for Prisma ORM
  - `IgniterConnectorBaseAdapter` abstract class
  - Full CRUD operations
  - Upsert support

- **Security**
  - AES-256-GCM field-level encryption
  - Automatic encryption of sensitive fields
  - Custom encryption function support
  - `IGNITER_SECRET` environment variable

- **Event System**
  - Global event handlers on manager
  - Scoped event subscriptions
  - Events: connected, disconnected, enabled, disabled, action, oauth, webhook, error

- **Lifecycle Hooks**
  - `onConnect` hook for post-connection logic
  - `onDisconnect` hook for cleanup
  - `onError` hook for error tracking

- **Error Handling**
  - `IgniterConnectorError` class with stable codes
  - Comprehensive error codes for all failure modes
  - Error metadata for debugging

- **Type Inference**
  - `$Infer` type helper
  - `$InferScoped` for scoped instance type
  - `$InferConnectorKey` for connector keys
  - `$InferScopeKey` for scope keys
  - `$InferConfig` for config types
  - `$InferActionKeys` for action keys

### Dependencies

- `@igniter-js/core` - Core utilities and types
- `zod` (peer) - Schema validation
