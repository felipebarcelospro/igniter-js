/**
 * @fileoverview MCP (Model Context Protocol) Client Builder.
 * This module provides a fluent API for configuring MCP server connections.
 *
 * @description
 * The IgniterAgentMCPBuilder allows you to configure connections to MCP servers
 * using either stdio (local process) or HTTP (remote server) transport.
 *
 * MCP servers provide tools that the agent can invoke, similar to custom toolsets,
 * but the tools are hosted externally and discovered at runtime.
 *
 * @see {@link https://modelcontextprotocol.io/ | Model Context Protocol}
 *
 * @example
 * ```typescript
 * import { IgniterAgentMCPBuilder } from '@igniter-js/agents/builders';
 *
 * // Configure a stdio MCP server (local process)
 * const filesystemMCP = IgniterAgentMCPBuilder
 *   .create('filesystem')
 *   .withType('stdio')
 *   .withCommand('npx')
 *   .withArgs(['-y', '@modelcontextprotocol/server-filesystem', '/tmp'])
 *   .withEnv({ DEBUG: 'true' })
 *   .build();
 *
 * // Configure an HTTP MCP server (remote)
 * const remoteMCP = IgniterAgentMCPBuilder
 *   .create('remote-tools')
 *   .withType('http')
 *   .withURL('https://mcp.example.com/api')
 *   .withHeaders({ 'Authorization': 'Bearer token123' })
 *   .build();
 * ```
 *
 * @module builders/mcp
 * @packageDocumentation
 */

import type {
  IgniterAgentToolsetType,
  IgniterAgentMCPStdioConfig,
  IgniterAgentMCPHttpConfig,
  IgniterAgentMCPConfigUnion,
  IgniterAgentMCPClientInterface,
} from "../types";

import {
  IgniterAgentConfigError,
  IgniterAgentMCPError,
  IgniterAgentErrorCode,
} from "../errors";

/* =============================================================================
 * MCP BUILDER CLASS
 * ============================================================================= */

/**
 * Fluent builder for configuring MCP server connections.
 *
 * @description
 * The IgniterAgentMCPBuilder provides a type-safe fluent API for creating
 * MCP server configurations. The builder adapts its available methods based
 * on the transport type selected.
 *
 * **Transport Types:**
 * - `stdio`: For local MCP servers running as child processes
 * - `http`: For remote MCP servers accessed over HTTP/HTTPS
 *
 * **Key Features:**
 * - Type-safe configuration based on transport type
 * - Validation of required fields
 * - Environment variable support for stdio
 * - Header support for HTTP authentication
 *
 * @typeParam TType - The transport type ('stdio' | 'http')
 * @typeParam TName - The unique configuration name
 *
 * @example
 * ```typescript
 * // Stdio transport (local process)
 * const localMCP = IgniterAgentMCPBuilder
 *   .create('github')
 *   .withType('stdio')
 *   .withCommand('npx')
 *   .withArgs(['-y', '@modelcontextprotocol/server-github'])
 *   .withEnv({ GITHUB_TOKEN: process.env.GITHUB_TOKEN! })
 *   .build();
 *
 * // HTTP transport (remote server)
 * const remoteMCP = IgniterAgentMCPBuilder
 *   .create('opencode')
 *   .withType('http')
 *   .withURL('https://sandbox.example.com/mcp')
 *   .withHeaders({
 *     'X-API-Key': process.env.API_KEY!,
 *     'Content-Type': 'application/json'
 *   })
 *   .build();
 *
 * // Register with an agent
 * const agent = IgniterAgent.create('my-agent')
 *   .addMCP(localMCP)
 *   .addMCP(remoteMCP)
 *   .build();
 * ```
 *
 * @public
 */
export class IgniterAgentMCPBuilder<
  TType extends IgniterAgentToolsetType = IgniterAgentToolsetType,
  TName extends string = string,
