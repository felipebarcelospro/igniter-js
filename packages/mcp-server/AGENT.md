# Agent Manual: @igniter-js/mcp-server

This package provides an MCP (Model-Context-Protocol) server that communicates over STDIO. It exposes a suite of tools for an AI agent to interact with the Igniter.js ecosystem.

## Core Responsibilities

- **Expose CLI Commands:** Make the Igniter.js CLI commands available as invokable tools.
- **Provide API Testing Utilities:** Offer tools to inspect the project's OpenAPI specification and make live API requests.
- **Enable Documentation Access:** Allow the agent to read and parse the official Igniter.js documentation.
- **Integrate with GitHub:** Provide tools to search for and create issues in the official repository.

## Architecture

The server is built using the `@model-context/server` library and features a modular, extensible architecture where tools are organized into "Tool Providers." This design makes it easy to add new capabilities in the future. For more details, refer to the design document at `.copilot/specs/mcp-server/design.md`.
