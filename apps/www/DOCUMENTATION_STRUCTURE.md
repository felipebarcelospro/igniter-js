# Igniter.js Documentation Structure

> Complete documentation mapping for Igniter.js framework - strategically organized by packages and features

## Overview

This document outlines the comprehensive documentation structure for Igniter.js, mapping all articles, sections, and groups based on the actual implementations in our packages.

---

## 📦 Core Tab

**Description:** Core framework components including builder, router, actions, controllers, procedures, and client

### Group 1: Getting Started

#### Article: `introduction`
- **Slug:** `/docs/introduction`
- **Sections:**
  - What is Igniter.js?
  - Why Igniter.js?
  - Key Features
  - Architecture Overview
  - Comparison with tRPC/Next.js Server Actions
- **Connections:** Links to `installation`, `quick-start`

#### Article: `installation`
- **Slug:** `/docs/installation`
- **Sections:**
  - Prerequisites
  - Package Installation
  - Framework-specific Setup (Next.js, Vite, Express, Tanstack Start, etc.)
  - TypeScript Configuration
  - Verify Installation
- **Connections:** Links to `quick-start`, `cli/init`

#### Article: `quick-start`
- **Slug:** `/docs/quick-start`
- **Sections:**
  - Create Your First Router
  - Define a Controller
  - Create Actions (Query & Mutation)
  - Set Up Client
  - Make Your First Request
  - Next Steps
- **Connections:** Links to `builder`, `router`, `actions`, `client`

### Group 2: Core Concepts

#### Article: `builder`
- **Slug:** `/docs/builder`
- **Sections:**
  - Understanding the Builder Pattern
  - Creating an Igniter Instance
  - Configuring Context
  - Adding Store Adapter
  - Adding Logger
  - Adding Jobs Queue
  - Adding Telemetry Provider
  - Registering Plugins
  - Router Configuration
  - Type Inference with `$Infer`
- **Connections:** Links to `context`, `router`, `store`, `jobs`, `telemetry`, `plugins`

#### Article: `router`
- **Slug:** `/docs/router`
- **Sections:**
  - What is a Router?
  - Creating a Router
  - Router Configuration (baseURL, basePATH)
  - Registering Controllers
  - Request Handler
  - Server-side Caller
  - Type Safety
  - Best Practices
- **Connections:** Links to `builder`, `controllers`, `caller`

#### Article: `context`
- **Slug:** `/docs/context`
- **Sections:**
  - Understanding Context
  - Static Context
  - Dynamic Context (ContextCallback)
  - Request-scoped Context
  - Type-safe Context Access
  - Context Best Practices
  - Common Patterns (Database, Auth, User)
- **Connections:** Links to `builder`, `procedures`, `actions`

#### Article: `controllers`
- **Slug:** `/docs/controllers`
- **Sections:**
  - What are Controllers?
  - Creating Controllers
  - Controller Configuration
  - Path Prefixes
  - Grouping Related Actions
  - Controller Organization Patterns
  - Exporting Controllers
- **Connections:** Links to `router`, `actions`

#### Article: `actions`
- **Slug:** `/docs/actions`
- **Sections:**
  - Understanding Actions
  - Query vs Mutation
  - Action Configuration
  - Path Parameters
  - Query Parameters
  - Request Body
  - Input Validation (StandardSchemaV1)
  - Action Handlers
  - Response Handling
  - Action Middleware
  - Type Inference
- **Connections:** Links to `controllers`, `validation`, `procedures`

#### Article: `procedures`
- **Slug:** `/docs/procedures`
- **Sections:**
  - What are Procedures?
  - Creating Middleware Procedures
  - Procedure Options and Output
  - Chaining Procedures
  - Context Enrichment
  - Error Handling in Procedures
  - Reusable Procedure Patterns
  - Built-in Procedures
- **Connections:** Links to `actions`, `context`, `plugins`

### Group 3: Client & Integration

#### Article: `client`
- **Slug:** `/docs/client`
- **Sections:**
  - Client Architecture (Browser vs Server)
  - Creating a Client
  - Client Configuration
  - Type-safe API Calls
  - Browser Client (Fetch-based)
  - Server Client (Direct Invocation)
  - Error Handling
- **Connections:** Links to `hooks`, `caller`

#### Article: `hooks`
- **Slug:** `/docs/hooks`
- **Sections:**
  - React Integration
  - `useQuery` Hook
  - `useMutation` Hook
  - `useRealtime` Hook
  - Query Client Context
  - Cache Management
  - Optimistic Updates
  - Query Invalidation
  - Loading States
  - Error States
  - Hook Options (retry, refetch, etc.)
- **Connections:** Links to `client`, `realtime`, `store`

#### Article: `caller`
- **Slug:** `/docs/caller`
- **Sections:**
  - Server-side Caller
  - Type-safe Internal Calls
  - Use Cases (SSR, Testing, Background Jobs)
  - Caller vs HTTP Requests
  - Performance Benefits
  - Testing Patterns
- **Connections:** Links to `router`, `client`, `testing`

### Group 4: Advanced Features

#### Article: `validation`
- **Slug:** `/docs/validation`
- **Sections:**
  - StandardSchemaV1 Support
  - Zod Integration
  - Valibot Integration
  - Yup Integration
  - Input Validation
  - Output Validation
  - Custom Validators
  - Error Messages
- **Connections:** Links to `actions`, `schemas`

#### Article: `error-handling`
- **Slug:** `/docs/error-handling`
- **Sections:**
  - IgniterError Class
  - Error Codes
  - Custom Errors
  - Error Logging
  - Error Response Format
  - Global Error Handler
  - Procedure Error Handling
  - Client-side Error Handling
- **Connections:** Links to `procedures`, `actions`, `logging`

#### Article: `plugins`
- **Slug:** `/docs/plugins`
- **Sections:**
  - Plugin System Overview
  - Creating Plugins
  - Plugin Lifecycle Hooks
  - Plugin Actions & Controllers
  - Plugin Events
  - Accessing Plugins in Actions
  - Type-safe Plugin Access
  - Built-in Plugins (Ensure, Audit)
- **Connections:** Links to `builder`, `procedures`

#### Article: `realtime`
- **Slug:** `/docs/realtime`
- **Sections:**
  - Real-time Service Overview
  - WebSocket Support
  - Server-Sent Events (SSE)
  - Channel Subscriptions
  - Publishing Messages
  - React Hooks Integration
  - Real-time Patterns
  - Scaling Considerations
- **Connections:** Links to `store`, `hooks`

