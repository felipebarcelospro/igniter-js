---
applyTo: '**'
---

# Igniter.js: Instructions for AI Agents

This document is the root-level technical guide for Large Language Model (LLM) based AI agents responsible for maintaining, debugging, and extending the entire Igniter.js monorepo. It provides a high-level overview of the project's structure, architecture, and development workflows. For package-specific details, you **must** refer to the `AGENT.md` file located within each individual package directory.

---

## 1. Project Overview

**Name:** Igniter.js

**Purpose:** Igniter.js is a modern, type-safe HTTP framework designed to streamline the development of scalable TypeScript applications. It is built with an "AI-Friendly" philosophy, meaning its structure, conventions, and extensive type system are explicitly designed to be understood and maintained by AI agents like yourself. The project is managed as a monorepo containing the core framework, various adapters, and tooling.

---

## 2. Monorepo Structure

The project is organized as a monorepo using `npm` workspaces.

-   **`packages/`**: **This is the most important directory.** It contains all the individual, publishable NPM packages that make up the Igniter.js ecosystem.
    -   Each subdirectory is a self-contained package with its own `package.json`, `tsconfig.json`, and `AGENT.md`.

-   **`docs/`**: Contains all developer-facing documentation intended for human consumption.
    -   `wiki-content/`: This subdirectory holds the markdown files that are automatically synced to the project's GitHub Wiki via a GitHub Action.

-   **`.github/`**: Contains GitHub-specific configuration files.
    -   `workflows/`: Holds all GitHub Actions workflows, such as the CI pipeline and the Wiki synchronization script (`sync-wiki.yml`).
    -   `ISSUE_TEMPLATE/`: Contains templates for creating new GitHub Issues.
    -   `PULL_REQUEST_TEMPLATE.md`: The template for submitting pull requests.

-   **`package.json`**: The root `package.json`. It defines the `npm` workspace configuration and contains top-level scripts for managing the entire monorepo (e.g., `build`, `test`, `publish`).

-   **`AGENT.md`**: (This file) The root agent manual. Provides a high-level overview and links to package-specific manuals.

---

## 3. Packages Overview

This table summarizes the role of each package in the ecosystem. For detailed technical information, **always refer to the `AGENT.md` within the respective package directory.**

| Package Name                      | Purpose                                                                                                                                | Key Dependencies         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `@igniter-js/core`                | The heart of the framework. Contains the builder, router, type definitions, and the request-response lifecycle processors.                 | `(none)`                 |
| `@igniter-js/cli`                 | The command-line interface for scaffolding new projects and running the interactive development server (`igniter init`, `igniter dev`).  | `commander`, `inquirer`  |
| `@igniter-js/adapter-redis`       | Implements the `IgniterStoreAdapter` interface. Provides caching and Pub/Sub functionality using a Redis backend.                          | `ioredis`                |
| `@igniter-js/adapter-bullmq`      | Implements the `IgniterJobQueueAdapter` interface. Provides background job processing using BullMQ and Redis.                              | `bullmq`                 |
| `@igniter-js/adapter-mcp-server`  | Transforms the Igniter.js router into a Model-Context-Protocol (MCP) server, allowing AI agents to use the API as a set of tools.      | `@model-context/server`  |
| `@igniter-js/adapter-opentelemetry` | Implements the `IgniterTelemetryProvider`. Integrates distributed tracing and metrics using the OpenTelemetry standard.                | `@opentelemetry/sdk-node`|
| `@igniter-js/eslint-config`       | A shared ESLint configuration to enforce a consistent code style across all packages in the monorepo.                                | `eslint`, `typescript-eslint`|

---

## 4. Core Architectural Principles

Adherence to these principles is paramount when performing any maintenance task.

1.  **Type Safety Above All:** The primary goal of the framework is to provide end-to-end type safety. Changes should enhance, not compromise, TypeScript's ability to infer types from the backend to the client. When in doubt, make the types stricter.

2.  **Explicit over Implicit:** The framework favors explicit configuration (e.g., registering plugins, defining actions) to make the application's capabilities clear and understandable from reading the code. Avoid "magic" or hidden behaviors.

3.  **Adapter-Based Architecture:** Core functionalities (Store, Queues, Telemetry) are defined by abstract interfaces in `@igniter-js/core`. Concrete implementations are provided by separate adapter packages. This keeps the core lightweight and modular. When adding a new integration, an adapter is the preferred pattern.

4.  **AI-Friendly Design:** The codebase is structured to be easily parsable and understandable by AI. This means:
    -   Clear, consistent naming conventions.
    -   Comprehensive JSDoc comments for public APIs.
    -   Self-contained modules (packages) with clear responsibilities.
    -   Detailed `AGENT.md` files (like this one).

---

## 5. Development Workflow

### 5.1. Running the Project Locally

1.  **Install Dependencies:** From the root of the monorepo, run `npm install`. This will install dependencies for all packages and link them together.
2.  **Build All Packages:** To ensure all packages are compiled and up-to-date, run `npm run build` from the root. This executes the `build` script in each package's `package.json`.

### 5.2. Running Tests

-   To run all tests for all packages, execute `npm run test` from the root.
-   To run tests for a specific package, use the `--filter` flag. For example, to test only the `@igniter-js/core` package:
    ```bash
    npm test --filter @igniter-js/core
    ```

### 5.3. Adding a New Package

1.  **Create Directory:** Create a new subdirectory inside the `packages/` directory (e.g., `packages/adapter-new-service`).
2.  **Initialize `package.json`:** Run `npm init` inside the new directory or create the file manually. Ensure the package name is scoped (e.g., `@igniter-js/adapter-new-service`).
3.  **Add `tsconfig.json`:** Create a `tsconfig.json` file, typically by copying it from an existing adapter and modifying it as needed. It should extend the root `tsconfig.base.json`.
4.  **Add Dependencies:** Use `npm add <dependency-name> --filter <package-name>` to add dependencies to the new package.
5.  **Create `AGENT.md`:** Create a detailed `AGENT.md` file for the new package, following the established template.

---

## 6. Key Root-Level Scripts (`package.json`)

-   `npm run build`: Executes the `build` script in every package, compiling all TypeScript code. This is essential after pulling changes or before publishing.
-   `npm run test`: Executes the test suites for all packages.
-   `npm run lint`: Runs ESLint across the entire monorepo to check for code style and quality issues.
-   `npm run publish:packages`: A script for publishing updated packages to NPM. **Caution:** This should only be run by the lead maintainer after a version bump.

This root-level `AGENT.md` should be your first point of reference. Before diving into a specific package, consult this document to understand its place in the wider ecosystem, then navigate to the package's own `AGENT.md` for detailed instructions.
