# Changelog

All notable changes to `@igniter-js/mail` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-13

### 🎉 Initial Release

First public release of `@igniter-js/mail` - a type-safe email library for Igniter.js with React Email templates.

### ✨ Features

#### Core Functionality
- **Type-Safe Templates** - Full TypeScript support with compile-time inference
- **React Email Integration** - Build beautiful emails with React components
- **StandardSchema Validation** - Runtime validation of template payloads
- **Builder Pattern** - Fluent API for configuration
- **Queue Integration** - Schedule emails with BullMQ or custom queues
- **Lifecycle Hooks** - React to send events (started, success, error)

#### Email Operations
- **`send()`** - Send emails immediately
- **`schedule()`** - Schedule emails for future delivery
- **Template Management** - Type-safe template registration
- **Subject Override** - Per-send subject customization
- **HTML + Plain Text** - Automatic generation of both formats

#### Adapters
- **Resend Adapter** - Official Resend integration
- **Postmark Adapter** - Postmark email service
- **SendGrid Adapter** - SendGrid email service
- **SMTP Adapter** - Standard SMTP protocol support (Nodemailer)
- **Webhook Adapter** - HTTP webhook for testing
- **Test Adapter** - In-memory adapter for unit tests

#### Developer Experience
- **Comprehensive Error Handling** - Typed `IgniterMailError` with stable error codes
- **Rich Type Definitions** - Complete TypeScript types for all APIs
- **React Email Components** - Full access to @react-email/components
- **Type Inference** - Template keys and payloads inferred at compile time
- **Builder Validation** - Configuration errors caught at build time

#### Integration Features
- **Queue Integration** - Optional BullMQ integration for async delivery
- **Logger Support** - Attach Igniter.js logger for debugging
- **Hook System** - Extensible hooks for monitoring and analytics
- **Legacy API Support** - Backwards compatibility with older initialization

### 📦 Package Configuration
- ESM and CJS exports
- TypeScript declaration files
- Tree-shakeable exports
- Peer dependencies for adapters (optional)
- Source maps included

### 📚 Documentation
- Comprehensive README with examples
- API reference documentation
- Adapter configuration guides
- Queue integration examples
- Error codes reference
- Type inference guide
- AGENTS.md for AI agent development

### 🧪 Testing
- Unit tests for core functionality
- Adapter-specific tests
- Template validation tests
- Hook lifecycle tests
- Queue integration tests

---

## Future Releases

Planned features for upcoming versions:
- AWS SES adapter
- Mailgun adapter
- SparkPost adapter
- Email preview server
- Template hot-reloading
- Batch sending
- Attachment support
- Inline images
- Email tracking/analytics
- Template versioning
- A/B testing support
- Unsubscribe link management

---

[0.1.0]: https://github.com/felipebarcelospro/igniter-js/releases/tag/@igniter-js/mail@0.1.0