#### Article: `playground`
- **Slug:** `/docs/playground`
- **Sections:**
  - Interactive API Playground
  - Enabling Playground
  - Playground Configuration
  - Custom Route
  - Authentication in Playground
  - Production Considerations
- **Connections:** Links to `router`, `docs-generation`

#### Article: `docs-generation`
- **Slug:** `/docs/docs-generation`
- **Sections:**
  - OpenAPI Generation
  - Scalar UI Integration
  - Documentation Configuration
  - Annotations & Descriptions
  - Auto-generated Documentation
  - CI/CD Integration
- **Connections:** Links to `cli/generate-docs`, `playground`

### Group 5: Testing & Deployment

#### Article: `testing`
- **Slug:** `/docs/testing`
- **Sections:**
  - Testing Strategies
  - Unit Testing Actions
  - Integration Testing
  - Using Caller for Tests
  - Mocking Context
  - Testing Procedures
  - Testing Error Scenarios
  - Example Test Suites
- **Connections:** Links to `caller`, `context`

#### Article: `deployment`
- **Slug:** `/docs/deployment`
- **Sections:**
  - Production Checklist
  - Environment Variables
  - Framework-specific Deployment
  - Serverless Deployment
  - Docker Deployment
  - Performance Optimization
  - Monitoring & Logging
- **Connections:** Links to `telemetry`, `logging`

---

## 🖥️ CLI Tab

**Description:** Command-line tool for project scaffolding, generation, and development workflows

### Group 1: Getting Started

#### Article: `introduction`
- **Slug:** `/docs/cli/introduction`
- **Sections:**
  - What is Igniter CLI?
  - Installation
  - Available Commands Overview
  - Global Options (--debug)
  - Help System
- **Connections:** Links to `init`, `dev`, `generate`

### Group 2: Project Setup

#### Article: `init`
- **Slug:** `/docs/cli/init`
- **Sections:**
  - Creating New Projects
  - Interactive Setup
  - Command Options
  - Template Selection
  - Framework Selection
  - Feature Configuration (store, jobs, mcp, logging, telemetry)
  - Database Setup (PostgreSQL, MySQL, SQLite)
  - ORM Selection (Prisma, Drizzle)
  - Package Manager Selection
  - Git Initialization
  - Docker Compose Setup
  - Force & Non-interactive Modes
- **Connections:** Links to `templates`, `dev`

#### Article: `templates`
- **Slug:** `/docs/cli/templates`
- **Sections:**
  - Available Templates
  - Next.js Template
  - Vite Template
  - Express API Template
  - Tanstack Start Template
  - Bun React App Template
  - Bun REST API Template
  - Deno REST API Template
  - Template Structure
  - Customizing Templates
- **Connections:** Links to `init`

### Group 3: Development

#### Article: `dev`
- **Slug:** `/docs/cli/dev`
- **Sections:**
  - Development Mode
  - Interactive Dashboard
  - Framework Detection
  - Auto-generation on Changes
  - OpenAPI Docs Auto-generation
  - Port Management
  - Custom Commands
  - Non-interactive Mode
  - Process Management
- **Connections:** Links to `generate/schema`, `generate/docs`

### Group 4: Code Generation

#### Article: `generate/schema`
- **Slug:** `/docs/cli/generate/schema`
- **Sections:**
  - Client Schema Generation
  - Watch Mode
  - Framework Support
  - Output Directory
  - OpenAPI Integration
  - CI/CD Usage
  - Performance
- **Connections:** Links to `dev`, `generate/docs`

#### Article: `generate/docs`
- **Slug:** `/docs/cli/generate/docs`
- **Sections:**
  - OpenAPI Specification Generation
  - Scalar UI Generation
  - Output Configuration
  - Router Introspection
  - Documentation Metadata
  - Standalone Documentation
- **Connections:** Links to `generate/schema`, `/docs/docs-generation`

#### Article: `generate/feature`
- **Slug:** `/docs/cli/generate/feature`
- **Sections:**
  - Scaffolding Features
  - Feature Structure
  - Schema-based Generation (Prisma)
  - Naming Conventions
  - Generated Files
  - Customization
- **Connections:** Links to `generate/controller`, `generate/procedure`

#### Article: `generate/controller`
- **Slug:** `/docs/cli/generate/controller`
- **Sections:**
  - Scaffolding Controllers
  - Controller Templates
  - Feature Integration
  - File Structure
  - Best Practices
- **Connections:** Links to `generate/feature`, `/docs/controllers`

#### Article: `generate/procedure`
- **Slug:** `/docs/cli/generate/procedure`
- **Sections:**
  - Scaffolding Procedures
  - Procedure Templates
  - Middleware Patterns
  - Reusable Logic
- **Connections:** Links to `generate/feature`, `/docs/procedures`

### Group 5: Advanced Usage

#### Article: `configuration`
- **Slug:** `/docs/cli/configuration`
- **Sections:**
  - CLI Configuration File
  - Project Detection
  - Framework Detection Logic
  - Custom Patterns
  - Debug Mode
  - Logging Configuration
- **Connections:** Links to all CLI commands

#### Article: `troubleshooting`
- **Slug:** `/docs/cli/troubleshooting`
- **Sections:**
  - Common Issues
  - Debug Mode Usage
  - Port Conflicts
  - Generation Errors
  - Framework Detection Issues
  - Performance Issues
- **Connections:** Links to `configuration`

---

## 💾 Store Tab

**Description:** Redis-based adapter for caching, key-value storage, and Pub/Sub messaging

### Group 1: Getting Started

#### Article: `introduction`
- **Slug:** `/docs/store/introduction`
- **Sections:**
  - What is the Store Adapter?
  - Use Cases (Caching, Sessions, Pub/Sub, Real-time)
  - Redis Integration
  - When to Use Store
- **Connections:** Links to `installation`, `setup`

#### Article: `installation`
- **Slug:** `/docs/store/installation`
- **Sections:**
  - Installing @igniter-js/adapter-redis
  - Redis Setup
  - Docker Redis
  - Redis Cloud Options
  - Connection Configuration
- **Connections:** Links to `setup`

#### Article: `setup`
- **Slug:** `/docs/store/setup`
- **Sections:**
  - Creating Redis Client
  - Creating Store Adapter
  - Integrating with Builder
  - Connection Options
  - Environment Variables
  - Type Safety
- **Connections:** Links to `/docs/builder`, `key-value`

### Group 2: Core Features

