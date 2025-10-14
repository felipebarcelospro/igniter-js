# MCP Adapter Examples

This directory contains example configurations for the `@igniter-js/adapter-mcp-server` package.

## Available Examples

### oauth-example.ts

Demonstrates OAuth authorization configuration for protecting your MCP server with Bearer tokens.

**Features shown:**
- Basic OAuth configuration
- Token verification
- Protected resource metadata endpoint
- Scopes configuration

**Use cases:**
- Protecting your MCP server with OAuth 2.0
- Integrating with existing authorization servers
- Implementing token-based authentication

## Usage

These examples are for reference only and should be adapted to your specific use case. Copy the relevant configuration into your application and modify as needed.

## Requirements

- `@igniter-js/adapter-mcp-server` >= 0.3.0
- `@igniter-js/core` 
- `@vercel/mcp-adapter`
- `@modelcontextprotocol/sdk`

For JWT-based OAuth, you may also need:
- `jose` or `jsonwebtoken` for JWT verification

## More Information

See the main [README.md](../README.md) for comprehensive documentation and additional examples.