> {
  /**
   * The configuration being built.
   * @internal
   */
  private readonly _config: Partial<IgniterAgentMCPConfigUnion<TName>>;

  /**
   * Creates a new IgniterAgentMCPBuilder instance.
   *
   * @param config - Initial configuration
   * @internal
   */
  private constructor(config: Partial<IgniterAgentMCPConfigUnion<TName>> = {}) {
    this._config = config;
  }

  /* ---------------------------------------------------------------------------
   * STATIC FACTORY METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Creates a new MCP builder with the given name.
   *
   * @description
   * This is the primary entry point for creating an MCP configuration.
   * The name must be unique within an agent and is used to identify
   * the MCP server and its tools.
   *
   * After calling `create()`, you must call `withType()` to specify
   * the transport type before configuring transport-specific options.
   *
   * @typeParam TNewName - The configuration name type
   * @param name - Unique name for the MCP configuration
   * @returns A new IgniterAgentMCPBuilder instance
   *
   * @example
   * ```typescript
   * const mcpConfig = IgniterAgentMCPBuilder
   *   .create('my-mcp')
   *   .withType('stdio')  // or 'http'
   *   .withCommand('...')  // available after withType('stdio')
   *   .build();
   * ```
   *
   * @public
   */
  static create<TNewName extends string>(
    name: TNewName,
  ): IgniterAgentMCPBuilder<IgniterAgentToolsetType, TNewName> {
    if (!name || typeof name !== "string") {
      throw new IgniterAgentConfigError({
        message:
          "MCP configuration name is required and must be a non-empty string",
        field: "name",
      });
    }

    return new IgniterAgentMCPBuilder<IgniterAgentToolsetType, TNewName>({
      name,
    });
  }

  /* ---------------------------------------------------------------------------
   * COMMON BUILDER METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Sets the configuration name.
   *
   * @description
   * Allows changing the configuration name during the building process.
   *
   * @typeParam TNewName - The new name type
   * @param name - The new name for the configuration
   * @returns A new builder with the updated name
   *
   * @public
   */
  withName<TNewName extends string>(
    name: TNewName,
  ): IgniterAgentMCPBuilder<TType, TNewName> {
    return new IgniterAgentMCPBuilder<TType, TNewName>({
      ...this._config,
      name,
    } as Partial<IgniterAgentMCPConfigUnion<TNewName>>);
  }

  /**
   * Sets the transport type for the MCP connection.
   *
   * @description
   * Specifies how the agent will communicate with the MCP server:
   * - `stdio`: Spawns a local process and communicates via stdin/stdout
   * - `http`: Connects to a remote server via HTTP/HTTPS
   *
   * After calling this method, transport-specific methods become available:
   * - For `stdio`: `withCommand()`, `withArgs()`, `withEnv()`
   * - For `http`: `withURL()`, `withHeaders()`
   *
   * @typeParam TNewType - The transport type
   * @param type - The transport type to use
   * @returns A new builder configured for the specified transport
   *
   * @example
   * ```typescript
   * // Stdio transport
   * const stdioConfig = IgniterAgentMCPBuilder
   *   .create('local')
   *   .withType('stdio')
   *   .withCommand('python')
   *   .withArgs(['mcp_server.py'])
   *   .build();
   *
   * // HTTP transport
   * const httpConfig = IgniterAgentMCPBuilder
   *   .create('remote')
   *   .withType('http')
   *   .withURL('https://api.example.com/mcp')
   *   .build();
   * ```
   *
   * @public
   */
  withType<TNewType extends IgniterAgentToolsetType>(
    type: TNewType,
  ): IgniterAgentMCPBuilder<TNewType, TName> {
    if (type !== "stdio" && type !== "http") {
      throw new IgniterAgentConfigError({
        message: `Invalid MCP transport type: '${type}'. Must be 'stdio' or 'http'`,
        field: "type",
        metadata: { validTypes: ["stdio", "http"] },
      });
    }

    return new IgniterAgentMCPBuilder<TNewType, TName>({
      ...this._config,
      type,
    } as Partial<IgniterAgentMCPConfigUnion<TName>>);
  }

  /* ---------------------------------------------------------------------------
   * STDIO-SPECIFIC BUILDER METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Sets the command to execute for stdio transport.
   *
   * @description
   * Specifies the executable to run when starting the MCP server process.
   * Common values include `npx`, `node`, `python`, `deno`, etc.
   *
   * @param command - The command to execute
   * @returns A new builder with the command set
   * @throws {IgniterAgentConfigError} If transport type is not 'stdio'
   *
   * @example
   * ```typescript
   * const config = IgniterAgentMCPBuilder
   *   .create('filesystem')
   *   .withType('stdio')
   *   .withCommand('npx')
   *   .withArgs(['-y', '@modelcontextprotocol/server-filesystem'])
   *   .build();
   * ```
   *
   * @public
   */
  withCommand(command: string): IgniterAgentMCPBuilder<TType, TName> {
    this._assertStdioType("withCommand");

    if (!command || typeof command !== "string") {
      throw new IgniterAgentConfigError({
        message: "Command is required and must be a non-empty string",
        field: "command",
        metadata: { mcpName: this._config.name },
      });
    }

    return new IgniterAgentMCPBuilder<TType, TName>({
      ...this._config,
      command,
    } as Partial<IgniterAgentMCPConfigUnion<TName>>);
  }

  /**
   * Sets the arguments to pass to the command.
   *
   * @description
   * Specifies command-line arguments for the MCP server process.
   *
   * @param args - Array of command arguments
   * @returns A new builder with the arguments set
   * @throws {IgniterAgentConfigError} If transport type is not 'stdio'
   *
   * @example
   * ```typescript
   * const config = IgniterAgentMCPBuilder
   *   .create('filesystem')
   *   .withType('stdio')
   *   .withCommand('npx')
   *   .withArgs([
   *     '-y',
   *     '@modelcontextprotocol/server-filesystem',
   *     '/home/user/documents',
   *     '--read-only'
   *   ])
   *   .build();
   * ```
   *
   * @public
   */
  withArgs(args: string[]): IgniterAgentMCPBuilder<TType, TName> {
    this._assertStdioType("withArgs");

    if (!Array.isArray(args)) {
      throw new IgniterAgentConfigError({
        message: "Args must be an array of strings",
        field: "args",
        metadata: { mcpName: this._config.name },
      });
    }

    return new IgniterAgentMCPBuilder<TType, TName>({
      ...this._config,
      args,
    } as Partial<IgniterAgentMCPConfigUnion<TName>>);
  }

  /**
   * Sets environment variables for the command process.
   *
   * @description
   * Specifies environment variables to pass to the MCP server process.
   * Useful for passing API keys, configuration, or feature flags.
   *
   * @param env - Record of environment variable names to values
   * @returns A new builder with the environment variables set
   * @throws {IgniterAgentConfigError} If transport type is not 'stdio'
   *
   * @example
   * ```typescript
   * const config = IgniterAgentMCPBuilder
   *   .create('github')
   *   .withType('stdio')
   *   .withCommand('npx')
   *   .withArgs(['-y', '@modelcontextprotocol/server-github'])
   *   .withEnv({
   *     GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
   *     GITHUB_ORG: 'my-organization',
   *     DEBUG: 'mcp:*'
   *   })
   *   .build();
   * ```
   *
   * @public
   */
  withEnv(env: Record<string, string>): IgniterAgentMCPBuilder<TType, TName> {
    this._assertStdioType("withEnv");

    if (!env || typeof env !== "object") {
      throw new IgniterAgentConfigError({
        message: "Env must be an object mapping variable names to values",
        field: "env",
        metadata: { mcpName: this._config.name },
      });
    }

    return new IgniterAgentMCPBuilder<TType, TName>({
      ...this._config,
      env,
    } as Partial<IgniterAgentMCPConfigUnion<TName>>);
  }

  /* ---------------------------------------------------------------------------
   * HTTP-SPECIFIC BUILDER METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Sets the URL for HTTP transport.
   *
   * @description
   * Specifies the endpoint URL for the remote MCP server.
   * Must be a valid HTTP or HTTPS URL.
   *
   * @param url - The MCP server URL
   * @returns A new builder with the URL set
   * @throws {IgniterAgentConfigError} If transport type is not 'http' or URL is invalid
   *
   * @example
   * ```typescript
   * const config = IgniterAgentMCPBuilder
   *   .create('opencode')
   *   .withType('http')
   *   .withURL('https://sandbox.example.com/mcp/v1')
   *   .build();
   * ```
   *
   * @public
   */
  withURL(url: string): IgniterAgentMCPBuilder<TType, TName> {
    this._assertHttpType("withURL");

    if (!url || typeof url !== "string") {
      throw new IgniterAgentConfigError({
        message: "URL is required and must be a non-empty string",
        field: "url",
        metadata: { mcpName: this._config.name },
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new IgniterAgentConfigError({
        message: `Invalid URL format: '${url}'`,
        field: "url",
        metadata: { mcpName: this._config.name },
      });
    }

    return new IgniterAgentMCPBuilder<TType, TName>({
      ...this._config,
      url,
    } as Partial<IgniterAgentMCPConfigUnion<TName>>);
  }

  /**
   * Sets HTTP headers for requests to the MCP server.
   *
   * @description
   * Specifies headers to include in all HTTP requests to the MCP server.
   * Commonly used for authentication, API keys, or content type.
   *
   * @param headers - Record of header names to values
   * @returns A new builder with the headers set
   * @throws {IgniterAgentConfigError} If transport type is not 'http'
   *
   * @example
   * ```typescript
   * const config = IgniterAgentMCPBuilder
   *   .create('authenticated-mcp')
   *   .withType('http')
   *   .withURL('https://api.example.com/mcp')
   *   .withHeaders({
   *     'Authorization': `Bearer ${process.env.API_TOKEN}`,
   *     'X-Client-ID': 'my-app',
   *     'Content-Type': 'application/json'
   *   })
   *   .build();
   * ```
   *
   * @public
   */
  withHeaders(
    headers: Record<string, string>,
  ): IgniterAgentMCPBuilder<TType, TName> {
    this._assertHttpType("withHeaders");

    if (!headers || typeof headers !== "object") {
      throw new IgniterAgentConfigError({
        message: "Headers must be an object mapping header names to values",
        field: "headers",
        metadata: { mcpName: this._config.name },
      });
    }

    return new IgniterAgentMCPBuilder<TType, TName>({
      ...this._config,
      headers,
    } as Partial<IgniterAgentMCPConfigUnion<TName>>);
  }

  /* ---------------------------------------------------------------------------
   * BUILD METHOD
   * --------------------------------------------------------------------------- */

  /**
   * Builds and returns the completed MCP configuration.
   *
   * @description
   * Validates the configuration and returns a typed configuration object
   * that can be registered with an agent using `addMCP()`.
   *
   * @returns The completed MCP configuration
   * @throws {IgniterAgentConfigError} If required fields are missing
   *
   * @example
   * ```typescript
   * const mcpConfig = IgniterAgentMCPBuilder
   *   .create('filesystem')
   *   .withType('stdio')
   *   .withCommand('npx')
   *   .withArgs(['-y', '@modelcontextprotocol/server-filesystem', '/tmp'])
   *   .build();
   *
   * // Use with an agent
   * const agent = IgniterAgent.create()
   *   .addMCP(mcpConfig)
   *   .build();
   * ```
   *
   * @public
   */
  build(): TType extends "stdio"
    ? IgniterAgentMCPStdioConfig<TName>
    : TType extends "http"
      ? IgniterAgentMCPHttpConfig<TName>
      : IgniterAgentMCPConfigUnion<TName> {
    // Validate required fields
    if (!this._config.name) {
      throw new IgniterAgentConfigError({
        message: "MCP configuration name is required",
        field: "name",
      });
    }

    if (!this._config.type) {
      throw new IgniterAgentConfigError({
        message:
          'MCP transport type is required. Call withType("stdio") or withType("http")',
        field: "type",
        metadata: { mcpName: this._config.name },
      });
    }

    // Validate stdio-specific requirements
    if (this._config.type === "stdio") {
      const config = this._config as Partial<IgniterAgentMCPStdioConfig<TName>>;

      if (!config.command) {
        throw new IgniterAgentConfigError({
          message: "Command is required for stdio transport",
          field: "command",
          metadata: { mcpName: this._config.name },
        });
      }

      if (!config.args) {
        throw new IgniterAgentConfigError({
          message: "Args are required for stdio transport",
          field: "args",
          metadata: { mcpName: this._config.name },
        });
      }

      return {
        type: "stdio",
        name: config.name!,
        command: config.command,
        args: config.args,
        env: config.env,
      } as TType extends "stdio" ? IgniterAgentMCPStdioConfig<TName> : never;
    }

    // Validate http-specific requirements
    if (this._config.type === "http") {
      const config = this._config as Partial<IgniterAgentMCPHttpConfig<TName>>;

      if (!config.url) {
        throw new IgniterAgentConfigError({
          message: "URL is required for http transport",
          field: "url",
          metadata: { mcpName: this._config.name },
        });
      }

      // @ts-expect-error - headers are optional
      return {
        type: "http",
        name: config.name,
        url: config.url,
        headers: config.headers,
      } as TType extends "http" ? IgniterAgentMCPHttpConfig<TName> : never;
    }

    throw new IgniterAgentConfigError({
      message: `Invalid transport type: '${this._config.type}'`,
      field: "type",
      metadata: { mcpName: this._config.name },
    });
  }

  /* ---------------------------------------------------------------------------
   * PRIVATE HELPER METHODS
   * --------------------------------------------------------------------------- */

  /**
   * Asserts that the current transport type is 'stdio'.
   * @internal
   */
  private _assertStdioType(methodName: string): void {
    if (this._config.type !== "stdio") {
      throw new IgniterAgentConfigError({
        message:
          `${methodName}() is only available for stdio transport. ` +
          `Current type: '${this._config.type || "not set"}'. ` +
          `Call withType('stdio') first.`,
        field: "type",
        metadata: { mcpName: this._config.name, operation: methodName },
      });
    }
  }

  /**
   * Asserts that the current transport type is 'http'.
   * @internal
   */
  private _assertHttpType(methodName: string): void {
    if (this._config.type !== "http") {
      throw new IgniterAgentConfigError({
        message:
          `${methodName}() is only available for http transport. ` +
          `Current type: '${this._config.type || "not set"}'. ` +
          `Call withType('http') first.`,
        field: "type",
        metadata: { mcpName: this._config.name, operation: methodName },
      });
    }
  }
}

/* =============================================================================
 * FACTORY FUNCTION
 * ============================================================================= */

/**
 * Factory function to create a new MCP builder.
 *
 * @description
 * Convenience function that wraps `IgniterAgentMCPBuilder.create()`.
 *
 * @typeParam TName - The configuration name type
 * @param name - Unique name for the MCP configuration
 * @returns A new IgniterAgentMCPBuilder instance
 *
 * @example
 * ```typescript
 * import { IgniterAgentMCPClient } from '@igniter-js/agents';
 *
 * const filesystemMCP = IgniterAgentMCPClient.create('filesystem')
 *   .withType('stdio')
 *   .withCommand('npx')
 *   .withArgs(['-y', '@modelcontextprotocol/server-filesystem', '/tmp'])
 *   .build();
 * ```
 *
 * @public
 */
export const IgniterAgentMCPClient = {
  create: IgniterAgentMCPBuilder.create,
}