#### Article: `key-value`
- **Slug:** `/docs/store/key-value`
- **Sections:**
  - Get/Set Operations
  - TTL (Time to Live)
  - JSON Serialization
  - Delete Operations
  - Has (Exists) Checks
  - Increment Operations
  - Expire Operations
  - Type-safe Values
- **Connections:** Links to `caching-patterns`

#### Article: `pub-sub`
- **Slug:** `/docs/store/pub-sub`
- **Sections:**
  - Publish/Subscribe Pattern
  - Channel Subscriptions
  - Publishing Messages
  - Event Callbacks
  - Unsubscribe
  - Message Serialization
  - Use Cases (Real-time Updates, Event Broadcasting)
- **Connections:** Links to `/docs/realtime`, `patterns`

### Group 3: Advanced Usage

#### Article: `caching-patterns`
- **Slug:** `/docs/store/caching-patterns`
- **Sections:**
  - Cache-aside Pattern
  - Write-through Cache
  - Cache Invalidation
  - TTL Strategies
  - Cache Keys Naming
  - Distributed Caching
- **Connections:** Links to `key-value`, `performance`

#### Article: `patterns`
- **Slug:** `/docs/store/patterns`
- **Sections:**
  - Session Management
  - Rate Limiting
  - Real-time Notifications
  - Distributed Locks
  - Message Queues Integration
  - Multi-tenancy
- **Connections:** Links to `pub-sub`, `/docs/jobs`

#### Article: `performance`
- **Slug:** `/docs/store/performance`
- **Sections:**
  - Connection Pooling
  - Pipeline Operations
  - Redis Cluster
  - Memory Management
  - Monitoring
  - Best Practices
- **Connections:** Links to `troubleshooting`

#### Article: `troubleshooting`
- **Slug:** `/docs/store/troubleshooting`
- **Sections:**
  - Connection Issues
  - Memory Issues
  - Performance Debugging
  - Common Errors
  - Client Limitations
- **Connections:** Links to `installation`, `setup`

---

## ⏰ Jobs Tab

**Description:** Background job processing with BullMQ and Redis for task queues, scheduling, and workers

### Group 1: Getting Started

#### Article: `introduction`
- **Slug:** `/docs/jobs/introduction`
- **Sections:**
  - What are Background Jobs?
  - Why Use Job Queues?
  - BullMQ Integration
  - Use Cases (Email Sending, Image Processing, Reports, etc.)
  - Architecture Overview
- **Connections:** Links to `installation`, `quick-start`

#### Article: `installation`
- **Slug:** `/docs/jobs/installation`
- **Sections:**
  - Installing @igniter-js/adapter-bullmq
  - Redis Requirement
  - Dependencies
  - TypeScript Setup
- **Connections:** Links to `quick-start`, `/docs/store/installation`

#### Article: `quick-start`
- **Slug:** `/docs/jobs/quick-start`
- **Sections:**
  - Creating BullMQ Adapter
  - Defining Your First Job
  - Job Router Setup
  - Merging Routers
  - Integrating with Builder
  - Enqueueing Jobs
  - Starting Workers
- **Connections:** Links to `job-definitions`, `routers`

### Group 2: Core Concepts

#### Article: `job-definitions`
- **Slug:** `/docs/jobs/job-definitions`
- **Sections:**
  - Job Structure
  - Input Schema (StandardSchemaV1)
  - Job Handler
  - Job Options (attempts, priority, etc.)
  - Queue Configuration
  - Repeat Configuration
  - Type Safety
  - Using `register()` Method
- **Connections:** Links to `routers`, `handlers`

#### Article: `routers`
- **Slug:** `/docs/jobs/routers`
- **Sections:**
  - Creating Job Routers
  - Namespace Organization
  - Merging Routers
  - Type-safe Access
  - Namespace Proxy
  - Registry System
  - Best Practices
- **Connections:** Links to `job-definitions`, `execution`

#### Article: `handlers`
- **Slug:** `/docs/jobs/handlers`
- **Sections:**
  - Handler Function Structure
  - Execution Context
  - Accessing Input
  - Accessing Application Context
  - Return Values
  - Error Handling in Handlers
  - Async Handlers
- **Connections:** Links to `job-definitions`, `context-factory`

#### Article: `context-factory`
- **Slug:** `/docs/jobs/context-factory`
- **Sections:**
  - What is Context Factory?
  - Providing Application Context to Jobs
  - Database Connections
  - Service Access
  - Type Safety
  - Context Lifecycle
- **Connections:** Links to `handlers`, `/docs/context`

### Group 3: Job Execution

#### Article: `execution`
- **Slug:** `/docs/jobs/execution`
- **Sections:**
  - Enqueueing Jobs
  - Namespace-based Execution
  - Immediate vs Scheduled
  - Job Options Override
  - Bulk Enqueue
  - Return Values (Job IDs)
- **Connections:** Links to `routers`, `scheduling`

#### Article: `scheduling`
- **Slug:** `/docs/jobs/scheduling`
- **Sections:**
  - Delayed Jobs (`delay` option)
  - Scheduled Jobs (`at` option)
  - Cron Jobs
  - Repeat Options
  - Schedule Patterns (SchedulePatterns enum)
  - Advanced Scheduling
  - Time Zones
  - Max Executions
- **Connections:** Links to `execution`, `cron-jobs`, `advanced-scheduling`

#### Article: `cron-jobs`
- **Slug:** `/docs/jobs/cron-jobs`
- **Sections:**
  - Creating Cron Jobs
  - Cron Expression Syntax
  - Cron Job Handlers
  - Execution Context (CronJobExecutionContext)
  - Max Executions
  - Time Zones
  - Start/End Dates
  - Auto-scheduling
  - Validation
- **Connections:** Links to `scheduling`, `advanced-scheduling`

#### Article: `advanced-scheduling`
- **Slug:** `/docs/jobs/advanced-scheduling`
- **Sections:**
  - Business Hours Only
  - Skip Weekends
  - Custom Weekdays
  - Skip Specific Dates
  - Time Windows (`between`)
  - Retry Strategies (exponential, linear, fixed, custom)
  - Backoff Multiplier
  - Jitter Factor
  - Conditional Execution
  - Skip if Running
  - Max Concurrency
  - Priority Boost
  - Timeouts
- **Connections:** Links to `scheduling`, `retry-strategies`

#### Article: `retry-strategies`
- **Slug:** `/docs/jobs/retry-strategies`
- **Sections:**
  - Exponential Backoff
  - Linear Backoff
  - Fixed Delay
  - Custom Retry Delays
  - Max Retry Delay
  - Attempts Configuration
  - Jitter for Distributed Systems
- **Connections:** Links to `advanced-scheduling`, `error-handling`

### Group 4: Workers

#### Article: `workers`
- **Slug:** `/docs/jobs/workers`
- **Sections:**
  - Worker Architecture
  - Starting Workers
  - Queue Selection
  - Concurrency Configuration
  - Worker Events (onActive, onSuccess, onFailure, onIdle)
  - Multiple Workers
  - Worker Lifecycle
  - Graceful Shutdown
- **Connections:** Links to `auto-start`, `scaling`

#### Article: `auto-start`
- **Slug:** `/docs/jobs/auto-start`
- **Sections:**
  - Auto-start Workers Configuration
  - Queue Discovery
  - Debug Mode
  - Event Handlers
  - When to Use Auto-start
- **Connections:** Links to `workers`, `deployment`

#### Article: `scaling`
- **Slug:** `/docs/jobs/scaling`
- **Sections:**
  - Horizontal Scaling
  - Multiple Worker Instances
  - Queue Partitioning
  - Redis Cluster
  - Performance Tuning
  - Monitoring Workers
- **Connections:** Links to `workers`, `monitoring`

### Group 5: Advanced Features

#### Article: `hooks`
- **Slug:** `/docs/jobs/hooks`
- **Sections:**
  - Job Lifecycle Hooks
  - `onStart` Hook
  - `onSuccess` Hook
  - `onFailure` Hook
  - `onComplete` Hook
  - Hook Context Types
  - Use Cases (Logging, Metrics, Notifications)
  - Error Handling in Hooks
- **Connections:** Links to `job-definitions`, `monitoring`

#### Article: `search`
- **Slug:** `/docs/jobs/search`
- **Sections:**
  - Searching Jobs
  - Filter Options (status, jobId, dateRange)
  - Job States (waiting, active, completed, failed, etc.)
  - Pagination
  - Sorting
  - Use Cases (Monitoring, Debugging)
- **Connections:** Links to `monitoring`, `debugging`

#### Article: `queues`
- **Slug:** `/docs/jobs/queues`
- **Sections:**
  - Queue Configuration
  - Queue Naming
  - Global Prefixes
  - Queue Prefixes
  - Multi-tenancy Support
  - Queue Separation Patterns
  - Queue Options
- **Connections:** Links to `job-definitions`, `multi-tenancy`

#### Article: `multi-tenancy`
- **Slug:** `/docs/jobs/multi-tenancy`
- **Sections:**
  - Multi-tenant Job Queues
  - Tenant Isolation
  - Queue Prefixes for Tenants
  - Namespace Organization
  - Best Practices
- **Connections:** Links to `queues`, `patterns`

#### Article: `webhooks`
- **Slug:** `/docs/jobs/webhooks`
- **Sections:**
  - Webhook Notifications
  - Configuring Webhook URLs
  - Notification Payload
  - Success Notifications
  - Failure Notifications
  - Retry on Webhook Failure
- **Connections:** Links to `advanced-scheduling`, `monitoring`

#### Article: `patterns`
- **Slug:** `/docs/jobs/patterns`
- **Sections:**
  - Email Queue Pattern
  - Image Processing Pipeline
  - Report Generation
  - Data Import/Export
  - Scheduled Tasks
  - Event-driven Jobs
  - Chain Jobs
- **Connections:** Links to `job-definitions`, `routers`

### Group 6: Monitoring & Debugging

#### Article: `monitoring`
- **Slug:** `/docs/jobs/monitoring`
- **Sections:**
  - Job Metrics
  - Queue Health
  - Worker Status
  - Failed Jobs Analysis
  - Performance Metrics
  - Integration with Telemetry
  - Dashboard Tools
- **Connections:** Links to `/docs/telemetry`, `debugging`

#### Article: `debugging`
- **Slug:** `/docs/jobs/debugging`
- **Sections:**
  - Debug Logging
  - Job Search for Debugging
  - Inspecting Failed Jobs
  - Retry Failed Jobs
  - Common Issues
  - Stack Traces
- **Connections:** Links to `search`, `error-handling`

#### Article: `error-handling`
- **Slug:** `/docs/jobs/error-handling`
- **Sections:**
  - Job Failures
  - Retry Mechanisms
  - Final Attempt Detection
  - Error Logging
  - Dead Letter Queues
  - Failure Hooks
  - Recovery Strategies
- **Connections:** Links to `retry-strategies`, `hooks`

### Group 7: Production

#### Article: `deployment`
- **Slug:** `/docs/jobs/deployment`
- **Sections:**
  - Production Configuration
  - Redis Setup
  - Worker Deployment
  - Environment Variables
  - Scaling Workers
  - Monitoring Setup
  - Graceful Shutdown
- **Connections:** Links to `workers`, `scaling`, `monitoring`

#### Article: `best-practices`
- **Slug:** `/docs/jobs/best-practices`
- **Sections:**
  - Job Design Principles
  - Idempotency
  - Error Handling
  - Logging
  - Performance Optimization
  - Security Considerations
  - Testing Jobs
- **Connections:** Links to all jobs articles

---

## 🤖 MCP Server Tab

**Description:** Transform Igniter.js APIs into Model Context Protocol (MCP) servers for AI integrations

### Group 1: Getting Started

#### Article: `introduction`
- **Slug:** `/docs/mcp-server/introduction`
- **Sections:**
  - What is MCP (Model Context Protocol)?
  - Why Use MCP with Igniter?
  - Use Cases (AI Agents, Claude Integration, etc.)
  - Architecture Overview
  - MCP Concepts (Tools, Prompts, Resources)
- **Connections:** Links to `installation`, `quick-start`

#### Article: `installation`
- **Slug:** `/docs/mcp-server/installation`
- **Sections:**
  - Installing @igniter-js/adapter-mcp-server
  - Dependencies
  - TypeScript Setup
- **Connections:** Links to `quick-start`

#### Article: `quick-start`
- **Slug:** `/docs/mcp-server/quick-start`
- **Sections:**
  - Creating Your First MCP Server
  - Converting Igniter Router to MCP
  - Server Builder Pattern
  - Basic Configuration
  - Building and Running
  - Testing with Claude Desktop
- **Connections:** Links to `builder`, `tools`

### Group 2: Core Concepts

#### Article: `builder`
- **Slug:** `/docs/mcp-server/builder`
- **Sections:**
  - IgniterMcpServer Builder
  - Fluent API
  - Router Integration
  - Configuration Methods
  - Type Safety
  - Building the Server
- **Connections:** Links to `tools`, `prompts`, `resources`

#### Article: `tools`
- **Slug:** `/docs/mcp-server/tools`
- **Sections:**
  - What are MCP Tools?
  - Auto-mapping Igniter Actions to Tools
  - Tool Naming Conventions
  - Tool Parameters
  - Tool Descriptions
  - Custom Tools with `addTool()`
  - Tool Transform Function
  - Tool Execution
- **Connections:** Links to `builder`, `/docs/actions`

#### Article: `prompts`
- **Slug:** `/docs/mcp-server/prompts`
- **Sections:**
  - What are MCP Prompts?
  - Creating Custom Prompts
  - Prompt Arguments
  - Prompt Messages
  - Dynamic Prompts
  - Prompt Use Cases
  - Adding Prompts with `addPrompt()`
- **Connections:** Links to `builder`, `tools`

#### Article: `resources`
- **Slug:** `/docs/mcp-server/resources`
- **Sections:**
  - What are MCP Resources?
  - Resource URIs
  - Resource Content Types
  - Dynamic Resources
  - Resource Handlers
  - Adding Resources with `addResource()`
- **Connections:** Links to `builder`, `prompts`

### Group 3: Configuration

#### Article: `server-info`
- **Slug:** `/docs/mcp-server/server-info`
- **Sections:**
  - Server Metadata
  - Name and Version
  - Description
  - Capabilities Declaration
  - Custom Server Info
- **Connections:** Links to `builder`, `capabilities`

#### Article: `capabilities`
- **Slug:** `/docs/mcp-server/capabilities`
- **Sections:**
  - MCP Capabilities
  - Tools Capability
  - Prompts Capability
  - Resources Capability
  - Custom Capabilities
  - Capability Configuration
- **Connections:** Links to `server-info`, `tools`, `prompts`, `resources`

#### Article: `logger`
- **Slug:** `/docs/mcp-server/logger`
- **Sections:**
  - Logger Integration
  - Custom Logger
  - Log Levels
  - Debugging MCP Servers
  - Log Format
- **Connections:** Links to `debugging`

#### Article: `instructions`
- **Slug:** `/docs/mcp-server/instructions`
- **Sections:**
  - Server Instructions for AI
  - Providing Context to AI Models
  - Best Practices for Instructions
  - Examples
- **Connections:** Links to `builder`

### Group 4: Authentication & Security

#### Article: `oauth`
- **Slug:** `/docs/mcp-server/oauth`
- **Sections:**
  - OAuth 2.0 Integration
  - OAuth Configuration
  - Authorization Flow
  - Token Management
  - Security Best Practices
- **Connections:** Links to `auth-handlers`, `security`

#### Article: `auth-handlers`
- **Slug:** `/docs/mcp-server/auth-handlers`
- **Sections:**
  - Authentication Handlers
  - Resource Handler
  - CORS Handler
  - Request Authentication
  - Token Validation
- **Connections:** Links to `oauth`, `deployment`

#### Article: `security`
- **Slug:** `/docs/mcp-server/security`
- **Sections:**
  - Security Considerations
  - Rate Limiting
  - Input Validation
  - Context Isolation
  - Production Security
- **Connections:** Links to `oauth`, `best-practices`

### Group 5: Advanced Features

#### Article: `events`
- **Slug:** `/docs/mcp-server/events`
- **Sections:**
  - MCP Events System
  - Event Configuration
  - Event Handlers
  - Real-time Updates
  - Event Use Cases
- **Connections:** Links to `builder`, `/docs/realtime`

#### Article: `response-customization`
- **Slug:** `/docs/mcp-server/response-customization`
- **Sections:**
  - Custom Response Handling
  - Response Transformers
  - Error Responses
  - Content Types
  - Response Metadata
- **Connections:** Links to `builder`

#### Article: `tool-transform`
- **Slug:** `/docs/mcp-server/tool-transform`
- **Sections:**
  - Tool Transformation Function
  - Customizing Tool Names
  - Customizing Tool Descriptions
  - Filtering Tools
  - Enhancing Tool Metadata
- **Connections:** Links to `tools`, `builder`

#### Article: `adapters`
- **Slug:** `/docs/mcp-server/adapters`
- **Sections:**
  - Adapter-specific Options
  - Transport Configuration
  - Custom Adapters
  - Stdio Adapter
  - HTTP Adapter
- **Connections:** Links to `deployment`

### Group 6: Integration & Deployment

#### Article: `claude-desktop`
- **Slug:** `/docs/mcp-server/claude-desktop`
- **Sections:**
  - Claude Desktop Integration
  - Configuration File
  - Testing with Claude
  - Debugging Claude Integration
  - Common Issues
- **Connections:** Links to `quick-start`, `testing`

#### Article: `testing`
- **Slug:** `/docs/mcp-server/testing`
- **Sections:**
  - Testing MCP Servers
  - Unit Testing Tools
  - Integration Testing
  - Mock Contexts
  - Test Utilities
- **Connections:** Links to `/docs/testing`, `debugging`

#### Article: `debugging`
- **Slug:** `/docs/mcp-server/debugging`
- **Sections:**
  - Debug Mode
  - Logging Strategy
  - Inspector Tools
  - Common Issues
  - Stack Traces
- **Connections:** Links to `logger`, `testing`

#### Article: `deployment`
- **Slug:** `/docs/mcp-server/deployment`
- **Sections:**
  - Production Deployment
  - Environment Variables
  - Server Configuration
  - Scaling MCP Servers
  - Monitoring
  - Security Checklist
- **Connections:** Links to `security`, `monitoring`

#### Article: `best-practices`
- **Slug:** `/docs/mcp-server/best-practices`
- **Sections:**
  - MCP Server Design Principles
  - Tool Organization
  - Error Handling
  - Performance
  - Security
  - Documentation
- **Connections:** Links to all MCP articles

---

## 🤖 Bots Tab

**Description:** Create conversational bots for Telegram, WhatsApp, and more with multi-provider support

### Group 1: Getting Started

#### Article: `introduction`
- **Slug:** `/docs/bots/introduction`
- **Sections:**
  - What is @igniter-js/bot?
  - Multi-provider Bot Framework
  - Supported Platforms (Telegram, WhatsApp)
  - Use Cases
  - Architecture Overview
- **Connections:** Links to `installation`, `quick-start`

#### Article: `installation`
- **Slug:** `/docs/bots/installation`
- **Sections:**
  - Installing @igniter-js/bot
  - Dependencies
  - TypeScript Setup
  - Platform API Keys
- **Connections:** Links to `quick-start`

#### Article: `quick-start`
- **Slug:** `/docs/bots/quick-start`
- **Sections:**
  - Creating Your First Bot
  - Bot Configuration
  - Adapter Setup
  - Command Definition
  - Handling Messages
  - Running the Bot
- **Connections:** Links to `bot-class`, `adapters`

### Group 2: Core Concepts

#### Article: `bot-class`
- **Slug:** `/docs/bots/bot-class`
- **Sections:**
  - Bot Class Overview
  - Bot Configuration
  - Type Safety
  - Bot ID and Name
  - Lifecycle
  - Method Chaining
- **Connections:** Links to `adapters`, `commands`

#### Article: `adapters`
- **Slug:** `/docs/bots/adapters`
- **Sections:**
  - What are Adapters?
  - IBotAdapter Interface
  - Registering Adapters
  - Multi-adapter Support
  - Platform-specific Adapters
  - Custom Adapters
- **Connections:** Links to `telegram`, `whatsapp`, `custom-adapters`

#### Article: `commands`
- **Slug:** `/docs/bots/commands`
- **Sections:**
  - Command System
  - Command Structure
  - Command Name and Aliases
  - Command Description
  - Help Text
  - Parameter Validation (Zod)
  - Command Handlers
  - Command Index
  - Dynamic Command Registration
- **Connections:** Links to `context`, `handlers`

#### Article: `context`
- **Slug:** `/docs/bots/context`
- **Sections:**
  - BotContext Type
  - Message Context
  - User Information
  - Channel Information
  - Provider Information
  - Bot Reference
  - Accessing Context in Handlers
- **Connections:** Links to `commands`, `handlers`

#### Article: `handlers`
- **Slug:** `/docs/bots/handlers`
- **Sections:**
  - Command Handlers
  - Handler Function Signature
  - Accessing Parameters
  - Sending Responses
  - Error Handling in Handlers
  - Async Handlers
- **Connections:** Links to `commands`, `sending-messages`

#### Article: `sending-messages`
- **Slug:** `/docs/bots/sending-messages`
- **Sections:**
  - Bot.send() Method
  - Message Types (text, image, file, etc.)
  - Message Content
  - Channel Targeting
  - Provider Selection
  - Message Options
- **Connections:** Links to `handlers`, `message-types`

### Group 3: Platforms

#### Article: `telegram`
- **Slug:** `/docs/bots/telegram`
- **Sections:**
  - Telegram Adapter
  - Bot Token Setup
  - Webhook Configuration
  - Polling Mode
  - Telegram-specific Features
  - Message Types
  - Telegram Best Practices
- **Connections:** Links to `adapters`, `webhooks`

#### Article: `whatsapp`
- **Slug:** `/docs/bots/whatsapp`
- **Sections:**
  - WhatsApp Adapter
  - WhatsApp Business API
  - Token and Phone Setup
  - Webhook Configuration
  - WhatsApp-specific Features
  - Message Templates
  - Media Messages
- **Connections:** Links to `adapters`, `webhooks`

#### Article: `custom-adapters`
- **Slug:** `/docs/bots/custom-adapters`
- **Sections:**
  - Creating Custom Adapters
  - IBotAdapter Interface Implementation
  - Handle Method
  - Send Method
  - Provider Identification
  - Testing Custom Adapters
- **Connections:** Links to `adapters`, `testing`

### Group 4: Advanced Features

#### Article: `middleware`
- **Slug:** `/docs/bots/middleware`
- **Sections:**
  - Middleware Pipeline
  - Creating Middleware
  - Middleware Execution Order
  - Context Enrichment
  - Error Handling Middleware
  - Authentication Middleware
  - Logging Middleware
  - Dynamic Middleware Registration
- **Connections:** Links to `hooks`, `context`

#### Article: `hooks`
- **Slug:** `/docs/bots/hooks`
- **Sections:**
  - Lifecycle Hooks
  - `onPreProcess` Hook
  - `onPostProcess` Hook
  - Hook Execution
  - Use Cases (Session Loading, Analytics)
- **Connections:** Links to `middleware`, `events`

#### Article: `events`
- **Slug:** `/docs/bots/events`
- **Sections:**
  - Event System
  - Bot Events
  - Event Listeners
  - `on()` Method
  - `emit()` Method
  - Event Types (BotEvent)
  - Custom Events
- **Connections:** Links to `hooks`, `bot-class`

#### Article: `message-types`
- **Slug:** `/docs/bots/message-types`
- **Sections:**
  - Supported Message Types
  - Text Messages
  - Image Messages
  - File Messages
  - Audio Messages
  - Video Messages
  - Location Messages
  - Platform Compatibility
- **Connections:** Links to `sending-messages`, `telegram`, `whatsapp`

#### Article: `webhooks`
- **Slug:** `/docs/bots/webhooks`
- **Sections:**
  - Webhook Setup
  - Webhook URL Configuration
  - Request Handling
  - Webhook Security
  - Platform-specific Webhooks
  - Testing Webhooks Locally
- **Connections:** Links to `telegram`, `whatsapp`, `deployment`

#### Article: `logging`
- **Slug:** `/docs/bots/logging`
- **Sections:**
  - Bot Logger Interface
  - Custom Logger
  - Log Levels
  - Debugging Bots
  - Structured Logging
- **Connections:** Links to `debugging`

### Group 5: Patterns & Best Practices

#### Article: `conversation-flows`
- **Slug:** `/docs/bots/conversation-flows`
- **Sections:**
  - Stateful Conversations
  - Session Management
  - Multi-step Flows
  - Context Persistence
  - User State Tracking
- **Connections:** Links to `middleware`, `patterns`

#### Article: `patterns`
- **Slug:** `/docs/bots/patterns`
- **Sections:**
  - Command-based Bots
  - Natural Language Processing
  - Menu-driven Interfaces
  - Inline Keyboards (Telegram)
  - Quick Replies (WhatsApp)
  - FAQ Bots
  - Notification Bots
- **Connections:** Links to `commands`, `conversation-flows`

#### Article: `error-handling`
- **Slug:** `/docs/bots/error-handling`
- **Sections:**
  - BotError Class
  - Error Codes
  - Global Error Handling
  - User-friendly Error Messages
  - Logging Errors
  - Recovery Strategies
- **Connections:** Links to `logging`, `debugging`

### Group 6: Testing & Deployment

#### Article: `testing`
- **Slug:** `/docs/bots/testing`
- **Sections:**
  - Testing Strategies
  - Unit Testing Commands
  - Mocking Adapters
  - Integration Testing
  - Test Utilities
  - Example Test Suites
- **Connections:** Links to `/docs/testing`, `debugging`

#### Article: `debugging`
- **Slug:** `/docs/bots/debugging`
- **Sections:**
  - Debug Mode
  - Logging Strategy
  - Inspecting Messages
  - Webhook Debugging
  - Common Issues
- **Connections:** Links to `logging`, `testing`

#### Article: `deployment`
- **Slug:** `/docs/bots/deployment`
- **Sections:**
  - Production Deployment
  - Environment Variables
  - Webhook vs Polling
  - Scaling Considerations
  - Serverless Deployment
  - Monitoring
  - Security Checklist
- **Connections:** Links to `webhooks`, `best-practices`

#### Article: `best-practices`
- **Slug:** `/docs/bots/best-practices`
- **Sections:**
  - Bot Design Principles
  - User Experience
  - Error Handling
  - Security
  - Performance
  - Monitoring & Analytics
  - Compliance (GDPR, etc.)
- **Connections:** Links to all bots articles

---

## 📊 Telemetry Tab

**Description:** Observability provider for distributed tracing, metrics, and structured logging with OpenTelemetry

### Group 1: Getting Started

#### Article: `introduction`
- **Slug:** `/docs/telemetry/introduction`
- **Sections:**
  - What is Telemetry?
  - OpenTelemetry Overview
  - Why Use Telemetry with Igniter?
  - Observability Pillars (Traces, Metrics, Logs)
  - Use Cases
- **Connections:** Links to `installation`, `quick-start`

#### Article: `installation`
- **Slug:** `/docs/telemetry/installation`
- **Sections:**
  - Installing @igniter-js/adapter-opentelemetry
  - OpenTelemetry Dependencies
  - TypeScript Setup
  - Exporter Requirements
- **Connections:** Links to `quick-start`, `exporters`

#### Article: `quick-start`
- **Slug:** `/docs/telemetry/quick-start`
- **Sections:**
  - Creating Telemetry Adapter
  - Basic Configuration
  - Integrating with Builder
  - Simple Console Export
  - First Traces
  - Verifying Setup
- **Connections:** Links to `configuration`, `tracing`

### Group 2: Core Concepts

#### Article: `configuration`
- **Slug:** `/docs/telemetry/configuration`
- **Sections:**
  - OpenTelemetryConfig
  - Service Name and Version
  - Environment
  - Exporters Configuration
  - Sample Rate
  - Enable/Disable Features (Tracing, Metrics, Events)
  - Resource Attributes
  - Custom Configuration
- **Connections:** Links to `exporters`, `factory-methods`

#### Article: `factory-methods`
- **Slug:** `/docs/telemetry/factory-methods`
- **Sections:**
  - `createOpenTelemetryAdapter()`
  - `createSimpleOpenTelemetryAdapter()`
  - `createProductionOpenTelemetryAdapter()`
  - Auto-initialization
  - Graceful Shutdown
  - Factory Options
- **Connections:** Links to `configuration`, `quick-start`

#### Article: `adapter`
- **Slug:** `/docs/telemetry/adapter`
- **Sections:**
  - OpenTelemetryAdapter Interface
  - IgniterTelemetryProvider Integration
  - Adapter Methods
  - Initialization
  - Shutdown
  - Type Safety
- **Connections:** Links to `/docs/builder`, `tracing`

### Group 3: Tracing

#### Article: `tracing`
- **Slug:** `/docs/telemetry/tracing`
- **Sections:**
  - Distributed Tracing Basics
  - Trace Context
  - Spans Overview
  - Parent-Child Relationships
  - Trace Propagation
  - Automatic Instrumentation in Igniter
- **Connections:** Links to `spans`, `context-propagation`

#### Article: `spans`
- **Slug:** `/docs/telemetry/spans`
- **Sections:**
  - Creating Spans
  - Span Options (name, kind, attributes)
  - Active Span
  - Span Wrapper (OpenTelemetrySpanWrapper)
  - Setting Attributes
  - Recording Errors
  - Ending Spans
  - Nested Spans
- **Connections:** Links to `tracing`, `attributes`

#### Article: `attributes`
- **Slug:** `/docs/telemetry/attributes`
- **Sections:**
  - Span Attributes
  - Standard Attributes
  - Custom Attributes
  - Attribute Types
  - Best Practices for Attributes
  - Attribute Cardinality
- **Connections:** Links to `spans`, `best-practices`

#### Article: `context-propagation`
- **Slug:** `/docs/telemetry/context-propagation`
- **Sections:**
  - Context Propagation
  - W3C Trace Context
  - Cross-service Tracing
  - HTTP Headers
  - Context Injection
  - Context Extraction
- **Connections:** Links to `tracing`, `distributed-systems`

### Group 4: Metrics

#### Article: `metrics`
- **Slug:** `/docs/telemetry/metrics`
- **Sections:**
  - Metrics Overview
  - Metric Types (Counter, Gauge, Histogram)
  - Creating Metrics
  - Recording Measurements
  - Metric Attributes
  - Aggregation
- **Connections:** Links to `configuration`, `exporters`

#### Article: `timers`
- **Slug:** `/docs/telemetry/timers`
- **Sections:**
  - Timer Utility (OpenTelemetryTimer)
  - Measuring Duration
  - NoOpTimer
  - Timer Best Practices
  - Integration with Spans
- **Connections:** Links to `spans`, `performance`

### Group 5: Exporters

#### Article: `exporters`
- **Slug:** `/docs/telemetry/exporters`
- **Sections:**
  - Exporter Types
  - Console Exporter
  - Jaeger Exporter
  - OTLP Exporter
  - Multiple Exporters
  - Exporter Configuration
- **Connections:** Links to `configuration`, `jaeger`, `otlp`

#### Article: `console`
- **Slug:** `/docs/telemetry/console`
- **Sections:**
  - Console Exporter
  - Development Usage
  - Console Output Format
  - Debugging with Console
  - Limitations
- **Connections:** Links to `exporters`, `quick-start`

#### Article: `jaeger`
- **Slug:** `/docs/telemetry/jaeger`
- **Sections:**
  - Jaeger Integration
  - Jaeger Configuration
  - Endpoint Setup
  - Viewing Traces in Jaeger UI
  - Jaeger Deployment
- **Connections:** Links to `exporters`, `deployment`

#### Article: `otlp`
- **Slug:** `/docs/telemetry/otlp`
- **Sections:**
  - OTLP (OpenTelemetry Protocol)
  - OTLP Configuration
  - Endpoint Setup
  - gRPC vs HTTP
  - OTLP Collectors
  - Backend Integration (Datadog, New Relic, etc.)
- **Connections:** Links to `exporters`, `backends`

#### Article: `backends`
- **Slug:** `/docs/telemetry/backends`
- **Sections:**
  - Observability Backends
  - Jaeger
  - Grafana Tempo
  - Datadog
  - New Relic
  - Honeycomb
  - SigNoz
  - Backend Selection Guide
- **Connections:** Links to `otlp`, `deployment`

### Group 6: Advanced Features

#### Article: `sampling`
- **Slug:** `/docs/telemetry/sampling`
- **Sections:**
  - Trace Sampling
  - Sample Rate Configuration
  - Production Sampling Strategies
  - Head-based Sampling
  - Tail-based Sampling
  - Cost Optimization
- **Connections:** Links to `configuration`, `performance`

#### Article: `resource-attributes`
- **Slug:** `/docs/telemetry/resource-attributes`
- **Sections:**
  - Resource Attributes
  - Service Metadata
  - Deployment Environment
  - Host Information
  - Custom Resources
  - Semantic Conventions
- **Connections:** Links to `configuration`, `attributes`

#### Article: `events`
- **Slug:** `/docs/telemetry/events`
- **Sections:**
  - Telemetry Events
  - Event Configuration
  - Event vs Logs
  - Structured Events
  - Event Best Practices
- **Connections:** Links to `configuration`, `tracing`

#### Article: `performance`
- **Slug:** `/docs/telemetry/performance`
- **Sections:**
  - Performance Considerations
  - Overhead of Telemetry
  - Sampling for Performance
  - Batch Processing
  - Resource Limits
  - Optimization Tips
- **Connections:** Links to `sampling`, `best-practices`

### Group 7: Integration & Deployment

#### Article: `igniter-integration`
- **Slug:** `/docs/telemetry/igniter-integration`
- **Sections:**
  - Automatic Instrumentation
  - Request Tracing
  - Action Tracing
  - Procedure Tracing
  - Error Recording
  - Context Enrichment
- **Connections:** Links to `/docs/builder`, `tracing`

#### Article: `distributed-systems`
- **Slug:** `/docs/telemetry/distributed-systems`
- **Sections:**
  - Tracing Across Services
  - Context Propagation
  - Service Dependencies
  - Trace Visualization
  - Debugging Distributed Issues
- **Connections:** Links to `context-propagation`, `patterns`

#### Article: `deployment`
- **Slug:** `/docs/telemetry/deployment`
- **Sections:**
  - Production Deployment
  - Environment Configuration
  - Exporter Setup
  - Collector Deployment
  - Scaling Considerations
  - Security
- **Connections:** Links to `exporters`, `backends`, `best-practices`

#### Article: `monitoring`
- **Slug:** `/docs/telemetry/monitoring`
- **Sections:**
  - Monitoring Telemetry Health
  - Export Success Rate
  - Dropped Spans
  - Latency Monitoring
  - Alerting
- **Connections:** Links to `deployment`, `troubleshooting`

#### Article: `troubleshooting`
- **Slug:** `/docs/telemetry/troubleshooting`
- **Sections:**
  - Common Issues
  - Missing Traces
  - Exporter Errors
  - Performance Issues
  - Debug Mode
  - Logs Analysis
- **Connections:** Links to `monitoring`, `debugging`

#### Article: `debugging`
- **Slug:** `/docs/telemetry/debugging`
- **Sections:**
  - Debugging Telemetry
  - Console Exporter for Debugging
  - Verbose Logging
  - Inspector Tools
  - Common Pitfalls
- **Connections:** Links to `console`, `troubleshooting`

#### Article: `patterns`
- **Slug:** `/docs/telemetry/patterns`
- **Sections:**
  - Common Telemetry Patterns
  - Error Tracking
  - Performance Monitoring
  - User Journey Tracking
  - Database Query Tracing
  - External API Tracing
- **Connections:** Links to `tracing`, `best-practices`

#### Article: `best-practices`
- **Slug:** `/docs/telemetry/best-practices`
- **Sections:**
  - Telemetry Best Practices
  - Naming Conventions
  - Attribute Selection
  - Sampling Strategy
  - Cost Management
  - Security & Privacy
  - Documentation
- **Connections:** Links to all telemetry articles

---

## 🔗 Article Connection Map

### Cross-tab Dependencies

**Core ↔ CLI:**
- `/docs/quick-start` → `/docs/cli/init`
- `/docs/builder` → `/docs/cli/generate/feature`

**Core ↔ Store:**
- `/docs/builder` → `/docs/store/setup`
- `/docs/realtime` → `/docs/store/pub-sub`

**Core ↔ Jobs:**
- `/docs/builder` → `/docs/jobs/quick-start`
- `/docs/context` → `/docs/jobs/context-factory`

**Core ↔ MCP Server:**
- `/docs/router` → `/docs/mcp-server/builder`
- `/docs/actions` → `/docs/mcp-server/tools`

**Core ↔ Bots:**
- `/docs/builder` → `/docs/bots/quick-start`
- `/docs/context` → `/docs/bots/context`

**Core ↔ Telemetry:**
- `/docs/builder` → `/docs/telemetry/quick-start`
- `/docs/error-handling` → `/docs/telemetry/tracing`

**Store ↔ Jobs:**
- `/docs/store/setup` → `/docs/jobs/installation`
- `/docs/store/pub-sub` → `/docs/jobs/patterns`

**Jobs ↔ Telemetry:**
- `/docs/jobs/monitoring` → `/docs/telemetry/metrics`

---

## 📝 Documentation Principles

1. **Progressive Disclosure:** Start simple, add complexity gradually
2. **Practical Examples:** Every concept has working code examples
3. **Type Safety:** Emphasize TypeScript benefits throughout
4. **Real-world Patterns:** Show common use cases and best practices
5. **Cross-linking:** Heavy interlinking between related topics
6. **API Reference:** Include actual API signatures and return types
7. **Error Scenarios:** Document common errors and solutions
8. **Performance Tips:** Include performance considerations where relevant

---

## 🎯 Next Steps

1. Create individual MDX files for each article
2. Implement FumaDocs groups and tabs
3. Add code examples from actual implementations
4. Create interactive demos where applicable
5. Add diagrams for complex concepts
6. Set up search optimization
7. Add version badges and compatibility tables

---

**Last Updated:** October 28, 2025  
**Total Articles:** 150+  
**Coverage:** 100% of package features
